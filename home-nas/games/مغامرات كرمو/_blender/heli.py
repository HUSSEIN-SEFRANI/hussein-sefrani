import sys, os, math
sys.path.insert(0, os.path.dirname(__file__))
from lib import *

OUT = sys.argv[-1]
reset()
PAINT = mat('paint_heli', 0xf4b400, metal=0.15, rough=0.3, coat=1)
WHT = mat('paint_white', 0xf2f2f2, metal=0.1, rough=0.3, coat=1)
GLS = mat('glass_dark', 0x18303e, metal=0.2, rough=0.03)
BLK = mat('plastic_black', 0x1a1a1a, rough=0.6)
MET = mat('metal', 0x8a8f96, metal=0.9, rough=0.3)
TLR = mat('light_red', 0xd01010, rough=0.2, emit=1.0)

# جسم المروحية: دوران مقطع على محور Y (المقدمة -Y)
prof = [(0.001, -2.0), (0.35, -1.95), (0.7, -1.7), (0.92, -1.2), (1.0, -0.6), (1.0, 0.2), (0.9, 0.8), (0.6, 1.3), (0.35, 1.6), (0.25, 1.8)]
body = lathe('body', [(r, a) for r, a in prof], PAINT, steps=40, axis='Y', loc=(0, 0, 1.25))
body.scale = (0.85, 1, 0.95)
# الزجاج الأمامي
g = sphere('canopy', 1, (0, -1.15, 1.45), GLS, scale=(0.8, 0.95, 0.72))
box('stripe', -0.86, 0.86, -0.3, 1.2, 0.95, 1.05, WHT, bev=0.04, seg=2)
for sx in (-1, 1):
    box(f'door{sx}', min(sx * 0.84, sx * 0.86), max(sx * 0.84, sx * 0.86), -0.5, 0.3, 1.25, 1.9, GLS, bev=0.03, seg=2)
# الذيل
tail = lathe('tail', [(0.28, 1.5), (0.22, 3.0), (0.14, 4.6)], PAINT, steps=24, axis='Y', loc=(0, 0, 1.55))
prism('fin', [(4.3, 1.5), (4.75, 2.55), (4.95, 2.55), (4.8, 1.5)], -0.04, 0.04, PAINT, bev=0.02, seg=2)
box('stab', -0.7, 0.7, 4.0, 4.35, 1.5, 1.56, PAINT, bev=0.02, seg=2)
# الدوار الخلفي
tr = bpy.data.objects.new('tail_rotor', None); bpy.context.collection.objects.link(tr); tr.location = (0.1, 4.75, 2.1)
for k in range(2):
    b = box(f'trb{k}', -0.01, 0.01, -0.04, 0.04, -0.5, 0.5, BLK, parent=tr); b.rotation_euler = (0, k * math.pi / 2 * 0 + 0, 0)
    b.rotation_euler = (math.pi / 2 * k, 0, 0)
# المحرك والمحور
box('engine', -0.45, 0.45, -0.4, 0.9, 2.0, 2.35, PAINT, bev=0.15, seg=4)
cyl('mast', 0.08, 0.4, (0, 0.1, 2.5), MET)
rot = bpy.data.objects.new('rotor', None); bpy.context.collection.objects.link(rot); rot.location = (0, 0.1, 2.72)
cyl('hub', 0.16, 0.12, (0, 0, 0), MET, parent=rot)
for k in range(4):
    a = k * math.pi / 2
    b = box(f'blade{k}', 0.15, 4.6, -0.13, 0.13, -0.02, 0.02, BLK, bev=0.01, seg=1, parent=rot)
    b.rotation_euler = (0.04, 0, a)
# الزلاجتان
for sx in (-1, 1):
    tube(f'skid{sx}', [(sx * 0.95, -1.6, 0.12), (sx * 0.95, -1.2, 0.05), (sx * 0.95, 1.2, 0.05)], 0.06, MET)
    tube(f'strut_a{sx}', [(sx * 0.95, -0.8, 0.05), (sx * 0.6, -0.8, 0.6)], 0.045, MET)
    tube(f'strut_b{sx}', [(sx * 0.95, 0.7, 0.05), (sx * 0.6, 0.7, 0.6)], 0.045, MET)
sphere('beacon', 0.07, (0, 0.6, 2.38), TLR)
sphere('nav', 0.05, (0, 4.95, 2.6), TLR)
export(OUT)
print('OK heli')
