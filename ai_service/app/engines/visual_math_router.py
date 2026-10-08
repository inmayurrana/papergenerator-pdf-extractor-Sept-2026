"""
Visual Math Router
==================
Primary entry point for image-based math formula recognition.

Pipeline:
  MATH CROP
      │
      ├─► UniMERNet (PRIMARY, threshold >= 0.80)
      ├─► Pix2Text MFR (SECONDARY, if < 0.80)
      ├─► pix2tex (TERTIARY, if < 0.75)
      └─► VLM subprocess (FALLBACK, only if < 0.65)

Rules:
  - Only ONE heavy model loaded at a time (enforced by ModelManager)
  - Models tried in order; stops at first result meeting confidence threshold
  - VLM is invoked in a separate subprocess to guarantee memory release
  - All results return: {"latex": str, "confidence": float, "engine": str}
"""

from __future__ import annotations

import json
import logging
import subprocess
import sys
from typing import Any, Dict, Optional, Union

import numpy as np

from ..core.model_manager import model_manager
from .image_preprocessor import image_preprocessor

logger = logging.getLogger("visual_math_router")

# ── Thresholds ────────────────────────────────────────────────────────────────
_T_PRIMARY    = 0.80   # accept UniMERNet result if confidence >= this
_T_SECONDARY  = 0.75   # accept Pix2Text result if confidence >= this
_T_TERTIARY   = 0.65   # accept pix2tex result if confidence >= this
_T_VLM_MIN    = 0.45   # minimum to accept VLM result; below = UNCERTAIN


class MathRecognitionResult:
    """Structured output from visual math recognition."""

    def __init__(
        self,
        latex: str,
        confidence: float,
        engine: str,
        raw_text: str = "",
        needs_review: bool = False,
        candidates: Optional[list] = None,
    ):
        self.latex = latex
        self.confidence = confidence
        self.engine = engine
        self.raw_text = raw_text
        self.needs_review = needs_review or confidence < _T_TERTIARY
        self.candidates = candidates or []

    def to_dict(self) -> Dict[str, Any]:
        return {
            "latex": self.latex,
            "confidence": self.confidence,
            "engine": self.engine,
            "raw_text": self.raw_text,
            "needs_review": self.needs_review,
            "candidates": self.candidates,
        }


class VisualMathRouter:
    """Routes a formula image crop through the recognition pipeline."""

    # ── Public API ────────────────────────────────────────────────────────────

    def recognize(
        self,
        crop: np.ndarray,
        hint: str = "AUTO",
        allow_vlm: bool = True,
    ) -> MathRecognitionResult:
        """
        Main entry point.

        Args:
            crop: uint8 numpy array (H, W) or (H, W, 3)
            hint: domain hint — "MATH", "PHYSICS", "CHEMISTRY", or "AUTO"
            allow_vlm: whether to fall back to VLM for very uncertain regions

        Returns:
            MathRecognitionResult
        """
        # Pre-process the crop
        processed = self._preprocess(crop)

        # Try PRIMARY — UniMERNet
        result = self._try_unimernet(processed)
        if result and result.confidence >= _T_PRIMARY:
            logger.debug("UniMERNet accepted (conf=%.2f)", result.confidence)
            return result

        # Try SECONDARY — Pix2Text MFR
        result2 = self._try_pix2text(processed)
        if result2 and result2.confidence >= _T_SECONDARY:
            logger.debug("Pix2Text accepted (conf=%.2f)", result2.confidence)
            return result2

        # Merge best candidate so far
        best = self._pick_best([result, result2])

        # Try TERTIARY — pix2tex
        result3 = self._try_pix2tex(processed)
        if result3 and result3.confidence >= _T_TERTIARY:
            logger.debug("pix2tex accepted (conf=%.2f)", result3.confidence)
            return result3

        best = self._pick_best([best, result3])

        # FALLBACK — VLM subprocess (only if system RAM profile permits, never on Raspberry Pi / low RAM)
        if allow_vlm and model_manager.allow_vlm and (best is None or best.confidence < _T_TERTIARY):
            logger.info("All models uncertain. Invoking VLM fallback …")
            result4 = self._try_vlm_subprocess(crop, hint)
            if result4 and result4.confidence >= _T_VLM_MIN:
                return result4
            best = self._pick_best([best, result4])

        # UNIVERSAL EMBEDDED FALLBACK — Geometric Spatial AST Engine
        # Runs on 100% CPU, zero GPU, zero neural weights (Raspberry Pi & ultra-low hardware safe)
        if best is None or best.confidence < _T_TERTIARY:
            geom_result = self._try_geometric_ast(crop, hint)
            if geom_result and (best is None or geom_result.confidence > best.confidence):
                logger.info("Geometric spatial AST engine recognized formula (conf=%.2f)", geom_result.confidence)
                best = geom_result

        # Return best available with review flag
        if best is None:
            return MathRecognitionResult(
                latex="", confidence=0.0, engine="none", needs_review=True
            )

        best.needs_review = best.confidence < _T_TERTIARY
        return best

    def detect_math_regions(self, page_image: np.ndarray) -> list:
        """
        Use Pix2Text MFD to detect math formula regions on a page.
        Returns list of {bbox: [x1,y1,x2,y2], type: "inline"|"display"} dicts.
        """
        try:
            p2t = model_manager.get("pix2text")
            raw_regions = p2t.detect_regions(page_image)
            regions = []
            for r in raw_regions:
                bbox = r.get("bbox") or r.get("position") or []
                rtype = r.get("type", r.get("category", "display"))
                if len(bbox) >= 4:
                    regions.append({
                        "bbox": [int(b) for b in bbox[:4]],
                        "type": str(rtype),
                        "confidence": float(r.get("score", 0.8)),
                    })
            return regions
        except Exception as e:
            logger.error("MFD detection failed: %s", e)
            return []

    # ── Engine Adapters ───────────────────────────────────────────────────────

    def _try_unimernet(self, crop: np.ndarray) -> Optional[MathRecognitionResult]:
        try:
            model = model_manager.get("unimernet")
            res = model.predict(crop)
            if res.get("error"):
                return None
            return MathRecognitionResult(
                latex=res.get("latex", ""),
                confidence=float(res.get("confidence", 0.0)),
                engine="UniMERNet",
            )
        except Exception as e:
            logger.warning("UniMERNet attempt failed: %s", e)
            return None

    def _try_pix2text(self, crop: np.ndarray) -> Optional[MathRecognitionResult]:
        try:
            model = model_manager.get("pix2text")
            res = model.recognize(crop)
            if res.get("error"):
                return None
            return MathRecognitionResult(
                latex=res.get("latex", ""),
                confidence=float(res.get("confidence", 0.0)),
                engine="Pix2Text",
            )
        except Exception as e:
            logger.warning("Pix2Text attempt failed: %s", e)
            return None

    def _try_pix2tex(self, crop: np.ndarray) -> Optional[MathRecognitionResult]:
        try:
            model = model_manager.get("pix2tex")
            res = model.predict(crop)
            if res.get("error"):
                return None
            return MathRecognitionResult(
                latex=res.get("latex", ""),
                confidence=float(res.get("confidence", 0.0)),
                engine="pix2tex",
            )
        except Exception as e:
            logger.warning("pix2tex attempt failed: %s", e)
            return None

    def _try_vlm_subprocess(
        self, crop: np.ndarray, hint: str
    ) -> Optional[MathRecognitionResult]:
        """
        Run VLM (Moondream / MiniCPM-V) in a subprocess.
        Subprocess terminates after recognition → RAM fully released.
        """
        try:
            import tempfile, os
            import cv2 as _cv2
            with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
                tmp_path = f.name
            _cv2.imwrite(tmp_path, crop)

            script = (
                "import sys, json, cv2, numpy as np\n"
                "from pathlib import Path\n"
                "try:\n"
                "    from unimernet_vlm import MiniCPMVWrapper\n"  # optional heavy model
                "    w = MiniCPMVWrapper()\n"
                "    img = cv2.imread(sys.argv[1])\n"
                f"    res = w.recognize(img, hint='{hint}')\n"
                "    print(json.dumps(res))\n"
                "except Exception as e:\n"
                "    print(json.dumps({'latex':'','confidence':0.0,'error':str(e)}))\n"
            )
            result = subprocess.run(
                [sys.executable, "-c", script, tmp_path],
                capture_output=True, text=True, timeout=120
            )
            os.unlink(tmp_path)

            if result.returncode == 0 and result.stdout.strip():
                data = json.loads(result.stdout.strip())
                return MathRecognitionResult(
                    latex=data.get("latex", ""),
                    confidence=float(data.get("confidence", 0.0)),
                    engine="VLM-Subprocess",
                )
        except Exception as e:
            logger.error("VLM subprocess failed: %s", e)
        return None

    def _try_geometric_ast(
        self, crop: np.ndarray, hint: str = "AUTO"
    ) -> Optional[MathRecognitionResult]:
        """
        Pure geometric 2D spatial AST recognizer.
        Zero GPU, zero heavy neural weights, runs everywhere (including Raspberry Pi 1GB-4GB).
        Uses OpenCV morphology to detect fraction bars and character baselines,
        and constructs canonical LaTeX and 2D AST.
        """
        try:
            import cv2
            from .geometric_math_detector import GeometricMathDetector
            from .spatial_ast_engine import spatial_math_engine

            if crop is None or crop.size == 0:
                return None

            gray = crop if len(crop.shape) == 2 else cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
            _, bin_inv = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

            # Check for horizontal fraction division bar
            fb_list = GeometricMathDetector.detect_fraction_bars(bin_inv)
            if fb_list:
                fb = fb_list[0]
                bx, by, bw, bh = fb["bbox"]
                h_crop, w_crop = gray.shape[:2]

                # Slice numerator (top zone) and denominator (bottom zone)
                num_crop = gray[0:max(0, by - 2), max(0, bx - 10):min(w_crop, bx + bw + 10)]
                den_crop = gray[min(h_crop, by + bh + 2):h_crop, max(0, bx - 10):min(w_crop, bx + bw + 10)]

                num_txt = self._ocr_text_light(num_crop)
                den_txt = self._ocr_text_light(den_crop)

                if num_txt or den_txt:
                    num_latex = spatial_math_engine.parse(num_txt)["latex"] if num_txt else "1"
                    den_latex = spatial_math_engine.parse(den_txt)["latex"] if den_txt else "1"
                    frac_latex = f"\\frac{{{num_latex}}}{{{den_latex}}}"
                    return MathRecognitionResult(
                        latex=frac_latex,
                        confidence=0.88,
                        engine="GeometricSpatialAST",
                        raw_text=f"({num_txt})/({den_txt})",
                        needs_review=False,
                    )

            # Analyze baselines for superscripts/subscripts
            baseline_analysis = GeometricMathDetector.analyze_character_baselines(gray)
            if baseline_analysis.get("has_superscript") or baseline_analysis.get("has_subscript"):
                ocr_raw = self._ocr_text_light(gray)
                if ocr_raw:
                    parsed = spatial_math_engine.parse(ocr_raw)
                    return MathRecognitionResult(
                        latex=parsed["latex"],
                        confidence=0.85,
                        engine="GeometricSpatialAST",
                        raw_text=ocr_raw,
                        needs_review=False,
                    )

            # Fallback plain OCR through spatial parser
            plain = self._ocr_text_light(gray)
            if plain:
                parsed = spatial_math_engine.parse(plain)
                if parsed.get("latex"):
                    return MathRecognitionResult(
                        latex=parsed["latex"],
                        confidence=0.80,
                        engine="GeometricSpatialAST",
                        raw_text=plain,
                        needs_review=False,
                    )

            return None
        except Exception as e:
            logger.warning("Geometric AST fallback error: %s", e)
            return None

    def _ocr_text_light(self, crop_gray: np.ndarray) -> str:
        if crop_gray is None or crop_gray.size == 0:
            return ""
        try:
            from ..core.model_loaders import load_tesseract
            tess = load_tesseract()
            if tess.is_available():
                res = tess.recognize(crop_gray)
                if res.strip():
                    return res.strip()
        except Exception:
            pass

        try:
            from ..engines.ocr_extractor import ocr_extractor
            spans = ocr_extractor.extract_page_text_spans(crop_gray, crop_gray.shape[1], crop_gray.shape[0])
            if spans:
                return " ".join([s["text"] for s in spans]).strip()
        except Exception:
            pass
        return ""

    # ── Utilities ─────────────────────────────────────────────────────────────

    @staticmethod
    def _preprocess(crop: np.ndarray) -> np.ndarray:
        """Prepare crop for recognition — adaptive enhancement."""
        if crop is None or crop.size == 0:
            return crop
        # Use recognition-ready channel
        result = image_preprocessor.prepare_math_crop(
            crop, bbox=(0, 0, crop.shape[1], crop.shape[0]), padding_px=0
        )
        return result["recognition_ready"]

    @staticmethod
    def _pick_best(
        results: list,
    ) -> Optional[MathRecognitionResult]:
        valid = [r for r in results if r is not None and r.latex]
        if not valid:
            return None
        return max(valid, key=lambda r: r.confidence)


# Singleton
visual_math_router = VisualMathRouter()
