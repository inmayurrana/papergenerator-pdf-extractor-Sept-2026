"""
Automated Mathematical, Scientific, Physics & Chemistry Recognition Engine Test Suite
Validates Section 37 and Section 38 requirements.
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

import unittest
import numpy as np
import cv2

from ai_service.app.scientific.structural_tree import FormulaNode, ExpressionTreeBuilder, NodeType
from ai_service.app.scientific.scientific_units import scientific_units
from ai_service.app.scientific.physics_engine import physics_engine
from ai_service.app.scientific.chemistry_engine import chemistry_engine
from ai_service.app.scientific.visual_validator import visual_validator
from ai_service.app.scientific.subsystem import scientific_subsystem
from ai_service.app.engines.specialized_math import specialized_math


class TestScientificRecognitionSubsystem(unittest.TestCase):

    def test_section_38_uploaded_sample_option_2(self):
        """Option 2: (2) 10√3 g -> Formula: 10\\sqrt{3}, Unit: g"""
        raw_text = "10√3 g"
        res = scientific_subsystem.process_formula_crop(None, raw_text, mode="MATH")

        self.assertTrue("10\\sqrt{3}" in res["raw_latex"] or "10 \\sqrt{3}" in res["raw_latex"])
        self.assertEqual(res["unit"], "g")
        self.assertIsNotNone(res["structured_ast"])

        ast = res["structured_ast"]
        # AST should have MULTIPLY with 10, SQRT(3), and UNIT('g')
        root_children = ast["children"]
        self.assertTrue(len(root_children) > 0)
        mul_node = root_children[0]
        self.assertEqual(mul_node["type"], "MULTIPLY")
        types = [c["type"] for c in mul_node["children"]]
        self.assertIn("NUMBER", types)
        self.assertIn("SQRT", types)
        self.assertIn("UNIT", types)

    def test_section_38_uploaded_sample_option_4(self):
        """Option 4: (4) √3 g -> Formula: \\sqrt{3}, Unit: g"""
        raw_text = "√3 g"
        res = scientific_subsystem.process_formula_crop(None, raw_text, mode="MATH")

        self.assertIn("\\sqrt{3}", res["raw_latex"])
        self.assertEqual(res["unit"], "g")

        # Must not confuse 'g' with 9 or q
        self.assertNotEqual(res["unit"], "9")
        self.assertNotEqual(res["unit"], "q")

    def test_section_37_mathematical_roots(self):
        """Tests √3, √(x+1), ∛8"""
        r1 = specialized_math.convert_embedded_math("√3")
        self.assertIn("\\sqrt{3}", r1)

        r2 = specialized_math.convert_embedded_math("√(x+1)")
        self.assertIn("\\sqrt{x+1}", r2)

        r3 = specialized_math.convert_embedded_math("∛8")
        self.assertIn("\\sqrt[3]{8}", r3)

    def test_section_37_powers_and_subscripts(self):
        """Tests x², x₁, aₙ"""
        p1 = specialized_math.convert_embedded_math("x²")
        self.assertIn("x^2", p1)

        s1 = specialized_math.convert_embedded_math("x₁")
        self.assertTrue("x_1" in s1 or "x_{1}" in s1)

        s2 = specialized_math.convert_embedded_math("aₙ")
        self.assertTrue("a_n" in s2 or "a_{n}" in s2)

    def test_section_37_fractions(self):
        """Tests 1/2 and ½"""
        f1 = specialized_math.convert_embedded_math("1/2")
        self.assertTrue("\\frac{1}{2}" in f1 or "1/2" in f1)

        f2 = specialized_math.convert_embedded_math("½")
        self.assertIn("\\frac{1}{2}", f2)

    def test_section_37_trigonometry(self):
        """Tests sin θ, cos θ, tan θ, πr², 2πr"""
        t1 = specialized_math.convert_embedded_math("sin θ")
        self.assertIn("\\sin", t1)
        self.assertIn("\\theta", t1)

        t2 = specialized_math.convert_embedded_math("πr²")
        self.assertIn("\\pi", t2)
        self.assertIn("r^2", t2)

        t3 = specialized_math.convert_embedded_math("2πr")
        self.assertIn("\\pi", t3)

    def test_section_37_calculus_and_symbols(self):
        """Tests ∫x dx, Σx, Δx, ∞, ≤, ≥, ≠, ≈"""
        c1 = specialized_math.convert_embedded_math("∫x dx")
        self.assertIn("\\int", c1)

        c2 = specialized_math.convert_embedded_math("Σx")
        self.assertTrue("\\sum" in c2 or "\\Sigma" in c2)

        c3 = specialized_math.convert_embedded_math("Δx")
        self.assertIn("\\Delta", c3)

        syms = specialized_math.convert_embedded_math("∞ ≤ ≥ ≠ ≈")
        self.assertIn("\\infty", syms)
        self.assertIn("\\le", syms)
        self.assertIn("\\ge", syms)
        self.assertIn("\\neq", syms)
        self.assertIn("\\approx", syms)

    def test_section_37_greek_alphabet(self):
        """Tests α β γ θ λ μ Ω"""
        res = specialized_math.convert_embedded_math("α β γ θ λ μ Ω")
        self.assertIn("\\alpha", res)
        self.assertIn("\\beta", res)
        self.assertIn("\\gamma", res)
        self.assertIn("\\theta", res)
        self.assertIn("\\lambda", res)
        self.assertIn("\\mu", res)
        self.assertIn("\\Omega", res)

    def test_section_37_physics_equations(self):
        """Tests F = ma, E = mc², V = IR, 10⁻³, 6.02 × 10²³"""
        p1 = physics_engine.analyze_physics_region("F = ma")
        self.assertTrue(p1["is_physics"])

        p2 = physics_engine.analyze_physics_region("E = mc²")
        self.assertTrue(p2["is_physics"])

        p3 = physics_engine.analyze_physics_region("V = IR")
        self.assertTrue(p3["is_physics"])

        sc1 = specialized_math.convert_embedded_math("10⁻³")
        self.assertTrue("10^{-3}" in sc1 or "10^-3" in sc1)

        sc2 = specialized_math.convert_embedded_math("6.02 × 10²³")
        self.assertTrue("10^{23}" in sc2 or "10^23" in sc2)

    def test_section_37_chemistry_formulas_and_reactions(self):
        """Tests H₂O, CO₂, H₂SO₄, NH₄⁺, SO₄²⁻, Fe³⁺, 2H₂ + O₂ → 2H₂O"""
        c1 = chemistry_engine.format_chemical_latex("H₂O")
        self.assertIn("H_2O", c1)

        c2 = chemistry_engine.format_chemical_latex("H₂SO₄")
        self.assertIn("H_2SO_4", c2)

        c3 = chemistry_engine.format_chemical_latex("Fe³⁺")
        self.assertIn("Fe^{3+}", c3)

        c4 = chemistry_engine.format_chemical_latex("SO₄²⁻")
        self.assertIn("SO_4^{2-}", c4)

        c5 = chemistry_engine.format_chemical_latex("NH₄⁺")
        self.assertTrue("NH_4^+" in c5 or "NH_4^{+}" in c5)

        # Reaction equation validation
        rxn = chemistry_engine.validate_chemical_equation("2H2 + O2 -> 2H2O")
        self.assertTrue(rxn["is_balanced"])
        self.assertIn("\\rightarrow", rxn["formatted_latex"])

    def test_visual_validator_rendering_and_confidence(self):
        """Tests formula rendering to image and multi-dimensional confidence score"""
        # Create a synthetic white bitmap crop with some dark content
        crop = np.ones((60, 200, 3), dtype=np.uint8) * 255
        cv2.putText(crop, "10\u221a3 g", (10, 40), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 0, 0), 2)

        eval_res = visual_validator.evaluate_multi_dimensional_confidence(
            crop_img=crop,
            formula_latex="10\\sqrt{3}\\,\\mathrm{g}",
            recognition_conf=0.95,
            structural_valid=True,
            domain_conf=0.92,
        )

        self.assertIn("overall_confidence", eval_res)
        self.assertIn("visual_similarity", eval_res)
        self.assertIn("structural_confidence", eval_res)
        self.assertGreater(eval_res["overall_confidence"], 0.70)


if __name__ == "__main__":
    unittest.main()
