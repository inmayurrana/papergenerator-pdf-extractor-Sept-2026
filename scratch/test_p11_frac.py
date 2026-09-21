import sys
sys.path.insert(0, r"d:\Recovered_school_app\PAPERGENERATOR")
import pymupdf
import re
from ai_service.app.document.digital_extract import _decode_symbol_font_span

doc = pymupdf.open(r"d:\Recovered_school_app\PAPERGENERATOR\data\uploads\Physics XI+XII NEET_All (2) (2) (1)-1789862243154-974276682.pdf")
page = doc[10]
page_dict = page.get_text("rawdict")

all_spans = []
for b in page_dict.get("blocks", []):
    if b.get("type") == 0:
        for line in b.get("lines", []):
            for s in line.get("spans", []):
                chars = "".join(ch.get("c", "") for ch in s.get("chars", []))
                if not chars.strip():
                    continue
                dec = _decode_symbol_font_span(chars, s.get("font", ""))
                all_spans.append({
                    "span_ref": s,
                    "text": dec,
                    "raw_text": chars,
                    "bbox": s["bbox"],
                    "font": s.get("font", ""),
                })

drawings = page.get_drawings()
print(f"Total drawings: {len(drawings)}")

for d_idx, d in enumerate(drawings):
    r = d.get("rect")
    if r.height > 2.5 or r.width < 5.0 or r.width > 120.0:
        continue
    items = d.get("items", [])
    if len(items) != 1 or items[0][0] != "l":
        continue
    p1, p2 = items[0][1], items[0][2]
    if abs(p1.y - p2.y) > 0.6:
        continue
    fx0, fx1 = min(p1.x, p2.x), max(p1.x, p2.x)
    fy = (p1.y + p2.y) / 2

    # Spans above line (numerator)
    nums = [s for s in all_spans if s["bbox"][2] >= fx0 - 2.0 and s["bbox"][0] <= fx1 + 2.0 and fy - 18.0 <= s["bbox"][1] <= fy and s["bbox"][3] <= fy + 0.8]
    # Spans below line (denominator)
    dens = [s for s in all_spans if s["bbox"][2] >= fx0 - 2.0 and s["bbox"][0] <= fx1 + 2.0 and fy - 0.8 <= s["bbox"][1] <= fy + 18.0]

    print(f"\nDrawing {d_idx}: fx0={fx0:.1f}, fx1={fx1:.1f}, fy={fy:.1f}, w={fx1-fx0:.1f}")
    print("  Nums:", [(s['text'], s['bbox']) for s in nums])
    print("  Dens:", [(s['text'], s['bbox']) for s in dens])
