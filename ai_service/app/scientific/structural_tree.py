"""
Structural Formula Expression Tree (AST)
Represents mathematical and scientific formulas as structural trees rather than flat strings.
Outputs valid LaTeX, MathML, plain text, and structured JSON.
"""

from __future__ import annotations
import re
from typing import List, Dict, Any, Optional, Union
from enum import Enum


class NodeType(str, Enum):
    ROOT = "ROOT"
    ADD = "ADD"
    SUBTRACT = "SUBTRACT"
    MULTIPLY = "MULTIPLY"
    DIVIDE = "DIVIDE"
    FRACTION = "FRACTION"
    MIXED_NUMBER = "MIXED_NUMBER"
    POWER = "POWER"
    SUPERSCRIPT = "SUPERSCRIPT"
    SQRT = "SQRT"
    NTH_ROOT = "NTH_ROOT"
    SUBSCRIPT = "SUBSCRIPT"
    INTEGRAL = "INTEGRAL"
    SUMMATION = "SUMMATION"
    PRODUCT = "PRODUCT"
    LIMIT = "LIMIT"
    MATRIX = "MATRIX"
    VECTOR = "VECTOR"
    EQUATION = "EQUATION"
    RELATION = "RELATION"
    GREEK_SYMBOL = "GREEK_SYMBOL"
    VARIABLE = "VARIABLE"
    NUMBER = "NUMBER"
    UNIT = "UNIT"
    PARENTHESES = "PARENTHESES"
    BRACKETS = "BRACKETS"
    OPERATOR = "OPERATOR"
    DELIMITER = "DELIMITER"
    CHEM_COMPOUND = "CHEM_COMPOUND"
    CHEM_REACTION = "CHEM_REACTION"
    FUNCTION = "FUNCTION"


class FormulaNode:
    """A node in the mathematical structural expression tree."""

    def __init__(
        self,
        node_type: NodeType,
        value: Optional[str] = None,
        children: Optional[List[FormulaNode]] = None,
        attributes: Optional[Dict[str, Any]] = None,
    ):
        self.node_type = node_type
        self.value = value or ""
        self.children: List[FormulaNode] = children or []
        self.attributes: Dict[str, Any] = attributes or {}

    def add_child(self, child: FormulaNode) -> FormulaNode:
        self.children.append(child)
        return self

    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": self.node_type.value,
            "value": self.value,
            "attributes": self.attributes,
            "children": [c.to_dict() for c in self.children],
        }

    def to_latex(self) -> str:
        """Converts the expression tree rooted at this node to valid LaTeX."""
        nt = self.node_type

        if nt == NodeType.ROOT:
            return " ".join(c.to_latex() for c in self.children).strip()

        if nt == NodeType.NUMBER:
            return self.value

        if nt == NodeType.VARIABLE:
            return self.value

        if nt == NodeType.UNIT:
            return f"\\mathrm{{{self.value}}}"

        if nt == NodeType.GREEK_SYMBOL:
            val = self.value.lstrip("\\")
            return f"\\{val}"

        if nt == NodeType.SQRT:
            inner = " ".join(c.to_latex() for c in self.children) if self.children else self.value
            return f"\\sqrt{{{inner}}}"

        if nt == NodeType.NTH_ROOT:
            deg = self.attributes.get("degree", "3")
            inner = " ".join(c.to_latex() for c in self.children) if self.children else self.value
            return f"\\sqrt[{deg}]{{{inner}}}"

        if nt == NodeType.FRACTION:
            num = self.children[0].to_latex() if len(self.children) > 0 else "1"
            denom = self.children[1].to_latex() if len(self.children) > 1 else "1"
            return f"\\frac{{{num}}}{{{denom}}}"

        if nt == NodeType.MIXED_NUMBER:
            whole = self.children[0].to_latex() if len(self.children) > 0 else (self.value or "1")
            frac = self.children[1].to_latex() if len(self.children) > 1 else "\\frac{1}{2}"
            return f"{whole}\\,{frac}"

        if nt in (NodeType.POWER, NodeType.SUPERSCRIPT):
            base = self.children[0].to_latex() if len(self.children) > 0 else self.value
            exp = self.children[1].to_latex() if len(self.children) > 1 else self.attributes.get("exponent", "")
            return f"{{{base}}}^{{{exp}}}"

        if nt == NodeType.SUBSCRIPT:
            base = self.children[0].to_latex() if len(self.children) > 0 else self.value
            sub = self.children[1].to_latex() if len(self.children) > 1 else self.attributes.get("subscript", "")
            return f"{{{base}}}_{{{sub}}}"

        if nt == NodeType.MULTIPLY:
            parts = [c.to_latex() for c in self.children]
            res = ""
            is_implicit = self.attributes.get("implicit", False)
            for i, p in enumerate(parts):
                if i == 0:
                    res = p
                else:
                    prev_p = parts[i - 1]
                    if "\\mathrm" in p:
                        res += f"\\,{p}"
                    elif "\\sqrt" in p or p.startswith("\\left(") or prev_p.endswith("\\right)") or is_implicit:
                        res += f" {p}"
                    else:
                        res += f" \\times {p}"
            return res

        if nt == NodeType.ADD:
            return " + ".join(c.to_latex() for c in self.children)

        if nt == NodeType.SUBTRACT:
            return " - ".join(c.to_latex() for c in self.children)

        if nt == NodeType.EQUATION:
            left = self.children[0].to_latex() if len(self.children) > 0 else ""
            right = self.children[1].to_latex() if len(self.children) > 1 else ""
            op = self.attributes.get("operator", "=")
            return f"{left} {op} {right}"

        if nt == NodeType.PARENTHESES:
            inner = " ".join(c.to_latex() for c in self.children)
            return f"\\left({inner}\\right)"

        if nt == NodeType.BRACKETS:
            inner = " ".join(c.to_latex() for c in self.children)
            return f"\\left[{inner}\\right]"

        if nt in (NodeType.OPERATOR, NodeType.DELIMITER):
            return self.value

        if nt == NodeType.VECTOR:
            base = self.children[0].to_latex() if self.children else self.value
            is_hat = self.attributes.get("unit_vector", False)
            return f"\\hat{{{base}}}" if is_hat else f"\\vec{{{base}}}"

        if nt == NodeType.INTEGRAL:
            expr = self.children[0].to_latex() if self.children else self.value
            var = self.attributes.get("var", "x")
            limits = ""
            if "lower" in self.attributes and "upper" in self.attributes:
                limits = f"_{{{self.attributes['lower']}}}^{{{self.attributes['upper']}}}"
            return f"\\int{limits} {expr}\\,d{var}"

        if nt == NodeType.SUMMATION:
            expr = self.children[0].to_latex() if self.children else self.value
            limits = ""
            if "lower" in self.attributes and "upper" in self.attributes:
                limits = f"_{{{self.attributes['lower']}}}^{{{self.attributes['upper']}}}"
            return f"\\sum{limits} {expr}"

        if nt == NodeType.FUNCTION:
            fn = self.value.lstrip("\\")
            arg = self.children[0].to_latex() if self.children else ""
            return f"\\{fn} {arg}".strip()

        return self.value

    def to_mathml(self) -> str:
        """Converts the expression tree rooted at this node to MathML."""
        nt = self.node_type

        if nt == NodeType.ROOT:
            inner = "".join(c.to_mathml() for c in self.children)
            return f"<math xmlns='http://www.w3.org/1998/Math/MathML'>{inner}</math>"

        if nt == NodeType.NUMBER:
            return f"<mn>{self.value}</mn>"

        if nt in (NodeType.VARIABLE, NodeType.GREEK_SYMBOL):
            return f"<mi>{self.value.lstrip(chr(92))}</mi>"

        if nt == NodeType.UNIT:
            return f"<mi mathvariant='normal'>{self.value}</mi>"

        if nt == NodeType.SQRT:
            inner = "".join(c.to_mathml() for c in self.children) if self.children else f"<mn>{self.value}</mn>"
            return f"<msqrt>{inner}</msqrt>"

        if nt == NodeType.NTH_ROOT:
            deg = self.attributes.get("degree", "3")
            inner = "".join(c.to_mathml() for c in self.children) if self.children else f"<mn>{self.value}</mn>"
            return f"<mroot>{inner}<mn>{deg}</mn></mroot>"

        if nt == NodeType.FRACTION:
            num = self.children[0].to_mathml() if len(self.children) > 0 else "<mn>1</mn>"
            denom = self.children[1].to_mathml() if len(self.children) > 1 else "<mn>1</mn>"
            return f"<mfrac><mrow>{num}</mrow><mrow>{denom}</mrow></mfrac>"

        if nt == NodeType.MIXED_NUMBER:
            whole = self.children[0].to_mathml() if len(self.children) > 0 else f"<mn>{self.value or '1'}</mn>"
            frac = self.children[1].to_mathml() if len(self.children) > 1 else "<mfrac><mn>1</mn><mn>2</mn></mfrac>"
            return f"<mrow>{whole}{frac}</mrow>"

        if nt in (NodeType.POWER, NodeType.SUPERSCRIPT):
            base = self.children[0].to_mathml() if len(self.children) > 0 else f"<mi>{self.value}</mi>"
            exp = self.children[1].to_mathml() if len(self.children) > 1 else f"<mn>{self.attributes.get('exponent', '')}</mn>"
            return f"<msup>{base}{exp}</msup>"

        if nt == NodeType.SUBSCRIPT:
            base = self.children[0].to_mathml() if len(self.children) > 0 else f"<mi>{self.value}</mi>"
            sub = self.children[1].to_mathml() if len(self.children) > 1 else f"<mi>{self.attributes.get('subscript', '')}</mi>"
            return f"<msub>{base}{sub}</msub>"

        if nt == NodeType.MULTIPLY:
            return "".join(c.to_mathml() for c in self.children)

        if nt == NodeType.ADD:
            parts = []
            for i, c in enumerate(self.children):
                if i > 0:
                    parts.append("<mo>+</mo>")
                parts.append(c.to_mathml())
            return "".join(parts)

        if nt == NodeType.SUBTRACT:
            parts = []
            for i, c in enumerate(self.children):
                if i > 0:
                    parts.append("<mo>-</mo>")
                parts.append(c.to_mathml())
            return "".join(parts)

        if nt == NodeType.EQUATION:
            left = self.children[0].to_mathml() if len(self.children) > 0 else ""
            right = self.children[1].to_mathml() if len(self.children) > 1 else ""
            op = self.attributes.get("operator", "=")
            return f"{left}<mo>{op}</mo>{right}"

        if nt == NodeType.PARENTHESES:
            inner = "".join(c.to_mathml() for c in self.children)
            return f"<mo>(</mo>{inner}<mo>)</mo>"

        if nt == NodeType.BRACKETS:
            inner = "".join(c.to_mathml() for c in self.children)
            return f"<mo>[</mo>{inner}<mo>]</mo>"

        if nt in (NodeType.OPERATOR, NodeType.DELIMITER):
            return f"<mo>{self.value}</mo>"

        return f"<mtext>{self.value}</mtext>"

    def to_plain_text(self) -> str:
        """Plain-text representation for fallbacks with Unicode math symbols."""
        nt = self.node_type

        if nt == NodeType.ROOT:
            return " ".join(c.to_plain_text() for c in self.children).strip()

        if nt in (NodeType.NUMBER, NodeType.VARIABLE, NodeType.UNIT, NodeType.OPERATOR, NodeType.DELIMITER):
            return self.value

        if nt == NodeType.SQRT:
            inner = "".join(c.to_plain_text() for c in self.children) if self.children else self.value
            return f"√({inner})"

        if nt == NodeType.FRACTION:
            num = self.children[0].to_plain_text() if len(self.children) > 0 else "1"
            denom = self.children[1].to_plain_text() if len(self.children) > 1 else "1"
            return f"({num})/({denom})"

        if nt == NodeType.MIXED_NUMBER:
            whole = self.children[0].to_plain_text() if len(self.children) > 0 else (self.value or "1")
            if len(self.children) > 1 and self.children[1].node_type == NodeType.FRACTION:
                f = self.children[1]
                n = f.children[0].to_plain_text() if len(f.children) > 0 else "1"
                d = f.children[1].to_plain_text() if len(f.children) > 1 else "2"
                return f"{whole} {n}/{d}"
            frac = self.children[1].to_plain_text() if len(self.children) > 1 else "1/2"
            return f"{whole} {frac}"

        if nt in (NodeType.POWER, NodeType.SUPERSCRIPT):
            base = self.children[0].to_plain_text() if self.children else self.value
            exp = self.children[1].to_plain_text() if len(self.children) > 1 else self.attributes.get("exponent", "")
            sup_map = str.maketrans("0123456789+-=()nixy", "⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿⁱˣʸ")
            return f"{base}{exp.translate(sup_map)}"

        if nt == NodeType.SUBSCRIPT:
            base = self.children[0].to_plain_text() if self.children else self.value
            sub = self.children[1].to_plain_text() if len(self.children) > 1 else self.attributes.get("subscript", "")
            sub_map = str.maketrans("0123456789+-=()", "₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎")
            return f"{base}{sub.translate(sub_map)}"

        if nt == NodeType.PARENTHESES:
            inner = " ".join(c.to_plain_text() for c in self.children)
            return f"({inner})"

        if nt == NodeType.BRACKETS:
            inner = " ".join(c.to_plain_text() for c in self.children)
            return f"[{inner}]"

        if nt == NodeType.EQUATION:
            op = self.attributes.get("operator", "=")
            left = self.children[0].to_plain_text() if len(self.children) > 0 else ""
            right = self.children[1].to_plain_text() if len(self.children) > 1 else ""
            return f"{left} {op} {right}".strip()

        if nt == NodeType.ADD:
            return " + ".join(c.to_plain_text() for c in self.children)

        if nt == NodeType.SUBTRACT:
            return " - ".join(c.to_plain_text() for c in self.children)

        if nt == NodeType.MULTIPLY:
            is_implicit = self.attributes.get("implicit", False)
            sep = " " if is_implicit else " × "
            return sep.join(c.to_plain_text() for c in self.children)

        return self.value


class ExpressionTreeBuilder:
    """Constructs structural FormulaNode ASTs from recognized math/science components."""

    @staticmethod
    def build_radical_expression(coefficient: Optional[str], radicand: str, unit: Optional[str] = None) -> FormulaNode:
        """
        Builds AST for expressions like 10√3 g:
        MULTIPLY
        ├── 10 (NUMBER)
        ├── SQRT(3) (SQRT)
        └── g (UNIT)
        """
        root = FormulaNode(NodeType.ROOT)
        mult = FormulaNode(NodeType.MULTIPLY)

        if coefficient and coefficient.strip():
            mult.add_child(FormulaNode(NodeType.NUMBER, value=coefficient.strip()))

        sqrt_node = FormulaNode(NodeType.SQRT)
        sqrt_node.add_child(FormulaNode(NodeType.NUMBER, value=radicand.strip()))
        mult.add_child(sqrt_node)

        if unit and unit.strip():
            mult.add_child(FormulaNode(NodeType.UNIT, value=unit.strip()))

        root.add_child(mult)
        return root

    @staticmethod
    def build_fraction_expression(numerator: str, denominator: str, unit: Optional[str] = None) -> FormulaNode:
        """Builds AST for a fraction like v / sin(θ) or 4/3."""
        root = FormulaNode(NodeType.ROOT)
        frac = FormulaNode(NodeType.FRACTION)

        # Parse numerator
        frac.add_child(FormulaNode(NodeType.VARIABLE if not numerator.isdigit() else NodeType.NUMBER, value=numerator.strip()))

        # Parse denominator
        denom_str = denominator.strip()
        if re.search(r"\b(sin|cos|tan|cot|sec|csc)\b", denom_str, re.IGNORECASE):
            fn_node = FormulaNode(NodeType.FUNCTION, value=re.findall(r"(sin|cos|tan|cot|sec|csc)", denom_str, re.I)[0].lower())
            fn_node.add_child(FormulaNode(NodeType.GREEK_SYMBOL, value=r"\theta"))
            frac.add_child(fn_node)
        else:
            frac.add_child(FormulaNode(NodeType.VARIABLE if not denom_str.isdigit() else NodeType.NUMBER, value=denom_str))

        if unit and unit.strip():
            mult = FormulaNode(NodeType.MULTIPLY)
            mult.add_child(frac)
            mult.add_child(FormulaNode(NodeType.UNIT, value=unit.strip()))
            root.add_child(mult)
        else:
            root.add_child(frac)

        return root

    @staticmethod
    def build_mixed_number(whole: str, numerator: str, denominator: str) -> FormulaNode:
        """Builds AST for a mixed number like 1 1/2 or 2 3/4."""
        mn = FormulaNode(NodeType.MIXED_NUMBER, value=whole.strip())
        mn.add_child(FormulaNode(NodeType.NUMBER, value=whole.strip()))
        
        frac = FormulaNode(NodeType.FRACTION)
        frac.add_child(FormulaNode(NodeType.NUMBER if numerator.strip().isdigit() else NodeType.VARIABLE, value=numerator.strip()))
        frac.add_child(FormulaNode(NodeType.NUMBER if denominator.strip().isdigit() else NodeType.VARIABLE, value=denominator.strip()))
        mn.add_child(frac)
        return mn

    @staticmethod
    def build_equation(left: str, op: str, right: str) -> FormulaNode:
        """Builds AST for equations like F = ma or E = mc^2."""
        root = FormulaNode(NodeType.ROOT)
        eq = FormulaNode(NodeType.EQUATION, attributes={"operator": op})
        eq.add_child(FormulaNode(NodeType.VARIABLE, value=left.strip()))
        eq.add_child(FormulaNode(NodeType.VARIABLE, value=right.strip()))
        root.add_child(eq)
        return root
