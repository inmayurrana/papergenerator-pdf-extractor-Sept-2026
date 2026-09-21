"""
Formula Rendering Validation & Multi-Scale Processing Engine
Renders candidate formulas to bitmap, compares against original image crop,
computes multi-dimensional confidence, and triggers adaptive multi-scale preprocessing
when visual similarity is low.
"""

import re
import io
import cv2  # type: ignore
import numpy as np  # type: ignore
import pymupdf  # type: ignore
from PIL import Image
from typing import Dict, Any, Tuple, Optional
from pathlib import Path


class FormulaVisualValidator:
    def __init__(self, visual_similarity_threshold: float = 0.70):
        self.visual_similarity_threshold = visual_similarity_threshold

    def render_formula_bitmap(self, formula_text: str, target_h: int = 60) -> np.ndarray:
        """
        Renders a mathematical formula into a binary/grayscale bitmap image
        using PyMuPDF's in-memory page renderer.
        """
        clean_text = formula_text.replace("$", "").replace("\\,", " ").strip()
        # Convert LaTeX commands to clean unicode characters for rasterization
        unicode_text = clean_text
        unicode_text = re.sub(r"\\sqrt\{([^}]+)\}", r"√\1", unicode_text)
        unicode_text = re.sub(r"\\frac\{([^}]+)\}\{([^}]+)\}", r"(\1)/(\2)", unicode_text)
        unicode_text = re.sub(r"\\theta", "θ", unicode_text)
        unicode_text = re.sub(r"\\mu", "μ", unicode_text)
        unicode_text = re.sub(r"\\pi", "π", unicode_text)
        unicode_text = re.sub(r"\\alpha", "α", unicode_text)
        unicode_text = re.sub(r"\\beta", "β", unicode_text)
        unicode_text = re.sub(r"\\times", "×", unicode_text)
        unicode_text = re.sub(r"\\mathrm\{([^}]+)\}", r"\1", unicode_text)
        unicode_text = re.sub(r"\\hat\{([a-zA-Z])\}", r"\1̂", unicode_text)
        unicode_text = re.sub(r"\\vec\{([a-zA-Z])\}", r"\1⃗", unicode_text)

        # Estimate width needed
        char_w = 14
        est_w = max(80, len(unicode_text) * char_w + 40)
        est_h = max(40, target_h)

        doc = pymupdf.open()
        page = doc.new_page(width=est_w, height=est_h)
        # Draw white background
        page.draw_rect(pymupdf.Rect(0, 0, est_w, est_h), color=(1, 1, 1), fill=(1, 1, 1))
        # Insert text centered vertically
        page.insert_text(
            (15, est_h * 0.65),
            unicode_text,
            fontsize=min(24, int(est_h * 0.55)),
            color=(0, 0, 0)
        )
        pix = page.get_pixmap(dpi=150)
        img_bytes = pix.tobytes("png")
        doc.close()

        # Load as OpenCV grayscale image
        nparr = np.frombuffer(img_bytes, np.uint8)
        rendered_bgr = cv2.imdecode(nparr, cv2.IMREAD_GRAYSCALE)
        return rendered_bgr

    def compute_visual_similarity(self, crop_img: np.ndarray, formula_text: str) -> float:
        """
        Compares original crop image against rendered formula bitmap.
        Returns a similarity score between 0.0 and 1.0 based on:
        1. Aspect ratio match
        2. Stroke density match
        3. Normalized cross-correlation
        """
        if crop_img is None or crop_img.size == 0 or not formula_text:
            return 0.50

        # Convert crop to grayscale
        if len(crop_img.shape) == 3:
            crop_gray = cv2.cvtColor(crop_img, cv2.COLOR_BGR2GRAY)
        else:
            crop_gray = crop_img.copy()

        ch, cw = crop_gray.shape[:2]
        if ch < 5 or cw < 5:
            return 0.50

        # Render formula
        rendered_gray = self.render_formula_bitmap(formula_text, target_h=ch)
        rh, rw = rendered_gray.shape[:2]

        # 1. Aspect ratio similarity
        crop_ar = cw / max(ch, 1)
        rend_ar = rw / max(rh, 1)
        ar_diff = abs(crop_ar - rend_ar) / max(crop_ar, rend_ar, 1)
        ar_score = max(0.0, 1.0 - ar_diff)

        # 2. Binarize both using Otsu
        _, crop_bin = cv2.threshold(crop_gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        _, rend_bin = cv2.threshold(rendered_gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

        # Stroke density match (ratio of foreground black pixels)
        crop_density = np.count_nonzero(crop_bin) / max(crop_bin.size, 1)
        rend_density = np.count_nonzero(rend_bin) / max(rend_bin.size, 1)
        density_score = 1.0 - min(1.0, abs(crop_density - rend_density) / max(crop_density, rend_density, 0.01))

        # 3. Normalized cross-correlation (resize rendered to match crop dimensions)
        rend_resized = cv2.resize(rend_bin, (cw, ch), interpolation=cv2.INTER_AREA)
        overlap = np.logical_and(crop_bin > 0, rend_resized > 0)
        union = np.logical_or(crop_bin > 0, rend_resized > 0)
        iou_score = np.count_nonzero(overlap) / max(np.count_nonzero(union), 1)

        # Weighted combination
        similarity = 0.30 * ar_score + 0.35 * density_score + 0.35 * iou_score
        return round(float(np.clip(similarity, 0.0, 1.0)), 3)

    def adaptive_multi_scale_enhance(self, crop_img: np.ndarray) -> np.ndarray:
        """
        Multi-scale formula preprocessing for low-resolution or degraded formula crops:
        - 2x Bicubic upscale
        - CLAHE contrast enhancement
        - Bilateral filter denoising (preserves thin radical and fraction strokes)
        - Unsharp masking
        """
        if crop_img is None or crop_img.size == 0:
            return crop_img

        # 1. 2x Upscale
        h, w = crop_img.shape[:2]
        upscaled = cv2.resize(crop_img, (w * 2, h * 2), interpolation=cv2.INTER_CUBIC)

        # 2. Grayscale conversion
        if len(upscaled.shape) == 3:
            gray = cv2.cvtColor(upscaled, cv2.COLOR_BGR2GRAY)
        else:
            gray = upscaled.copy()

        # 3. CLAHE (Contrast Limited Adaptive Histogram Equalization)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(gray)

        # 4. Bilateral filter denoising
        denoised = cv2.bilateralFilter(enhanced, d=5, sigmaColor=50, sigmaSpace=50)

        # 5. Unsharp mask sharpening
        gaussian = cv2.GaussianBlur(denoised, (0, 0), 2.0)
        sharpened = cv2.addWeighted(denoised, 1.5, gaussian, -0.5, 0)

        return sharpened

    def evaluate_multi_dimensional_confidence(
        self,
        crop_img: np.ndarray,
        formula_latex: str,
        recognition_conf: float = 0.95,
        structural_valid: bool = True,
        domain_conf: float = 0.90,
    ) -> Dict[str, Any]:
        """
        Computes the complete multi-dimensional confidence score for a formula recognition.
        Returns:
        - recognition_confidence
        - structural_confidence
        - visual_similarity
        - domain_confidence
        - overall_confidence
        - validation_status
        - needs_review
        """
        visual_sim = self.compute_visual_similarity(crop_img, formula_latex)
        struct_conf = 0.98 if structural_valid else 0.70

        # Weighted calculation
        overall = (
            0.30 * recognition_conf +
            0.25 * struct_conf +
            0.30 * visual_sim +
            0.15 * domain_conf
        )
        overall = round(float(np.clip(overall, 0.0, 1.0)), 3)

        needs_review = overall < self.visual_similarity_threshold or visual_sim < 0.40
        status = "NEEDS_REVIEW" if needs_review else "VALIDATED"

        return {
            "recognition_confidence": round(recognition_conf, 3),
            "structural_confidence": round(struct_conf, 3),
            "visual_similarity": visual_sim,
            "domain_confidence": round(domain_conf, 3),
            "overall_confidence": overall,
            "validation_status": status,
            "needs_review": needs_review,
        }


visual_validator = FormulaVisualValidator()
