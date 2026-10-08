"""
Model Loaders — Deferred factory functions for each AI model.
Each loader is called lazily by ModelManager. Returns a model wrapper.
All models use CPU-only providers; no AVX2 required (i3 2nd Gen safe).
"""

from __future__ import annotations
import logging
import os
from typing import Any

import psutil

logger = logging.getLogger("model_loaders")
_CPU_THREADS = max(1, os.cpu_count() or 2)


# ─── UniMERNet ────────────────────────────────────────────────────────────────
class UniMERNetWrapper:
    """
    Wraps UniMERNet ONNX model for CPU-only inference.
    UniMERNet: https://github.com/opendatalab/UniMERNet
    Falls back gracefully if not installed.
    """

    def __init__(self, model):
        self._model = model

    def predict(self, image_np) -> dict:
        """
        Args:
            image_np: numpy array (H, W, 3) or (H, W) uint8
        Returns:
            {"latex": str, "confidence": float}
        """
        try:
            import numpy as np
            from PIL import Image as PILImage
            pil_img = PILImage.fromarray(image_np)
            result = self._model(pil_img)
            if isinstance(result, (list, tuple)):
                latex = result[0] if result else ""
                conf = float(result[1]) if len(result) > 1 else 0.85
            elif isinstance(result, dict):
                latex = result.get("latex", result.get("text", ""))
                conf = float(result.get("confidence", 0.85))
            else:
                latex = str(result)
                conf = 0.80
            return {"latex": latex.strip(), "confidence": conf}
        except Exception as e:
            logger.error("UniMERNet predict error: %s", e)
            return {"latex": "", "confidence": 0.0, "error": str(e)}


def load_unimernet() -> UniMERNetWrapper:
    """Load UniMERNet. Tries unimernet package, then ONNX checkpoint."""
    try:
        import unimernet.tasks as tasks
        from omegaconf import OmegaConf  # type: ignore
        import torch

        cfg_path = os.environ.get("UNIMERNET_CFG", "")
        model_dir = os.environ.get("UNIMERNET_MODEL_DIR", "")
        if cfg_path and model_dir and os.path.isfile(cfg_path):
            cfg = OmegaConf.load(cfg_path)
            model = tasks.setup_task(cfg).build_model(cfg)
            model.eval()
            logger.info("UniMERNet loaded (torch, cpu)")
            return UniMERNetWrapper(model)
    except Exception as e:
        logger.warning("UniMERNet torch load failed (%s). Trying ONNX …", e)

    try:
        import onnxruntime as ort  # type: ignore
        onnx_path = os.environ.get("UNIMERNET_ONNX_PATH", "")
        if onnx_path and os.path.isfile(onnx_path):
            sess_opts = ort.SessionOptions()
            sess_opts.intra_op_num_threads = _CPU_THREADS
            sess_opts.inter_op_num_threads = _CPU_THREADS
            sess = ort.InferenceSession(
                onnx_path,
                sess_options=sess_opts,
                providers=["CPUExecutionProvider"],
            )
            logger.info("UniMERNet loaded (ONNX, CPU)")

            class _OnnxWrap:
                def __call__(self, pil_img):
                    import numpy as np
                    from PIL import Image
                    img = pil_img.convert("RGB").resize((224, 224))
                    arr = np.array(img, dtype=np.float32)[np.newaxis] / 255.0
                    outputs = sess.run(None, {"input": arr})
                    return outputs[0] if outputs else ""

            return UniMERNetWrapper(_OnnxWrap())
    except Exception as e:
        logger.warning("UniMERNet ONNX load failed: %s", e)

    logger.warning("UniMERNet unavailable — returning stub")

    class _StubModel:
        def __call__(self, img):
            return {"latex": "", "confidence": 0.0}

    return UniMERNetWrapper(_StubModel())


# ─── Pix2Text ─────────────────────────────────────────────────────────────────
class Pix2TextWrapper:
    """Wraps Pix2Text MFD + MFR pipeline."""

    def __init__(self, p2t):
        self._p2t = p2t

    def recognize(self, image_np) -> dict:
        try:
            result = self._p2t.recognize_formula(image_np)
            if isinstance(result, str):
                return {"latex": result, "confidence": 0.82}
            elif isinstance(result, dict):
                return {
                    "latex": result.get("latex", result.get("text", "")),
                    "confidence": float(result.get("score", 0.82)),
                }
            return {"latex": str(result), "confidence": 0.75}
        except Exception as e:
            logger.error("Pix2Text recognize error: %s", e)
            return {"latex": "", "confidence": 0.0, "error": str(e)}

    def detect_regions(self, image_np) -> list:
        """Detect math formula regions (MFD). Returns list of bbox dicts."""
        try:
            result = self._p2t.recognize(image_np, return_text=False)
            regions = []
            if isinstance(result, list):
                for item in result:
                    if isinstance(item, dict):
                        regions.append(item)
            return regions
        except Exception as e:
            logger.error("Pix2Text MFD error: %s", e)
            return []


def load_pix2text() -> Pix2TextWrapper:
    try:
        from pix2text import Pix2Text  # type: ignore
        p2t = Pix2Text(device="cpu")
        logger.info("Pix2Text loaded (CPU)")
        return Pix2TextWrapper(p2t)
    except Exception as e:
        logger.warning("Pix2Text unavailable: %s — returning stub", e)

        class _Stub:
            def recognize_formula(self, img):
                return {"latex": "", "score": 0.0}
            def recognize(self, img, **kw):
                return []

        return Pix2TextWrapper(_Stub())


# ─── pix2tex / LaTeX-OCR ──────────────────────────────────────────────────────
class Pix2TexWrapper:
    def __init__(self, model):
        self._model = model

    def predict(self, image_np) -> dict:
        try:
            from PIL import Image as PILImage
            pil = PILImage.fromarray(image_np)
            latex = self._model(pil)
            return {"latex": str(latex).strip(), "confidence": 0.78}
        except Exception as e:
            logger.error("pix2tex predict error: %s", e)
            return {"latex": "", "confidence": 0.0, "error": str(e)}


def load_pix2tex() -> Pix2TexWrapper:
    try:
        from pix2tex.cli import LatexOCR  # type: ignore
        model = LatexOCR()
        logger.info("pix2tex (LaTeX-OCR) loaded")
        return Pix2TexWrapper(model)
    except Exception as e:
        logger.warning("pix2tex unavailable: %s — returning stub", e)

        class _Stub:
            def __call__(self, img):
                return ""

        return Pix2TexWrapper(_Stub())


# ─── PaddleOCR ────────────────────────────────────────────────────────────────
class PaddleOCRWrapper:
    def __init__(self, ocr):
        self._ocr = ocr

    def recognize_text(self, image_np) -> list:
        """Returns list of (bbox, text, confidence) tuples."""
        try:
            results = self._ocr.ocr(image_np, cls=True)
            if not results or not results[0]:
                return []
            out = []
            for line in results[0]:
                bbox, (text, conf) = line
                out.append({"bbox": bbox, "text": text, "confidence": float(conf)})
            return out
        except Exception as e:
            logger.error("PaddleOCR error: %s", e)
            return []


def load_paddle_ocr() -> PaddleOCRWrapper:
    try:
        from paddleocr import PaddleOCR  # type: ignore
        ocr = PaddleOCR(
            use_angle_cls=True,
            lang="en",
            use_gpu=False,
            cpu_threads=_CPU_THREADS,
            enable_mkldnn=False,   # disable MKL-DNN — not needed and may cause issues on old CPUs
            show_log=False,
        )
        logger.info("PaddleOCR loaded (CPU, threads=%d)", _CPU_THREADS)
        return PaddleOCRWrapper(ocr)
    except Exception as e:
        logger.warning("PaddleOCR unavailable: %s — returning stub", e)

        class _Stub:
            def ocr(self, img, **kw):
                return [[]]

        return PaddleOCRWrapper(_Stub())


# ─── Tesseract ────────────────────────────────────────────────────────────────
class TesseractWrapper:
    def __init__(self):
        self._available = False
        try:
            import pytesseract  # type: ignore
            pytesseract.get_tesseract_version()
            self._tess = pytesseract
            self._available = True
            logger.info("Tesseract available")
        except Exception as e:
            logger.warning("Tesseract not available: %s", e)
            self._tess = None

    def recognize(self, image_np, lang: str = "eng") -> str:
        if not self._available or self._tess is None:
            return ""
        try:
            import numpy as np
            from PIL import Image as PILImage
            pil = PILImage.fromarray(image_np)
            return self._tess.image_to_string(pil, lang=lang, config="--psm 6").strip()
        except Exception as e:
            logger.error("Tesseract recognize error: %s", e)
            return ""

    def is_available(self) -> bool:
        return self._available


def load_tesseract() -> TesseractWrapper:
    return TesseractWrapper()
