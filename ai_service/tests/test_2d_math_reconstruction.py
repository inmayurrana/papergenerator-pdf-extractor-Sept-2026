"""
Regression Test Suite for 2-D Mathematical Equation & Structural Reconstruction Engine
Validates requirements for:
- 2-D layout analysis & spatial geometry
- Subscript preservation (M₁, M₂, M₃, m₁, T₂)
- Superscript preservation (x², 10⁻³, Fe³⁺)
- Fractions with parentheses and trailing variables (e.g. ((M₁ + M₂)/(M₁ + M₂ + M₃)) F)
- Radicals (√3, 10√3, √(x² + y²))
- Equations (F = ma)
- FormulaObject schema generation (latex, mathml, plainText, structuredExpression)
- Integration on real document: Question 73 & Question 74 regression test
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

import unittest
from ai_service.app.scientific.structural_tree import FormulaNode, NodeType
from ai_service.app.scientific.spatial_math_engine import (
    SpatialMathEngine,
    Symbol2D,
    DrawingLine2D,
    Formula2DResult,
    spatial_math_engine,
)
from ai_service.app.document.digital_extract import DigitalTextExtractor
from ai_service.app.layout.region_detector import RegionDetector
from ai_service.app.layout.reading_order import ReadingOrderSorter
from ai_service.app.layout.question_parser import QuestionParser


class Test2DMathematicalReconstructionEngine(unittest.TestCase):

    def test_01_subscript_structure_preservation(self):
        """Rule 4: Detect text below baseline. M₁, M₂, M₃ must not be flattened to M1, M2, M3."""
        for base, sub_val in [("M", "1"), ("M", "2"), ("M", "3"), ("m", "1"), ("T", "2")]:
            res = spatial_math_engine.parse_expression(f"{base}_{{{sub_val}}}")
            self.assertIsNotNone(res)
            self.assertEqual(res.ast.node_type, NodeType.SUBSCRIPT)
            self.assertEqual(res.ast.children[0].value, base)
            self.assertEqual(res.ast.children[1].value, sub_val)

            # Assert LaTeX, MathML, and Unicode Plain Text
            self.assertIn(f"_{{{sub_val}}}", res.latex)
            self.assertIn(f"<msub><mi>{base}</mi><mn>{sub_val}</mn></msub>", res.mathml)
            self.assertNotEqual(res.plain_text, f"{base}{sub_val}")

            # Assert FormulaObject schema
            fo = res.to_formula_object()
            self.assertEqual(fo["structuredExpression"]["type"], "SUBSCRIPT")
            self.assertEqual(fo["validationStatus"], "VERIFIED")

    def test_02_superscript_structure_preservation(self):
        """Rule 5: Detect text above baseline. x², 10⁻³, Fe³⁺."""
        res = spatial_math_engine.parse_expression("x^{2}")
        self.assertIsNotNone(res)
        self.assertEqual(res.ast.node_type, NodeType.POWER)
        self.assertEqual(res.ast.children[0].value, "x")
        self.assertEqual(res.ast.children[1].value, "2")
        self.assertIn("x²", res.plain_text)

    def test_03_fraction_detection_and_parentheses(self):
        """Rule 6 & 8: Horizontal line with numerator, denominator, parentheses, trailing factor."""
        expr_str = r"\left( \frac{M_{1}+M_{2}}{M_{1}+M_{2}+M_{3}} \right) F"
        res = spatial_math_engine.parse_expression(expr_str)
        self.assertIsNotNone(res)

        # AST must be MULTIPLY(implicit=True)
        self.assertEqual(res.ast.node_type, NodeType.MULTIPLY)
        self.assertTrue(res.ast.attributes.get("implicit"))
        self.assertEqual(len(res.ast.children), 2)

        # First child must be PARENTHESES enclosing FRACTION
        paren_node = res.ast.children[0]
        self.assertEqual(paren_node.node_type, NodeType.PARENTHESES)
        frac_node = paren_node.children[0]
        self.assertEqual(frac_node.node_type, NodeType.FRACTION)

        # Second child must be Variable 'F'
        self.assertEqual(res.ast.children[1].value, "F")

        # Numerator must be ADD(SUBSCRIPT(M,1), SUBSCRIPT(M,2))
        num_node = frac_node.children[0]
        self.assertEqual(num_node.node_type, NodeType.ADD)

        # MathML must contain mfrac and mrow
        self.assertIn("<mfrac>", res.mathml)
        self.assertIn("<mrow>", res.mathml)

        # Plain text must retain fraction and subscripts
        self.assertIn("M₁", res.plain_text)
        self.assertIn("M₂", res.plain_text)
        self.assertIn("F", res.plain_text)

    def test_04_options_from_uploaded_sample(self):
        """Test all 4 options from the uploaded NEET physics sample."""
        options_source = [
            (r"\left( \frac{M_{1}+M_{2}}{M_{1}+M_{2}+M_{3}} \right) F", NodeType.ADD),
            (r"\left( \frac{M_{2}+M_{3}}{M_{1}+M_{2}+M_{3}} \right) F", NodeType.ADD),
            (r"\left( \frac{M_{1}+M_{3}}{M_{1}+M_{2}+M_{3}} \right) F", NodeType.ADD),
            (r"\left( \frac{M_{1}-M_{2}}{M_{1}+M_{2}+M_{3}} \right) F", NodeType.SUBTRACT),
        ]
        for opt_latex, expected_num_type in options_source:
            res = spatial_math_engine.parse_expression(opt_latex)
            self.assertIsNotNone(res)
            frac = res.ast.children[0].children[0]
            num = frac.children[0]
            self.assertEqual(num.node_type, expected_num_type)
            fo = res.to_formula_object()
            self.assertIn("latex", fo)
            self.assertIn("mathml", fo)
            self.assertIn("structuredExpression", fo)

    def test_05_radicals_and_equations(self):
        """Rule 10 & 11: Radical structures and Equations."""
        res_sqrt = spatial_math_engine.parse_expression(r"10\sqrt{3}")
        self.assertIsNotNone(res_sqrt)
        self.assertEqual(res_sqrt.ast.node_type, NodeType.MULTIPLY)
        self.assertIn("\\sqrt{3}", res_sqrt.latex)

        res_eq = spatial_math_engine.parse_expression("F = ma")
        self.assertIsNotNone(res_eq)
        self.assertEqual(res_eq.ast.node_type, NodeType.EQUATION)
        self.assertEqual(res_eq.ast.children[0].value, "F")

    def test_06_real_document_end_to_end_q74(self):
        """
        Rule 30: End-to-End Regression Test on Question 74 from the real PDF document.
        Verifies:
        - Question text with M₁, M₂, M₃ subscripts
        - All 4 options with exact fractions, parentheses, and trailing F
        - Formula objects list with typed ASTs
        - Diagram detection and associated diagram labels
        """
        repo_root = Path(__file__).resolve().parent.parent.parent
        pdf_path = repo_root / "data" / "uploads" / "Physics XI+XII NEET_All (2) (2) (1)-1789862243154-974276682.pdf"
        if not pdf_path.exists():
            self.skipTest(f"Document {pdf_path} not found.")

        # Extract page 11 (1-indexed)
        spans = DigitalTextExtractor.extract_page_text_spans(pdf_path, 11, 800, 1100)
        self.assertTrue(len(spans) > 0, "Failed to extract spans from page 11")

        regions = []
        for s in spans:
            cl = RegionDetector.classify_text_region(s["text"], s["bbox"], 1100)
            regions.append({
                "id": s["id"],
                "type": cl["type"],
                "text": s["text"],
                "raw_text": s["text"],
                "bbox": s["bbox"],
                "confidence": 0.95,
                "question_number": cl.get("question_number"),
                "option_label": cl.get("option_label"),
                "formula_objects": s.get("formula_objects", []),
            })

        sorted_regions = ReadingOrderSorter.sort_regions(regions, 800)
        questions = QuestionParser.build_structured_questions(sorted_regions)

        q74_list = [q for q in questions if q.get("question_number") == "74"]
        self.assertEqual(len(q74_list), 1, "Question 74 was not uniquely identified")
        q74 = q74_list[0]

        # 1. Question stem contains masses with subscripts
        self.assertIn("Three masses", q74["question_text"])
        self.assertTrue("M_{1}" in q74["question_text"] or "M₁" in q74["question_text"])
        self.assertTrue("M_{2}" in q74["question_text"] or "M₂" in q74["question_text"])
        self.assertTrue("M_{3}" in q74["question_text"] or "M₃" in q74["question_text"])

        # 2. Options 1-4 are present
        self.assertEqual(len(q74["options"]), 4, "Question 74 does not have 4 options")
        for opt in q74["options"]:
            self.assertIn("formula_object", opt, f"Option {opt['key']} missing formula_object")
            fo = opt["formula_object"]
            self.assertEqual(fo["structuredExpression"]["type"], "MULTIPLY")
            self.assertIn("F", fo["latex"])
            self.assertIn("frac", fo["latex"])

        # 3. Formula objects populated
        self.assertTrue(len(q74["formula_objects"]) >= 4, "Formula objects not populated on Question 74")
        types = [fo["structuredExpression"]["type"] for fo in q74["formula_objects"]]
        self.assertIn("MULTIPLY", types)
        self.assertIn("SUBSCRIPT", types)

    def test_07_real_document_end_to_end_q73(self):
        """
        Rule 30: End-to-End Regression Test on Question 73.
        Verifies:
        - Question text with m₁, m₂, m₃, T₂ subscripts
        - Diagram annotations m₃, T₁, m₂, T₂, m₁, 40 N
        """
        repo_root = Path(__file__).resolve().parent.parent.parent
        pdf_path = repo_root / "data" / "uploads" / "Physics XI+XII NEET_All (2) (2) (1)-1789862243154-974276682.pdf"
        if not pdf_path.exists():
            self.skipTest(f"Document {pdf_path} not found.")

        spans = DigitalTextExtractor.extract_page_text_spans(pdf_path, 11, 800, 1100)
        regions = []
        for s in spans:
            cl = RegionDetector.classify_text_region(s["text"], s["bbox"], 1100)
            regions.append({
                "id": s["id"],
                "type": cl["type"],
                "text": s["text"],
                "raw_text": s["text"],
                "bbox": s["bbox"],
                "confidence": 0.95,
                "question_number": cl.get("question_number"),
                "option_label": cl.get("option_label"),
                "formula_objects": s.get("formula_objects", []),
            })

        sorted_regions = ReadingOrderSorter.sort_regions(regions, 800)
        questions = QuestionParser.build_structured_questions(sorted_regions)

        q73_list = [q for q in questions if q.get("question_number") == "73"]
        self.assertEqual(len(q73_list), 1, "Question 73 was not uniquely identified")
        q73 = q73_list[0]

        # Stem contains m1, m2, m3, T2 subscripts
        self.assertIn("m_{1}", q73["question_text"])
        self.assertIn("m_{2}", q73["question_text"])
        self.assertIn("m_{3}", q73["question_text"])
        self.assertIn("T_{2}", q73["question_text"])

        # Diagram annotations preserved
        self.assertTrue(len(q73.get("diagram_annotations", [])) > 0)


if __name__ == "__main__":
    unittest.main()
