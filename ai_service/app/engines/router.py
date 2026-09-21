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

    def list_engines(self) -> List[Dict[str, Any]]:
        engines = [
            {
                "name": "ScientificRecognitionSubsystem",
                "version": "2.0.0",
                "is_installed": True,
                "is_enabled": True,
                "ram_req_mb": 150,
                "vram_req_mb": 0,
                "capabilities": ["AST_TREE", "VISUAL_VALIDATION", "PHYSICS_ENGINE", "CHEMISTRY_ENGINE", "SCIENTIFIC_UNITS", "MATHML"],
                "health": "HEALTHY",
                "priority": 1,
            },
            {
                "name": "DigitalTextExtractor",
                "version": "1.28.0",
                "is_installed": True,
                "is_enabled": True,
                "ram_req_mb": 50,
                "vram_req_mb": 0,
                "capabilities": ["DIGITAL_PDF", "VECTOR_LAYOUT"],
                "health": "HEALTHY",
                "priority": 2,
            },
            {
                "name": "SpecializedMathNormalizer",
                "version": "1.14.0",
                "is_installed": True,
                "is_enabled": True,
                "ram_req_mb": 120,
                "vram_req_mb": 0,
                "capabilities": ["LATEX", "MATHML", "EQUATIONS", "FRACTIONS", "ROOTS"],
                "health": "HEALTHY",
                "priority": 3,
            },
            {
                "name": "SpecializedChemNormalizer",
                "version": "1.0.0",
                "is_installed": True,
                "is_enabled": True,
                "ram_req_mb": 80,
                "vram_req_mb": 0,
                "capabilities": ["FORMULAS", "IONS", "REACTIONS"],
                "health": "HEALTHY",
                "priority": 3,
            },
            {
                "name": "SpecializedPhysNormalizer",
                "version": "1.0.0",
                "is_installed": True,
                "is_enabled": True,
                "ram_req_mb": 80,
                "vram_req_mb": 0,
                "capabilities": ["UNITS", "SCIENTIFIC_NOTATION"],
                "health": "HEALTHY",
                "priority": 4,
            },
            {
                "name": "OpenCVContourDiagramExtractor",
                "version": "5.0.0",
                "is_installed": True,
                "is_enabled": True,
                "ram_req_mb": 100,
                "vram_req_mb": 0,
                "capabilities": ["DIAGRAM_CROPS", "FIGURES", "LABELS"],
                "health": "HEALTHY",
                "priority": 5,
            },
        ]

        tess_health = tesseract_adapter.health_check()
        engines.append({
            "name": tess_health["name"],
            "version": tess_health["version"],
            "is_installed": tess_health["is_installed"],
            "is_enabled": tess_health["is_enabled"],
            "ram_req_mb": tess_health["ram_req_mb"],
            "vram_req_mb": tess_health["vram_req_mb"],
            "capabilities": tesseract_adapter.capabilities,
            "health": "HEALTHY" if tess_health["is_installed"] else "UNAVAILABLE",
            "priority": 6,
        })

        return engines

    def route_and_process_region(
        self,
        raw_text: str,
        region_type: str,
        profile: str = "BALANCED"
    ) -> Dict[str, Any]:
        """Processes content according to region type and processing profile."""
        result = {
            "processed_text": raw_text,
            "confidence": 0.95,
            "escalated": False,
            "specialized_data": {},
        }

        # Mathematical equation specialization
        has_math_tokens = (
            region_type == "MATH"
            or any(c in raw_text for c in "πθαβγδεζηθικλμνξορστυφχψωΓΔΘΛΞΠΣΥΦΨΩ√∛∜∫∬∭∮∑∏∂∇±∓×÷≠≤≥≈≡∞∈∉⊂⊆∪∩∀∃⊥∠°½⅓¼¾²³")
            or any(k in raw_text for k in ["\\frac", "\\sqrt", "\\int", "\\sum", "\\pm", "\\times", "\\div", "\\le", "\\ge", "\\neq", "\\pi", "\\theta", "\\thita", "\\Theta", "\\Thita", "\\alpha", "^", "+-"])
            or bool(re.search(r"\b(theta|thita|alpha|beta|gamma|delta|lambda|omega|sigma|pi|sin|cos|tan|cot|sec|csc)\b", raw_text, re.IGNORECASE))
        )
        if has_math_tokens:
            natural_words = ["what", "when", "where", "which", "find", "rate", "calculate", "prove", "if", "then", "side", "radius", "triangle", "increasing", "volume", "surface", "area", "cone", "sphere", "is", "at", "the", "of", "in", "unit", "units"]
            is_natural_sentence = any(re.search(rf"\b{w}\b", raw_text, re.IGNORECASE) for w in natural_words)
            
            if region_type == "MATH" and not is_natural_sentence:
                # Pure standalone formula block
                math_res = specialized_math.normalize_math_to_latex(raw_text)
                result["specialized_data"]["math"] = math_res
                result["confidence"] = math_res["confidence"]
                result["processed_text"] = math_res["latex"]
            else:
                # Question, option, or paragraph containing natural prose with embedded math
                # Preserve English words and spaces while converting math symbols and formulas
                conv_text = specialized_math.convert_embedded_math(raw_text)
                result["confidence"] = 0.95
                result["processed_text"] = conv_text
                result["specialized_data"]["math"] = {"latex": conv_text, "has_embedded_math": True}

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
