"""
Formula-First Region Detector
Detects mathematical, scientific, physics, and chemistry formula regions
from page images and document layout before ordinary text OCR.
"""

import re
import cv2  # type: ignore
import numpy as np  # type: ignore
from typing import List, Dict, Any, Tuple, Optional


class FormulaRegionDetector:
    # Mathematical and scientific symbol characters
    MATH_SYMBOLS = set("√∛∜∫∬∭∮∑∏±∓≤≥≠≈≡∞αβγδεϵζηθϑικλμνξπϖρϱστυφϕχψωΓΔΘΛΞΠΣΥΦΨΩ∂∇°∝∴∵×÷·•½⅓⅔¼¾^")

    @classmethod
    def is_formula_text(cls, text: str) -> bool:
        """Determines if a text string contains mathematical or scientific expressions."""
        if not text:
            return False
        # Check math symbols
        if any(c in cls.MATH_SYMBOLS for c in text):
            return True
        # Check LaTeX commands
        if bool(re.search(r"\\(?:sqrt|frac|int|sum|prod|alpha|beta|gamma|delta|theta|lambda|mu|pi|sigma|omega|Delta|pm|times|div|le|ge|neq|approx|infty|vec|hat|ce)", text)):
            return True
        # Check trig functions
        if bool(re.search(r"\b(?:sin|cos|tan|cot|sec|csc)\s*(?:\\?theta|θ|ϑ|\d+|\()", text, re.IGNORECASE)):
            return True
        # Check powers and subscripts
        if bool(re.search(r"\b[a-zA-Z]\^[0-9+\-]+|\b10\^?[+\-]?\d+", text)):
            return True
        # Check equations
        if "=" in text and bool(re.search(r"[a-zA-Z0-9]\s*=\s*[a-zA-Z0-9]", text)):
            return True
        # Check chemical reactions
        if bool(re.search(r"->|-->|⇌|→|<=>", text)):
            return True
        return False

    @classmethod
    def detect_formula_contours_from_image(cls, page_img: np.ndarray) -> List[Dict[str, Any]]:
        """
        Scans an image for isolated formula bounding boxes using contour analysis
        focused on mathematical characteristics (isolated symbols, fraction bars, radicals).
        """
        if page_img is None or page_img.size == 0:
            return []

        h_img, w_img = page_img.shape[:2]
        gray = cv2.cvtColor(page_img, cv2.COLOR_BGR2GRAY) if len(page_img.shape) == 3 else page_img.copy()

        # Adaptive thresholding to isolate sharp formula strokes
        binary = cv2.adaptiveThreshold(
            gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 15, 4
        )

        # Detect horizontal lines (vinculums & fraction bars)
        horiz_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (15, 1))
        horiz_lines = cv2.morphologyEx(binary, cv2.MORPH_OPEN, horiz_kernel)

        # Connect formula elements locally (small horizontal dilation)
        dilate_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (9, 3))
        connected = cv2.dilate(binary, dilate_kernel, iterations=1)

        contours, _ = cv2.findContours(connected, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        formula_regions = []

        min_area = 100
        max_area = w_img * h_img * 0.25  # At most 25% of page for single formula

        for idx, c in enumerate(contours):
            area = cv2.contourArea(c)
            if min_area < area < max_area:
                x, y, w, h = cv2.boundingRect(c)
                # Check aspect ratio typical of inline/block formulas
                if 10 < w < w_img * 0.9 and 8 < h < 120:
                    roi_horiz = horiz_lines[y:y+h, x:x+w]
                    has_vinculum = np.count_nonzero(roi_horiz) > 5

                    formula_regions.append({
                        "id": f"freg_{idx+1}",
                        "bbox": [x, y, w, h],
                        "has_vinculum_or_bar": has_vinculum,
                        "confidence": 0.90 if has_vinculum else 0.80,
                    })

        return formula_regions


formula_detector = FormulaRegionDetector()
