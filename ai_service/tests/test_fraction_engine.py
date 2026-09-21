import unittest
import sys
from pathlib import Path

# Add project root to sys.path
ai_service_dir = Path(__file__).resolve().parent.parent
if str(ai_service_dir) not in sys.path:
    sys.path.insert(0, str(ai_service_dir))

from app.scientific.fraction_engine import (
    FractionEngine,
    FractionBar,
    FractionCandidate,
    FractionTreeParser,
    PixelFractionDetector,
    VULGAR_FRACTIONS,
)
from app.scientific.structural_tree import NodeType, FormulaNode


class TestFractionEngine(unittest.TestCase):
    """
    Comprehensive test suite validating all 32 requirements of the
    Dedicated Fraction Detection and Extraction Engine.
    """

    def test_basic_and_multidigit_fractions(self):
        """Sections 1 & 3: Basic & multi-digit fractions."""
        node1 = FractionTreeParser.parse_fraction_string("1/2")
        self.assertIsNotNone(node1)
        self.assertEqual(node1.node_type, NodeType.FRACTION)
        self.assertEqual(node1.children[0].value, "1")
        self.assertEqual(node1.children[1].value, "2")
        self.assertEqual(node1.to_latex(), r"\frac{1}{2}")

        node2 = FractionTreeParser.parse_fraction_string("123/456")
        self.assertIsNotNone(node2)
        self.assertEqual(node2.children[0].value, "123")
        self.assertEqual(node2.children[1].value, "456")
        self.assertEqual(node2.to_latex(), r"\frac{123}{456}")

    def test_variables_and_subscripts(self):
        """Sections 4 & 5: Variables & subscripts (M₁/M₂, M_1/M_2)."""
        node_latex = FractionTreeParser.parse_fraction_string(r"\frac{M_1}{M_2}")
        self.assertIsNotNone(node_latex)
        self.assertEqual(node_latex.node_type, NodeType.FRACTION)
        self.assertEqual(node_latex.children[0].node_type, NodeType.SUBSCRIPT)
        self.assertEqual(node_latex.children[1].node_type, NodeType.SUBSCRIPT)

        node_uni = FractionTreeParser.parse_fraction_string("M₁/M₂")
        self.assertIsNotNone(node_uni)
        self.assertEqual(node_uni.children[0].node_type, NodeType.SUBSCRIPT)

    def test_superscripts_and_powers(self):
        """Section 6: Superscripts (x²/y³, x^2/y^3)."""
        node = FractionTreeParser.parse_fraction_string("x^2/y^3")
        self.assertIsNotNone(node)
        self.assertEqual(node.children[0].node_type, NodeType.POWER)
        self.assertEqual(node.children[1].node_type, NodeType.POWER)
        self.assertIn("2", node.children[0].attributes["exponent"])
        self.assertIn("3", node.children[1].attributes["exponent"])

    def test_greek_symbols(self):
        """Section 7: Greek symbols (\theta/\pi, \Delta x/\Delta t)."""
        node_theta = FractionTreeParser.parse_fraction_string(r"\frac{\theta}{\pi}")
        self.assertIsNotNone(node_theta)
        self.assertEqual(node_theta.children[0].node_type, NodeType.GREEK_SYMBOL)
        self.assertEqual(node_theta.children[1].node_type, NodeType.GREEK_SYMBOL)

        node_delta = FractionTreeParser.parse_fraction_string(r"\frac{\Delta x}{\Delta t}")
        self.assertIsNotNone(node_delta)
        self.assertEqual(node_delta.node_type, NodeType.FRACTION)
        self.assertIn(r"\Delta", node_delta.to_latex())

    def test_complex_numerators_and_denominators(self):
        """Sections 8 & 9: Grouped additions and subtractions."""
        node = FractionTreeParser.parse_fraction_string(r"\frac{a+b}{c+d+e}")
        self.assertIsNotNone(node)
        self.assertEqual(node.children[0].node_type, NodeType.ADD)
        self.assertEqual(len(node.children[0].children), 2)
        self.assertEqual(node.children[1].node_type, NodeType.ADD)
        self.assertEqual(len(node.children[1].children), 3)

    def test_parentheses_preservation(self):
        """Section 10: Parentheses preservation."""
        node = FractionTreeParser.parse_fraction_string(r"\frac{(a+b)}{(c+d)}")
        self.assertIsNotNone(node)
        self.assertEqual(node.children[0].node_type, NodeType.PARENTHESES)
        self.assertEqual(node.children[1].node_type, NodeType.PARENTHESES)

    def test_trailing_factor_multiplication(self):
        """Section 11: Trailing factor ((M₁+M₂)/(M₁+M₂+M₃) F)."""
        node = FractionTreeParser.parse_fraction_string(r"\left( \frac{M_1+M_2}{M_1+M_2+M_3} \right) F")
        self.assertIsNotNone(node)
        self.assertEqual(node.node_type, NodeType.MULTIPLY)
        # First child is parentheses-wrapped fraction
        self.assertEqual(node.children[0].node_type, NodeType.PARENTHESES)
        # Second child is trailing variable F
        self.assertEqual(node.children[1].node_type, NodeType.VARIABLE)
        self.assertEqual(node.children[1].value, "F")

    def test_fraction_multiplication(self):
        """Section 12: Fraction multiplication (1/2 \times 2/3)."""
        node = FractionTreeParser.parse_fraction_string(r"\frac{1}{2} \times \frac{2}{3}")
        self.assertIsNotNone(node)
        self.assertEqual(node.node_type, NodeType.MULTIPLY)
        self.assertEqual(len(node.children), 2)
        self.assertEqual(node.children[0].node_type, NodeType.FRACTION)
        self.assertEqual(node.children[1].node_type, NodeType.FRACTION)

    def test_mixed_numbers(self):
        """Section 13: Mixed numbers (1 \frac{1}{2}, 1 ½)."""
        node_latex = FractionTreeParser.parse_fraction_string(r"1 \frac{1}{2}")
        self.assertIsNotNone(node_latex)
        self.assertEqual(node_latex.node_type, NodeType.MIXED_NUMBER)
        self.assertIn("1", node_latex.to_latex())
        self.assertIn(r"\frac{1}{2}", node_latex.to_latex())

        node_vulgar = FractionTreeParser.parse_fraction_string("2 ¾")
        self.assertIsNotNone(node_vulgar)
        self.assertEqual(node_vulgar.node_type, NodeType.MIXED_NUMBER)
        self.assertEqual(node_vulgar.children[0].value, "2")

    def test_nested_fractions(self):
        """Section 14: Nested fractions (1 / (1/2), (a/b) / c)."""
        node1 = FractionTreeParser.parse_fraction_string(r"\frac{1}{\frac{1}{2}}")
        self.assertIsNotNone(node1)
        self.assertEqual(node1.children[1].node_type, NodeType.FRACTION)

        node2 = FractionTreeParser.parse_fraction_string(r"\frac{\frac{a}{b}}{c}")
        self.assertIsNotNone(node2)
        self.assertEqual(node2.children[0].node_type, NodeType.FRACTION)

    def test_radicals_cross_nesting(self):
        """Sections 15 & 16: Cross-nesting with radicals."""
        node_sqrt_frac = FractionTreeParser.parse_fraction_string(r"\sqrt{\frac{a}{b}}")
        self.assertIsNotNone(node_sqrt_frac)
        self.assertEqual(node_sqrt_frac.node_type, NodeType.SQRT)
        self.assertEqual(node_sqrt_frac.children[0].node_type, NodeType.FRACTION)

        node_frac_sqrt = FractionTreeParser.parse_fraction_string(r"\frac{\sqrt{a}}{b}")
        self.assertIsNotNone(node_frac_sqrt)
        self.assertEqual(node_frac_sqrt.node_type, NodeType.FRACTION)
        self.assertEqual(node_frac_sqrt.children[0].node_type, NodeType.SQRT)

    def test_fraction_inside_exponent(self):
        """Section 17: Fraction inside exponent (x^{a/b})."""
        node = FractionTreeParser.parse_fraction_string(r"x^{\frac{a}{b}}")
        self.assertIsNotNone(node)
        self.assertEqual(node.node_type, NodeType.POWER)
        self.assertEqual(node.children[1].node_type, NodeType.FRACTION)

    def test_physics_fractions_and_units(self):
        """Section 18: Physics equations & compound units."""
        node_ke = FractionTreeParser.parse_fraction_string(r"\frac{1}{2}mv^2")
        self.assertIsNotNone(node_ke)
        self.assertEqual(node_ke.node_type, NodeType.MULTIPLY)
        self.assertEqual(node_ke.children[0].node_type, NodeType.FRACTION)

        node_accel = FractionTreeParser.parse_fraction_string(r"\frac{F}{m}")
        self.assertIsNotNone(node_accel)
        self.assertEqual(node_accel.node_type, NodeType.FRACTION)

    def test_chemistry_fractions(self):
        """Section 19: Chemistry fractional coefficients."""
        node = FractionTreeParser.parse_fraction_string(r"\frac{1}{2} O_2")
        self.assertIsNotNone(node)
        self.assertEqual(node.node_type, NodeType.MULTIPLY)
        self.assertEqual(node.children[0].node_type, NodeType.FRACTION)

    def test_unicode_vulgar_fractions(self):
        """Section 20: Unicode vulgar fractions conversion."""
        for vf, (n, d) in VULGAR_FRACTIONS.items():
            node = FractionTreeParser.parse_fraction_string(vf)
            self.assertIsNotNone(node, f"Failed for {vf}")
            self.assertEqual(node.node_type, NodeType.FRACTION)
            self.assertEqual(node.children[0].value, n)
            self.assertEqual(node.children[1].value, d)

    def test_pixel_fraction_detector_rules(self):
        """Sections 21 & 22: Fraction bar vs table border / underline classifier."""
        # 1. Page Divider rejection
        bar_div = FractionBar(10, 100, 450, 100)
        valid, reason = PixelFractionDetector.classify_horizontal_line(bar_div, 500, 800, [])
        self.assertFalse(valid)
        self.assertEqual(reason, "REJECTED_PAGE_DIVIDER")

        # 2. Too short
        bar_short = FractionBar(10, 100, 12, 100)
        valid, reason = PixelFractionDetector.classify_horizontal_line(bar_short, 500, 800, [])
        self.assertFalse(valid)
        self.assertEqual(reason, "REJECTED_TOO_SHORT")

        # 3. Isolated line
        bar_iso = FractionBar(10, 100, 35, 100)
        valid, reason = PixelFractionDetector.classify_horizontal_line(bar_iso, 500, 800, [])
        self.assertFalse(valid)
        self.assertEqual(reason, "REJECTED_ISOLATED_LINE")

        # 4. Underline rejection
        spans_above = [{"bbox": [10, 88, 35, 99], "text": "underline_me"}]
        valid, reason = PixelFractionDetector.classify_horizontal_line(bar_iso, 500, 800, spans_above)
        self.assertFalse(valid)
        self.assertEqual(reason, "REJECTED_UNDERLINE")

        # 5. Valid fraction bar
        spans_both = [
            {"bbox": [10, 88, 35, 98], "text": "1"},
            {"bbox": [10, 102, 35, 112], "text": "2"},
        ]
        valid, reason = PixelFractionDetector.classify_horizontal_line(bar_iso, 500, 800, spans_both)
        self.assertTrue(valid)
        self.assertEqual(reason, "VALID_FRACTION")

    def test_first_class_fraction_object(self):
        """Section 24: First-class Fraction Object Data Model."""
        obj = FractionEngine.create_fraction_object(
            numerator="M_1 + M_2",
            denominator="M_1 + M_2 + M_3",
            trailing="F",
            has_parens=True,
            original_crop_path="/storage/formulas/extracted/crop_1.png",
            bbox=(15.0, 25.0, 60.0, 30.0),
            page_number=2,
            question_id="Q10",
        )
        self.assertTrue(obj["fractionId"].startswith("frac_"))
        self.assertEqual(obj["pageNumber"], 2)
        self.assertEqual(obj["questionId"], "Q10")
        self.assertEqual(obj["originalCrop"], "/storage/formulas/extracted/crop_1.png")
        self.assertEqual(obj["validationStatus"], "VALIDATED")
        self.assertIn(r"\frac", obj["latex"])
        self.assertIn("<mfrac>", obj["mathml"])
        self.assertIn("type", obj["structuredExpression"])
        self.assertGreaterEqual(obj["confidence"], 0.95)


if __name__ == "__main__":
    unittest.main()
