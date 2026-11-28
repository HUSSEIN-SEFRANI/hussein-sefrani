import sys, os, math, random
sys.path.insert(0, os.path.dirname(__file__))
from lib import *

OUT = sys.argv[-1]
reset(); random.seed(4)
HULL = mat('paint_hull', 0x1d3557, metal=0.2, rough=0.4)
RED = mat('hull_red', 0xb3261e, rough=0.6)
WHT = mat('paint_white', 0xf2f2f2, metal=0.1, rough=0.35)
DECK = mat('deck_green', 0x4c7a5a, rough=0.7)
GLS = mat('glass_dark', 0x18303e, metal=0.2, rough=0.03)
BLK = mat('plastic_black', 0x1a1a1a, rough=0.6)
YEL = mat('funnel', 0xf4b400, rough=0.4)
CONT = [mat(f'container{i}', c, rough=0.6) for i, c in enumerate((0xc0392b, 0x2471a3, 0x229954, 0xd68910, 0x7d3c98, 0xe6e6e6, 0x117864))]

# بدن الباخرة (طول 70م، عرض 12م) — المقدمة -Y
L, W, H = 70.0, 6.0, 7.0
bm = bmesh.new(); rings = []
N = 30
for i in range(N + 1):
    t = i / N; y = (t - 0.5) * L
    bowf = min(1, t / 0.18); sternf = min(1, (1 - t) / 0.06)
    w = W * (math.sin(bowf * math.pi / 2) ** 0.7) * (0.75 + 0.25 * sternf)
    w = max(w, 0.05)
    keel = -H * (0.6 + 0.4 * bowf)
    ring = [(0, y, keel), (w * 0.8, y, keel), (w, y, keel + 1.2), (w, y, 2.5), (-w, y, 2.5), (-w, y, keel + 1.2), (-w * 0.8, y, keel)]
    rings.append([bm.verts.new(p) for p in ring])
for i in range(N):
    for j in range(7):
        k = (j + 1) % 7
        try: bm.faces.new((rings[i][j], rings[i][k], rings[i + 1][k], rings[i + 1][j]))
        except ValueError: pass
bm.faces.new(rings[-1]); bm.faces.new(rings[0][::-1])
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-3)
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
hull = obj_from_bm('hull', bm, HULL)
# الجزء الأحمر تحت خط الماء
bm = bmesh.new()
for v in hull.data.vertices: pass
box('waterline', -W * 1.005, W * 1.005, -L * 0.36, L * 0.47, -1.2, -0.6, RED)
box('deck', -W + 0.3, W - 0.3, -L * 0.42, L * 0.47, 2.3, 2.5, DECK)
# الحاويات
for row in range(9):
    y = -L * 0.33 + row * 5.6
    h = random.choice((2, 3, 3, 4))
    for lev in range(h):
        for col in range(4):
            x = -W + 1.0 + col * 2.5 + 0.25
            box(f'c{row}_{lev}_{col}', x, x + 2.4, y, y + 5.4, 2.5 + lev * 2.5, 2.5 + lev * 2.5 + 2.45, random.choice(CONT))
# البرج (القيادة) في الخلف
yb = L * 0.36
box('bridge1', -W + 0.8, W - 0.8, yb, yb + 7, 2.5, 7.5, WHT, bev=0.2, seg=2)
box('bridge2', -W + 1.2, W - 1.2, yb + 0.5, yb + 6.5, 7.5, 12.0, WHT, bev=0.2, seg=2)
box('bridgewing', -W - 0.6, W + 0.6, yb + 0.3, yb + 2.0, 11.0, 12.0, WHT, bev=0.1, seg=2)
box('bridgewin', -W + 1.0, W - 1.0, yb + 0.25, yb + 0.5, 10.8, 11.8, GLS)
for lv in range(3):
    box(f'win{lv}', -W + 0.75, W - 0.75, yb - 0.02, yb + 0.1, 3.4 + lv * 1.4, 4.0 + lv * 1.4, GLS)
box('funnel', -1.4, 1.4, yb + 4.5, yb + 7.0, 12.0, 15.5, YEL, bev=0.3, seg=3)
box('funnel_top', -1.45, 1.45, yb + 4.45, yb + 7.05, 15.0, 15.6, BLK, bev=0.1, seg=2)
tube('mast', [(0, yb + 3, 12), (0, yb + 3, 17)], 0.15, WHT)
tube('mast_f', [(0, -L * 0.45, 2.5), (0, -L * 0.45, 9)], 0.15, WHT)
box('bow_deck', -W + 0.6, W - 0.6, -L * 0.48, -L * 0.36, 2.5, 3.2, WHT, bev=0.1, seg=2)
export(OUT)
print('OK ship')
