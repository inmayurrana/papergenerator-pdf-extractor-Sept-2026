"""
Scientific Units Recognizer & Normalizer
Recognizes, validates, and normalizes standard SI base and derived scientific units,
compound units, negative powers, Greek prefixes, and avoids OCR confusion
(e.g., distinguishing unit 'g' from '9', 'q', '6').
"""

import re
from typing import Optional, Tuple, Dict, Any, Set


class ScientificUnitRecognizer:
    # Standard SI Base and Derived Units
    BASE_UNITS: Set[str] = {
        "m", "s", "kg", "g", "mg", "A", "K", "mol", "cd"
    }

    DERIVED_UNITS: Set[str] = {
        "N", "J", "W", "Pa", "Hz", "V", "C", "F", "Ω", "ohm", "Wb", "T", "H",
        "lm", "lx", "Bq", "Gy", "Sv", "kat", "bar", "atm", "cal", "kcal",
        "eV", "MeV", "GeV", "keV", "L", "l", "mL", "ml", "u", "amu", "dB"
    }

    TIME_UNITS: Set[str] = {
        "s", "ms", "μs", "us", "ns", "min", "h", "hr", "hrs", "day", "days", "yr", "year"
    }

    LENGTH_UNITS: Set[str] = {
        "m", "cm", "mm", "km", "μm", "um", "nm", "pm", "Å", "angstrom"
    }

    COMPOUND_UNITS: Set[str] = {
        "m/s", "m/s^2", "m/s2", "ms^-1", "ms^-2", "m s^-1", "m s^-2",
        "km/h", "km/hr", "km h^-1",
        "cm/s", "cm/s^2", "cm s^-1",
        "kg/m^3", "g/cm^3", "kg m^-3", "g cm^-3",
        "N m", "N*m", "N/m", "N m^-1",
        "J/s", "J s", "J*s",
        "kg m/s", "kg m s^-1",
        "kg m^2/s^2", "kg m^2 s^-2",
        "W/m^2", "W m^-2",
        "V/m", "V m^-1",
        "A/m", "A m^-1",
        "C/m^2", "C m^-2",
        "rad/s", "rad/s^2",
        "kg wt", "kg wt.", "g wt", "g wt.", "N s"
    }

    PREFIXES: Dict[str, str] = {
        "Y": "yotta", "Z": "zetta", "E": "exa", "P": "peta", "T": "tera",
        "G": "giga", "M": "mega", "k": "kilo", "h": "hecto", "da": "deca",
        "d": "deci", "c": "centi", "m": "milli", "μ": "micro", "u": "micro",
        "n": "nano", "p": "pico", "f": "femto", "a": "atto"
    }

    # Regex matching units at the end of a scientific / numerical expression
    # Carefully anchored to prevent matching ordinary letters inside words
    UNIT_SUFFIX_PATTERN = re.compile(
        r"(?:(?<=\d)|(?<=\})|(?<=\))|(?<=\s))\s*"
        r"("
        r"kg\s*wt\.?|g\s*wt\.?|"
        r"m/s\^?2|m/s|ms\^?-?[12]|km/h|km/hr|"
        r"cm/s\^?2|cm/s|"
        r"kg/m\^?3|g/cm\^?3|"
        r"cm\^?[23]|m\^?[23]|mm\^?[23]|"
        r"m/s\^2|m/s|"
        r"[kMGT]?Hz|[kMGT]?W|[kMGT]?J|[kMGT]?N|[kMGT]?Pa|"
        r"[kMGT]?V|[mμu]?A|[kM]?Ω|[kM]?ohm|"
        r"eV|keV|MeV|GeV|"
        r"mol|mmol|kmol|"
        r"kg|mg|μg|ug|(?<![a-zA-Z])g(?![a-zA-Z])|"
        r"km|cm|mm|μm|um|nm|(?<![a-zA-Z])m(?![a-zA-Z])|"
        r"ms|μs|us|ns|min|hrs?|(?<![a-zA-Z])s(?![a-zA-Z])|"
        r"rad|deg|°C|°F|K|(?<![a-zA-Z])°"
        r")\s*$",
        re.IGNORECASE
    )

    @classmethod
    def is_valid_unit(cls, candidate: str) -> bool:
        """Checks whether candidate string is a recognized scientific unit."""
        if not candidate:
            return False
        c = candidate.strip().rstrip(".")
        if c in cls.BASE_UNITS or c in cls.DERIVED_UNITS or c in cls.TIME_UNITS or c in cls.LENGTH_UNITS:
            return True
        if c in cls.COMPOUND_UNITS or c.lower() in [u.lower() for u in cls.COMPOUND_UNITS]:
            return True
        return False

    @classmethod
    def split_formula_and_unit(cls, expression: str) -> Tuple[str, Optional[str]]:
        """
        Extracts the mathematical formula component and scientific unit component.
        Example: '10\\sqrt{3} g' -> ('10\\sqrt{3}', 'g')
        Example: '\\sqrt{3} m/s^2' -> ('\\sqrt{3}', 'm/s^2')
        Example: '20 m/s^2' -> ('20', 'm/s^2')
        Example: '0.10 g' -> ('0.10', 'g')
        """
        if not expression:
            return "", None

        s = expression.strip()

        # If this is a purely algebraic equation without numbers (e.g. F = ma, E = mc^2, v = u + at),
        # do not treat the RHS variables as units.
        if "=" in s and not re.search(r"\d", s):
            return s, None

        # Check for trailing unit match
        m = cls.UNIT_SUFFIX_PATTERN.search(s)
        if m:
            unit = m.group(1).strip()
            formula_part = s[:m.start()].strip()
            # Verify formula part has some content and does not end with '=' or an operator
            if formula_part and not formula_part.endswith(("=", "+", "-", "*", "/", "<", ">")):
                return formula_part, unit

        # Fallback: check last whitespace-separated token
        parts = s.split()
        if len(parts) >= 2:
            last = parts[-1].strip().rstrip(".")
            if cls.is_valid_unit(last):
                return " ".join(parts[:-1]).strip(), last

        return s, None

    @classmethod
    def format_latex_with_unit(cls, formula: str, unit: Optional[str]) -> str:
        """Combines formula and unit into clean educational LaTeX."""
        if not unit:
            return formula

        clean_formula = formula.strip()
        # Clean existing $ tags
        clean_formula = clean_formula.replace("$", "").strip()

        # Format unit: use \mathrm{...}
        u = unit.strip()
        if "/" in u:
            # e.g. m/s^2 -> \mathrm{m/s^2}
            u_latex = f"\\mathrm{{{u}}}"
        elif u == "°":
            u_latex = "^\\circ"
        elif u.startswith("°"):
            u_latex = f"^\\circ\\mathrm{{{u[1:]}}}"
        elif u in ("Ω", "ohm"):
            u_latex = "\\Omega"
        elif u.startswith("μ"):
            u_latex = f"\\mu\\mathrm{{{u[1:]}}}"
        else:
            u_latex = f"\\mathrm{{{u}}}"

        # Combine: $10\sqrt{3}\,\mathrm{g}$
        return f"${clean_formula}\\,{u_latex}$"


scientific_units = ScientificUnitRecognizer()
