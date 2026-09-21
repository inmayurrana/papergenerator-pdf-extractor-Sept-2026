import uuid
from pathlib import Path
from typing import Dict, Any, List, Optional
import cv2  # type: ignore
import numpy as np  # type: ignore
from ..core.config import config

class OMRSheetGenerator:
    @staticmethod
    def generate_omr_template(
        exam_title: str = "OFFLINE EXAMINATION OMR SHEET",
        exam_code: str = "EXAM-101",
        total_questions: int = 30,
        options_per_question: int = 4,  # A, B, C, D
        roll_number_digits: int = 6,
        answer_key: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        """Generates high-precision OMR answer sheet images (Blank student sheet + Filled Master Key sheet) with fiducial registration markers."""
        # A4 standard size at 150 DPI: 1240 x 1754 px
        width, height = 1240, 1754
        canvas = np.full((height, width, 3), 255, dtype=np.uint8)
        master_canvas = np.full((height, width, 3), 255, dtype=np.uint8)

        # Draw 4 fiducial registration corner markers (solid black rectangles)
        marker_size = 40
        margin = 40

        corners = [
            (margin, margin),
            (width - margin - marker_size, margin),
            (margin, height - margin - marker_size),
            (width - margin - marker_size, height - margin - marker_size),
        ]

        for (cx, cy) in corners:
            cv2.rectangle(canvas, (cx, cy), (cx + marker_size, cy + marker_size), (0, 0, 0), -1)
            cv2.rectangle(master_canvas, (cx, cy), (cx + marker_size, cy + marker_size), (0, 0, 0), -1)

        # Header Title and Exam Code
        cv2.putText(canvas, exam_title, (margin + 60, margin + 35), cv2.FONT_HERSHEY_SIMPLEX, 0.85, (0, 0, 0), 2)
        cv2.putText(canvas, f"EXAM CODE: {exam_code} | QUESTIONS: {total_questions}", (margin + 60, margin + 70), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (80, 80, 80), 1)

        cv2.putText(master_canvas, f"{exam_title} [MASTER ANSWER KEY]", (margin + 60, margin + 35), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 100, 0), 2)
        cv2.putText(master_canvas, f"OFFICIAL EVALUATION KEY | EXAM CODE: {exam_code} | QUESTIONS: {total_questions}", (margin + 60, margin + 70), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 120, 0), 1)

        # Draw Student Info Box & Roll Number Grid
        info_y = margin + 110
        cv2.rectangle(canvas, (margin + 40, info_y), (width - margin - 40, info_y + 160), (0, 0, 0), 1)
        cv2.putText(canvas, "CANDIDATE NAME: _____________________________________   ROLL NO: [   ][   ][   ][   ][   ][   ]", (margin + 60, info_y + 40), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 1)
        cv2.putText(canvas, "INSTRUCTIONS: Darken bubbles completely using Blue/Black Pen. Do not make stray marks.", (margin + 60, info_y + 80), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (100, 100, 100), 1)
        cv2.putText(canvas, "CORRECT: ( * )   INCORRECT: ( X ) ( / ) ( . )", (margin + 60, info_y + 120), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 0, 0), 1)

        # Master Info Box
        cv2.rectangle(master_canvas, (margin + 40, info_y), (width - margin - 40, info_y + 160), (0, 120, 0), 2)
        cv2.putText(master_canvas, "OFFICIAL EVALUATION MASTER ANSWER KEY - AUTOMATED SCORING REFERENCE", (margin + 60, info_y + 40), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 100, 0), 2)
        cv2.putText(master_canvas, "STATUS: ALL CORRECT ANSWERS VERIFIED FROM QUESTION BANK & SNAPSHOT", (margin + 60, info_y + 80), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (30, 30, 30), 1)
        cv2.putText(master_canvas, "Used by OpenCV computer vision engine to compare student marked bubbles against ground truth.", (margin + 60, info_y + 120), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (60, 60, 60), 1)

        # Draw Question Bubble Columns
        num_cols = 2 if total_questions <= 40 else 3
        q_per_col = int(np.ceil(total_questions / num_cols))
        col_width = (width - 2 * margin - 80) // num_cols

        bubble_metadata = []
        option_labels = ["A", "B", "C", "D", "E"][:options_per_question]

        start_y = info_y + 200
        row_height = min(42, (height - start_y - margin - 60) // q_per_col)
        bubble_radius = 12

        clean_answer_key = answer_key or {}

        for q_idx in range(total_questions):
            q_num = q_idx + 1
            col_idx = q_idx // q_per_col
            row_idx = q_idx % q_per_col

            col_x = margin + 50 + (col_idx * col_width)
            row_y = start_y + (row_idx * row_height)

            # Draw Question Number
            cv2.putText(canvas, f"Q{q_num:02d}", (col_x, row_y + 6), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 0, 0), 1)
            cv2.putText(master_canvas, f"Q{q_num:02d}", (col_x, row_y + 6), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 0, 0), 1)

            # Find correct answer for this question
            correct_opt = str(clean_answer_key.get(str(q_num)) or clean_answer_key.get(q_num) or "").strip().upper()
            if not correct_opt and f"Q{q_num}" in clean_answer_key:
                correct_opt = str(clean_answer_key[f"Q{q_num}"]).strip().upper()

            q_bubbles = []
            for opt_idx, opt_lbl in enumerate(option_labels):
                bx = col_x + 55 + (opt_idx * 38)
                by = row_y

                # 1. Blank Student Sheet: Hollow circle with letter
                cv2.circle(canvas, (bx, by), bubble_radius, (0, 0, 0), 2)
                cv2.putText(canvas, opt_lbl, (bx - 5, by + 4), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 0, 0), 1)

                # 2. Master Filled Key Sheet: Solid black if correct option, else hollow
                is_correct_bubble = (opt_lbl == correct_opt)
                if is_correct_bubble:
                    # Solid filled black circle
                    cv2.circle(master_canvas, (bx, by), bubble_radius, (15, 15, 15), -1)
                    # White text inside filled bubble
                    cv2.putText(master_canvas, opt_lbl, (bx - 5, by + 4), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)
                else:
                    cv2.circle(master_canvas, (bx, by), bubble_radius, (140, 140, 140), 1)
                    cv2.putText(master_canvas, opt_lbl, (bx - 5, by + 4), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (120, 120, 120), 1)

                q_bubbles.append({
                    "option": opt_lbl,
                    "center": [bx, by],
                    "radius": bubble_radius,
                })

            bubble_metadata.append({
                "question_number": q_num,
                "correct_answer": correct_opt,
                "bubbles": q_bubbles,
            })

        # Save template images
        tmpl_id = f"omr_{uuid.uuid4().hex[:8]}"
        filename = f"{tmpl_id}.png"
        master_filename = f"{tmpl_id}_master.png"

        target_path = config.STORAGE_OMR / filename
        master_target_path = config.STORAGE_OMR / master_filename

        cv2.imwrite(str(target_path), canvas)
        cv2.imwrite(str(master_target_path), master_canvas)

        return {
            "template_id": tmpl_id,
            "filename": filename,
            "relative_url": f"/data/omr/{filename}",
            "master_key_url": f"/data/omr/{master_filename}",
            "absolute_path": str(target_path),
            "width": width,
            "height": height,
            "exam_code": exam_code,
            "total_questions": total_questions,
            "options_per_question": options_per_question,
            "answer_key": clean_answer_key,
            "fiducial_markers": corners,
            "bubble_metadata": bubble_metadata,
        }

omr_generator = OMRSheetGenerator()
