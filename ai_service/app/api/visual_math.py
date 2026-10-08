"""
Visual Math Pipeline API
=========================
FastAPI router for the full visual math recognition pipeline.

Endpoints:
  POST /api/visual-math/recognize      — recognize formula from image crop
  POST /api/visual-math/detect-regions — detect math regions on a page
  POST /api/visual-math/parse-latex    — parse LaTeX → AST + MathML
  GET  /api/visual-math/model-status   — current model load status
  POST /api/visual-math/unload-models  — free all loaded models
"""

from __future__ import annotations

import base64
import logging
import tempfile
from pathlib import Path
from typing import Any, Dict, Optional

import cv2
import numpy as np
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..core.model_manager import model_manager
from ..engines.visual_math_router import visual_math_router
from ..engines.image_preprocessor import image_preprocessor
from ..engines.spatial_ast_engine import spatial_math_engine

logger = logging.getLogger("visual_math_api")

router = APIRouter(prefix="/api/visual-math", tags=["Visual Math"])


# ─── Request / Response models ────────────────────────────────────────────────

class RecognizeRequest(BaseModel):
    # Supply ONE of: image_base64, image_path
    image_base64: Optional[str] = None
    image_path: Optional[str] = None
    hint: str = "AUTO"                     # AUTO | MATH | PHYSICS | CHEMISTRY
    allow_vlm: bool = True                 # allow expensive VLM fallback
    save_crop: bool = False                # persist crop to storage

class DetectRegionsRequest(BaseModel):
    image_base64: Optional[str] = None
    image_path: Optional[str] = None
    page_dpi: int = 300

class ParseLatexRequest(BaseModel):
    latex: str

class RecognizeResponse(BaseModel):
    latex: str
    confidence: float
    engine: str
    needs_review: bool
    mathml: str
    ast: Dict[str, Any]
    plain_text: str
    structural_flags: Dict[str, bool]

class DetectRegionsResponse(BaseModel):
    regions: list
    total: int

class ParseLatexResponse(BaseModel):
    latex: str
    mathml: str
    ast: Dict[str, Any]
    plain_text: str
    structural_flags: Dict[str, bool]


# ─── Helper ───────────────────────────────────────────────────────────────────

def _decode_image(base64_str: Optional[str], path: Optional[str]) -> np.ndarray:
    if base64_str:
        raw = base64.b64decode(base64_str)
        arr = np.frombuffer(raw, np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img is None:
            raise HTTPException(400, "Could not decode base64 image")
        return img
    if path:
        img = cv2.imread(str(path))
        if img is None:
            raise HTTPException(400, f"Could not read image: {path}")
        return img
    raise HTTPException(400, "Supply image_base64 or image_path")


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/recognize", response_model=RecognizeResponse)
async def recognize_formula(req: RecognizeRequest):
    """
    Recognize a math formula crop through the full visual pipeline.
    PRIMARY → SECONDARY → TERTIARY → VLM (lazy, as needed).
    Returns structural LaTeX, MathML, and AST.
    """
    try:
        img = _decode_image(req.image_base64, req.image_path)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, f"Image decode error: {e}")

    # Run visual recognition pipeline
    result = visual_math_router.recognize(img, hint=req.hint, allow_vlm=req.allow_vlm)

    # Build structural AST from recognized LaTeX
    parsed = spatial_math_engine.parse(result.latex)

    return RecognizeResponse(
        latex=parsed["latex"] or result.latex,
        confidence=result.confidence,
        engine=result.engine,
        needs_review=result.needs_review,
        mathml=parsed["mathml"],
        ast=parsed["ast"],
        plain_text=parsed["plain"],
        structural_flags={
            "has_subscript":   parsed["has_subscript"],
            "has_superscript": parsed["has_superscript"],
            "has_fraction":    parsed["has_fraction"],
            "has_integral":    parsed["has_integral"],
            "has_matrix":      parsed["has_matrix"],
            "has_vector":      parsed["has_vector"],
            "has_root":        parsed["has_root"],
            "has_sum":         parsed["has_sum"],
            "has_limit":       parsed["has_limit"],
        },
    )


@router.post("/detect-regions", response_model=DetectRegionsResponse)
async def detect_math_regions(req: DetectRegionsRequest):
    """
    Detect math formula bounding boxes on a document page.
    Uses Pix2Text MFD (Math Formula Detector).
    """
    try:
        img = _decode_image(req.image_base64, req.image_path)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, f"Image decode error: {e}")

    # Pre-process page
    prep = image_preprocessor.prepare_page(img, dpi=req.page_dpi)
    page = prep["gray"]

    regions = visual_math_router.detect_math_regions(page)

    return DetectRegionsResponse(regions=regions, total=len(regions))


@router.post("/parse-latex", response_model=ParseLatexResponse)
async def parse_latex(req: ParseLatexRequest):
    """
    Parse a LaTeX string into structural AST + MathML.
    Input LaTeX is never treated as raw text — always structurally parsed.
    """
    parsed = spatial_math_engine.parse(req.latex)
    return ParseLatexResponse(
        latex=parsed["latex"],
        mathml=parsed["mathml"],
        ast=parsed["ast"],
        plain_text=parsed["plain"],
        structural_flags={
            "has_subscript":   parsed["has_subscript"],
            "has_superscript": parsed["has_superscript"],
            "has_fraction":    parsed["has_fraction"],
            "has_integral":    parsed["has_integral"],
            "has_matrix":      parsed["has_matrix"],
            "has_vector":      parsed["has_vector"],
            "has_root":        parsed["has_root"],
            "has_sum":         parsed["has_sum"],
            "has_limit":       parsed["has_limit"],
        },
    )


@router.get("/model-status")
async def model_status():
    """Return current model manager status and RAM metrics."""
    return {"status": "ok", **model_manager.status()}


@router.post("/unload-models")
async def unload_models():
    """Explicitly unload all AI models and free RAM."""
    model_manager.unload_all()
    return {"status": "ok", "message": "All models unloaded", **model_manager.status()}
