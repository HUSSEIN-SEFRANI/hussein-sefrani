import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from lib import *

OUT = sys.argv[-1]
reset()
WH = mat('trailer_white', 0xeeeeea, rough=0.55)
RED = mat('paint_red', 0x6a0f1c, metal=0.05, rough=0.35, coat=1)
DRK = mat('chassis', 0x1d1d1f, metal=0.3, rough=0.6)
ALU = mat('alu', 0xd6d9dc, metal=1, rough=0.22)
TIRE = mat('tire', 0x161616, rough=0.92)
RIM = mat('rim_silver', 0xc8cbd0, metal=0.9, rough=0.25)
CHR = mat('chrome', 0xffffff, metal=1, rough=0.08)
TLR = mat('light_red', 0x9a0a0a, rough=0.2, emit=0.6)
AMB = mat('light_amber', 0xffa020, rough=0.3, emit=0.5)
CUR = mat('curtain', 0xffffff, rough=0.8)

L = 13.6
box('body', -1.275, 1.275, 0, L, 1.3, 4.0, WH, bev=0.05, seg=3)
box('top_rail', -1.285, 1.285, 0.0, L, 3.88, 4.0, RED, bev=0.02, seg=2)
box('bot_rail', -1.285, 1.285, 0.0, L, 1.3, 1.45, RED, bev=0.02, seg=2)
# ستارتا الجانبين بإحداثيات UV (يرسم three.js عليهما القماش)
for sx in (-1, 1):
    bm = bmesh.new(); uv = bm.loops.layers.uv.new()
    x = sx * 1.28
    vs = [bm.verts.new((x, 0.08, 1.46)), bm.verts.new((x, L - 0.08, 1.46)), bm.verts.new((x, L - 0.08, 3.87)), bm.verts.new((x, 0.08, 3.87))]
    f = bm.faces.new(vs if sx > 0 else vs[::-1])
    uvs = [(0, 0), (1, 0), (1, 1), (0, 1)] if sx > 0 else [(0, 1), (1, 1), (1, 0), (0, 0)]
    for lp, (u, v) in zip(f.loops, uvs if sx > 0 else [(0, 1), (1, 1), (1, 0), (0, 0)]):
        lp[uv].uv = (u if sx > 0 else (1 - u), v) if False else (u, v)
    o = obj_from_bm(f'curtain{sx}', bm, CUR, smooth=False)
    # أعمدة الستارة
    for k in range(1, 6):
        box(f'post{sx}{k}', min(x, x + sx * 0.02), max(x, x + sx * 0.02), k * L / 6 - 0.04, k * L / 6 + 0.04, 1.45, 3.88, ALU)
    # حاجز جانبي
    for z in (0.62, 0.9):
        box(f'guard{sx}{z}', min(sx * 1.18, sx * 1.24), max(sx * 1.18, sx * 1.24), 3.4, 9.2, z, z + 0.1, ALU, bev=0.01, seg=1)
    for y in (3.5, 6.3, 9.1):
        box(f'gpost{sx}{y}', min(sx * 1.0, sx * 1.2), max(sx * 1.0, sx * 1.2), y, y + 0.06, 0.6, 1.3, DRK)
    # مصابيح جانبية
    for k in range(6):
        box(f'side_led{sx}{k}', min(x, x + sx * 0.03), max(x, x + sx * 0.03), 1.0 + k * 2.2, 1.08 + k * 2.2, 1.32, 1.38, AMB)
    # أرجل التحميل
    box(f'leg{sx}', min(sx * 0.7, sx * 0.82), max(sx * 0.7, sx * 0.82), 2.4, 2.52, 0.25, 1.3, DRK)
    box(f'foot{sx}', min(sx * 0.62, sx * 0.9), max(sx * 0.62, sx * 0.9), 2.3, 2.62, 0.2, 0.26, DRK)
    # المصابيح الخلفية
    box(f'tl{sx}', min(sx * 0.7, sx * 1.15), max(sx * 0.7, sx * 1.15), L + 0.05, L + 0.1, 0.78, 0.98, TLR, bev=0.02, seg=2)
# الهيكل السفلي
for sx in (-1, 1):
    box(f'rail{sx}', min(sx * 0.4, sx * 0.52), max(sx * 0.4, sx * 0.52), 0.2, L - 0.2, 0.95, 1.3, DRK)
box('front_plate', -1.2, 1.2, 0.0, 2.6, 1.2, 1.3, DRK)
cyl('kingpin', 0.05, 0.12, (0, 1.2, 1.14), CHR)
box('rear_bumper', -1.2, 1.2, L - 0.05, L + 0.05, 0.55, 0.7, ALU, bev=0.01, seg=1)
box('rear_frame', -1.2, 1.2, L - 0.3, L + 0.02, 0.7, 1.3, DRK)
for i, y in enumerate((10.0, 11.36, 12.72)):
    for sx in (-1, 1):
        wheel(f'w{i}{sx}', (sx * 1.03, y, 0.48), 0.48, 0.4, TIRE, RIM, CHR, side=sx, hub=True)
    cyl(f'axle{i}', 0.08, 1.8, (0, y, 0.48), DRK, axis='X')
for sx in (-1, 1):
    box(f'mud{sx}', min(sx * 0.8, sx * 1.27), max(sx * 0.8, sx * 1.27), 9.3, 13.4, 1.05, 1.12, DRK, bev=0.01, seg=1)
    box(f'flap{sx}', min(sx * 0.8, sx * 1.25), max(sx * 0.8, sx * 1.25), 13.38, 13.42, 0.3, 1.08, DRK)
export(OUT)
print('OK trailer')
