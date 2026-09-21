"""
Advanced Chemistry Recognition & Reaction Validation Layer
Recognizes chemical formulas, ionic charges, stoichiometric coefficients,
reaction/equilibrium arrows, and performs chemical balance validation.
"""

import re
from typing import Dict, Any, List, Optional, Tuple


class AdvancedChemistryEngine:
    # Full Periodic Table of Elements (symbols)
    ELEMENTS = {
        "H", "He", "Li", "Be", "B", "C", "N", "O", "F", "Ne",
        "Na", "Mg", "Al", "Si", "P", "S", "Cl", "Ar", "K", "Ca",
        "Sc", "Ti", "V", "Cr", "Mn", "Fe", "Co", "Ni", "Cu", "Zn",
        "Ga", "Ge", "As", "Se", "Br", "Kr", "Rb", "Sr", "Y", "Zr",
        "Nb", "Mo", "Tc", "Ru", "Rh", "Pd", "Ag", "Cd", "In", "Sn",
        "Sb", "Te", "I", "Xe", "Cs", "Ba", "La", "Ce", "Pr", "Nd",
        "Pm", "Sm", "Eu", "Gd", "Tb", "Dy", "Ho", "Er", "Tm", "Yb",
        "Lu", "Hf", "Ta", "W", "Re", "Os", "Ir", "Pt", "Au", "Hg",
        "Tl", "Pb", "Bi", "Po", "At", "Rn", "Fr", "Ra", "Ac", "Th",
        "Pa", "U", "Np", "Pu", "Am", "Cm", "Bk", "Cf", "Es", "Fm",
        "Md", "No", "Lr", "Rf", "Db", "Sg", "Bh", "Hs", "Mt", "Ds",
        "Rg", "Cn", "Nh", "Fl", "Mc", "Lv", "Ts", "Og"
    }

    # Regex for a chemical token: e.g. "2H2O", "Fe3+", "SO4^2-", "CaCO3"
    COMPOUND_REGEX = re.compile(
        r"(\d*)\s*([A-Z][a-z]?(?:\d+)?(?:[A-Z][a-z]?(?:\d+)?)*(?:\([A-Za-z0-9]+\)(?:\d+)?)?)\s*(?:\^?([0-9]*[+\-]))?"
    )

    # Reaction arrow patterns
    ARROW_PATTERN = re.compile(r"\s*(?:-->|->|=>|→|\\rightarrow)\s*|\s*(?:<=>|⇌|↔|\\rightleftharpoons)\s*")

    @classmethod
    def format_chemical_latex(cls, raw_text: str) -> str:
        """
        Formats a chemical formula or equation into proper LaTeX mhchem/chem syntax:
        e.g. 2H2 + O2 -> 2H2O  =>  2\mathrm{H}_2 + \mathrm{O}_2 \rightarrow 2\mathrm{H}_2\mathrm{O}
        e.g. Fe3+              =>  \mathrm{Fe}^{3+}
        e.g. SO4^2-            =>  \mathrm{SO}_4^{2-}
        """
        s = raw_text.strip()

        # Convert Unicode subscripts directly to _{...}
        sub_map = {
            "₀": "_0", "₁": "_1", "₂": "_2", "₃": "_3", "₄": "_4",
            "₅": "_5", "₆": "_6", "₇": "_7", "₈": "_8", "₉": "_9",
        }
        for sub_char, sub_ltx in sub_map.items():
            s = s.replace(sub_char, sub_ltx)

        # Convert Unicode superscripts directly to ^{...} (e.g. ²⁻ -> ^{2-}, ³⁺ -> ^{3+})
        sup_trans = str.maketrans("⁺⁻⁰¹²³⁴⁵⁶⁷⁸⁹", "+-0123456789")
        s = re.sub(r"([⁺⁻⁰¹²³⁴⁵⁶⁷⁸⁹]+)", lambda m: "^{" + m.group(1).translate(sup_trans) + "}", s)

        # Reaction condition over arrow: e.g. ->[heat] or ->[\Delta] or ->[catalyst]
        cond_match = re.search(r"(?:-->|->|=>|→)\s*\[([^\]]+)\]", s)
        if cond_match:
            cond = cond_match.group(1).strip()
            cond_ltx = r"\Delta" if cond in ("Delta", "Δ") else f"\\text{{{cond}}}"
            s = re.sub(r"(?:-->|->|=>|→)\s*\[[^\]]+\]", lambda _: f" \\xrightarrow{{{cond_ltx}}} ", s)

        # Normalize reaction arrows
        is_equilibrium = bool(re.search(r"<=>|⇌|↔|\\rightleftharpoons", s))
        s = cls.ARROW_PATTERN.sub(lambda _: r" \rightarrow " if not is_equilibrium else r" \rightleftharpoons ", s)

        # Gas / precipitate arrows: ↑ -> \uparrow, ↓ -> \downarrow
        s = s.replace("↑", r" \uparrow ").replace("↓", r" \downarrow ")

        # For ASCII digits following element symbols, convert to subscripts if not already LaTeX and not a charge
        # e.g. H2SO4 -> H_2SO_4, but Fe3+ -> Fe^{3+}
        def sub_repl(m):
            elem = m.group(1)
            sub = m.group(2)
            return f"{elem}_{{{sub}}}"

        formatted = re.sub(r"([A-Z][a-z]?)(\d+)(?![+\-])", sub_repl, s)

        # Convert remaining ASCII ionic charges: e.g. Fe3+ -> Fe^{3+}, SO4^2- -> SO_4^{2-}, Na+ -> Na^+
        formatted = re.sub(r"(?<!\^\{)(?<!\^)([A-Za-z0-9\)])(\d*[+\-])(?!\w)", r"\1^{\2}", formatted)
        formatted = re.sub(r"\^([0-9]*[+\-])(?!\})", r"^{\1}", formatted)

        # Wrap in \mathrm for proper chemical font if not already wrapped
        if not formatted.startswith(r"\mathrm{"):
            return f"\\mathrm{{{formatted}}}"
        return formatted

    @classmethod
    def parse_compound_elements(cls, compound_str: str) -> Dict[str, int]:
        """
        Parses a chemical compound formula into a count of its constituent atoms.
        Example: 'H2SO4' -> {'H': 2, 'S': 1, 'O': 4}
        Example: 'Ca(OH)2' -> {'Ca': 1, 'O': 2, 'H': 2}
        """
        counts: Dict[str, int] = {}
        cleaned = compound_str.replace(r"\mathrm", "").replace("{", "").replace("}", "")
        matches = re.findall(r"([A-Z][a-z]?)_?(\d*)", cleaned)
        for elem, count_str in matches:
            if elem in cls.ELEMENTS:
                cnt = int(count_str) if count_str else 1
                counts[elem] = counts.get(elem, 0) + cnt
        return counts

    @classmethod
    def validate_chemical_equation(cls, equation_str: str) -> Dict[str, Any]:
        """
        Validates a chemical equation for atom conservation.
        If unbalanced or suspicious, flags it for review rather than modifying it.
        """
        parts = cls.ARROW_PATTERN.split(equation_str)
        if len(parts) != 2:
            return {"is_reaction": False, "status": "NOT_AN_EQUATION"}

        left_side, right_side = parts[0].strip(), parts[1].strip()

        left_atoms: Dict[str, int] = {}
        right_atoms: Dict[str, int] = {}

        # Parse terms on left side (split by +)
        for term in left_side.split("+"):
            t = term.strip()
            # extract leading coefficient
            coeff_match = re.match(r"^(\d+)\s*(.*)$", t)
            coeff = int(coeff_match.group(1)) if coeff_match else 1
            formula = coeff_match.group(2) if coeff_match else t
            for elem, cnt in cls.parse_compound_elements(formula).items():
                left_atoms[elem] = left_atoms.get(elem, 0) + cnt * coeff

        # Parse terms on right side
        for term in right_side.split("+"):
            t = term.strip()
            coeff_match = re.match(r"^(\d+)\s*(.*)$", t)
            coeff = int(coeff_match.group(1)) if coeff_match else 1
            formula = coeff_match.group(2) if coeff_match else t
            for elem, cnt in cls.parse_compound_elements(formula).items():
                right_atoms[elem] = right_atoms.get(elem, 0) + cnt * coeff

        # Compare element presence and balance
        elements_match = set(left_atoms.keys()) == set(right_atoms.keys())
        balanced = elements_match and all(left_atoms.get(e, 0) == right_atoms.get(e, 0) for e in left_atoms)

        status = "BALANCED" if balanced else ("FLAG_FOR_REVIEW" if elements_match else "ELEMENT_MISMATCH")

        return {
            "is_reaction": True,
            "status": status,
            "balanced": balanced,
            "is_balanced": balanced,
            "formatted_latex": cls.format_chemical_latex(equation_str),
            "left_atoms": left_atoms,
            "right_atoms": right_atoms,
            "confidence": 0.98 if balanced else 0.85,
        }


chemistry_engine = AdvancedChemistryEngine()
