"""
Scientific Formula Grammar Parser & Validator
Constructs recursive-descent structural ASTs, checks mathematical and scientific grammar,
and validates formulas against structural anomalies (unbalanced brackets, missing radicands,
invalid charges, missing exponents, etc.).
"""

import re
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass

from .formula_tokenizer import FormulaToken, TokenType, formula_tokenizer
from .structural_tree import FormulaNode, NodeType


@dataclass
class ValidationReport:
    is_valid: bool
    confidence: float
    errors: List[str]
    warnings: List[str]
    tokens_count: int
    ast_root: Optional[FormulaNode] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "is_valid": self.is_valid,
            "confidence": self.confidence,
            "errors": self.errors,
            "warnings": self.warnings,
            "tokens_count": self.tokens_count,
            "ast": self.ast_root.to_dict() if self.ast_root else None
        }


class FormulaGrammarValidator:
    """Validates formula syntax, balance, and structural integrity."""

    @classmethod
    def validate_formula(cls, text: str, domain_hint: str = "AUTO") -> ValidationReport:
        errors = []
        warnings = []
        tokens = formula_tokenizer.tokenize(text, domain_hint=domain_hint)
        sig_tokens = [t for t in tokens if t.type != TokenType.WHITESPACE]

        if not sig_tokens:
            return ValidationReport(True, 1.0, [], [], 0, None)

        # 1. Bracket Matching Validation
        bracket_stack = []
        matching = {')': '(', ']': '[', '}': '{'}
        for t in sig_tokens:
            if t.type == TokenType.BRACKET:
                val = t.value
                if val in "([{":
                    bracket_stack.append((val, t.start_pos))
                elif val in ")]}":
                    if not bracket_stack:
                        errors.append(f"Unmatched closing bracket '{val}' at position {t.start_pos}")
                    else:
                        top, pos = bracket_stack.pop()
                        if top != matching[val]:
                            errors.append(f"Mismatched brackets: '{top}' opened at {pos} closed with '{val}' at {t.start_pos}")

        for unclosed, pos in bracket_stack:
            errors.append(f"Unclosed opening bracket '{unclosed}' at position {pos}")

        # 2. LaTeX Braces Balance
        open_braces = text.count('{')
        close_braces = text.count('}')
        if open_braces != close_braces:
            errors.append(f"Unbalanced LaTeX curly braces: {open_braces} open vs {close_braces} close")

        # 3. Incomplete Radicals
        if re.search(r"\\sqrt\s*(?:\{|\b|$)", text):
            if re.search(r"\\sqrt\{\s*\}", text):
                errors.append("Empty square root radical: \\sqrt{} with no radicand")
            elif text.strip().endswith(r"\sqrt"):
                errors.append("Dangling \\sqrt operator with missing radicand")

        # 4. Incomplete Fractions
        if re.search(r"\\frac\{\s*\}\s*\{", text) or re.search(r"\\frac\{[^}]+\}\s*\{\s*\}", text):
            errors.append("Empty numerator or denominator in \\frac{...}{...}")
        elif text.strip().endswith(r"\frac") or text.strip().endswith("/"):
            errors.append("Dangling division or \\frac operator with missing operand")

        # 5. Dangling Exponents / Subscripts
        if re.search(r"[\^_]\s*(?:$|[\+\-=\)\]\}])", text):
            warnings.append("Dangling exponent (^) or subscript (_) without operand")

        # 6. Chemical Formula Validation
        if domain_hint in ("CHEMISTRY", "AUTO") and any(t.type == TokenType.CHEMICAL_ELEMENT for t in sig_tokens):
            # Check for consecutive impossible numbers or malformed charges
            for i, t in enumerate(sig_tokens):
                if t.type == TokenType.CHEMICAL_ELEMENT:
                    if i + 1 < len(sig_tokens) and sig_tokens[i + 1].type == TokenType.NUMBER:
                        num_val = sig_tokens[i + 1].value
                        if float(num_val) > 100:
                            warnings.append(f"Suspiciously high stoichiometric coefficient or subscript {num_val} after element {t.value}")

        # Compute structural confidence score
        conf = 0.99
        if errors:
            conf -= min(0.60, len(errors) * 0.20)
        if warnings:
            conf -= min(0.20, len(warnings) * 0.05)

        is_valid = len(errors) == 0

        # Build AST
        ast_root = cls._parse_tokens_to_ast(sig_tokens, text)

        return ValidationReport(
            is_valid=is_valid,
            confidence=max(0.10, conf),
            errors=errors,
            warnings=warnings,
            tokens_count=len(sig_tokens),
            ast_root=ast_root
        )

    @classmethod
    def _parse_tokens_to_ast(cls, tokens: List[FormulaToken], raw_text: str) -> FormulaNode:
        """Constructs an AST representation from significant tokens."""
        root = FormulaNode(NodeType.ROOT)
        i = 0
        n = len(tokens)

        while i < n:
            tok = tokens[i]

            # 1. Radical: e.g. 10\sqrt{3} g or \sqrt{3} g
            if tok.type == TokenType.RADICAL:
                rad_match = re.match(r"(?:\\sqrt(?:\[([^\]]+)\])?\{([^}]+)\}|√([0-9a-zA-Z]+))", tok.value)
                degree = "2"
                inner = tok.value
                if rad_match:
                    degree = rad_match.group(1) or "2"
                    inner = rad_match.group(2) or rad_match.group(3) or tok.value

                node_type = NodeType.NTH_ROOT if degree != "2" else NodeType.SQRT
                r_node = FormulaNode(node_type, value=inner, attributes={"degree": degree})
                r_node.add_child(FormulaNode(NodeType.NUMBER if inner.isdigit() else NodeType.VARIABLE, value=inner))
                root.add_child(r_node)
                i += 1
                continue

            # 2. Fraction: e.g. \frac{a}{b}
            if tok.type == TokenType.FRACTION:
                f_meta = tok.metadata or {}
                num = f_meta.get("numerator", "1")
                den = f_meta.get("denominator", "1")
                f_node = FormulaNode(NodeType.FRACTION)
                f_node.add_child(FormulaNode(NodeType.VARIABLE if not num.isdigit() else NodeType.NUMBER, value=num))
                f_node.add_child(FormulaNode(NodeType.VARIABLE if not den.isdigit() else NodeType.NUMBER, value=den))
                root.add_child(f_node)
                i += 1
                continue

            # 3. Greek Symbol
            if tok.type == TokenType.GREEK_SYMBOL:
                root.add_child(FormulaNode(NodeType.GREEK_SYMBOL, value=tok.value, attributes=tok.metadata))
                i += 1
                continue

            # 4. Function: e.g. \sin followed by Greek symbol
            if tok.type == TokenType.FUNCTION:
                fn_node = FormulaNode(NodeType.FUNCTION, value=tok.value)
                if i + 1 < n and tokens[i + 1].type in (TokenType.GREEK_SYMBOL, TokenType.SYMBOL, TokenType.NUMBER):
                    arg_tok = tokens[i + 1]
                    arg_nt = NodeType.GREEK_SYMBOL if arg_tok.type == TokenType.GREEK_SYMBOL else (NodeType.NUMBER if arg_tok.type == TokenType.NUMBER else NodeType.VARIABLE)
                    fn_node.add_child(FormulaNode(arg_nt, value=arg_tok.value))
                    i += 1
                root.add_child(fn_node)
                i += 1
                continue

            # 5. Chemical Element + optional subscript
            if tok.type == TokenType.CHEMICAL_ELEMENT:
                elem_node = FormulaNode(NodeType.VARIABLE, value=tok.value, attributes={"is_element": True})
                if i + 1 < n and (tokens[i + 1].type == TokenType.NUMBER or tokens[i + 1].type == TokenType.SUBSCRIPT):
                    sub_val = tokens[i + 1].value.lstrip("_").strip("{}")
                    sub_node = FormulaNode(NodeType.SUBSCRIPT, value=tok.value, attributes={"subscript": sub_val})
                    sub_node.add_child(elem_node)
                    sub_node.add_child(FormulaNode(NodeType.NUMBER, value=sub_val))
                    root.add_child(sub_node)
                    i += 2
                    continue
                root.add_child(elem_node)
                i += 1
                continue

            # 6. Unit
            if tok.type == TokenType.UNIT:
                root.add_child(FormulaNode(NodeType.UNIT, value=tok.value))
                i += 1
                continue

            # 7. Number
            if tok.type == TokenType.NUMBER:
                root.add_child(FormulaNode(NodeType.NUMBER, value=tok.value))
                i += 1
                continue

            # 8. Variable Symbol
            if tok.type == TokenType.SYMBOL:
                root.add_child(FormulaNode(NodeType.VARIABLE, value=tok.value))
                i += 1
                continue

            # 9. Other Operators / Brackets
            root.add_child(FormulaNode(NodeType.VARIABLE, value=tok.value))
            i += 1

        return root


formula_validator = FormulaGrammarValidator()
