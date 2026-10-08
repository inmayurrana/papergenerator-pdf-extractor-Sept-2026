"""
Automated Regression Test Suite — Mathematical Visual Benchmark
================================================================
Mandatory acceptance tests for visual formula extraction, 2D AST reconstruction,
and quality control status.

Specifically tests formulas from the benchmark problem:
  Question 33:
    - Equation:  dM/dt = + \alpha v  -> \\frac{dM}{dt} = +\\alpha v
    - Option A:  -2\alpha v^2 / M    -> \\frac{-2\\alpha v^2}{M}
    - Option B:  -3\alpha v^2 / M    -> \\frac{-3\\alpha v^2}{M}
    - Option C:  -\alpha v^2 / M     -> \\frac{-\\alpha v^2}{M}
    - Option D:  -\alpha v^2         -> -\\alpha v^2

  Question 34:
    - Equation:  F = 500 - 100t
    - Option:    500t - 50t^2
    - Option:    50t - t^2
    - Option:    100t^2

Verifies:
  1. No corrupted structures (α_{2}, v α_{2}, missing α, "Here}" artifacts).
  2. Superscript v^2 is recognized as POWER(base=v, exp=2), NOT v2 or v_2.
  3. Fractions have true numerator and denominator AST child nodes.
  4. Greek alpha is recognized as GREEK node, not letter 'a' or digit '2'.
  5. MathML contains <mfrac>, <msup>, <mi>α</mi>.
  6. VisualFormulaVerifier accurately scores rendering and sets validationStatus.
"""

import sys
import unittest
from pathlib import Path

# Ensure ai_service is on sys.path
ROOT = Path(__file__).resolve().parent.parent.parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from ai_service.app.engines.spatial_ast_engine import spatial_math_engine, NT
from ai_service.app.scientific.visual_formula_verifier import visual_formula_verifier


class TestBenchmarkFormulas(unittest.TestCase):
    """Regression test cases matching user-reported benchmark formulas."""

    def test_question_33_equation(self):
        """dM/dt = + \\alpha v must parse into derivative fraction, Greek alpha, velocity v."""
        latex = r"\frac{dM}{dt} = +\alpha v"
        res = spatial_math_engine.parse(latex)

        self.assertTrue(res["has_fraction"], "Must detect fraction for dM/dt")
        self.assertIn("GREEK", res["node_types"], "Must detect Greek alpha")
        self.assertIn("<mfrac>", res["mathml"])
        self.assertIn("α", res["plain"])

        # No corrupted artifacts
        self.assertNotIn("Here}", res["latex"])
        self.assertNotIn("alpha_2", res["latex"])

    def test_option_a_fraction_power_greek(self):
        """Option A: \\frac{-2\\alpha v^2}{M} must preserve 2D fraction, superscript 2 on v, and Greek alpha."""
        latex = r"\frac{-2\alpha v^2}{M}"
        res = spatial_math_engine.parse(latex)

        self.assertTrue(res["has_fraction"], "Must be recognized as FRACTION")
        self.assertTrue(res["has_superscript"], "v^2 must be recognized as SUPERSCRIPT/POWER")
        self.assertIn("GREEK", res["node_types"], "alpha must be recognized as GREEK")

        # Verify MathML
        mathml = res["mathml"]
        self.assertIn("<mfrac>", mathml, "MathML must contain <mfrac>")
        self.assertIn("<msup>", mathml, "MathML must contain <msup> for v^2")
        self.assertIn("α", mathml, "MathML must contain Greek α")
        self.assertIn("M", mathml, "MathML must contain denominator M")

        # Check AST structure
        ast = res["ast"]
        self.assertEqual(ast["type"], "ROOT")
        frac_node = ast["children"][0]
        self.assertEqual(frac_node["type"], "FRACTION")

    def test_option_b_fraction(self):
        """Option B: \\frac{-3\\alpha v^2}{M}."""
        latex = r"\frac{-3\alpha v^2}{M}"
        res = spatial_math_engine.parse(latex)
        self.assertTrue(res["has_fraction"])
        self.assertTrue(res["has_superscript"])
        self.assertIn("GREEK", res["node_types"])

    def test_option_c_fraction(self):
        """Option C: \\frac{-\\alpha v^2}{M}."""
        latex = r"\frac{-\alpha v^2}{M}"
        res = spatial_math_engine.parse(latex)
        self.assertTrue(res["has_fraction"])
        self.assertTrue(res["has_superscript"])
        self.assertIn("GREEK", res["node_types"])

    def test_option_d_standalone_power(self):
        """Option D: -\\alpha v^2 (no fraction bar, but Greek alpha and exponent 2 on v)."""
        latex = r"-\alpha v^2"
        res = spatial_math_engine.parse(latex)
        self.assertFalse(res["has_fraction"], "Option D has no fraction bar")
        self.assertTrue(res["has_superscript"], "Must have exponent 2 on v")
        self.assertIn("GREEK", res["node_types"])
        self.assertIn("<msup>", res["mathml"])

    def test_question_34_linear_force(self):
        """Question 34 equation: F = 500 - 100t."""
        latex = r"F = 500 - 100t"
        res = spatial_math_engine.parse(latex)
        self.assertIn("NUMBER", res["node_types"])
        self.assertIn("OPERATOR", res["node_types"])
        self.assertNotIn("FRACTION", res["node_types"])

    def test_question_34_quadratic_impulse(self):
        """Question 34 options: 500t - 50t^2 and 50t - t^2."""
        cases = [r"500t - 50t^2", r"50t - t^2", r"100t^2"]
        for c in cases:
            with self.subTest(formula=c):
                res = spatial_math_engine.parse(c)
                self.assertTrue(res["has_superscript"], f"Must detect exponent 2 on t for {c}")
                self.assertIn("<msup>", res["mathml"])

    def test_power_vs_subscript_disambiguation(self):
        """v^2 must NOT be confused with v_2 or v2."""
        res_power = spatial_math_engine.parse(r"v^2")
        self.assertTrue(res_power["has_superscript"])
        self.assertFalse(res_power["has_subscript"])
        self.assertIn("<msup>", res_power["mathml"])
        self.assertNotIn("<msub>", res_power["mathml"])

        res_sub = spatial_math_engine.parse(r"v_2")
        self.assertTrue(res_sub["has_subscript"])
        self.assertFalse(res_sub["has_superscript"])
        self.assertIn("<msub>", res_sub["mathml"])
        self.assertNotIn("<msup>", res_sub["mathml"])

    def test_visual_formula_verifier_validation_status(self):
        """Valid formula must achieve VALIDATED status with zero issues."""
        res = visual_formula_verifier.evaluate_formula(
            crop_image=None,
            candidate_latex=r"\frac{-2\alpha v^2}{M}",
            character_confidence=0.95,
        )
        self.assertEqual(res["validationStatus"], "VALIDATED")
        self.assertFalse(res["needs_review"])
        self.assertGreaterEqual(res["overallConfidence"], 0.85)
        self.assertEqual(len(res["issues"]), 0)

    def test_visual_formula_verifier_catches_unbalanced_syntax(self):
        """Malformed formula with unbalanced braces must be flagged as NEEDS_REVIEW."""
        res = visual_formula_verifier.evaluate_formula(
            crop_image=None,
            candidate_latex=r"\frac{-2\alpha v^2}{M",  # missing closing brace
            character_confidence=0.95,
        )
        self.assertEqual(res["validationStatus"], "NEEDS_REVIEW")
        self.assertTrue(res["needs_review"])
        self.assertIn("Unbalanced curly braces in LaTeX", res["issues"])

    # ══════════════════════════════════════════════════════════════════════════
    # SECOND REGRESSION CASE: Factorials, Derivations, Cancellations, Ellipsis
    # ══════════════════════════════════════════════════════════════════════════

    def test_factorial_node_structure(self):
        """Factorials like 20!, n!, (n-1)! must produce real FACTORIAL AST nodes."""
        cases = [
            (r"20!", "20", False),
            (r"n!", "n", False),
            (r"(n-1)!", "(n - 1)", False),
            (r"n!!", "n", True),
        ]
        for latex, expected_arg, is_double in cases:
            with self.subTest(latex=latex):
                res = spatial_math_engine.parse(latex)
                self.assertTrue(res["has_factorial"], f"Must detect factorial in {latex}")
                ast = res["ast"]
                expected_type = "DOUBLE_FACTORIAL" if is_double else "FACTORIAL"
                self.assertIn(expected_type, res["node_types"])
                if is_double:
                    self.assertIn("<mo>!!</mo>", res["mathml"])
                else:
                    self.assertIn("<mo>!</mo>", res["mathml"])

    def test_fraction_of_factorials_slash(self):
        """20!/18! must parse into FRACTION(FACTORIAL(20), FACTORIAL(18)) -> \\frac{20!}{18!}."""
        latex = r"20!/18!"
        res = spatial_math_engine.parse(latex)
        self.assertTrue(res["has_fraction"], "Must detect fraction for 20!/18!")
        self.assertTrue(res["has_factorial"], "Must detect factorial for 20!/18!")
        self.assertIn("FRACTION", res["node_types"])
        self.assertIn("FACTORIAL", res["node_types"])
        self.assertIn(r"\frac{20!}{18!}", res["latex"])
        self.assertIn("<mfrac>", res["mathml"])

    def test_fraction_of_factorials_latex(self):
        """\\frac{10!}{6!4!} must parse into FRACTION with FACTORIAL child nodes."""
        latex = r"\frac{10!}{6!4!}"
        res = spatial_math_engine.parse(latex)
        self.assertTrue(res["has_fraction"])
        self.assertTrue(res["has_factorial"])
        self.assertIn("<mfrac>", res["mathml"])

    def test_multiline_derivation_structure(self):
        """Multi-line derivation 20!/18! = (20 \\times 19 \\times 18!)/18! = 20 \\times 19 = 380."""
        latex = r"\frac{20!}{18!} = \frac{20 \times 19 \times 18!}{18!} = 20 \times 19 = 380"
        res = spatial_math_engine.parse(latex)
        self.assertTrue(res["has_derivation"], "Must detect multi-step DERIVATION")
        self.assertTrue(res["has_factorial"], "Must detect factorials in derivation")
        self.assertTrue(res["has_fraction"], "Must detect fraction in derivation")
        self.assertIn("DERIVATION", res["node_types"])
        self.assertIn("DERIVATION_STEP", res["node_types"])

        # Check steps in AST
        ast = res["ast"]
        deriv_node = ast["children"][0]
        self.assertEqual(deriv_node["type"], "DERIVATION")
        self.assertGreaterEqual(len(deriv_node["children"]), 3, "Must have at least 3 derivation steps")
        for step in deriv_node["children"]:
            self.assertEqual(step["type"], "DERIVATION_STEP")
            self.assertIn("transformation", step["attributes"])

    def test_cancellation_preservation(self):
        """\\frac{20 \\times 19 \\times \\cancel{18!}}{\\cancel{18!}} must preserve CANCELLATION node."""
        latex = r"\frac{20 \times 19 \times \cancel{18!}}{\cancel{18!}}"
        res = spatial_math_engine.parse(latex)
        self.assertTrue(res["has_cancellation"], "Must detect CANCELLATION")
        self.assertIn("CANCELLATION", res["node_types"])
        self.assertIn(r"\cancel{18!}", res["latex"])
        self.assertIn("<menclose", res["mathml"])

    def test_multiplication_symbols(self):
        """Multiplication with \\times, \\cdot, and product sequences."""
        latex_cross = r"2^5 \times 5!"
        res_cross = spatial_math_engine.parse(latex_cross)
        self.assertTrue(res_cross["has_multiplication"])
        self.assertTrue(res_cross["has_superscript"])
        self.assertTrue(res_cross["has_factorial"])
        self.assertIn(r"\times", res_cross["latex"])

        latex_dot = r"6 \cdot 7 \cdot 8 \cdot 9 \cdot 10"
        res_dot = spatial_math_engine.parse(latex_dot)
        self.assertTrue(res_dot["has_multiplication"])
        self.assertIn(r"\cdot", res_dot["latex"])

    def test_ellipsis_node(self):
        """Ellipsis in products like n! = n(n-1) \\cdots 1."""
        latex = r"n! = n(n-1)\cdots 1"
        res = spatial_math_engine.parse(latex)
        self.assertTrue(res["has_ellipsis"])
        self.assertTrue(res["has_factorial"])
        self.assertIn("ELLIPSIS", res["node_types"])
        self.assertIn(r"\cdots", res["latex"])
        self.assertIn("...", res["plain"])

    def test_verifier_flags_second_regression_case(self):
        """VisualFormulaVerifier correctly sets verificationStatus and structural_flags for factorials & derivations."""
        latex = r"\frac{20!}{18!} = \frac{20 \times 19 \times 18!}{18!} = 20 \times 19 = 380"
        eval_res = visual_formula_verifier.evaluate_formula(
            crop_image=None,
            candidate_latex=latex,
            character_confidence=0.96,
        )
        self.assertEqual(eval_res["verificationStatus"], "VERIFIED")
        self.assertEqual(eval_res["validationStatus"], "VALIDATED")
        self.assertTrue(eval_res["structural_flags"]["has_factorial"])
        self.assertTrue(eval_res["structural_flags"]["has_derivation"])
        self.assertTrue(eval_res["structural_flags"]["has_fraction"])


if __name__ == "__main__":
    unittest.main()

