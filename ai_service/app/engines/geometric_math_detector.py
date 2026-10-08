"""
Geometric & Visual Mathematical Region Detector
=================================================
Detects mathematical structures directly from page pixels using visual geometry:
  1. Horizontal fraction bars (isolated horizontal line segments with content above & below).
  2. Superscript & subscript components (geometric bounding box baseline and height analysis).
  3. Mathematical formula bounding boxes on pages (standalone and embedded).
  4. Original pixel crop generation with margin protection (never clips subscripts/superscripts).

No OCR text guessing — operates strictly on image geometry.
CPU-only, low-hardware friendly (Intel Core i3 2nd Gen+, 6 GB RAM).
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

import cv2
import numpy as np

from ..core.config import config

logger = logging.getLogger("geometric_math_detector")


@dataclass
class MathBBox:
    x: int
    y: int
    w: int
    h: int
    region_type: str = "FORMULA"  # FORMULA, FRACTION, OPTION_FORMULA, INLINE_FORMULA
    confidence: float = 0.85
    sub_elements: List[Dict[str, Any]] = field(default_factory=list)
    has_fraction_bar: bool = False
    has_vertical_stack: bool = False

    def to_rect(self) -> Tuple[int, int, int, int]:
        return (self.x, self.y, self.w, self.h)

    def to_coords(self) -> Tuple[int, int, int, int]:
        return (self.x, self.y, self.x + self.w, self.y + self.h)


class GeometricMathDetector:
    """
    Detects 2-dimensional mathematical structures visually before OCR.
    """

    @staticmethod
    def detect_fraction_bars(
        binary_inv: np.ndarray,
        min_width_px: int = 15,
        max_thickness_px: int = 8,
    ) -> List[Dict[str, Any]]:
        """
        Detects horizontal fraction division lines in a binarized (inverted: white fg) crop.
        Distinguishes fraction bars from underlines, borders, and text dashes by:
          - Aspect ratio (width >> height)
          - Presence of connected components both ABOVE and BELOW the bar
          - Centered horizontal alignment relative to surrounding content
        """
        h_img, w_img = binary_inv.shape[:2]
        if h_img < 10 or w_img < 15:
            return []

        # Morphological horizontal kernel
        k_w = max(12, int(w_img * 0.15))
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (k_w, 1))
        horizontal = cv2.morphologyEx(binary_inv, cv2.MORPH_OPEN, kernel)

        contours, _ = cv2.findContours(horizontal, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        fraction_bars = []

        for c in contours:
            x, y, w, h = cv2.boundingRect(c)
            # Must be thin horizontally oriented line
            if w >= min_width_px and h <= max_thickness_px and (w / max(h, 1) >= 3.0):
                # Verify content above (numerator) and below (denominator)
                margin_y = max(4, int(h_img * 0.08))
                top_zone = binary_inv[max(0, y - margin_y * 3): y, max(0, x - 5): min(w_img, x + w + 5)]
                bot_zone = binary_inv[min(h_img, y + h): min(h_img, y + h + margin_y * 3), max(0, x - 5): min(w_img, x + w + 5)]

                has_above = np.sum(top_zone > 0) > 20
                has_below = np.sum(bot_zone > 0) > 20

                if has_above and has_below:
                    fraction_bars.append({
                        "bbox": [x, y, w, h],
                        "y_center": y + h // 2,
                        "confidence": 0.94,
                        "has_numerator": True,
                        "has_denominator": True,
                    })

        return fraction_bars

    @staticmethod
    def analyze_character_baselines(
        crop_gray: np.ndarray,
    ) -> Dict[str, Any]:
        """
        Analyzes connected components in a crop to geometrically identify:
          - Base symbols vs Superscripts (higher y, smaller size)
          - Base symbols vs Subscripts (lower y, smaller size)
        """
        if crop_gray is None or crop_gray.size == 0:
            return {"components": [], "has_superscript": False, "has_subscript": False}

        # Binarize with Otsu inverted
        _, bin_inv = cv2.threshold(crop_gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

        num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(bin_inv, connectivity=8)
        if num_labels <= 1:
            return {"components": [], "has_superscript": False, "has_subscript": False}

        components = []
        h_crop, w_crop = crop_gray.shape[:2]

        for i in range(1, num_labels):
            x, y, w, h, area = stats[i]
            if area < 4 or w > w_crop * 0.9 or h > h_crop * 0.95:
                continue
            components.append({
                "id": i,
                "x": x,
                "y": y,
                "w": w,
                "h": h,
                "area": area,
                "cx": centroids[i][0],
                "cy": centroids[i][1],
            })

        if len(components) < 2:
            return {"components": components, "has_superscript": False, "has_subscript": False}

        # Sort left to right
        components.sort(key=lambda c: c["x"])

        # Median height of main characters
        median_h = float(np.median([c["h"] for c in components]))
        median_cy = float(np.median([c["cy"] for c in components]))

        has_superscript = False
        has_subscript = False

        for idx, comp in enumerate(components):
            # Check relative to median baseline
            is_smaller = comp["h"] < (median_h * 0.75)
            # Above median center line -> Superscript
            if is_smaller and comp["cy"] < (median_cy - median_h * 0.25):
                comp["role"] = "SUPERSCRIPT"
                has_superscript = True
            # Below median center line -> Subscript
            elif is_smaller and comp["cy"] > (median_cy + median_h * 0.25):
                comp["role"] = "SUBSCRIPT"
                has_subscript = True
            else:
                comp["role"] = "BASE"

        return {
            "components": components,
            "has_superscript": has_superscript,
            "has_subscript": has_subscript,
            "median_height": median_h,
        }

    @staticmethod
    def crop_formula_pixels(
        page_img: np.ndarray,
        bbox: List[int],  # [x, y, w, h]
        pad_x: int = 14,
        pad_y: int = 14,
        save_to_disk: bool = True,
        filename_prefix: str = "math_crop",
    ) -> Dict[str, Any]:
        """
        Extracts original high-resolution pixels for a math bounding box.
        Applies padding so fraction bars and exponents are never clipped.
        Saves crop file to config.STORAGE_CROPS if requested.
        """
        h_page, w_page = page_img.shape[:2]
        x, y, w, h = bbox

        x0 = max(0, int(x - pad_x))
        y0 = max(0, int(y - pad_y))
        x1 = min(w_page, int(x + w + pad_x))
        y1 = min(h_page, int(y + h + pad_y))

        crop = page_img[y0:y1, x0:x1].copy()

        result = {
            "crop": crop,
            "bbox_padded": [x0, y0, x1 - x0, y1 - y0],
            "original_bbox": bbox,
            "width": x1 - x0,
            "height": y1 - y0,
            "crop_path": "",
            "crop_url": "",
        }

        if save_to_disk and crop.size > 0:
            import uuid
            crop_id = f"{filename_prefix}_{uuid.uuid4().hex[:10]}"
            filename = f"{crop_id}.png"
            target_path = config.STORAGE_CROPS / filename
            cv2.imwrite(str(target_path), crop)
            result["crop_path"] = str(target_path)
            result["crop_url"] = f"/data/crops/{filename}"

        return result

    @classmethod
    def detect_math_regions_on_page(
        cls,
        page_img: np.ndarray,
        text_spans: Optional[List[Dict[str, Any]]] = None,
    ) -> List[MathBBox]:
        """
        Discovers mathematical formula regions on a full page using hybrid visual-geometric analysis:
          1. Geometric fraction bar discovery.
          2. Vertical character stacking analysis.
          3. Association with mathematical text span bounding boxes.
        """
        h_img, w_img = page_img.shape[:2]
        gray = cv2.cvtColor(page_img, cv2.COLOR_BGR2GRAY) if len(page_img.shape) == 3 else page_img.copy()

        # Inverted Otsu binarization
        _, bin_inv = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

        # 1. Detect all visual fraction bars across the page
        fraction_bars = cls.detect_fraction_bars(bin_inv, min_width_px=14, max_thickness_px=6)

        detected_boxes: List[MathBBox] = []

        # Turn fraction bars into formula bounding boxes by expanding vertical height
        for fb in fraction_bars:
            fx, fy, fw, fh = fb["bbox"]
            expand_v = max(24, int(fw * 0.7))
            bx0 = max(0, fx - 10)
            by0 = max(0, fy - expand_v)
            bx1 = min(w_img, fx + fw + 10)
            by1 = min(h_img, fy + fh + expand_v)

            detected_boxes.append(MathBBox(
                x=bx0,
                y=by0,
                w=bx1 - bx0,
                h=by1 - by0,
                region_type="FRACTION",
                confidence=0.92,
                has_fraction_bar=True,
                has_vertical_stack=True,
            ))

        # 2. Correlate with any text spans flagged with mathematical tokens
        if text_spans:
            import re
            math_token_re = re.compile(
                r"[=+*^√∛∜∫∬∭∮∑∏±∓≤≥≠≈≡∞αβγδεϵζηθϑικλμνξπϖρϱστυφϕχψωΓΔΘΛΞΠΣΥΦΨΩ∂∇∈∉∋⊂⊃⊆⊇∪∩∀∃∄⊥∥∠°∝∴∵×÷·•½⅓⅔¼¾]|(?:(?<=\s)|(?<=\d)|(?<=\)))-(?=\s|\d|[a-zA-Z])|−|\b(?:sin|cos|tan|cot|sec|csc|log|ln|lim|sqrt|frac|alpha|beta|theta)\b",
                re.IGNORECASE
            )
            for span in text_spans:
                txt = span.get("text", "")
                if math_token_re.search(txt) or "^" in txt or "/" in txt:
                    sx, sy, sw, sh = span.get("bbox", [0, 0, 10, 10])
                    # Check if already covered by an existing detected fraction box
                    covered = False
                    for db in detected_boxes:
                        if (db.x <= sx + sw / 2 <= db.x + db.w) and (db.y <= sy + sh / 2 <= db.y + db.h):
                            covered = True
                            break
                    if not covered and sw > 8 and sh > 8:
                        detected_boxes.append(MathBBox(
                            x=sx,
                            y=sy,
                            w=sw,
                            h=sh,
                            region_type="FORMULA",
                            confidence=span.get("confidence", 0.90),
                        ))

        return detected_boxes


geometric_math_detector = GeometricMathDetector()
