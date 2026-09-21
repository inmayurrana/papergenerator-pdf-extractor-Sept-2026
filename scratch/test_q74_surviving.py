import sys
sys.path.insert(0, r"d:\Recovered_school_app\PAPERGENERATOR")
import pymupdf
import re
from ai_service.app.document.digital_extract import _decode_symbol_font_span

doc = pymupdf.open(r"d:\Recovered_school_app\PAPERGENERATOR\data\uploads\Physics XI+XII NEET_All (2) (2) (1)-1789862243154-974276682.pdf")
page = doc[10]
page_dict = page.get_text("rawdict")

all_spans = []
for b_idx, b in enumerate(page_dict.get("blocks", [])):
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
                    "block_idx": b_idx,
                })

drawings = page.get_drawings()
for d in drawings:
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

    nums = [s for s in all_spans if s["bbox"][2] >= fx0 - 2.0 and s["bbox"][0] <= fx1 + 2.0 and fy - 18.0 <= s["bbox"][1] <= fy and s["bbox"][3] <= fy + 0.8]
    dens = [s for s in all_spans if s["bbox"][2] >= fx0 - 2.0 and s["bbox"][0] <= fx1 + 2.0 and fy - 0.8 <= s["bbox"][1] <= fy + 18.0]
    brackets = [s for s in all_spans if (abs(s["bbox"][0] - fx0) < 10.0 or abs(s["bbox"][2] - fx1) < 10.0) and fy - 18.0 <= s["bbox"][1] <= fy + 18.0 and any(ord(c) in [0xe6, 0xe7, 0xe8, 0xf6, 0xf7, 0xf8] for c in s["raw_text"])]

    nums_clean = [s for s in nums if not any(ord(c) in [0xe6, 0xe7, 0xe8, 0xf6, 0xf7, 0xf8] for c in s["raw_text"])]
    dens_clean = [s for s in dens if not any(ord(c) in [0xe6, 0xe7, 0xe8, 0xf6, 0xf7, 0xf8] for c in s["raw_text"])]

    def assemble_formula_text(spans):
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

    if nums_clean and dens_clean:
        num_text = assemble_formula_text(nums_clean)
        den_text = assemble_formula_text(dens_clean)
        latex = f"\\left(\\frac{{{num_text}}}{{{den_text}}}\\right)"
        
        nums_clean[0]["span_ref"]["special_latex"] = latex
        # Assign the fraction's effective bbox (covering the whole fraction) to the special span
        nums_clean[0]["span_ref"]["bbox"] = [fx0 - 6.0, fy - 14.0, fx1 + 6.0, fy + 14.0]
        
        for s in nums_clean[1:]:
            s["span_ref"]["is_consumed"] = True
        for s in dens_clean:
            s["span_ref"]["is_consumed"] = True
        for s in brackets:
            s["span_ref"]["is_consumed"] = True

# Now let's see surviving spans between y=340 and y=410
q74_opt_spans = []
for s in all_spans:
    if s["span_ref"].get("is_consumed"):
        continue
    sb = s["span_ref"].get("bbox", s["bbox"])
    if 335 <= sb[1] <= 415 and sb[0] >= 280:
        txt = s["span_ref"].get("special_latex") or s["text"]
        q74_opt_spans.append({
            "text": txt,
            "bbox": sb,
            "size": s.get("size", 9.5),
        })

print("=== SURVIVING SPANS IN Q74 OPTIONS REGION ===")
for s in sorted(q74_opt_spans, key=lambda x: (round(x["bbox"][1] / 15.0), x["bbox"][0])):
    print(f"  y0={s['bbox'][1]:.1f}, x0={s['bbox'][0]:.1f}: {s['text']}")
