import sys, os, math
sys.path.insert(0, os.path.dirname(__file__))
from lib import *

OUT = sys.argv[-1]
reset()
WHT = mat('paint_white', 0xf4f5f7, metal=0.15, rough=0.25, coat=1)
BLU = mat('paint_blue', 0x1f4fa8, metal=0.15, rough=0.3, coat=1)
GRY = mat('belly', 0xb9bec6, metal=0.4, rough=0.35)
GLS = mat('glass_dark', 0x101820, metal=0.2, rough=0.03)
MET = mat('metal', 0x9aa0a8, metal=0.9, rough=0.3)
BLK = mat('plastic_black', 0x1a1a1a, rough=0.6)
TIRE = mat('tire', 0x161616, rough=0.92)
TLR = mat('light_red', 0xd01010, rough=0.2, emit=1.0)
TLG = mat('light_green', 0x10c040, rough=0.2, emit=1.0)

# جسم الطائرة (المقدمة -Y) طول 30م تقريباً
R = 1.9
prof = [(0.001, -15.0), (0.6, -14.8), (1.2, -14.2), (1.6, -13.3), (1.85, -12.0), (R, -10.0), (R, 7.0), (1.7, 10.0), (1.2, 12.5), (0.6, 14.4), (0.25, 15.2)]
body = lathe('fuselage', prof, WHT, steps=48, axis='Y', loc=(0, 0, 3.2))
# أنف المقصورة: نوافذ القيادة
for sx in (-1, 1):
    box(f'cockpit{sx}', min(sx * 0.25, sx * 1.15), max(sx * 0.25, sx * 1.15), -13.75, -13.2, 3.75, 4.15, GLS, bev=0.08, seg=2, rake=0.25)
# خط النوافذ وشريط الألوان
for sx in (-1, 1):
    x = sx * (R - 0.02)
    box(f'windows{sx}', min(x, x + sx * 0.04), max(x, x + sx * 0.04), -11.0, 9.0, 3.55, 3.85, GLS)
    box(f'stripe{sx}', min(x - sx * 0.02, x + sx * 0.03), max(x - sx * 0.02, x + sx * 0.03), -12.0, 10.0, 3.0, 3.2, BLU)
    for k, y in enumerate((-10.5, 4.0)):
        box(f'door{sx}{k}', min(x, x + sx * 0.05), max(x, x + sx * 0.05), y, y + 0.9, 2.5, 4.1, mat('doorline', 0xc9ced6, rough=0.5))
box('belly', -1.2, 1.2, -9, 7, 1.35, 1.6, GRY, bev=0.3, seg=4)
# الجناحان
for sx in (-1, 1):
    prism(f'wing{sx}', [(-2.5, 2.6), (3.2, 2.6), (6.5, 2.75), (5.4, 2.75)], 0, 0, WHT)  # placeholder (يُستبدل)
for o in [o for o in bpy.data.objects if o.name.startswith('wing')]: bpy.data.objects.remove(o)
def wing(name, root_y0, root_y1, tip_y0, tip_y1, span, z, th, sx, m, dz=0.0):
    bm = bmesh.new()
    pts = [(0.0, root_y0, z), (0.0, root_y1, z), (span, tip_y1, z + dz), (span, tip_y0, z + dz)]
    top = [bm.verts.new((sx * x, y, zz + th / 2 * (1 if i < 2 else 0.4))) for i, (x, y, zz) in enumerate(pts)]
    bot = [bm.verts.new((sx * x, y, zz - th / 2 * (1 if i < 2 else 0.4))) for i, (x, y, zz) in enumerate(pts)]
    for f in (top, bot[::-1]): bm.faces.new(f if sx > 0 else f[::-1])
    for i in range(4):
        j = (i + 1) % 4
        q = (top[i], bot[i], bot[j], top[j]); bm.faces.new(q if sx > 0 else q[::-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = obj_from_bm(name, bm, m, smooth=False)
    bevel(o, 0.06, 2)
    return o
for sx in (-1, 1):
    wing(f'wing{sx}', -3.0, 2.6, 4.8, 6.6, 15.0, 2.35, 0.45, sx, WHT, dz=1.1)
    sphere(f'wingtip{sx}', 0.12, (sx * 15.0, 5.7, 3.45), TLG if sx > 0 else TLR)
    # المحرك
    ex = sx * 5.2
    lathe(f'engine{sx}', [(0.75, -3.3), (0.95, -3.0), (0.95, -0.5), (0.7, 0.3), (0.4, 0.6)], WHT, steps=32, axis='Y', loc=(ex, 0, 1.55))
    cyl(f'intake{sx}', 0.78, 0.06, (ex, -3.3, 1.55), mat('intake', 0x2a2d31, metal=0.8, rough=0.3), axis='Y')
    cyl(f'spinner{sx}', 0.2, 0.3, (ex, -3.25, 1.55), MET, axis='Y', r2=0.05)
    box(f'pylon{sx}', ex - 0.12, ex + 0.12, -1.5, 0.3, 2.2, 2.6, WHT, bev=0.05, seg=2)
    wing(f'hstab{sx}', 10.5, 13.5, 13.6, 14.8, 5.2, 3.9, 0.22, sx, WHT, dz=0.4)
# الذيل العمودي
prism('vtail', [(10.0, 4.6), (14.6, 4.8), (15.3, 10.2), (13.8, 10.2)], -0.12, 0.12, BLU, bev=0.05, seg=2)
sphere('beacon', 0.12, (0, 0, 5.15), TLR)
# العجلات
for y, xs in ((-11.5, (0,)), (1.2, (-2.4, 2.4))):
    for x in xs:
        tube(f'gear{x}{y}', [(x, y, 2.0), (x, y, 0.7)], 0.12, MET)
        for dx in (-0.25, 0.25):
            cyl(f'gw{x}{y}{dx}', 0.45 if y > 0 else 0.35, 0.3, (x + dx, y, 0.45 if y > 0 else 0.35), TIRE, axis='X', verts=24)
export(OUT)
print('OK plane')
