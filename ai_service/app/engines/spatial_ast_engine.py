"""
2D Spatial Math Structure Engine
==================================
Parses LaTeX (from any recognition engine) into a full structural AST.
Handles: subscripts, superscripts, fractions, roots, integrals, summations,
products, limits, matrices, vectors, absolute values, and nesting.

This is a STRUCTURAL parser — it never flattens 2D structures to 1D text.

Key guarantees:
  - x^2 → SUPERSCRIPT(x, 2)     NOT "x2"
  - M_1 → SUBSCRIPT(M, 1)       NOT "M1"
  - \frac{a}{b} → FRACTION(a,b) NOT "a/b"
  - \int_0^1 → INTEGRAL(lower=0, upper=1)
  - Matrices preserve row×column structure
"""

from __future__ import annotations

import re
import logging
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Union

logger = logging.getLogger("spatial_ast")


# ─── Node Types ──────────────────────────────────────────────────────────────

class NT(str, Enum):
    ROOT          = "ROOT"
    NUMBER        = "NUMBER"
    VARIABLE      = "VARIABLE"
    CONSTANT      = "CONSTANT"
    OPERATOR      = "OPERATOR"
    GREEK         = "GREEK"
    SUBSCRIPT     = "SUBSCRIPT"
    SUPERSCRIPT   = "SUPERSCRIPT"
    FRACTION      = "FRACTION"
    ROOT_NODE     = "ROOT_NODE"      # √
    POWER         = "POWER"
    FUNCTION      = "FUNCTION"
    INTEGRAL      = "INTEGRAL"
    SUM           = "SUM"
    PRODUCT       = "PRODUCT"
    LIMIT         = "LIMIT"
    MATRIX        = "MATRIX"
    VECTOR        = "VECTOR"
    SET           = "SET"
    LOGIC         = "LOGIC"
    EQUATION      = "EQUATION"
    INEQUALITY    = "INEQUALITY"
    UNIT          = "UNIT"
    PARENTHESIS   = "PARENTHESIS"
    BRACKET       = "BRACKET"
    ABSOLUTE_VALUE= "ABSOLUTE_VALUE"
    ADD           = "ADD"
    SUBTRACT      = "SUBTRACT"
    MULTIPLY      = "MULTIPLY"
    DIVIDE        = "DIVIDE"
    RELATION      = "RELATION"
    TEXT          = "TEXT"
    UNKNOWN       = "UNKNOWN"
    FACTORIAL     = "FACTORIAL"
    DOUBLE_FACTORIAL = "DOUBLE_FACTORIAL"
    ELLIPSIS      = "ELLIPSIS"
    CANCELLATION  = "CANCELLATION"
    DERIVATION    = "DERIVATION"
    DERIVATION_STEP = "DERIVATION_STEP"
    TRANSFORMATION= "TRANSFORMATION"
    BINOMIAL      = "BINOMIAL"
    DOUBLE_INTEGRAL = "DOUBLE_INTEGRAL"
    TRIPLE_INTEGRAL = "TRIPLE_INTEGRAL"
    CONTOUR_INTEGRAL = "CONTOUR_INTEGRAL"



@dataclass
class ASTNode:
    node_type: NT
    value: str = ""
    children: List["ASTNode"] = field(default_factory=list)
    attributes: Dict[str, Any] = field(default_factory=dict)

    # Spatial metadata
    confidence: float = 1.0
    bbox: Optional[tuple] = None

    def add(self, child: "ASTNode") -> "ASTNode":
        self.children.append(child)
        return self

    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": self.node_type.value,
            "value": self.value,
            "attributes": self.attributes,
            "confidence": self.confidence,
            "children": [c.to_dict() for c in self.children],
        }

    def to_latex(self) -> str:
        return ASTToLatex.convert(self)

    def to_mathml(self) -> str:
        return ASTToMathML.convert(self)

    def to_plain(self) -> str:
        return ASTToPlain.convert(self)


# ─── LaTeX Tokenizer ─────────────────────────────────────────────────────────

_GREEK_COMMANDS = {
    r"\alpha": "α", r"\beta": "β", r"\gamma": "γ", r"\delta": "δ",
    r"\epsilon": "ε", r"\varepsilon": "ε", r"\zeta": "ζ", r"\eta": "η",
    r"\theta": "θ", r"\vartheta": "θ", r"\iota": "ι", r"\kappa": "κ",
    r"\lambda": "λ", r"\mu": "μ", r"\nu": "ν", r"\xi": "ξ",
    r"\pi": "π", r"\varpi": "π", r"\rho": "ρ", r"\varrho": "ρ",
    r"\sigma": "σ", r"\varsigma": "σ", r"\tau": "τ", r"\upsilon": "υ",
    r"\phi": "φ", r"\varphi": "φ", r"\chi": "χ", r"\psi": "ψ", r"\omega": "ω",
    r"\Gamma": "Γ", r"\Delta": "Δ", r"\Theta": "Θ", r"\Lambda": "Λ",
    r"\Xi": "Ξ", r"\Pi": "Π", r"\Sigma": "Σ", r"\Upsilon": "Υ",
    r"\Phi": "Φ", r"\Psi": "Ψ", r"\Omega": "Ω",
}

_MATH_FUNC_NAMES = {
    "sin", "cos", "tan", "cot", "sec", "csc",
    "arcsin", "arccos", "arctan",
    "sinh", "cosh", "tanh",
    "log", "ln", "exp",
    "lim", "max", "min", "sup", "inf", "det", "tr",
    "gcd", "lcm", "mod",
    "Re", "Im",
}


def _tokenize(latex: str) -> List[str]:
    """
    Tokenize a LaTeX string into meaningful tokens:
    commands (\\frac etc.), braces, operators, numbers, letters.
    """
    pattern = re.compile(
        r"\\[a-zA-Z]+"         # LaTeX commands
        r"|\\[^a-zA-Z]"        # Single-char escapes \\{ \\}
        r"|\d+\.?\d*"          # Numbers
        r"|[a-zA-Z]+"          # Letters (function names, variables)
        r"|[_^{}()[\]|]"       # Structural tokens
        r"|[+\-*/=<>!,;:&%#@·×…⋅]" # Operators and symbols
        r"|[^\s]"              # Any other non-whitespace
    )
    return pattern.findall(latex)


# ─── LaTeX → AST Parser ──────────────────────────────────────────────────────

class LatexParser:
    """
    Recursive descent parser: LaTeX string → ASTNode tree.
    Handles all mathematical structures required by the spec.
    """

    def __init__(self, latex: str):
        raw = latex.strip()
        # Strip display math delimiters
        for delim_open, delim_close in [("\\[", "\\]"), ("$$", "$$"), ("$", "$")]:
            if delim_open and delim_close and raw.startswith(delim_open) and raw.endswith(delim_close) and len(raw) > len(delim_open) + len(delim_close):
                raw = raw[len(delim_open):-len(delim_close)].strip()
                break
        self.tokens = _tokenize(raw)
        self.pos = 0

    def peek(self) -> Optional[str]:
        return self.tokens[self.pos] if self.pos < len(self.tokens) else None

    def consume(self) -> Optional[str]:
        if self.pos < len(self.tokens):
            tok = self.tokens[self.pos]
            self.pos += 1
            return tok
        return None

    def parse(self) -> ASTNode:
        root = ASTNode(NT.ROOT)
        exprs = []
        while self.pos < len(self.tokens):
            node = self._parse_expr()
            if node:
                exprs.append(node)

        exprs = self._group_fractions(exprs)
        exprs = self._group_derivations(exprs)
        for e in exprs:
            root.add(e)
        return root

    def _group_fractions(self, nodes: List[ASTNode]) -> List[ASTNode]:
        result = []
        i = 0
        while i < len(nodes):
            if i + 2 < len(nodes) and nodes[i+1].node_type == NT.OPERATOR and nodes[i+1].value == "/":
                frac = ASTNode(NT.FRACTION)
                frac.attributes["numerator"] = nodes[i].to_dict()
                frac.attributes["denominator"] = nodes[i+2].to_dict()
                frac.add(nodes[i])
                frac.add(nodes[i+2])
                result.append(frac)
                i += 3
            else:
                result.append(nodes[i])
                i += 1
        return result

    def _group_derivations(self, nodes: List[ASTNode]) -> List[ASTNode]:
        eq_indices = [i for i, ch in enumerate(nodes) if ch.node_type == NT.OPERATOR and ch.value == "="]
        if len(eq_indices) >= 2:
            steps = []
            last_idx = 0
            for eq_idx in eq_indices:
                step_nodes = nodes[last_idx:eq_idx]
                if step_nodes:
                    step_expr = step_nodes[0] if len(step_nodes) == 1 else ASTNode(NT.ROOT, children=step_nodes)
                    steps.append(step_expr)
                last_idx = eq_idx + 1
            final_nodes = nodes[last_idx:]
            if final_nodes:
                step_expr = final_nodes[0] if len(final_nodes) == 1 else ASTNode(NT.ROOT, children=final_nodes)
                steps.append(step_expr)

            if len(steps) >= 2:
                derivation_node = ASTNode(NT.DERIVATION)
                for idx, st in enumerate(steps):
                    trans = "EQUAL"
                    if idx > 0:
                        prev_str = ASTToLatex.convert(steps[idx - 1])
                        curr_str = ASTToLatex.convert(st)
                        if r"\cancel" in curr_str or r"\cancel" in prev_str:
                            trans = "CANCEL"
                        elif r"\times" in curr_str and r"\times" not in prev_str:
                            trans = "EXPAND"
                        elif len(curr_str) < len(prev_str) and not any(d in curr_str for d in ("+", "-", r"\times", r"\frac")):
                            trans = "EVALUATE"
                        elif len(curr_str) < len(prev_str):
                            trans = "SIMPLIFY"
                    step_node = ASTNode(NT.DERIVATION_STEP, attributes={"step_index": idx, "transformation": trans})
                    step_node.add(st)
                    derivation_node.add(step_node)
                return [derivation_node]
        elif len(eq_indices) == 1:
            eq_idx = eq_indices[0]
            left_nodes = nodes[:eq_idx]
            right_nodes = nodes[eq_idx + 1:]
            if left_nodes and right_nodes:
                left_node = left_nodes[0] if len(left_nodes) == 1 else ASTNode(NT.ROOT, children=left_nodes)
                right_node = right_nodes[0] if len(right_nodes) == 1 else ASTNode(NT.ROOT, children=right_nodes)
                eq_node = ASTNode(NT.EQUATION, attributes={"operator": "="})
                eq_node.add(left_node)
                eq_node.add(right_node)
                return [eq_node]
        return nodes

    # ── Expression level ──────────────────────────────────────────────────────

    def _parse_expr(self) -> Optional[ASTNode]:
        """Parse a single expression unit (atom + optional sub/superscript/factorial)."""
        atom = self._parse_atom()
        if atom is None:
            self.consume()  # skip unknown token
            return None

        # Check for subscript / superscript / factorial postfix
        while self.peek() in ("_", "^", "!"):
            if self.peek() == "!":
                self.consume()
                if self.peek() == "!":
                    self.consume()
                    fact = ASTNode(NT.DOUBLE_FACTORIAL)
                    fact.add(atom)
                    atom = fact
                else:
                    fact = ASTNode(NT.FACTORIAL)
                    fact.add(atom)
                    atom = fact
            elif self.peek() == "_":
                op = self.consume()
                arg = self._parse_brace_or_atom()
                node = ASTNode(NT.SUBSCRIPT)
                node.add(atom)
                node.add(arg or ASTNode(NT.UNKNOWN))
                atom = node
            elif self.peek() == "^":
                op = self.consume()
                arg = self._parse_brace_or_atom()
                node = ASTNode(NT.SUPERSCRIPT)
                node.add(atom)
                node.add(arg or ASTNode(NT.UNKNOWN))
                atom = node

        return atom

    def _parse_atom(self) -> Optional[ASTNode]:
        tok = self.peek()
        if tok is None:
            return None

        # ── LaTeX commands ──────────────────────────────────────────────────
        if tok.startswith("\\"):
            return self._parse_command()

        # ── Braced group ────────────────────────────────────────────────────
        if tok == "{":
            return self._parse_braced_group()

        # ── Numbers ─────────────────────────────────────────────────────────
        if re.match(r"^\d", tok):
            self.consume()
            return ASTNode(NT.NUMBER, value=tok)

        # ── Letters / identifiers ────────────────────────────────────────────
        if re.match(r"^[a-zA-Z]+$", tok):
            self.consume()
            if tok in _MATH_FUNC_NAMES:
                return ASTNode(NT.FUNCTION, value=tok)
            if len(tok) == 1:
                return ASTNode(NT.VARIABLE, value=tok)
            # Multi-letter: could be function or text
            return ASTNode(NT.FUNCTION, value=tok)

        # ── Ellipsis ─────────────────────────────────────────────────────────
        if tok in ("...", "…"):
            self.consume()
            return ASTNode(NT.ELLIPSIS, value="...", attributes={"latex": r"\cdots"})

        # ── Multiplication symbols ───────────────────────────────────────────
        if tok in ("×", "·", "⋅", "*"):
            self.consume()
            latex_sym = r"\times" if tok == "×" else (r"\cdot" if tok in ("·", "⋅") else r"\ast")
            return ASTNode(NT.MULTIPLY, value=latex_sym, attributes={"latex": latex_sym, "symbol": tok})

        # ── Operators ───────────────────────────────────────────────────────
        if tok in "+-*/=<>!":
            self.consume()
            return ASTNode(NT.OPERATOR, value=tok)

        if tok == "|":
            return self._parse_absolute_value()

        if tok == "(":
            return self._parse_parenthesized()


        if tok == "[":
            return self._parse_bracketed()

        # Other tokens: skip
        self.consume()
        return ASTNode(NT.UNKNOWN, value=tok)

    def _parse_command(self) -> Optional[ASTNode]:
        cmd = self.consume()
        if cmd is None:
            return None

        # ── Greek ────────────────────────────────────────────────────────────
        if cmd in _GREEK_COMMANDS:
            return ASTNode(NT.GREEK, value=_GREEK_COMMANDS[cmd], attributes={"latex": cmd})

        # ── Fraction ─────────────────────────────────────────────────────────
        if cmd == r"\frac":
            num = self._parse_brace_or_atom()
            den = self._parse_brace_or_atom()
            n = ASTNode(NT.FRACTION)
            n.attributes["numerator"] = num.to_dict() if num else {}
            n.attributes["denominator"] = den.to_dict() if den else {}
            n.add(num or ASTNode(NT.UNKNOWN))
            n.add(den or ASTNode(NT.UNKNOWN))
            return n

        # ── Roots ────────────────────────────────────────────────────────────
        if cmd in (r"\sqrt", r"\cbrt", r"\sqrt[3]"):
            # Optional degree arg [n]
            degree = None
            if self.peek() == "[":
                self.consume()  # [
                degree_node = self._parse_until("]")
                self.consume()  # ]
                degree = degree_node
            radicand = self._parse_brace_or_atom()
            n = ASTNode(NT.ROOT_NODE)
            n.attributes["degree"] = degree.to_dict() if degree else {"type": "NUMBER", "value": "2"}
            n.add(radicand or ASTNode(NT.UNKNOWN))
            return n

        # ── Integral ─────────────────────────────────────────────────────────
        if cmd in (r"\int", r"\iint", r"\iiint", r"\oint"):
            n = ASTNode(NT.INTEGRAL, attributes={"variant": cmd})
            lower = upper = None
            if self.peek() == "_":
                self.consume()
                lower = self._parse_brace_or_atom()
            if self.peek() == "^":
                self.consume()
                upper = self._parse_brace_or_atom()
            if lower:
                n.attributes["lowerLimit"] = lower.to_dict()
                n.add(lower)
            if upper:
                n.attributes["upperLimit"] = upper.to_dict()
                n.add(upper)
            # Integrand: collect until \,dx or end of expression
            integrand = self._parse_expr()
            if integrand:
                n.attributes["integrand"] = integrand.to_dict()
                n.add(integrand)
            return n

        # ── Summation ────────────────────────────────────────────────────────
        if cmd in (r"\sum", r"\Sigma"):
            n = ASTNode(NT.SUM)
            if self.peek() == "_":
                self.consume()
                lower = self._parse_brace_or_atom()
                if lower:
                    n.attributes["lower"] = lower.to_dict()
                    n.add(lower)
            if self.peek() == "^":
                self.consume()
                upper = self._parse_brace_or_atom()
                if upper:
                    n.attributes["upper"] = upper.to_dict()
                    n.add(upper)
            expr = self._parse_expr()
            if expr:
                n.attributes["expression"] = expr.to_dict()
                n.add(expr)
            return n

        # ── Product ──────────────────────────────────────────────────────────
        if cmd in (r"\prod", r"\Pi"):
            n = ASTNode(NT.PRODUCT)
            if self.peek() == "_":
                self.consume()
                lower = self._parse_brace_or_atom()
                if lower:
                    n.attributes["lower"] = lower.to_dict()
                    n.add(lower)
            if self.peek() == "^":
                self.consume()
                upper = self._parse_brace_or_atom()
                if upper:
                    n.attributes["upper"] = upper.to_dict()
                    n.add(upper)
            return n

        # ── Limit ────────────────────────────────────────────────────────────
        if cmd == r"\lim":
            n = ASTNode(NT.LIMIT)
            if self.peek() == "_":
                self.consume()
                var_expr = self._parse_brace_or_atom()
                if var_expr:
                    n.attributes["approach"] = var_expr.to_dict()
                    n.add(var_expr)
            return n

        # ── Vector ───────────────────────────────────────────────────────────
        if cmd in (r"\vec", r"\overrightarrow"):
            arg = self._parse_brace_or_atom()
            n = ASTNode(NT.VECTOR)
            n.add(arg or ASTNode(NT.UNKNOWN))
            return n

        # ── Matrix / begin-end blocks ─────────────────────────────────────────
        if cmd == r"\begin":
            env = self._read_brace_content()
            return self._parse_environment(env)

        # ── Absolute value / norm ─────────────────────────────────────────────
        if cmd in (r"\left", r"\right"):
            next_tok = self.peek()
            if next_tok == "|":
                self.consume()
                return self._parse_absolute_value()
            # Just consume the delimiter marker
            return self._parse_expr()

        # ── Partial / nabla ──────────────────────────────────────────────────
        if cmd in (r"\partial", r"\nabla", r"\infty"):
            return ASTNode(NT.OPERATOR, value=cmd, attributes={"latex": cmd})

        # ── Text / mathrm ────────────────────────────────────────────────────
        if cmd in (r"\text", r"\mathrm", r"\mathbf", r"\mathit", r"\mathbb"):
            arg = self._parse_brace_or_atom()
            n = ASTNode(NT.TEXT, value=arg.value if arg else "")
            return n

        # ── Multiplication ───────────────────────────────────────────────────
        if cmd in (r"\times", r"\cdot", r"\ast", r"\bullet"):
            return ASTNode(NT.MULTIPLY, value=cmd, attributes={"latex": cmd})

        # ── Ellipsis ─────────────────────────────────────────────────────────
        if cmd in (r"\dots", r"\cdots", r"\ldots", r"\vdots", r"\ddots"):
            return ASTNode(NT.ELLIPSIS, value="...", attributes={"latex": cmd})

        # ── Cancellation ─────────────────────────────────────────────────────
        if cmd in (r"\cancel", r"\bcancel", r"\xcancel", r"\sout"):
            inner = self._parse_brace_or_atom()
            node = ASTNode(NT.CANCELLATION, attributes={"variant": cmd})
            node.add(inner or ASTNode(NT.UNKNOWN))
            return node

        # ── Binomial ─────────────────────────────────────────────────────────
        if cmd in (r"\binom", r"\dbinom", r"\tbinom"):
            n_node = self._parse_brace_or_atom()
            k_node = self._parse_brace_or_atom()
            node = ASTNode(NT.BINOMIAL)
            node.add(n_node or ASTNode(NT.UNKNOWN))
            node.add(k_node or ASTNode(NT.UNKNOWN))
            return node

        # ── Multiple integrals ────────────────────────────────────────────────
        if cmd == r"\iint":
            expr = self._parse_expr()
            node = ASTNode(NT.DOUBLE_INTEGRAL, attributes={"variant": r"\iint"})
            if expr:
                node.add(expr)
            return node

        if cmd == r"\iiint":
            expr = self._parse_expr()
            node = ASTNode(NT.TRIPLE_INTEGRAL, attributes={"variant": r"\iiint"})
            if expr:
                node.add(expr)
            return node

        # ── Known operators ──────────────────────────────────────────────────
        if cmd in (r"\pm", r"\mp", r"\div",
                   r"\leq", r"\geq", r"\neq", r"\approx", r"\equiv",
                   r"\in", r"\notin", r"\subset", r"\subseteq",
                   r"\cup", r"\cap", r"\emptyset",
                   r"\forall", r"\exists",
                   r"\to", r"\rightarrow", r"\leftarrow",
                   r"\implies", r"\iff", r"\perp", r"\parallel",
                   r"\angle", r"\triangle"):
            return ASTNode(NT.OPERATOR, value=cmd, attributes={"latex": cmd})

        # ── Unknown command — keep as-is ─────────────────────────────────────
        return ASTNode(NT.UNKNOWN, value=cmd)

    # ── Environment parser (matrix, cases, etc.) ──────────────────────────────

    def _parse_environment(self, env: str) -> ASTNode:
        if env in ("align", "aligned", "gather", "split", "eqnarray", "align*"):
            return self._parse_aligned_derivation(env)

        matrix_envs = {"matrix", "pmatrix", "bmatrix", "vmatrix", "Bmatrix", "Vmatrix", "cases"}
        if env in matrix_envs:
            return self._parse_matrix_env(env)
        # Unknown environment: collect raw until \end{...}
        raw = []
        while self.pos < len(self.tokens):
            tok = self.consume()
            if tok == r"\end":
                self._read_brace_content()
                break
            raw.append(tok or "")
        return ASTNode(NT.UNKNOWN, value=" ".join(raw))

    def _parse_aligned_derivation(self, env: str) -> ASTNode:
        derivation_node = ASTNode(NT.DERIVATION, attributes={"env": env})
        current_step_tokens: List[str] = []
        step_idx = 0

        def flush_step():
            nonlocal step_idx
            step_latex = "".join(current_step_tokens).strip()
            step_latex = step_latex.replace("&", "").strip()
            if step_latex:
                p = LatexParser(step_latex)
                parsed = p.parse()
                trans = "EQUAL"
                if step_idx > 0 and derivation_node.children:
                    prev_step_str = derivation_node.children[-1].to_latex()
                    if r"\cancel" in step_latex or r"\cancel" in prev_step_str:
                        trans = "CANCEL"
                    elif r"\times" in step_latex and r"\times" not in prev_step_str:
                        trans = "EXPAND"
                    elif len(step_latex) < len(prev_step_str):
                        trans = "SIMPLIFY"
                step_node = ASTNode(NT.DERIVATION_STEP, attributes={"step_index": step_idx, "transformation": trans})
                step_node.add(parsed)
                derivation_node.add(step_node)
                step_idx += 1
            current_step_tokens.clear()

        while self.pos < len(self.tokens):
            tok = self.peek()
            if tok == r"\end":
                self.consume()
                self._read_brace_content()
                break
            elif tok == r"\\":
                self.consume()
                flush_step()
            else:
                current_step_tokens.append(self.consume() or "")
        flush_step()
        return derivation_node


    def _parse_matrix_env(self, env: str) -> ASTNode:
        """Parse matrix cells separated by & and rows by \\\\."""
        mat = ASTNode(NT.MATRIX, attributes={"env": env, "rows": [], "cols": 0})
        current_row: List[Dict] = []
        current_cell_tokens: List[str] = []

        def flush_cell():
            cell_latex = "".join(current_cell_tokens).strip()
            p = LatexParser(cell_latex)
            cell_ast = p.parse()
            current_row.append(cell_ast.to_dict())
            current_cell_tokens.clear()

        def flush_row():
            if current_cell_tokens:
                flush_cell()
            if current_row:
                mat.attributes["rows"].append(list(current_row))
                if len(current_row) > mat.attributes["cols"]:
                    mat.attributes["cols"] = len(current_row)
                current_row.clear()

        while self.pos < len(self.tokens):
            tok = self.peek()
            if tok == r"\end":
                self.consume()
                self._read_brace_content()
                break
            elif tok == r"\\":
                self.consume()
                flush_row()
            elif tok == "&":
                self.consume()
                flush_cell()
            else:
                current_cell_tokens.append(self.consume() or "")

        flush_row()
        mat.attributes["num_rows"] = len(mat.attributes["rows"])
        return mat

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _parse_braced_group(self) -> ASTNode:
        """Parse {content} as a grouped node."""
        self.consume()  # {
        group = ASTNode(NT.PARENTHESIS)
        while self.pos < len(self.tokens) and self.peek() != "}":
            child = self._parse_expr()
            if child:
                group.add(child)
        self.consume()  # }
        # If single child, unwrap
        if len(group.children) == 1:
            return group.children[0]
        return group

    def _parse_brace_or_atom(self) -> Optional[ASTNode]:
        if self.peek() == "{":
            return self._parse_braced_group()
        return self._parse_expr()

    def _read_brace_content(self) -> str:
        """Read {content} and return content string."""
        if self.peek() == "{":
            self.consume()
        parts = []
        depth = 1
        while self.pos < len(self.tokens):
            tok = self.consume()
            if tok == "{":
                depth += 1
                parts.append(tok)
            elif tok == "}":
                depth -= 1
                if depth == 0:
                    break
                parts.append(tok)
            else:
                parts.append(tok or "")
        return "".join(parts)

    def _parse_until(self, stop: str) -> ASTNode:
        group = ASTNode(NT.ROOT)
        while self.pos < len(self.tokens) and self.peek() != stop:
            child = self._parse_expr()
            if child:
                group.add(child)
        return group

    def _parse_absolute_value(self) -> ASTNode:
        # peek is |
        self.consume()  # first |
        inner = ASTNode(NT.ABSOLUTE_VALUE)
        depth = 1
        while self.pos < len(self.tokens):
            if self.peek() == "|":
                depth -= 1
                self.consume()
                if depth == 0:
                    break
            child = self._parse_expr()
            if child:
                inner.add(child)
        return inner

    def _parse_parenthesized(self) -> ASTNode:
        self.consume()  # (
        inner = ASTNode(NT.PARENTHESIS)
        while self.pos < len(self.tokens) and self.peek() != ")":
            child = self._parse_expr()
            if child:
                inner.add(child)
        self.consume()  # )
        return inner

    def _parse_bracketed(self) -> ASTNode:
        self.consume()  # [
        inner = ASTNode(NT.BRACKET)
        while self.pos < len(self.tokens) and self.peek() != "]":
            child = self._parse_expr()
            if child:
                inner.add(child)
        self.consume()  # ]
        return inner


# ─── AST → LaTeX ─────────────────────────────────────────────────────────────

class ASTToLatex:
    @classmethod
    def convert(cls, node: ASTNode) -> str:
        t = node.node_type
        c = node.children

        if t == NT.ROOT:
            return " ".join(cls.convert(ch) for ch in c if ch)
        if t in (NT.NUMBER, NT.VARIABLE, NT.CONSTANT, NT.TEXT, NT.UNKNOWN):
            return node.value
        if t == NT.GREEK:
            return node.attributes.get("latex", node.value)
        if t == NT.OPERATOR:
            return node.attributes.get("latex", node.value)
        if t == NT.FUNCTION:
            return f"\\{node.value}" if node.value in _MATH_FUNC_NAMES else node.value
        if t == NT.SUBSCRIPT and len(c) >= 2:
            return f"{cls.convert(c[0])}_{{{cls.convert(c[1])}}}"
        if t == NT.SUPERSCRIPT and len(c) >= 2:
            return f"{cls.convert(c[0])}^{{{cls.convert(c[1])}}}"
        if t == NT.FRACTION and len(c) >= 2:
            return f"\\frac{{{cls.convert(c[0])}}}{{{cls.convert(c[1])}}}"
        if t == NT.ROOT_NODE and len(c) >= 1:
            deg = node.attributes.get("degree", {}).get("value", "2")
            if deg == "2":
                return f"\\sqrt{{{cls.convert(c[0])}}}"
            return f"\\sqrt[{deg}]{{{cls.convert(c[0])}}}"
        if t == NT.INTEGRAL:
            lower = node.attributes.get("lowerLimit")
            upper = node.attributes.get("upperLimit")
            variant = node.attributes.get("variant", "\\int")
            s = variant
            if lower:
                s += f"_{{{lower.get('value','')}}}"
            if upper:
                s += f"^{{{upper.get('value','')}}}"
            if c:
                s += " " + " ".join(cls.convert(ch) for ch in c if ch)
            return s
        if t == NT.SUM:
            lower = node.attributes.get("lower", {}).get("value", "")
            upper = node.attributes.get("upper", {}).get("value", "")
            s = "\\sum"
            if lower:
                s += f"_{{{lower}}}"
            if upper:
                s += f"^{{{upper}}}"
            return s
        if t == NT.PRODUCT:
            lower = node.attributes.get("lower", {}).get("value", "")
            upper = node.attributes.get("upper", {}).get("value", "")
            s = "\\prod"
            if lower:
                s += f"_{{{lower}}}"
            if upper:
                s += f"^{{{upper}}}"
            return s
        if t == NT.LIMIT:
            approach = ""
            if node.attributes.get("approach"):
                approach_node = node.attributes["approach"]
                approach = approach_node.get("value", "")
            return f"\\lim_{{{approach}}}"
        if t == NT.VECTOR and c:
            return f"\\vec{{{cls.convert(c[0])}}}"
        if t == NT.MATRIX:
            rows = node.attributes.get("rows", [])
            env = node.attributes.get("env", "bmatrix")
            rows_latex = " \\\\ ".join(
                " & ".join(
                    LatexParser(cell.get("value", "")).parse().to_latex()
                    if cell.get("value") else ""
                    for cell in row
                )
                for row in rows
            )
            return f"\\begin{{{env}}} {rows_latex} \\end{{{env}}}"
        if t == NT.ABSOLUTE_VALUE:
            inner = " ".join(cls.convert(ch) for ch in c)
            return f"\\left|{inner}\\right|"
        if t == NT.PARENTHESIS:
            inner = " ".join(cls.convert(ch) for ch in c)
            return f"({inner})"
        if t == NT.BRACKET:
            inner = " ".join(cls.convert(ch) for ch in c)
            return f"[{inner}]"
        if t == NT.FACTORIAL and c:
            return f"{cls.convert(c[0])}!"
        if t == NT.DOUBLE_FACTORIAL and c:
            return f"{cls.convert(c[0])}!!"
        if t == NT.ELLIPSIS:
            return node.attributes.get("latex", r"\cdots")
        if t == NT.CANCELLATION and c:
            return f"\\cancel{{{cls.convert(c[0])}}}"
        if t == NT.BINOMIAL and len(c) >= 2:
            return f"\\binom{{{cls.convert(c[0])}}}{{{cls.convert(c[1])}}}"
        if t == NT.DERIVATION:
            steps = [cls.convert(ch) for ch in c if ch]
            return " = ".join(steps) if steps else node.value
        if t == NT.DERIVATION_STEP:
            return cls.convert(c[0]) if c else node.value
        if t == NT.DOUBLE_INTEGRAL:
            inner = " ".join(cls.convert(ch) for ch in c) if c else ""
            return f"\\iint {inner}".strip()
        if t == NT.TRIPLE_INTEGRAL:
            inner = " ".join(cls.convert(ch) for ch in c) if c else ""
            return f"\\iiint {inner}".strip()
        if t == NT.MULTIPLY:
            return node.attributes.get("latex", r"\times")
        # Fallback
        return " ".join(cls.convert(ch) for ch in c) if c else node.value


# ─── AST → MathML ────────────────────────────────────────────────────────────

class ASTToMathML:
    @classmethod
    def convert(cls, node: ASTNode, wrap: bool = True) -> str:
        inner = cls._node(node)
        if wrap:
            return f'<math xmlns="http://www.w3.org/1998/Math/MathML">{inner}</math>'
        return inner

    @classmethod
    def _node(cls, node: ASTNode) -> str:
        t = node.node_type
        c = node.children

        if t == NT.ROOT:
            return "<mrow>" + "".join(cls._node(ch) for ch in c) + "</mrow>"
        if t == NT.NUMBER:
            return f"<mn>{node.value}</mn>"
        if t in (NT.VARIABLE, NT.CONSTANT):
            return f"<mi>{node.value}</mi>"
        if t == NT.GREEK:
            return f"<mi>{node.value}</mi>"
        if t in (NT.OPERATOR, NT.FUNCTION):
            return f"<mo>{node.value}</mo>"
        if t == NT.SUBSCRIPT and len(c) >= 2:
            return f"<msub>{cls._node(c[0])}{cls._node(c[1])}</msub>"
        if t == NT.SUPERSCRIPT and len(c) >= 2:
            return f"<msup>{cls._node(c[0])}{cls._node(c[1])}</msup>"
        if t == NT.FRACTION and len(c) >= 2:
            return f"<mfrac>{cls._node(c[0])}{cls._node(c[1])}</mfrac>"
        if t == NT.ROOT_NODE and c:
            deg = node.attributes.get("degree", {}).get("value", "2")
            if deg == "2":
                return f"<msqrt>{cls._node(c[0])}</msqrt>"
            return f"<mroot>{cls._node(c[0])}<mn>{deg}</mn></mroot>"
        if t == NT.INTEGRAL:
            lower = node.attributes.get("lowerLimit")
            upper = node.attributes.get("upperLimit")
            integral_sym = "<mo>&#x222B;</mo>"
            if lower and upper:
                l_val = lower.get("value", "")
                u_val = upper.get("value", "")
                return f"<msubsup>{integral_sym}<mn>{l_val}</mn><mn>{u_val}</mn></msubsup>"
            return integral_sym
        if t == NT.SUM:
            lower = node.attributes.get("lower", {}).get("value", "")
            upper = node.attributes.get("upper", {}).get("value", "")
            sym = "<mo>&#x2211;</mo>"
            return f"<munderover>{sym}<mn>{lower}</mn><mn>{upper}</mn></munderover>"
        if t == NT.VECTOR and c:
            return f"<mover>{cls._node(c[0])}<mo stretchy='false'>&#x2192;</mo></mover>"
        if t == NT.MATRIX:
            rows = node.attributes.get("rows", [])
            rows_ml = "".join(
                "<mtr>" + "".join(
                    f"<mtd><mn>{cell.get('value','')}</mn></mtd>" for cell in row
                ) + "</mtr>"
                for row in rows
            )
            return f"<mtable>{rows_ml}</mtable>"
        if t == NT.ABSOLUTE_VALUE:
            inner = "".join(cls._node(ch) for ch in c)
            return f"<mrow><mo>|</mo>{inner}<mo>|</mo></mrow>"
        if t == NT.PARENTHESIS:
            inner = "".join(cls._node(ch) for ch in c)
            return f"<mrow><mo>(</mo>{inner}<mo>)</mo></mrow>"
        if t == NT.BRACKET:
            inner = "".join(cls._node(ch) for ch in c)
            return f"<mrow><mo>[</mo>{inner}<mo>]</mo></mrow>"
        if t == NT.FACTORIAL and c:
            return f"<mrow>{cls._node(c[0])}<mo>!</mo></mrow>"
        if t == NT.DOUBLE_FACTORIAL and c:
            return f"<mrow>{cls._node(c[0])}<mo>!!</mo></mrow>"
        if t == NT.ELLIPSIS:
            return "<mo>&#x2026;</mo>"
        if t == NT.CANCELLATION and c:
            return f"<menclose notation='updiagonalstrike'>{cls._node(c[0])}</menclose>"
        if t == NT.BINOMIAL and len(c) >= 2:
            return f"<mrow><mo>(</mo><mfrac linethickness='0'>{cls._node(c[0])}{cls._node(c[1])}</mfrac><mo>)</mo></mrow>"
        if t == NT.DERIVATION:
            rows = "".join(f"<mtr><mtd>{cls._node(ch)}</mtd></mtr>" for ch in c)
            return f"<mtable>{rows}</mtable>"
        if t == NT.DERIVATION_STEP:
            return cls._node(c[0]) if c else f"<mtext>{node.value}</mtext>"
        if t == NT.DOUBLE_INTEGRAL:
            inner = "".join(cls._node(ch) for ch in c)
            return f"<mrow><mo>&#x222C;</mo>{inner}</mrow>"
        if t == NT.TRIPLE_INTEGRAL:
            inner = "".join(cls._node(ch) for ch in c)
            return f"<mrow><mo>&#x222D;</mo>{inner}</mrow>"
        if t == NT.MULTIPLY:
            sym = "&#x00D7;" if "\\times" in node.value else ("&#x22C5;" if "\\cdot" in node.value else node.value)
            return f"<mo>{sym}</mo>"
        # Fallback
        if c:
            return "<mrow>" + "".join(cls._node(ch) for ch in c) + "</mrow>"
        return f"<mtext>{node.value}</mtext>"


# ─── AST → Plain Text ────────────────────────────────────────────────────────

class ASTToPlain:
    @classmethod
    def convert(cls, node: ASTNode) -> str:
        t = node.node_type
        c = node.children

        if t == NT.ROOT:
            return " ".join(cls.convert(ch) for ch in c)
        if t in (NT.NUMBER, NT.VARIABLE, NT.CONSTANT, NT.UNKNOWN, NT.TEXT):
            return node.value
        if t == NT.GREEK:
            return node.value
        if t in (NT.OPERATOR, NT.FUNCTION):
            return node.value
        if t == NT.SUBSCRIPT and len(c) >= 2:
            return f"{cls.convert(c[0])}_{cls.convert(c[1])}"
        if t == NT.SUPERSCRIPT and len(c) >= 2:
            return f"{cls.convert(c[0])}^{cls.convert(c[1])}"
        if t == NT.FRACTION and len(c) >= 2:
            return f"({cls.convert(c[0])}/{cls.convert(c[1])})"
        if t == NT.ROOT_NODE and c:
            return f"sqrt({cls.convert(c[0])})"
        if t == NT.ABSOLUTE_VALUE:
            return "|" + "".join(cls.convert(ch) for ch in c) + "|"
        if t == NT.PARENTHESIS:
            return "(" + "".join(cls.convert(ch) for ch in c) + ")"
        if t == NT.BRACKET:
            return "[" + "".join(cls.convert(ch) for ch in c) + "]"
        if t == NT.FACTORIAL and c:
            return f"{cls.convert(c[0])}!"
        if t == NT.DOUBLE_FACTORIAL and c:
            return f"{cls.convert(c[0])}!!"
        if t == NT.ELLIPSIS:
            return "..."
        if t == NT.CANCELLATION and c:
            return f"[cancel: {cls.convert(c[0])}]"
        if t == NT.BINOMIAL and len(c) >= 2:
            return f"C({cls.convert(c[0])}, {cls.convert(c[1])})"
        if t == NT.DERIVATION:
            steps = [cls.convert(ch) for ch in c if ch]
            return " = ".join(steps) if steps else node.value
        if t == NT.DERIVATION_STEP:
            return cls.convert(c[0]) if c else node.value
        if t == NT.DOUBLE_INTEGRAL:
            return f"∬ " + " ".join(cls.convert(ch) for ch in c)
        if t == NT.TRIPLE_INTEGRAL:
            return f"∭ " + " ".join(cls.convert(ch) for ch in c)
        if t == NT.MULTIPLY:
            return " × " if "\\times" in node.value else (" · " if "\\cdot" in node.value else " * ")
        return " ".join(cls.convert(ch) for ch in c) if c else node.value


# ─── Main Entry Point ─────────────────────────────────────────────────────────

class SpatialMathEngine:
    """
    High-level interface: LaTeX string → full structured output.
    """

    @staticmethod
    def parse(latex: str) -> Dict[str, Any]:
        """
        Parse LaTeX into AST, LaTeX (canonical), MathML, plain text.

        Returns::
            {
                "ast": dict,
                "latex": str,         # canonical / normalized
                "mathml": str,
                "plain": str,
                "has_subscript": bool,
                "has_superscript": bool,
                "has_fraction": bool,
                "has_integral": bool,
                "has_matrix": bool,
                "has_vector": bool,
                "node_types": list[str],
            }
        """
        try:
            parser = LatexParser(latex)
            ast_root = parser.parse()

            node_types = _collect_types(ast_root)

            return {
                "ast": ast_root.to_dict(),
                "latex": ast_root.to_latex(),
                "mathml": ast_root.to_mathml(),
                "plain": ast_root.to_plain(),
                "has_subscript":   "SUBSCRIPT"   in node_types,
                "has_superscript": "SUPERSCRIPT" in node_types,
                "has_fraction":    "FRACTION"    in node_types,
                "has_integral":    "INTEGRAL"    in node_types,
                "has_matrix":      "MATRIX"      in node_types,
                "has_vector":      "VECTOR"      in node_types,
                "has_root":        "ROOT_NODE"   in node_types,
                "has_sum":         "SUM"         in node_types,
                "has_limit":       "LIMIT"       in node_types,
                "has_factorial":   ("FACTORIAL" in node_types or "DOUBLE_FACTORIAL" in node_types),
                "has_derivation":  ("DERIVATION" in node_types or "DERIVATION_STEP" in node_types),
                "has_cancellation": "CANCELLATION" in node_types,
                "has_ellipsis":    "ELLIPSIS"    in node_types,
                "has_multiplication": "MULTIPLY" in node_types,
                "has_binomial":    "BINOMIAL"    in node_types,
                "node_types": node_types,
            }
        except Exception as e:
            logger.error("SpatialMathEngine.parse error for %r: %s", latex[:80], e)
            return {
                "ast": {"type": "ROOT", "value": latex, "children": []},
                "latex": latex,
                "mathml": f'<math><mtext>{latex}</mtext></math>',
                "plain": latex,
                "has_subscript": False,
                "has_superscript": False,
                "has_fraction": False,
                "has_integral": False,
                "has_matrix": False,
                "has_vector": False,
                "has_root": False,
                "has_sum": False,
                "has_limit": False,
                "has_factorial": False,
                "has_derivation": False,
                "has_cancellation": False,
                "has_ellipsis": False,
                "has_multiplication": False,
                "has_binomial": False,
                "node_types": [],
                "error": str(e),
            }


def _collect_types(node: ASTNode, seen: Optional[List[str]] = None) -> List[str]:
    if seen is None:
        seen = []
    seen.append(node.node_type.value)
    for child in node.children:
        _collect_types(child, seen)
    return seen


# Singleton
spatial_math_engine = SpatialMathEngine()
