"""
Scientific Formula Lexical Scanner & Tokenizer
Transforms natural math, physics, chemistry, and biology expressions into a strongly typed token stream.
"""

import re
from typing import List, Dict, Any, Optional
from enum import Enum
from dataclasses import dataclass


class TokenType(str, Enum):
    NUMBER = "NUMBER"
    SYMBOL = "SYMBOL"
    GREEK_SYMBOL = "GREEK_SYMBOL"
    CHEMICAL_ELEMENT = "CHEMICAL_ELEMENT"
    CHARGE = "CHARGE"
    OPERATOR = "OPERATOR"
    FUNCTION = "FUNCTION"
    UNIT = "UNIT"
    SUPERSCRIPT = "SUPERSCRIPT"
    SUBSCRIPT = "SUBSCRIPT"
    FRACTION = "FRACTION"
    RADICAL = "RADICAL"
    BRACKET = "BRACKET"
    ARROW = "ARROW"
    BIOLOGY_TOKEN = "BIOLOGY_TOKEN"
    WHITESPACE = "WHITESPACE"
    UNKNOWN = "UNKNOWN"


@dataclass
class FormulaToken:
    type: TokenType
    value: str
    original: str
    start_pos: int
    end_pos: int
    metadata: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": self.type.value,
            "value": self.value,
            "original": self.original,
            "span": [self.start_pos, self.end_pos],
            "metadata": self.metadata or {}
        }


class FormulaTokenizer:
    # 118 Chemical Element symbols
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

    GREEK_CHARS = {
        "α": "alpha", "β": "beta", "γ": "gamma", "δ": "delta",
        "ε": "epsilon", "ϵ": "varepsilon", "ζ": "zeta", "η": "eta",
        "θ": "theta", "ϑ": "vartheta", "ι": "iota", "κ": "kappa",
        "λ": "lambda", "μ": "mu", "µ": "mu", "ν": "nu", "ξ": "xi",
        "π": "pi", "ϖ": "varpi", "ρ": "rho", "ϱ": "varrho",
        "σ": "sigma", "ς": "varsigma", "τ": "tau", "υ": "upsilon",
        "φ": "phi", "ϕ": "varphi", "χ": "chi", "ψ": "psi", "ω": "omega",
        "Γ": "Gamma", "Δ": "Delta", "Θ": "Theta", "Λ": "Lambda",
        "Ξ": "Xi", "Π": "Pi", "Σ": "Sigma", "Υ": "Upsilon",
        "Φ": "Phi", "Ψ": "Psi", "Ω": "Omega"
    }

    TRIG_FUNCS = {"sin", "cos", "tan", "cot", "sec", "csc", "cosec", "log", "ln", "exp", "lim"}
    UNITS_SET = {
        "m/s^2", "m/s", "kg/m^3", "N/m^2", "J/s", "W/m^2", "C/s", "V/m", "m s^-2", "s^-1",
        "cm^3", "cm^2", "m^3", "m^2", "mm^3", "mm^2",
        "kg", "mg", "g", "m", "cm", "mm", "km", "μm", "nm",
        "s", "sec", "min", "h", "hr",
        "N", "Pa", "J", "W", "C", "V", "F", "Ω", "ohm", "Hz", "T", "Wb", "H", "A", "K", "mol", "cd",
        "eV", "cal", "kcal", "atm", "bar", "L", "mL", "μL", "μM", "mM", "M"
    }
    BIOLOGY_TERMS = {"DNA", "RNA", "mRNA", "tRNA", "rRNA", "ATP", "ADP", "NAD+", "NADH", "FAD", "FADH2", "5'", "3'", "5′", "3′", "♂", "♀"}

    @classmethod
    def tokenize(cls, text: str, domain_hint: str = "AUTO") -> List[FormulaToken]:
        """
        Tokenizes an expression string into typed tokens.
        """
        if not text:
            return []

        tokens: List[FormulaToken] = []
        pos = 0
        length = len(text)

        while pos < length:
            # 1. Skip whitespace
            if text[pos].isspace():
                start = pos
                while pos < length and text[pos].isspace():
                    pos += 1
                tokens.append(FormulaToken(TokenType.WHITESPACE, " ", text[start:pos], start, pos))
                continue

            # 2. LaTeX Radicals \sqrt[n]{...} or \sqrt{...} or Unicode √, ∛, ∜
            rad_match = re.match(r"(\\sqrt(?:\[[^\]]+\])?\{[^}]+\}|[√∛∜](?:\([^\)]+\)|[0-9a-zA-Z]+)?)", text[pos:])
            if rad_match:
                match_str = rad_match.group(1)
                tokens.append(FormulaToken(TokenType.RADICAL, match_str, match_str, pos, pos + len(match_str)))
                pos += len(match_str)
                continue

            # 3. LaTeX Fractions \frac{num}{den}
            frac_match = re.match(r"\\frac\{([^}]+)\}\{([^}]+)\}", text[pos:])
            if frac_match:
                full_str = frac_match.group(0)
                tokens.append(FormulaToken(
                    TokenType.FRACTION, full_str, full_str, pos, pos + len(full_str),
                    metadata={"numerator": frac_match.group(1), "denominator": frac_match.group(2)}
                ))
                pos += len(full_str)
                continue

            # 4. Biology special tokens (5', 3', ♂, ♀, ATP, ADP, DNA, RNA)
            bio_match = re.match(r"(5′|3′|5'|3'|♂|♀|mRNA|tRNA|rRNA|DNA|RNA|ATP|ADP|NADH|NAD\+|FADH2|FAD)(?![\w])", text[pos:])
            if bio_match:
                match_str = bio_match.group(1)
                tokens.append(FormulaToken(TokenType.BIOLOGY_TOKEN, match_str, match_str, pos, pos + len(match_str)))
                pos += len(match_str)
                continue

            # 5. Greek characters (Unicode or LaTeX \macro)
            if text[pos] in cls.GREEK_CHARS:
                char = text[pos]
                name = cls.GREEK_CHARS[char]
                tokens.append(FormulaToken(
                    TokenType.GREEK_SYMBOL, f"\\{name}", char, pos, pos + 1,
                    metadata={"name": name, "unicode": f"U+{ord(char):04X}"}
                ))
                pos += 1
                continue

            greek_macro_match = re.match(r"\\(alpha|beta|gamma|delta|epsilon|varepsilon|zeta|eta|theta|vartheta|iota|kappa|lambda|mu|nu|xi|pi|varpi|rho|varrho|sigma|varsigma|tau|upsilon|phi|varphi|chi|psi|omega|Gamma|Delta|Theta|Lambda|Xi|Pi|Sigma|Upsilon|Phi|Psi|Omega)\b", text[pos:])
            if greek_macro_match:
                full_str = greek_macro_match.group(0)
                name = greek_macro_match.group(1)
                tokens.append(FormulaToken(
                    TokenType.GREEK_SYMBOL, full_str, full_str, pos, pos + len(full_str),
                    metadata={"name": name}
                ))
                pos += len(full_str)
                continue

            # 6. Arrows (Reaction / Equilibrium / Implication)
            arrow_match = re.match(r"(⇌|↔|→|←|⇒|⇐|⇔|⟶|⟵|⟹|⟺|↑|↓|\\rightleftharpoons|\\rightarrow|\\to|\\leftarrow|\\implies|\\iff)", text[pos:])
            if arrow_match:
                match_str = arrow_match.group(1)
                tokens.append(FormulaToken(TokenType.ARROW, match_str, match_str, pos, pos + len(match_str)))
                pos += len(match_str)
                continue

            # 7. Superscript and Subscript blocks
            sup_match = re.match(r"\^(\{[^}]+\}|[0-9a-zA-Z\+\-]+|[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻ⁿⁱ]+)", text[pos:])
            if sup_match:
                full_str = sup_match.group(0)
                tokens.append(FormulaToken(TokenType.SUPERSCRIPT, full_str, full_str, pos, pos + len(full_str)))
                pos += len(full_str)
                continue

            sub_match = re.match(r"_(\{[^}]+\}|[0-9a-zA-Z\+\-]+|[₀₁₂₃₄₅₆₇₈₉₊₋ₐₑₒₓᵤᵥ]+)", text[pos:])
            if sub_match:
                full_str = sub_match.group(0)
                tokens.append(FormulaToken(TokenType.SUBSCRIPT, full_str, full_str, pos, pos + len(full_str)))
                pos += len(full_str)
                continue

            # 8. Chemical charges: e.g. 3+, 2-, +, - (when superscripted or in chemistry context)
            charge_match = re.match(r"(\d*[\+\-])\b", text[pos:])
            if charge_match and domain_hint in ("CHEMISTRY", "AUTO") and pos > 0 and (text[pos-1].isalpha() or text[pos-1] in "0123456789}"):
                match_str = charge_match.group(1)
                tokens.append(FormulaToken(TokenType.CHARGE, match_str, match_str, pos, pos + len(match_str)))
                pos += len(match_str)
                continue

            # 9. Function names (sin, cos, tan, log, ln, lim, etc.)
            func_match = re.match(r"\b(sin|cos|tan|cot|sec|csc|cosec|log|ln|exp|lim)\b", text[pos:], re.IGNORECASE)
            if func_match:
                match_str = func_match.group(1).lower()
                tokens.append(FormulaToken(TokenType.FUNCTION, f"\\{match_str}", match_str, pos, pos + len(match_str)))
                pos += len(match_str)
                continue

            # 10. Multi-character scientific units (e.g. m/s^2, kg/m^3, W/m^2, etc.)
            unit_found = False
            for u in sorted(cls.UNITS_SET, key=len, reverse=True):
                if text[pos:].startswith(u):
                    # Check boundary
                    next_idx = pos + len(u)
                    if next_idx == length or not text[next_idx].isalnum():
                        tokens.append(FormulaToken(TokenType.UNIT, u, u, pos, next_idx))
                        pos = next_idx
                        unit_found = True
                        break
            if unit_found:
                continue

            # 11. Chemical Elements (2-letter first, then 1-letter if in chemistry context or followed by digits)
            chem_match = re.match(r"([A-Z][a-z]?)(?=\d|[A-Z]|\b|[⁺⁻\+\-])", text[pos:])
            if chem_match and chem_match.group(1) in cls.ELEMENTS:
                el = chem_match.group(1)
                # Ensure it's not a common English single-letter word like 'A' or 'I' unless preceded by numbers or elements
                is_chem = (len(el) == 2 or domain_hint == "CHEMISTRY" or
                           (pos + 1 < length and text[pos+1].isdigit()) or
                           (pos > 0 and text[pos-1].isalnum() and not text[pos-1].isspace()))
                if is_chem:
                    tokens.append(FormulaToken(TokenType.CHEMICAL_ELEMENT, el, el, pos, pos + len(el)))
                    pos += len(el)
                    continue

            # 12. Numbers (integers or decimals)
            num_match = re.match(r"(\d+(?:\.\d+)?)", text[pos:])
            if num_match:
                match_str = num_match.group(1)
                tokens.append(FormulaToken(TokenType.NUMBER, match_str, match_str, pos, pos + len(match_str)))
                pos += len(match_str)
                continue

            # 13. Multi-character math operators / relations
            op_match = re.match(r"(\\times|\\cdot|\\pm|\\mp|\\div|\\leq|\\geq|\\le|\\ge|\\neq|\\ne|\\approx|\\propto|\\sim|\\equiv|<=|>=|!=|==|\+-|±|∓|×|÷|·|∙|≤|≥|≠|≈|∝|∼|≡|\+|-|\*|/|=|<|>|%)", text[pos:])
            if op_match:
                match_str = op_match.group(1)
                tokens.append(FormulaToken(TokenType.OPERATOR, match_str, match_str, pos, pos + len(match_str)))
                pos += len(match_str)
                continue

            # 14. Brackets and Delimiters
            if text[pos] in "()[]{}|":
                tokens.append(FormulaToken(TokenType.BRACKET, text[pos], text[pos], pos, pos + 1))
                pos += 1
                continue

            # 15. Single letter variable / identifier
            if text[pos].isalpha():
                tokens.append(FormulaToken(TokenType.SYMBOL, text[pos], text[pos], pos, pos + 1))
                pos += 1
                continue

            # 16. Fallback
            tokens.append(FormulaToken(TokenType.UNKNOWN, text[pos], text[pos], pos, pos + 1))
            pos += 1

        # Remove trailing/extra whitespace tokens if needed, but keep token positions intact
        return tokens


formula_tokenizer = FormulaTokenizer()
