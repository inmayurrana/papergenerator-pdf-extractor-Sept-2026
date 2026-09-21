import logging
import re
from typing import List, Dict, Any, Optional
import numpy as np  # type: ignore
from PIL import Image  # type: ignore

logger = logging.getLogger(__name__)

class OCRExtractor:
    def __init__(self):
        self._engine = None

    def _get_engine(self):
        if self._engine is None:
            try:
                from rapidocr_onnxruntime import RapidOCR  # type: ignore
                self._engine = RapidOCR()
                logger.info("RapidOCR engine initialized successfully.")
            except Exception as e:
                logger.error(f"Failed to load RapidOCR: {e}")
        return self._engine

    def extract_page_text_spans(
        self,
        image_path: str,
        img_w: int,
        img_h: int
    ) -> List[Dict[str, Any]]:
        """
        Runs high-accuracy OCR on a page image (or scanned document)
        and returns structured text spans with bounding boxes.
        """
        engine = self._get_engine()
        if engine is None:
            logger.warning("No OCR engine available.")
            return []

        try:
            result, elapse = engine(image_path)
            if not result:
                return []

            spans = []
            for idx, item in enumerate(result):
                # item format: [dt_boxes, text, score]
                dt_boxes, text, score = item
                clean_text = str(text).strip()
                if not clean_text:
                    continue

                # Normalize common OCR unicode artifacts (full-width brackets, dashes, theta)
                clean_text = clean_text.replace('\uff08', '(').replace('\uff09', ')')
                clean_text = clean_text.replace('\uff3b', '[').replace('\uff3d', ']')
                clean_text = clean_text.replace('“', '"').replace('”', '"')
                clean_text = clean_text.replace('‘', "'").replace('’', "'")
                clean_text = clean_text.replace('\u2013', '-').replace('\u2014', '-')
                clean_text = re.sub(r'\\thita\b', r'\\theta', clean_text, flags=re.IGNORECASE)
                clean_text = re.sub(r'\b(sin|cos|tan|cot|sec|csc)\s*(?:theta|thita|0)\b', r'\1 θ', clean_text, flags=re.IGNORECASE)
                clean_text = re.sub(r'\bthita\b', 'θ', clean_text, flags=re.IGNORECASE)

                # Calculate bounding box [x, y, w, h] from 4 corner polygon points
                xs = [pt[0] for pt in dt_boxes]
                ys = [pt[1] for pt in dt_boxes]
                x_min = max(0, int(min(xs)))
                y_min = max(0, int(min(ys)))
                x_max = min(img_w, int(max(xs)))
                y_max = min(img_h, int(max(ys)))
                w = max(1, x_max - x_min)
                h = max(1, y_max - y_min)

                spans.append({
                    "id": f"ocr_span_{idx+1}",
                    "text": clean_text,
                    "bbox": [x_min, y_min, w, h],
                    "confidence": round(float(score), 3),
                    "source": "RAPID_OCR"
                })

            return spans
        except Exception as e:
            logger.error(f"OCR extraction failed for {image_path}: {e}")
            return []

ocr_extractor = OCRExtractor()
