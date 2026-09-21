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
                    "size": s.get("size", 9.5),
                })

drawings = page.get_drawings()
for d_idx in [124, 125, 126, 127]:
    d = drawings[d_idx]
    items = d.get("items", [])
    p1, p2 = items[0][1], items[0][2]
    fx0, fx1 = min(p1.x, p2.x), max(p1.x, p2.x)
    fy = (p1.y + p2.y) / 2

    # Spans above line (numerator)
    nums = [s for s in all_spans if s["bbox"][2] >= fx0 - 2.0 and s["bbox"][0] <= fx1 + 2.0 and fy - 18.0 <= s["bbox"][1] <= fy and s["bbox"][3] <= fy + 0.8]
    # Spans below line (denominator)
    dens = [s for s in all_spans if s["bbox"][2] >= fx0 - 2.0 and s["bbox"][0] <= fx1 + 2.0 and fy - 0.8 <= s["bbox"][1] <= fy + 18.0]

    # Let's filter out bracket pieces (chars æ, ö, ç, ÷, è, ø or ord in [0xe6..0xe8, 0xf6..0xf8]) from numerator and denominator
    def clean_math_spans(span_list):
        cleaned = []
        for s in span_list:
            raw = s["raw_text"]
            # Exclude SymbolMT large bracket piece glyphs
            if any(ord(c) in [0xe6, 0xe7, 0xe8, 0xf6, 0xf7, 0xf8] for c in raw):
                continue
            cleaned.append(s)
        return cleaned

    nums_clean = clean_math_spans(nums)
    dens_clean = clean_math_spans(dens)

    # Now let's assemble the text of numerator and denominator with subscripts!
    def assemble_formula_text(spans):
        # Sort spans by x0
        sorted_spans = sorted(spans, key=lambda s: s["bbox"][0])
        parts = []
        prev = None
        for s in sorted_spans:
            txt = s["text"].strip()
            if not txt:
                continue
            is_sub = False
            if prev is not None:
                if s["size"] < prev["size"] * 0.85 and s["bbox"][1] > prev["bbox"][1] + 1.0:
                    is_sub = True
            
            if is_sub:
                parts.append(f"_{{{txt}}}" if len(txt) > 1 else f"_{txt}")
            else:
                if txt in ["+", "-"]:
                    parts.append(f" {txt} ")
                else:
                    parts.append(txt)
            prev = s
        return "".join(parts).strip()

    num_text = assemble_formula_text(nums_clean)
    den_text = assemble_formula_text(dens_clean)
    print(f"Drawing {d_idx}: \\frac{{{num_text}}}{{{den_text}}}")
