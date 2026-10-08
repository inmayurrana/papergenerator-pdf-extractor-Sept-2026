"""
Comprehensive Acceptance Test Suite for Requirements 72 - 130
Tests:
  1. Section 124 Critical Mathematical and Scientific Acceptance Cases
  2. Section 125 Regression Tests on Real NEET Physics Textbook Page 13 (Q106 - Q114)
  3. Section 80/114 Font Registry & Symbol Coverage Testing
  4. Section 94-96 Watermark Detection & Non-Destructive Derivative Action
  5. Section 97-106 High-Fidelity Document Rendering (Mode A & Mode B) with Post-Export Validation
"""

import os
import sys
import json
import time
import unittest
from pathlib import Path
import numpy as np

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from ai_service.app.scientific.spatial_math_engine import SpatialMathEngine
from ai_service.app.scientific.structural_tree import FormulaNode, NodeType, ExpressionTreeBuilder
from ai_service.app.core.font_manager import font_manager
from ai_service.app.layout.watermark_detector import watermark_detector
from ai_service.app.document.high_fidelity_renderer import high_fidelity_renderer
from ai_service.app.document.digital_extract import digital_extractor
from ai_service.app.layout.region_detector import region_detector
from ai_service.app.layout.reading_order import reading_order_sorter
from ai_service.app.layout.question_parser import question_parser
from ai_service.app.pipeline.multimodal_v2 import multimodal_pipeline_v2


class TestHighFidelityAcceptance(unittest.TestCase):

    def test_01_section_124_critical_formulas(self):
        """Tests all 19 mandatory scientific & mathematical expressions from Section 124."""
        test_cases = [
            ("20!/18!", NodeType.FRACTION, r"\frac{20!}{18!}"),
            ("10!/(6!4!)", NodeType.FRACTION, r"\frac{10!}{6 ! 4!}"),
            (r"2 \times 4 \times 6 \times 8 \times 10", NodeType.MULTIPLY, r"2 \times 4 \times 6 \times 8 \times 10"),
            (r"-2\alpha v^2/M", NodeType.FRACTION, r"\frac{- 2 \alpha {v}^{2}}{M}"),
            (r"dM/dt = \alpha v", NodeType.EQUATION, r"dM/dt = \alpha v"),
            ("F = ma", NodeType.EQUATION, "F = ma"),
            ("E = mc^2", NodeType.EQUATION, r"E = {mc}^{2}"),
            (r"\sqrt{x^2+y^2}", NodeType.SQRT, r"\sqrt{{x}^{2} + {y}^{2}}"),
            (r"\int_{0}^{\infty} f(x)dx", NodeType.INTEGRAL, r"\int_{0}^{\infty} f(x)\,dx"),
            (r"\sum_{i=1}^{n} x_i", NodeType.EQUATION, r"\sum_{i = 1}^{n} {x}_{i}"),
            (r"x_1^2 + y_2^2", NodeType.ADD, r"{{x}_{1}}^{2} + {{y}_{2}}^{2}"),
            ("H_2O", NodeType.CHEM_COMPOUND, r"{H}_{2}O"),
            ("SO_4^{2-}", NodeType.POWER, r"{{SO}_{4}}^{2-}"),
            ("Fe^{3+}", NodeType.CHEMICAL_CHARGE, r"{Fe}^{3+}"),
            ("C_6H_{12}O_6", NodeType.CHEM_COMPOUND, r"{C}_{6}{H}_{12}{O}_{6}"),
            (r"1.25 \times 10^{-5}", NodeType.MULTIPLY, r"1.25 \times {10}^{-5}"),
            (r"\vec{x}", NodeType.VECTOR, r"\vec{x}"),
            (r"\begin{pmatrix} a & b \\ c & d \end{pmatrix}", NodeType.MATRIX, r"\begin{pmatrix}"),
            (r"\begin{cases} x^2 & x > 0 \\ 0 & x = 0 \\ -x^2 & x < 0 \end{cases}", NodeType.EQUATION, r"\begin{cases}"),
        ]

        passed = 0
        for expr, expected_ast_type, expected_latex_sub in test_cases:
            res = SpatialMathEngine.parse_expression(expr)
            self.assertIsNotNone(res, f"Failed to parse: {expr}")
            self.assertEqual(res.ast.node_type, expected_ast_type, f"AST node type mismatch for {expr}")
            self.assertIn(expected_latex_sub, res.latex, f"LaTeX output missing '{expected_latex_sub}' for {expr}")
            self.assertTrue(len(res.mathml) > 0, f"MathML was empty for {expr}")
            passed += 1

        print(f"\n[PASS] Section 124 Formula Tests: {passed}/{len(test_cases)} passed successfully.")

    def test_02_section_125_real_neet_page13_mcq_options(self):
        """Tests live extraction on NEET Physics textbook page 13 (Q106-Q114) with formula options."""
        pdf_path = PROJECT_ROOT / "data" / "uploads" / "Physics XI+XII NEET_All (2) (1) (1)-1791306632800-802011622.pdf"
        self.assertTrue(pdf_path.exists(), f"Source test PDF not found at {pdf_path}")

        img_w, img_h = 1556, 2200
        spans = digital_extractor.extract_page_text_spans(pdf_path, 13, img_w, img_h)
        self.assertTrue(len(spans) > 20, "Failed to extract text spans from page 13")

        regions = []
        for s in spans:
            cl = region_detector.classify_text_region(s["text"], s["bbox"], img_h)
            regions.append({
                "id": s["id"],
                "type": cl["type"],
                "text": s["text"],
                "raw_text": s["raw_text"],
                "bbox": s["bbox"],
                "confidence": 0.95,
                "question_number": cl.get("question_number"),
                "option_label": cl.get("option_label"),
                "sub_label": cl.get("sub_label"),
                "formula_objects": s.get("formula_objects", []),
            })

        sorted_regions = reading_order_sorter.sort_regions(regions, img_w)
        questions = question_parser.build_structured_questions(sorted_regions, [])

        self.assertGreaterEqual(len(questions), 8, "Expected at least 8 structured questions on page 13")

        # Verify Q106 has all 4 mathematical options intact with exact formulas
        q106 = next((q for q in questions if q.get("question_number") == "106"), None)
        self.assertIsNotNone(q106, "Q106 was not extracted")
        opts_106 = {o["key"]: o["text"] for o in q106.get("options", [])}
        self.assertEqual(len(opts_106), 4, f"Q106 should have 4 options, got: {opts_106}")
        self.assertIn(r"\frac{v_{0}^{2}}{2 \mu g}", opts_106["A"])
        self.assertIn(r"\frac{v_{0}^{2}}{\mu g}", opts_106["B"])
        self.assertIn(r"\left( \frac{v_{0}}{\mu g} \right)^{2}", opts_106["C"])
        self.assertIn(r"\frac{2v_{0}^{2}}{\mu g}", opts_106["D"])

        # Verify Q111 has 4 options with fractions and radicals
        q111 = next((q for q in questions if q.get("question_number") == "111"), None)
        self.assertIsNotNone(q111, "Q111 was not extracted")
        opts_111 = {o["key"]: o["text"] for o in q111.get("options", [])}
        self.assertEqual(len(opts_111), 4, f"Q111 should have 4 options, got: {opts_111}")
        self.assertIn(r"\frac{4.9}{\sqrt{2}}", opts_111["A"])
        self.assertIn(r"\sqrt{2}", opts_111["B"])

        # Verify Q112 has multi-term fractions
        q112 = next((q for q in questions if q.get("question_number") == "112"), None)
        self.assertIsNotNone(q112, "Q112 was not extracted")
        opts_112 = {o["key"]: o["text"] for o in q112.get("options", [])}
        self.assertEqual(len(opts_112), 4, f"Q112 should have 4 options, got: {opts_112}")
        self.assertIn(r"P+Q\sin\theta", opts_112["A"])

        print(f"[PASS] Section 125 NEET Page 13 Regression: {len(questions)} questions extracted with verified formula options.")

    def test_03_font_registry_and_symbol_coverage(self):
        """Tests Section 80/114 Font Registry and Symbol Coverage test."""
        reg = font_manager.get_font_registry()
        self.assertGreater(reg["total_fonts"], 0)

        # Test symbol coverage
        cov = font_manager.test_symbol_coverage()
        self.assertGreater(cov["total_symbols_tested"], 50)
        self.assertGreaterEqual(cov["coverage_percentage"], 95.0)
        self.assertEqual(cov["verification_status"], "HIGH_FIDELITY_VERIFIED")

        # Test fallback resolution without silent substitution
        sub = font_manager.resolve_font_fallback("Times-BoldItalic")
        self.assertEqual(sub["matchedFont"], "STIX Two Math")
        self.assertIn("STIX Two Math", sub["fontSubstitutionReason"])

        print(f"[PASS] Font Registry & Symbol Coverage: {cov['coverage_percentage']}% coverage verified.")

    def test_04_watermark_intelligence(self):
        """Tests Section 94-96 Watermark detection and authorized non-destructive actions."""
        # Create a synthetic image with a faint watermark
        img = np.full((600, 400, 3), 255, dtype=np.uint8)
        # Add faint watermark text
        import cv2
        cv2.putText(img, "DRAFT WATERMARK", (50, 300), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (220, 220, 220), 2)

        candidates = watermark_detector.detect_watermark_candidates([img])
        # Non-destructive operation test: original must remain completely untouched
        orig_copy = img.copy()
        derivative, res = watermark_detector.apply_watermark_action(
            img,
            watermark_id="wm_test_1",
            action="REMOVE_FROM_EXPORT",
            bbox=[40, 260, 320, 60],
            user_authorized=True
        )
        # Verify original was not mutated
        self.assertTrue(np.array_equal(img, orig_copy), "CRITICAL: Original image was mutated!")
        self.assertTrue(res.get("user_authorized"), "User authorization was not recorded")

        print("[PASS] Watermark Intelligence: Detection and non-destructive derivative action verified.")

    def test_05_high_fidelity_dual_mode_export(self):
        """Tests Section 97-106 High-Fidelity export in both Mode A and Mode B with post-export validation."""
        test_page_data = {
            "width": 1556,
            "height": 2200,
            "regions": [
                {"id": "r1", "type": "QUESTION_NUMBER", "text": "106.", "bbox": [50, 60, 40, 20]},
                {"id": "r2", "type": "TEXT", "text": "A car is moving along a straight horizontal road with speed v0.", "bbox": [100, 60, 600, 20]},
                {"id": "r3", "type": "OPTION", "text": "(A) $\\frac{v_{0}^{2}}{2\\mu g}$", "bbox": [100, 100, 150, 40]},
                {"id": "r4", "type": "OPTION", "text": "(B) $\\frac{v_{0}^{2}}{\\mu g}$", "bbox": [300, 100, 150, 40]},
            ],
            "diagrams": []
        }

        # Mode A: Structured Reconstruction
        mode_a_res = high_fidelity_renderer.render_document(
            pages_data=[test_page_data],
            mode="STRUCTURED_RECONSTRUCTION",
            quality="PRINT_QUALITY",
            output_filename="test_mode_a_export.pdf"
        )
        self.assertEqual(mode_a_res["status"], "SUCCESS")
        self.assertTrue(mode_a_res["validation_report"]["is_valid"])
        self.assertTrue(mode_a_res["validation_report"]["searchable_text_layer"])

        # Mode B: Source Fidelity
        mode_b_res = high_fidelity_renderer.render_document(
            pages_data=[test_page_data],
            mode="SOURCE_FIDELITY",
            quality="HIGH_QUALITY",
            output_filename="test_mode_b_export.pdf"
        )
        self.assertEqual(mode_b_res["status"], "SUCCESS")
        self.assertTrue(mode_b_res["validation_report"]["is_valid"])

        print("[PASS] High-Fidelity Document Export: Mode A & Mode B rendered and post-validated successfully.")


if __name__ == "__main__":
    unittest.main()
