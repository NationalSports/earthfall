# The Kestrel VTOL strike jet, built from code in Blender (run: python3 tools/blender/kestrel.py <out.glb>, needs `pip install bpy`).
# Game units are metres. Blender: X right, Y forward (nose), Z up; the glTF export turns that into the game's -Z forward, Y up.
# The nose tip sits at Y = +6.6 and the nozzle exit at Y = -6.6, so the model is centred and the game's glow disc lines up.
import bpy, bmesh, math, sys
from mathutils import Vector, Matrix
out = sys.argv[-1] if sys.argv[-1].endswith('.glb') else '/tmp/kestrel.glb'
bpy.ops.wm.read_factory_settings(use_empty=True)
C = bpy.context.scene.collection

def mat(name, rgb, rough=0.5, metal=0.0, emit=None):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*rgb, 1); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    if emit: b.inputs['Emission Color'].default_value = (*emit, 1); b.inputs['Emission Strength'].default_value = 3
    return m
HULL = mat('hull', (0.20, 0.23, 0.27), 0.55, 0.35); DARK = mat('hull-dark', (0.07, 0.08, 0.09), 0.6, 0.4); METAL = mat('metal', (0.32, 0.32, 0.33), 0.35, 0.9)
GLASS = mat('glass', (0.02, 0.05, 0.07), 0.05, 0.6); ACCENT = mat('accent', (0.85, 0.42, 0.06), 0.5, 0.1); WHITE = mat('decal', (0.75, 0.76, 0.72), 0.6, 0.0)
HEAT = mat('nozzle-heat', (0.12, 0.08, 0.06), 0.3, 0.8); LAMP = mat('lamp', (1, 0.3, 0.2), 0.4, 0, emit=(1, 0.25, 0.15))

def obj(name, me, m, smooth=True):
    o = bpy.data.objects.new(name, me); C.objects.link(o); o.data.materials.append(m)
    if smooth:
        for p in o.data.polygons: p.use_smooth = True
    return o
def bevel(o, w=0.03, seg=2):
    md = o.modifiers.new('bev', 'BEVEL'); md.width = w; md.segments = seg; md.limit_method = 'ANGLE'; md.angle_limit = math.radians(35)
    o.modifiers.new('wn', 'WEIGHTED_NORMAL').keep_sharp = True
    return o

def loft(name, rings, m, n=20, power=2.6, cap=True):
    """rings: (y, half-width, half-height, z centre) along the body; superellipse sections bridged into one skin."""
    bm = bmesh.new(); loops = []
    for y, hw, hh, zc in rings:
        ring = []
        for i in range(n):
            a = 2 * math.pi * i / n; c, s = math.cos(a), math.sin(a)
            x = hw * math.copysign(abs(c) ** (2 / power), c); z = zc + hh * math.copysign(abs(s) ** (2 / power), s)
            ring.append(bm.verts.new((x, y, z)))
        loops.append(ring)
    for a, b in zip(loops, loops[1:]):
        for i in range(n): bm.faces.new((a[i], a[(i + 1) % n], b[(i + 1) % n], b[i]))
    if cap: bm.faces.new(list(reversed(loops[0]))); bm.faces.new(loops[-1])
    bm.normal_update(); me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = obj(name, me, m); sd = o.modifiers.new('sub', 'SUBSURF'); sd.levels = 1; sd.render_levels = 1
    return o

def box(name, size, loc, m, rot=(0, 0, 0), bev=0.03):
    me = bpy.data.meshes.new(name); bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1); bmesh.ops.scale(bm, vec=size, verts=bm.verts); bm.to_mesh(me); bm.free()
    o = obj(name, me, m, smooth=False); o.location = loc; o.rotation_euler = rot
    return bevel(o, bev) if bev else o

def cyl(name, r1, r2, length, loc, m, rot=(0, 0, 0), seg=20, cap=True):
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=cap, cap_tris=False, segments=seg, radius1=r1, radius2=r2, depth=length); bm.to_mesh(me); bm.free()
    o = obj(name, me, m); o.location = loc; o.rotation_euler = rot
    return o

def plate(name, pts_top, thick, m, z=0.0):
    """A flat surface (wing, fin) from its outline, given thickness that thins toward the trailing edge."""
    bm = bmesh.new(); top = [bm.verts.new((x, y, z + t * thick / 2)) for x, y, t in pts_top]; bot = [bm.verts.new((x, y, z - t * thick / 2)) for x, y, t in pts_top]
    bm.faces.new(top); bm.faces.new(list(reversed(bot)))
    n = len(top)
    for i in range(n): bm.faces.new((top[i], bot[i], bot[(i + 1) % n], top[(i + 1) % n]))
    bm.normal_update(); me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    return bevel(obj(name, me, m, smooth=False), 0.025)

# --- fuselage: a long armoured body that swells around the intakes and tapers to a sharp nose
loft('fuselage', [(-6.6, 0.56, 0.52, 1.62), (-6.0, 0.70, 0.62, 1.64), (-4.6, 0.86, 0.72, 1.68), (-2.4, 0.98, 0.80, 1.72), (-0.4, 1.00, 0.82, 1.76), (1.6, 0.86, 0.74, 1.76),
                  (3.2, 0.66, 0.60, 1.72), (4.6, 0.44, 0.42, 1.66), (5.7, 0.22, 0.22, 1.60), (6.6, 0.03, 0.03, 1.56)], HULL)
# spine and canopy
loft('spine', [(-5.6, 0.18, 0.10, 2.30), (-3.0, 0.34, 0.20, 2.42), (0.4, 0.34, 0.20, 2.44), (1.6, 0.20, 0.10, 2.38)], HULL, n=12)
loft('canopy', [(0.9, 0.08, 0.06, 2.36), (1.6, 0.42, 0.34, 2.40), (2.8, 0.44, 0.36, 2.34), (3.8, 0.30, 0.22, 2.18), (4.4, 0.06, 0.04, 2.04)], GLASS, n=16, power=2.2)
box('canopy-frame', (0.06, 0.10, 0.62), (0, 2.25, 2.62), DARK, rot=(math.radians(-58), 0, 0), bev=0.01)
# intakes: angled scoops on both flanks with dark mouths
for sd in (-1, 1):
    box(f'intake{sd}', (0.42, 2.6, 0.9), (sd * 1.05, -0.4, 1.66), HULL, rot=(0, 0, math.radians(-sd * 4)))
    box(f'intake-mouth{sd}', (0.36, 0.06, 0.74), (sd * 1.06, 0.92, 1.66), DARK, bev=0.0)
    box(f'intake-lip{sd}', (0.46, 0.10, 0.08), (sd * 1.05, 0.92, 2.08), DARK, bev=0.01)
# wings: swept, thinning to the tips, with a hint of anhedral; wingtip lift-engine pods for vertical take-off
for sd in (-1, 1):
    w = plate(f'wing{sd}', [(sd * 0.9, 0.9, 1), (sd * 6.0, -2.0, 0.45), (sd * 6.0, -3.5, 0.4), (sd * 0.9, -3.3, 0.9)], 0.24, HULL, z=1.42)
    w.rotation_euler = (0, sd * math.radians(-4), 0); w.location = (0, 0, sd * 0 + 0.0)
    plate(f'wing-stripe{sd}', [(sd * 4.6, -1.08, 1), (sd * 5.6, -1.75, 1), (sd * 5.6, -2.15, 1), (sd * 4.6, -1.5, 1)], 0.25, ACCENT, z=1.425).rotation_euler = (0, sd * math.radians(-4), 0)
    pod = loft(f'pod{sd}', [(-4.4, 0.30, 0.30, 0), (-3.6, 0.46, 0.46, 0), (-1.6, 0.48, 0.48, 0), (-0.8, 0.40, 0.40, 0), (-0.2, 0.18, 0.18, 0)], HULL, n=16, power=2.0)
    pod.location = (sd * 6.15, 0, 1.06)
    cyl(f'pod-fan{sd}', 0.40, 0.40, 0.06, (sd * 6.15, -2.6, 1.55), DARK, seg=18)
    cyl(f'pod-nozzle{sd}', 0.36, 0.30, 0.5, (sd * 6.15, -4.55, 1.06), HEAT, rot=(math.pi / 2, 0, 0), seg=16)
    cyl(f'pod-lamp{sd}', 0.07, 0.07, 0.06, (sd * 6.15, -0.18, 1.06), LAMP, rot=(math.pi / 2, 0, 0), seg=8)
    # twin canted tails and small tailplanes
    # twin canted tails: vertical plates from their side outline (y, height)
    bm = bmesh.new(); outline = [(-3.7, 0.0), (-6.3, 0.0), (-6.7, 2.1), (-5.5, 2.1)]; t = 0.07
    a = [bm.verts.new((t, y, h)) for y, h in outline]; b = [bm.verts.new((-t, y, h)) for y, h in outline]
    bm.faces.new(a); bm.faces.new(list(reversed(b)))
    for i in range(4): bm.faces.new((a[i], b[i], b[(i + 1) % 4], a[(i + 1) % 4]))
    bm.normal_update(); me = bpy.data.meshes.new(f'fin{sd}'); bm.to_mesh(me); bm.free()
    f = bevel(obj(f'fin{sd}', me, HULL, smooth=False), 0.02); f.location = (sd * 0.62, 0, 2.05); f.rotation_euler = (0, sd * math.radians(24), 0)
    plate(f'tailplane{sd}', [(sd * 0.7, -4.6, 1), (sd * 2.6, -5.6, 0.6), (sd * 2.6, -6.3, 0.5), (sd * 0.7, -6.3, 0.8)], 0.12, HULL, z=1.55)
    # weapons: a pylon and two missiles under each wing
    for k, x in enumerate((2.4, 3.9)):
        box(f'pylon{sd}{k}', (0.12, 1.4, 0.26), (sd * x, -1.3, 1.18), DARK, bev=0.01)
        cyl(f'missile{sd}{k}', 0.13, 0.13, 2.2, (sd * x, -1.2, 0.96), WHITE, rot=(math.pi / 2, 0, 0), seg=12)
        cyl(f'missile-nose{sd}{k}', 0.13, 0.0, 0.4, (sd * x, 0.1, 0.96), DARK, rot=(-math.pi / 2, 0, 0), seg=12)
        for j in range(4):
            fn = box(f'missile-fin{sd}{k}{j}', (0.02, 0.3, 0.2), (sd * x, -2.15, 0.96), DARK, bev=0.0); fn.rotation_euler = (0, j * math.pi / 2 + math.pi / 4, 0)
            fn.location = (sd * x + 0.13 * math.cos(j * math.pi / 2 + math.pi / 4), -2.15, 0.96 + 0.13 * math.sin(j * math.pi / 2 + math.pi / 4))
# main engine nozzle with petals and a hot core
cyl('nozzle', 0.60, 0.52, 0.9, (0, -6.3, 1.62), HEAT, rot=(math.pi / 2, 0, 0), seg=24, cap=False)
cyl('nozzle-ring', 0.64, 0.64, 0.12, (0, -5.86, 1.62), METAL, rot=(math.pi / 2, 0, 0), seg=24)
cyl('nozzle-core', 0.34, 0.12, 0.5, (0, -6.2, 1.62), METAL, rot=(-math.pi / 2, 0, 0), seg=16)
# nose gun and sensor ball
cyl('gun', 0.05, 0.05, 1.4, (0, 4.8, 1.12), METAL, rot=(math.pi / 2, 0, 0), seg=10)
cyl('gun-shroud', 0.12, 0.10, 0.6, (0, 4.2, 1.14), DARK, rot=(math.pi / 2, 0, 0), seg=12)
bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=10, radius=0.22, location=(0, 3.4, 1.06)); s = bpy.context.active_object; s.data.materials.append(GLASS); [setattr(p, 'use_smooth', True) for p in s.data.polygons]
# panel stripes and a squadron band
loft('band-nose', [(4.15, 0.53, 0.50, 1.69), (4.35, 0.49, 0.47, 1.68)], ACCENT, n=20, cap=False)
# landing gear: nose leg and two mains with wheels, feet at Z = 0
for x, y in ((0, 3.6), (-1.1, -2.2), (1.1, -2.2)):
    cyl(f'strut{x}{y}', 0.07, 0.07, 1.0, (x, y, 0.78), METAL, seg=8)
    w = cyl(f'wheel{x}{y}', 0.27, 0.27, 0.2, (x, y, 0.27), DARK, rot=(0, math.pi / 2, 0), seg=14)
    box(f'gear-door{x}{y}', (0.05, 0.9, 0.5), (x + (0.18 if x >= 0 else -0.18), y, 1.0), HULL, bev=0.01)

# apply modifiers, join everything per material for few draw calls, export
bpy.ops.object.select_all(action='SELECT'); bpy.context.view_layer.objects.active = C.objects[0]
for o in list(C.objects):
    bpy.context.view_layer.objects.active = o
    for md in list(o.modifiers): bpy.ops.object.modifier_apply(modifier=md.name)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
bpy.ops.object.join(); j = bpy.context.active_object; j.name = 'kestrel'
tris = sum(len(p.vertices) - 2 for p in j.data.polygons)
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=False, export_apply=True)
print('KESTREL', out, 'tris', tris, 'dims', [round(v, 2) for v in j.dimensions])
