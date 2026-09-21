import pymupdf

doc = pymupdf.open(r"d:\Recovered_school_app\PAPERGENERATOR\data\uploads\Physics XI+XII NEET_All (2) (2) (1)-1789862243154-974276682.pdf")
page = doc[10]
d = page.get_text("rawdict")

b32 = d['blocks'][32]
for l in b32['lines']:
    for s in l['spans']:
        for ch in s['chars']:
            c = ch['c']
            print(f"c={c!r} ord={ord(c)} hex=0x{ord(c):02x} font={s['font']} bbox={[round(x,1) for x in ch['bbox']]}")
