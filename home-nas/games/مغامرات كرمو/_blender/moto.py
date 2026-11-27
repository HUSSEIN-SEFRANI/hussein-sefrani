import sys, os, math
sys.path.insert(0, os.path.dirname(__file__))
from lib import *

OUT = sys.argv[-1]
reset()
PAINT = mat('paint_moto', 0xd62828, metal=0.2, rough=0.3, coat=1)
BLK = mat('plastic_black', 0x161616, rough=0.6)
CHR = mat('chrome', 0xffffff, metal=1, rough=0.08)
TIRE = mat('tire', 0x161616, rough=0.92)
RIM = mat('rim_dark', 0x2b2d31, metal=0.7, rough=0.35)
SEAT = mat('seat', 0x1d1d1d, rough=0.85)
HLG = mat('hl_glass', 0xdfe6ea, metal=0.2, rough=0.03, alpha=0.4)
TLR = mat('light_red', 0x9a0a0a, rough=0.2, emit=0.6)
ENG = mat('engine', 0x5a5d63, metal=0.8, rough=0.4)

R = 0.31
for y in (-0.72, 0.68):
    g = wheel(f'w{y}', (0, y, R), R, 0.13, TIRE, RIM, CHR, side=1, rim_r=0.2, hub=True)
# الهيكل والخزان
prism('tank', [(-0.45, 0.72), (-0.05, 0.82), (0.18, 0.78), (0.2, 0.62), (-0.42, 0.58)], -0.13, 0.13, PAINT, bev=0.06, seg=4)
prism('fairing', [(-0.75, 0.55), (-0.62, 0.95), (-0.45, 0.82), (-0.42, 0.5)], -0.16, 0.16, PAINT, bev=0.05, seg=4)
box('screen', -0.13, 0.13, -0.72, -0.66, 0.9, 1.06, HLG, bev=0.02, seg=2, rake=0.06)
box('seat', -0.12, 0.12, 0.15, 0.62, 0.7, 0.78, SEAT, bev=0.04, seg=3)
prism('tail', [(0.55, 0.66), (0.85, 0.8), (0.88, 0.72), (0.55, 0.58)], -0.1, 0.1, PAINT, bev=0.03, seg=3)
box('tl', -0.06, 0.06, 0.86, 0.89, 0.72, 0.77, TLR, bev=0.01, seg=1)
box('engine', -0.15, 0.15, -0.35, 0.15, 0.3, 0.6, ENG, bev=0.05, seg=3)
for k in range(4):
    box(f'fin{k}', -0.16, 0.16, -0.3 + k * 0.1, -0.27 + k * 0.1, 0.32, 0.58, ENG)
tube('frame', [(0, -0.6, 0.9), (0, -0.2, 0.62), (0, 0.3, 0.6), (0, 0.68, R)], 0.03, BLK)
for sx in (-1, 1):
    tube(f'fork{sx}', [(sx * 0.08, -0.62, 0.95), (sx * 0.08, -0.72, R)], 0.025, CHR)
    tube(f'swing{sx}', [(sx * 0.08, 0.15, 0.42), (sx * 0.08, 0.68, R)], 0.025, BLK)
tube('bar', [(-0.33, -0.55, 1.02), (-0.15, -0.6, 1.0), (0.15, -0.6, 1.0), (0.33, -0.55, 1.02)], 0.018, BLK)
for sx in (-1, 1):
    cyl(f'grip{sx}', 0.025, 0.1, (sx * 0.35, -0.55, 1.02), SEAT, axis='X')
    box(f'mirror{sx}', sx * 0.26 - 0.05, sx * 0.26 + 0.05, -0.58, -0.56, 1.12, 1.17, BLK, bev=0.01, seg=1)
sphere('headlight', 0.08, (0, -0.76, 0.78), HLG, scale=(1, 0.5, 0.8))
tube('exhaust', [(0.13, -0.1, 0.3), (0.18, 0.2, 0.34), (0.2, 0.75, 0.5)], 0.045, CHR)
box('plate', -0.08, 0.08, 0.86, 0.87, 0.58, 0.66, mat('plate', 0xf0f0ea, rough=0.4))
box('peg_l', -0.2, -0.1, 0.15, 0.22, 0.32, 0.35, BLK)
box('peg_r', 0.1, 0.2, 0.15, 0.22, 0.32, 0.35, BLK)
export(OUT)
print('OK moto')
