import sys, os, math
sys.path.insert(0, os.path.dirname(__file__))
from lib import *

OUT = sys.argv[-1]
reset()
WHT = mat('paint_white', 0xf4f5f7, metal=0.1, rough=0.25, coat=1)
RED = mat('paint_red', 0xd62828, metal=0.1, rough=0.3, coat=1)
BLU = mat('paint_blue', 0x1d4e89, metal=0.1, rough=0.3, coat=1)
DECK = mat('deck', 0xb8865a, rough=0.7)
GLS = mat('glass_dark', 0x203848, metal=0.2, rough=0.03)
BLK = mat('plastic_black', 0x1a1a1a, rough=0.6)
SEAT = mat('seat', 0xeeeeee, rough=0.7)
CHR = mat('chrome', 0xffffff, metal=1, rough=0.08)

def hull(name, L, W, H, m, segs=28):
    """بدن زورق على شكل V (المقدمة -Y): مقاطع بعرض لا يصل للصفر، ثم تنعيم."""
    bm = bmesh.new(); rings = []
    for i in range(segs + 1):
        t = i / segs; y = (t - 0.5) * L
        f = min(1, t / 0.35)
        w = max(0.04, W * math.sin(f * math.pi / 2) ** 0.9)
        keel = -H * (0.25 + 0.75 * f ** 0.6)
        top = 0.15 * H * (1 - f)
        ring = [(0, y, keel), (w * 0.45, y, keel + H * 0.22), (w * 0.95, y, keel + H * 0.6), (w, y, top), (-w, y, top), (-w * 0.95, y, keel + H * 0.6), (-w * 0.45, y, keel + H * 0.22)]
        rings.append([bm.verts.new(p) for p in ring])
    for i in range(segs):
        for j in range(7):
            k = (j + 1) % 7
            bm.faces.new((rings[i][j], rings[i][k], rings[i + 1][k], rings[i + 1][j]))
    bm.faces.new(rings[-1]); bm.faces.new(rings[0][::-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = obj_from_bm(name, bm, m)
    sub = o.modifiers.new('sub', 'SUBSURF'); sub.levels = 1
    return o

L, W, H = 5.0, 1.05, 0.8
hull('hull', L, W, H, WHT)
box('stripe_l', -1.07, -1.05, -1.6, 2.4, -0.25, -0.12, RED)
box('stripe_r', 1.05, 1.07, -1.6, 2.4, -0.25, -0.12, RED)
box('deck', -0.95, 0.95, -0.9, 2.35, -0.02, 0.04, DECK, bev=0.02, seg=1)
box('console', -0.35, 0.35, -0.2, 0.35, 0.0, 0.75, WHT, bev=0.08, seg=3)
box('windshield', -0.85, 0.85, -0.45, -0.38, 0.35, 0.85, GLS, bev=0.03, seg=2, rake=0.18)
cyl('wheel', 0.14, 0.03, (0, 0.05, 0.85), BLK, axis='Y')
box('seat', -0.6, 0.6, 0.6, 1.1, 0.0, 0.42, SEAT, bev=0.08, seg=3)
box('seatback', -0.6, 0.6, 1.0, 1.15, 0.3, 0.8, SEAT, bev=0.06, seg=3)
box('bench', -0.9, 0.9, 1.7, 2.3, 0.0, 0.38, SEAT, bev=0.08, seg=3)
# المحرك الخارجي
box('motor', -0.22, 0.22, 2.45, 2.85, 0.0, 0.65, BLK, bev=0.1, seg=3)
box('motor_cap', -0.23, 0.23, 2.43, 2.87, 0.5, 0.72, RED, bev=0.1, seg=3)
box('leg', -0.06, 0.06, 2.65, 2.78, -0.75, 0.05, BLK, bev=0.02, seg=1)
for sx in (-1, 1):
    tube(f'rail{sx}', [(sx * 0.95, -2.0, 0.05), (sx * 0.95, -2.0, 0.3), (sx * 0.95, -0.9, 0.3), (sx * 0.95, -0.9, 0.05)], 0.02, CHR)
export(OUT)
print('OK boat')
