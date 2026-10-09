import re
from typing import List, Dict, Any
import cv2  # type: ignore
import numpy as np  # type: ignore

class RegionDetector:
    # Regex patterns for educational structure (limit Q# to 1-3 digits with optional whitespace or end of string)
    # Allows isolated OCR tokens like 'Q.1', 'Q.2', '1.' without requiring trailing whitespace
    QUESTION_PATTERN = re.compile(
        r"^\s*(?:[A-Z]{1,3}\d{2,6}[A-Z0-9_\-]*\s*\n\s*)?(?:"
        r"Q(?:uestion)?\s*[.\-]?\s*([1-9]\d{0,2})\s*[.)\]:\-]?"   # Q1, Q.1, Q1., Q.1), Q.1:, Question 1
        r"|([1-9]\d{0,2})\s*(?:\.(?!\d)|[)\]])"                 # 1. 1) 1] (prevents decimal like 0.25)
        r")(?:\s+|$)",
        re.IGNORECASE
    )

    # Multi-question range instructions and section directives should be treated as HEADERS, not questions
    HEADER_INSTRUCTION_PATTERN = re.compile(
        r"^\s*(?:\[\s*)?(?:"
        r"Q(?:uestion)?\s*[.\-]?\s*\d+\s*(?:to|-|–)\s*Q?(?:uestion)?\s*[.\-]?\s*\d+"
        r"|SINGLE\s+CORRECT"
        r"|MULTIPLE\s+CORRECT"
        r"|ONE\s+OR\s+MORE\s+THAN\s+ONE"
        r"|MATCH\s+THE\s+COLUMN"
        r"|MATRIX\s+MATCH"
        r"|COMPREHENSION"
        r"|NUMERICAL\s+VALUE"
        r"|INTEGER\s+TYPE"
        r"|ASSERTION"
        r"|SECTION\s*[-–:]"
        r"|PART\s*[-–:]"
        r"|DIRECTIONS?"
        r")\b",
        re.IGNORECASE
    )

    ANSWER_PATTERN = re.compile(
        r"\b(?:Ans(?:wer)?|Sol(?:ution)?|Correct\s*Option)\s*[.:=\-]?\s*\(?([A-Da-d1-4])\)?",
        re.IGNORECASE
    )
    SUBQUESTION_PATTERN = re.compile(r"^\(([a-zA-Z]|\d+|[ivxIVX]+)\)\s*")
    NOUN_EXCLUSIONS = r"(?<!\bblock\s)(?<!\bbody\s)(?<!\bparticle\s)(?<!\bmass\s)(?<!\bwire\s)(?<!\bpulley\s)(?<!\bsphere\s)(?<!\bcylinder\s)(?<!\brod\s)(?<!\bcar\s)(?<!\btrain\s)(?<!\bdisc\s)(?<!\bplate\s)(?<!\bobject\s)(?<!\bbetween\s)(?<!\band\s)(?<!\bfor\s)(?<!\bwith\s)(?<!\bto\s)"
    OPTION_PATTERN = re.compile(rf"^(?:{NOUN_EXCLUSIONS}\(([A-Da-d1-4])\)|([A-Da-d1-4])[\.\)])\s*", re.IGNORECASE)
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

        # 0. Check section instruction directives (e.g. Q.1 to Q.9 has four choices, [SINGLE CORRECT CHOICE TYPE])
        if RegionDetector.HEADER_INSTRUCTION_PATTERN.search(clean_text):
            return {"type": "HEADER", "confidence": 0.96}

        # 1. Question pattern evaluated EARLY so questions near page top are never misclassified as headers
        q_match = RegionDetector.QUESTION_PATTERN.match(clean_text)
        if q_match:
            q_num = q_match.group(1) or q_match.group(2)
            return {"type": "QUESTION", "question_number": q_num, "confidence": 0.96}

        # 2. Check Answer keys (e.g. "Ans. (A)", "Ans: B", "Answer: C")
        ans_match = RegionDetector.ANSWER_PATTERN.search(clean_text)
        if ans_match:
            return {"type": "ANSWER", "answer_key": ans_match.group(1).upper(), "confidence": 0.96}
        if clean_text.lower() in ["ans.", "ans", "answer:", "answer"]:
            return {"type": "ANSWER", "confidence": 0.92}

        # 3. Check Section Titles & Banners
        if re.search(r"^(?:DPP\b|DAILY\s*PRACTICE|EVERYDAY\s*MATHEMATICS|ACHIEVERS\s*SECTION|SECTION\s*[-–:]|PART\s*[-–:]|MATHEMATICS|PHYSICS|CHEMISTRY|BIOLOGY|LOGICAL\s*REASONING|SCIENCE|GRADE\s*\d+|CLASS\s*\d+|MOCK\s*TEST|SAMPLE\s*PAPER|QUESTION\s*PAPER|EXAMINATION\b|CHAPTER\b|UNIT\b|ASSIGNMENT\b)", clean_text, re.IGNORECASE):
            return {"type": "HEADER", "confidence": 0.95}

        # 4. Check Header by vertical position near top margin (< 5.5% of page)
        header_limit = max(80, int(page_height * 0.055))
        if y < header_limit and len(clean_text) < 150:
            return {"type": "HEADER", "confidence": 0.95}

        # 5. Check Option (excluding sentence endings like '(B) is :-')
        # First: check for MULTI-OPTION inline block (2-column MCQ style: "(1) x (2) y" or "(A) x (B) y")
        multi_opt_pattern = re.compile(
            r"(?:^|\s)\(([A-Da-d1-4])\)\s*.+?\s+\(([A-Da-d1-4])\)\s*",
            re.IGNORECASE
        )
        multi_match = multi_opt_pattern.search(clean_text)
        if multi_match and not re.search(r"\b(?:is|are|will\s*be|was|were)\s*[:=\-]", clean_text, re.IGNORECASE):
            first_lbl = multi_match.group(1)
            mapping = {"1": "A", "2": "B", "3": "C", "4": "D"}
            return {"type": "OPTION", "option_label": mapping.get(first_lbl, first_lbl.upper()), "confidence": 0.95}

        # Second: single option at start of block
        opt_match = RegionDetector.OPTION_PATTERN.match(clean_text)
        if opt_match and not re.search(r"\b(?:is|are|will\s*be|was|were)\s*[:=\-]", clean_text, re.IGNORECASE):
            opt_label = opt_match.group(1) or opt_match.group(2)
            mapping = {"1": "A", "2": "B", "3": "C", "4": "D"}
            return {"type": "OPTION", "option_label": mapping.get(opt_label, opt_label.upper()), "confidence": 0.95}

        # 6. Check Subquestion
        sub_match = RegionDetector.SUBQUESTION_PATTERN.match(clean_text)
        if sub_match:
            sub_label = sub_match.group(1)
            return {"type": "SUBQUESTION", "sub_label": sub_label, "confidence": 0.92}

        # 7. Check Footer only at the extreme bottom edge (> 96% of page height) and only if short
        footer_limit = int(page_height * 0.96)
        if y > footer_limit and len(clean_text) < 60:
            return {"type": "FOOTER", "confidence": 0.95}


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
