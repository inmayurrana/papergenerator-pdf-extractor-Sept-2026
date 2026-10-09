from ai_service.app.engines.ocr_extractor import ocr_extractor
from ai_service.app.layout.region_detector import region_detector
from ai_service.app.layout.reading_order import reading_order_sorter
from ai_service.app.layout.question_parser import question_parser
from PIL import Image

img_p = r'data/documents\DPP-1-Grade-11-Mathematics-Q4-13-1789807334642-400153435_converted\page_1.png'
im = Image.open(img_p)
spans = ocr_extractor.extract_page_text_spans(img_p, im.width, im.height)

proc_regions = []
for s in spans:
    cls = region_detector.classify_text_region(s['text'], s['bbox'], im.height)
    print(f"Text: {repr(s['text'][:45])} -> Type: {cls['type']}, QNum: {cls.get('question_number')}")
    proc_regions.append({
        'id': s['id'],
        'type': cls['type'],
        'text': s['text'],
        'raw_text': s['text'],
        'bbox': s['bbox'],
        'confidence': cls.get('confidence', 0.95),
        'question_number': cls.get('question_number'),
        'option_label': cls.get('option_label'),
    })

sorted_r = reading_order_sorter.sort_regions(proc_regions, im.width)
questions = question_parser.build_structured_questions(sorted_r, [])
print('---')
print('Questions built count:', len(questions))
for q in questions:
    print('Q', q.get('question_number'), ':', q.get('question_text')[:60], 'Options:', len(q.get('options', [])))
