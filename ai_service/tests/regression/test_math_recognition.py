"""
Regression Test Suite — Mathematical Recognition & Spatial AST Engine
======================================================================
Tests ALL math symbol classes, 2D structures, and AST correctness using standard unittest.
Run with:
    python -m unittest ai_service.tests.regression.test_math_recognition
"""

import sys
import unittest
from pathlib import Path

# Ensure ai_service is importable
ROOT = Path(__file__).resolve().parent.parent.parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from ai_service.app.engines.spatial_ast_engine import (
    SpatialMathEngine,
    LatexParser,
    ASTToLatex,
    ASTToMathML,
    NT,
)

engine = SpatialMathEngine()


def _find_node(ast_dict: dict, node_type: str) -> dict | None:
    """DFS search for first node with matching type."""
    if ast_dict.get("type") == node_type:
        return ast_dict
    for child in ast_dict.get("children", []):
        found = _find_node(child, node_type)
        if found:
            return found
    return None


class TestGreekSymbols(unittest.TestCase):
    def test_greek_letters(self):
        cases = [
            (r"\alpha", "α"),
            (r"\beta", "β"),
            (r"\gamma", "γ"),
            (r"\delta", "δ"),
            (r"\epsilon", "ε"),
            (r"\theta", "θ"),
            (r"\lambda", "λ"),
            (r"\mu", "μ"),
            (r"\pi", "π"),
            (r"\sigma", "σ"),
            (r"\phi", "φ"),
            (r"\omega", "ω"),
            (r"\Gamma", "Γ"),
            (r"\Delta", "Δ"),
            (r"\Theta", "Θ"),
            (r"\Lambda", "Λ"),
            (r"\Sigma", "Σ"),
            (r"\Omega", "Ω"),
        ]
        for latex, expected in cases:
            with self.subTest(latex=latex):
                res = engine.parse(latex)
                self.assertIn("GREEK", res["node_types"])
                self.assertEqual(res["plain"].strip(), expected)

    def test_theta_not_zero(self):
        res = engine.parse(r"\theta")
        self.assertEqual(res["plain"].strip(), "θ")

    def test_omega_not_O(self):
        res = engine.parse(r"\Omega")
        self.assertEqual(res["plain"].strip(), "Ω")


class TestSubscriptsAndSuperscripts(unittest.TestCase):
    def test_subscript_basic(self):
        res = engine.parse(r"M_1")
        self.assertTrue(res["has_subscript"])
        self.assertIn("<msub>", res["mathml"])

    def test_subscript_nested(self):
        res = engine.parse(r"a_{n+1}")
        self.assertTrue(res["has_subscript"])

    def test_superscript_basic(self):
        res = engine.parse(r"x^2")
        self.assertTrue(res["has_superscript"])
        self.assertIn("<msup>", res["mathml"])

    def test_trig_superscript(self):
        res = engine.parse(r"\sin^2 \theta")
        self.assertTrue(res["has_superscript"])
        self.assertIn("GREEK", res["node_types"])


class TestFractions(unittest.TestCase):
    def test_fraction_basic(self):
        res = engine.parse(r"\frac{1}{2}")
        self.assertTrue(res["has_fraction"])
        self.assertIn("<mfrac>", res["mathml"])

    def test_fraction_algebraic(self):
        res = engine.parse(r"\frac{M_1 + M_2}{M_1 + M_2 + M_3}")
        self.assertTrue(res["has_fraction"])
        self.assertTrue(res["has_subscript"])


class TestRoots(unittest.TestCase):
    def test_sqrt(self):
        res = engine.parse(r"\sqrt{x}")
        self.assertTrue(res["has_root"])
        self.assertIn("<msqrt>", res["mathml"])

    def test_nth_root(self):
        res = engine.parse(r"\sqrt[3]{x}")
        self.assertTrue(res["has_root"])


class TestIntegralsSummationsLimits(unittest.TestCase):
    def test_integral(self):
        res = engine.parse(r"\int_0^1 x^2 \, dx")
        self.assertTrue(res["has_integral"])

    def test_summation(self):
        res = engine.parse(r"\sum_{i=1}^{n} i^2")
        self.assertTrue(res["has_sum"])

    def test_limit(self):
        res = engine.parse(r"\lim_{x \to 0} \frac{\sin x}{x}")
        self.assertTrue(res["has_limit"])
        self.assertTrue(res["has_fraction"])


class TestMatricesAndVectors(unittest.TestCase):
    def test_matrix_2x2(self):
        latex = r"\begin{bmatrix} a & b \\ c & d \end{bmatrix}"
        res = engine.parse(latex)
        self.assertTrue(res["has_matrix"])
        self.assertIn("<mtable>", res["mathml"])
        mat_node = _find_node(res["ast"], "MATRIX")
        self.assertIsNotNone(mat_node)
        rows = mat_node.get("attributes", {}).get("rows", [])
        self.assertEqual(len(rows), 2)
        self.assertEqual(len(rows[0]), 2)

    def test_vector(self):
        res = engine.parse(r"\vec{v}")
        self.assertTrue(res["has_vector"])


class TestFormulas(unittest.TestCase):
    def test_quadratic_formula(self):
        res = engine.parse(r"x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}")
        self.assertTrue(res["has_fraction"])
        self.assertTrue(res["has_root"])
        self.assertTrue(res["has_superscript"])

    def test_euler_identity(self):
        res = engine.parse(r"e^{i\pi} + 1 = 0")
        self.assertTrue(res["has_superscript"])
        self.assertIn("GREEK", res["node_types"])


if __name__ == "__main__":
    unittest.main()
