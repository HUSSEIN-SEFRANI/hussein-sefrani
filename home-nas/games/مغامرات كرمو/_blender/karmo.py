# كرمو بأسلوب «تشيبي»: رأس كبير، عينان كبيرتان لامعتان، شعر بخصلات ملتفّة.
import sys, os, math, random
sys.path.insert(0, os.path.dirname(__file__))
from lib import *
from mathutils import Vector, Matrix, Euler, Quaternion
from mathutils.bvhtree import BVHTree

OUT = sys.argv[-1]
POSE = sys.argv[-2] if len(sys.argv) > 2 and sys.argv[-2] in ('walk', 'sit') else 'walk'
reset(); random.seed(5)
SKIN = mat('skin', 0xf7d0b4, rough=0.5)
HAIR = mat('hair', 0x5b3a25, rough=0.55)
EYEW = mat('eye_white', 0xffffff, rough=0.2)
IRIS = mat('eye_iris', 0x6b3a1c, rough=0.2)
PUP = mat('eye_pupil', 0x2a140a, rough=0.2)
SHINE = mat('eye_shine', 0xffffff, emit=2)
LASH = mat('lash', 0x3a2214, rough=0.7)
BROW = mat('brow', 0x5b3a25, rough=0.8)
MOUTH = mat('mouth', 0x7a2a28, rough=0.6)
TONG = mat('tongue', 0xf07c84, rough=0.5)
TEETH = mat('teeth', 0xffffff, rough=0.3)
BLUSH = mat('blush', 0xf4a49a, rough=0.6)
SHIRT = mat('fabric_shirt', 0xf0793a, rough=0.9)
SHORTS = mat('fabric_shorts', 0x5c6678, rough=0.9)
SOCK = mat('fabric_sock', 0xf4f4f0, rough=0.9)
SHOE = mat('shoe', 0x7a4a2c, rough=0.55)
SOLE = mat('sole', 0xe9e2d6, rough=0.7)
BAG = mat('bag', 0x3559a8, rough=0.6)

def mball(name, elems, material, res=0.004, thresh=0.6):
    mb = bpy.data.metaballs.new(name); mb.resolution = res; mb.render_resolution = res; mb.threshold = thresh
    o = bpy.data.objects.new(name, mb); bpy.context.collection.objects.link(o)
    for e in elems:
        el = mb.elements.new(); el.co = Vector(e[1]); el.radius = e[2]; el.stiffness = 2.0
        if e[0] == 'E': el.type = 'ELLIPSOID'; el.size_x, el.size_y, el.size_z = e[3]
        else: el.type = 'BALL'
    mb.materials.append(material)
    bpy.context.view_layer.update()
    bpy.ops.object.select_all(action='DESELECT'); bpy.context.view_layer.objects.active = o; o.select_set(True)
    bpy.ops.object.convert(target='MESH')
    m = bpy.context.view_layer.objects.active; m.name = name
    for p in m.data.polygons: p.use_smooth = True
    return m

def ell(name, r, loc, m, scale, rot=None):
    o = sphere(name, r, loc, m, scale=scale, seg=40, ring=20)
    if rot is not None: o.rotation_mode = 'QUATERNION'; o.rotation_quaternion = rot
    return o

def limb(name, a, b, r, m, r2=None, bev=None):
    a, b = Vector(a), Vector(b); d = b - a
    o = cyl(name, r, d.length, (a + b) / 2, m, verts=32, r2=r2 if r2 else r, bev=bev if bev is not None else min(r, 0.02) * 0.9)
    o.rotation_mode = 'QUATERNION'; o.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(d.normalized())
    return o

def taper_tube(name, pts, radii, m):
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = 1.0; cu.bevel_resolution = 2
    cu.use_fill_caps = True
    sp = cu.splines.new('NURBS'); sp.points.add(len(pts) - 1); sp.use_endpoint_u = True; sp.order_u = 3; sp.resolution_u = 4
    for i, (p, r) in enumerate(zip(pts, radii)):
        sp.points[i].co = (*p, 1); sp.points[i].radius = r
    o = bpy.data.objects.new(name, cu); bpy.context.collection.objects.link(o); cu.materials.append(m)
    return o

# ================= الرأس =================
HC = Vector((0, 0, 0.8))
head = mball('Head', [
    ('B', HC + Vector((0, 0.01, 0.025)), 0.32),
    ('E', HC + Vector((0, -0.025, -0.05)), 0.27, (1.0, 0.88, 0.7)),
    ('B', HC + Vector((0, -0.06, -0.125)), 0.075),
    ('E', HC + Vector((0.185, 0.012, -0.03)), 0.075, (0.42, 0.8, 1)),
    ('E', HC + Vector((-0.185, 0.012, -0.03)), 0.075, (0.42, 0.8, 1)),
], SKIN, res=0.005)
bvh = BVHTree.FromObject(head, bpy.context.evaluated_depsgraph_get())
def dirv(u, v): return Vector((math.sin(u) * math.cos(v), -math.cos(u) * math.cos(v), math.sin(v)))
def surf(d, lift=0.0, c=None):
    d = Vector(d).normalized(); c = HC if c is None else c
    hit = bvh.ray_cast(c + d * 0.6, -d)
    return hit[0] + hit[1] * lift, hit[1]
def frame(n):
    up = Vector((0, 0, 1)); up = (up - n * up.dot(n)).normalized()
    xr = up.cross(n).normalized()
    return xr, up, n

# ---------- العينان ----------
for sx in (-1, 1):
    p, n = surf(dirv(sx * 0.4, -0.06))
    xr, up, nn = frame(n)
    q = Matrix((xr, up, nn)).transposed().to_quaternion()
    W, Hh = 0.036, 0.044
    ell(f'eyeW{sx}', 1, p + n * 0.001, EYEW, (W, Hh, 0.012), q)
    ell(f'iris{sx}', 1, p + n * 0.005 - up * 0.004, IRIS, (W * 0.86, Hh * 0.86, 0.01), q)
    ell(f'pupil{sx}', 1, p + n * 0.0085 - up * 0.006, PUP, (W * 0.42, Hh * 0.45, 0.008), q)
    ell(f'shine{sx}', 1, p + n * 0.012 + up * 0.014 - xr * sx * 0.008, SHINE, (0.012, 0.015, 0.004), q)
    ell(f'shine2{sx}', 1, p + n * 0.012 - up * 0.019 + xr * sx * 0.012, SHINE, (0.0055, 0.0055, 0.003), q)
    # الرموش العلوية: قوس سميك ينتهي بلفتة للخارج
    pts, rad = [], []
    for k in range(11):
        a = math.radians(165 - 150 * k / 10)     # من الجهة الداخلية إلى الخارجية
        ax = math.cos(a) * W * 1.08 * (-sx); ay = math.sin(a) * Hh * 1.04
        q2, _ = surf((p + xr * ax + up * ay) - HC, 0.004)
        pts.append(tuple(q2)); rad.append(0.0035 + 0.0035 * math.sin(math.pi * k / 10) + (0.0015 if k > 7 else 0))
    tip = Vector(pts[-1]) + xr * (sx * 0.012) + up * 0.006
    pts.append(tuple(surf(tip - HC, 0.004)[0])); rad.append(0.0012)
    taper_tube(f'lash{sx}', pts, rad, LASH)
    # الحاجب
    bp, br = [], []
    for k in range(7):
        t = k / 6
        q3, _ = surf(dirv(sx * (0.22 + 0.36 * t), 0.24 + 0.06 * math.sin(t * math.pi)), 0.003)
        bp.append(tuple(q3)); br.append(0.002 + 0.004 * math.sin(math.pi * (0.15 + 0.7 * t)))
    taper_tube(f'brow{sx}', bp, br, BROW)
    # احمرار الخدّين
    pb, nb = surf(dirv(sx * 0.62, -0.3), 0.0015)
    xb, ub, _ = frame(nb); ell(f'blush{sx}', 1, pb, BLUSH, (0.03, 0.02, 0.003), Matrix((xb, ub, nb)).transposed().to_quaternion())

# الأنف الصغير
pn, nn = surf(dirv(0, -0.2), -0.006); sphere('nose', 0.014, pn, SKIN, scale=(1.2, 0.8, 0.8))

# ---------- الفم المفتوح ----------
def patch(name, outline, m, lift):
    bm = bmesh.new()
    vs = [bm.verts.new(surf(dirv(u, v), lift)[0]) for u, v in outline]
    bm.faces.new(vs); bmesh.ops.triangulate(bm, faces=bm.faces)
    bmesh.ops.subdivide_edges(bm, edges=bm.edges, cuts=2, use_grid_fill=True)
    for v in bm.verts:
        v.co = surf(v.co - HC, lift)[0]
    return obj_from_bm(name, bm, m)
def mouth_shape(w, top, depth, n=20):
    up = [((t - 0.5) * w, top + 0.35 * ((t - 0.5) * w) ** 2) for t in (k / n for k in range(n + 1))]
    lo = [((t - 0.5) * w, top - depth * math.sin(math.pi * t) ** 0.7) for t in (k / n for k in range(n, -1, -1))]
    return up + lo
patch('mouth', mouth_shape(0.36, -0.37, 0.16), MOUTH, 0.0012)
patch('teeth', [(u, v) for u, v in mouth_shape(0.28, -0.372, 0.03)], TEETH, 0.0022)
tg = [(0.1 * math.cos(a), -0.49 + 0.035 * math.sin(a)) for a in (math.pi * k / 16 for k in range(17))]
tg += [(0.1 * math.cos(a), -0.49 + 0.02 * math.sin(a)) for a in (math.pi + math.pi * k / 16 for k in range(1, 16))]
patch('tongue', tg, TONG, 0.0022)

# ================= الشعر =================
cap = mball('HairBase', [('E', HC + Vector((0, 0.03, 0.04)), 0.335, (1.0, 1.0, 0.9))], HAIR, res=0.008)
me = cap.data; bm = bmesh.new(); bm.from_mesh(me)
kill = []
for v in bm.verts:
    d = (v.co - HC).normalized()
    u = math.atan2(d.x, -d.y); el = math.asin(max(-1, min(1, d.z)))
    hair_line = 0.34 - 0.25 * (abs(u) / math.pi) ** 0.6 if abs(u) < 1.3 else -0.25 + 0.15 * max(0, 1.9 - abs(u))
    if abs(u) > 1.2 and abs(u) < 1.9 and el < 0.05: kill.append(v); continue
    if el < hair_line: kill.append(v)
bmesh.ops.delete(bm, geom=kill, context='VERTS'); bm.to_mesh(me); bm.free()
sol = cap.modifiers.new('sol', 'SOLIDIFY'); sol.thickness = 0.01
sm = cap.modifiers.new('sm', 'SMOOTH'); sm.iterations = 3

def lock(name, uv_pts, lifts, radii):
    pts = []
    for (u, v), l in zip(uv_pts, lifts):
        q, n = surf(dirv(u, v), l); pts.append(tuple(q))
    return taper_tube(name, pts, radii, HAIR)
i = 0
# خصلات حول الرأس: تنزل من التاج وتلتفّ أطرافها للخارج، وتترك الأذنين ظاهرتين
for k in range(20):
    u = -math.pi + (k + 0.5) / 20 * math.tau + random.uniform(-0.05, 0.05)
    if abs(u) < 1.05: continue
    over_ear = abs(u) < 2.0
    v_end = (0.12 if over_ear else -0.22) + random.uniform(-0.05, 0.05)
    cs = 1 if k % 2 else -1
    path = [(u * 0.35, 1.2), (u * 0.85, 0.85), (u, 0.5), (u + 0.08 * cs, (0.5 + v_end) / 2), (u + 0.16 * cs, v_end), (u + 0.32 * cs, v_end + 0.1)]
    lock(f'lock{i}', path, [0.01, 0.04, 0.05, 0.045, 0.045, 0.075], [0.02, 0.05, 0.055, 0.045, 0.028, 0.004]); i += 1
# طبقة علوية تعطي الشعر انتفاخاً
for k in range(9):
    u = -math.pi + (k + 0.5) / 9 * math.tau
    path = [(0, 1.5), (u, 1.15), (u + 0.15, 0.85), (u + 0.3, 0.72)]
    lock(f'top{k}', path, [0.04, 0.07, 0.07, 0.085], [0.03, 0.05, 0.035, 0.004])
# الغُرّة: خصلات مائلة إلى جهة واحدة بأطراف مدببة
for k in range(6):
    u0 = (k / 5 - 0.5) * 1.6 + 0.1
    path = [(u0 * 0.3 + 0.2, 1.2), (u0 * 0.7 + 0.15, 0.9), (u0 + 0.08, 0.62), (u0 - 0.06, 0.46), (u0 - 0.2, 0.38 + random.uniform(-0.04, 0.05)), (u0 - 0.34, 0.45)]
    lock(f'fringe{k}', path, [0.02, 0.045, 0.05, 0.04, 0.03, 0.045], [0.022, 0.05, 0.05, 0.04, 0.022, 0.004])
# خصلة واقفة فوق الرأس
top, _ = surf(dirv(0.3, 1.2), 0.06)
taper_tube('ahoge', [tuple(top), tuple(top + Vector((0.02, 0.0, 0.05))), tuple(top + Vector((0.06, 0.01, 0.075))), tuple(top + Vector((0.09, 0.02, 0.06)))], [0.03, 0.026, 0.016, 0.003], HAIR)

# ================= الجسم (وقفة مشي) =================
limb('neck', (0, 0, 0.6), (0, 0, 0.68), 0.04, SKIN)
limb('torso', (0, 0, 0.37), (0, 0, 0.62), 0.125, SHIRT, r2=0.1, bev=0.05)
ell('chest', 1, (0, 0, 0.56), SHIRT, (0.112, 0.09, 0.07))
limb('hem', (0, 0, 0.37), (0, 0, 0.39), 0.127, SHIRT, bev=0.01)
limb('collar', (0, 0, 0.615), (0, 0, 0.632), 0.045, SHIRT, bev=0.008)
# ذراعان وساقان حسب الوقفة
for sx, sw in ((1, -1), (-1, 1)):
    sh = Vector((sx * 0.105, 0, 0.585))
    sphere(f'shoulder{sx}', 0.05, sh, SHIRT)
    if POSE == 'sit':
        sleeve_end = sh + Vector((sx * 0.03, -0.06, -0.05))
        el = sleeve_end + Vector((sx * 0.02, -0.07, -0.04))
        wr = el + Vector((-sx * 0.0, -0.09, 0.0))
    else:
        sleeve_end = sh + Vector((sx * 0.045, sw * 0.03, -0.075))
        el = sleeve_end + Vector((sx * 0.02, sw * 0.04, -0.07))
        wr = el + Vector((sx * 0.025, sw * 0.06, -0.05))
    limb(f'sleeve{sx}', sh, sleeve_end, 0.05, SHIRT, r2=0.054, bev=0.012)
    limb(f'uarm{sx}', sleeve_end, el, 0.032, SKIN); sphere(f'elbow{sx}', 0.032, el, SKIN)
    limb(f'farm{sx}', el, wr, 0.031, SKIN, r2=0.029)
    d = (wr - el).normalized()
    sphere(f'hand{sx}', 0.038, wr + d * 0.025, SKIN, scale=(0.85, 0.8, 1.0))
    sphere(f'thumb{sx}', 0.014, wr + d * 0.018 + Vector((-sx * 0.025, -0.012, 0.012)), SKIN)
ell('hips', 1, (0, 0, 0.36), SHORTS, (0.13, 0.1, 0.07))
for sx, sw in ((-1, -1), (1, 1)):
    hip = Vector((sx * 0.06, 0, 0.34))
    if POSE == 'sit':
        knee = hip + Vector((sx * 0.01, -0.16, 0.0)); ank = knee + Vector((0, -0.02, -0.15))
        tilt = Quaternion((1, 0, 0), 0)
    else:
        knee = hip + Vector((0, sw * 0.05, -0.15)); ank = knee + Vector((0, sw * 0.02 + (0.03 if sw > 0 else 0), -0.15))
        tilt = Quaternion((1, 0, 0), math.radians(-15 if sw > 0 else 5))
    limb(f'shortleg{sx}', hip, hip + (knee - hip) * 0.85, 0.068, SHORTS, r2=0.072, bev=0.015)
    limb(f'leg{sx}', hip + (knee - hip) * 0.8, ank, 0.035, SKIN, r2=0.032)
    if POSE == 'sit': sphere(f'knee{sx}', 0.036, knee, SKIN)
    limb(f'sock{sx}', ank + Vector((0, 0, -0.02)), ank + Vector((0, 0, 0.06)), 0.037, SOCK, bev=0.01)
    limb(f'sockcuff{sx}', ank + Vector((0, 0, 0.045)), ank + Vector((0, 0, 0.065)), 0.039, SOCK, bev=0.006)
    sh_c = ank + Vector((0, -0.03, -0.035))
    ell(f'shoe{sx}', 1, sh_c, SHOE, (0.05, 0.085, 0.045), tilt)
    ell(f'sole{sx}', 1, sh_c + Vector((0, 0, -0.03)), SOLE, (0.052, 0.088, 0.016), tilt)
# حقيبة الظهر
b = box('bag', -0.1, 0.1, 0.1, 0.19, 0.38, 0.6, BAG, bev=0.04, seg=4)
box('bagpocket', -0.075, 0.075, 0.18, 0.215, 0.4, 0.5, BAG, bev=0.025, seg=3)
for sx in (-1, 1):
    taper_tube(f'strap{sx}', [(sx * 0.065, 0.1, 0.6), (sx * 0.07, 0.02, 0.64), (sx * 0.075, -0.1, 0.58), (sx * 0.08, -0.125, 0.48), (sx * 0.085, -0.12, 0.4)], [0.012] * 5, BAG)

bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_apply=True)
print('OK chibi', tuple(round(x, 3) for x in head.dimensions))
