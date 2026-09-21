import sys
sys.path.insert(0, r"d:\Recovered_school_app\PAPERGENERATOR")
from pathlib import Path
from ai_service.app.document.digital_extract import DigitalTextExtractor

pdf_path = Path(r"d:\Recovered_school_app\PAPERGENERATOR\data\uploads\Physics XI+XII NEET_All (2) (2) (1)-1789862243154-974276682.pdf")
spans = DigitalTextExtractor.extract_page_text_spans(pdf_path, 11, 1556, 2200)

for s in spans:
    txt = s["text"]
    if any(k in txt for k in ["73", "74", "Three blocks", "Three masses", "NL0074", "NL0075", "æ", "ö", "M_1", "m_1"]):
        print(f"Span {s['id']} (bbox={s['bbox']}):\n{repr(txt)}\n")
