import sys
sys.path.insert(0, r"d:\Recovered_school_app\PAPERGENERATOR")
import pymupdf

doc = pymupdf.open(r"d:\Recovered_school_app\PAPERGENERATOR\data\uploads\Physics XI+XII NEET_All (2) (2) (1)-1789862243154-974276682.pdf")
page = doc[10]
d = page.get_text("rawdict")

def process_spans_in_line(spans):
    line_parts = []
    prev_s = None
    for s in spans:
        chars = "".join(c.get("c", "") for c in s.get("chars", []))
        if not chars.strip():
            continue
        sz = s.get("size", 9.5)
        bbox = s.get("bbox", [0, 0, 0, 0])
        
        # Check sub/superscript relative to previous span
        is_sub = False
        is_sup = False
        if prev_s is not None:
            prev_sz = prev_s.get("size", 9.5)
            prev_bbox = prev_s.get("bbox", [0, 0, 0, 0])
            gap = bbox[0] - prev_bbox[2]
            
            if sz < prev_sz * 0.85 and gap <= 2.5:
                # Compare vertical positions
                if bbox[1] > prev_bbox[1] + 1.2 and bbox[3] >= prev_bbox[3] - 0.5:
                    is_sub = True
                elif bbox[3] < prev_bbox[3] - 1.2 and bbox[1] <= prev_bbox[1] + 0.5:
                    is_sup = True
        
        # Format text
        if is_sub:
            # Attach as subscript
            if line_parts and line_parts[-1].endswith(" "):
                line_parts[-1] = line_parts[-1].rstrip()
            token = f"_{{{chars}}}" if len(chars) > 1 else f"_{chars}"
            line_parts.append(token)
        elif is_sup:
            if line_parts and line_parts[-1].endswith(" "):
                line_parts[-1] = line_parts[-1].rstrip()
            token = f"^{{{chars}}}" if len(chars) > 1 else f"^{chars}"
            line_parts.append(token)
        else:
            # Regular text: decide whether to add leading space
            needs_space = False
            if prev_s is not None:
                prev_bbox = prev_s.get("bbox", [0, 0, 0, 0])
                gap = bbox[0] - prev_bbox[2]
                if gap >= 1.5 and not chars.startswith(" ") and not (line_parts and line_parts[-1].endswith(" ")):
                    if chars not in [",", ".", ")", "]", "}", ";", ":", "%"]:
                        needs_space = True
            
            if needs_space:
                line_parts.append(" " + chars)
            else:
                line_parts.append(chars)
                
        prev_s = s
        
    return "".join(line_parts).strip()

b22 = d['blocks'][22]
print("=== PROCESSED BLOCK 22 (QUESTION 73) ===")
for l in b22['lines']:
    print(process_spans_in_line(l['spans']))
