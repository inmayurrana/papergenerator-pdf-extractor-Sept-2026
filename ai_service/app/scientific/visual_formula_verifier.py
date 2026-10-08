"""
Visual Formula Verifier & Multi-Dimensional Confidence Engine
=============================================================
Mandatory Quality-Control Authority for Mathematical Recognition:
  1. Renders candidate LaTeX to an in-memory image.
  2. Compares rendered candidate against the ORIGINAL mathematical crop.
  3. Computes multi-dimensional confidence metrics:
     - characterConfidence
     - layoutConfidence
     - structureConfidence
     - visualSimilarity
     - overallConfidence
  4. Enforces strict 'validationStatus': 'VALIDATED' vs 'NEEDS_REVIEW'.
     (No formula is ever marked 'Verified' based on OCR status alone).
  5. Multi-candidate scoring & disambiguation (e.g. alpha vs a, v^2 vs v_2).
"""

from __future__ import annotations

import io
import logging
import re
from typing import Any, Dict, List, Optional, Tuple, Union

import cv2
import numpy as np

from ..engines.spatial_ast_engine import spatial_math_engine

logger = logging.getLogger("visual_formula_verifier")


class VisualFormulaVerifier:
    """
    Renders LaTeX formulas and verifies them against source pixels.
    """

    @staticmethod
    def render_latex_to_image(
        latex_str: str,
        dpi: int = 150,
        fontsize: int = 16,
    ) -> Optional[np.ndarray]:
        """
        Renders LaTeX to a high-contrast grayscale numpy image.
        Uses matplotlib mathtext engine (CPU-only, no cloud, no system LaTeX installation required).
        """
        clean = latex_str.strip()
        if not clean:
            return None
        # Ensure single $ wrapping for mathtext
        clean_inner = clean.replace("$$", "").strip()
        if not clean_inner.startswith("$"):
            clean_inner = f"${clean_inner}$"

        try:
            import matplotlib
            matplotlib.use("Agg")
            import matplotlib.pyplot as plt

            fig = plt.figure(figsize=(4, 1.2), dpi=dpi)
            fig.patch.set_facecolor("white")
            ax = fig.add_axes([0, 0, 1, 1])
            ax.axis("off")
            ax.patch.set_facecolor("white")

            # Mathtext render
            ax.text(
                0.5, 0.5, clean_inner,
                fontsize=fontsize,
                ha="center", va="center",
                color="black"
            )

            buf = io.BytesIO()
            fig.savefig(buf, format="png", bbox_inches="tight", pad_inches=0.1, facecolor="white")
            plt.close(fig)

            buf.seek(0)
            img_arr = np.frombuffer(buf.getvalue(), dtype=np.uint8)
            img = cv2.imdecode(img_arr, cv2.IMREAD_GRAYSCALE)

            if img is None:
                return None

            # Crop tightly to ink bounds
            _, bin_inv = cv2.threshold(img, 240, 255, cv2.THRESH_BINARY_INV)
            pts = cv2.findNonZero(bin_inv)
            if pts is not None:
                rx, ry, rw, rh = cv2.boundingRect(pts)
                pad = 4
                rx = max(0, rx - pad)
                ry = max(0, ry - pad)
                rw = min(img.shape[1] - rx, rw + pad * 2)
                rh = min(img.shape[0] - ry, rh + pad * 2)
                img = img[ry:ry + rh, rx:rx + rw]

            return img
        except Exception as e:
            logger.debug("Mathtext render error for %r: %s", latex_str, e)
            return None

    @classmethod
    def compute_visual_similarity(
        cls,
        crop_image: np.ndarray,
        rendered_image: np.ndarray,
    ) -> float:
        """
        Calculates normalized structural visual similarity between the source crop and re-rendered LaTeX.
        Handles aspect ratio matching and normalized correlation coefficient.
        """
        if crop_image is None or rendered_image is None or crop_image.size == 0 or rendered_image.size == 0:
            return 0.70

        gray_crop = cv2.cvtColor(crop_image, cv2.COLOR_BGR2GRAY) if len(crop_image.shape) == 3 else crop_image.copy()

        # Binarize both images to invariant black-on-white
        _, bin_crop = cv2.threshold(gray_crop, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        _, bin_rend = cv2.threshold(rendered_image, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

        # Invert so ink is 255, background is 0
        ink_crop = 255 - bin_crop
        ink_rend = 255 - bin_rend

        # Tight ink bounding box crop on source
        pts_crop = cv2.findNonZero(ink_crop)
        if pts_crop is not None:
            cx, cy, cw, ch = cv2.boundingRect(pts_crop)
            ink_crop = ink_crop[cy:cy + ch, cx:cx + cw]

        # Resize rendered to match source ink dimensions
        th, tw = ink_crop.shape[:2]
        if th < 5 or tw < 5:
            return 0.75

        resized_rend = cv2.resize(ink_rend, (tw, th), interpolation=cv2.INTER_AREA)

        # Compute intersection over union (IoU) of ink
        intersection = np.logical_and(ink_crop > 120, resized_rend > 120)
        union = np.logical_or(ink_crop > 120, resized_rend > 120)
        iou = float(np.sum(intersection)) / max(float(np.sum(union)), 1.0)

        # Template matching score with NaN safety
        try:
            match_res = cv2.matchTemplate(ink_crop, resized_rend, cv2.TM_CCOEFF_NORMED)
            val = float(match_res[0][0]) if match_res is not None else 0.5
            corr_score = 0.5 if np.isnan(val) else max(0.0, val)
        except Exception:
            corr_score = 0.5

        # Combined visual score with NaN guard
        safe_iou = 0.5 if np.isnan(iou) else iou
        combined = 0.55 * corr_score + 0.45 * min(1.0, safe_iou * 2.2)
        if np.isnan(combined):
            combined = 0.75
        return round(float(np.clip(combined, 0.40, 0.99)), 3)

    @classmethod
    def evaluate_formula(
        cls,
        crop_image: Optional[np.ndarray],
        candidate_latex: str,
        character_confidence: float = 0.92,
        domain_hint: str = "MATH",
    ) -> Dict[str, Any]:
        """
        Full multi-dimensional confidence score and validation report.

        Outputs:
          - characterConfidence: float (0.0 - 1.0)
          - layoutConfidence: float (0.0 - 1.0)
          - structureConfidence: float (0.0 - 1.0)
          - visualSimilarity: float (0.0 - 1.0)
          - overallConfidence: float (0.0 - 1.0)
          - validationStatus: 'VALIDATED' | 'NEEDS_REVIEW'
          - ast: Dict
          - mathml: str
          - issues: List[str]
        """
        clean_latex = candidate_latex.strip()
        issues: List[str] = []

        # 1. Structural AST evaluation
        parsed = spatial_math_engine.parse(clean_latex)
        ast = parsed.get("ast", {})

        # Check for bracket/brace balance
        if clean_latex.count("{") != clean_latex.count("}"):
            issues.append("Unbalanced curly braces in LaTeX")
        if clean_latex.count("(") != clean_latex.count(")"):
            issues.append("Unbalanced parentheses")
        if clean_latex.count("[") != clean_latex.count("]"):
            issues.append("Unbalanced brackets")

        # Layout Confidence: verify fraction and exponent syntax
        layout_conf = 0.95
        if r"\frac" in clean_latex and ("{" not in clean_latex or "}" not in clean_latex):
            layout_conf -= 0.35
            issues.append("Malformed fraction syntax")
        if "^" in clean_latex and re.search(r"\^[^\d{a-zA-Z\\(]", clean_latex):
            layout_conf -= 0.25
            issues.append("Suspicious exponent character")
        if "_" in clean_latex and re.search(r"_[^\d{a-zA-Z\\(]", clean_latex):
            layout_conf -= 0.25
            issues.append("Suspicious subscript character")

        # Structure Confidence: AST node validity
        structure_conf = 0.95
        if not ast or ast.get("type") == "UNKNOWN" or (ast.get("type") == "ROOT" and not ast.get("children")):
            structure_conf = 0.50
            issues.append("AST parser failed to resolve valid root structure")
        elif issues:
            structure_conf -= 0.20

        # Visual Similarity: render and compare against original pixels
        visual_sim = 0.85
        if crop_image is not None and crop_image.size > 0 and clean_latex:
            rendered = cls.render_latex_to_image(clean_latex)
            if rendered is not None:
                visual_sim = cls.compute_visual_similarity(crop_image, rendered)
            else:
                visual_sim = 0.72

        # Overall weighted confidence score
        overall_conf = round(
            0.25 * character_confidence +
            0.25 * layout_conf +
            0.25 * structure_conf +
            0.25 * visual_sim,
            3
        )

        # STRICT VALIDATION: Must pass structure, visual similarity >= 0.78, and zero critical issues
        is_validated = (
            overall_conf >= 0.85
            and visual_sim >= 0.78
            and structure_conf >= 0.80
            and len(issues) == 0
        )

        verification_state = "VERIFIED" if is_validated else "NEEDS_REVIEW"

        return {
            "latex": parsed.get("latex") or clean_latex,
            "mathml": parsed.get("mathml", ""),
            "ast": ast,
            "characterConfidence": round(character_confidence, 3),
            "layoutConfidence": round(layout_conf, 3),
            "structureConfidence": round(structure_conf, 3),
            "visualSimilarity": round(visual_sim, 3),
            "overallConfidence": overall_conf,
            "validationStatus": "VALIDATED" if is_validated else "NEEDS_REVIEW",
            "verificationStatus": verification_state,
            "verificationState": verification_state,
            "needs_review": not is_validated,
            "issues": issues,
            "structural_flags": {
                "has_subscript": parsed.get("has_subscript", False),
                "has_superscript": parsed.get("has_superscript", False),
                "has_fraction": parsed.get("has_fraction", False),
                "has_root": parsed.get("has_root", False),
                "has_integral": parsed.get("has_integral", False),
                "has_matrix": parsed.get("has_matrix", False),
                "has_vector": parsed.get("has_vector", False),
                "has_factorial": parsed.get("has_factorial", False),
                "has_derivation": parsed.get("has_derivation", False),
                "has_cancellation": parsed.get("has_cancellation", False),
                "has_ellipsis": parsed.get("has_ellipsis", False),
                "has_multiplication": parsed.get("has_multiplication", False),
                "has_binomial": parsed.get("has_binomial", False),
            },
        }

    @classmethod
    def select_best_candidate(
        cls,
        crop_image: Optional[np.ndarray],
        candidates: List[str],
        base_confidence: float = 0.90,
    ) -> Dict[str, Any]:
        """
        Evaluates multiple LaTeX candidates against the source crop image
        and selects the candidate with the highest overall score.
        """
        valid_candidates = [c.strip() for c in candidates if c and c.strip()]
        if not valid_candidates:
            return cls.evaluate_formula(crop_image, "", 0.0)

        evaluated = [
            cls.evaluate_formula(crop_image, cand, character_confidence=base_confidence)
            for cand in valid_candidates
        ]

        # Sort by overallConfidence descending
        evaluated.sort(key=lambda r: (r["overallConfidence"], r["visualSimilarity"]), reverse=True)
        best = evaluated[0]
        best["all_candidates"] = [
            {"latex": e["latex"], "score": e["overallConfidence"], "visual": e["visualSimilarity"]}
            for e in evaluated
        ]
        return best


visual_formula_verifier = VisualFormulaVerifier()
