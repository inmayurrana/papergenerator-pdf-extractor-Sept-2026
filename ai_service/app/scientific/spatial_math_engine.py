"""
2-D Mathematical Equation & Structural Reconstruction Engine
Performs geometric layout analysis on symbols, vector lines, baselines, and tall delimiters
to construct a semantic FormulaNode AST rather than flat OCR strings.
"""

from __future__ import annotations
import re
from typing import List, Dict, Any, Optional, Tuple, Union
from dataclasses import dataclass, field
from pathlib import Path

from .structural_tree import FormulaNode, NodeType
from .fraction_engine import FractionTreeParser


@dataclass
class Symbol2D:
    """Represents a discrete mathematical symbol or glyph with 2-D geometry."""
    text: str
    raw_text: str
    bbox: Tuple[float, float, float, float]  # (x0, y0, x1, y1)
    size: float
    font: str = ""
    baseline: float = 0.0
    category: str = "IDENTIFIER"  # IDENTIFIER, NUMBER, OPERATOR, DELIMITER, GREEK, UNIT
    is_consumed: bool = False
    span_ref: Any = None

    @property
    def x0(self) -> float:
        return self.bbox[0]

    @property
    def y0(self) -> float:
        return self.bbox[1]

    @property
    def x1(self) -> float:
        return self.bbox[2]

    @property
    def y1(self) -> float:
        return self.bbox[3]

    @property
    def width(self) -> float:
        return self.bbox[2] - self.bbox[0]

    @property
    def height(self) -> float:
        return self.bbox[3] - self.bbox[1]

    @property
    def mid_x(self) -> float:
        return (self.bbox[0] + self.bbox[2]) / 2.0

    @property
    def mid_y(self) -> float:
        return (self.bbox[1] + self.bbox[3]) / 2.0


@dataclass
class DrawingLine2D:
    """Represents a 2-D vector line (such as a vinculum fraction bar or radical line)."""
    p1: Tuple[float, float]
    p2: Tuple[float, float]
    thickness: float = 1.0
    line_type: str = "VINCULUM"  # VINCULUM, RADICAL, ACCENT, RULE

    @property
    def x0(self) -> float:
        return min(self.p1[0], self.p2[0])

    @property
    def x1(self) -> float:
        return max(self.p1[0], self.p2[0])

    @property
    def y(self) -> float:
        return (self.p1[1] + self.p2[1]) / 2.0

    @property
    def width(self) -> float:
        return abs(self.p2[0] - self.p1[0])

    @property
    def is_horizontal(self) -> bool:
        return abs(self.p1[1] - self.p2[1]) <= 0.8


@dataclass
class Formula2DResult:
    """Complete multi-format output of a reconstructed 2-D mathematical expression."""
    ast: FormulaNode
    latex: str
    mathml: str
    plain_text: str
    structured_expression: Dict[str, Any]
    bbox: Tuple[float, float, float, float]
    confidence: float = 0.98
    original_crop: str = ""
    domain: str = "PHYSICS"
    validation_status: str = "VERIFIED"
    spatial_relationships: List[Dict[str, Any]] = field(default_factory=list)

    def to_formula_object(
        self,
        formula_id: str = "",
        question_id: str = "",
        option_id: str = "",
        page_id: str = "",
        region_id: str = "",
        visual_similarity: float = 0.95,
        recognition_engine: str = "SpatialMathEngine",
    ) -> Dict[str, Any]:
        import uuid, time
        now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        return {
            "id": formula_id or f"formula_{uuid.uuid4().hex[:8]}",
            "questionId": question_id,
            "optionId": option_id,
            "pageId": page_id,
            "regionId": region_id,
            "originalImage": self.original_crop,
            "originalCrop": self.original_crop,
            "boundingBox": [float(x) for x in self.bbox],
            "plainText": self.plain_text,
            "plainMath": self.plain_text,
            "latex": self.latex,
            "mathml": self.mathml,
            "structuredExpression": self.structured_expression,
            "spatialRelationships": self.spatial_relationships,
            "domain": self.domain,
            "confidence": round(self.confidence, 3),
            "visualSimilarity": round(visual_similarity, 3),
            "recognitionEngine": recognition_engine,
            "recognitionVersion": "2.0-spatial-2d",
            "validationStatus": self.validation_status,
            "createdAt": now_iso,
            "updatedAt": now_iso,
        }


class SpatialMathEngine:
    """
    2-D Structural Reconstruction Engine.
    Takes 2-D geometric symbols and vector drawings and reconstructs:
      - Fractions (including nested fractions)
      - Subscripts and Superscripts
      - Parenthesized and Delimited Expressions
      - Implicit and Explicit Multiplications
      - Equations and Relations
      - Radicals and Functions
    """

    TALL_BRACKET_CHARS = {'\xe6', '\xe7', '\xe8', '\xf6', '\xf7', '\xf8', '(', ')', '[', ']'}
    LEFT_BRACKET_CHARS = {'\xe6', '\xe7', '\xe8', '(', '['}
    RIGHT_BRACKET_CHARS = {'\xf6', '\xf7', '\xf8', ')', ']'}

    @classmethod
    def reconstruct_from_spans_and_drawings(
        cls,
        symbols: List[Symbol2D],
        lines: List[DrawingLine2D],
        region_bbox: Optional[Tuple[float, float, float, float]] = None,
    ) -> Optional[Formula2DResult]:
        """
        Reconstructs the full 2-D mathematical AST from geometric symbols and vector lines.
        """
        if not symbols and not lines:
            return None

        # 1. Detect Fraction Bars
        horizontal_lines = [l for l in lines if l.is_horizontal and l.width >= 4.0]
        # Sort fraction bars by width descending (primary/outer fraction bars first)
        fraction_bars = sorted(horizontal_lines, key=lambda l: l.width, reverse=True)

        if fraction_bars:
            return cls._reconstruct_fraction_hierarchy(symbols, fraction_bars)
        else:
            # Single baseline sequence (may contain sub/superscripts, multiplication, etc.)
            ast = cls._reconstruct_horizontal_sequence(symbols)
            if not ast:
                return None
            
            x0 = min(s.x0 for s in symbols) if symbols else 0.0
            y0 = min(s.y0 for s in symbols) if symbols else 0.0
            x1 = max(s.x1 for s in symbols) if symbols else 0.0
            y1 = max(s.y1 for s in symbols) if symbols else 0.0

            spatial_rels = cls.extract_spatial_relationships_from_ast(ast)
            return Formula2DResult(
                ast=ast,
                latex=ast.to_latex(),
                mathml=ast.to_mathml(),
                plain_text=ast.to_plain_text(),
                structured_expression=ast.to_dict(),
                spatial_relationships=spatial_rels,
                bbox=(x0, y0, x1, y1),
                confidence=0.98,
            )

    @classmethod
    def _reconstruct_fraction_hierarchy(
        cls,
        symbols: List[Symbol2D],
        fraction_bars: List[DrawingLine2D],
    ) -> Optional[Formula2DResult]:
        """
        Recursively reconstructs expressions containing fraction bars, tall parentheses,
        and trailing factors (e.g. \\left(\\frac{M_1+M_2}{M_1+M_2+M_3}\\right) F).
        """
        primary_bar = fraction_bars[0]
        fx0, fx1, fy = primary_bar.x0, primary_bar.x1, primary_bar.y

        # Detect flanking tall delimiters (e.g. SymbolMT left paren at fx0, right paren at fx1)
        left_delims = [
            s for s in symbols
            if any(c in cls.LEFT_BRACKET_CHARS for c in s.raw_text)
            and fx0 - 12.0 <= s.x0 <= fx0 + 2.0
            and fy - 22.0 <= s.y0 <= fy + 22.0
        ]
        right_delims = [
            s for s in symbols
            if any(c in cls.RIGHT_BRACKET_CHARS for c in s.raw_text)
            and fx1 - 2.0 <= s.x0 <= fx1 + 12.0
            and fy - 22.0 <= s.y0 <= fy + 22.0
        ]

        # Consumed delimiters
        delim_ids = {id(s) for s in left_delims + right_delims}

        # Numerator symbols: strictly above fraction bar midpoint
        nums = [
            s for s in symbols
            if id(s) not in delim_ids
            and s.x1 >= fx0 - 2.0 and s.x0 <= fx1 + 2.0
            and s.mid_y < fy and s.y0 >= fy - 22.0
        ]

        # Denominator symbols: strictly below fraction bar midpoint
        dens = [
            s for s in symbols
            if id(s) not in delim_ids
            and s.x1 >= fx0 - 2.0 and s.x0 <= fx1 + 2.0
            and s.mid_y > fy and s.y1 <= fy + 22.0
        ]

        # Leading symbols before left delimiter / fraction
        lead_x_limit = min((s.x0 for s in left_delims), default=fx0)
        leading = [s for s in symbols if id(s) not in delim_ids and s.x1 < lead_x_limit - 1.0]

        # Trailing symbols after right delimiter / fraction (e.g. 'F')
        trail_x_limit = max((s.x1 for s in right_delims), default=fx1)
        trailing = [s for s in symbols if id(s) not in delim_ids and s.x0 > trail_x_limit + 1.0]

        # Build Numerator AST
        num_ast = cls._reconstruct_horizontal_sequence(nums) or FormulaNode(NodeType.NUMBER, value="1")
        # Build Denominator AST
        den_ast = cls._reconstruct_horizontal_sequence(dens) or FormulaNode(NodeType.NUMBER, value="1")

        # Fraction Node
        frac_node = FormulaNode(NodeType.FRACTION)
        frac_node.add_child(num_ast)
        frac_node.add_child(den_ast)

        # Delimiter Wrapping
        has_parens = bool(left_delims or right_delims)
        core_node = frac_node
        if has_parens:
            paren_node = FormulaNode(NodeType.PARENTHESES)
            paren_node.add_child(frac_node)
            core_node = paren_node

        # Combine with leading or trailing terms (implicit multiplication)
        final_ast = core_node
        if trailing:
            trail_ast = cls._reconstruct_horizontal_sequence(trailing)
            if trail_ast:
                mult_node = FormulaNode(NodeType.MULTIPLY, attributes={"implicit": True})
                mult_node.add_child(core_node)
                mult_node.add_child(trail_ast)
                final_ast = mult_node

        if leading:
            lead_ast = cls._reconstruct_horizontal_sequence(leading)
            if lead_ast:
                mult_node = FormulaNode(NodeType.MULTIPLY, attributes={"implicit": True})
                mult_node.add_child(lead_ast)
                mult_node.add_child(final_ast)
                final_ast = mult_node

        all_syms = symbols
        x0 = min(s.x0 for s in all_syms) if all_syms else fx0
        y0 = min(s.y0 for s in all_syms) if all_syms else fy - 14.0
        x1 = max(s.x1 for s in all_syms) if all_syms else fx1
        y1 = max(s.y1 for s in all_syms) if all_syms else fy + 14.0

        spatial_rels = cls.extract_spatial_relationships_from_ast(final_ast)
        return Formula2DResult(
            ast=final_ast,
            latex=final_ast.to_latex(),
            mathml=final_ast.to_mathml(),
            plain_text=final_ast.to_plain_text(),
            structured_expression=final_ast.to_dict(),
            spatial_relationships=spatial_rels,
            bbox=(x0, y0, x1, y1),
            confidence=0.99,
        )

    @classmethod
    def _reconstruct_horizontal_sequence(cls, symbols: List[Symbol2D]) -> Optional[FormulaNode]:
        """
        Reconstructs a horizontal sequence of symbols with geometric baseline,
        subscript, and superscript analysis into a FormulaNode AST.
        """
        if not symbols:
            return None

        # Sort symbols left-to-right
        sorted_syms = sorted(symbols, key=lambda s: s.x0)

        # Step 1: Pair base symbols with their geometric subscripts and superscripts
        elements: List[Union[FormulaNode, Symbol2D]] = []
        skip_indices = set()

        for i, s in enumerate(sorted_syms):
            if i in skip_indices:
                continue

            # Check if next symbol is a factorial, subscript, or superscript of current symbol
            if i + 1 < len(sorted_syms):
                next_s = sorted_syms[i + 1]

                # Postfix factorial check
                if next_s.text.strip() == "!":
                    base_node = cls._symbol_to_node(s)
                    if i + 2 < len(sorted_syms) and sorted_syms[i + 2].text.strip() == "!":
                        fact_struct = FormulaNode(NodeType.DOUBLE_FACTORIAL)
                        fact_struct.add_child(base_node)
                        elements.append(fact_struct)
                        skip_indices.add(i + 1)
                        skip_indices.add(i + 2)
                        continue
                    else:
                        fact_struct = FormulaNode(NodeType.FACTORIAL)
                        fact_struct.add_child(base_node)
                        elements.append(fact_struct)
                        skip_indices.add(i + 1)
                        continue

                is_sub = (
                    next_s.size < s.size * 0.88
                    and next_s.y0 > s.y0 + 1.2
                    and next_s.x0 <= s.x1 + 3.0
                )
                is_sup = (
                    next_s.size < s.size * 0.88
                    and next_s.y1 < s.y1 - 1.2
                    and next_s.x0 <= s.x1 + 3.0
                )

                if is_sub:
                    base_node = cls._symbol_to_node(s)
                    sub_node = cls._symbol_to_node(next_s)
                    sub_struct = FormulaNode(NodeType.SUBSCRIPT)
                    sub_struct.add_child(base_node)
                    sub_struct.add_child(sub_node)
                    elements.append(sub_struct)
                    skip_indices.add(i + 1)
                    continue

                if is_sup:
                    base_node = cls._symbol_to_node(s)
                    exp_node = cls._symbol_to_node(next_s)
                    sup_struct = FormulaNode(NodeType.POWER)
                    sup_struct.add_child(base_node)
                    sup_struct.add_child(exp_node)
                    elements.append(sup_struct)
                    skip_indices.add(i + 1)
                    continue

            elements.append(cls._symbol_to_node(s))

        # Step 2: Assemble operators (+, -, =)
        return cls._assemble_binary_operations(elements)

    @classmethod
    def _symbol_to_node(cls, s: Symbol2D) -> FormulaNode:
        """Converts an individual geometric Symbol2D into a typed leaf FormulaNode."""
        t = s.text.strip()
        if not t:
            return FormulaNode(NodeType.VARIABLE, value="")

        if t.isdigit():
            return FormulaNode(NodeType.NUMBER, value=t)
        elif t in ("+", "-", "*", "/", "="):
            return FormulaNode(NodeType.OPERATOR, value=t)
        elif t in ("!", "!!"):
            return FormulaNode(NodeType.OPERATOR, value=t)
        elif t in ("...", "…", r"\cdots", r"\dots"):
            return FormulaNode(NodeType.ELLIPSIS, attributes={"latex": r"\cdots"})
        elif t in ("×", "·", "⋅", r"\times", r"\cdot"):
            return FormulaNode(NodeType.MULTIPLY, value=r"\times" if t in ("×", r"\times") else r"\cdot")
        elif t in ("sin", "cos", "tan", "cot", "sec", "csc"):
            return FormulaNode(NodeType.FUNCTION, value=t)
        elif t in ("\\theta", "theta", "θ", "q"):
            return FormulaNode(NodeType.GREEK_SYMBOL, value=r"\theta")
        elif t in ("\\alpha", "alpha", "α"):
            return FormulaNode(NodeType.GREEK_SYMBOL, value=r"\alpha")
        elif t in ("\\beta", "beta", "β"):
            return FormulaNode(NodeType.GREEK_SYMBOL, value=r"\beta")
        elif t in ("kg", "g", "N", "m", "s", "cm", "mm"):
            return FormulaNode(NodeType.UNIT, value=t)
        else:
            return FormulaNode(NodeType.VARIABLE, value=t)

    @classmethod
    def _assemble_binary_operations(cls, elements: List[Union[FormulaNode, Any]]) -> Optional[FormulaNode]:
        """
        Groups sequence of nodes and operators into ADD, SUBTRACT, EQUATION, or MULTIPLY.
        """
        if not elements:
            return None
        if len(elements) == 1:
            return elements[0]

        # Check for Equation '=' or multi-step Derivation
        eq_indices = [
            i for i, el in enumerate(elements)
            if isinstance(el, FormulaNode) and el.node_type == NodeType.OPERATOR and el.value == "="
        ]
        if len(eq_indices) >= 2:
            # Multi-step derivation!
            steps = []
            last_idx = 0
            for eq_idx in eq_indices:
                step_elements = elements[last_idx:eq_idx]
                if step_elements:
                    step_node = cls._assemble_binary_operations(step_elements)
                    if step_node:
                        steps.append(step_node)
                last_idx = eq_idx + 1
            final_elements = elements[last_idx:]
            if final_elements:
                step_node = cls._assemble_binary_operations(final_elements)
                if step_node:
                    steps.append(step_node)

            if len(steps) >= 2:
                deriv_node = FormulaNode(NodeType.DERIVATION)
                for idx, st in enumerate(steps):
                    trans = "EQUAL"
                    if idx > 0:
                        prev_latex = steps[idx - 1].to_latex()
                        curr_latex = st.to_latex()
                        if r"\cancel" in curr_latex or r"\cancel" in prev_latex:
                            trans = "CANCEL"
                        elif r"\times" in curr_latex and r"\times" not in prev_latex:
                            trans = "EXPAND"
                        elif len(curr_latex) < len(prev_latex):
                            trans = "SIMPLIFY"
                    step_leaf = FormulaNode(NodeType.DERIVATION_STEP, attributes={"step_index": idx, "transformation": trans})
                    step_leaf.add_child(st)
                    deriv_node.add_child(step_leaf)
                return deriv_node
        elif len(eq_indices) == 1:
            eq_idx = eq_indices[0]
            left = cls._assemble_binary_operations(elements[:eq_idx]) or FormulaNode(NodeType.VARIABLE, value="")
            right = cls._assemble_binary_operations(elements[eq_idx + 1:]) or FormulaNode(NodeType.VARIABLE, value="")
            eq_node = FormulaNode(NodeType.EQUATION, attributes={"operator": "="})
            eq_node.add_child(left)
            eq_node.add_child(right)
            return eq_node

        # Split on '+' or '-' (additive level)
        terms = []
        current_term = []
        current_op = "+"

        for el in elements:
            if isinstance(el, FormulaNode) and el.node_type == NodeType.OPERATOR and el.value in ("+", "-"):
                if current_term:
                    term_node = cls._assemble_term(current_term)
                    if term_node:
                        terms.append((current_op, term_node))
                    current_term = []
                current_op = el.value
            else:
                current_term.append(el)

        if current_term:
            term_node = cls._assemble_term(current_term)
            if term_node:
                terms.append((current_op, term_node))

        if not terms:
            return None

        if len(terms) == 1 and terms[0][0] == "+":
            return terms[0][1]

        # Combine terms into ADD / SUBTRACT tree
        first_op, first_node = terms[0]
        root = first_node
        for op, node in terms[1:]:
            if op == "+":
                add_node = FormulaNode(NodeType.ADD)
                add_node.add_child(root)
                add_node.add_child(node)
                root = add_node
            else:
                sub_node = FormulaNode(NodeType.SUBTRACT)
                sub_node.add_child(root)
                sub_node.add_child(node)
                root = sub_node

        return root

    @classmethod
    def _assemble_term(cls, term_elements: List[FormulaNode]) -> Optional[FormulaNode]:
        """Assembles adjacent factors into implicit or explicit MULTIPLY node."""
        if not term_elements:
            return None
        if len(term_elements) == 1:
            return term_elements[0]

        mult_node = FormulaNode(NodeType.MULTIPLY, attributes={"implicit": True})
        for el in term_elements:
            mult_node.add_child(el)
        return mult_node

    UNICODE_SUB_MAP = {'₀':'0', '₁':'1', '₂':'2', '₃':'3', '₄':'4', '₅':'5', '₆':'6', '₇':'7', '₈':'8', '₉':'9', 'ᵢ':'i', 'ⱼ':'j', 'ₙ':'n'}
    UNICODE_SUP_MAP = {'⁰':'0', '¹':'1', '²':'2', '³':'3', '⁴':'4', '⁵':'5', '⁶':'6', '⁷':'7', '⁸':'8', '⁹':'9', '⁺':'+', '⁻':'-'}

    @classmethod
    def parse_expression(
        cls,
        expr: str,
        bbox: Tuple[float, float, float, float] = (0, 0, 0, 0),
        domain: str = "PHYSICS",
        original_crop: str = "",
    ) -> Optional[Formula2DResult]:
        """
        Parses a mathematical expression string (LaTeX, Unicode math, or plain formula notation)
        into a semantic FormulaNode AST and produces a Formula2DResult.
        """
        cleaned = expr.strip()
        if not cleaned:
            return None

        # Remove enclosing $...$
        if cleaned.startswith("$") and cleaned.endswith("$") and len(cleaned) >= 2:
            cleaned = cleaned[1:-1].strip()

        # 1. Multi-step derivation check (A = B = C ...)
        eq_parts = [s.strip() for s in re.split(r"(?<![<>!=])=(?![=])", cleaned)]
        if len(eq_parts) >= 3:
            step_nodes = []
            for ep in eq_parts:
                sn = cls._parse_str_sequence(ep)
                if sn:
                    step_nodes.append(sn)
            if len(step_nodes) >= 2:
                deriv_node = FormulaNode(NodeType.DERIVATION)
                for idx, sn in enumerate(step_nodes):
                    trans = "EQUAL"
                    if idx > 0:
                        prev_latex = step_nodes[idx - 1].to_latex()
                        curr_latex = sn.to_latex()
                        if r"\cancel" in curr_latex or r"\cancel" in prev_latex:
                            trans = "CANCEL"
                        elif r"\times" in curr_latex and r"\times" not in prev_latex:
                            trans = "EXPAND"
                        elif len(curr_latex) < len(prev_latex):
                            trans = "SIMPLIFY"
                    step_leaf = FormulaNode(NodeType.DERIVATION_STEP, attributes={"step_index": idx, "transformation": trans})
                    step_leaf.add_child(sn)
                    deriv_node.add_child(step_leaf)
                return Formula2DResult(
                    ast=deriv_node,
                    latex=deriv_node.to_latex(),
                    mathml=deriv_node.to_mathml(),
                    plain_text=deriv_node.to_plain_text(),
                    structured_expression=deriv_node.to_dict(),
                    bbox=bbox,
                    domain=domain,
                    original_crop=original_crop,
                )

        # 1b. Single Equation check (left = right)
        eq_match = re.match(r"^(.+?)\s*(?<![<>!=])=(?![=])\s*(.+)$", cleaned)
        if eq_match:
            left_node = cls._parse_str_sequence(eq_match.group(1))
            right_node = cls._parse_str_sequence(eq_match.group(2))
            if left_node and right_node:
                eq_node = FormulaNode(NodeType.EQUATION, attributes={"operator": "="})
                eq_node.add_child(left_node)
                eq_node.add_child(right_node)
                return Formula2DResult(
                    ast=eq_node,
                    latex=eq_node.to_latex(),
                    mathml=eq_node.to_mathml(),
                    plain_text=eq_node.to_plain_text(),
                    structured_expression=eq_node.to_dict(),
                    bbox=bbox,
                    domain=domain,
                    original_crop=original_crop,
                )

        # 1b. Function / inverse trigonometric check:
        # e.g. \tan^{-1}\left(\frac{4}{5}\right), \sin^{-1}(1/2), \tan^{-1}(m), \sin\left(\frac{\pi}{4}\right)
        func_match = re.match(
            r"^(?:\\)?(?P<fn>sin|cos|tan|cot|sec|csc|cosec|arctan|arcsin|arccos)(?P<pow>\^\{?[-–]?\d+\}?|[-–]?\d+)?\s*(?:\\left\s*\(|\()(?P<arg>.*?)(?:\\right\s*\)|\))$",
            cleaned,
            re.IGNORECASE
        )
        if func_match:
            fn_name = func_match.group("fn").lower()
            fn_pow = func_match.group("pow") or ""
            fn_str = f"\\{fn_name}"
            if fn_pow:
                clean_pow = fn_pow.lstrip("^").strip("{}")
                fn_str = f"\\{fn_name}^{{{clean_pow}}}"
            arg_str = func_match.group("arg").strip()
            arg_res = cls.parse_expression(arg_str)
            arg_ast = arg_res.ast if arg_res else (cls._parse_str_sequence(arg_str) or FormulaNode(NodeType.VARIABLE, value=arg_str))

            paren_node = FormulaNode(NodeType.PARENTHESES)
            paren_node.add_child(arg_ast)

            fn_node = FormulaNode(NodeType.FUNCTION, value=fn_str)
            fn_node.add_child(paren_node)

            spatial_rels = cls.extract_spatial_relationships_from_ast(fn_node)
            return Formula2DResult(
                ast=fn_node,
                latex=fn_node.to_latex(),
                mathml=fn_node.to_mathml(),
                plain_text=fn_node.to_plain_text(),
                structured_expression=fn_node.to_dict(),
                spatial_relationships=spatial_rels,
                bbox=bbox,
                domain=domain,
                original_crop=original_crop,
            )

        # 2. Fraction check: via dedicated FractionTreeParser
        frac_ast = FractionTreeParser.parse_fraction_string(cleaned)
        if frac_ast:
            spatial_rels = cls.extract_spatial_relationships_from_ast(frac_ast)
            return Formula2DResult(
                ast=frac_ast,
                latex=frac_ast.to_latex(),
                mathml=frac_ast.to_mathml(),
                plain_text=frac_ast.to_plain_text(),
                structured_expression=frac_ast.to_dict(),
                spatial_relationships=spatial_rels,
                bbox=bbox,
                domain=domain,
                original_crop=original_crop,
            )

        # 3. Radical check: \sqrt{...} or \sqrt[n]{...}
        sqrt_pattern = re.compile(r"^(?:(?P<coeff>\d+)\s*)?\\sqrt(?:\[(?P<deg>\d+)\])?\{(?P<rad>[^{}]+(?:\{[^{}]*\}[^{}]*)*)\}$")
        sm = sqrt_pattern.match(cleaned)
        if sm:
            rad_str = sm.group("rad")
            deg_str = sm.group("deg")
            coeff_str = sm.group("coeff")
            rad_node = cls._parse_str_sequence(rad_str)

            if deg_str:
                root_node = FormulaNode(NodeType.NTH_ROOT, attributes={"degree": deg_str})
            else:
                root_node = FormulaNode(NodeType.SQRT)
            root_node.add_child(rad_node or FormulaNode(NodeType.NUMBER, value="1"))

            if coeff_str:
                mult = FormulaNode(NodeType.MULTIPLY, attributes={"implicit": True})
                mult.add_child(FormulaNode(NodeType.NUMBER, value=coeff_str))
                mult.add_child(root_node)
                final_node = mult
            else:
                final_node = root_node

            spatial_rels = cls.extract_spatial_relationships_from_ast(final_node)
            return Formula2DResult(
                ast=final_node,
                latex=final_node.to_latex(),
                mathml=final_node.to_mathml(),
                plain_text=final_node.to_plain_text(),
                structured_expression=final_node.to_dict(),
                spatial_relationships=spatial_rels,
                bbox=bbox,
                domain=domain,
                original_crop=original_crop,
            )

        # 3b. Piecewise / Cases: \begin{cases} ... \end{cases}
        cases_match = re.search(r"\\begin\{cases\}(.+?)\\end\{cases\}", cleaned, re.DOTALL)
        if cases_match:
            cases_body = cases_match.group(1).strip()
            raw_cases = [r.strip() for r in re.split(r"\\\\|\n", cases_body) if r.strip()]
            parsed_cases = []
            for rc in raw_cases:
                parts = [p.strip() for p in re.split(r"&|\\text\{if\s*\}|if\s+", rc) if p.strip()]
                if len(parts) >= 2:
                    expr_n = cls._parse_str_sequence(parts[0]) or FormulaNode(NodeType.VARIABLE, value=parts[0])
                    cond_n = cls._parse_str_sequence(parts[1]) or FormulaNode(NodeType.VARIABLE, value=parts[1])
                    parsed_cases.append((expr_n, cond_n))
                elif parts:
                    expr_n = cls._parse_str_sequence(parts[0]) or FormulaNode(NodeType.VARIABLE, value=parts[0])
                    parsed_cases.append((expr_n, FormulaNode(NodeType.TEXT, value="")))
            if parsed_cases:
                from .structural_tree import ExpressionTreeBuilder
                pw_node = ExpressionTreeBuilder.build_piecewise(parsed_cases)
                spatial_rels = cls.extract_spatial_relationships_from_ast(pw_node)
                return Formula2DResult(
                    ast=pw_node,
                    latex=pw_node.to_latex(),
                    mathml=pw_node.to_mathml(),
                    plain_text=pw_node.to_plain_text(),
                    structured_expression=pw_node.to_dict(),
                    spatial_relationships=spatial_rels,
                    bbox=bbox,
                    domain="ADVANCED_MATH",
                    original_crop=original_crop,
                )

        # 3c. Matrix: \begin{pmatrix} ... \end{pmatrix} or \begin{bmatrix} ... \end{bmatrix}
        matrix_match = re.search(r"\\begin\{(pmatrix|bmatrix|matrix|vmatrix)\}(.+?)\\end\{\1\}", cleaned, re.DOTALL)
        if matrix_match:
            m_type = matrix_match.group(1)
            m_body = matrix_match.group(2).strip()
            raw_rows = [r.strip() for r in re.split(r"\\\\|\n", m_body) if r.strip()]
            matrix_rows = []
            for rr in raw_rows:
                cells = [c.strip() for c in rr.split("&")]
                parsed_cells = [cls._parse_str_sequence(c) or FormulaNode(NodeType.VARIABLE, value=c) for c in cells]
                matrix_rows.append(parsed_cells)
            if matrix_rows:
                from .structural_tree import ExpressionTreeBuilder
                m_node = ExpressionTreeBuilder.build_matrix(matrix_rows, matrix_type=m_type)
                spatial_rels = cls.extract_spatial_relationships_from_ast(m_node)
                return Formula2DResult(
                    ast=m_node,
                    latex=m_node.to_latex(),
                    mathml=m_node.to_mathml(),
                    plain_text=m_node.to_plain_text(),
                    structured_expression=m_node.to_dict(),
                    spatial_relationships=spatial_rels,
                    bbox=bbox,
                    domain="LINEAR_ALGEBRA",
                    original_crop=original_crop,
                )

        # 3d. Integral with limits: \int_{lower}^{upper} expr d var or \int_0^\infty ...
        int_match = re.match(r"^\\int(?:_\{?([^{}]+)\}?)?(?:\^\{?([^{}]+)\}?)?\s*(.+?)(?:\s*d([a-zA-Z]))?$", cleaned)
        if int_match:
            lower, upper, expr_str, var = int_match.group(1), int_match.group(2), int_match.group(3), int_match.group(4) or "x"
            expr_n = cls._parse_str_sequence(expr_str) or FormulaNode(NodeType.VARIABLE, value=expr_str)
            from .structural_tree import ExpressionTreeBuilder
            int_node = ExpressionTreeBuilder.build_integral(expr_n, var=var, lower=lower, upper=upper)
            spatial_rels = cls.extract_spatial_relationships_from_ast(int_node)
            return Formula2DResult(
                ast=int_node,
                latex=int_node.to_latex(),
                mathml=int_node.to_mathml(),
                plain_text=int_node.to_plain_text(),
                structured_expression=int_node.to_dict(),
                spatial_relationships=spatial_rels,
                bbox=bbox,
                domain="CALCULUS",
                original_crop=original_crop,
            )

        # 3e. Summation with limits: \sum_{lower}^{upper} expr
        sum_match = re.match(r"^\\sum(?:_\{?([^{}]+)\}?)?(?:\^\{?([^{}]+)\}?)?\s*(.+)$", cleaned)
        if sum_match:
            lower, upper, expr_str = sum_match.group(1), sum_match.group(2), sum_match.group(3)
            expr_n = cls._parse_str_sequence(expr_str) or FormulaNode(NodeType.VARIABLE, value=expr_str)
            from .structural_tree import ExpressionTreeBuilder
            sum_node = ExpressionTreeBuilder.build_summation(expr_n, lower=lower, upper=upper)
            spatial_rels = cls.extract_spatial_relationships_from_ast(sum_node)
            return Formula2DResult(
                ast=sum_node,
                latex=sum_node.to_latex(),
                mathml=sum_node.to_mathml(),
                plain_text=sum_node.to_plain_text(),
                structured_expression=sum_node.to_dict(),
                spatial_relationships=spatial_rels,
                bbox=bbox,
                domain="MATHEMATICS",
                original_crop=original_crop,
            )

        # 4. General expression sequence
        node = cls._parse_str_sequence(cleaned)
        if not node:
            return None

        spatial_rels = cls.extract_spatial_relationships_from_ast(node)
        return Formula2DResult(
            ast=node,
            latex=node.to_latex(),
            mathml=node.to_mathml(),
            plain_text=node.to_plain_text(),
            structured_expression=node.to_dict(),
            spatial_relationships=spatial_rels,
            bbox=bbox,
            domain=domain,
            original_crop=original_crop,
        )

    @classmethod
    def extract_spatial_relationships_from_ast(cls, node: FormulaNode) -> List[Dict[str, Any]]:
        """
        Derives explicit 2-D topological relationships:
        LEFT_OF, RIGHT_OF, ABOVE, BELOW, SUPERIOR_TO, SUBSCRIPT_OF, SUPERSCRIPT_OF,
        NUMERATOR_OF, DENOMINATOR_OF, RADICAND_OF, INSIDE, CONTAINS, OVER, UNDER
        from the hierarchical FormulaNode AST.
        """
        relations: List[Dict[str, Any]] = []

        def _traverse(cur: FormulaNode):
            ntype = cur.node_type
            if ntype == NodeType.FRACTION and len(cur.children) >= 2:
                num = cur.children[0].to_plain_text()
                den = cur.children[1].to_plain_text()
                relations.append({"relation": "NUMERATOR_OF", "source": num, "target": den})
                relations.append({"relation": "DENOMINATOR_OF", "source": den, "target": num})
                relations.append({"relation": "ABOVE", "source": num, "target": den})
                relations.append({"relation": "BELOW", "source": den, "target": num})
                relations.append({"relation": "OVER", "source": num, "target": den})
                relations.append({"relation": "UNDER", "source": den, "target": num})

            elif ntype == NodeType.SUBSCRIPT and len(cur.children) >= 2:
                base = cur.children[0].to_plain_text()
                sub = cur.children[1].to_plain_text()
                relations.append({"relation": "SUBSCRIPT_OF", "source": sub, "target": base})
                relations.append({"relation": "BELOW", "source": sub, "target": base})
                relations.append({"relation": "RIGHT_OF", "source": sub, "target": base})

            elif (ntype == NodeType.POWER or ntype == NodeType.SUPERSCRIPT) and len(cur.children) >= 2:
                base = cur.children[0].to_plain_text()
                sup = cur.children[1].to_plain_text()
                relations.append({"relation": "SUPERSCRIPT_OF", "source": sup, "target": base})
                relations.append({"relation": "SUPERIOR_TO", "source": sup, "target": base})
                relations.append({"relation": "ABOVE", "source": sup, "target": base})
                relations.append({"relation": "RIGHT_OF", "source": sup, "target": base})

            elif (ntype == NodeType.SQRT or ntype == NodeType.NTH_ROOT) and cur.children:
                rad = cur.children[0].to_plain_text()
                relations.append({"relation": "RADICAND_OF", "source": rad, "target": "√"})
                relations.append({"relation": "INSIDE", "source": rad, "target": "√"})
                relations.append({"relation": "UNDER", "source": rad, "target": "vinculum"})

            elif ntype == NodeType.PARENTHESES and cur.children:
                inner = cur.children[0].to_plain_text()
                relations.append({"relation": "INSIDE", "source": inner, "target": "()"})
                relations.append({"relation": "CONTAINS", "source": "()", "target": inner})

            elif (ntype == NodeType.MULTIPLY or ntype == NodeType.ADD or ntype == NodeType.EQUATION) and len(cur.children) >= 2:
                left = cur.children[0].to_plain_text()
                right = cur.children[1].to_plain_text()
                relations.append({"relation": "LEFT_OF", "source": left, "target": right})
                relations.append({"relation": "RIGHT_OF", "source": right, "target": left})
                relations.append({"relation": "NEXT_TO", "source": left, "target": right})

            for child in cur.children:
                _traverse(child)

        _traverse(node)
        return relations

    @classmethod
    def _parse_str_sequence(cls, text: str) -> Optional[FormulaNode]:
        cleaned = text.strip()
        if not cleaned:
            return None

        tokens = []
        depth = 0
        cur = []
        ops = []
        for ch in cleaned:
            if ch == '{':
                depth += 1
                cur.append(ch)
            elif ch == '}':
                depth = max(0, depth - 1)
                cur.append(ch)
            elif depth == 0 and ch in ('+', '-'):
                tokens.append("".join(cur).strip())
                ops.append(ch)
                cur = []
            else:
                cur.append(ch)
        if cur:
            tokens.append("".join(cur).strip())

        if len(tokens) > 1:
            term_nodes = [cls._parse_str_term(t) for t in tokens if t]
            if not term_nodes:
                return None
            root = term_nodes[0]
            if not root:
                root = FormulaNode(NodeType.NUMBER, value="1")
            for op, next_node in zip(ops, term_nodes[1:]):
                if not next_node:
                    continue
                if op == "+":
                    add_node = FormulaNode(NodeType.ADD)
                    add_node.add_child(root)
                    add_node.add_child(next_node)
                    root = add_node
                else:
                    sub_node = FormulaNode(NodeType.SUBTRACT)
                    sub_node.add_child(root)
                    sub_node.add_child(next_node)
                    root = sub_node
            return root

        return cls._parse_str_term(cleaned)

    @classmethod
    def _parse_str_term(cls, text: str) -> Optional[FormulaNode]:
        cleaned = text.strip()
        if not cleaned:
            return None

        # Parentheses / Left-Right wrapping: (n-1) or \left(...\right)
        if (cleaned.startswith("(") and cleaned.endswith(")")) or (cleaned.startswith(r"\left(") and cleaned.endswith(r"\right)")):
            if cleaned.startswith(r"\left("):
                inner = cleaned[len(r"\left("):-len(r"\right)")].strip()
            else:
                inner = cleaned[1:-1].strip()
            inner_node = cls._parse_str_sequence(inner)
            if inner_node:
                p_node = FormulaNode(NodeType.PARENTHESES)
                p_node.add_child(inner_node)
                return p_node

        # Cancellation: \cancel{...}
        cancel_match = re.match(r"^\\cancel\{(.+?)\}$", cleaned)
        if cancel_match:
            inner_node = cls._parse_str_term(cancel_match.group(1))
            if inner_node:
                node = FormulaNode(NodeType.CANCELLATION)
                node.add_child(inner_node)
                return node

        # Double Factorial: e.g. n!! or 10!!
        dfact_match = re.match(r"^(.+?)!!$", cleaned)
        if dfact_match:
            inner_node = cls._parse_str_term(dfact_match.group(1))
            if inner_node:
                node = FormulaNode(NodeType.DOUBLE_FACTORIAL)
                node.add_child(inner_node)
                return node

        # Factorial: e.g. 20!, n!, (n-1)!
        fact_match = re.match(r"^(.+?)!$", cleaned)
        if fact_match:
            inner_node = cls._parse_str_term(fact_match.group(1))
            if inner_node:
                node = FormulaNode(NodeType.FACTORIAL)
                node.add_child(inner_node)
                return node

        # Ellipsis
        if cleaned in ("...", "…", r"\cdots", r"\dots", r"\ldots"):
            return FormulaNode(NodeType.ELLIPSIS, attributes={"latex": r"\cdots"})

        # Vectors & Unit Vectors: \vec{x}, \hat{i}
        vec_match = re.match(r"^\\vec\{([a-zA-Z]+)\}$", cleaned)
        if vec_match:
            v_node = FormulaNode(NodeType.VECTOR, value=vec_match.group(1))
            v_node.add_child(FormulaNode(NodeType.VARIABLE, value=vec_match.group(1)))
            return v_node
        hat_match = re.match(r"^\\hat\{([a-zA-Z]+)\}$", cleaned)
        if hat_match:
            v_node = FormulaNode(NodeType.VECTOR, value=hat_match.group(1), attributes={"unit_vector": True})
            v_node.add_child(FormulaNode(NodeType.VARIABLE, value=hat_match.group(1)))
            return v_node

        # Scientific notation: 1.25 \times 10^{-5}
        sci_match = re.match(r"^(\d+(?:\.\d+)?)\s*(?:\\times|×|\*)\s*10\^\{?(-?\d+)\}?$", cleaned)
        if sci_match:
            from .structural_tree import ExpressionTreeBuilder
            return ExpressionTreeBuilder.build_scientific_notation(sci_match.group(1), sci_match.group(2))

        # Explicit multiplication: e.g. 20 \times 19 \times 18! or 6 \cdot 7 \cdot 8
        mult_split = re.split(r"\s*(?:\\times|\\cdot|×|·|\*)\s*", cleaned)
        if len(mult_split) > 1:
            mult_node = FormulaNode(NodeType.MULTIPLY, attributes={"implicit": False})
            for p in mult_split:
                child = cls._parse_str_term(p)
                if child:
                    mult_node.add_child(child)
            return mult_node

        # Combined Subscript and Superscript: x_1^2 or x_{1}^{2} or x^2_1
        sub_sup_match = re.match(r"^([a-zA-Zα-ωΑ-Ω]+)_\{?([0-9a-zA-Z]+)\}?\^\{?([0-9a-zA-Z\+\-]+)\}?$", cleaned)
        if sub_sup_match:
            base, sub, sup = sub_sup_match.group(1), sub_sup_match.group(2), sub_sup_match.group(3)
            sub_node = FormulaNode(NodeType.SUBSCRIPT)
            sub_node.add_child(FormulaNode(NodeType.VARIABLE, value=base))
            sub_node.add_child(FormulaNode(NodeType.NUMBER if sub.isdigit() else NodeType.VARIABLE, value=sub))
            pow_node = FormulaNode(NodeType.POWER)
            pow_node.add_child(sub_node)
            pow_node.add_child(FormulaNode(NodeType.NUMBER if sup.isdigit() else NodeType.VARIABLE, value=sup))
            return pow_node

        sup_sub_match = re.match(r"^([a-zA-Zα-ωΑ-Ω]+)\^\{?([0-9a-zA-Z\+\-]+)\}?_\{?([0-9a-zA-Z]+)\}?$", cleaned)
        if sup_sub_match:
            base, sup, sub = sup_sub_match.group(1), sup_sub_match.group(2), sup_sub_match.group(3)
            sub_node = FormulaNode(NodeType.SUBSCRIPT)
            sub_node.add_child(FormulaNode(NodeType.VARIABLE, value=base))
            sub_node.add_child(FormulaNode(NodeType.NUMBER if sub.isdigit() else NodeType.VARIABLE, value=sub))
            pow_node = FormulaNode(NodeType.POWER)
            pow_node.add_child(sub_node)
            pow_node.add_child(FormulaNode(NodeType.NUMBER if sup.isdigit() else NodeType.VARIABLE, value=sup))
            return pow_node

        # Chemical Ion with charge: e.g. Fe^{3+}, Fe^3+, SO_4^{2-}, SO4^2-
        ion_match = re.match(r"^([A-Z][a-z]?(?:_\{?\d+\}?|\d+)*)\^\{?(\d*[\+\-])\}?$", cleaned)
        if ion_match:
            base_chem, charge = ion_match.group(1), ion_match.group(2)
            base_node = cls._parse_str_term(base_chem) or FormulaNode(NodeType.VARIABLE, value=base_chem)
            from .structural_tree import ExpressionTreeBuilder
            return ExpressionTreeBuilder.build_chemical_ion(base_node, charge)

        # Chemical Compound: e.g. H_2O, H2O, C_6H_{12}O_6, C6H12O6
        chem_matches = re.findall(r"([A-Z][a-z]?)(?:_\{?(\d+)\}?|(\d+))?", cleaned)
        if chem_matches:
            reconstructed = "".join([f"{el}{f'_{{{s1}}}' if s1 else (s2 or '')}" for el, s1, s2 in chem_matches])
            clean_recon = reconstructed.replace('_', '').replace('{', '').replace('}', '')
            clean_orig = cleaned.replace('_', '').replace('{', '').replace('}', '')
            common_elements = {"H", "He", "Li", "Be", "B", "C", "N", "O", "F", "Ne", "Na", "Mg", "Al", "Si", "P", "S", "Cl", "Ar", "K", "Ca", "Fe", "Cu", "Zn", "Ag", "Au", "Pb", "Br", "I"}
            if clean_recon == clean_orig and any(s1 or s2 for _, s1, s2 in chem_matches) and all(el in common_elements for el, _, _ in chem_matches):
                components = [(el, s1 or s2 or None) for el, s1, s2 in chem_matches]
                from .structural_tree import ExpressionTreeBuilder
                return ExpressionTreeBuilder.build_chemical_compound(components)

        # Subscript: M_{1}, M_1, m_1, T_2
        sub_match = re.match(r"^([a-zA-Z]+)_\{?([0-9a-zA-Z]+)\}?$", cleaned)
        if sub_match:
            base, sub = sub_match.group(1), sub_match.group(2)
            node = FormulaNode(NodeType.SUBSCRIPT)
            node.add_child(FormulaNode(NodeType.VARIABLE, value=base))
            node.add_child(FormulaNode(NodeType.NUMBER if sub.isdigit() else NodeType.VARIABLE, value=sub))
            return node

        # Unicode subscript: M₁
        for sub_char, sub_val in cls.UNICODE_SUB_MAP.items():
            if sub_char in cleaned:
                base = cleaned.replace(sub_char, "")
                node = FormulaNode(NodeType.SUBSCRIPT)
                node.add_child(FormulaNode(NodeType.VARIABLE, value=base))
                node.add_child(FormulaNode(NodeType.NUMBER, value=sub_val))
                return node

        # Superscript: x^{2}, x^2
        sup_match = re.match(r"^([a-zA-Z0-9]+)\^\{?([0-9a-zA-Z\+\-]+)\}?$", cleaned)
        if sup_match:
            base, sup = sup_match.group(1), sup_match.group(2)
            node = FormulaNode(NodeType.POWER)
            node.add_child(FormulaNode(NodeType.NUMBER if base.isdigit() else NodeType.VARIABLE, value=base))
            node.add_child(FormulaNode(NodeType.NUMBER if sup.isdigit() else NodeType.VARIABLE, value=sup))
            return node

        # Unicode superscript: x²
        for sup_char, sup_val in cls.UNICODE_SUP_MAP.items():
            if sup_char in cleaned:
                base = cleaned.replace(sup_char, "")
                node = FormulaNode(NodeType.POWER)
                node.add_child(FormulaNode(NodeType.VARIABLE, value=base))
                node.add_child(FormulaNode(NodeType.NUMBER, value=sup_val))
                return node

        if cleaned.isdigit():
            return FormulaNode(NodeType.NUMBER, value=cleaned)
        greek_names = {
            "\\theta": r"\theta", "theta": r"\theta", "θ": r"\theta",
            "\\alpha": r"\alpha", "alpha": r"\alpha", "α": r"\alpha",
            "\\beta": r"\beta", "beta": r"\beta", "β": r"\beta",
            "\\gamma": r"\gamma", "gamma": r"\gamma", "γ": r"\gamma",
            "\\delta": r"\delta", "delta": r"\delta", "δ": r"\delta",
            "\\mu": r"\mu", "mu": r"\mu", "μ": r"\mu",
            "\\lambda": r"\lambda", "lambda": r"\lambda", "λ": r"\lambda",
            "\\omega": r"\omega", "omega": r"\omega", "ω": r"\omega",
            "\\pi": r"\pi", "pi": r"\pi", "π": r"\pi",
            "\\sigma": r"\sigma", "sigma": r"\sigma", "σ": r"\sigma",
        }
        if cleaned in greek_names:
            return FormulaNode(NodeType.GREEK_SYMBOL, value=greek_names[cleaned])
        if cleaned in ("kg", "g", "N", "m", "s", "cm", "mm"):
            return FormulaNode(NodeType.UNIT, value=cleaned)

        # Multi-factor term e.g. "m a" or "2 m" or "6! 4!"
        parts = cleaned.split()
        if len(parts) > 1:
            mult = FormulaNode(NodeType.MULTIPLY, attributes={"implicit": True})
            for p in parts:
                child = cls._parse_str_term(p)
                if child:
                    mult.add_child(child)
            return mult

        return FormulaNode(NodeType.VARIABLE, value=cleaned)

    @classmethod
    def extract_formula_objects_from_text(
        cls,
        text: str,
        bbox: Tuple[float, float, float, float] = (0, 0, 0, 0),
        domain: str = "PHYSICS",
        original_crop: str = "",
    ) -> List[Dict[str, Any]]:
        """
        Scans a text block (e.g. question stem, option body) and extracts all embedded
        mathematical formula objects without flattening them.
        """
        if not text:
            return []

        formula_objects: List[Dict[str, Any]] = []
        seen_keys = set()

        # 0. Complete inverse trig and trigonometric expressions:
        # e.g. \tan^{-1}\left(\frac{4}{5}\right), \sin^{-1}(1/2), \tan^{-1}(m), \tan^{-1}\left(\frac{5}{4}\right)
        trig_exprs = re.findall(
            r"(?:\\)?(?:sin|cos|tan|cot|sec|csc|cosec|arctan|arcsin|arccos)(?:\^\{?[-–]?\d+\}?|[-–]?\d+)?\s*(?:\\left\s*\(|\()?\s*(?:\\frac\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}|[a-zA-Z0-9_\-\.\/]+)\s*(?:\\right\s*\)|\))?",
            text, re.IGNORECASE
        )
        for te in trig_exprs:
            te_clean = te.strip().strip("$")
            if te_clean and te_clean not in seen_keys:
                seen_keys.add(te_clean)
                res = cls.parse_expression(te_clean, bbox=bbox, domain=domain, original_crop=original_crop)
                if res:
                    formula_objects.append(res.to_formula_object())

        # 1. Complex fraction expressions: \left( \frac{...}{...} \right) [A-Za-z0-9]?
        frac_exprs = re.findall(
            r"(?:\\left\s*\(|\()?\s*\\frac\s*\{[^{}]+(?:\{[^{}]*\}[^{}]*)*\}\s*\{[^{}]+(?:\{[^{}]*\}[^{}]*)*\}(?:\s*\\right\s*\)|\))?\s*[a-zA-Z0-9\\]?",
            text
        )
        for fe in frac_exprs:
            fe_clean = fe.strip()
            # If already captured as part of a larger formula (e.g. inside \tan^{-1}\left(\frac{4}{5}\right))
            if any(fe_clean in k for k in seen_keys):
                continue
            if fe_clean and fe_clean not in seen_keys:
                seen_keys.add(fe_clean)
                res = cls.parse_expression(fe_clean, bbox=bbox, domain=domain, original_crop=original_crop)
                if res:
                    formula_objects.append(res.to_formula_object())

        # 2. Radical expressions: \sqrt{...} or 10\sqrt{3}
        sqrt_exprs = re.findall(r"(?:\d+\s*)?\\sqrt(?:\[\d+\])?\{[^{}]+(?:\{[^{}]*\}[^{}]*)*\}", text)
        for se in sqrt_exprs:
            se_clean = se.strip()
            if se_clean and se_clean not in seen_keys:
                seen_keys.add(se_clean)
                res = cls.parse_expression(se_clean, bbox=bbox, domain=domain, original_crop=original_crop)
                if res:
                    formula_objects.append(res.to_formula_object())

        # 3. Equations: e.g. F = ma, E = mc^2, v = u + at, m_1 = 10 kg
        eq_exprs = re.findall(r"\b[A-Za-z](?:_[a-zA-Z0-9{}]+)?\s*=\s*[^,;\n]+", text)
        for ee in eq_exprs:
            ee_clean = ee.strip()
            if ee_clean and ee_clean not in seen_keys:
                seen_keys.add(ee_clean)
                res = cls.parse_expression(ee_clean, bbox=bbox, domain=domain, original_crop=original_crop)
                if res:
                    formula_objects.append(res.to_formula_object())

        # 4. Subscript variables: M_{1}, M_{2}, M_{3}, m_{1}, T_{2}, M₁, M₂, etc.
        # Avoid promoting isolated diagram labels (e.g. T_2) into standalone formulas when real formulas exist
        sub_vars = re.findall(r"\b[A-Za-z]_\{?[0-9a-zA-Z]+\}?|[A-Za-z][₀-₉]+", text)
        for sv in sub_vars:
            sv_clean = sv.strip()
            if len(formula_objects) > 0 and len(sv_clean) <= 6:
                continue
            if sv_clean and sv_clean not in seen_keys:
                seen_keys.add(sv_clean)
                res = cls.parse_expression(sv_clean, bbox=bbox, domain=domain, original_crop=original_crop)
                if res:
                    formula_objects.append(res.to_formula_object())

        # 5. Superscript variables: x^{2}, x², 10^{-3}
        sup_vars = re.findall(r"\b[A-Za-z0-9]+\^\{?[0-9a-zA-Z\+\-]+\}?|[A-Za-z][⁰-⁹⁺⁻]+", text)
        for su in sup_vars:
            su_clean = su.strip()
            # If already captured as part of a larger formula (e.g. \tan^{-1})
            if any(su_clean in k or su_clean.replace("\\", "") in k.replace("\\", "") for k in seen_keys):
                continue
            if len(formula_objects) > 0 and len(su_clean) <= 6:
                continue
            if su_clean and su_clean not in seen_keys:
                seen_keys.add(su_clean)
                res = cls.parse_expression(su_clean, bbox=bbox, domain=domain, original_crop=original_crop)
                if res:
                    formula_objects.append(res.to_formula_object())

        return formula_objects


# Singleton instance
spatial_math_engine = SpatialMathEngine()
