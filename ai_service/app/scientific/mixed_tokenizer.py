"""
Mixed Text + Scientific Notation Tokenizer
Decomposes complex sentences containing interspersed prose, mathematical formulas,
units, chemical compounds, and biology notation into semantic structural tokens.
"""

import re
from typing import List, Dict, Any
from .scientific_units import scientific_units
from .chemistry_engine import chemistry_engine
from .biology_engine import biology_engine


class MixedContentTokenizer:
    # Pattern to match mathematical formulas, equations, or radicals inside sentences
    FORMULA_TOKEN_PATTERN = re.compile(
        r"(?:"
        r"\$[^$]+\$|"                                          # Explicit $...$
        r"\\[a-zA-Z]+(?:\{[^{}]*\})*|"                         # LaTeX macro \frac{...}{...}, \sqrt{...}
        r"[a-zA-Z]\s*=\s*[\d\w\\/\.\+\-\*√∛∜\^_{}()]+"        # Equation: a = \sqrt{3}, v = u + at
        r"|[\d\w]+\s*[=≠≈≤≥<>]+\s*[\d\w\\/\.\+\-\*√∛∜\^_{}()]+" # General equality/inequality
        r"|\b\d*(?:\\sqrt\{[^}]+\}|√\w+)"                      # Standalone radical: \sqrt{3}, √3
        r"|\b[A-Za-z]+_\{?[0-9a-zA-Z]+\}?"                    # Subscripts: M_1, M_{1}
        r"|\b[A-Za-z0-9]+\^\{?[0-9a-zA-Z\+\-]+\}?"            # Superscripts: x^2, 10^{-3}
        r")"
    )

    @classmethod
    def tokenize_mixed_sentence(cls, sentence: str) -> List[Dict[str, Any]]:
        """
        Tokenizes a sentence into typed semantic components:
        TEXT, FORMULA, UNIT, CHEMISTRY, BIOLOGY
        Example input:
            'The acceleration of the body is a = \\sqrt{3} m/s^2.'
        Returns:
            [
                {'type': 'TEXT', 'content': 'The acceleration of the body is '},
                {'type': 'FORMULA', 'content': 'a = \\sqrt{3}'},
                {'type': 'UNIT', 'content': 'm/s^2'},
                {'type': 'TEXT', 'content': '.'}
            ]
        """
        raw = sentence.strip()
        if not raw:
            return []

        tokens: List[Dict[str, Any]] = []

        # Find all candidate formula spans
        matches = list(cls.FORMULA_TOKEN_PATTERN.finditer(raw))
        if not matches:
            return [{"type": "TEXT", "content": raw}]

        last_idx = 0
        for m in matches:
            start, end = m.start(), m.end()
            if start < last_idx:
                continue

            # Leading prose before formula
            if start > last_idx:
                pre_text = raw[last_idx:start]
                if pre_text:
                    tokens.append({"type": "TEXT", "content": pre_text})

            matched_formula = m.group(0).strip()

            # Check if there is an adjacent scientific unit immediately following the formula
            remaining_after = raw[end:]
            unit_found = ""
            unit_len = 0
            
            # Check compound and standard units
            candidate_units = sorted(
                list(scientific_units.COMPOUND_UNITS) +
                list(scientific_units.BASE_UNITS) +
                list(scientific_units.DERIVED_UNITS) +
                list(scientific_units.LENGTH_UNITS) +
                list(scientific_units.TIME_UNITS),
                key=len,
                reverse=True
            )
            for u in candidate_units:
                # Pattern: optional space, then unit word boundary or followed by punctuation
                u_pat = re.compile(rf"^\s*({re.escape(u)})(?=\s|[.,;:?!)]|$)")
                um = u_pat.match(remaining_after)
                if um:
                    unit_found = um.group(1)
                    unit_len = um.end()
                    break

            # Strip $ wrapping if present
            clean_formula = matched_formula.strip("$").strip()

            # Further check if the formula itself contained the unit at the end
            split_formula, split_unit = scientific_units.split_formula_and_unit(clean_formula)
            if split_unit and not unit_found:
                clean_formula = split_formula
                unit_found = split_unit

            tokens.append({"type": "FORMULA", "content": clean_formula})

            if unit_found:
                tokens.append({"type": "UNIT", "content": unit_found})
                last_idx = end + unit_len
            else:
                last_idx = end

        # Trailing prose after last formula
        if last_idx < len(raw):
            post_text = raw[last_idx:]
            if post_text:
                tokens.append({"type": "TEXT", "content": post_text})

        return tokens


mixed_tokenizer = MixedContentTokenizer()
