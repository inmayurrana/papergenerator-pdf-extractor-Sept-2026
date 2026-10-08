import unittest
from pathlib import Path
import fitz

from ai_service.app.document.digital_extract import DigitalTextExtractor
from ai_service.app.engines.specialized_math import specialized_math
from ai_service.app.layout.region_detector import region_detector
from ai_service.app.engines.router import ocr_router
from ai_service.app.layout.reading_order import reading_order_sorter
from ai_service.app.layout.question_parser import question_parser


def test_specialized_math_exactmath_protection():
    """Verify that fractions with trig functions do not leak __EXACTMATH_ placeholders."""
    test_cases = [
        ("(1)\\frac{P+Q\\sin\\theta}{mg+Qcos \\theta}", r"\frac{P+Q\sin\theta}{mg+Q\cos\theta}"),
        ("(2)\\frac{Pcos \\theta + Q}{mg-Q\\sin\\theta}", r"\frac{P\cos\theta + Q}{mg-Q\sin\theta}"),
        ("(3)\\frac{P+Qcos \\theta}{mg+Q\\sin\\theta}", r"\frac{P+Q\cos\theta}{mg+Q\sin\theta}"),
        ("(4)\\frac{P\\sin\\theta + Q}{mg-Qcos \\theta}", r"\frac{P\sin\theta + Q}{mg-Q\cos\theta}"),
    ]
    for raw, expected_sub in test_cases:
        converted = specialized_math.convert_embedded_math(raw)
        assert "__EXACTMATH_" not in converted, f"Leaked placeholder in: {converted}"
        assert expected_sub.replace(" ", "") in converted.replace(" ", ""), f"Expected {expected_sub} in {converted}"


def test_question_parser_consecutive_progression():
    """Verify that multi-row options like (3) ... (4) ... are recognized as valid options."""
    res = question_parser.parse_options_from_text(r"(3) 19.6\sqrt{2} (4) 4.9")
    assert len(res) == 2, f"Expected 2 options, got {len(res)}"
    assert res[0]["key"] == "C"
    assert res[1]["key"] == "D"


def test_page13_math_options_extraction():
    """Verify that Page 13 of the textbook extracts all math options correctly for Q106, Q111, Q112."""
    pdf_path = Path("data/uploads/Physics XI+XII NEET_All (2) (1) (1)-1791306632800-802011622.pdf")
    if not pdf_path.exists():
        print(f"Test PDF not found at {pdf_path}, skipping.")
        return

    doc = fitz.open(str(pdf_path))
    page = doc[12]  # Page 13 (0-indexed 12)
    img_w, img_h = int(page.rect.width * 2), int(page.rect.height * 2)

    spans = DigitalTextExtractor.extract_page_text_spans(pdf_path, 13, img_w, img_h)
    assert len(spans) > 20

    regions = []
    for s in spans:
        classification = region_detector.classify_text_region(s["text"], s["bbox"], img_h)
        rtype = classification["type"]
        routed = ocr_router.route_and_process_region(s["text"], rtype, "BALANCED")
        regions.append({
            "id": s["id"],
            "type": rtype,
            "text": routed["processed_text"],
            "raw_text": s["text"],
            "bbox": s["bbox"],
            "confidence": routed["confidence"],
            "validation_status": routed.get("validation_status", "VALIDATED"),
            "needs_review": routed.get("needs_review", False),
            "source": s["source"],
            "formula_objects": s.get("formula_objects", []),
            "specialized_data": routed.get("specialized_data", {}),
            "question_number": classification.get("question_number"),
            "option_label": classification.get("option_label"),
            "sub_label": classification.get("sub_label"),
        })

    sorted_regions = reading_order_sorter.sort_regions(regions, img_w)
    questions = question_parser.build_structured_questions(sorted_regions, [])

    q_map = {q["question_number"]: q for q in questions if q.get("question_number")}

    # Q106: All 4 options extracted, ordered A, B, C, D, with powers and subscripts intact
    assert "106" in q_map
    q106 = q_map["106"]
    assert len(q106["options"]) == 4
    assert [o["key"] for o in q106["options"]] == ["A", "B", "C", "D"]
    opt_a_text = q106["options"][0]["text"]
    assert "v_{0}^{2}" in opt_a_text or "v_{0}^2" in opt_a_text or "v_0^2" in opt_a_text
    assert "v^{2} 0" not in opt_a_text
    opt_c_text = q106["options"][2]["text"]
    assert ")^{2}" in opt_c_text or ")^2" in opt_c_text or "}^{2}" in opt_c_text

    # Q111: All 4 options extracted, stem does NOT steal fraction
    assert "111" in q_map
    q111 = q_map["111"]
    assert r"\frac{4.9}{2}" not in q111["question_text"]
    assert len(q111["options"]) == 4
    assert [o["key"] for o in q111["options"]] == ["A", "B", "C", "D"]
    assert r"\frac{4.9}{\sqrt{2}}" in q111["options"][0]["text"]
    assert r"\sqrt{2}" in q111["options"][1]["text"]

    # Q112: All 4 options extracted, zero __EXACTMATH_ leakage
    assert "112" in q_map
    q112 = q_map["112"]
    assert len(q112["options"]) == 4
    assert [o["key"] for o in q112["options"]] == ["A", "B", "C", "D"]
    for opt in q112["options"]:
        assert "__EXACTMATH_" not in opt["text"]
        assert r"\frac{" in opt["text"]


def test_page14_q120_options_extraction():
    """Verify that Page 14 Q120 extracts all 4 options cleanly without Symbol font artifacts."""
    pdf_path = Path("data/uploads/Physics XI+XII NEET_All (2) (1) (1)-1791306632800-802011622.pdf")
    if not pdf_path.exists():
        print(f"Test PDF not found at {pdf_path}, skipping.")
        return

    doc = fitz.open(str(pdf_path))
    page = doc[13]  # Page 14 (0-indexed 13)
    img_w, img_h = int(page.rect.width * 2), int(page.rect.height * 2)

    spans = DigitalTextExtractor.extract_page_text_spans(pdf_path, 14, img_w, img_h)
    assert len(spans) > 20

    regions = []
    for s in spans:
        classification = region_detector.classify_text_region(s["text"], s["bbox"], img_h)
        rtype = classification["type"]
        routed = ocr_router.route_and_process_region(s["text"], rtype, "BALANCED")
        regions.append({
            "id": s["id"],
            "type": rtype,
            "text": routed["processed_text"],
            "raw_text": s["text"],
            "bbox": s["bbox"],
            "confidence": routed["confidence"],
            "validation_status": routed.get("validation_status", "VALIDATED"),
            "needs_review": routed.get("needs_review", False),
            "source": s["source"],
            "formula_objects": s.get("formula_objects", []),
            "specialized_data": routed.get("specialized_data", {}),
            "question_number": classification.get("question_number"),
            "option_label": classification.get("option_label"),
            "sub_label": classification.get("sub_label"),
        })

    sorted_regions = reading_order_sorter.sort_regions(regions, img_w)
    questions = question_parser.build_structured_questions(sorted_regions, [])

    q_map = {q["question_number"]: q for q in questions if q.get("question_number")}
    assert "120" in q_map
    q120 = q_map["120"]
    assert len(q120["options"]) == 4
    assert [o["key"] for o in q120["options"]] == ["A", "B", "C", "D"]

    opt_texts = [o["text"] for o in q120["options"]]
    # Zero legacy font artifact characters
    for ot in opt_texts:
        for bad_char in ['æ', 'ç', 'è', 'ö', '÷', 'ø']:
            assert bad_char not in ot, f"Artifact character {bad_char} found in: {ot}"

    # Option A: (1 - 1/n^2)
    assert r"\frac{1}{n^{2}}" in opt_texts[0] or r"\frac{1}{n^2}" in opt_texts[0]
    # Option B: (1 / (1 - n^2))
    assert r"\frac{1}{1-n^{2}}" in opt_texts[1] or r"\frac{1}{1-n^2}" in opt_texts[1]
    # Option C: \sqrt{1 - 1/n^2}
    assert r"\sqrt{" in opt_texts[2]
    assert r"\frac{1}{n^{2}}" in opt_texts[2] or r"\frac{1}{n^2}" in opt_texts[2]
    # Option D: \sqrt{1 / (1 - n^2)}
    assert r"\sqrt{" in opt_texts[3]
    assert r"\frac{1}{1-n^{2}}" in opt_texts[3] or r"\frac{1}{1-n^2}" in opt_texts[3]

