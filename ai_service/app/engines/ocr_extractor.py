import logging
import re
from typing import List, Dict, Any, Optional
import cv2  # type: ignore
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
                self._engine = RapidOCR(
                    det_box_thresh=0.35,
                    det_unclip_ratio=1.8,
                    det_limit_side_len=1536,
                    text_score=0.38,
                    use_cls=False
                )
                logger.info("RapidOCR engine initialized successfully with enhanced resolution parameters.")
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
        with boundary padding and resolution scaling, returning structured
        text spans with exact bounding boxes in original image coordinates.
        """
        engine = self._get_engine()
        if engine is None:
            logger.warning("No OCR engine available.")
            return []

        try:
            img = cv2.imread(str(image_path))
            if img is None:
                result, elapse = engine(image_path)
                scale = 1.0
                pad = 0
            else:
                h_orig, w_orig = img.shape[:2]
                # Scale up low-res screenshots and tightly cropped questions (w < 1100px)
                # to render mathematical exponents, chemical notations, and fractions crisply
                scale = 1.5 if w_orig < 1100 else 1.0
                if scale != 1.0:
                    resized = cv2.resize(img, (int(w_orig * scale), int(h_orig * scale)), interpolation=cv2.INTER_CUBIC)
                else:
                    resized = img.copy()

                # Add 35px white margin padding around all borders so DBNet text detector
                # never clips or drops question numbers and text touching the image borders
                pad = 35
                padded = cv2.copyMakeBorder(resized, pad, pad, pad, pad, cv2.BORDER_CONSTANT, value=[255, 255, 255])
                result, elapse = engine(padded)

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

                # Calculate bounding box [x, y, w, h] mapped back to unpadded, unscaled image space
                xs = [(pt[0] - pad) / scale for pt in dt_boxes]
                ys = [(pt[1] - pad) / scale for pt in dt_boxes]
                x_min = max(0, min(img_w, int(min(xs))))
                y_min = max(0, min(img_h, int(min(ys))))
                x_max = max(0, min(img_w, int(max(xs))))
                y_max = max(0, min(img_h, int(max(ys))))
                w = max(1, x_max - x_min)
                h = max(1, y_max - y_min)

                spans.append({
                    "id": f"ocr_span_{idx+1}",
                    "text": clean_text,
                    "bbox": [x_min, y_min, w, h],
                    "confidence": round(float(score), 3),
                    "source": "RAPID_OCR"
                })

            # Sort spans primarily by row line and secondarily by x for reliable horizontal grouping
            spans.sort(key=lambda s: (round(s["bbox"][1] / 14) * 14, s["bbox"][0]))

            # Intelligently merge horizontally adjacent tokens on the same line:
            # 1. Q# prefix ('1.', '2.', 'Q.1', '(1)', or isolated digit at left edge) + stem text
            # 2. 'Ans.' + option answer key (e.g. 'Ans.' + '(A)' -> 'Ans. (A)')
            merged_spans = []
            skip_next = False
            for i in range(len(spans)):
                if skip_next:
                    skip_next = False
                    continue
                s = spans[i]
                if i + 1 < len(spans):
                    nxt = spans[i + 1]
                    y_diff = abs((s["bbox"][1] + s["bbox"][3]/2) - (nxt["bbox"][1] + nxt["bbox"][3]/2))
                    x_gap = nxt["bbox"][0] - (s["bbox"][0] + s["bbox"][2])

                    # Case 1: Q-number prefix near left margin (x < 25% of width)
                    is_q_num = bool(re.match(r"^(?:[1-9]\d{0,2}[.)\]]|Q(?:uestion)?\s*[.\-]?\s*\d{1,3}[.)\]:\-]?|\([1-9]\d{0,2}\))$", s["text"].strip(), re.IGNORECASE))
                    if not is_q_num and re.match(r"^[1-9]\d{0,1}$", s["text"].strip()) and s["bbox"][0] < 45:
                        if re.match(r"^[A-Za-z]", nxt["text"].strip()):
                            is_q_num = True

                    if is_q_num and s["bbox"][0] < img_w * 0.25 and y_diff < 15 and -5 <= x_gap < 55:
                        prefix = s["text"].strip()
                        if re.match(r"^\d+$", prefix):
                            prefix = f"{prefix}."
                        merged = dict(s)
                        merged["text"] = f"{prefix} {nxt['text'].strip()}"
                        merged["bbox"] = [
                            s["bbox"][0],
                            min(s["bbox"][1], nxt["bbox"][1]),
                            (nxt["bbox"][0] + nxt["bbox"][2]) - s["bbox"][0],
                            max(s["bbox"][3], nxt["bbox"][3])
                        ]
                        merged_spans.append(merged)
                        skip_next = True
                        continue

                    # Case 2: 'Ans.' + answer key
                    if s["text"].strip().lower() in ["ans.", "ans", "answer:", "answer"] and y_diff < 14 and -5 <= x_gap < 80 and re.match(r"^\(?([A-Da-d1-4])\)?$", nxt["text"].strip()):
                        merged = dict(s)
                        merged["text"] = f"Ans. {nxt['text'].strip()}"
                        merged["bbox"] = [
                            s["bbox"][0],
                            min(s["bbox"][1], nxt["bbox"][1]),
                            (nxt["bbox"][0] + nxt["bbox"][2]) - s["bbox"][0],
                            max(s["bbox"][3], nxt["bbox"][3])
                        ]
                        merged_spans.append(merged)
                        skip_next = True
                        continue

                merged_spans.append(s)

            return merged_spans
        except Exception as e:
            logger.error(f"OCR extraction failed for {image_path}: {e}")
            return []

ocr_extractor = OCRExtractor()

