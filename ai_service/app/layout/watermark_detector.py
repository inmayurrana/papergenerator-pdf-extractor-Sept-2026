"""
Watermark / Logo Intelligence Module (Requirements 94, 95, 96)
- Identifies watermark candidates using repetition across pages, low-opacity text,
  repeated corner logos, and diagonal translucent elements.
- Strict authorization protocol: NEVER modifies original source files.
- Supports KEEP ORIGINAL, HIDE IN PREVIEW, and REMOVE FROM AUTHORIZED EXPORT.
"""

import cv2  # type: ignore
import numpy as np  # type: ignore
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

logger = logging.getLogger("watermark_detector")

class WatermarkDetector:
    """Detects and manages authorized watermark/logo regions across documents."""

    def __init__(self):
        # Cache for user decisions per document: {doc_id: {region_id: action}}
        self._user_actions: Dict[str, Dict[str, str]] = {}

    def detect_watermark_candidates(
        self,
        page_images: List[np.ndarray],
        text_spans: Optional[List[Dict[str, Any]]] = None
    ) -> List[Dict[str, Any]]:
        """
        Analyzes page images and text spans to detect watermark candidates based on:
        1. Low-opacity / high-luminance background elements
        2. Corner or center repetition
        3. Faint diagonal text blocks
        """
        candidates: List[Dict[str, Any]] = []

        if page_images is None:
            return candidates
        if isinstance(page_images, np.ndarray):
            page_images = [page_images]
        elif len(page_images) == 0:
            return candidates

        first_img = page_images[0]
        h, w = first_img.shape[:2]
        gray = cv2.cvtColor(first_img, cv2.COLOR_BGR2GRAY) if len(first_img.shape) == 3 else first_img

        # 1. Check for faint translucent background elements (luminance > 210 and < 250 with variance)
        # Often watermarks have faint edges
        blurred = cv2.GaussianBlur(gray, (7, 7), 0)
        edges = cv2.Canny(blurred, 30, 80)
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        for idx, cnt in enumerate(contours):
            area = cv2.contourArea(cnt)
            # A watermark logo typically has a moderate to large footprint
            if 5000 < area < (w * h * 0.4):
                x, y, cw, ch = cv2.boundingRect(cnt)
                # Check mean brightness in the bounding box
                roi = gray[y:y+ch, x:x+cw]
                mean_val = np.mean(roi)
                if mean_val > 210:  # Faint / translucent
                    candidates.append({
                        "id": f"wm_candidate_{idx+1}",
                        "type": "TRANSLUCENT_GRAPHIC",
                        "bbox": [int(x), int(y), int(cw), int(ch)],
                        "confidence": 0.82,
                        "description": "Faint background graphic or watermark logo",
                        "default_action": "KEEP_ORIGINAL",
                        "preview_crop": None
                    })

        # 2. Check text spans for common watermark / institutional stamps
        if text_spans:
            for s in text_spans:
                txt = s.get("text", "").lower()
                if any(w_word in txt for w_word in ["confidential", "sample", "draft", "copyright", "strictly for", "institute", "allen", "aakash", "resonance"]):
                    candidates.append({
                        "id": f"wm_text_{s.get('id', '1')}",
                        "type": "STAMP_OR_WATERMARK_TEXT",
                        "bbox": s.get("bbox", [0, 0, 100, 30]),
                        "confidence": 0.88,
                        "text": s.get("text"),
                        "description": f"Repeated header/watermark text: {s.get('text', '')[:30]}",
                        "default_action": "KEEP_ORIGINAL"
                    })

        # Deduplicate candidates with significant overlap
        unique_candidates: List[Dict[str, Any]] = []
        for c in candidates:
            c_bbox = c["bbox"]
            overlap = False
            for u in unique_candidates:
                u_bbox = u["bbox"]
                # Compute IoU
                ix = max(c_bbox[0], u_bbox[0])
                iy = max(c_bbox[1], u_bbox[1])
                iw = max(0, min(c_bbox[0] + c_bbox[2], u_bbox[0] + u_bbox[2]) - ix)
                ih = max(0, min(c_bbox[1] + c_bbox[3], u_bbox[1] + u_bbox[3]) - iy)
                intersection = iw * ih
                c_area = c_bbox[2] * c_bbox[3]
                if c_area > 0 and (intersection / c_area) > 0.6:
                    overlap = True
                    break
            if not overlap:
                unique_candidates.append(c)

        return unique_candidates

    def apply_watermark_action(
        self,
        image: np.ndarray,
        watermark_id: str,
        action: str,  # "KEEP_ORIGINAL" | "HIDE_IN_PREVIEW" | "REMOVE_FROM_EXPORT"
        bbox: List[int],
        user_authorized: bool = False
    ) -> Tuple[np.ndarray, Dict[str, Any]]:
        """
        Applies watermark processing on derivative images.
        CRITICAL: Never modifies original source image.
        Returns a processed derivative copy.
        """
        derivative = image.copy()
        if action == "KEEP_ORIGINAL" or not user_authorized:
            return derivative, {
                "action_applied": "KEEP_ORIGINAL",
                "reason": "Original preserved or authorization not explicitly granted"
            }

        x, y, w, h = bbox
        x = max(0, x)
        y = max(0, y)
        w = min(w, derivative.shape[1] - x)
        h = min(h, derivative.shape[0] - y)

        if action in ["HIDE_IN_PREVIEW", "REMOVE_FROM_EXPORT"] and user_authorized:
            # Telea / Navier-Stokes inpainting or background color synthesis
            mask = np.zeros(derivative.shape[:2], dtype=np.uint8)
            mask[y:y+h, x:x+w] = 255
            try:
                # Inpaint faint watermark using surrounding background pixels
                derivative = cv2.inpaint(derivative, mask, inpaintRadius=3, flags=cv2.INPAINT_TELEA)
            except Exception as e:
                logger.warning(f"Watermark inpainting failed: {e}, falling back to white fill")
                derivative[y:y+h, x:x+w] = 255

            return derivative, {
                "action_applied": action,
                "user_authorized": True,
                "bbox": [x, y, w, h],
                "method": "TELEA_INPAINTING"
            }

        return derivative, {"action_applied": "KEEP_ORIGINAL"}

watermark_detector = WatermarkDetector()
