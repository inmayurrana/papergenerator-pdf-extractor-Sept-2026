import sys
sys.path.insert(0, r"d:\Recovered_school_app\PAPERGENERATOR")
from scratch.test_clean_pipeline import extract_clean_page_spans
from ai_service.app.layout.region_detector import region_detector
from ai_service.app.engines.router import ocr_router
from ai_service.app.layout.question_parser import question_parser

p11_blocks = extract_clean_page_spans(11)
regions = []
for s in p11_blocks:
    classification = region_detector.classify_text_region(s["text"], s["bbox"], 2200)
    routed = ocr_router.route_and_process_region(s["text"], classification["type"], "BALANCED")
    regions.append({
        "id": s["id"],
        "type": classification["type"],
        "text": routed["processed_text"],
        "raw_text": s["text"],
        "bbox": s["bbox"],
        "confidence": routed["confidence"],
        "source": s["source"],
        "question_number": classification.get("question_number"),
        "option_label": classification.get("option_label"),
    })

parsed_q = question_parser.build_structured_questions(regions, [])
print(f"Total structured questions: {len(parsed_q)}")
for q in parsed_q:
    qnum = q.get("question_number")
    if str(qnum) in ["73", "74"]:
        print(f"\n================ QUESTION {qnum} ================")
        print("Stem:\n", repr(q.get("question_text")))
        print("Tags:", q.get("tags"))
        print("Options:")
        for o in q.get("options", []):
            print(f"  ({o['key']}) {repr(o['text'])}")
