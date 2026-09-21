import unittest
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from ai_service.app.document.digital_extract import DigitalTextExtractor
from ai_service.app.layout.region_detector import region_detector
from ai_service.app.layout.question_parser import QuestionParser


class TestQ74Regression(unittest.TestCase):
    """
    Permanent regression test for Question 74 from the uploaded NEET physics sample.
    Verifies Section 20, 27, and 28 acceptance criteria:
    1. Question stem correctly preserves M₁, M₂, M₃ as structured subscript formula objects.
    2. Options (1), (2), (3), (4) are strictly separated into 4 distinct containers.
    3. Each option contains a unified FormulaObject spanning parenthesis, fraction bar, and trailing factor F.
    4. Each option retains an original high-resolution pixel crop.
    """

    @classmethod
    def setUpClass(cls):
        repo_root = Path(__file__).resolve().parent.parent.parent
        pdf_path = repo_root / "data" / "uploads" / "Physics XI+XII NEET_All (2) (2) (1)-1789862243154-974276682.pdf"
        if not pdf_path.exists():
            raise unittest.SkipTest(f"Sample PDF not found at {pdf_path}")

        spans = DigitalTextExtractor.extract_page_text_spans(pdf_path, 11, 800, 1100)
        regions = []
        for s in spans:
            cl = region_detector.classify_text_region(s["text"], s["bbox"], 1100)
            r = {
                "id": s["id"],
                "type": cl["type"],
                "text": s["text"],
                "bbox": s["bbox"],
                "confidence": s["confidence"],
                "formula_objects": s.get("formula_objects", []),
            }
            if "question_number" in cl:
                r["question_number"] = cl["question_number"]
            if "option_label" in cl:
                r["option_label"] = cl["option_label"]
            regions.append(r)

        questions = QuestionParser.build_structured_questions(regions)
        cls.q74 = next((q for q in questions if q.get("question_number") == "74"), None)

    def test_q74_found(self):
        self.assertIsNotNone(self.q74, "Question 74 should be found on Page 11")

    def test_stem_subscripts(self):
        stem = self.q74.get("question_text", "")
        self.assertIn("Three masses", stem)
        self.assertIn("M_{1}", stem)
        self.assertIn("M_{2}", stem)
        self.assertIn("M_{3}", stem)

        # Check structured formula objects on the question
        fo_latexes = [fo.get("latex", "") for fo in self.q74.get("formula_objects", [])]
        self.assertTrue(any("{M}_{1}" in fl or "M_1" in fl for fl in fo_latexes), "M_1 should be a formula object")
        self.assertTrue(any("{M}_{2}" in fl or "M_2" in fl for fl in fo_latexes), "M_2 should be a formula object")
        self.assertTrue(any("{M}_{3}" in fl or "M_3" in fl for fl in fo_latexes), "M_3 should be a formula object")

    def test_options_separated_into_four_containers(self):
        options = self.q74.get("options", [])
        self.assertEqual(len(options), 4, "Question 74 MUST have exactly 4 separate option containers (Section 9)")
        keys = [opt.get("key") for opt in options]
        self.assertEqual(keys, ["A", "B", "C", "D"])

    def test_option_1_fraction_structure(self):
        opt = self.q74.get("options", [])[0]
        self.assertIn("M_{1}+M_{2}", opt.get("text", ""))
        self.assertIn("M_{1}+M_{2}+M_{3}", opt.get("text", ""))
        self.assertTrue(opt.get("text", "").endswith("F"), "Option 1 must include trailing factor F")

        fo = opt.get("formula_object")
        self.assertIsNotNone(fo, "Option 1 must have an associated FormulaObject")
        self.assertIn("\\frac", fo.get("latex", ""))
        self.assertIn("F", fo.get("latex", ""))
        self.assertTrue(fo.get("originalCrop", "").endswith(".png"), "FormulaObject must have an original crop image path")

    def test_option_2_fraction_structure(self):
        opt = self.q74.get("options", [])[1]
        self.assertIn("M_{2}+M_{3}", opt.get("text", ""))
        self.assertIn("M_{1}+M_{2}+M_{3}", opt.get("text", ""))
        self.assertTrue(opt.get("text", "").endswith("F"))

        fo = opt.get("formula_object")
        self.assertIsNotNone(fo)
        self.assertIn("\\frac", fo.get("latex", ""))
        self.assertIn("F", fo.get("latex", ""))
        self.assertTrue(fo.get("originalCrop", "").endswith(".png"))

    def test_option_3_fraction_structure(self):
        opt = self.q74.get("options", [])[2]
        self.assertIn("M_{1}+M_{3}", opt.get("text", ""))
        self.assertIn("M_{1}+M_{2}+M_{3}", opt.get("text", ""))
        self.assertTrue(opt.get("text", "").endswith("F"))

        fo = opt.get("formula_object")
        self.assertIsNotNone(fo)
        self.assertIn("\\frac", fo.get("latex", ""))
        self.assertIn("F", fo.get("latex", ""))
        self.assertTrue(fo.get("originalCrop", "").endswith(".png"))

    def test_option_4_fraction_structure(self):
        opt = self.q74.get("options", [])[3]
        self.assertIn("M_{1}-M_{2}", opt.get("text", ""))
        self.assertIn("M_{1}+M_{2}+M_{3}", opt.get("text", ""))
        self.assertTrue(opt.get("text", "").endswith("F"))

        fo = opt.get("formula_object")
        self.assertIsNotNone(fo)
        self.assertIn("\\frac", fo.get("latex", ""))
        self.assertIn("F", fo.get("latex", ""))
        self.assertTrue(fo.get("originalCrop", "").endswith(".png"))


if __name__ == "__main__":
    unittest.main()
