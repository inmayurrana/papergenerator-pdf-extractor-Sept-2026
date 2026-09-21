"""
Advanced Biology & Genetics Recognition Layer
Recognizes genetic crosses (P, F1, F2, Aa x aa, X^A, X^a), sex symbols (♂, ♀),
biomolecules (DNA, RNA, mRNA, tRNA, rRNA, ATP, ADP, NAD+, NADH, FAD, FADH2),
nucleic acid directionality (5', 3'), and biological scientific units (μm, nm, μL, μM, mM, M).
"""

import re
from typing import Dict, Any, List, Optional


class AdvancedBiologyEngine:
    SEX_SYMBOLS = {"♂": r"\mars", "♀": r"\venus"}
    
    GENETICS_CROSS_PATTERN = re.compile(
        r"(?:[♂♀]\s*)?([A-Za-z0-9_]+(?:\^[A-Za-z0-9]+)?)\s*([×xX✕])\s*(?:[♂♀]\s*)?([A-Za-z0-9_]+(?:\^[A-Za-z0-9]+)?)\b"
    )
    
    DIRECTIONALITY_PATTERN = re.compile(r"\b([53])(?:′|'| prime)(?![\w])", re.IGNORECASE)
    
    BIOMOLECULES = {
        "DNA", "RNA", "mRNA", "tRNA", "rRNA", "snRNA", "miRNA",
        "ATP", "ADP", "AMP", "cAMP", "GTP", "GDP",
        "NAD+", "NADH", "NADP+", "NADPH", "FAD", "FADH2", "CoA", "Acetyl-CoA"
    }

    BIO_UNITS = {
        "μm", "um", "nm", "mm", "cm", "m",
        "mg", "g", "kg", "μg", "ug", "ng", "pg",
        "mL", "ml", "L", "l", "μL", "uL",
        "mol", "mmol", "μmol", "umol", "nmol", "pmol",
        "M", "mM", "μM", "uM", "nM", "pM", "bp", "kbp", "kb"
    }

    @classmethod
    def format_biology_latex(cls, text: str) -> str:
        """
        Standardizes biology & genetics text into proper LaTeX notation.
        e.g. ♀ x ♂ -> \venus \times \mars
        e.g. Aa x aa -> \text{Aa} \times \text{aa}
        e.g. 5' to 3' -> 5' \rightarrow 3'
        e.g. X^A X^a -> X^A X^a
        """
        if not text:
            return ""

        s = text

        # 1. Sex symbols: ♂ -> \mars, ♀ -> \venus
        for char, ltx in cls.SEX_SYMBOLS.items():
            s = s.replace(char, f"${ltx}$")

        # 2. Genetics Cross: AA x aa -> \text{AA} \times \text{aa}
        def repl_cross(m):
            p1 = m.group(1)
            p2 = m.group(3)
            # If alleles have superscripts like X^A
            return f"${p1} \\times {p2}$"

        s = cls.GENETICS_CROSS_PATTERN.sub(repl_cross, s)

        # 3. Directionality 5' and 3'
        s = re.sub(r"\b5(?:′|'| prime)\b", r"5'", s, flags=re.IGNORECASE)
        s = re.sub(r"\b3(?:′|'| prime)\b", r"3'", s, flags=re.IGNORECASE)
        s = re.sub(r"5'\s*(?:to|->|→)\s*3'", r"$5' \\rightarrow 3'$", s)

        # 4. Filial generations: P, F1, F2
        s = re.sub(r"\bF\s*1\b|\bF₁\b", r"$F_1$", s)
        s = re.sub(r"\bF\s*2\b|\bF₂\b", r"$F_2$", s)
        s = re.sub(r"\bP\s*1\b|\bP₁\b", r"$P_1$", s)

        # 5. Sex-linked chromosomes: X^A, X^a, X^T, X^t, X^H, X^h
        s = re.sub(r"\bX\s*([A-Za-z])\b", r"$X^{\1}$", s)
        s = re.sub(r"\bY\s*([A-Za-z])\b", r"$Y^{\1}$", s)

        return s

    @classmethod
    def analyze_biology_region(cls, text: str) -> Dict[str, Any]:
        """Analyzes text for biological content and genetics indicators."""
        found_molecules = [m for m in cls.BIOMOLECULES if re.search(rf"\b{re.escape(m)}\b", text)]
        found_units = [u for u in cls.BIO_UNITS if re.search(rf"\b{re.escape(u)}\b", text)]
        has_cross = bool(cls.GENETICS_CROSS_PATTERN.search(text))
        has_directionality = bool(cls.DIRECTIONALITY_PATTERN.search(text))
        has_sex_symbol = any(sym in text for sym in cls.SEX_SYMBOLS)

        is_bio = bool(found_molecules or has_cross or has_directionality or has_sex_symbol)
        conf = 0.95 if (found_molecules and (has_cross or has_directionality)) else (0.90 if is_bio else 0.50)

        return {
            "is_biology": is_bio,
            "confidence": conf,
            "biomolecules": found_molecules,
            "units": found_units,
            "has_genetics_cross": has_cross,
            "has_directionality": has_directionality,
            "has_sex_symbol": has_sex_symbol
        }


biology_engine = AdvancedBiologyEngine()
