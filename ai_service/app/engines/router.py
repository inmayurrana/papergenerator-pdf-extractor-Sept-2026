import re
import logging
from typing import List, Dict, Any, Optional
import numpy as np  # type: ignore
from ..core.config import config
from ..core.resource_mgr import resource_manager
from .specialized_math import specialized_math
from .specialized_chem import specialized_chem
from .specialized_phys import specialized_phys
from .diagram_extractor import diagram_extractor
from .tesseract_adapter import tesseract_adapter

logger = logging.getLogger("ocr_router")

class IntelligentOCRRouter:
    def __init__(self):
        self.adapters = {
            "Tesseract": tesseract_adapter,
        }
        self._disabled_engines = set()

    def toggle_engine(self, name: str, enabled: Optional[bool] = None) -> bool:
        """Toggles or sets the enabled state of an engine."""
        if enabled is None:
            if name in self._disabled_engines:
                self._disabled_engines.remove(name)
                new_state = True
            else:
                self._disabled_engines.add(name)
                new_state = False
        else:
            if enabled:
                self._disabled_engines.discard(name)
                new_state = True
            else:
                self._disabled_engines.add(name)
                new_state = False
        logger.info(f"Engine {name} toggled: enabled={new_state}")
        return new_state

    def restart_engine(self, name: str) -> Dict[str, Any]:
        """Restarts an engine, re-enabling it and clearing any cached model memory."""
        import gc
        from ..core.model_manager import model_manager
        
        # Ensure it's re-enabled
        self._disabled_engines.discard(name)
        
        # If this is VisualMathRouter or uses model manager, unload and garbage collect
        if name == "VisualMathRouter":
            model_manager.unload_all()
        gc.collect()
        
        logger.info(f"Engine {name} restarted successfully.")
        return {
            "name": name,
            "status": "RESTARTED",
            "is_enabled": True,
            "health": "HEALTHY",
        }

    def restart_all_engines(self) -> Dict[str, Any]:
        """Restarts all engines and purges model memory cache."""
        import gc
        from ..core.model_manager import model_manager
        
        self._disabled_engines.clear()
        model_manager.unload_all()
        gc.collect()
        
        logger.info("All engines restarted and model cache cleared.")
        return {
            "status": "SUCCESS",
            "message": "All engines re-initialized and memory flushed.",
            "engines_active": len(self.list_engines()),
        }

    def list_engines(self) -> List[Dict[str, Any]]:
        from ..core.model_manager import model_manager
        mm_status = model_manager.status()

        engines = [
            {
                "name": "VisualMathRouter",
                "version": "2.0.0",
                "is_installed": True,
                "is_enabled": "VisualMathRouter" not in self._disabled_engines,
                "ram_req_mb": 450,
                "vram_req_mb": 0,
                "capabilities": ["UNIMERNET", "PIX2TEXT", "PIX2TEX", "VLM_FALLBACK", "MFD_DETECTION"],
                "health": "HEALTHY" if "VisualMathRouter" not in self._disabled_engines else "DISABLED",
                "priority": 1,
                "loaded_models": mm_status.get("loaded", []),
            },
            {
                "name": "SpatialMathEngine",
                "version": "2.0.0",
                "is_installed": True,
                "is_enabled": "SpatialMathEngine" not in self._disabled_engines,
                "ram_req_mb": 20,
                "vram_req_mb": 0,
                "capabilities": ["2D_SPATIAL_AST", "MATHML", "CANONICAL_LATEX", "MATRICES", "INTEGRALS"],
                "health": "HEALTHY" if "SpatialMathEngine" not in self._disabled_engines else "DISABLED",
                "priority": 1,
            },
            {
                "name": "ScientificRecognitionSubsystem",
                "version": "2.0.0",
                "is_installed": True,
                "is_enabled": "ScientificRecognitionSubsystem" not in self._disabled_engines,
                "ram_req_mb": 150,
                "vram_req_mb": 0,
                "capabilities": ["AST_TREE", "VISUAL_VALIDATION", "PHYSICS_ENGINE", "CHEMISTRY_ENGINE", "SCIENTIFIC_UNITS", "MATHML"],
                "health": "HEALTHY" if "ScientificRecognitionSubsystem" not in self._disabled_engines else "DISABLED",
                "priority": 2,
            },
            {
                "name": "DigitalTextExtractor",
                "version": "1.28.0",
                "is_installed": True,
                "is_enabled": "DigitalTextExtractor" not in self._disabled_engines,
                "ram_req_mb": 50,
                "vram_req_mb": 0,
                "capabilities": ["DIGITAL_PDF", "VECTOR_LAYOUT"],
                "health": "HEALTHY" if "DigitalTextExtractor" not in self._disabled_engines else "DISABLED",
                "priority": 2,
            },
            {
                "name": "SpecializedMathNormalizer",
                "version": "1.14.0",
                "is_installed": True,
                "is_enabled": "SpecializedMathNormalizer" not in self._disabled_engines,
                "ram_req_mb": 120,
                "vram_req_mb": 0,
                "capabilities": ["LATEX", "MATHML", "EQUATIONS", "FRACTIONS", "ROOTS"],
                "health": "HEALTHY" if "SpecializedMathNormalizer" not in self._disabled_engines else "DISABLED",
                "priority": 3,
            },
            {
                "name": "SpecializedChemNormalizer",
                "version": "1.0.0",
                "is_installed": True,
                "is_enabled": "SpecializedChemNormalizer" not in self._disabled_engines,
                "ram_req_mb": 80,
                "vram_req_mb": 0,
                "capabilities": ["FORMULAS", "IONS", "REACTIONS"],
                "health": "HEALTHY" if "SpecializedChemNormalizer" not in self._disabled_engines else "DISABLED",
                "priority": 3,
            },
            {
                "name": "SpecializedPhysNormalizer",
                "version": "1.0.0",
                "is_installed": True,
                "is_enabled": "SpecializedPhysNormalizer" not in self._disabled_engines,
                "ram_req_mb": 80,
                "vram_req_mb": 0,
                "capabilities": ["UNITS", "SCIENTIFIC_NOTATION"],
                "health": "HEALTHY" if "SpecializedPhysNormalizer" not in self._disabled_engines else "DISABLED",
                "priority": 4,
            },
            {
                "name": "OpenCVContourDiagramExtractor",
                "version": "5.0.0",
                "is_installed": True,
                "is_enabled": "OpenCVContourDiagramExtractor" not in self._disabled_engines,
                "ram_req_mb": 100,
                "vram_req_mb": 0,
                "capabilities": ["DIAGRAM_CROPS", "FIGURES", "LABELS"],
                "health": "HEALTHY" if "OpenCVContourDiagramExtractor" not in self._disabled_engines else "DISABLED",
                "priority": 5,
            },
        ]

        tess_health = tesseract_adapter.health_check()
        tess_enabled = "Tesseract" not in self._disabled_engines and tess_health["is_enabled"]
        engines.append({
            "name": tess_health["name"],
            "version": tess_health["version"],
            "is_installed": tess_health["is_installed"],
            "is_enabled": tess_enabled,
            "ram_req_mb": tess_health["ram_req_mb"],
            "vram_req_mb": tess_health["vram_req_mb"],
            "capabilities": tesseract_adapter.capabilities,
            "health": ("HEALTHY" if tess_health["is_installed"] else "UNAVAILABLE") if tess_enabled else "DISABLED",
            "priority": 6,
        })

        return engines

    def route_and_process_region(
        self,
        raw_text: str,
        region_type: str,
        profile: str = "BALANCED",
        crop_img: Optional[np.ndarray] = None,
        crop_url: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Processes content according to region type, leveraging original pixel crops for math."""
        result = {
            "processed_text": raw_text,
            "confidence": 0.95,
            "escalated": False,
            "validation_status": "NEEDS_REVIEW",
            "needs_review": False,
            "crop_url": crop_url or "",
            "specialized_data": {},
        }

        # Mathematical equation specialization
        has_math_tokens = (
            region_type in ["MATH", "FORMULA", "FRACTION"]
            or any(c in raw_text for c in "πθαβγδεζηθικλμνξορστυφχψωΓΔΘΛΞΠΣΥΦΨΩ√∛∜∫∬∭∮∑∏∂∇±∓×÷≠≤≥≈≡∞∈∉⊂⊆∪∩∀∃⊥∠°½⅓¼¾²³")
            or any(k in raw_text for k in ["\\frac", "\\sqrt", "\\int", "\\sum", "\\pm", "\\times", "\\div", "\\le", "\\ge", "\\neq", "\\pi", "\\theta", "\\thita", "\\Theta", "\\Thita", "\\alpha", "^", "+-"])
            or bool(re.search(r"\b(theta|thita|alpha|beta|gamma|delta|lambda|omega|sigma|pi|sin|cos|tan|cot|sec|csc)\b", raw_text, re.IGNORECASE))
        )

        if has_math_tokens or (crop_img is not None and region_type in ["MATH", "FORMULA", "FRACTION"]):
            natural_words = ["what", "when", "where", "which", "find", "rate", "calculate", "prove", "if", "then", "side", "radius", "triangle", "increasing", "volume", "surface", "area", "cone", "sphere", "is", "at", "the", "of", "in", "unit", "units"]
            is_natural_sentence = any(re.search(rf"\b{w}\b", raw_text, re.IGNORECASE) for w in natural_words)

            from .visual_math_router import visual_math_router
            from ..scientific.visual_formula_verifier import visual_formula_verifier
            from .spatial_ast_engine import spatial_math_engine

            # 1. VISUAL-FIRST RECOGNITION: If original pixels are available and it's a formula region
            if crop_img is not None and crop_img.size > 0 and (not is_natural_sentence or region_type in ["MATH", "FORMULA", "FRACTION"]):
                try:
                    vis_res = visual_math_router.recognize(crop_img, hint="MATH")
                    if vis_res and vis_res.latex:
                        val_eval = visual_formula_verifier.evaluate_formula(
                            crop_image=crop_img,
                            candidate_latex=vis_res.latex,
                            character_confidence=vis_res.confidence,
                        )
                        result["processed_text"] = val_eval["latex"]
                        result["confidence"] = val_eval["overallConfidence"]
                        result["validation_status"] = val_eval["validationStatus"]
                        result["needs_review"] = val_eval["needs_review"]
                        result["specialized_data"]["math"] = {
                            "latex": val_eval["latex"],
                            "engine": vis_res.engine,
                            "visual_similarity": val_eval["visualSimilarity"],
                            "validation": val_eval,
                        }
                        result["specialized_data"]["spatial_ast"] = val_eval["ast"]
                        result["specialized_data"]["mathml"] = val_eval["mathml"]
                        result["specialized_data"]["spatial_flags"] = val_eval["structural_flags"]
                        result["specialized_data"]["crop_url"] = crop_url or ""
                        return result
                except Exception as vis_err:
                    logger.warning("Visual math recognition failed, falling back to text: %s", vis_err)

            # 2. TEXT-TIER FALLBACK (when crop unavailable or prose with embedded math)
            if region_type in ["MATH", "FORMULA", "FRACTION"] and not is_natural_sentence:
                math_res = specialized_math.normalize_math_to_latex(raw_text)
                target_latex = math_res["latex"]
                base_conf = math_res["confidence"]
            else:
                target_latex = specialized_math.convert_embedded_math(raw_text)
                base_conf = 0.90

            result["processed_text"] = target_latex

            # Evaluate with Visual Formula Verifier & 2D Spatial AST
            val_eval = visual_formula_verifier.evaluate_formula(
                crop_image=crop_img,
                candidate_latex=target_latex,
                character_confidence=base_conf,
            )
            result["confidence"] = val_eval["overallConfidence"]
            result["validation_status"] = val_eval["validationStatus"]
            result["needs_review"] = val_eval["needs_review"]
            result["specialized_data"]["math"] = {"latex": target_latex, "has_embedded_math": is_natural_sentence}
            result["specialized_data"]["spatial_ast"] = val_eval["ast"]
            result["specialized_data"]["mathml"] = val_eval["mathml"]
            result["specialized_data"]["spatial_flags"] = val_eval["structural_flags"]
            result["specialized_data"]["crop_url"] = crop_url or ""


        # Chemistry specialization
        elif region_type == "CHEM" or ("->" in raw_text or "⇌" in raw_text or "→" in raw_text):
            chem_res = specialized_chem.normalize_chemical_formula(raw_text)
            result["specialized_data"]["chem"] = chem_res
            result["confidence"] = chem_res["confidence"]
            result["processed_text"] = chem_res["formatted_formula"]

        # Physics specialization
        elif region_type == "PHYS" or ("x 10^" in raw_text or "m/s" in raw_text):
            phys_res = specialized_phys.normalize_physics_expression(raw_text)
            result["specialized_data"]["phys"] = phys_res
            result["confidence"] = phys_res["confidence"]

        # Confidence escalation check
        if result["confidence"] < config.CONFIDENCE_BALANCED_THRESHOLD:
            result["escalated"] = True
            result["review_recommended"] = True
            logger.info(f"Region marked for review (Confidence: {result['confidence']})")

        return result

ocr_router = IntelligentOCRRouter()
