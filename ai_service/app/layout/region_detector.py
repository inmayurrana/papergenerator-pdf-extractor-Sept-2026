import re
from typing import List, Dict, Any
import cv2  # type: ignore
import numpy as np  # type: ignore

class RegionDetector:
    # Regex patterns for educational structure (limit Q# to 1-3 digits with optional whitespace)
    # Optional prefix: exercise-code marker like NL0117, NL0118 that some PDFs print before the Q number
    QUESTION_PATTERN = re.compile(
        r"^\s*(?:[A-Z]{1,3}\d{2,6}[A-Z0-9_\-]*\s*\n\s*)?(?:"
        r"Q(?:uestion)?\s*[.\-]?\s*(\d{1,3})\s*[.)\]:\-]?"   # Q1, Q.1, Q1., Q.1), Q.1:, Question 1
        r"|(\d{1,3})\s*[.)\]]"                                  # 1. 1) 1]
        r")\s*",
        re.IGNORECASE
    )
    SUBQUESTION_PATTERN = re.compile(r"^\(([a-zA-Z]|\d+|[ivxIVX]+)\)\s*")
    OPTION_PATTERN = re.compile(r"^(?:\(([A-Da-d1-4])\)|([A-Da-d1-4])[\.\)])\s*")
    MARKS_PATTERN = re.compile(r"\[?\b(\d+)\s*(?:marks?|mark|m|pts?)\b\]?|\((\d+)\s*(?:marks?|mark|m)\)", re.IGNORECASE)
    MATH_SYMBOLS_PATTERN = re.compile(
        r"[=+*^√∛∜∫∬∭∮∑∏±∓≤≥≠≈≡∞αβγδεϵζηθϑικλμνξπϖρϱστυφϕχψωΓΔΘΛΞΠΣΥΦΨΩ∂∇∈∉∋⊂⊃⊆⊇∪∩∀∃∄⊥∥∠°∝∴∵×÷·•½⅓⅔¼¾]|(?:(?<=\s)|(?<=\d)|(?<=\)))-(?=\s|\d|[a-zA-Z])|−|\b(?:sin|cos|tan|cot|sec|csc|log|ln|lim|sqrt|frac|pi|theta|alpha|beta)\b|\\(?:frac|sqrt|int|sum|prod|alpha|beta|gamma|delta|theta|lambda|mu|pi|sigma|omega|Delta|Omega|pm|times|div|le|ge|neq|approx|infty|matrix)",
        re.IGNORECASE
    )
    CHEM_PATTERN = re.compile(r"\b(?:[A-Z][a-z]?\d*(?:[+\-]\d*|\^[+\-]\d*)?)+\b|\s*(?:->|-->|⇌|→)\s*")

    @staticmethod
    def detect_diagram_regions_from_image(image_path: str) -> List[Dict[str, Any]]:
        """Detects visual diagrams, graphs, and figures from page image using OpenCV contours."""
        diagrams = []
        try:
            img = cv2.imread(image_path)
            if img is None:
                return []

            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            blurred = cv2.GaussianBlur(gray, (5, 5), 0)
            edges = cv2.Canny(blurred, 50, 150)

            # Dilate to connect diagram shapes
            kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (9, 9))
            dilated = cv2.dilate(edges, kernel, iterations=2)

            contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            h_img, w_img = img.shape[:2]
            min_area = (w_img * h_img) * 0.005  # At least 0.5% of page area
            max_area = (w_img * h_img) * 0.40   # At most 40% of page area

            for idx, c in enumerate(contours):
                area = cv2.contourArea(c)
                if min_area < area < max_area:
                    x, y, w, h = cv2.boundingRect(c)
                    # Exclude whole page borders and thin lines
                    if w > 60 and h > 60 and (w / h < 5.0) and (h / w < 5.0):
                        diagrams.append({
                            "id": f"diag_{idx+1}",
                            "type": "DIAGRAM",
                            "bbox": [x, y, w, h],
                            "confidence": 0.88,
                            "source": "OPENCV_CONTOUR",
                        })
        except Exception:
            pass

        return diagrams

    @staticmethod
    def classify_text_region(text: str, bbox: List[int], page_height: int) -> Dict[str, Any]:
        """Classifies a text block into educational structural category."""
        clean_text = text.strip()
        y = bbox[1]

        # Check Section Titles & Banners
        if re.search(r"^(?:DPP\b|DAILY\s*PRACTICE|EVERYDAY\s*MATHEMATICS|ACHIEVERS\s*SECTION|SECTION\s*[-–:]|PART\s*[-–:]|MATHEMATICS|PHYSICS|CHEMISTRY|BIOLOGY|LOGICAL\s*REASONING|SCIENCE|GRADE\s*\d+|CLASS\s*\d+|MOCK\s*TEST|SAMPLE\s*PAPER|QUESTION\s*PAPER|EXAMINATION\b|CHAPTER\b|UNIT\b|ASSIGNMENT\b)", clean_text, re.IGNORECASE):
            return {"type": "HEADER", "confidence": 0.95}

        # Check Header / Footer by vertical position
        if y < 80 and len(clean_text) < 150:
            return {"type": "HEADER", "confidence": 0.95}
        if y > (page_height - 90) and len(clean_text) < 100:
            return {"type": "FOOTER", "confidence": 0.95}

        # Check Question
        q_match = RegionDetector.QUESTION_PATTERN.match(clean_text)
        if q_match:
            q_num = q_match.group(1) or q_match.group(2)
            return {"type": "QUESTION", "question_number": q_num, "confidence": 0.96}

        # Check Option
        opt_match = RegionDetector.OPTION_PATTERN.match(clean_text)
        if opt_match:
            opt_label = opt_match.group(1) or opt_match.group(2)
            return {"type": "OPTION", "option_label": opt_label.upper(), "confidence": 0.95}

        # Check Subquestion
        sub_match = RegionDetector.SUBQUESTION_PATTERN.match(clean_text)
        if sub_match:
            sub_label = sub_match.group(1)
            return {"type": "SUBQUESTION", "sub_label": sub_label, "confidence": 0.92}

        # Check Biology
        from ..scientific.biology_engine import biology_engine
        bio_eval = biology_engine.analyze_biology_region(clean_text)
        if bio_eval.get("is_biology") and bio_eval.get("confidence", 0) >= 0.85:
            return {"type": "BIOLOGY", "confidence": bio_eval.get("confidence", 0.92), "domain": "BIOLOGY"}

        # Check Chemistry
        from ..scientific.chemistry_engine import chemistry_engine
        chem_eval = chemistry_engine.validate_chemical_equation(clean_text)
        if chem_eval.get("is_chemical") and chem_eval.get("confidence", 0) >= 0.85:
            return {"type": "CHEMISTRY", "confidence": chem_eval.get("confidence", 0.92), "domain": "CHEMISTRY"}
        if "->" in clean_text or "-->" in clean_text or "⇌" in clean_text or "→" in clean_text or "\\rightleftharpoons" in clean_text:
            return {"type": "CHEMISTRY", "confidence": 0.92, "domain": "CHEMISTRY"}

        # Check Physics (equations, compound units, vectors)
        from ..scientific.physics_engine import physics_engine
        from ..scientific.scientific_units import scientific_units
        phys_eval = physics_engine.analyze_physics_region(clean_text)
        if phys_eval.get("is_physics") and phys_eval.get("domain_confidence", 0) >= 0.88:
            return {"type": "PHYSICS", "confidence": phys_eval.get("domain_confidence", 0.92), "domain": "PHYSICS"}
        if any(u in clean_text for u in scientific_units.COMPOUND_UNITS) or "\\vec" in clean_text:
            return {"type": "PHYSICS", "confidence": 0.92, "domain": "PHYSICS"}

        # Check Table
        lines = [ln.strip() for ln in clean_text.split("\n") if ln.strip()]
        if len(lines) >= 2 and all("|" in ln or "\t" in ln or len(ln.split()) >= 4 for ln in lines):
            if any("|" in ln for ln in lines) or any("\t" in ln for ln in lines):
                return {"type": "TABLE", "confidence": 0.90}

        # Check Mixed Text + Mathematics
        has_math = bool(RegionDetector.MATH_SYMBOLS_PATTERN.search(clean_text))
        has_prose = bool(re.search(r"[a-zA-Z]{3,}\s+[a-zA-Z]{3,}\s+[a-zA-Z]{3,}", clean_text))
        if has_math and has_prose:
            return {"type": "MIXED", "confidence": 0.92, "domain": "MIXED"}

        # Check Pure Mathematics
        if has_math:
            return {"type": "MATHEMATICS", "confidence": 0.94, "domain": "MATHEMATICS"}

        # Default Paragraph / Text
        return {"type": "PARAGRAPH", "confidence": 0.88}

region_detector = RegionDetector()
