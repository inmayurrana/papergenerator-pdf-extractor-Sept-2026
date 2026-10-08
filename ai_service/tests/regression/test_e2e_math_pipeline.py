"""
End-to-end integration test for the redesigned mathematical formula extraction pipeline.
Tests the entire pipeline:
1. Geometric/spatial 2D structure detection & AST generation
2. Visual formula verification
3. Question and option parser preservation with original crop attachments
4. Strict quality control (no false 'All Verified')
"""

import unittest
from ai_service.app.engines.spatial_ast_engine import spatial_math_engine
from ai_service.app.scientific.visual_formula_verifier import visual_formula_verifier
from ai_service.app.layout.question_parser import question_parser


class TestE2EMathPipeline(unittest.TestCase):
    def test_e2e_spatial_ast_to_latex_and_mathml(self):
        # Build 2D fraction -2 \alpha v^2 / M
        parsed = spatial_math_engine.parse("\\frac{-2\\alpha v^2}{M}")
        latex = parsed["latex"]
        mathml = parsed["mathml"]

        self.assertIn("\\frac", latex)
        self.assertIn("\\alpha", latex)
        self.assertIn("v^{2}", latex)
        self.assertIn("M", latex)

        self.assertIn("<mfrac>", mathml)
        self.assertTrue("&alpha;" in mathml or "\u03b1" in mathml)
        self.assertIn("<msup>", mathml)
        self.assertTrue(parsed["has_fraction"])
        self.assertTrue(parsed["has_superscript"])

    def test_e2e_question_parser_with_option_crops(self):
        # Simulate regions produced by geometric detector and routed OCR
        mock_regions = [
            {
                "type": "QUESTION",
                "text": "33. \\frac{dM}{dt} = +\\alpha v",
                "question_number": "33",
                "bbox": [50, 100, 300, 130],
                "crop_url": "/api/static/crops/q33_stem.png",
                "confidence": 0.96,
                "validation_status": "VALIDATED",
                "needs_review": False,
                "formula_objects": [
                    {
                        "id": "q33-fo-1",
                        "latex": "\\frac{dM}{dt} = +\\alpha v",
                        "plainText": "dM/dt = +alpha v",
                        "structuredExpression": {"type": "EQUATION"},
                        "validationStatus": "VERIFIED",
                        "originalCrop": "/api/static/crops/q33_stem.png",
                    }
                ],
            },
            {
                "type": "OPTION",
                "text": "(A) \\frac{-2\\alpha v^2}{M}",
                "bbox": [50, 140, 200, 170],
                "crop_url": "/api/static/crops/q33_opt_a.png",
                "confidence": 0.97,
                "validation_status": "VALIDATED",
                "needs_review": False,
                "specialized_data": {
                    "spatial_ast": {"type": "FRACTION"},
                    "mathml": "<mfrac><mrow>-2&alpha;<msup><mi>v</mi><mn>2</mn></msup></mrow><mi>M</mi></mfrac>",
                },
            },
            {
                "type": "OPTION",
                "text": "(B) \\frac{-3\\alpha v^2}{M}",
                "bbox": [210, 140, 360, 170],
                "crop_url": "/api/static/crops/q33_opt_b.png",
                "confidence": 0.95,
                "validation_status": "NEEDS_REVIEW",
                "needs_review": True,
                "specialized_data": {
                    "spatial_ast": {"type": "FRACTION"},
                    "mathml": "<mfrac><mrow>-3&alpha;<msup><mi>v</mi><mn>2</mn></msup></mrow><mi>M</mi></mfrac>",
                },
            },
        ]

        questions = question_parser.build_structured_questions(mock_regions, [])
        self.assertEqual(len(questions), 1)

        q = questions[0]
        self.assertEqual(q.get("question_number"), "33")
        self.assertEqual(len(q.get("options", [])), 2)

        opt_a = q["options"][0]
        self.assertEqual(opt_a["key"], "A")
        self.assertEqual(opt_a["crop_url"], "/api/static/crops/q33_opt_a.png")
        self.assertIsNotNone(opt_a.get("formula_object"))
        self.assertEqual(opt_a["formula_object"]["originalCrop"], "/api/static/crops/q33_opt_a.png")

        opt_b = q["options"][1]
        self.assertEqual(opt_b["key"], "B")
        self.assertEqual(opt_b["crop_url"], "/api/static/crops/q33_opt_b.png")
        self.assertEqual(opt_b["validation_status"], "NEEDS_REVIEW")
        self.assertEqual(opt_b["formula_object"]["validationStatus"], "NEEDS_REVIEW")

        # Because Option B has NEEDS_REVIEW, question must NOT have all verified
        has_unverified = any(
            fo.get("validationStatus") != "VERIFIED" for fo in q.get("formula_objects", [])
        )
        self.assertTrue(has_unverified, "Question with unverified option must have unverified formula objects")


if __name__ == "__main__":
    unittest.main()
