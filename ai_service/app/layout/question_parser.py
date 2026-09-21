import re
from typing import List, Dict, Any, Optional
from ..engines.specialized_math import specialized_math

class QuestionParser:
    MARKS_REGEX = re.compile(
        r"(?:\[|\()\s*(\d+)\s*(?:marks?|mark|pts?)?\s*(?:\]|\))|\bmarks?\s*[:=]\s*(\d+)\b|\[(\d+)\]",
        re.IGNORECASE
    )
    ANSWER_REGEX = re.compile(r"\b(?:Ans(?:wer)?|Sol(?:ution)?|Correct Option)\s*[:=\-]\s*([A-Da-d1-4]|\w+)", re.IGNORECASE)
    OPTION_SPLIT_REGEX = re.compile(r"(?:\(([a-dA-D1-4])\)|(?:(?<=^)|(?<=\s))([a-dA-D1-4])\.(?!\d)|(?:(?<=^)|(?<=\s))([a-dA-D1-4])\))\s*")

    @staticmethod
    def extract_marks(text: str) -> Optional[int]:
        m = QuestionParser.MARKS_REGEX.search(text)
        if m:
            val = m.group(1) or m.group(2) or m.group(3)
            try:
                return int(val)
            except ValueError:
                pass
        return 1  # Default 1 mark

    @staticmethod
    def extract_answer(text: str) -> Optional[str]:
        m = QuestionParser.ANSWER_REGEX.search(text)
        if m:
            return m.group(1).upper()
        return None

    @staticmethod
    def parse_options_from_text(text: str) -> List[Dict[str, str]]:
        """Parses inline or multiline MCQ options (A, B, C, D) across lines."""
        if not text or not text.strip():
            return []

        matches = list(QuestionParser.OPTION_SPLIT_REGEX.finditer(text))
        if not matches:
            return []

        options = []
        for i, om in enumerate(matches):
            label = (om.group(1) or om.group(2) or om.group(3)).upper()
            mapping = {"1": "A", "2": "B", "3": "C", "4": "D"}
            label = mapping.get(label, label)
            start = om.end()
            end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
            val = text[start:end].strip()
            # Clean internal newlines/excess whitespace
            val = re.sub(r"\s+", " ", val)
            options.append({
                "key": label,
                "text": specialized_math.convert_embedded_math(val)
            })

        return options

    @staticmethod
    def is_diagram_annotation(text: str) -> bool:
        """Determines if an isolated text block is a diagram label/annotation or coaching code rather than question stem prose."""
        cleaned = text.strip()
        if not cleaned:
            return True
        unmath = re.sub(r"[\$\\\{\}]", "", cleaned).strip()
        if re.match(r"^[a-zA-Z]$", unmath):
            return True
        if re.match(r"^[A-Z]{1,4}\d{2,6}[A-Z0-9_\-]*$", cleaned):
            return True
        lines = [ln.strip() for ln in unmath.split("\n") if ln.strip()]
        if all(
            re.match(r"^(?:\d+(?:\.\d+)?\s*(?:kg|g|N|m|cm|mm|V|A|J|s|ms|°|deg|\^circ)?|[A-Za-z]\s*=\s*\d+.*|[MmFfTtAaVvNnXxYyZz]\s*(?:theta|thita|\d+)?|[Mm]\s*theta|[Mm]|\d+\s*°)$", ln, re.IGNORECASE)
            for ln in lines
        ):
            return True
        words = unmath.split()
        token_pat = re.compile(r"^(?:[A-Za-z](?:_?\d+)?|\d+(?:\.\d+)?(?:kg|g|N|m|cm|mm|V|A|J|s|ms|°)?|[A-Za-z]=\d+.*|Smooth|Rough|Wall|Hinge|Spring|Fixed|Pulley|Block|Fig(?:\.\s*\(\d+\))?)$", re.IGNORECASE)
        if len(words) >= 1 and all(token_pat.match(w) for w in words):
            return True
        if len(words) <= 4 and not any(p in unmath for p in [".", "?", ":", ";"]):
            common_verbs = {"is", "are", "was", "were", "find", "calculate", "determine", "what", "show", "placed", "shown", "having", "acceleration"}
            if not any(w.lower() in common_verbs for w in words):
                return True
        return False

    @staticmethod
    def build_structured_questions(
        regions: List[Dict[str, Any]],
        diagrams: Optional[List[Dict[str, Any]]] = None
    ) -> List[Dict[str, Any]]:
        """Aggregates sorted regions into full structured educational question objects."""
        questions: List[Dict[str, Any]] = []
        current_q: Optional[Dict[str, Any]] = None
        diagrams = diagrams or []

        for r in regions:
            rtype = r.get("type", "PARAGRAPH")
            text = r.get("text", "").strip()

            if rtype == "HEADER" or rtype == "FOOTER":
                continue

            if rtype == "QUESTION":
                if current_q:
                    # Finalize current question
                    QuestionParser._finalize_question(current_q, diagrams)
                    questions.append(current_q)

                q_num = r.get("question_number", str(len(questions) + 1))
                # Strip out question number prefix from text body (Q.1, Q1., Q1), 1. 1) etc.)
                # Also strip any preceding exercise-code marker line (e.g. NL0117\n)
                clean_body = re.sub(
                    r"^\s*(?:[A-Z]{1,3}\d{2,6}[A-Z0-9_\-]*\s*\n\s*)?(?:Q(?:uestion)?\s*[.\-]?\s*\d{1,3}\s*[.)\]:\-]?|\d{1,3}\s*[.)\]]|\(\d{1,3}\))\s*",
                    "", text, flags=re.IGNORECASE
                ).strip()

                # Strip diagram label fragments that bleed into the question stem:
                # e.g. "4 kg\n2 kg\nF = 24 N\nSmooth" before the actual sentence
                clean_body = re.sub(
                    r'^(?:\s*(?:\d+(?:\.\d+)?\s*kg|Smooth\b|Wall\b|Rough\b|Hinge\b|Spring\b|[A-Z]\s*=\s*\d+\s*N|F\s*=\s*\d+\s*N|\d+\s*N|\d+\s*m|\d+\s*cm)\s*\n)+',
                    '', clean_body, flags=re.IGNORECASE
                ).strip()

                # Check if inline options are embedded inside the question text
                # e.g. "If V = 4/3 \pi r^3 ... ?(a) \pi (b) 4\pi (c) 40\pi (d) 4\pi/3"
                opt_matches = list(QuestionParser.OPTION_SPLIT_REGEX.finditer(clean_body))
                inline_options = []
                if len(opt_matches) >= 2:
                    first_opt_idx = opt_matches[0].start()
                    opts_text = clean_body[first_opt_idx:]
                    clean_body = clean_body[:first_opt_idx].strip()
                    inline_options = QuestionParser.parse_options_from_text(opts_text)

                # Normalize math in question stem
                normalized_stem = specialized_math.convert_embedded_math(clean_body if clean_body else text)

                current_q = {
                    "id": f"q_{len(questions)+1}",
                    "question_number": q_num,
                    "question_text": normalized_stem,
                    "subquestions": [],
                    "options": inline_options,
                    "correct_answer": "",
                    "explanation": "",
                    "marks": QuestionParser.extract_marks(text),
                    "negative_marks": 0.0,
                    "difficulty": "MEDIUM",
                    "tags": [],
                    "formulas": [],
                    "formula_objects": [],
                    "diagrams": [],
                    "raw_regions": [r],
                    "confidences": {
                        "text": r.get("confidence", 0.95),
                        "math": 1.0,
                        "chem": 1.0,
                        "diagram": 1.0,
                        "overall": r.get("confidence", 0.95),
                    },
                }

            elif rtype == "OPTION" and current_q:
                parsed_opts = QuestionParser.parse_options_from_text(text)
                if parsed_opts:
                    for po in parsed_opts:
                        if r.get("formula_objects"):
                            po["formula_objects"] = r["formula_objects"]
                    current_q["options"].extend(parsed_opts)
                else:
                    opt_lbl = r.get("option_label", "A")
                    opt_body = re.sub(r"^(?:\([A-Da-d1-4]\)|[A-Da-d1-4][\.\)])\s*", "", text).strip()
                    current_q["options"].append({
                        "key": opt_lbl,
                        "text": specialized_math.convert_embedded_math(opt_body),
                        "formula_objects": r.get("formula_objects", [])
                    })
                current_q["raw_regions"].append(r)

            elif rtype == "SUBQUESTION" and current_q:
                sub_lbl = r.get("sub_label", "a")
                sub_body = re.sub(r"^\([a-zA-Z\d]+\)\s*", "", text).strip()
                current_q["subquestions"].append({
                    "label": sub_lbl,
                    "text": specialized_math.convert_embedded_math(sub_body)
                })
                current_q["raw_regions"].append(r)

            elif rtype in ["MATH", "MATHEMATICS", "CHEM", "CHEMISTRY", "PHYSICS", "BIOLOGY", "MIXED", "TABLE", "PARAGRAPH"] and current_q:
                # Always attempt inline option detection on any paragraph/math block
                parsed_opts = QuestionParser.parse_options_from_text(text)
                if parsed_opts:
                    # Merge: extend options (de-duplicate by key)
                    existing_keys = {o["key"] for o in current_q["options"]}
                    for opt in parsed_opts:
                        if opt["key"] not in existing_keys:
                            current_q["options"].append(opt)
                            existing_keys.add(opt["key"])
                    current_q["raw_regions"].append(r)
                elif re.match(r"^[A-Z]{1,4}\d{2,6}[A-Z0-9_\-]*$", text.strip()):
                    # Coaching book / exercise question code (e.g. NL0084, NL0085)
                    code = text.strip()
                    if code not in current_q["tags"]:
                        current_q["tags"].append(code)
                    current_q["raw_regions"].append(r)
                elif QuestionParser.is_diagram_annotation(text):
                    # Floating diagram label/annotation (e.g. 'a', 'M \theta', '6 kg')
                    current_q.setdefault("diagram_annotations", []).append(text.strip())
                    current_q["raw_regions"].append(r)
                elif not current_q.get("options"):
                    # Only append to question stem if options have not yet started
                    norm_add = specialized_math.convert_embedded_math(text)
                    current_q["question_text"] += "\n" + norm_add
                    current_q["raw_regions"].append(r)
                else:
                    # Non-option trailing text after options already collected
                    current_q["raw_regions"].append(r)

                if rtype in ["MATH", "MATHEMATICS"]:
                    current_q["formulas"].append({"type": "MATH", "raw": text})
                elif rtype in ["CHEM", "CHEMISTRY"]:
                    current_q["formulas"].append({"type": "CHEM", "raw": text})
                elif rtype == "PHYSICS":
                    current_q["formulas"].append({"type": "PHYSICS", "raw": text})
                elif rtype == "BIOLOGY":
                    current_q["formulas"].append({"type": "BIOLOGY", "raw": text})

            else:
                # If content appears before first Question tag, ensure it is not a header or banner
                is_header = bool(re.search(r"^(?:DPP|DAILY|CHAPTER|UNIT|GRADE|CLASS|TEST|EXAM|QUESTION\s*PAPER|ASSIGNMENT|MATHEMATICS|PHYSICS|CHEMISTRY|BIOLOGY)", text, re.IGNORECASE))
                if not current_q and text and not is_header:
                    current_q = {
                        "id": f"q_1",
                        "question_number": "1",
                        "question_text": specialized_math.convert_embedded_math(text),
                        "subquestions": [],
                        "options": [],
                        "correct_answer": "",
                        "explanation": "",
                        "marks": QuestionParser.extract_marks(text),
                        "negative_marks": 0.0,
                        "difficulty": "MEDIUM",
                        "tags": [],
                        "formulas": [],
                        "formula_objects": [],
                        "diagrams": [],
                        "raw_regions": [r],
                        "confidences": {"text": r.get("confidence", 0.90), "math": 1.0, "chem": 1.0, "diagram": 1.0, "overall": 0.90},
                    }

        if current_q:
            QuestionParser._finalize_question(current_q, diagrams)
            questions.append(current_q)

        return QuestionParser.deduplicate_questions(questions)

    @staticmethod
    def normalize_text(text: str) -> str:
        """Normalizes question text for fuzzy duplicate detection."""
        if not text:
            return ""
        s = re.sub(r"^(?:Q(?:uestion)?\s*[.\-]?\s*\d{1,3}\s*[.)\]:\-]?|\d{1,3}\s*[.)\]])\s*", "", text, flags=re.IGNORECASE)
        s = re.sub(r"[^a-zA-Z0-9]", "", s).lower()
        return s

    @staticmethod
    def deduplicate_questions(questions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Removes duplicate question regions generated by overlapping PDF layout blocks."""
        unique_questions: List[Dict[str, Any]] = []

        for q in questions:
            norm = QuestionParser.normalize_text(q.get("question_text", ""))
            if not norm or len(norm) < 6:
                unique_questions.append(q)
                continue

            is_dup = False
            for uq in unique_questions:
                unorm = QuestionParser.normalize_text(uq.get("question_text", ""))
                if norm == unorm or (len(norm) > 25 and len(unorm) > 25 and (norm in unorm or unorm in norm)):
                    is_dup = True
                    # Merge options or diagrams if duplicate has more complete content
                    if len(q.get("options", [])) > len(uq.get("options", [])):
                        uq["options"] = q["options"]
                    if len(q.get("diagrams", [])) > len(uq.get("diagrams", [])):
                        uq["diagrams"] = q["diagrams"]
                    break

            if not is_dup:
                unique_questions.append(q)

        return unique_questions

    @staticmethod
    def _finalize_question(q: Dict[str, Any], diagrams: List[Dict[str, Any]]):
        # Extract options if not already structured
        if not q["options"]:
            q["options"] = QuestionParser.parse_options_from_text(q["question_text"])

        # Extract answer if found in text
        ans = QuestionParser.extract_answer(q["question_text"])
        if ans:
            q["correct_answer"] = ans

        # Calculate bounding box encompassing all question regions
        all_bboxes = [r.get("bbox", [0, 0, 0, 0]) for r in q.get("raw_regions", [])]
        if all_bboxes:
            min_x = min(b[0] for b in all_bboxes)
            min_y = min(b[1] for b in all_bboxes)
            max_x = max(b[0] + b[2] for b in all_bboxes)
            max_y = max(b[1] + b[3] for b in all_bboxes)
            q["bbox"] = [min_x, min_y, max_x - min_x, max_y - min_y]

            # Associate diagrams that fall within or immediately adjacent to this question's bbox
            for d in diagrams:
                db = d.get("bbox", [0, 0, 0, 0])
                if (db[1] >= min_y - 40) and (db[1] <= max_y + 100):
                    q["diagrams"].append(d)

        # 2-D Structural Formula & Mathematical Object Reconstruction
        from ..scientific.spatial_math_engine import spatial_math_engine
        q_bbox = tuple(q.get("bbox", [0, 0, 0, 0]))

        # Collect formula objects from raw regions
        for r in q.get("raw_regions", []):
            for fo in r.get("formula_objects", []):
                if fo and fo not in q["formula_objects"]:
                    q["formula_objects"].append(fo)

        # Extract formula objects from question text stem (e.g. M1, M2, M3, F, etc.)
        stem_formulas = spatial_math_engine.extract_formula_objects_from_text(
            q.get("question_text", ""), bbox=q_bbox
        )
        seen_latex = {fo["latex"] for fo in q["formula_objects"]}
        for fo in stem_formulas:
            if fo["latex"] not in seen_latex:
                q["formula_objects"].append(fo)
                seen_latex.add(fo["latex"])

        # Extract formula objects for each option and attach primary formula_object
        for opt in q.get("options", []):
            opt_text = opt.get("text", "")
            # Check if option already has a formula_object with original crop or from region
            existing_fo = None
            for fo in opt.get("formula_objects", []):
                if fo.get("originalCrop") or fo.get("latex"):
                    existing_fo = fo
                    break
            if existing_fo:
                opt["formula_object"] = existing_fo
                if existing_fo["latex"] not in seen_latex:
                    q["formula_objects"].append(existing_fo)
                    seen_latex.add(existing_fo["latex"])
            else:
                opt_formulas = spatial_math_engine.extract_formula_objects_from_text(
                    opt_text, bbox=q_bbox
                )
                if opt_formulas:
                    opt["formula_object"] = opt_formulas[0]
                    for fo in opt_formulas:
                        if fo["latex"] not in seen_latex:
                            q["formula_objects"].append(fo)
                            seen_latex.add(fo["latex"])

        # Populate structured formulas list
        q["formulas"] = [
            {
                "id": fo["id"],
                "type": fo.get("domain", "MATH"),
                "latex": fo["latex"],
                "mathml": fo["mathml"],
                "plain_text": fo["plainText"],
                "structured": fo["structuredExpression"],
                "confidence": fo["confidence"],
                "validation_status": fo["validationStatus"],
            }
            for fo in q["formula_objects"]
        ]

        # Attach structured scientific labels to associated diagrams
        if q.get("diagram_annotations"):
            for d in q.get("diagrams", []):
                if not d.get("labels"):
                    d["labels"] = []
                    for ann in q.get("diagram_annotations", []):
                        ann_objs = spatial_math_engine.extract_formula_objects_from_text(ann)
                        if ann_objs:
                            for ao in ann_objs:
                                d["labels"].append({
                                    "text": ao["plainText"],
                                    "latex": ao["latex"],
                                    "structured": ao["structuredExpression"],
                                })
                        else:
                            d["labels"].append({"text": ann, "latex": ann})

question_parser = QuestionParser()
