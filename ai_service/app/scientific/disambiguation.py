"""
Context-Aware Scientific Symbol Disambiguation & Unicode Normalization Engine
Resolves visually confusable characters using syntactic position, surrounding tokens,
formula structure, and scientific domain (Physics, Chemistry, Biology, Mathematics).

Never performs blind character replacement. Preserves original representations.
"""

import re
import unicodedata
from typing import Dict, Any, Optional, Tuple, List
from dataclasses import dataclass, field


@dataclass
class NormalizedSymbolRecord:
    original_symbol: str
    normalized_symbol: str
    unicode_point: str
    latex: str
    domain: str
    confidence: float
    disambiguation_reason: str


class ContextAwareDisambiguator:
    # Domain indicator keyword sets
    PHYSICS_TRIG_KEYWORDS = {"sin", "cos", "tan", "cot", "sec", "csc", "cosec", "angle", "incline", "inclined", "slope", "plane", "horizontal", "vertical", "degree", "degrees", "rad", "radian"}
    PHYSICS_FRICTION_KEYWORDS = {"friction", "frictionless", "rough", "smooth", "viscosity", "viscous", "drag", "coefficient", "static", "kinetic", "sliding"}
    PHYSICS_WAVE_KEYWORDS = {"wavelength", "frequency", "wave", "light", "photon", "spectrum", "fringe", "diffraction", "interference", "doppler"}
    PHYSICS_DENSITY_KEYWORDS = {"density", "resistivity", "specific", "volume", "mass", "submerged", "float"}
    CHEM_KEYWORDS = {"reaction", "acid", "base", "salt", "molar", "solution", "equilibrium", "precipitate", "catalyst", "aqueous", "gas", "yields", "oxid"}
    BIO_KEYWORDS = {"dna", "rna", "mrna", "trna", "gene", "allele", "chromosome", "gamete", "cross", "progeny", "filial", "phenotype", "genotype", "male", "female"}

    @classmethod
    def disambiguate_token(
        cls,
        token: str,
        surrounding_text: str = "",
        domain_hint: str = "GENERAL"
    ) -> NormalizedSymbolRecord:
        """
        Disambiguates a token using surrounding context and domain clues.
        Returns a NormalizedSymbolRecord with original, normalized, and LaTeX forms.
        """
        raw = token.strip()
        context_lower = surrounding_text.lower()

        # 1. OMEGA (Ω) vs RESISTANCE / OHM vs LETTER (O)
        if raw in ("Ω", "O", "0"):
            if any(w in context_lower for w in ("ohm", "resistance", "resistor", "impedance", "kω", "mω")):
                return NormalizedSymbolRecord(
                    original_symbol=raw,
                    normalized_symbol="Ω",
                    unicode_point="U+03A9",
                    latex=r"\Omega",
                    domain="PHYSICS",
                    confidence=0.98,
                    disambiguation_reason="Electrical circuit / resistance context indicates Greek Omega"
                )

        # 2. UPPERCASE THETA (Θ) vs CAPITAL O vs ZERO (0)
        if raw in ("Θ", "O", "0"):
            if any(w in context_lower for w in ("temperature difference", "theta", "angular coordinate", "dimension")):
                return NormalizedSymbolRecord(
                    original_symbol=raw,
                    normalized_symbol="Θ",
                    unicode_point="U+0398",
                    latex=r"\Theta",
                    domain="PHYSICS",
                    confidence=0.96,
                    disambiguation_reason="Physics temperature difference/angular coordinate indicates Greek Theta"
                )

        # 3. LOWERCASE THETA (θ, ϑ) vs ZERO (0) vs LETTER (O, o, Q, q)
        if raw in ("θ", "ϑ"):
            return NormalizedSymbolRecord(
                original_symbol=raw,
                normalized_symbol="θ",
                unicode_point="U+03B8",
                latex=r"\theta",
                domain="PHYSICS" if "g" in context_lower or "angle" in context_lower else "MATHEMATICS",
                confidence=0.99,
                disambiguation_reason="Native Greek theta symbol"
            )

        if raw in ("0", "O", "o", "q", "Q"):
            # Check for trig prefix (sin 0, cos 0, tan q, sinq, gsin q, etc.)
            trig_match = re.search(r"\b(sin|cos|tan|cot|sec|csc|cosec)\s*([θϑ0OoQq])\b", context_lower)
            angle_match = re.search(r"\b(?:angle|at an angle of|angle of|slope|inclined?)\s+([θϑ0OoQq])\b", context_lower)
            physics_opt_match = re.search(r"\b(?:\d*g|g)\s*sin\s*([θϑ0OoQq])\b", context_lower)

            if trig_match or angle_match or physics_opt_match:
                return NormalizedSymbolRecord(
                    original_symbol=raw,
                    normalized_symbol="θ",
                    unicode_point="U+03B8",
                    latex=r"\theta",
                    domain="PHYSICS" if "g" in context_lower or "angle" in context_lower else "MATHEMATICS",
                    confidence=0.98,
                    disambiguation_reason="Trigonometric/angle context indicates Greek theta rather than zero or letter"
                )

        # 2. MU (μ, µ) vs LETTER (u)
        # Handle both Greek mu (U+03BC) and micro sign (U+00B5)
        if raw in ("μ", "µ", "u", "U"):
            is_micro_unit = bool(re.search(r"(?:[μµuU])(?:m|g|s|L|l|A|V|F|mol|m\b|m/s)", surrounding_text))
            is_friction = any(k in context_lower for k in cls.PHYSICS_FRICTION_KEYWORDS) or bool(re.search(r"(?:coefficient|\bmu\b|_s|_k|\b0\.\d+)", context_lower))

            if is_micro_unit or is_friction or domain_hint == "PHYSICS":
                orig_ucode = f"U+{ord(raw):04X}"
                return NormalizedSymbolRecord(
                    original_symbol=raw,
                    normalized_symbol="μ",
                    unicode_point=orig_ucode,
                    latex=r"\mu",
                    domain="PHYSICS",
                    confidence=0.97,
                    disambiguation_reason=f"Micro unit or friction coefficient context resolves to Greek mu (preserving {orig_ucode})"
                )

        # 3. NU (ν) vs VELOCITY (v, V)
        if raw in ("ν", "v", "V"):
            is_wave_freq = any(k in context_lower for k in cls.PHYSICS_WAVE_KEYWORDS) or bool(re.search(r"\b(?:h\s*ν|h\s*v|E\s*=\s*h|frequency)\b", context_lower))
            if is_wave_freq:
                return NormalizedSymbolRecord(
                    original_symbol=raw,
                    normalized_symbol="ν",
                    unicode_point="U+03BD",
                    latex=r"\nu",
                    domain="PHYSICS",
                    confidence=0.95,
                    disambiguation_reason="Photon energy / wave frequency indicates Greek nu"
                )
            elif "velocity" in context_lower or "speed" in context_lower or "m/s" in context_lower:
                return NormalizedSymbolRecord(
                    original_symbol=raw,
                    normalized_symbol="v",
                    unicode_point="U+0076",
                    latex="v",
                    domain="PHYSICS",
                    confidence=0.98,
                    disambiguation_reason="Kinematic speed / velocity indicates Latin v"
                )

        # 4. RHO (ρ) vs PRESSURE / MOMENTUM (p, P)
        if raw in ("ρ", "ϱ", "p", "P"):
            is_density = any(k in context_lower for k in cls.PHYSICS_DENSITY_KEYWORDS) or bool(re.search(r"\b(?:ρgh|pgh|resistivity|density)\b", context_lower))
            if is_density:
                return NormalizedSymbolRecord(
                    original_symbol=raw,
                    normalized_symbol="ρ",
                    unicode_point="U+03C1",
                    latex=r"\rho",
                    domain="PHYSICS",
                    confidence=0.96,
                    disambiguation_reason="Fluid statics / electrical resistivity indicates Greek rho"
                )

        # 5. LAMBDA (λ) vs LENGTH / ONE (l, 1, |)
        if raw in ("λ", "l", "1"):
            if any(k in context_lower for k in cls.PHYSICS_WAVE_KEYWORDS) or bool(re.search(r"\b(?:de broglie|wavelength|fringe width|diffraction)\b", context_lower)):
                return NormalizedSymbolRecord(
                    original_symbol=raw,
                    normalized_symbol="λ",
                    unicode_point="U+03BB",
                    latex=r"\lambda",
                    domain="PHYSICS",
                    confidence=0.97,
                    disambiguation_reason="Wavelength / radiation context indicates Greek lambda"
                )

        # 6. ALPHA (α) vs ACCELERATION (a) vs PROPORTIONAL (∝)
        if raw in ("α", "a", "∝"):
            if any(w in context_lower for w in ("angular acceleration", "thermal expansion", "alpha particle", "alpha decay")):
                return NormalizedSymbolRecord(
                    original_symbol=raw,
                    normalized_symbol="α",
                    unicode_point="U+03B1",
                    latex=r"\alpha",
                    domain="PHYSICS",
                    confidence=0.97,
                    disambiguation_reason="Angular dynamics / thermal expansion indicates Greek alpha"
                )
            elif any(w in context_lower for w in ("proportional to", "varies as")):
                return NormalizedSymbolRecord(
                    original_symbol=raw,
                    normalized_symbol="∝",
                    unicode_point="U+221D",
                    latex=r"\propto",
                    domain="MATHEMATICS",
                    confidence=0.95,
                    disambiguation_reason="Proportionality phrase indicates propto operator"
                )

        # 7. DELTA (Δ) vs AREA / AMPERE (A)
        if raw in ("Δ", "A"):
            if bool(re.search(r"(?:Δ|A)\s*[tTxXyYvVEePpKk]", context_lower)) or "change" in context_lower or "difference" in context_lower or "heat" in context_lower:
                return NormalizedSymbolRecord(
                    original_symbol=raw,
                    normalized_symbol="Δ",
                    unicode_point="U+0394",
                    latex=r"\Delta",
                    domain="PHYSICS",
                    confidence=0.96,
                    disambiguation_reason="Change operator preceding variable indicates Greek Delta"
                )

        # 8. SIGMA (Σ) vs ENERGY / ELECTRIC FIELD (E)
        if raw in ("Σ", "E"):
            if "sum" in context_lower or "summation" in context_lower or bool(re.search(r"[ΣE]\s*[FfiIn]", context_lower)):
                return NormalizedSymbolRecord(
                    original_symbol=raw,
                    normalized_symbol="Σ",
                    unicode_point="U+03A3",
                    latex=r"\sum" if "sum" in context_lower else r"\Sigma",
                    domain="MATHEMATICS",
                    confidence=0.95,
                    disambiguation_reason="Mathematical summation or resultant force indicates Greek Sigma"
                )

        # 9. OMEGA (Ω) vs RESISTANCE / OHM vs LETTER (O)
        if raw in ("Ω", "O", "0"):
            if any(w in context_lower for w in ("ohm", "resistance", "resistor", "impedance", "kΩ", "mΩ")):
                return NormalizedSymbolRecord(
                    original_symbol=raw,
                    normalized_symbol="Ω",
                    unicode_point="U+03A9",
                    latex=r"\Omega",
                    domain="PHYSICS",
                    confidence=0.98,
                    disambiguation_reason="Electrical circuit / resistance context indicates Greek Omega"
                )

        # 10. MULTIPLICATION (×) vs VARIABLE (x) vs CHI (χ)
        if raw in ("×", "x", "X", "χ"):
            is_sci_not = bool(re.search(r"\d+\s*[x×]\s*10\^?[-+]?\d+", surrounding_text))
            is_cross_mult = bool(re.search(r"(?:\d+|\))\s*[x×]\s*(?:\d+|\()", surrounding_text))
            is_genetics_cross = any(k in context_lower for k in cls.BIO_KEYWORDS) and bool(re.search(r"[A-Za-z0-9]+\s*[x×]\s*[A-Za-z0-9]+", surrounding_text))

            if is_sci_not or is_cross_mult or is_genetics_cross:
                return NormalizedSymbolRecord(
                    original_symbol=raw,
                    normalized_symbol="×",
                    unicode_point="U+00D7",
                    latex=r"\times",
                    domain="BIOLOGY" if is_genetics_cross else "MATHEMATICS",
                    confidence=0.98,
                    disambiguation_reason="Scientific notation or arithmetic/genetics cross indicates multiplication sign"
                )

        # Fallback: standard representation
        ucode_pt = f"U+{ord(raw[0]):04X}" if raw else "U+0000"
        return NormalizedSymbolRecord(
            original_symbol=raw,
            normalized_symbol=raw,
            unicode_point=ucode_pt,
            latex=raw,
            domain=domain_hint,
            confidence=0.90,
            disambiguation_reason="Standard character preservation"
        )

    @classmethod
    def normalize_text_scientific(cls, text: str, domain_hint: str = "GENERAL") -> str:
        """
        Disambiguates and normalizes full expressions while protecting numbers and natural language words.
        """
        if not text:
            return ""

        s = text

        # 1. Normalize micro signs: preserve U+00B5 in record while standardizing formula presentation
        s = re.sub(r'(\d+(?:\.\d+)?)\s*[μµ]([mglsavf]|mol|A|V|F|H|s|W)\b', r'\1 \\mu\\mathrm{\2}', s)

        # 2. Normalize trig theta: sin 0 -> \sin\theta, gsin q -> g\sin\theta
        s = re.sub(r'(?<!\\)\b(sin|cos|tan|cot|sec|csc|cosec)\s*(?:θ|ϑ|q|0)\b', r'\\\1 \\theta', s, flags=re.IGNORECASE)
        s = re.sub(r'(?<!\\)\b(sin|cos|tan|cot|sec|csc|cosec)[θq]\b', r'\\\1 \\theta', s, flags=re.IGNORECASE)
        s = re.sub(r'(?<![\$\w\\])(\d*g|g)\s*sin\s*(?:θ|ϑ|q|0)\b', r'\1 \\sin\\theta', s, flags=re.IGNORECASE)

        # 3. Normalize Greek Theta (capital)
        s = re.sub(r'\b(?:temperature difference|angular coordinate)\s+(?:Θ|O|0)\b', r'\\Theta', s, flags=re.IGNORECASE)

        # 4. Normalize Wavelength lambda
        s = re.sub(r'\b(?:wavelength|wave length)\s*(?:=|is)?\s*([0-9\.\s]+)?(?:λ|l)\b', r'wavelength \1\\lambda', s, flags=re.IGNORECASE)

        # 5. Normalize Density / Resistivity rho
        s = re.sub(r'\b(?:density|resistivity)\s*(?:is|=|:)?\s*(?:ρ|p)\b', r'density \\rho', s, flags=re.IGNORECASE)

        # 6. Normalize Resistance ohms
        s = re.sub(r'(\d+(?:\.\d+)?)\s*(?:Ω|ohm|ohms)\b', r'\1 \\Omega', s, flags=re.IGNORECASE)

        # 7. Normalize scientific notation powers
        s = re.sub(r'(\d+(?:\.\d+)?)\s*[x×✕✖]\s*10\^?([-\+]?[0-9]+)', r'\1 \\times 10^{\2}', s)

        return s


disambiguator = ContextAwareDisambiguator()
