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
        target_mode: str = "AUTO",  # AUTO, TEXT, MATH, CHEM, DIAGRAM
    ) -> Dict[str, Any]:
        p = Path(page_image_path)
        if not p.exists():
            # Resolve URL-style paths (e.g. /data/documents/.../page_1.png)
            # to their absolute filesystem equivalents under config.DATA_DIR
            clean = str(page_image_path).replace("\\", "/").lstrip("/")
            # Strip leading "data/" prefix since DATA_DIR already points there
            if clean.startswith("data/"):
                clean = clean[5:]
            candidate = config.DATA_DIR / clean
            if candidate.exists():
                p = candidate
            else:
                # Fallback: try resolving from BASE_DIR (project root)
                candidate2 = config.BASE_DIR / str(page_image_path).lstrip("/").lstrip("\\")
                if candidate2.exists():
                    p = candidate2

        img = cv2.imread(str(p))
        if img is None:
            raise FileNotFoundError(f"Page image not found: {page_image_path} (checked {p})")

        x, y, w, h = bbox
        img_h, img_w = img.shape[:2]

        x0 = max(0, int(x))
        y0 = max(0, int(y))
        x1 = min(img_w, int(x + w))
        y1 = min(img_h, int(y + h))

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

        extracted_text = ""
        confidence = 0.95
        specialized_info = {}

        # Run OCR on the crop if tesseract is available
        tess_res = tesseract_adapter.process_region(crop)
        if tess_res.get("text"):
            extracted_text = tess_res["text"]
            confidence = tess_res.get("confidence", 0.90)

        # Scientific Subsystem Processing
        from ..scientific.subsystem import scientific_subsystem
        sci_modes = ["MATH", "PHYSICS", "CHEMISTRY", "AUTO", "ALL"]
        is_math_crop = (
            target_mode in ["MATH", "PHYSICS", "CHEMISTRY", "ALL"]
            or any(c in extracted_text for c in "θϑΘπθαβγδεζηικλμνξρστυφχψωΓΔΛΞΠΣΥΦΨΩ√∛∜∫∑∏∂∇±∓×÷≠≤≥≈≡∞°½¼¾²³")
            or any(k in extracted_text for k in ["\\frac", "\\sqrt", "\\int", "\\sum", "\\pm", "\\times", "\\div", "\\le", "\\ge", "\\neq", "\\pi", "\\theta", "\\thita", "\\Theta", "\\Thita", "\\alpha", "^", "+-"])
            or bool(re.search(r"\b(theta|thita|alpha|beta|gamma|delta|lambda|omega|sigma|pi|sin|cos|tan|cot|sec|csc)\b", extracted_text, re.IGNORECASE))
            or bool(re.search(r"(->|⇌|H2O|CO2|Fe\^|SO4)", extracted_text))
        )

        scientific_result = None
        if target_mode != "TEXT" and (is_math_crop or target_mode in sci_modes):
            effective_sci_mode = target_mode if target_mode in ["MATH", "PHYSICS", "CHEMISTRY"] else "AUTO"
            scientific_result = scientific_subsystem.process_formula_crop(
                crop_image=crop,
                ocr_text=extracted_text,
                mode=effective_sci_mode,
            )
            specialized_info["scientific"] = scientific_result
            if scientific_result.get("latex"):
                extracted_text = scientific_result["latex"]
            if scientific_result.get("confidence", {}).get("overall_confidence"):
                confidence = scientific_result["confidence"]["overall_confidence"]
        elif target_mode == "TEXT":
            extracted_text = extracted_text.strip()
        else:
            extracted_text = specialized_math.convert_embedded_math(extracted_text)

        return {
            "snip_id": snip_id,
            "filename": filename,
            "relative_url": f"/data/snips/{filename}",
            "absolute_path": str(target_path),
            "bbox": [x0, y0, x1 - x0, y1 - y0],
            "width": x1 - x0,
            "height": y1 - y0,
            "extracted_text": extracted_text,
            "confidence": confidence,
            "mode": target_mode,
            "specialized_info": specialized_info,
            "scientific_result": scientific_result,
        }

snipping_engine = VisualSnippingEngine()
