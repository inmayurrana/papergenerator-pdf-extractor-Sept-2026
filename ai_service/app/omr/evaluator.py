import uuid
from pathlib import Path
from typing import Dict, Any, List, Optional
import cv2  # type: ignore
import numpy as np  # type: ignore
from ..core.config import config

class OMREvaluator:
    @staticmethod
    def _order_points(pts: np.ndarray) -> np.ndarray:
        """Orders 4 points as: Top-Left, Top-Right, Bottom-Right, Bottom-Left."""
        rect = np.zeros((4, 2), dtype="float32")
        s = pts.sum(axis=1)
        rect[0] = pts[np.argmin(s)]
        rect[2] = pts[np.argmax(s)]

        diff = np.diff(pts, axis=1)
        rect[1] = pts[np.argmin(diff)]
        rect[3] = pts[np.argmax(diff)]
        return rect

    @staticmethod
    def _four_point_transform(image: np.ndarray, pts: np.ndarray, target_w: int = 1240, target_h: int = 1754) -> np.ndarray:
        """Applies perspective transform to align skewed image to standard OMR template dimensions."""
        rect = OMREvaluator._order_points(pts)
        margin_center = 60.0  # margin (40) + marker_size/2 (20)
        dst = np.array([
            [margin_center, margin_center],
            [target_w - margin_center, margin_center],
            [target_w - margin_center, target_h - margin_center],
            [margin_center, target_h - margin_center]
        ], dtype="float32")

        M = cv2.getPerspectiveTransform(rect, dst)
        warped = cv2.warpPerspective(image, M, (target_w, target_h))
        return warped

    @staticmethod
    def _find_fiducials(image: np.ndarray) -> Optional[np.ndarray]:
        """Detects the 4 outer corner registration squares."""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        thresh = cv2.threshold(blurred, 100, 255, cv2.THRESH_BINARY_INV)[1]

        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        candidates = []

        h_img, w_img = image.shape[:2]
        for c in contours:
            peri = cv2.arcLength(c, True)
            approx = cv2.approxPolyDP(c, 0.04 * peri, True)
            if len(approx) == 4:
                x, y, w, h = cv2.boundingRect(approx)
                aspect = w / float(h)
                area = cv2.contourArea(c)
                # Check for square-like corner markers
                if 0.7 <= aspect <= 1.4 and (w_img * h_img * 0.0002) < area < (w_img * h_img * 0.03):
                    M = cv2.moments(c)
                    if M["m00"] > 0:
                        cX = int(M["m10"] / M["m00"])
                        cY = int(M["m01"] / M["m00"])
                        candidates.append([cX, cY])

        if len(candidates) >= 4:
            pts = np.array(candidates, dtype="float32")
            # Select 4 extreme corners (Top-Left, Top-Right, Bottom-Right, Bottom-Left)
            s = pts.sum(axis=1)
            diff = np.diff(pts, axis=1)
            tl = pts[np.argmin(s)]
            br = pts[np.argmax(s)]
            tr = pts[np.argmin(diff)]
            bl = pts[np.argmax(diff)]
            return np.array([tl, tr, br, bl], dtype="float32")

        return None

    @staticmethod
    def evaluate_omr_sheet(
        omr_image_path: str,
        template_metadata: Dict[str, Any],
        answer_key: Dict[str, str],  # {"1": "A", "2": "C", ...}
        positive_marks_per_q: float = 1.0,
        negative_marks_per_q: float = 0.0,
    ) -> Dict[str, Any]:
        """Evaluates an OMR sheet scan/photo against the answer key snapshot."""
        img = cv2.imread(omr_image_path)
        if img is None:
            raise FileNotFoundError(f"OMR Image not found: {omr_image_path}")

        target_w = template_metadata.get("width", 1240)
        target_h = template_metadata.get("height", 1754)

        # 1. Perspective alignment
        corners = OMREvaluator._find_fiducials(img)
        if corners is not None and len(corners) == 4:
            warped = OMREvaluator._four_point_transform(img, corners, target_w, target_h)
        else:
            # Fallback resize if fiducials aren't detected in scan
            warped = cv2.resize(img, (target_w, target_h))

        # 2. Binary thresholding for bubble fill analysis
        gray = cv2.cvtColor(warped, cv2.COLOR_BGR2GRAY)
        thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV | cv2.THRESH_OTSU)[1]

        bubble_meta = template_metadata.get("bubble_metadata", [])
        question_results = []
        annotated_img = warped.copy()

        correct_count = 0
        incorrect_count = 0
        blank_count = 0
        invalid_count = 0
        uncertain_count = 0

        for q_item in bubble_meta:
            q_num = str(q_item["question_number"])
            bubbles = q_item.get("bubbles", [])
            fills = []

            for b in bubbles:
                opt = b["option"]
                cx, cy = b["center"]
                r = b.get("radius", 12)

                # Extract circular mask
                mask = np.zeros(thresh.shape, dtype="uint8")
                cv2.circle(mask, (int(cx), int(cy)), int(r - 2), 255, -1)

                # Count non-zero pixels within circle
                total_pixels = cv2.countNonZero(mask)
                filled_pixels = cv2.countNonZero(cv2.bitwise_and(thresh, thresh, mask=mask))
                fill_ratio = (filled_pixels / total_pixels) if total_pixels > 0 else 0.0

                fills.append({
                    "option": opt,
                    "center": (int(cx), int(cy)),
                    "radius": int(r),
                    "fill_ratio": round(float(fill_ratio), 3),
                    "is_filled": fill_ratio >= 0.45,
                    "is_borderline": 0.33 <= fill_ratio < 0.45,
                })

            # Determine student selection
            marked_options = [f["option"] for f in fills if f["is_filled"]]
            borderline_options = [f["option"] for f in fills if f["is_borderline"]]

            status = "BLANK"
            student_answer = None
            q_confidence = 0.98

            if len(marked_options) == 1:
                student_answer = marked_options[0]
                status = "ATTEMPTED"
                q_confidence = 0.96
            elif len(marked_options) > 1:
                student_answer = ",".join(marked_options)
                status = "MULTIPLE_MARKED"
                invalid_count += 1
                q_confidence = 0.90
            elif len(borderline_options) == 1:
                student_answer = borderline_options[0]
                status = "UNCERTAIN"
                uncertain_count += 1
                q_confidence = 0.65
            else:
                status = "BLANK"
                blank_count += 1

            # Match against answer key
            correct_opt = answer_key.get(q_num, "").upper()
            is_correct = False
            q_marks = 0.0

            if status == "ATTEMPTED" and correct_opt:
                if student_answer == correct_opt:
                    is_correct = True
                    correct_count += 1
                    q_marks = positive_marks_per_q
                else:
                    incorrect_count += 1
                    q_marks = -negative_marks_per_q

            # Visual annotations on annotated image
            for f in fills:
                opt = f["option"]
                cx, cy = f["center"]
                r = f["radius"]
                if opt == student_answer:
                    if is_correct:
                        cv2.circle(annotated_img, (cx, cy), r + 2, (0, 200, 0), 3)  # Green for correct
                    else:
                        cv2.circle(annotated_img, (cx, cy), r + 2, (0, 0, 230), 3)  # Red for incorrect
                elif opt == correct_opt and not is_correct and student_answer:
                    cv2.circle(annotated_img, (cx, cy), r + 2, (0, 200, 0), 2)  # Hollow green on expected

            question_results.append({
                "question_number": int(q_num),
                "student_answer": student_answer,
                "correct_answer": correct_opt,
                "status": status,
                "is_correct": is_correct,
                "marks_awarded": round(q_marks, 2),
                "confidence": q_confidence,
                "needs_review": status == "UNCERTAIN" or q_confidence < 0.80,
                "bubble_details": fills,
            })

        # Calculate final marks
        total_questions = len(bubble_meta)
        attempted_count = correct_count + incorrect_count
        raw_marks = correct_count * positive_marks_per_q
        deducted_marks = incorrect_count * negative_marks_per_q
        final_score = max(0.0, raw_marks - deducted_marks)
        max_possible_marks = total_questions * positive_marks_per_q
        percentage = round((final_score / max_possible_marks * 100.0) if max_possible_marks > 0 else 0.0, 2)

        # Save annotated result image
        eval_id = f"eval_{uuid.uuid4().hex[:8]}"
        eval_filename = f"{eval_id}_annotated.png"
        eval_path = config.STORAGE_OMR / eval_filename
        cv2.imwrite(str(eval_path), annotated_img)

        return {
            "evaluation_id": eval_id,
            "annotated_image_url": f"/data/omr/{eval_filename}",
            "total_questions": total_questions,
            "attempted": attempted_count,
            "correct": correct_count,
            "incorrect": incorrect_count,
            "unattempted": blank_count,
            "invalid_multiple": invalid_count,
            "uncertain": uncertain_count,
            "raw_marks": round(raw_marks, 2),
            "negative_marks": round(deducted_marks, 2),
            "final_score": round(final_score, 2),
            "max_marks": round(max_possible_marks, 2),
            "percentage": percentage,
            "question_results": question_results,
        }

    @staticmethod
    def detect_candidate_info(omr_image_path: str) -> Dict[str, Any]:
        """
        Extracts Candidate/Student Name and Roll Number from handwriting or print on an uploaded OMR sheet.
        Uses RapidOCR on the header section.
        """
        import re
        from ..engines.ocr_extractor import ocr_extractor

        img = cv2.imread(omr_image_path)
        if img is None:
            return {"student_name": "", "roll_number": "", "found": False}

        h, w = img.shape[:2]

        # Try perspective warp if fiducials are present for accurate orientation
        corners = OMREvaluator._find_fiducials(img)
        if corners is not None and len(corners) == 4:
            aligned = OMREvaluator._four_point_transform(img, corners, 1240, 1754)
        else:
            aligned = img

        ah, aw = aligned.shape[:2]
        # Candidate information box is in the upper ~35% of the page
        header_crop = aligned[0:int(ah * 0.38), 0:aw]

        temp_crop_path = str(config.STORAGE_OMR / f"cand_crop_{uuid.uuid4().hex[:8]}.png")
        cv2.imwrite(temp_crop_path, header_crop)

        try:
            spans = ocr_extractor.extract_page_text_spans(temp_crop_path, aw, int(ah * 0.38))
        finally:
            try:
                Path(temp_crop_path).unlink(missing_ok=True)
            except Exception:
                pass

        full_header_text = " \n ".join([s["text"] for s in spans])

        student_name = ""
        roll_number = ""

        # Match Student Name
        name_match = re.search(r"(?:CANDIDATE\s*NAME|STUDENT\s*NAME|CANDIDATE|NAME)\s*[:\-_\.]*\s*([A-Za-z\s]{2,35})", full_header_text, re.IGNORECASE)
        if name_match:
            cand_name = name_match.group(1).strip()
            # Clean out boilerplate template words
            cand_name = re.sub(r"(?:ROLL|NO|INSTRUCTIONS|CORRECT|INCORRECT|_|\(\s*\*\s*\)|EXAM|CODE|CLASS).*", "", cand_name, flags=re.IGNORECASE).strip()
            if len(cand_name) >= 2 and not cand_name.upper().startswith("NAME"):
                student_name = cand_name

        # Match Roll Number
        roll_match = re.search(r"(?:ROLL\s*(?:NO|NUM|NUMBER)?|REG\s*(?:NO)?|ROLLNO)\s*[:\-_\.\[\]]*\s*([0-9A-Za-z\-]{1,15})", full_header_text, re.IGNORECASE)
        if roll_match:
            cand_roll = roll_match.group(1).strip()
            cand_roll = re.sub(r"[\[\]\s_]", "", cand_roll)
            if cand_roll.upper() not in ["NO", "NUM", "NUMBER", "NAME", "ID", "J", "JJ", "JJJ"]:
                if any(char.isdigit() for char in cand_roll) or len(cand_roll) >= 3:
                    roll_number = cand_roll

        # Fallback for roll number: isolated digits in candidate header
        if not roll_number:
            digits_matches = re.findall(r"\b\d{4,10}\b", full_header_text)
            if digits_matches:
                for d in digits_matches:
                    if d not in ["1240", "1754", "2026", "2025", "2024"]:
                        roll_number = d
                        break

        found = bool(student_name or roll_number)
        return {
            "student_name": student_name,
            "roll_number": roll_number,
            "found": found,
            "raw_text": full_header_text,
        }

omr_evaluator = OMREvaluator()
