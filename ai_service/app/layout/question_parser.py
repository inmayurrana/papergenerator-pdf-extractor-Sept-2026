import re
from typing import List, Dict, Any, Optional
from ..engines.specialized_math import specialized_math

class QuestionParser:
    MARKS_REGEX = re.compile(
        r"(?:\[|\()\s*(\d+)\s*(?:marks?|mark|pts?)?\s*(?:\]|\))|\bmarks?\s*[:=]\s*(\d+)\b|\[(\d+)\]",
        re.IGNORECASE
    )
    ANSWER_REGEX = re.compile(r"\b(?:Ans(?:wer)?|Sol(?:ution)?|Correct\s*Option)\s*[.:=\-]?\s*\(?([A-Da-d1-4]|\w+)\)?", re.IGNORECASE)
    NOUN_EXCLUSIONS = r"(?<!\bblock\s)(?<!\bbody\s)(?<!\bparticle\s)(?<!\bmass\s)(?<!\bwire\s)(?<!\bpulley\s)(?<!\bsphere\s)(?<!\bcylinder\s)(?<!\brod\s)(?<!\bcar\s)(?<!\btrain\s)(?<!\bdisc\s)(?<!\bplate\s)(?<!\bobject\s)(?<!\bbetween\s)(?<!\band\s)(?<!\bfor\s)(?<!\bwith\s)(?<!\bto\s)"

    # Unified option-label detector with a single named capture group 'lbl'
    # Matches: (A)  (1)  A)  A.  — at start of text or after whitespace
    # Named group 'lbl' always holds the raw label character regardless of style.
    OPTION_SPLIT_REGEX = re.compile(
        rf"(?:{NOUN_EXCLUSIONS}\((?P<lbl>[a-dA-D1-4])\)|(?:(?<=^)|(?<=\s))(?P<lbl2>[a-dA-D1-4])\.(?!\d)|(?:(?<=^)|(?<=\s))(?P<lbl3>[a-dA-D1-4])\))\s*",
        re.IGNORECASE
    )

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
    def _extract_label_from_match(om: re.Match) -> str:
        """Safely extracts the option label from a regex match, handling all group variants."""
        mapping = {"1": "A", "2": "B", "3": "C", "4": "D"}
        # Try named groups first, then fall back to numbered groups
        raw = (
            om.group("lbl")
            or om.group("lbl2")
            or om.group("lbl3")
            or None
        )
        if raw is None:
            # Fallback: scan all groups for first non-None value
            for g in om.groups():
                if g is not None:
                    raw = g
                    break
        if raw is None:
            return "A"
        return mapping.get(raw.upper(), raw.upper())

    @staticmethod
    def parse_options_from_text(text: str) -> List[Dict[str, str]]:
        """Parses inline or multiline MCQ options (A, B, C, D or 1, 2, 3, 4) across lines."""
        if not text or not text.strip():
            return []

        # Reject sentence-continuation patterns like "(B) is :-"
        if re.search(r"\b(?:is|are|will\s*be|was|were)\s*[:=\-]", text, re.IGNORECASE):
            if re.match(r"^\s*(?:\([A-Za-z0-9]+\)|[A-Za-z0-9]+[.)])\s*(?:is|are|will\s*be)\s*[:=\-]", text, re.IGNORECASE):
                return []

        matches = list(QuestionParser.OPTION_SPLIT_REGEX.finditer(text))
        if not matches:
            return []

        raw_options = []
        for i, om in enumerate(matches):
            label = QuestionParser._extract_label_from_match(om)
            start = om.end()
            end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
            val = text[start:end].strip()
            # Clean internal newlines/excess whitespace
            val = re.sub(r"\s+", " ", val)
            raw_options.append({
                "key": label,
                "text": specialized_math.convert_embedded_math(val)
            })

        # Single option in standalone region (e.g. "(2) 1-1/n^2")
        if len(raw_options) == 1:
            return raw_options

        # Multiple inline options: validate sequential progression (A→B→C→D or partial)
        expected = ["A", "B", "C", "D"]
        keys = [o["key"] for o in raw_options]
        if keys[0] in expected:
            start_idx = expected.index(keys[0])
            valid = []
            for idx, opt in enumerate(raw_options):
                exp_idx = start_idx + idx
                if exp_idx < len(expected) and opt["key"] == expected[exp_idx]:
                    valid.append(opt)
                else:
                    break
            if len(valid) >= 2:
                return valid
            # Allow single valid option from partial block (e.g. "(3) formula (4) formula")
            if len(valid) == 1:
                return valid

        return []

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
        token_pat = re.compile(
            r"^(?:[=+\-*/]|[A-Za-z](?:_?\{?\d+\}?)?(?:\^?\{?\d+\}?)?|\d+(?:\.\d+)?(?:kg|g|N|m|cm|mm|V|A|J|s|ms|°|deg|\^circ)?(?:\^?\{?\d+\}?)?|[A-Za-z]\s*=\s*\d+.*|kg|g|N|m|cm|mm|theta|thita|alpha|beta|phi|omega|Smooth|Rough|Wall|Hinge|Spring|Fixed|Pulley|Block|Fig(?:\.\s*\(\d+\))?)$",
            re.IGNORECASE
        )
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
                # e.g. "If V = 4/3 \pi r^3 ... ?(a) \pi (b) 4\pi (c) 40\pi (d) 4\pi/3" or trailing "...is (a) 420"
                test_inline = QuestionParser.parse_options_from_text(clean_body)
                inline_options = []
                first_m = QuestionParser.OPTION_SPLIT_REGEX.search(clean_body)
                if first_m:
                    if len(test_inline) >= 2 or (len(test_inline) == 1 and test_inline[0]["key"] == "A" and first_m.start() > 10):
                        inline_options = test_inline
                        clean_body = clean_body[:first_m.start()].strip()

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
                opt_spec = r.get("specialized_data", {})
                if parsed_opts:
                    existing_keys = {o["key"] for o in current_q["options"]}
                    for po in parsed_opts:
                        if po["key"] in existing_keys:
                            continue  # Skip duplicate keys
                        po["bbox"] = r.get("bbox", [])
                        po["crop_url"] = r.get("crop_url", "")
                        po["confidence"] = r.get("confidence", 0.95)
                        po["validation_status"] = r.get("validation_status", "VALIDATED")
                        po["needs_review"] = r.get("needs_review", False)
                        po["ast"] = opt_spec.get("spatial_ast")
                        po["mathml"] = opt_spec.get("mathml")
                        if r.get("formula_objects"):
                            po["formula_objects"] = r["formula_objects"]
                        current_q["options"].append(po)
                        existing_keys.add(po["key"])
                else:
                    # Fallback: infer next sequential key rather than always defaulting to 'A'
                    opt_lbl = r.get("option_label")
                    mapping = {"1": "A", "2": "B", "3": "C", "4": "D"}
                    if opt_lbl:
                        opt_lbl = mapping.get(opt_lbl, opt_lbl.upper())
                    else:
                        # Infer key as next in sequence after existing options
                        seq = ["A", "B", "C", "D"]
                        used = {o["key"] for o in current_q["options"]}
                        opt_lbl = next((k for k in seq if k not in used), "A")
                    # If no options exist yet, options MUST start with A or 1
                    if not current_q.get("options") and opt_lbl not in ["A", "1"]:
                        norm_add = specialized_math.convert_embedded_math(text)
                        if current_q["question_text"]:
                            current_q["question_text"] += "\n" + norm_add
                        else:
                            current_q["question_text"] = norm_add
                        current_q["raw_regions"].append(r)
                        continue

                    # Strip leading option label from text body
                    opt_body = re.sub(r"^(?:\([A-Da-d1-4]\)|[A-Da-d1-4][\.\)])\s*", "", text).strip()
                    if opt_lbl not in {o["key"] for o in current_q["options"]}:
                        current_q["options"].append({
                            "key": opt_lbl,
                            "text": specialized_math.convert_embedded_math(opt_body) if opt_body else specialized_math.convert_embedded_math(text),
                            "bbox": r.get("bbox", []),
                            "crop_url": r.get("crop_url", ""),
                            "confidence": r.get("confidence", 0.95),
                            "validation_status": r.get("validation_status", "VALIDATED"),
                            "needs_review": r.get("needs_review", False),
                            "ast": opt_spec.get("spatial_ast"),
                            "mathml": opt_spec.get("mathml"),
                            "formula_objects": r.get("formula_objects", []),
                        })
                current_q["raw_regions"].append(r)

            elif rtype == "ANSWER" and current_q:
                ans_k = r.get("answer_key") or QuestionParser.extract_answer(text)
                if ans_k:
                    current_q["correct_answer"] = ans_k
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
                # Detect inline options on paragraph/math blocks across rows (e.g. row 1 A-B, row 2 C-D)
                parsed_opts = QuestionParser.parse_options_from_text(text)
                if parsed_opts and len(parsed_opts) >= 1:
                    first_m = QuestionParser.OPTION_SPLIT_REGEX.search(text)
                    if first_m and first_m.start() > 0 and not current_q.get("options"):
                        stem_prefix = text[:first_m.start()].strip()
                        if stem_prefix:
                            norm_prefix = specialized_math.convert_embedded_math(stem_prefix)
                            if current_q["question_text"]:
                                current_q["question_text"] += " " + norm_prefix
                            else:
                                current_q["question_text"] = norm_prefix

                    existing_keys = {o["key"] for o in current_q["options"]}
                    added = False
                    for opt in parsed_opts:
                        if opt["key"] not in existing_keys:
                            # Attach metadata from the source region
                            opt.setdefault("bbox", r.get("bbox", []))
                            opt.setdefault("crop_url", r.get("crop_url", ""))
                            opt.setdefault("confidence", r.get("confidence", 0.95))
                            opt.setdefault("validation_status", r.get("validation_status", "VALIDATED"))
                            opt.setdefault("needs_review", r.get("needs_review", False))
                            opt.setdefault("formula_objects", r.get("formula_objects", []))
                            current_q["options"].append(opt)
                            existing_keys.add(opt["key"])
                            added = True
                    if added:
                        current_q["raw_regions"].append(r)
                        # Skip further processing — this block was option content
                elif current_q.get("options") and current_q["options"][-1].get("text", "").strip() == "" and text.strip():
                    # Handle split option where label e.g. "(c)" and body e.g. "400" are in consecutive regions
                    current_q["options"][-1]["text"] = specialized_math.convert_embedded_math(text.strip())
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
                    if current_q["question_text"]:
                        current_q["question_text"] += "\n" + norm_add
                    else:
                        current_q["question_text"] = norm_add
                    current_q["raw_regions"].append(r)
                else:
                    # Non-option trailing text after options already collected
                    # Check if it contains answer key like "Ans. (A)"
                    ans_chk = QuestionParser.extract_answer(text)
                    if ans_chk and not current_q.get("correct_answer"):
                        current_q["correct_answer"] = ans_chk
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
                is_header = bool(re.search(r"^(?:\[\s*)?(?:DPP|DAILY|CHAPTER|UNIT|GRADE|CLASS|TEST|EXAM|QUESTION\s*PAPER|ASSIGNMENT|MATHEMATICS|PHYSICS|CHEMISTRY|BIOLOGY|SINGLE|MULTIPLE|MATCH|SECTION|PART)", text, re.IGNORECASE))
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

        # Deduplicate and sort options by canonical key (A, B, C, D)
        if q["options"]:
            key_order = {"A": 0, "B": 1, "C": 2, "D": 3, "1": 0, "2": 1, "3": 2, "4": 3}
            seen_keys = set()
            dedup_opts = []
            for opt in q["options"]:
                k = opt.get("key", "").upper()
                if k not in seen_keys:
                    seen_keys.add(k)
                    dedup_opts.append(opt)
            dedup_opts.sort(key=lambda o: key_order.get(o.get("key", "").upper(), 99))
            q["options"] = dedup_opts

        # Extract answer if found in text or raw regions
        if not q.get("correct_answer"):
            ans = QuestionParser.extract_answer(q["question_text"])
            if ans:
                q["correct_answer"] = ans
            else:
                for r in q.get("raw_regions", []):
                    ans_r = r.get("answer_key") or QuestionParser.extract_answer(r.get("text", ""))
                    if ans_r:
                        q["correct_answer"] = ans_r
                        break

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

        # Collect formula objects from raw regions (excluding diagram annotations)
        for r in q.get("raw_regions", []):
            if QuestionParser.is_diagram_annotation(r.get("text", "")):
                continue
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
                if opt.get("crop_url") and not existing_fo.get("originalCrop"):
                    existing_fo["originalCrop"] = opt.get("crop_url")
                if opt.get("validation_status") == "NEEDS_REVIEW":
                    existing_fo["validationStatus"] = "NEEDS_REVIEW"
                if existing_fo["latex"] not in seen_latex:
                    q["formula_objects"].append(existing_fo)
                    seen_latex.add(existing_fo["latex"])
            else:
                opt_formulas = spatial_math_engine.extract_formula_objects_from_text(
                    opt_text, bbox=q_bbox
                )
                if opt_formulas:
                    opt["formula_object"] = opt_formulas[0]
                    if opt.get("crop_url"):
                        opt["formula_object"]["originalCrop"] = opt.get("crop_url")
                    if opt.get("validation_status") == "NEEDS_REVIEW":
                        opt["formula_object"]["validationStatus"] = "NEEDS_REVIEW"
                    for fo in opt_formulas:
                        if fo["latex"] not in seen_latex:
                            q["formula_objects"].append(fo)
                            seen_latex.add(fo["latex"])
                elif opt.get("crop_url"):
                    custom_fo = {
                        "id": f"opt-{opt.get('key', 'A')}",
                        "latex": opt_text,
                        "mathml": opt.get("mathml", ""),
                        "plainText": opt_text,
                        "structuredExpression": opt.get("ast", {}),
                        "confidence": opt.get("confidence", 0.95),
                        "validationStatus": "NEEDS_REVIEW" if opt.get("validation_status") == "NEEDS_REVIEW" else "VERIFIED",
                        "originalCrop": opt.get("crop_url"),
                        "domain": "MATH",
                        "bbox": list(q_bbox),
                    }
                    opt["formula_object"] = custom_fo
                    if custom_fo["latex"] not in seen_latex:
                        q["formula_objects"].append(custom_fo)
                        seen_latex.add(custom_fo["latex"])

        # Populate structured formulas list
        q["formulas"] = [
            {
                "id": fo.get("id", f"fo-{i}"),
                "type": fo.get("domain", "MATH"),
                "latex": fo.get("latex", ""),
                "mathml": fo.get("mathml", ""),
                "plain_text": fo.get("plainText", fo.get("latex", "")),
                "structured": fo.get("structuredExpression", {}),
                "confidence": fo.get("confidence", 0.95),
                "validation_status": fo.get("validationStatus", "VERIFIED"),
            }
            for i, fo in enumerate(q["formula_objects"])
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
