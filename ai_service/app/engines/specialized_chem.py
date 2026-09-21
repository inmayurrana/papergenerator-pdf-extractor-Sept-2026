import re
from typing import Dict, Any

class SpecializedChemEngine:
    PERIODIC_TABLE = {
        "H", "He", "Li", "Be", "B", "C", "N", "O", "F", "Ne",
        "Na", "Mg", "Al", "Si", "P", "S", "Cl", "Ar", "K", "Ca",
        "Sc", "Ti", "V", "Cr", "Mn", "Fe", "Co", "Ni", "Cu", "Zn",
        "Ga", "Ge", "As", "Se", "Br", "Kr", "Rb", "Sr", "Ag", "Sn",
        "I", "Xe", "Cs", "Ba", "Au", "Hg", "Pb", "Bi", "U"
    }

    @staticmethod
    def normalize_chemical_formula(raw_text: str) -> Dict[str, Any]:
        """Normalizes molecular formulas, ionic charges, and chemical reaction equations."""
        chem_str = raw_text.strip()

        # Reaction arrows: ->, -->, => to \rightarrow
        chem_str = re.sub(r"\s*(?:-->|->|=>|→)\s*", r" \\rightarrow ", chem_str)
        chem_str = re.sub(r"\s*(?:<=>|⇌|↔)\s*", r" \\rightleftharpoons ", chem_str)

        # Convert standard molecular numbers to LaTeX subscripts if not already LaTeX
        # e.g., H2SO4 -> H_{2}SO_{4}
        def sub_repl(m):
            elem = m.group(1)
            num = m.group(2)
            return f"{elem}_{{{num}}}"

        formatted = re.sub(r"([A-Z][a-z]?)(\d+)", sub_repl, chem_str)

        # Convert ionic charges (e.g. Fe3+, SO4 2-, Cl-)
        # Fe3+ -> Fe^{3+}
        formatted = re.sub(r"([A-Za-z\d\}])(\d*[+\-])", r"\1^{\2}", formatted)

        # Periodic elements check
        detected_elements = re.findall(r"([A-Z][a-z]?)", chem_str)
        valid_elements = [e for e in detected_elements if e in SpecializedChemEngine.PERIODIC_TABLE]
        element_match_ratio = len(valid_elements) / max(len(detected_elements), 1)

        return {
            "raw_text": raw_text,
            "latex": f"\\ce{{{chem_str}}}" if "ce{" not in chem_str else chem_str,
            "formatted_formula": formatted,
            "detected_elements": valid_elements,
            "confidence": 0.95 if element_match_ratio > 0.8 else 0.85,
            "is_reaction": "\\rightarrow" in chem_str or "\\rightleftharpoons" in chem_str,
        }

specialized_chem = SpecializedChemEngine()
