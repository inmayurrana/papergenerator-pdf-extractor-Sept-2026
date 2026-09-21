import sys
sys.path.insert(0, r"d:\Recovered_school_app\PAPERGENERATOR")
from pathlib import Path
import pymupdf
import re
from ai_service.app.document.digital_extract import _decode_symbol_font_span, sanitize_math_font_artifacts
from ai_service.app.engines.specialized_math import specialized_math
from ai_service.app.layout.question_parser import question_parser

pdf_path = Path(r"d:\Recovered_school_app\PAPERGENERATOR\data\uploads\Physics XI+XII NEET_All (2) (2) (1)-1789862243154-974276682.pdf")
doc = pymupdf.open(str(pdf_path))

def extract_clean_page_spans(page_number, img_width=1556, img_height=2200):
    page = doc[page_number - 1]
    page_dict = page.get_text("rawdict")
    pdf_w, pdf_h = page.rect.width, page.rect.height
    scale_x = img_width / pdf_w if pdf_w > 0 else 1.0
    scale_y = img_height / pdf_h if pdf_h > 0 else 1.0

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

    # Detect fraction drawings with extended width cap (up to 120 pt)
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
            has_brackets = len(brackets) > 0
            latex = f"\\left(\\frac{{{num_text}}}{{{den_text}}}\\right)" if has_brackets else f"\\frac{{{num_text}}}{{{den_text}}}"
            
            # Normalize trig functions inside fraction
            latex = re.sub(r'(?<!\\)sin\s*\\theta', r'\\sin\\theta', latex)
            latex = re.sub(r'([0-9a-zA-Z])sin', r'\1\\sin', latex)
            
            nums_clean[0]["span_ref"]["special_latex"] = latex
            nums_clean[0]["span_ref"]["bbox"] = [fx0 - (6.0 if has_brackets else 0), fy - 14.0, fx1 + (6.0 if has_brackets else 0), fy + 14.0]
            
            for s in nums_clean[1:]:
                s["span_ref"]["is_consumed"] = True
            for s in dens_clean:
                s["span_ref"]["is_consumed"] = True
            for s in brackets:
                s["span_ref"]["is_consumed"] = True

    # Check for two-column or single-column layout
    # Allen/coaching material uses 2 columns when page width ~ 595 pt and mid_x ~ 290 pt
    mid_x = pdf_w / 2.0 if pdf_w > 400 else pdf_w + 100.0

    surviving = []
    for s in all_spans:
        if s["span_ref"].get("is_consumed"):
            continue
        sb = s["span_ref"].get("bbox", s["bbox"])
        txt = s["span_ref"].get("special_latex") or s["text"]
        surviving.append({
            "text": txt,
            "raw_text": s["raw_text"],
            "bbox": sb,
            "size": s.get("size", 9.5),
            "col": 0 if sb[0] < mid_x else 1,
        })

    # Cluster surviving spans into lines and blocks per column
    page_blocks = []
    block_id_counter = 0

    for col_idx in [0, 1]:
        col_spans = [s for s in surviving if s["col"] == col_idx]
        if not col_spans:
            continue
        col_spans.sort(key=lambda s: (s["bbox"][1], s["bbox"][0]))
        
        # Cluster into lines
        lines = []
        for s in col_spans:
            sy_mid = (s["bbox"][1] + s["bbox"][3]) / 2.0
            placed = False
            for l in lines:
                ly_mid = (l["bbox"][1] + l["bbox"][3]) / 2.0
                if abs(sy_mid - ly_mid) < 6.0:
                    l["spans"].append(s)
                    l["bbox"] = [
                        min(l["bbox"][0], s["bbox"][0]),
                        min(l["bbox"][1], s["bbox"][1]),
                        max(l["bbox"][2], s["bbox"][2]),
                        max(l["bbox"][3], s["bbox"][3]),
                    ]
                    placed = True
                    break
            if not placed:
                lines.append({
                    "bbox": list(s["bbox"]),
                    "spans": [s]
                })

        lines.sort(key=lambda l: l["bbox"][1])

        # Cluster lines into blocks:
        # A new block starts if:
        # 1. line starts with Question number: "73.", "74.", "Q1", "(1)", etc.
        # 2. line starts with Option number: "(1)", "(2)", "(3)", "(4)"
        # 3. line is coaching code: "NL0074"
        # 4. vertical gap between lines > 14.0 pt
        curr_block_lines = []
        curr_block_bbox = None

        def flush_block():
            nonlocal curr_block_lines, curr_block_bbox, block_id_counter
            if not curr_block_lines:
                return
            b_text = "\n".join(curr_block_lines).strip()
            if b_text:
                clean_full = sanitize_math_font_artifacts(b_text)
                clean_full = specialized_math.convert_embedded_math(clean_full)
                bx0 = round(curr_block_bbox[0] * scale_x)
                by0 = round(curr_block_bbox[1] * scale_y)
                bx1 = round(curr_block_bbox[2] * scale_x)
                by1 = round(curr_block_bbox[3] * scale_y)
                page_blocks.append({
                    "id": f"p{page_number}_b{block_id_counter}",
                    "text": clean_full,
                    "raw_text": b_text,
                    "bbox": [bx0, by0, bx1 - bx0, by1 - by0],
                    "confidence": 0.99,
                    "source": "DIGITAL_EMBEDDED",
                    "font_size": 12,
                })
                block_id_counter += 1
            curr_block_lines = []
            curr_block_bbox = None

        prev_line_y1 = None
        for l in lines:
            sorted_spans = sorted(l["spans"], key=lambda s: s["bbox"][0])
            
            # Format line text with intelligent spacing & sub/superscripts
            parts = []
            prev_s = None
            for s in sorted_spans:
                txt = s["text"].strip()
                if not txt:
                    continue
                sz = s["size"]
                sb = s["bbox"]
                
                # Check sub/superscript relative to preceding text
                is_sub = False
                is_sup = False
                if prev_s is not None and not s.get("text", "").startswith("\\"):
                    prev_sz = prev_s.get("size", 9.5)
                    prev_sb = prev_s.get("bbox", [0, 0, 0, 0])
                    gap = sb[0] - prev_sb[2]
                    if sz < prev_sz * 0.85 and gap <= 2.5:
                        if sb[1] > prev_sb[1] + 1.2 and sb[3] >= prev_sb[3] - 0.5:
                            is_sub = True
                        elif sb[3] < prev_sb[3] - 1.2 and sb[1] <= prev_sb[1] + 0.5:
                            is_sup = True

                if is_sub:
                    if parts and parts[-1].endswith(" "):
                        parts[-1] = parts[-1].rstrip()
                    parts.append(f"_{{{txt}}}" if len(txt) > 1 else f"_{txt}")
                elif is_sup:
                    if parts and parts[-1].endswith(" "):
                        parts[-1] = parts[-1].rstrip()
                    parts.append(f"^{{{txt}}}" if len(txt) > 1 else f"^{txt}")
                else:
                    needs_space = False
                    if prev_s is not None:
                        prev_sb = prev_s.get("bbox", [0, 0, 0, 0])
                        gap = sb[0] - prev_sb[2]
                        if gap >= 1.5 and not txt.startswith(" ") and not (parts and parts[-1].endswith(" ")):
                            if txt not in [",", ".", ")", "]", "}", ";", ":", "%"]:
                                needs_space = True
                    if needs_space:
                        parts.append(" " + txt)
                    else:
                        parts.append(txt)
                prev_s = s

            line_str = "".join(parts).strip()
            if not line_str:
                continue

            # Check boundary conditions to start a new block
            is_new_q = bool(re.match(r"^(?:Q(?:uestion)?\s*[.\-]?\s*\d{1,3}\b|\d{1,3}\s*[.)\]])", line_str, re.IGNORECASE))
            is_opt = bool(re.match(r"^\([1-4A-Da-d]\)", line_str))
            is_code = bool(re.match(r"^[A-Z]{1,4}\d{2,6}$", line_str))
            vgap = (l["bbox"][1] - prev_line_y1) if prev_line_y1 is not None else 0

            if (is_new_q or is_opt or is_code or vgap > 14.0) and curr_block_lines:
                flush_block()

            curr_block_lines.append(line_str)
            if curr_block_bbox is None:
                curr_block_bbox = list(l["bbox"])
            else:
                curr_block_bbox = [
                    min(curr_block_bbox[0], l["bbox"][0]),
                    min(curr_block_bbox[1], l["bbox"][1]),
                    max(curr_block_bbox[2], l["bbox"][2]),
                    max(curr_block_bbox[3], l["bbox"][3]),
                ]
            prev_line_y1 = l["bbox"][3]

        flush_block()

    return page_blocks

p11_blocks = extract_clean_page_spans(11)
parsed_11 = question_parser.build_structured_questions(p11_blocks, [])
print(f"Total p11 blocks: {len(p11_blocks)}")
for b in p11_blocks:
    if any(k in b["text"] for k in ["73", "74", "masses"]):
        print(f"Block {b['id']} bbox={b['bbox']}:\n  {repr(b['text'][:80])}")

print(f"\nTotal p11 questions: {len(parsed_11)}")
for q in parsed_11:
    print(f"Q: {q.get('question_number')} | {repr(q.get('question_text')[:50])}")
    print("  Options:", [(o['key'], o['text']) for o in q.get('options', [])])

