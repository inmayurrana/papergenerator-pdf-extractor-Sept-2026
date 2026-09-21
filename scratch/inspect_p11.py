import pymupdf

doc = pymupdf.open(r"d:\Recovered_school_app\PAPERGENERATOR\data\uploads\Physics XI+XII NEET_All (2) (2) (1)-1789862243154-974276682.pdf")
page = doc[10]
d = page.get_text("rawdict")

print(f"Total blocks on Page 11: {len(d.get('blocks', []))}")
for b_idx, b in enumerate(d.get("blocks", [])):
    if b.get("type") == 0:
        lines = []
        for l in b.get("lines", []):
            spans_str = []
            for s in l.get("spans", []):
                chars = "".join(c.get("c", "") for c in s.get("chars", []))
                spans_str.append(f"[{s.get('font')}, sz={s.get('size'):.1f}, y0={s.get('bbox')[1]:.1f}, y1={s.get('bbox')[3]:.1f}: {repr(chars)}]")
            lines.append(" ".join(spans_str))
print("=== BLOCK 22 DETAILS ===")
b22 = d['blocks'][22]
for l in b22['lines']:
    print("--- Line ---")
    for s in l['spans']:
        chars = ''.join(c.get('c', '') for c in s.get('chars', []))
        sz = s.get('size', 0)
        flags = s.get('flags', 0)
        bbox = [round(x, 1) for x in s.get('bbox', [])]
        print(f"  text={chars!r:25} size={sz:4.1f} flags={flags} bbox={bbox}")

