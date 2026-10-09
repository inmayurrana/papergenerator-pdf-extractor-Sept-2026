import unittest
from ai_service.app.layout.region_detector import region_detector
from ai_service.app.layout.question_parser import question_parser
from ai_service.app.layout.reading_order import reading_order_sorter

class TestScannedImageOCRExtraction(unittest.TestCase):
    def test_compact_ocr_question_classification(self):
        """Tests that compact tokens without spaces produced by RapidOCR are correctly classified as QUESTION."""
        tokens = [
            ("4.How many numbers greater than 10 lacs be formed", "4"),
            ("5.The number of different signals which can be given", "5"),
            ("6.The number of words from the letters", "6"),
            ("7.The number of six letter words", "7"),
            ("8.The number of arrangements", "8"),
            ("Q.7The number of arrangements", "7"),
            ("11.Number of all four digit numbers", "11"),
            ("13.If in a group of n distinct objects", "13"),
        ]
        for text, exp_num in tokens:
            res = region_detector.classify_text_region(text, [50, 200, 400, 25], 1000)
            self.assertEqual(res["type"], "QUESTION", f"Failed to classify {text} as QUESTION")
            self.assertEqual(str(res.get("question_number")), exp_num)

    def test_top_margin_options_not_classified_as_header(self):
        """Tests that options and question stems near top edge (y < 80) in cropped images are NOT classified as HEADER."""
        # Option near top:
        opt_res = region_detector.classify_text_region("(a) 420", [50, 40, 100, 20], 1000)
        self.assertEqual(opt_res["type"], "OPTION")
        self.assertEqual(opt_res["option_label"], "A")

        # Multi-option near top:
        multi_res = region_detector.classify_text_region("(a) 420 (b) 360", [50, 40, 300, 20], 1000)
        self.assertEqual(multi_res["type"], "OPTION")

        # Question stem near top:
        q_res = region_detector.classify_text_region("4. How many numbers greater than 10 lacs", [50, 40, 500, 20], 1000)
        self.assertEqual(q_res["type"], "QUESTION")

    def test_trailing_inline_option_and_stem_extraction(self):
        """Tests extraction of trailing single inline option at end of question stem."""
        regions = [
            {
                "id": "r1",
                "type": "QUESTION",
                "question_number": "4",
                "text": "4. How many numbers greater than 10 lacs be formed ?(a) 420",
                "confidence": 0.98,
                "bbox": [50, 100, 600, 25],
            },
            {
                "id": "r2",
                "type": "OPTION",
                "text": "(b) 360",
                "confidence": 0.98,
                "bbox": [150, 130, 80, 20],
            },
            {
                "id": "r3",
                "type": "OPTION",
                "text": "(c)",
                "confidence": 0.98,
                "bbox": [250, 130, 30, 20],
            },
            {
                "id": "r4",
                "type": "PARAGRAPH",
                "text": "400",
                "confidence": 0.98,
                "bbox": [290, 130, 50, 20],
            },
            {
                "id": "r5",
                "type": "OPTION",
                "text": "(d) 300",
                "confidence": 0.98,
                "bbox": [360, 130, 80, 20],
            },
        ]
        questions = question_parser.build_structured_questions(regions, [])
        self.assertEqual(len(questions), 1)
        q = questions[0]
        self.assertEqual(q["question_number"], "4")
        self.assertNotIn("(a)", q["question_text"])
        self.assertEqual(len(q["options"]), 4)
        keys = [o["key"] for o in q["options"]]
        self.assertEqual(keys, ["A", "B", "C", "D"])
        self.assertEqual(q["options"][0]["text"], "420")
        self.assertEqual(q["options"][1]["text"], "360")
        self.assertEqual(q["options"][2]["text"], "400")
        self.assertEqual(q["options"][3]["text"], "300")

    def test_paragraph_stem_continuation_with_trailing_option(self):
        """Tests paragraph continuation line that ends with an inline option."""
        regions = [
            {
                "id": "r1",
                "type": "QUESTION",
                "question_number": "5",
                "text": "5. The number of different signals which can be given from 6 flags of different colours",
                "confidence": 0.98,
                "bbox": [50, 200, 600, 25],
            },
            {
                "id": "r2",
                "type": "PARAGRAPH",
                "text": "taking one or more at a time, is(a) 1958",
                "confidence": 0.98,
                "bbox": [50, 230, 400, 25],
            },
            {
                "id": "r3",
                "type": "OPTION",
                "text": "3(b)1956(c)16(d)64",
                "confidence": 0.98,
                "bbox": [50, 260, 500, 25],
            },
        ]
        questions = question_parser.build_structured_questions(regions, [])
        self.assertEqual(len(questions), 1)
        q = questions[0]
        self.assertIn("taking one or more at a time", q["question_text"])
        self.assertEqual(len(q["options"]), 4)
        keys = [o["key"] for o in q["options"]]
        self.assertEqual(keys, ["A", "B", "C", "D"])
        self.assertEqual(q["options"][0]["text"], "1958")
        self.assertEqual(q["options"][1]["text"], "1956")
        self.assertEqual(q["options"][2]["text"], "16")
        self.assertEqual(q["options"][3]["text"], "64")

if __name__ == "__main__":
    unittest.main()
