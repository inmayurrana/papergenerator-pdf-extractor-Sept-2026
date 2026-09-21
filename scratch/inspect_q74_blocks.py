import pymupdf

doc = pymupdf.open(r"d:\Recovered_school_app\PAPERGENERATOR\data\uploads\Physics XI+XII NEET_All (2) (2) (1)-1789862243154-974276682.pdf")
page = doc[10]
d = page.get_text("rawdict")

for b_idx in range(27, 50):
    b = d['blocks'][b_idx]
    if b.get('type') == 0:
        lines = []
        for l in b.get('lines', []):
            spans_str = []
            for s in l.get('spans', []):
                chars = ''.join(c.get('c', '') for c in s.get('chars', []))
                spans_str.append(f"[{s.get('font')}, sz={s.get('size'):.1f}, bbox={[round(x,1) for x in s.get('bbox',[])]}: {repr(chars)}]")
            lines.append(" ".join(spans_str))
        print(f"=== Block {b_idx} (bbox={[round(x,1) for x in b.get('bbox',[])]}) ===")
        print("\n".join(lines))
