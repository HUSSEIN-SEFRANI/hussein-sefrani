import sys, os, math
sys.path.insert(0, os.path.dirname(__file__))
from lib import *

OUT = sys.argv[-1]
reset()
RED = mat('paint_red', 0x6a0f1c, metal=0.05, rough=0.35, coat=1)
SIL = mat('grille_silver', 0xb9bcc0, metal=0.85, rough=0.3)
BLK = mat('plastic_black', 0x141414, rough=0.65)
CHR = mat('chrome', 0xffffff, metal=1, rough=0.08)
GLS = mat('glass_dark', 0x0d1218, metal=0.1, rough=0.03)
HLG = mat('hl_glass', 0xdfe6ea, metal=0.2, rough=0.03, alpha=0.4)
AMB = mat('light_amber', 0xffa020, rough=0.3, emit=0.5)
WHT = mat('light_white', 0xf5f5f0, rough=0.2, emit=0.6)
TLR = mat('light_red', 0x9a0a0a, rough=0.2, emit=0.6)
TIRE = mat('tire', 0x161616, rough=0.92)
RIM = mat('rim_silver', 0xc8cbd0, metal=0.9, rough=0.25)
DRK = mat('chassis', 0x1d1d1f, metal=0.3, rough=0.6)
ALU = mat('alu', 0xd6d9dc, metal=1, rough=0.22)

# ---------- القمرة ----------
box('cab_low', -1.25, 1.25, 0.0, 2.25, 1.05, 2.62, RED, bev=0.13, seg=4)
box('cab_mid', -1.235, 1.235, 0.04, 2.25, 2.55, 3.36, RED, bev=0.08, seg=4, rake=0.14)
box('roof', -1.22, 1.22, 0.22, 2.25, 3.36, 4.0, RED, bev=0.15, seg=5, rake=0.24, taper=0.05)
box('roof_strip', -1.0, 1.0, 0.27, 0.3, 3.80, 3.83, CHR, rake=0.0)
box('visor', -1.2, 1.2, 0.1, 0.5, 3.33, 3.43, BLK, bev=0.03, seg=2, rake=0.03)
for sx in (-1, 1):
    box(f'roof_lamp{sx}', sx * 0.45 - 0.17, sx * 0.45 + 0.17, 0.08, 0.14, 3.44, 3.5, WHT, bev=0.01, seg=2)
    box(f'roof_led{sx}', sx * 0.95 - 0.13, sx * 0.95 + 0.13, 0.08, 0.14, 3.44, 3.49, AMB, bev=0.01, seg=2)
# الزجاج الأمامي
box('windshield', -1.13, 1.13, 0.028, 0.06, 2.63, 3.29, GLS, bev=0.04, seg=3, rake=0.123)
# الشبك
box('grille', -0.88, 0.88, -0.035, 0.05, 1.55, 2.56, SIL, bev=0.04, seg=3, taper=-0.03)
for i, zc in enumerate((2.2, 2.0, 1.8, 1.62)):
    box(f'slot{i}', -0.72, 0.72, -0.05, 0.0, zc - 0.06, zc + 0.06, BLK, bev=0.02, seg=2)
box('badge_band', -0.5, 0.5, -0.045, 0.0, 2.33, 2.45, mat('badge', 0x8c9096, metal=0.9, rough=0.35), bev=0.01, seg=1)
box('grille_low', -0.84, 0.84, -0.035, 0.05, 1.12, 1.52, SIL, bev=0.03, seg=3)
for i, zc in enumerate((1.4, 1.24)):
    box(f'lslot{i}', -0.7, 0.7, -0.05, 0.0, zc - 0.045, zc + 0.045, BLK, bev=0.015, seg=2)
for sx in (-1, 1):
    e = box(f'brow{sx}', -0.22, 0.22, -0.03, 0.04, -0.07, 0.07, BLK, bev=0.03, seg=2)
    e.location = (sx * 0.95, 0, 2.43); e.rotation_euler = (0, sx * 0.12, 0)
    # المصابيح
    box(f'hl_body{sx}', sx * 0.885 if sx > 0 else -1.2, 1.2 if sx > 0 else -0.885, -0.02, 0.06, 1.17, 1.43, mat('hl_inner', 0x2a2d31, metal=0.6, rough=0.35), bev=0.03, seg=2)
    box(f'hl_glass{sx}', sx * 0.88 if sx > 0 else -1.205, 1.205 if sx > 0 else -0.88, -0.045, -0.02, 1.16, 1.44, HLG, bev=0.03, seg=2)
    for k, xx in enumerate((0.97, 1.11)):
        sphere(f'hl_bulb{sx}{k}', 0.085, (sx * xx, -0.0, 1.3), mat('reflector', 0xffffff, metal=1, rough=0.05), scale=(1, 0.35, 1))
    box(f'hl_drl{sx}', sx * 0.9 if sx > 0 else -1.19, 1.19 if sx > 0 else -0.9, -0.03, 0.0, 1.405, 1.425, WHT)
    # المرايا
    tube(f'mir_arm_u{sx}', [(sx * 1.24, 0.35, 3.08), (sx * 1.48, 0.05, 3.1), (sx * 1.52, -0.12, 3.05)], 0.022, BLK)
    tube(f'mir_arm_l{sx}', [(sx * 1.24, 0.35, 2.45), (sx * 1.48, 0.05, 2.45), (sx * 1.52, -0.12, 2.5)], 0.022, BLK)
    box(f'mirror{sx}', min(sx * 1.43, sx * 1.62), max(sx * 1.43, sx * 1.62), -0.32, -0.14, 2.38, 2.98, RED, bev=0.06, seg=4)
    box(f'mirror_w{sx}', min(sx * 1.42, sx * 1.64), max(sx * 1.42, sx * 1.64), -0.3, -0.14, 3.02, 3.24, RED, bev=0.05, seg=3)
    box(f'mirglass{sx}', min(sx * 1.45, sx * 1.6), max(sx * 1.45, sx * 1.6), -0.13, -0.12, 2.42, 2.94, mat('mirror', 0xdde6ee, metal=1, rough=0.02))
    # الجوانب: نافذة، باب، درج
    xs = sx * 1.252
    box(f'sidewin{sx}', min(xs, xs + sx * 0.01), max(xs, xs + sx * 0.01), 0.22, 1.3, 2.62, 3.24, GLS, bev=0.02, seg=2)
    for yy in (0.18, 1.36):
        box(f'doorgap{sx}{yy}', min(xs, xs + sx * 0.006), max(xs, xs + sx * 0.006), yy, yy + 0.012, 1.12, 3.28, BLK)
    box(f'handle{sx}', min(xs, xs + sx * 0.03), max(xs, xs + sx * 0.03), 1.05, 1.25, 2.3, 2.36, CHR, bev=0.01, seg=2)
    box(f'skirt{sx}', min(sx * 1.05, sx * 1.255), max(sx * 1.05, sx * 1.255), 0.12, 1.4, 0.42, 1.06, RED, bev=0.04, seg=3)
    for z0 in (0.48, 0.78):
        box(f'step{sx}{z0}', min(sx * 1.0, sx * 1.262), max(sx * 1.0, sx * 1.262), 0.35, 1.15, z0, z0 + 0.16, BLK, bev=0.015, seg=2)
    box(f'deflector{sx}', min(sx * 1.17, sx * 1.24), max(sx * 1.17, sx * 1.24), 2.25, 2.85, 2.1, 3.98, RED, bev=0.03, seg=2)
    tube(f'ant{sx}', [(sx * 1.13, 0.55, 3.95), (sx * 1.13, 0.6, 5.0)], 0.007, BLK)
    # مصابيح الضباب
    for xx in (0.85, 1.08):
        cyl(f'fog{sx}{xx}', 0.055, 0.03, (sx * xx, -0.075, 0.83), CHR, axis='Y', verts=24)
        cyl(f'fogg{sx}{xx}', 0.045, 0.02, (sx * xx, -0.09, 0.83), HLG, axis='Y', verts=24)
# الصدام
box('bumper', -1.27, 1.27, -0.06, 0.45, 0.55, 1.13, RED, bev=0.09, seg=4)
box('intake', -0.62, 0.62, -0.08, 0.0, 0.6, 0.86, BLK, bev=0.03, seg=2)
box('spoiler', -1.2, 1.2, -0.03, 0.4, 0.48, 0.58, BLK, bev=0.03, seg=2)
box('towslot', -0.12, 0.12, -0.085, 0.0, 0.66, 0.8, DRK, bev=0.01, seg=1)

# ---------- الهيكل ----------
for sx in (-1, 1):
    box(f'rail{sx}', sx * 0.35 if sx > 0 else -0.47, 0.47 if sx > 0 else -0.35, 0.6, 6.3, 0.72, 1.0, DRK)
box('cross', -0.47, 0.47, 5.9, 6.0, 0.72, 1.0, DRK)
cyl('fifth', 0.48, 0.08, (0, 4.75, 1.1), DRK, verts=40)
box('fifth_base', -0.4, 0.4, 4.4, 5.1, 1.0, 1.08, DRK)
cyl('tank', 0.31, 1.3, (-0.98, 3.25, 0.8), ALU, axis='Y', verts=40, bev=0.03)
box('tank_strap1', -1.3, -0.66, 2.85, 2.9, 0.47, 1.13, BLK)
box('tank_strap2', -1.3, -0.66, 3.6, 3.65, 0.47, 1.13, BLK)
box('sidebox', 0.66, 1.22, 2.5, 4.2, 0.45, 1.05, RED, bev=0.04, seg=3)
box('rear_lamps', -1.15, 1.15, 6.25, 6.32, 0.75, 0.9, DRK)
for sx in (-1, 1):
    box(f'tl{sx}', sx * 0.8 if sx > 0 else -1.12, 1.12 if sx > 0 else -0.8, 6.32, 6.34, 0.77, 0.88, TLR)
    # رفارف خلفية
    box(f'fender{sx}', min(sx * 0.55, sx * 1.24), max(sx * 0.55, sx * 1.24), 4.35, 5.85, 1.12, 1.17, BLK, bev=0.02, seg=2)
    box(f'flap{sx}', min(sx * 0.55, sx * 1.22), max(sx * 0.55, sx * 1.22), 5.82, 5.86, 0.3, 1.14, BLK)
    box(f'ffl{sx}', min(sx * 0.82, sx * 1.22), max(sx * 0.82, sx * 1.22), 1.95, 2.0, 0.35, 1.06, BLK)

# ---------- العجلات ----------
for sx in (-1, 1):
    wheel(f'wf{sx}', (sx * 1.06, 1.42, 0.52), 0.52, 0.32, TIRE, RIM, CHR, side=sx)
    wheel(f'wr{sx}', (sx * 0.88, 5.1, 0.52), 0.52, 0.3, TIRE, RIM, CHR, side=sx, dual=True, hub=False)
cyl('axle_f', 0.06, 2.0, (0, 1.42, 0.52), DRK, axis='X')
cyl('axle_r', 0.12, 1.5, (0, 5.1, 0.52), DRK, axis='X')
export(OUT)
print('OK truck')
