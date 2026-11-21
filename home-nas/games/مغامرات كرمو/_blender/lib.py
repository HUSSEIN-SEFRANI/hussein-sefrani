# مكتبة مساعدة لبناء النماذج في Blender (تُصدَّر glb إلى three.js)
# الإحداثيات: Blender Z للأعلى، المقدمة نحو -Y (تصير +Z في three.js).
import bpy, bmesh, math
from mathutils import Vector, Matrix

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def srgb(h):
    c = [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255]
    return tuple((x / 12.92) if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)

_M = {}
def mat(name, hexc, metal=0.0, rough=0.5, emit=0.0, alpha=1.0, coat=0.0):
    if name in _M: return _M[name]
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*srgb(hexc), 1)
    b.inputs['Metallic'].default_value = metal
    b.inputs['Roughness'].default_value = rough
    if coat: b.inputs['Coat Weight'].default_value = coat
    if emit:
        b.inputs['Emission Color'].default_value = (*srgb(hexc), 1)
        b.inputs['Emission Strength'].default_value = emit
    if alpha < 1:
        b.inputs['Alpha'].default_value = alpha
    _M[name] = m
    return m

def obj_from_bm(name, bm, material, smooth=True, parent=None):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o)
    if material: me.materials.append(material)
    if smooth:
        for p in me.polygons: p.use_smooth = True
    if parent: o.parent = parent
    return o

def bevel(o, w, seg=3, harden=True, limit='ANGLE'):
    m = o.modifiers.new('bev', 'BEVEL'); m.width = w; m.segments = seg
    m.limit_method = limit; m.angle_limit = math.radians(35); m.harden_normals = harden
    m.miter_outer = 'MITER_ARC'
    return m

def box(name, x0, x1, y0, y1, z0, z1, material, bev=0.0, seg=3, rake=0.0, rake_from=None, taper=0.0, parent=None):
    """صندوق. rake: إزاحة الوجه الأمامي العلوي للخلف (+Y). taper: تضييق الأعلى (من كل جانب)."""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        x = x0 if v.co.x < 0 else x1
        y = y0 if v.co.y < 0 else y1
        z = z0 if v.co.z < 0 else z1
        if v.co.z > 0:
            if v.co.y < 0: y += rake
            if v.co.x < 0: x += taper
            else: x -= taper
        v.co = Vector((x, y, z))
    o = obj_from_bm(name, bm, material, smooth=bev > 0, parent=parent)
    if bev > 0: bevel(o, bev, seg)
    return o

def prism(name, pts_yz, x0, x1, material, bev=0.0, seg=3, parent=None):
    """مقطع جانبي (y,z) مضلّع يُمدّ على X."""
    bm = bmesh.new()
    a = [bm.verts.new((x0, y, z)) for y, z in pts_yz]
    b = [bm.verts.new((x1, y, z)) for y, z in pts_yz]
    n = len(pts_yz)
    bm.faces.new(a[::-1]); bm.faces.new(b)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((a[i], a[j], b[j], b[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = obj_from_bm(name, bm, material, smooth=bev > 0, parent=parent)
    if bev > 0: bevel(o, bev, seg)
    return o

def lathe(name, prof, material, steps=48, axis='X', loc=(0, 0, 0), parent=None, smooth=True, cap=False):
    """prof: قائمة (r, a) حيث a على محور الدوران."""
    bm = bmesh.new()
    vs = [bm.verts.new((r, 0, a)) for r, a in prof]
    es = [bm.edges.new((vs[i], vs[i + 1])) for i in range(len(vs) - 1)]
    bmesh.ops.spin(bm, geom=vs + es, cent=(0, 0, 0), axis=(0, 0, 1), angle=math.radians(360), steps=steps, use_merge=True)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    if axis == 'X': bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(math.radians(90), 3, 'Y'))
    elif axis == 'Y': bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(math.radians(-90), 3, 'X'))
    o = obj_from_bm(name, bm, material, smooth=smooth, parent=parent)
    o.location = loc
    return o

def cyl(name, r, depth, loc, material, axis='Z', verts=32, bev=0.0, parent=None, r2=None):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=verts, radius1=r, radius2=r if r2 is None else r2, depth=depth)
    if axis == 'X': bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(math.radians(90), 3, 'Y'))
    elif axis == 'Y': bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(math.radians(90), 3, 'X'))
    o = obj_from_bm(name, bm, material, smooth=True, parent=parent)
    o.location = loc
    if bev > 0: bevel(o, bev, 2)
    else:
        # حواف حادة للأغطية
        o.modifiers.new('ws', 'WEIGHTED_NORMAL').keep_sharp = True
    return o

def sphere(name, r, loc, material, scale=(1, 1, 1), seg=32, ring=16, parent=None):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=ring, radius=r)
    o = obj_from_bm(name, bm, material, smooth=True, parent=parent)
    o.location = loc; o.scale = scale
    return o

def wheel(name, loc, R, W, tire_m, rim_m, nut_m, side=1, dual=False, parent=None, rim_r=None, hub=True):
    """عجلة واقعية: إطار بكتف مستدير وجنط مقعّر وصواميل. side=+1 الجهة اليمنى (x موجب)."""
    rr = rim_r or R * 0.62
    g = bpy.data.objects.new(name, None); bpy.context.collection.objects.link(g); g.location = loc
    if parent: g.parent = parent
    widths = [(-W, 0), (0, W)] if dual else [(-W / 2, W / 2)]
    for k, (a0, a1) in enumerate(widths):
        sh = 0.045 * R / 0.5
        prof = [(rr * 0.98, a0 + 0.01), (R - sh, a0), (R - sh * 0.3, a0 + sh * 0.35), (R, a0 + sh), (R, a1 - sh),
                (R - sh * 0.3, a1 - sh * 0.35), (R - sh, a1), (rr * 0.98, a1 - 0.01)]
        t = lathe(f'{name}_tire{k}', [(r, a * side) for r, a in prof], tire_m, steps=56, axis='X', parent=g)
    # الجنط على الوجه الخارجي
    o = (widths[-1][1] if side > 0 else -widths[0][0]) - 0.02
    o2 = widths[0][0] if side > 0 else -widths[-1][1]
    rp = [(0.001, o + 0.07), (rr * 0.18, o + 0.065), (rr * 0.26, o + 0.035), (rr * 0.36, o + 0.02), (rr * 0.72, o - 0.01),
          (rr * 0.9, o + 0.005), (rr, o + 0.01), (rr * 1.02, o - 0.01), (rr * 0.98, o2 + 0.02)]
    if not hub: rp[0] = (0.001, o + 0.03); rp[1] = (rr * 0.18, o + 0.03)
    lathe(f'{name}_rim', [(r, a * side) for r, a in rp], rim_m, steps=48, axis='X', parent=g)
    for i in range(10):
        a = i / 10 * math.tau
        cyl(f'{name}_nut{i}', 0.018 * R / 0.5, 0.05, ((o + 0.03) * side, math.cos(a) * rr * 0.3, math.sin(a) * rr * 0.3), nut_m, axis='X', verts=6, parent=g)
    for i in range(8):
        a = (i + .5) / 8 * math.tau
        cyl(f'{name}_hole{i}', 0.035 * R / 0.5, 0.02, ((o + 0.012) * side, math.cos(a) * rr * 0.55, math.sin(a) * rr * 0.55), mat('hole', 0x0a0a0a, rough=.9), axis='X', verts=16, parent=g)
    return g

def tube(name, pts, r, material, parent=None, res=12):
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = r; cu.bevel_resolution = 3
    sp = cu.splines.new('POLY'); sp.points.add(len(pts) - 1)
    for i, p in enumerate(pts): sp.points[i].co = (*p, 1)
    o = bpy.data.objects.new(name, cu); bpy.context.collection.objects.link(o)
    cu.materials.append(material)
    if parent: o.parent = parent
    return o

def export(path):
    bpy.ops.object.select_all(action='SELECT')
    # تحويل المنحنيات إلى شبكات
    for o in list(bpy.data.objects):
        if o.type == 'CURVE':
            bpy.context.view_layer.objects.active = o
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', export_apply=True, export_yup=True,
                              export_extras=False, export_cameras=False, export_lights=False)
