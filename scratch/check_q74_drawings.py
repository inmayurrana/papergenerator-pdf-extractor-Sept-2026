import pymupdf

doc = pymupdf.open(r"d:\Recovered_school_app\PAPERGENERATOR\data\uploads\Physics XI+XII NEET_All (2) (2) (1)-1789862243154-974276682.pdf")
page = doc[10]
drawings = page.get_drawings()

print(f"Total drawings: {len(drawings)}")
for d_idx, d in enumerate(drawings):
    r = d.get('rect')
    if 330 <= r.y0 <= 420 and 300 <= r.x0 <= 520:
        print(f"Drawing {d_idx}: rect={[round(x,1) for x in r]} items={d.get('items')}")
