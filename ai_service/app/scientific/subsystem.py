"""
Master Scientific Recognition Subsystem
Coordinates formula-first detection, structural parsing, multi-path OCR,
visual rendering validation, caching, and low-hardware resource management.
"""

import re
import cv2  # type: ignore
import numpy as np  # type: ignore
from typing import Dict, Any, Optional, Tuple
from pathlib import Path

from .structural_tree import FormulaNode, ExpressionTreeBuilder, NodeType
from .scientific_units import scientific_units
from .physics_engine import physics_engine
from .chemistry_engine import chemistry_engine
from .biology_engine import biology_engine
from .disambiguation import disambiguator
from .formula_tokenizer import formula_tokenizer
from .formula_grammar import formula_validator
from .visual_validator import visual_validator
from .formula_cache import formula_cache
from ..core.config import config
from ..engines.specialized_math import specialized_math


class ScientificRecognitionSubsystem:
    """
    Dedicated Multi-Stage Mathematical and Scientific Document Recognition Subsystem.
    Honors 8 GB RAM / 4 GB VRAM target by performing region-based cropping and caching.
    """

    @classmethod
    def process_formula_crop(
        cls,
        crop_image: np.ndarray,
        ocr_text: str = "",
        mode: str = "AUTO",  # AUTO, MATH, PHYSICS, CHEMISTRY, BIOLOGY, DIAGRAM
        image_identifier: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Processes a formula crop through the full pipeline:
        1. Cache lookup
        2. Context-aware disambiguation & Unicode normalization
        3. Content classification / path selection (Math, Physics, Chemistry, Biology)
        4. Tokenization & Structural AST parsing
        5. Formula validation (balance, brackets, radicals, charges)
        6. LaTeX & MathML generation
        7. Visual rendering validation against original crop
        8. Caching & result delivery
        """
        # 1. Check formula cache
        cache_key = image_identifier or crop_image
        cached = formula_cache.get(cache_key)
        if cached:
            return cached

        raw_text = ocr_text.strip()
        effective_mode = mode

        # Context-aware normalization
        normalized_text = disambiguator.normalize_text_scientific(raw_text, domain_hint=effective_mode)

        # Auto-detect mode if requested
        if effective_mode == "AUTO":
            bio_analysis = biology_engine.analyze_biology_region(normalized_text)
            if bio_analysis["is_biology"]:
                effective_mode = "BIOLOGY"
            elif chemistry_engine.ARROW_PATTERN.search(normalized_text) or ("ce{" in normalized_text):
                effective_mode = "CHEMISTRY"
            elif any(u in normalized_text for u in scientific_units.COMPOUND_UNITS) or ("\\vec" in normalized_text):
                effective_mode = "PHYSICS"
            else:
                effective_mode = "MATH"

        # 2. Extract formula component and scientific unit
        formula_part, unit = scientific_units.split_formula_and_unit(normalized_text)

        # 3. Structural AST construction and validation
        ast_node: Optional[FormulaNode] = None
        latex_str = ""
        mathml_str = ""
        domain_conf = 0.90
        domain_info: Dict[str, Any] = {}

        # Validate syntax & grammar
        validation_rep = formula_validator.validate_formula(normalized_text, domain_hint=effective_mode)
        domain_info["validation"] = validation_rep.to_dict()
        if validation_rep.ast_root:
            ast_node = validation_rep.ast_root

        if effective_mode == "BIOLOGY":
            bio_res = biology_engine.analyze_biology_region(normalized_text)
            latex_str = biology_engine.format_biology_latex(normalized_text)
            domain_info["biology"] = bio_res
            domain_conf = bio_res.get("confidence", 0.90)

        elif effective_mode == "CHEMISTRY":
            chem_res = chemistry_engine.validate_chemical_equation(normalized_text)
            latex_str = chemistry_engine.format_chemical_latex(normalized_text)
            domain_info["chemistry"] = chem_res
            domain_conf = chem_res.get("confidence", 0.90)

        elif effective_mode == "PHYSICS":
            phys_res = physics_engine.analyze_physics_region(normalized_text)
            latex_str = specialized_math.convert_embedded_math(formula_part)
            if unit:
                latex_str = scientific_units.format_latex_with_unit(latex_str, unit)
            domain_info["physics"] = phys_res
            domain_conf = phys_res.get("domain_confidence", 0.92)

        else:  # MATH
            # Check for radical structure: e.g. 10\sqrt{3} or \sqrt{3}
            rad_match = re.search(r"(\d*)\s*(?:\\sqrt\{([^}]+)\}|√([0-9a-zA-Z]+))", formula_part)
            frac_match = re.search(r"(?:\\frac\{([^}]+)\}\{([^}]+)\}|([a-zA-Z0-9]+)\s*/\s*([a-zA-Z0-9\\]+))", formula_part)

            if rad_match:
                coeff = rad_match.group(1)
                radicand = rad_match.group(2) or rad_match.group(3)
                ast_node = ExpressionTreeBuilder.build_radical_expression(coeff, radicand, unit)
                latex_str = ast_node.to_latex()
                mathml_str = ast_node.to_mathml()
            elif frac_match:
                num = frac_match.group(1) or frac_match.group(3)
                denom = frac_match.group(2) or frac_match.group(4)
                ast_node = ExpressionTreeBuilder.build_fraction_expression(num, denom, unit)
                latex_str = ast_node.to_latex()
                mathml_str = ast_node.to_mathml()
            else:
                latex_str = specialized_math.convert_embedded_math(formula_part)
                if unit:
                    latex_str = scientific_units.format_latex_with_unit(latex_str, unit)

        if not latex_str.startswith("$") and not latex_str.startswith("\\["):
            display_latex = f"${latex_str}$"
        else:
            display_latex = latex_str

        # 4. Mandatory Visual Rendering Validation
        val_eval = visual_validator.evaluate_multi_dimensional_confidence(
            crop_img=crop_image,
            formula_latex=latex_str,
            recognition_conf=0.95,
            structural_valid=(ast_node is not None or bool(latex_str)),
            domain_conf=domain_conf,
        )

        # 5. Multi-Scale Preprocessing if visual similarity is poor
        if val_eval["needs_review"] and crop_image is not None and crop_image.size > 0:
            enhanced_crop = visual_validator.adaptive_multi_scale_enhance(crop_image)
            enhanced_eval = visual_validator.evaluate_multi_dimensional_confidence(
                crop_img=enhanced_crop,
                formula_latex=latex_str,
                recognition_conf=0.95,
                structural_valid=True,
                domain_conf=domain_conf,
            )
            # Accept if improved
            if enhanced_eval["overall_confidence"] > val_eval["overall_confidence"]:
                val_eval = enhanced_eval

        result = {
            "mode": effective_mode,
            "raw_text": raw_text,
            "formula_component": formula_part,
            "unit": unit,
            "latex": display_latex,
            "raw_latex": latex_str.replace("$", "").strip(),
            "mathml": mathml_str,
            "structured_ast": ast_node.to_dict() if ast_node else None,
            "confidence": val_eval,
            "domain_info": domain_info,
        }

        # 6. Cache high-confidence result
        if not val_eval["needs_review"]:
            formula_cache.set(cache_key, result)

        return result


scientific_subsystem = ScientificRecognitionSubsystem()
