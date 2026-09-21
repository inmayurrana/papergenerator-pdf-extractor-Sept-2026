import re
import json
import os
from pathlib import Path
from typing import Dict, Any, Optional
import sympy

class SpecializedMathEngine:
    # Full Greek alphabet: Unicode characters & spoken words to standard LaTeX
    GREEK_CHAR_MAP = {
        # Lowercase Greek
        "α": r"\alpha", "β": r"\beta", "γ": r"\gamma", "δ": r"\delta",
        "ε": r"\epsilon", "ϵ": r"\varepsilon", "ζ": r"\zeta", "η": r"\eta",
        "θ": r"\theta", "ϑ": r"\vartheta", "ι": r"\iota", "κ": r"\kappa",
        "λ": r"\lambda", "μ": r"\mu", "ν": r"\nu", "ξ": r"\xi",
        "π": r"\pi", "ϖ": r"\varpi", "ρ": r"\rho", "ϱ": r"\varrho",
        "σ": r"\sigma", "ς": r"\varsigma", "τ": r"\tau", "υ": r"\upsilon",
        "φ": r"\phi", "ϕ": r"\varphi", "χ": r"\chi", "ψ": r"\psi", "ω": r"\omega",
        # Uppercase Greek
        "Γ": r"\Gamma", "Δ": r"\Delta", "Θ": r"\Theta", "Λ": r"\Lambda",
        "Ξ": r"\Xi", "Π": r"\Pi", "Σ": r"\Sigma", "Υ": r"\Upsilon",
        "Φ": r"\Phi", "Ψ": r"\Psi", "Ω": r"\Omega",
    }

    GREEK_WORD_MAP = {
        r"(?<!\\)\balpha\b": r"\alpha", r"(?<!\\)\bbeta\b": r"\beta", r"(?<!\\)\bgamma\b": r"\gamma", r"(?<!\\)\bdelta\b": r"\delta",
        r"(?<!\\)\btheta\b": r"\theta", r"(?<!\\)\bthita\b": r"\theta", r"\\thita\b": r"\theta",
        r"(?<!\\)\bTheta\b": r"\Theta", r"(?<!\\)\bThita\b": r"\Theta", r"\\Thita\b": r"\Theta",
        r"(?<!\\)\blambda\b": r"\lambda", r"(?<!\\)\bmu\b": r"\mu", r"(?<!\\)\bpi\b": r"\pi",
        r"(?<!\\)\bsigma\b": r"\sigma", r"(?<!\\)\bomega\b": r"\omega", r"(?<!\\)\bDelta\b": r"\Delta", r"(?<!\\)\bOmega\b": r"\Omega",
        r"(?<!\\)\bphi\b": r"\phi", r"(?<!\\)\bpsi\b": r"\psi", r"(?<!\\)\bepsilon\b": r"\epsilon", r"(?<!\\)\binfty\b": r"\infty",
    }

    MATH_SYMBOL_MAP = {
        # Operators & Relations
        "±": r"\pm ", "∓": r"\mp ", "×": r"\times ", "✕": r"\times ", "✖": r"\times ",
        "÷": r"\div ", "·": r"\cdot ", "•": r"\cdot ", "∙": r"\cdot ",
        "≠": r"\neq ", "≤": r"\le ", "⩽": r"\le ", "≥": r"\ge ", "⩾": r"\ge ",
        "≈": r"\approx ", "≃": r"\simeq ", "≅": r"\cong ", "≡": r"\equiv ",
        "∞": r"\infty ", "∝": r"\propto ", "∼": r"\sim ",
        # Calculus & Advanced
        "∂": r"\partial ", "∇": r"\nabla ", "∫": r"\int ", "∬": r"\iint ", "∭": r"\iiint ", "∮": r"\oint ",
        "∑": r"\sum ", "∏": r"\prod ",
        # Set Theory & Logic
        "∈": r"\in ", "∉": r"\notin ", "∋": r"\ni ",
        "⊂": r"\subset ", "⊃": r"\supset ", "⊆": r"\subseteq ", "⊇": r"\supseteq ",
        "∪": r"\cup ", "∩": r"\cap ", "∅": r"\emptyset ", "Ø": r"\emptyset ",
        "∀": r"\forall ", "∃": r"\exists ", "∄": r"\nexists ",
        "∴": r"\therefore ", "∵": r"\because ",
        # Geometry & Vectors
        "⊥": r"\perp ", "∥": r"\parallel ", "∠": r"\angle ", "°": r"^\circ ",
        "△": r"\triangle ", "▲": r"\triangle ",
        # Arrows
        "→": r"\to ", "⟶": r"\to ", "←": r"\leftarrow ", "⟵": r"\leftarrow ",
        "⇒": r"\implies ", "⇔": r"\iff ", "↔": r"\leftrightarrow ",
        # Physics & Chemistry Special Symbols
        "ℏ": r"\hbar ", "Å": r"\text{\AA} ", "⇌": r"\rightleftharpoons ",
        "rightleftharpoons": r"\rightleftharpoons ",
        # Number Sets
        "ℝ": r"\mathbb{R}", "ℂ": r"\mathbb{C}", "ℕ": r"\mathbb{N}",
        "ℤ": r"\mathbb{Z}", "ℚ": r"\mathbb{Q}",
    }

    VULGAR_FRACTIONS = {
        "½": r"\frac{1}{2}", "⅓": r"\frac{1}{3}", "⅔": r"\frac{2}{3}",
        "¼": r"\frac{1}{4}", "¾": r"\frac{3}{4}", "⅕": r"\frac{1}{5}",
        "⅖": r"\frac{2}{5}", "⅗": r"\frac{3}{5}", "⅘": r"\frac{4}{5}",
        "⅙": r"\frac{1}{6}", "⅚": r"\frac{5}{6}", "⅛": r"\frac{1}{8}",
        "⅜": r"\frac{3}{8}", "⅝": r"\frac{5}{8}", "⅞": r"\frac{7}{8}",
    }

    @classmethod
    def _load_symbol_database(cls):
        """Loads extended symbols from data/math_science_symbols.json if present."""
        try:
            db_path = Path(__file__).resolve().parent.parent / "data" / "math_science_symbols.json"
            if db_path.exists():
                with open(db_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    categories = data.get("categories", {})
                    for cat_name, cat_items in categories.items():
                        for sym, info in cat_items.items():
                            ltx = info.get("latex", "")
                            # Only map true Unicode / non-ASCII mathematical symbols (never ASCII alphabet characters like c, e, h)
                            if len(sym) == 1 and not sym.isascii() and sym not in cls.GREEK_CHAR_MAP and sym not in cls.MATH_SYMBOL_MAP:
                                cls.MATH_SYMBOL_MAP[sym] = f"{ltx} "
        except Exception:
            pass

    @classmethod
    def normalize_math_to_latex(cls, raw_text: str) -> Dict[str, Any]:
        """
        Converts mathematical text, Greek letters, fractions, superscripts,
        subscripts, roots, and equations into clean, standardized LaTeX syntax.
        """
        latex_str = raw_text.strip()
        if not latex_str:
            return {"raw_text": "", "latex": "", "is_valid_syntax": True, "confidence": 1.0}

        # Strip existing outer $ delimiters during transformation
        is_display = latex_str.startswith("$$") and latex_str.endswith("$$")
        is_inline = not is_display and latex_str.startswith("$") and latex_str.endswith("$")
        if is_display:
            latex_str = latex_str[2:-2].strip()
        elif is_inline:
            latex_str = latex_str[1:-1].strip()

        # Clean \thita typos and legacy spellings
        latex_str = re.sub(r"\\thita\b", r"\\theta", latex_str, flags=re.IGNORECASE)
        latex_str = re.sub(r"\\Thita\b", r"\\Theta", latex_str)

        # Normalize trig functions with theta/thita/OCR zero/Symbol font q in formulas
        latex_str = re.sub(r"\b(sin|cos|tan|cot|sec|csc|cosec)\s*(?:\\?theta|\\?thita|θ|ϑ|q)\b", r"\\\1 \\theta", latex_str, flags=re.IGNORECASE)
        latex_str = re.sub(r"\b(sin|cos|tan|cot|sec|csc|cosec)[θq]\b", r"\\\1 \\theta", latex_str, flags=re.IGNORECASE)
        latex_str = re.sub(r"\b(sin|cos|tan|cot|sec|csc|cosec)\s*0\b", r"\\\1 \\theta", latex_str, flags=re.IGNORECASE)

        # Apply Greek word map to standardize words to LaTeX macros
        for word_pat, ltx in cls.GREEK_WORD_MAP.items():
            latex_str = re.sub(word_pat, lambda _, r=ltx: r, latex_str)

        # 1. Unicode Greek characters to LaTeX (\pi, \theta, \alpha, etc.)
        for char, ltx in cls.GREEK_CHAR_MAP.items():
            if char in latex_str:
                latex_str = latex_str.replace(char, f"{ltx} ")

        # 2. Unicode Vulgar Fractions
        for frac, ltx in cls.VULGAR_FRACTIONS.items():
            if frac in latex_str:
                latex_str = latex_str.replace(frac, ltx)

        # 3. Unicode Math Operators & Relations
        for sym, ltx in cls.MATH_SYMBOL_MAP.items():
            if sym in latex_str:
                latex_str = latex_str.replace(sym, ltx)

        # 4. Unicode superscripts to LaTeX ^
        sup_map = str.maketrans("⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿⁱˣʸ", "0123456789+-=()nixy")
        latex_str = re.sub(r"([a-zA-Z0-9\)])([⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿⁱˣʸ]+)", lambda m: f"{m.group(1)}^{{{m.group(2).translate(sup_map)}}}", latex_str)

        # 5. Unicode subscripts to LaTeX _
        sub_map = str.maketrans("₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎ₐₑₒₓᵤᵥ", "0123456789+-=()aeoxuv")
        latex_str = re.sub(r"([a-zA-Z0-9\)])([₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎ₐₑₒₓᵤᵥ]+)", lambda m: f"{m.group(1)}_{{{m.group(2).translate(sub_map)}}}", latex_str)

        # 6. Roots: ∜, ∛, √, sqrt(...)
        latex_str = re.sub(r"∜\(([^)]+)\)", r"\\sqrt[4]{\1}", latex_str)
        latex_str = re.sub(r"∜([a-zA-Z0-9]+)", r"\\sqrt[4]{\1}", latex_str)
        latex_str = re.sub(r"∛\(([^)]+)\)", r"\\sqrt[3]{\1}", latex_str)
        latex_str = re.sub(r"∛([a-zA-Z0-9]+)", r"\\sqrt[3]{\1}", latex_str)
        latex_str = re.sub(r"(?:√|sqrt)\(([^)]+)\)", r"\\sqrt{\1}", latex_str, flags=re.IGNORECASE)
        latex_str = re.sub(r"√([a-zA-Z0-9]+)", r"\\sqrt{\1}", latex_str)

        # 7. Common ASCII operators and notations
        latex_str = re.sub(r"\b([0-9]+(?:\.[0-9]+)?)\s*x\s*10\^?([-\+]?[0-9]+)", r"\1 \\times 10^{\2}", latex_str)
        latex_str = re.sub(r"\b(\d+)\s*\*\s*(\d+)", r"\1 \\times \2", latex_str)
        latex_str = re.sub(r"(?<=\d|\))\s*\+-\s*(?=\d|\w|\\)", r"\\pm ", latex_str)
        latex_str = latex_str.replace("+-", r"\pm ")

        # 8. Fractions: (a)/(b) or (a)/b -> \frac{a}{b}
        latex_str = re.sub(r"\(([^)]+)\)\s*/\s*\(([^)]+)\)", r"\\frac{\1}{\2}", latex_str)
        latex_str = re.sub(r"\(([^)]+)\)\s*/\s*([a-zA-Z0-9]+)", r"\\frac{\1}{\2}", latex_str)
        latex_str = re.sub(r"([a-zA-Z0-9]+)\s*/\s*\(([^)]+)\)", r"\\frac{\1}{\2}", latex_str)

        # Clean redundant double spaces
        latex_str = re.sub(r"[ \t]+", " ", latex_str).strip()

        # Sympy syntax validation
        is_valid = True
        validation_error = None
        try:
            sympy_expr = latex_str.replace("^", "**").replace("\\frac", "").replace("{", "(").replace("}", ")")
            for greek in cls.GREEK_CHAR_MAP.values():
                sympy_expr = sympy_expr.replace(greek, "x")
            # Always pass evaluate=False to prevent computing astronomical exponent towers (e.g. 8**6**4**2)
            sympy.sympify(sympy_expr, evaluate=False)
        except Exception as e:
            validation_error = str(e)

        delimiter = "$$" if is_display else "$"
        formatted_latex = f"{delimiter}{latex_str}{delimiter}"

        return {
            "raw_text": raw_text,
            "latex": formatted_latex,
            "is_valid_syntax": is_valid,
            "confidence": 0.96 if is_valid else 0.88,
            "validation_note": validation_error,
        }

    SUPERSCRIPT_MAP = {
        "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4",
        "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9",
        "⁺": "+", "⁻": "-", "⁼": "=", "⁽": "(", "⁾": ")",
        "ⁿ": "n", "ⁱ": "i", "ˣ": "x", "ʸ": "y"
    }

    SUBSCRIPT_MAP = {
        "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4",
        "₅": "5", "₆": "6", "₇": "7", "₈": "8", "₉": "9",
        "₊": "+", "₋": "-", "₌": "=", "₍": "(", "₎": ")",
        "ₐ": "a", "ₑ": "e", "ₒ": "o", "ₓ": "x", "ᵤ": "u", "ᵥ": "v",
        "ₙ": "n", "ᵢ": "i", "ⱼ": "j", "ₖ": "k", "ₗ": "l", "ₘ": "m",
        "ₚ": "p", "ₛ": "s", "ₜ": "t"
    }

    @classmethod
    def convert_embedded_math(cls, text: str) -> str:
        """
        Scans natural educational text and converts embedded mathematical formulas,
        Greek symbols (pi, theta, etc.), powers, and equations into LaTeX $...$ blocks
        while preserving English words, spacing, and sentence punctuation intact.
        """
        if not text:
            return ""

        # Normalize Unicode minus and dashes in formulas
        s = text.replace("−", "-").replace("–", "-")

        # 0. Protect already bracketed LaTeX formulas FIRST to prevent double-encoding
        placeholders = {}
        def repl_protect(m):
            key = f"__EXACTMATH_{len(placeholders)}__"
            placeholders[key] = m.group(0)
            return key

        s = re.sub(r"\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$|\\\[[\s\S]*?\\\]|\\\([^\)]+?\\\)", repl_protect, s)

        # Sanitize any \thita in existing LaTeX equations
        for k in list(placeholders.keys()):
            placeholders[k] = re.sub(r"\\thita\b", r"\\theta", placeholders[k], flags=re.IGNORECASE)
            placeholders[k] = re.sub(r"\\Thita\b", r"\\Theta", placeholders[k])

        # Self-healing integrity check: repair any malformed nested/slashed \frac{\frac{...}} or \frac{.../...}
        s = re.sub(r'\\frac\{\\frac\{d([A-Za-z])\s*/\s*d([A-Za-z])\}\}', r'\\frac{d\1}{d\2}', s)
        s = re.sub(r'\\frac\{\\frac\{([^}]+)\}\}', r'\\frac{\1}', s)
        s = re.sub(r'\\frac\{d([A-Za-z])\s*/\s*d([A-Za-z])\}', r'\\frac{d\1}{d\2}', s)
        s = re.sub(r'\\frac\{([a-zA-Z0-9]+)\s*/\s*([a-zA-Z0-9]+)\}', r'\\frac{\1}{\2}', s)

        # Pre-normalize thita typos and legacy spellings in unbracketed text
        s = re.sub(r"\\thita\b", r"\\theta", s, flags=re.IGNORECASE)
        s = re.sub(r"\\Thita\b", r"\\Theta", s)

        # Physics expressions like g \sin\theta, 2g \sin\theta, g sin theta wrapped into LaTeX
        s = re.sub(
            r"(?<![\$\w\\])(\d*g|g)\s*\\?(?:sin|cos|tan)\s*(?:\\?theta|\\?thita|θ|ϑ|q)\b(?![$\w])",
            r"$\1\\sin\\theta$", s, flags=re.IGNORECASE
        )

        # Trig functions with powers and theta, thita, θ, OCR zero, or Symbol font q: e.g. sin^2 theta, cos thita, tan θ, sinq
        s = re.sub(
            r"(?<!\\)\b(sin|cos|tan|cot|sec|csc|cosec)\^?([0-9]*)\s*(?:\\?theta|\\?thita|θ|ϑ|q)\b",
            lambda m: f"$\\{m.group(1)}^{{{m.group(2)}}}\\theta$" if m.group(2) else f"$\\{m.group(1)}\\theta$",
            s, flags=re.IGNORECASE
        )
        s = re.sub(
            r"(?<!\\)\b(sin|cos|tan|cot|sec|csc|cosec)[θq]\b",
            r"$\\\1\\theta$", s, flags=re.IGNORECASE
        )
        s = re.sub(
            r"(?<!\\)\b(sin|cos|tan|cot|sec|csc|cosec)\s*\(\s*(?:\\?theta|\\?thita|θ|ϑ|0|q)\s*\)",
            r"$\\\1(\\theta)$", s, flags=re.IGNORECASE
        )
        s = re.sub(r"(?<!\\)\b(sin|cos|tan|cot|sec|csc|cosec)\s*0\b", r"$\\\1\\theta$", s, flags=re.IGNORECASE)

        # Clean any adjacent physics variables and math blocks: e.g. 'g $\sin\theta$' -> '$g\sin\theta$'
        s = re.sub(r"(?<![\$\w\\])(\d*g|g)\s*\$\s*\\(sin|cos|tan)\\theta\s*\$", r"$\1\\\2\\theta$", s)

        # Contextual angle phrases: at an angle of theta, angle thita, angle θ
        s = re.sub(r"\b(at an angle of|at an angle|angle of|angle)\s+(?:\\?theta|\\?thita|θ|ϑ)\b",
                   r"\1 $\\theta$", s, flags=re.IGNORECASE)

        # Equations with theta: theta = 30°, theta <= 45°
        def repl_theta_eq(m):
            val = m.group(2).replace('°', r'^\circ')
            return f"$\\theta {m.group(1)} {val}$"
        s = re.sub(r"\b(?:\\?theta|\\?thita)\s*([=><≤≥≈])\s*([0-9]+(?:\.[0-9]+)?(?:\s*°)?)(?!\w)",
                   repl_theta_eq, s, flags=re.IGNORECASE)

        # Standalone words theta/thita or unwrapped \theta / \thita in natural text
        s = re.sub(r"(?<![$\\\w])(?:theta|thita)\b(?![$\w])", r"$\\theta$", s, flags=re.IGNORECASE)
        s = re.sub(r"(?<![$\\\w])(?:Theta|Thita)\b(?![$\w])", r"$\\Theta$", s)
        s = re.sub(r"(?<![\$\w])\\(?:theta|thita)\b(?![$\w])", r"$\\theta$", s, flags=re.IGNORECASE)
        s = re.sub(r"(?<![\$\w])\\(?:Theta|Thita)\b(?![$\w])", r"$\\Theta$", s)

        # Physics units normalization: m/s 2 -> m/s^2, cm 3 -> cm^3, etc.
        s = re.sub(r'm/s\s*2\b', r'm/s^2', s)
        s = re.sub(r'm/s\s*[-–]\s*2\b', r'm/s^{-2}', s)
        s = re.sub(r'cm\s*3\b', r'cm^3', s)
        s = re.sub(r'cm\s*2\b', r'cm^2', s)
        s = re.sub(r'm\s*3\b(?!/)', r'm^3', s)
        s = re.sub(r'm\s*2\b(?!/)', r'm^2', s)

        # 1. Superscripts attached to variables/numbers/units: e.g. r³, t², 10², cm², m³
        sup_chars = "".join(cls.SUPERSCRIPT_MAP.keys())
        s = re.sub(
            rf"([a-zA-Z0-9\)\}}\]])([{sup_chars}]+)",
            lambda m: f"{m.group(1)}^{''.join(cls.SUPERSCRIPT_MAP.get(c, c) for c in m.group(2))}",
            s
        )

        # 2. Subscripts attached to variables/numbers
        sub_chars = "".join(cls.SUBSCRIPT_MAP.keys())
        s = re.sub(
            rf"([a-zA-Z0-9\)\}}\]])([{sub_chars}]+)",
            lambda m: f"{m.group(1)}_{{{''.join(cls.SUBSCRIPT_MAP.get(c, c) for c in m.group(2))}}}",
            s
        )

        # 3. Radicals: e.g. 10√2, √2, √(D), ∛8, ∜16
        s = re.sub(r"∛\s*(\d+|[a-zA-Z]+|\([^)]+\))", lambda m: f"$\\sqrt[3]{{{m.group(1).strip('()')}}}$", s)
        s = re.sub(r"∜\s*(\d+|[a-zA-Z]+|\([^)]+\))", lambda m: f"$\\sqrt[4]{{{m.group(1).strip('()')}}}$", s)
        s = re.sub(r"(\d*)\s*(?:√|sqrt)\s*(\d+|[a-zA-Z]+|\([^)]+\))",
                   lambda m: f"${m.group(1)}\\sqrt{{{m.group(2).strip('()')}}}$" if m.group(1) else f"$\\sqrt{{{m.group(2).strip('()')}}}$", s)
        s = re.sub(r"(?<![\$\w\\])(\d*)\s*\\sqrt\{([^}]+)\}",
                   lambda m: f"${m.group(1)}\\sqrt{{{m.group(2)}}}$" if m.group(1) else f"$\\sqrt{{{m.group(2)}}}$", s)
        # 3b. Fractions: e.g. \frac{a}{b}
        s = re.sub(r"(?<![\$\w\\])(\\frac\{[^}]+\}\{[^}]+\})", r"$\1$", s)

        # 4. Group coefficients / fractions with Greek letters
        # Order matters: match LONGER patterns first to avoid premature substitution.
        pi_pat = r"(?:π|\\pi(?![a-zA-Z]))"
        # 4a. coefficient * pi / denominator  e.g. 4π/3 -> $\frac{4\pi}{3}$
        def make_pi_frac(m: re.Match) -> str:
            coeff = m.group(1).replace('$', '').strip()
            denom = m.group(2)
            return f"$\\frac{{{coeff}\\pi}}{{{denom}}}$"
        s = re.sub(rf"(\d+(?:/\d+)?|\d*\.\d+)\s*{pi_pat}\s*/\s*(\d+)", make_pi_frac, s)
        # 4b. standalone pi / denominator  e.g. π/3 -> $\frac{\pi}{3}$
        s = re.sub(rf"{pi_pat}\s*/\s*(\d+)", r"$\\frac{{\\pi}}{{\1}}$", s)
        # 4c. coefficient * pi (before letter) e.g. 4π r -> $4\pi$ r
        s = re.sub(rf"(\d+(?:/\d+)?|\d*\.\d+)\s*{pi_pat}(?=[a-zA-Z])", r"$\1\\pi $", s)
        # 4d. coefficient * pi  e.g. 4π -> $4\pi$
        s = re.sub(rf"(\d+(?:/\d+)?|\d*\.\d+)\s*{pi_pat}", r"$\1\\pi$", s)
        # 4e. bare pi symbol
        s = re.sub(rf"(?<![$\w\\]){pi_pat}", r"$\\pi$", s)

        # 5. Replace standalone Greek letters with LaTeX equivalents
        for char, ltx in cls.GREEK_CHAR_MAP.items():
            if char in s and char != "π":
                s = re.sub(rf"{char}(?=[a-zA-Z])", lambda _, l=ltx: f"${l} $", s)
                s = s.replace(char, f"${ltx}$")

        # 6. Replace vulgar fractions
        for frac, ltx in cls.VULGAR_FRACTIONS.items():
            if frac in s:
                s = s.replace(frac, f"${ltx}$")

        # 7. Convert degree symbol: e.g. 30°, 2°
        s = re.sub(r"(\d+)\s*°", r"$\1^\\circ$", s)

        # 8. Replace standalone math operators
        for sym, ltx in cls.MATH_SYMBOL_MAP.items():
            if sym in s and sym != "°":
                s = s.replace(sym, f"${ltx.strip()}$")

        # 9. Fractions e.g. 160/3 or 4/3 outside dates/paths/formulas
        s = re.sub(r"(?<![\$\w\.\/])(\d+)\s*/\s*(\d+)(?![\w\.\/])", r"$\\frac{\1}{\2}$", s)

        # 9b. Standalone derivatives outside equations: dr/dt, dx/dt, dV/dt -> $\frac{dr}{dt}$
        s = re.sub(r"(?<![\$\w\\])\bd([a-zA-Z])\s*/\s*d([a-zA-Z])\b(?![$\w])", r"$\\frac{d\1}{d\2}$", s)

        # 10. Detect and wrap mathematical equations with variables and expressions:
        # e.g. V = 4/3 \pi r^3, x = t^3 - 12t^2 + 6t + 8, r = 10, dr/dt = 0.01, \frac{dr}{dt} = 0.01
        def eq_replacer(m):
            eq = m.group(0).strip()
            # Clean internal $ tags
            clean_eq = eq.replace("$", "").strip()
            # Ensure space between \pi and any letter (e.g. \pi r -> \pi r)
            clean_eq = re.sub(r"\\pi([a-zA-Z])", r"\\pi \1", clean_eq)
            # Format simple division like 4/3 -> \frac{4}{3}
            clean_eq = re.sub(r"\b(\d+)\s*/\s*(\d+)\b", r"\\frac{\1}{\2}", clean_eq)
            # Format derivatives like dr/dt -> \frac{dr}{dt}
            clean_eq = re.sub(r"\bd([a-zA-Z])\s*/\s*d([a-zA-Z])\b", r"\\frac{d\1}{d\2}", clean_eq)
            return f"${clean_eq}$"

        # Match simple assignments first: r = 10, dr/dt = 0.01, \frac{dr}{dt} = 0.01
        s = re.sub(r"(?<!\$)(?:\\frac\{d[a-zA-Z]\}\{d[a-zA-Z]\}|\bd[a-zA-Z]/d[a-zA-Z]\b|[a-zA-Z])\s*=\s*[-+]?\d+(?:\.\d+)?(?=[,;?.!\s]|$)", eq_replacer, s)
        # Match multi-term equations: variable = expression (excluding conjunctions)
        s = re.sub(r"(?<!\$)\b[VvXxYyZzAaBbCcRr]\s*=\s*[^,;?.!\n]+?(?=[,;?.!]|\s+\b(?:at|when|where|if|and|or)\b|$)", eq_replacer, s)

        # Restore placeholders
        for k, v in placeholders.items():
            s = s.replace(k, v)

        # Clean up any duplicate or escaped dollar artifacts
        s = re.sub(r"\$\s*\\\$\s*", "$", s)
        s = re.sub(r"\\\$\s*\$", "$", s)
        s = re.sub(r"\$\s*\$", "", s)
        # Ensure no stray $ inside \frac{} or \sqrt{} from double-conversion
        s = re.sub(r"\\frac\{[$\s]*([^}]+?)[$\s]*\}\{[$\s]*([^}]+?)[$\s]*\}", r"\\frac{\1}{\2}", s)
        s = re.sub(r"\\sqrt\{[$\s]*([^}]+?)[$\s]*\}", r"\\sqrt{\1}", s)
        s = re.sub(r"\\pi([a-zA-Z])", r"\\pi \1", s)

        # Final self-healing pass: repair any malformed nested/slashed \frac{\frac{dr/dt}} or \frac{dr/dt}
        s = re.sub(r"\\frac\{\\frac\{d([A-Za-z])\s*/\s*d([A-Za-z])\}\}", r"\\frac{d\1}{d\2}", s)
        s = re.sub(r"\\frac\{\\frac\{([^}]+)\}\}", r"\\frac{\1}", s)
        s = re.sub(r"\\frac\{d([A-Za-z])\s*/\s*d([A-Za-z])\}", r"\\frac{d\1}{d\2}", s)
        s = re.sub(r"\\frac\{([a-zA-Z0-9]+)\s*/\s*([a-zA-Z0-9]+)\}", r"\\frac{\1}{\2}", s)

        return s.strip()

specialized_math = SpecializedMathEngine()
SpecializedMathEngine._load_symbol_database()

