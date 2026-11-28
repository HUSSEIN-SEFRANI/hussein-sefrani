import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from lib import *

OUT = sys.argv[-1]
COLOR = int(sys.argv[-2], 16) if len(sys.argv) > 2 and sys.argv[-2].startswith('0x') is False and False else 0x1d56b8
reset()
PAINT = mat('paint_blue', COLOR, metal=0.15, rough=0.3, coat=1)
GLS = mat('glass_dark', 0x0d1218, metal=0.1, rough=0.03)
BLK = mat('plastic_black', 0x141414, rough=0.65)
TIRE = mat('tire', 0x161616, rough=0.92)
RIM = mat('rim_silver', 0xc8cbd0, metal=0.9, rough=0.25)
CHR = mat('chrome', 0xffffff, metal=1, rough=0.08)
HLG = mat('hl_glass', 0xdfe6ea, metal=0.2, rough=0.03, alpha=0.4)
TLR = mat('light_red', 0x9a0a0a, rough=0.2, emit=0.6)

# المقاطع: (y, w, zb, zbelt, wg, zroof, wr)   المقدمة y=0
S = [
    (-0.03, 0.55, 0.40, 0.66, 0.50, 0.68, 0.35),
    (0.00, 0.78, 0.30, 0.72, 0.72, 0.75, 0.50),
    (0.14, 0.86, 0.24, 0.80, 0.80, 0.84, 0.60),
    (0.55, 0.89, 0.22, 0.90, 0.84, 0.94, 0.65),
    (1.10, 0.90, 0.22, 0.97, 0.86, 1.00, 0.70),
    (1.72, 0.90, 0.22, 1.00, 0.74, 1.45, 0.62),
    (2.33, 0.90, 0.22, 1.00, 0.72, 1.47, 0.62),
    (2.45, 0.90, 0.22, 1.00, 0.72, 1.47, 0.62),
    (3.20, 0.89, 0.22, 1.00, 0.72, 1.45, 0.62),
    (3.70, 0.87, 0.24, 1.00, 0.73, 1.40, 0.60),
    (3.97, 0.84, 0.28, 0.98, 0.74, 1.06, 0.58),
    (4.08, 0.78, 0.36, 0.90, 0.70, 0.95, 0.50),
    (4.11, 0.55, 0.45, 0.80, 0.50, 0.85, 0.35),
]
def ring(y, w, zb, zbelt, wg, zroof, wr):
    half = [(0, zb), (w * 0.9, zb), (w, zb + 0.13), (w, (zb + zbelt) / 2 + 0.05), (w * 0.985, zbelt),
            (wg, zbelt + 0.55 * (zroof - zbelt)), (wr + 0.08, zroof - 0.025), (wr * 0.5, zroof), (0, zroof)]
    full = half + [(-x, z) for x, z in half[-2:0:-1]]
    return [(x, y, z) for x, z in full]

bm = bmesh.new()
rings = [[bm.verts.new(p) for p in ring(*s)] for s in S]
N = len(rings[0])
WIN_SIDE = {4, 5, 11, 12}   # P4-P5, P5-P6 وانعكاسها
TOP = {6, 7, 8, 9}
faces = []
for i in range(len(rings) - 1):
    y0, y1 = S[i][0], S[i + 1][0]
    for j in range(N):
        k = (j + 1) % N
        f = bm.faces.new((rings[i][j], rings[i][k], rings[i + 1][k], rings[i + 1][j]))
        mi = 0
        if 1.1 <= y0 and y1 <= 3.7 and j in WIN_SIDE and not (y0 == 2.33): mi = 1
        if y0 == 1.10 and j in TOP: mi = 1
        if y0 == 3.70 and j in TOP: mi = 1
        f.material_index = mi
bm.faces.new(rings[0][::-1]); bm.faces.new(rings[-1])
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
body = obj_from_bm('body', bm, PAINT)
body.data.materials.append(GLS)
sub = body.modifiers.new('sub', 'SUBSURF'); sub.levels = 2; sub.render_levels = 2
bpy.context.view_layer.objects.active = body; body.select_set(True)
bpy.ops.object.modifier_apply(modifier='sub')
# فتحات العجلات
for y in (0.80, 3.30):
    c = cyl('cut', 0.38, 2.4, (0, y, 0.33), PAINT, axis='X', verts=48)
    m = body.modifiers.new('b', 'BOOLEAN'); m.object = c; m.operation = 'DIFFERENCE'; m.solver = 'EXACT'
    bpy.ops.object.select_all(action='DESELECT'); bpy.context.view_layer.objects.active = body; body.select_set(True)
    bpy.ops.object.modifier_apply(modifier='b')
    bpy.data.objects.remove(c)
    for sx in (-1, 1):
        lathe(f'liner{sx}{y}', [(0.38, sx * 0.55), (0.38, sx * 0.92)], BLK, steps=40, axis='X', loc=(0, y, 0.33))
# تفاصيل
for sx in (-1, 1):
    sphere(f'hl{sx}', 0.2, (sx * 0.62, 0.08, 0.72), HLG, scale=(1.0, 0.45, 0.32))
    sphere(f'hli{sx}', 0.17, (sx * 0.62, 0.11, 0.72), mat('hl_inner', 0x2a2d31, metal=0.6, rough=0.35), scale=(1.0, 0.4, 0.28))
    sphere(f'hlb{sx}', 0.05, (sx * 0.55, 0.05, 0.72), mat('reflector', 0xffffff, metal=1, rough=0.05))
    sphere(f'tl{sx}', 0.2, (sx * 0.66, 4.02, 0.93), TLR, scale=(0.9, 0.35, 0.3))
    box(f'mirror{sx}', min(sx * 0.88, sx * 1.04), max(sx * 0.88, sx * 1.04), 1.25, 1.4, 1.02, 1.13, PAINT, bev=0.035, seg=3)
    box(f'handle{sx}', min(sx * 0.9, sx * 0.915), max(sx * 0.9, sx * 0.915), 2.0, 2.15, 0.9, 0.93, CHR, bev=0.006, seg=1)
    box(f'handle2{sx}', min(sx * 0.89, sx * 0.905), max(sx * 0.89, sx * 0.905), 2.9, 3.05, 0.9, 0.93, CHR, bev=0.006, seg=1)
    box(f'sill{sx}', min(sx * 0.86, sx * 0.9), max(sx * 0.86, sx * 0.9), 1.2, 2.9, 0.2, 0.3, BLK, bev=0.02, seg=2)
    wheel(f'w{sx}f', (sx * 0.78, 0.80, 0.33), 0.33, 0.22, TIRE, RIM, CHR, side=sx, rim_r=0.215)
    wheel(f'w{sx}r', (sx * 0.78, 3.30, 0.33), 0.33, 0.22, TIRE, RIM, CHR, side=sx, rim_r=0.215)
box('grille', -0.45, 0.45, -0.01, 0.05, 0.42, 0.58, BLK, bev=0.03, seg=2)
box('lowgrille', -0.6, 0.6, 0.0, 0.08, 0.26, 0.36, BLK, bev=0.03, seg=2)
box('plate_f', -0.26, 0.26, -0.04, 0.0, 0.37, 0.48, mat('plate', 0xf0f0ea, rough=0.4), bev=0.01, seg=1)
box('plate_r', -0.26, 0.26, 4.1, 4.13, 0.6, 0.71, mat('plate', 0xf0f0ea, rough=0.4), bev=0.01, seg=1)
box('rear_diff', -0.65, 0.65, 4.0, 4.1, 0.3, 0.42, BLK, bev=0.03, seg=2)
export(OUT)
print('OK car')
