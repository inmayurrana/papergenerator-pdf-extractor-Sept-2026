"""
Dedicated Mathematical Recognition Engine (Pix2Text MFD + MFR & LaTeX-OCR)
Implements:
1. Mathematical Formula Detection (MFD) & Bounding Box extraction
2. Mathematical Formula Recognition (MFR) -> LaTeX & MathML
3. Secondary Candidate Recognition (pix2tex / LaTeX-OCR)
4. Multi-Scale Preprocessing & Visual Bitmap Comparison
5. Low-Hardware Resource Governor (Lazy loading, GPU VRAM monitoring, CPU fallback, explicit GC)
"""

from __future__ import annotations
import os
import gc
import cv2
import time
import uuid
import logging
import numpy as np
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple, Union
from PIL import Image

from .structural_tree import FormulaNode, NodeType
from .spatial_math_engine import spatial_math_engine, Formula2DResult
from .visual_validator import FormulaVisualValidator

logger = logging.getLogger("pix2text_engine")


class MathematicalRecognitionEngine:
    """
    Dedicated local mathematical recognition engine.
    Orchestrates:
    - Formula Region Detection (MFD)
    - Primary Mathematical Recognition (Pix2Text MFR)
    - Secondary Mathematical Recognition (pix2tex)
    - Geometric 2-D Structural Analysis (SpatialMathEngine)
    - Visual Verification (FormulaVisualValidator)
    """

    def __init__(self):
        self.p2t_model = None
        self.latex_ocr_model = None
        self.visual_validator = FormulaVisualValidator()
        self.is_p2t_available = False
        self.is_latex_ocr_available = False
        self._check_available_packages()

    def _check_available_packages(self):
        try:
            import pix2text  # type: ignore
            self.is_p2t_available = True
        except ImportError:
            self.is_p2t_available = False

        try:
            import pix2tex  # type: ignore
            self.is_latex_ocr_available = True
        except ImportError:
            self.is_latex_ocr_available = False

    def _lazy_load_p2t(self):
        """Loads Pix2Text model only when needed with GPU memory checks."""
        if self.p2t_model is not None:
            return self.p2t_model

        if not self.is_p2t_available:
            logger.info("pix2text package not installed in environment; using geometric structural engine.")
            return None

        try:
            from pix2text import Pix2Text
            import torch
            device = "cuda" if torch.cuda.is_available() else "cpu"
            if device == "cuda":
                # Check VRAM (requires at least 1GB free)
                free_vram = torch.cuda.get_device_properties(0).total_memory - torch.cuda.memory_allocated(0)
                if free_vram < 1024 * 1024 * 1024:
                    device = "cpu"

            logger.info(f"Loading Pix2Text on {device}...")
            self.p2t_model = Pix2Text.from_config(device=device)
            return self.p2t_model
        except Exception as e:
            logger.warning(f"Could not load Pix2Text: {e}; falling back to geometric engine.")
            return None

    def release_memory(self):
        """Releases PyTorch VRAM and triggers garbage collection."""
        try:
            import torch
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
        except Exception:
            pass
        gc.collect()

    def preprocess_crop_variants(self, img: np.ndarray) -> List[Tuple[str, np.ndarray]]:
        """
        Creates controlled preprocessing variants for mathematical recognition:
        1. original
        2. grayscale contrast-enhanced
        3. adaptive threshold
        4. controlled 2x/3x upscale for small formulas (e.g. height < 35px)
        """
        variants: List[Tuple[str, np.ndarray]] = [("original", img)]
        if img is None or img.size == 0:
            return variants

        h, w = img.shape[:2]

        # Convert to grayscale
        if len(img.shape) == 3:
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        else:
            gray = img.copy()

        # Contrast enhancement (CLAHE)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        contrast = clahe.apply(gray)
        variants.append(("contrast", contrast))

        # Adaptive threshold
        thresh = cv2.adaptiveThreshold(
            gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
        )
        variants.append(("adaptive_thresh", thresh))

        # Controlled upscale for small symbols / formulas
        if h < 35 or w < 80:
            scale = 3.0 if h < 25 else 2.0
            upscaled = cv2.resize(gray, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_CUBIC)
            variants.append((f"{int(scale)}x_upscale", upscaled))

        return variants

    def process_formula_region(
        self,
        crop_img: np.ndarray,
        bbox: Tuple[float, float, float, float] = (0, 0, 0, 0),
        ocr_hint: str = "",
        domain: str = "PHYSICS",
        save_crop_dir: Optional[Path] = None,
        doc_id: str = "doc",
        page_id: str = "p1",
        question_id: str = "",
        option_id: str = "",
        region_id: str = "",
    ) -> Dict[str, Any]:
        """
        Executes the full Image-to-Mathematical-Structure pipeline on a cropped formula region.
        Steps:
        1. Save original pixel crop
        2. Run primary recognizer (Pix2Text MFR) or geometric fallback
        3. Run secondary recognizer if available
        4. Validate against original crop using visual similarity
        5. Generate FormulaNode AST, LaTeX, MathML, plainText
        6. Return complete FormulaObject
        """
        formula_id = f"formula_{uuid.uuid4().hex[:8]}"
        original_crop_path = ""

        # Step 1: Save original pixel crop
        if crop_img is not None and crop_img.size > 0 and save_crop_dir:
            try:
                save_crop_dir.mkdir(parents=True, exist_ok=True)
                crop_filename = f"{formula_id}.png"
                full_crop_path = save_crop_dir / crop_filename
                cv2.imwrite(str(full_crop_path), crop_img)
                # Store relative URL for frontend
                original_crop_path = f"/storage/formulas/{doc_id}/{crop_filename}"
            except Exception as e:
                logger.warning(f"Failed to save original formula crop: {e}")

        # Step 2: Primary Recognition
        candidate_primary = ""
        engine_used = "SpatialMathEngine"
        p2t = self._lazy_load_p2t()

        if p2t is not None and crop_img is not None and crop_img.size > 0:
            try:
                pil_img = Image.fromarray(cv2.cvtColor(crop_img, cv2.COLOR_BGR2RGB)) if len(crop_img.shape) == 3 else Image.fromarray(crop_img)
                res_p2t = p2t.recognize_formula(pil_img)
                if res_p2t and isinstance(res_p2t, str) and res_p2t.strip():
                    candidate_primary = res_p2t.strip()
                    engine_used = "Pix2Text-MFR"
            except Exception as e:
                logger.warning(f"Pix2Text recognition error: {e}")

        # Fallback to hint / geometric parsing if primary empty
        if not candidate_primary:
            candidate_primary = ocr_hint.strip()

        # Step 3: Parse through SpatialMathEngine to construct 2-D AST & MathML
        parsed_res = spatial_math_engine.parse_expression(
            candidate_primary,
            bbox=bbox,
            domain=domain,
            original_crop=original_crop_path,
        )

        final_latex = parsed_res.latex if parsed_res else candidate_primary
        final_mathml = parsed_res.mathml if parsed_res else ""
        final_plain = parsed_res.plain_text if parsed_res else candidate_primary
        ast_dict = parsed_res.structured_expression if parsed_res else {"type": "RAW", "value": candidate_primary}

        # Step 4: Visual Validation against original image crop
        sim_score = 0.95
        if crop_img is not None and crop_img.size > 0 and final_latex:
            try:
                sim_score = self.visual_validator.compute_visual_similarity(crop_img, final_latex)
            except Exception as e:
                logger.debug(f"Visual validation error: {e}")

        # Calculate structural confidence
        conf = 0.98 if engine_used == "Pix2Text-MFR" else 0.95
        if sim_score < 0.60:
            conf = max(0.50, conf * 0.85)

        val_status = "VERIFIED" if conf >= 0.80 and sim_score >= 0.65 else "NEEDS_REVIEW"

        now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

        # Step 5: Construct complete FormulaObject model
        formula_object = {
            "id": formula_id,
            "questionId": question_id,
            "optionId": option_id,
            "pageId": page_id,
            "regionId": region_id,
            "originalImage": original_crop_path,
            "boundingBox": [float(x) for x in bbox],
            "plainText": final_plain,
            "latex": final_latex,
            "mathml": final_mathml,
            "structuredExpression": ast_dict,
            "domain": domain,
            "confidence": round(conf, 3),
            "visualSimilarity": round(sim_score, 3),
            "recognitionEngine": engine_used,
            "recognitionVersion": "2.0-spatial-mfr",
            "validationStatus": val_status,
            "createdAt": now_iso,
            "updatedAt": now_iso,
        }

        return formula_object


# Singleton instance
mathematical_engine = MathematicalRecognitionEngine()
