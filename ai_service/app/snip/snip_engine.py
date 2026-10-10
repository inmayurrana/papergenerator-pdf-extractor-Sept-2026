import uuid
import re
from pathlib import Path
from typing import Dict, Any, Optional
import cv2  # type: ignore
import numpy as np  # type: ignore
from ..core.config import config
from ..engines.specialized_math import specialized_math
from ..engines.specialized_chem import specialized_chem
from ..engines.specialized_phys import specialized_phys
from ..engines.tesseract_adapter import tesseract_adapter

class VisualSnippingEngine:
    @staticmethod
    def process_snip(
        page_image_path: str,
        bbox: list,  # [x, y, w, h]
        target_mode: str = "AUTO",  # AUTO, TEXT, MATH, PHYSICS, CHEMISTRY, DIAGRAM, ALL
    ) -> Dict[str, Any]:
        p = Path(page_image_path)
        if not p.exists():
            clean = str(page_image_path).replace("\\", "/").lstrip("/")
            if clean.startswith("data/"):
                clean = clean[5:]
            candidate = config.DATA_DIR / clean
            if candidate.exists():
                p = candidate
            else:
                candidate2 = config.BASE_DIR / str(page_image_path).lstrip("/").lstrip("\\")
                if candidate2.exists():
                    p = candidate2

        img = cv2.imread(str(p))
        if img is None:
            raise FileNotFoundError(f"Page image not found: {page_image_path} (checked {p})")

        img_h, img_w = img.shape[:2]
        x, y, w, h = bbox

        x0 = max(0, int(x))
        y0 = max(0, int(y))
        x1 = min(img_w, int(x + w))
        y1 = min(img_h, int(y + h))

        if x1 <= x0 or y1 <= y0:
            crop = img.copy()
            x0, y0, x1, y1 = 0, 0, img_w, img_h
        else:
            crop = img[y0:y1, x0:x1]

        if crop.size == 0:
            raise ValueError("Invalid crop bounds: empty region")

        # Automatically remove background watermarks from cropped snip
        from ..document.preprocessor import image_preprocessor
        crop = image_preprocessor.remove_background_watermarks(crop)

        snip_id = f"snip_{uuid.uuid4().hex[:8]}"
        filename = f"{snip_id}.png"
        target_path = config.STORAGE_SNIPS / filename
        cv2.imwrite(str(target_path), crop)

        crop_h, crop_w = crop.shape[:2]

        # 1. High-Precision OCR with RapidOCR (multi-scale with border padding)
        from ..engines.ocr_extractor import OCRExtractor
        extractor = OCRExtractor()
        raw_spans = extractor.extract_page_text_spans(str(target_path), crop_w, crop_h)

        # Fallback to Tesseract if RapidOCR found nothing and tesseract is available
        if not raw_spans:
            tess_res = tesseract_adapter.process_region(crop)
            if tess_res.get("text"):
                raw_spans = [{
                    "text": tess_res["text"],
                    "bbox": [0, 0, crop_w, crop_h],
                    "score": tess_res.get("confidence", 0.90)
                }]

        # 2. 2D Mathematical Structure Detection (Fractions, Stacking)
        used_span_indices = set()
        detected_fractions = []

        for i, s1 in enumerate(raw_spans):
            if i in used_span_indices:
                continue
            b1 = s1["bbox"]
            cx1 = b1[0] + b1[2] / 2.0
            w1 = b1[2]

            best_j = -1
            min_y_gap = 9999
            for j, s2 in enumerate(raw_spans):
                if i == j or j in used_span_indices:
                    continue
                b2 = s2["bbox"]
                cx2 = b2[0] + b2[2] / 2.0
                w2 = b2[2]

                # Check horizontal alignment & comparable width for fraction stacks
                max_w = max(w1, w2)
                min_w = min(w1, w2)
                width_ratio = min_w / max(1, max_w)
                x_center_diff = abs(cx1 - cx2)

                # Vertical stacking: s1 is directly above s2
                if b2[1] > b1[1] and max_w <= 180 and (width_ratio >= 0.25 or x_center_diff <= 25):
                    y_gap = b2[1] - (b1[1] + b1[3])
                    if -8 <= y_gap <= 25 and y_gap < min_y_gap:
                        min_y_gap = y_gap
                        best_j = j

            if best_j != -1:
                s2 = raw_spans[best_j]
                b2 = s2["bbox"]
                num_txt = s1["text"].strip()
                denom_txt = s2["text"].strip()
                # Clean stray underscores or hyphens from fraction bars
                num_txt = re.sub(r'^[_\-\s]+|[_\-\s]+$', '', num_txt)
                denom_txt = re.sub(r'^[_\-\s]+|[_\-\s]+$', '', denom_txt)

                # Validate: Fraction numerator and denominator must be numbers or math symbols, never long English words/prose
                is_num_valid = bool(re.match(r"^[0-9a-zA-Z\+\-\*\/\^\.\s\\!_()√°µ]+$", num_txt)) and not bool(re.search(r"[a-zA-Z]{4,}", num_txt))
                is_denom_valid = bool(re.match(r"^[0-9a-zA-Z\+\-\*\/\^\.\s\\!_()√°µ]+$", denom_txt)) and not bool(re.search(r"[a-zA-Z]{4,}", denom_txt))

                if num_txt and denom_txt and is_num_valid and is_denom_valid:
                    frac_latex = f"\\frac{{{num_txt}}}{{{denom_txt}}}"
                    comb_bbox = [
                        min(b1[0], b2[0]),
                        b1[1],
                        max(b1[0] + b1[2], b2[0] + b2[2]) - min(b1[0], b2[0]),
                        (b2[1] + b2[3]) - b1[1]
                    ]
                    detected_fractions.append({
                        "span_i": i,
                        "span_j": best_j,
                        "latex": frac_latex,
                        "bbox": comb_bbox,
                        "score": min(s1.get("score", 0.9), s2.get("score", 0.9))
                    })
                    used_span_indices.add(i)
                    used_span_indices.add(best_j)

        # 3. Assemble Spans in Reading Order (Line by line, top-to-bottom, left-to-right)
        assembled_items = []
        for f in detected_fractions:
            assembled_items.append({
                "text": f["latex"],
                "bbox": f["bbox"],
                "is_math": True,
                "score": f["score"]
            })
        for idx, s in enumerate(raw_spans):
            if idx not in used_span_indices:
                assembled_items.append({
                    "text": s["text"],
                    "bbox": s["bbox"],
                    "is_math": False,
                    "score": s.get("score", 0.9)
                })

        # Group by vertical lines using 16px adaptive height
        assembled_items.sort(key=lambda item: (round(item["bbox"][1] / 16) * 16, item["bbox"][0]))

        raw_joined_text = " ".join(item["text"] for item in assembled_items).strip()

        # 4. Convert Embedded Mathematics & Normalization
        # Fix exponents, radicals, Greek letters, physics units, and LaTeX symbols
        converted_text = specialized_math.convert_embedded_math(raw_joined_text)

        # Clean any malformed _{denom}^{num} artifacts back to proper \frac{num}{denom}
        converted_text = re.sub(
            r"(?:_|\b_)\s*\{([^}]+)\}\s*\^\s*\{([^}]+)\}",
            r"\\frac{\2}{\1}",
            converted_text
        )
        converted_text = re.sub(
            r"\^\s*\{([^}]+)\}\s*(?:_|\b_)\s*\{([^}]+)\}",
            r"\\frac{\1}{\2}",
            converted_text
        )

        extracted_text = converted_text.strip()
        confidence = 0.95
        if assembled_items:
            confidence = round(sum(it.get("score", 0.9) for it in assembled_items) / len(assembled_items), 2)

        # 5. Question & Option Structural Decomposition
        detected_qnum = None
        q_match = re.search(r"^\s*(?:Q(?:uestion)?\s*[.\-]?\s*|)([1-9]\d{0,2})\s*[.)\]:\-]\s*", extracted_text, re.IGNORECASE)
        stem_text = extracted_text
        if q_match:
            detected_qnum = q_match.group(1)
            stem_text = extracted_text[q_match.end():].strip()

        # MCQ Option Parsing: (a), (b), (c), (d) or a), b], c), d) or (1), (2), (3), (4) or [A], [B] or a. b.
        OPTION_DETECTOR = re.compile(
            r"(?:^|\s)(?:\(\s*([a-dA-D1-4])\s*\)|\[\s*([a-dA-D1-4])\s*\]|([a-dA-D1-4])\s*[\)\]\}]|([a-dA-D1-4])\s*\.(?!\d))\s*",
            re.IGNORECASE
        )
        opt_matches = list(OPTION_DETECTOR.finditer(stem_text))
        parsed_options = []

        if len(opt_matches) >= 2:
            first_opt_idx = opt_matches[0].start()
            actual_stem = stem_text[:first_opt_idx].strip()

            for i, om in enumerate(opt_matches):
                raw_key = (om.group(1) or om.group(2) or om.group(3) or om.group(4) or "A").upper()
                key_map = {"1": "A", "2": "B", "3": "C", "4": "D"}
                canonical_key = key_map.get(raw_key, raw_key)
                start_p = om.end()
                end_p = opt_matches[i + 1].start() if i + 1 < len(opt_matches) else len(stem_text)
                opt_val = stem_text[start_p:end_p].strip()
                # Clean trailing codes like "NL0134" or "2015"
                opt_val = re.sub(r"\s*(?:NL\d+|[A-Z]{2,}\d{3,}|\b(?:Re-)?(?:AIPMT|NEET|JEE|CBSE)\s*\d{4})\s*$", "", opt_val).strip()
                parsed_options.append({
                    "key": canonical_key,
                    "text": specialized_math.convert_embedded_math(opt_val)
                })

            if actual_stem:
                stem_text = actual_stem
        stem_text = specialized_math.convert_embedded_math(stem_text)

        # Single Option Extraction (when user snips just one specific option)
        detected_opt_key = None
        clean_option_text = specialized_math.convert_embedded_math(extracted_text)
        single_opt_match = re.match(
            r"^\s*(?:\(\s*([a-dA-D1-4])\s*\)|\[\s*([a-dA-D1-4])\s*\]|([a-dA-D1-4])\s*[\)\]\}]|([a-dA-D1-4])\s*\.(?!\d))\s*(.*)",
            extracted_text,
            re.DOTALL | re.IGNORECASE
        )
        if single_opt_match:
            raw_k = (single_opt_match.group(1) or single_opt_match.group(2) or single_opt_match.group(3) or single_opt_match.group(4) or "A").upper()
            key_map = {"1": "A", "2": "B", "3": "C", "4": "D"}
            detected_opt_key = key_map.get(raw_k, raw_k)
            raw_val = single_opt_match.group(5).strip()
            raw_val = re.sub(r"\s*(?:NL\d+|[A-Z]{2,}\d{3,}|\b(?:Re-)?(?:AIPMT|NEET|JEE|CBSE)\s*\d{4})\s*$", "", raw_val).strip()
            clean_option_text = specialized_math.convert_embedded_math(raw_val)
        else:
            trailing_opt_match = re.search(r"\s*(?:\(([a-dA-D1-4])\)|\[([a-dA-D1-4])\]|([a-dA-D1-4])[\.\)\]\}])\s*$", clean_option_text, re.IGNORECASE)
            if trailing_opt_match:
                raw_k = (trailing_opt_match.group(1) or trailing_opt_match.group(2) or trailing_opt_match.group(3)).upper()
                key_map = {"1": "A", "2": "B", "3": "C", "4": "D"}
                detected_opt_key = key_map.get(raw_k, raw_k)
                clean_option_text = clean_option_text[:trailing_opt_match.start()].strip()

        clean_option_text = re.sub(r"\s*(?:NL\d+|[A-Z]{2,}\d{3,}|\b(?:Re-)?(?:AIPMT|NEET|JEE|CBSE)\s*\d{4})\s*$", "", clean_option_text).strip()

        # 6. Scientific Subsystem Processing (AST & LaTeX verification)
        from ..scientific.subsystem import scientific_subsystem
        sci_modes = ["MATH", "PHYSICS", "CHEMISTRY", "AUTO", "ALL"]
        has_math = (
            target_mode in ["MATH", "PHYSICS", "CHEMISTRY", "ALL"]
            or any(c in extracted_text for c in "θϑΘπθαβγδεζηικλμνξρστυφχψωΓΔΛΞΠΣΥΦΨΩ√∛∜∫∑∏∂∇±∓×÷≠≤≥≈≡∞°½¼¾²³")
            or any(k in extracted_text for k in ["\\frac", "\\sqrt", "\\int", "\\sum", "\\pm", "\\times", "\\div", "\\le", "\\ge", "\\neq", "\\pi", "\\theta", "^"])
            or bool(re.search(r"\b(theta|alpha|beta|gamma|delta|lambda|omega|sigma|pi|sin|cos|tan|cot|sec|csc)\b", extracted_text, re.IGNORECASE))
        )

        scientific_result = None
        specialized_info = {}
        latex_formula = ""
        mathml_str = ""

        if target_mode != "TEXT" and (has_math or target_mode in sci_modes):
            effective_sci_mode = target_mode if target_mode in ["MATH", "PHYSICS", "CHEMISTRY"] else "AUTO"
            try:
                scientific_result = scientific_subsystem.process_formula_crop(
                    crop_image=crop,
                    ocr_text=extracted_text,
                    mode=effective_sci_mode,
                )
                specialized_info["scientific"] = scientific_result
                if scientific_result and scientific_result.get("latex"):
                    latex_cand = scientific_result["latex"].strip()
                    # Do not overwrite if scientific_result returned empty or just $$
                    if latex_cand and latex_cand != "$$":
                        latex_formula = latex_cand
                        # Only replace extracted_text if this is a standalone formula snip
                        if not extracted_text or (len(extracted_text) < 30 and not parsed_options and not detected_qnum):
                            extracted_text = latex_cand
                if scientific_result and scientific_result.get("mathml"):
                    mathml_str = scientific_result["mathml"]
            except Exception as sci_err:
                pass

        if not latex_formula and has_math:
            latex_formula = extracted_text

        return {
            "snip_id": snip_id,
            "filename": filename,
            "relative_url": f"/data/snips/{filename}",
            "absolute_path": str(target_path),
            "bbox": [x0, y0, x1 - x0, y1 - y0],
            "width": x1 - x0,
            "height": y1 - y0,
            "extracted_text": extracted_text,
            "latex": latex_formula,
            "mathml": mathml_str,
            "confidence": confidence,
            "mode": target_mode,
            "has_math": has_math,
            "question_number": detected_qnum,
            "stem": stem_text,
            "options": parsed_options,
            "option_key": detected_opt_key,
            "clean_option_text": clean_option_text,
            "specialized_info": specialized_info,
            "scientific_result": scientific_result,
        }

snipping_engine = VisualSnippingEngine()
