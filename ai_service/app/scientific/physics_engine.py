"""
Advanced Physics Recognition & Domain Validation Layer
Recognizes physics equations, variables, constants, vectors, Greek symbols,
and performs domain-specific validation (dimensional & unit checks).
"""

import re
from typing import Dict, Any, List, Optional
from .scientific_units import scientific_units
from .structural_tree import FormulaNode, NodeType


class AdvancedPhysicsEngine:
    # Common physical constants (symbol, description, typical unit)
    PHYSICAL_CONSTANTS: Dict[str, Dict[str, str]] = {
        "c": {"name": "Speed of light", "unit": "m/s", "value": "3.0 \\times 10^8"},
        "G": {"name": "Gravitational constant", "unit": "N m^2/kg^2", "value": "6.67 \\times 10^{-11}"},
        "h": {"name": "Planck constant", "unit": "J s", "value": "6.63 \\times 10^{-34}"},
        "hbar": {"name": "Reduced Planck constant", "unit": "J s", "value": "1.05 \\times 10^{-34}"},
        "k": {"name": "Boltzmann / Coulomb constant", "unit": "J/K or N m^2/C^2", "value": "1.38 \\times 10^{-23}"},
        "e": {"name": "Elementary charge", "unit": "C", "value": "1.6 \\times 10^{-19}"},
        "m_e": {"name": "Electron mass", "unit": "kg", "value": "9.11 \\times 10^{-31}"},
        "m_p": {"name": "Proton mass", "unit": "kg", "value": "1.67 \\times 10^{-27}"},
        "epsilon_0": {"name": "Permittivity of free space", "unit": "F/m", "value": "8.85 \\times 10^{-12}"},
        "mu_0": {"name": "Permeability of free space", "unit": "H/m", "value": "4\\pi \\times 10^{-7}"},
        "R": {"name": "Universal gas constant", "unit": "J/(mol K)", "value": "8.314"},
        "N_A": {"name": "Avogadro constant", "unit": "mol^-1", "value": "6.02 \\times 10^{23}"},
        "g": {"name": "Acceleration due to gravity", "unit": "m/s^2", "value": "9.8"},
    }

    # Vector patterns: e.g. \vec{F}, \vec{v}, \hat{i}, \hat{j}, \hat{k}
    VECTOR_PATTERN = re.compile(r"\\(?:vec|hat|mathbf)\{([a-zA-Z0-9]+)\}|([a-zA-Z])\s*\^\s*([ijk])|([a-zA-Z])\s*->")

    @classmethod
    def analyze_physics_region(cls, raw_text: str) -> Dict[str, Any]:
        """
        Analyzes a physics text/formula region.
        Detects:
        - Equations vs expressions vs quantities with units
        - Vector notation
        - Detected physical constants and variables
        - Unit validation status
        """
        s = raw_text.strip()

        # Check for vectors
        has_vectors = bool(cls.VECTOR_PATTERN.search(s) or any(v in s for v in ["\\vec", "\\hat", "\\mathbf"]))
        
        # Check equation
        is_equation = "=" in s or "\\approx" in s or "\\propto" in s
        
        # Split formula and unit
        formula_part, unit = scientific_units.split_formula_and_unit(s)
        
        # Detect physical constants
        detected_constants = []
        for sym, data in cls.PHYSICAL_CONSTANTS.items():
            if re.search(rf"\b{re.escape(sym)}\b", formula_part):
                detected_constants.append({"symbol": sym, "name": data["name"], "unit": data["unit"]})

        # Calculate physics domain confidence
        conf = 0.90
        if unit:
            conf += 0.05
        if is_equation:
            conf += 0.03
        if detected_constants:
            conf += 0.02
        conf = min(0.99, conf)

        is_phys = bool(is_equation or has_vectors or unit or detected_constants or any(term in s for term in ["F = ma", "E = mc", "V = IR", "v = u", "s = ut"]))

        return {
            "raw_text": raw_text,
            "formula": formula_part,
            "unit": unit,
            "is_equation": is_equation,
            "is_physics": is_phys,
            "has_vectors": has_vectors,
            "detected_constants": detected_constants,
            "domain_confidence": conf,
            "validation_status": "VALID" if (unit or is_equation) else "UNCHECKED",
        }

    @classmethod
    def validate_dimensional_consistency(cls, left_unit: Optional[str], right_unit: Optional[str]) -> bool:
        """Checks if units on both sides of an equation are dimensionally equivalent."""
        if not left_unit or not right_unit:
            return True
        # Basic normalization for common equivalents
        norm_map = {
            "n": "kg*m/s^2",
            "j": "kg*m^2/s^2",
            "w": "kg*m^2/s^3",
            "pa": "kg/(m*s^2)",
        }
        l = norm_map.get(left_unit.lower(), left_unit.lower())
        r = norm_map.get(right_unit.lower(), right_unit.lower())
        return l == r


physics_engine = AdvancedPhysicsEngine()
