import logging
import re
import gc
from typing import List, Dict, Any, Optional, Tuple
import psutil  # type: ignore
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

    def is_memory_shortage(self, threshold_pct: float = 78.0, min_free_mb: int = 2048) -> Tuple[bool, int, float]:
        """Detects whether host system is under memory shortage or tight memory pressure."""
        try:
            vm = psutil.virtual_memory()
            free_mb = vm.available // (1024 * 1024)
            used_pct = vm.percent
            is_short = (used_pct >= threshold_pct) or (free_mb < min_free_mb)
            return is_short, free_mb, used_pct
        except Exception:
            return False, 4096, 50.0

    def _process_image_slice(
        self,
        engine: Any,
        slice_bgr: np.ndarray,
        y_offset: int,
        img_w: int,
        img_h: int
    ) -> List[Dict[str, Any]]:
        """Processes a single horizontal image strip and maps bounding boxes back to page space."""
        h_slice, w_slice = slice_bgr.shape[:2]
        scale = 1.5 if w_slice < 1100 else 1.0
        if scale != 1.0:
            resized = cv2.resize(slice_bgr, (int(w_slice * scale), int(h_slice * scale)), interpolation=cv2.INTER_CUBIC)
        else:
            resized = slice_bgr

        pad = 35
        padded = cv2.copyMakeBorder(resized, pad, pad, pad, pad, cv2.BORDER_CONSTANT, value=[255, 255, 255])
        result, _ = engine(padded)

        del padded
        if scale != 1.0:
            del resized

        if not result:
            return []

        spans = []
        for idx, item in enumerate(result):
            dt_boxes, text, score = item
            clean_text = str(text).strip()
            if not clean_text:
                continue

            # Normalize common OCR unicode artifacts
            clean_text = clean_text.replace('\uff08', '(').replace('\uff09', ')')
            clean_text = clean_text.replace('\uff3b', '[').replace('\uff3d', ']')
            clean_text = clean_text.replace('“', '"').replace('”', '"')
            clean_text = clean_text.replace('‘', "'").replace('’', "'")
            clean_text = clean_text.replace('\u2013', '-').replace('\u2014', '-')
            clean_text = re.sub(r'\\thita\b', r'\\theta', clean_text, flags=re.IGNORECASE)
            clean_text = re.sub(r'\b(sin|cos|tan|cot|sec|csc)\s*(?:theta|thita|0)\b', r'\1 θ', clean_text, flags=re.IGNORECASE)
            clean_text = re.sub(r'\bthita\b', 'θ', clean_text, flags=re.IGNORECASE)

            # Map bounding box back to original image space
            xs = [(pt[0] - pad) / scale for pt in dt_boxes]
            ys = [(pt[1] - pad) / scale + y_offset for pt in dt_boxes]
            x_min = max(0, min(img_w, int(min(xs))))
            y_min = max(0, min(img_h, int(min(ys))))
            x_max = max(0, min(img_w, int(max(xs))))
            y_max = max(0, min(img_h, int(max(ys))))
            w = max(1, x_max - x_min)
            h = max(1, y_max - y_min)

            spans.append({
                "id": f"ocr_span_{y_offset}_{idx+1}",
                "text": clean_text,
                "bbox": [x_min, y_min, w, h],
                "confidence": round(float(score), 3),
                "source": "RAPID_OCR"
            })

        return spans

    def _deduplicate_boundary_spans(self, spans: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Removes duplicate spans produced across overlapping chunk boundaries."""
        if len(spans) <= 1:
            return spans

        # Sort by vertical position
        spans_sorted = sorted(spans, key=lambda s: (s["bbox"][1], s["bbox"][0]))
        deduped: List[Dict[str, Any]] = []

        for s in spans_sorted:
            is_dup = False
            s_bbox = s["bbox"]
            s_text = "".join(s["text"].split()).lower()

            for prev in deduped:
                p_bbox = prev["bbox"]
                # Calculate vertical overlap
                y_top = max(s_bbox[1], p_bbox[1])
                y_bot = min(s_bbox[1] + s_bbox[3], p_bbox[1] + p_bbox[3])
                v_overlap = max(0, y_bot - y_top)
                min_h = min(s_bbox[3], p_bbox[3])

                # Calculate horizontal overlap
                x_left = max(s_bbox[0], p_bbox[0])
                x_right = min(s_bbox[0] + s_bbox[2], p_bbox[0] + p_bbox[2])
                h_overlap = max(0, x_right - x_left)
                min_w = min(s_bbox[2], p_bbox[2])

                if min_h > 0 and (v_overlap / min_h > 0.45) and min_w > 0 and (h_overlap / min_w > 0.40):
                    p_text = "".join(prev["text"].split()).lower()
                    if s_text == p_text or s_text in p_text or p_text in s_text:
                        is_dup = True
                        # If current span has higher confidence or longer text, upgrade previous
                        if s["confidence"] > prev["confidence"] or len(s["text"]) > len(prev["text"]):
                            prev["text"] = s["text"]
                            prev["confidence"] = s["confidence"]
                            prev["bbox"] = [
                                min(s_bbox[0], p_bbox[0]),
                                min(s_bbox[1], p_bbox[1]),
                                max(s_bbox[0] + s_bbox[2], p_bbox[0] + p_bbox[2]) - min(s_bbox[0], p_bbox[0]),
                                max(s_bbox[1] + s_bbox[3], p_bbox[1] + p_bbox[3]) - min(s_bbox[1], p_bbox[1]),
                            ]
                        break

            if not is_dup:
                deduped.append(s)

        return deduped

    def extract_page_text_spans(
        self,
        image_path: str,
        img_w: int,
        img_h: int
    ) -> List[Dict[str, Any]]:
        """
        Runs high-accuracy OCR on a page image (or scanned document).
        Automatically detects memory shortage: when RAM pressure is high or image
        is large, processes in overlapping spatial chunks, releasing RAM after each chunk,
        and seamlessly reassembling the complete output without data loss.
        """
        engine = self._get_engine()
        if engine is None:
            logger.warning("No OCR engine available.")
            return []

        try:
            img = cv2.imread(str(image_path))
            if img is None:
                result, _ = engine(image_path)
                if not result:
                    return []
                raw_spans = []
                for idx, item in enumerate(result):
                    dt_boxes, text, score = item
                    clean_text = str(text).strip()
                    if not clean_text:
                        continue
                    xs = [pt[0] for pt in dt_boxes]
                    ys = [pt[1] for pt in dt_boxes]
                    x_min = max(0, min(img_w, int(min(xs))))
                    y_min = max(0, min(img_h, int(min(ys))))
                    x_max = max(0, min(img_w, int(max(xs))))
                    y_max = max(0, min(img_h, int(max(ys))))
                    raw_spans.append({
                        "id": f"ocr_span_{idx+1}",
                        "text": clean_text,
                        "bbox": [x_min, y_min, max(1, x_max - x_min), max(1, y_max - y_min)],
                        "confidence": round(float(score), 3),
                        "source": "RAPID_OCR"
                    })
                return raw_spans

            h_orig, w_orig = img.shape[:2]
            is_shortage, free_mb, used_pct = self.is_memory_shortage()
            use_chunking = is_shortage or (h_orig > 1400) or (w_orig * h_orig > 1500000)

            raw_spans: List[Dict[str, Any]] = []

            if use_chunking:
                # Vertical Chunking: Split into overlapping horizontal strips
                # Prevents massive ONNX buffer allocations and memory exhaustion
                chunk_h = 800
                overlap = 80
                step = chunk_h - overlap
                y_starts = list(range(0, h_orig, step))
                if len(y_starts) > 1 and (h_orig - y_starts[-1]) < 200:
                    y_starts.pop()  # Merge tiny leftover bottom strip into previous

                logger.info(
                    "Memory-safe chunked OCR active (RAM: %.1f%% used, %d MB free). Slicing %dx%d image into %d chunks.",
                    used_pct, free_mb, w_orig, h_orig, len(y_starts)
                )

                for chunk_idx, y_start in enumerate(y_starts):
                    y_end = min(h_orig, y_start + chunk_h)
                    slice_bgr = img[y_start:y_end, :]
                    slice_spans = self._process_image_slice(engine, slice_bgr, y_start, img_w, img_h)
                    raw_spans.extend(slice_spans)

                    # Explicitly release slice buffer and run garbage collection between chunks
                    del slice_bgr
                    gc.collect()

                # Deduplicate spans captured across chunk overlaps
                spans = self._deduplicate_boundary_spans(raw_spans)
                logger.info("Chunked OCR complete: %d raw spans merged into %d complete spans.", len(raw_spans), len(spans))
            else:
                # Standard single-pass for small images with plenty of RAM
                spans = self._process_image_slice(engine, img, 0, img_w, img_h)

            if not spans:
                return []

            # Re-index span IDs cleanly
            for i, s in enumerate(spans):
                s["id"] = f"ocr_span_{i+1}"

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

