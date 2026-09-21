import unittest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from ai_service.app.scientific.spatial_math_engine import spatial_math_engine, Formula2DResult
from ai_service.app.scientific.structural_tree import FormulaNode, NodeType
from ai_service.app.scientific.physics_engine import physics_engine
from ai_service.app.scientific.chemistry_engine import chemistry_engine
from ai_service.app.scientific.biology_engine import biology_engine
from ai_service.app.scientific.scientific_units import scientific_units
from ai_service.app.scientific.mixed_tokenizer import mixed_tokenizer
from ai_service.app.layout.region_detector import region_detector


class TestUniversalScientificEngine(unittest.TestCase):
    """
    Comprehensive test suite validating the Master Requirement:
    Universal Mathematics + Physics + Chemistry + Biology extraction.
    """

    # 1. MATHEMATICS & 2-D SPATIAL STRUCTURE
    def test_mathematical_fraction_with_subscripts_and_trailing_factor(self):
        latex = r"\left(\frac{M_1+M_2}{M_1+M_2+M_3}\right) F"
        res = spatial_math_engine.parse_expression(latex, bbox=(10, 20, 100, 30))
        self.assertIsNotNone(res)
        fo = res.to_formula_object()
        self.assertTrue("{M}_{1}" in fo["latex"] or "M_1" in fo["latex"])
        self.assertTrue("{M}_{3}" in fo["latex"] or "M_3" in fo["latex"])
        self.assertIn("F", fo["latex"])
        self.assertEqual(fo["domain"], "PHYSICS")

        # Verify spatial relationships
        rels = fo.get("spatialRelationships", [])
        rel_types = [r["relation"] for r in rels]
        self.assertIn("NUMERATOR_OF", rel_types)
        self.assertIn("DENOMINATOR_OF", rel_types)
        self.assertIn("ABOVE", rel_types)
        self.assertIn("BELOW", rel_types)
        self.assertIn("INSIDE", rel_types)

    def test_mathematical_radicals_and_nested_powers(self):
        res = spatial_math_engine.parse_expression(r"\sqrt{x^2 + y^2}", bbox=(0, 0, 50, 20))
        self.assertIsNotNone(res)
        fo = res.to_formula_object()
        self.assertIn(r"\sqrt", fo["latex"])
        self.assertIn("x", fo["latex"])
        rels = fo.get("spatialRelationships", [])
        self.assertTrue(any(r["relation"] == "RADICAND_OF" for r in rels))
        self.assertTrue(any(r["relation"] == "SUPERSCRIPT_OF" or r["relation"] == "ABOVE" for r in rels))

    def test_unicode_plain_text_preservation(self):
        res = spatial_math_engine.parse_expression(r"M_1 + M_2", bbox=(0, 0, 40, 15))
        self.assertIsNotNone(res)
        pt = res.plain_text
        self.assertIn("M₁", pt, "Plain text representation must preserve Unicode subscript M₁")
        self.assertIn("M₂", pt, "Plain text representation must preserve Unicode subscript M₂")

    # 2. PHYSICS DOMAIN & COMPOUND UNITS
    def test_physics_units_and_equations(self):
        phys_text = r"F = ma = 24 N"
        eval_res = physics_engine.analyze_physics_region(phys_text)
        self.assertTrue(eval_res["is_physics"])
        self.assertTrue(eval_res["is_equation"])

        # Compound unit
        accel_text = r"a = 9.8 m/s^2"
        f_part, unit = scientific_units.split_formula_and_unit(accel_text)
        self.assertEqual(unit, "m/s^2")
        self.assertIn("a = 9.8", f_part)

    def test_physics_vectors(self):
        vec_text = r"\vec{v} = 5\hat{i} + 3\hat{j}"
        eval_res = physics_engine.analyze_physics_region(vec_text)
        self.assertTrue(eval_res["is_physics"])
        self.assertTrue(eval_res["has_vectors"])

    # 3. CHEMISTRY DOMAIN & REACTION BALANCING
    def test_chemistry_chemical_equation_and_charges(self):
        eq = r"2H_2 + O_2 -> 2H_2O"
        eval_res = chemistry_engine.validate_chemical_equation(eq)
        self.assertTrue(eval_res["is_reaction"])
        self.assertTrue(eval_res["is_balanced"])

        # Charges
        ion_latex = chemistry_engine.format_chemical_latex("Fe3+ + SO4^2- -> Fe2(SO4)3")
        self.assertIn("^{3+}", ion_latex)
        self.assertIn("^{2-}", ion_latex)

    # 4. BIOLOGY DOMAIN & GENETICS NOTATION
    def test_biology_genetics_cross_and_directionality(self):
        bio_text = r"Parents: ♀ X^A X^a × ♂ X^A Y produces F1 generation in 5' to 3' direction"
        eval_res = biology_engine.analyze_biology_region(bio_text)
        self.assertTrue(eval_res["is_biology"])
        self.assertTrue(eval_res["has_genetics_cross"])
        self.assertTrue(eval_res["has_directionality"])
        self.assertTrue(eval_res["has_sex_symbol"])

        formatted = biology_engine.format_biology_latex(bio_text)
        self.assertIn(r"\venus", formatted)
        self.assertIn(r"\mars", formatted)
        self.assertIn(r"5'", formatted)
        self.assertIn(r"3'", formatted)

    # 5. MIXED CONTENT TOKENIZER (Section 19)
    def test_mixed_content_tokenizer(self):
        sentence = r"The acceleration of the body is a = \sqrt{3} m/s^2."
        tokens = mixed_tokenizer.tokenize_mixed_sentence(sentence)
        types = [t["type"] for t in tokens]
        self.assertEqual(types, ["TEXT", "FORMULA", "UNIT", "TEXT"])
        self.assertEqual(tokens[0]["content"], "The acceleration of the body is ")
        self.assertEqual(tokens[1]["content"], r"a = \sqrt{3}")
        self.assertEqual(tokens[2]["content"], "m/s^2")
        self.assertEqual(tokens[3]["content"], ".")

    # 6. UNIVERSAL REGION DETECTOR (Section 3)
    def test_region_detector_classification(self):
        # Biology
        c_bio = region_detector.classify_text_region("ATP synthesis and F1 generation with 5' to 3'", [0, 100, 200, 20], 1000)
        self.assertEqual(c_bio["type"], "BIOLOGY")

        # Chemistry
        c_chem = region_detector.classify_text_region("HCl + NaOH -> NaCl + H2O", [0, 100, 200, 20], 1000)
        self.assertEqual(c_chem["type"], "CHEMISTRY")

        # Physics
        c_phys = region_detector.classify_text_region("Acceleration a = 4.5 m/s^2 with vector \\vec{F}", [0, 100, 200, 20], 1000)
        self.assertEqual(c_phys["type"], "PHYSICS")

        # Mixed
        c_mix = region_detector.classify_text_region("The tension in the thread is T = \\frac{M_1}{M_2} F", [0, 100, 200, 20], 1000)
        self.assertIn(c_mix["type"], ("MIXED", "MATHEMATICS", "PHYSICS"))


if __name__ == "__main__":
    unittest.main()
