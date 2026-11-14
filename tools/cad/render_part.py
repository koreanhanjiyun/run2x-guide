"""부품 렌더 (Blender, 화면 없이): 초점 부품 = 회색 + 검은 외곽선, 주변 부품 = 흐린 흰색. 사이트 부품 그림(img/comp/*.webp)과 같은 모양.

사용 (저장소 맨 위에서):
  blender -b -P tools/cad/render_part.py -- --glb <ref4car.glb> --focus "정규식" [--ghost "정규식"] [--az 35 --el 20] [--out 그림.png] [--w 1080 --h 675] [--pad 1.25] [--persp]
- glb 는 tools/cad/step2glb.py 결과 (메시 이름 "순번|부품 이름", mm). --focus 에 맞는 부품만 진하게, --ghost 에 맞는 부품은 흐리게 (없으면 초점 둘레 반경 안의 부품 전부)
- 방향: az = 위에서 보아 앞(+x)에서 왼쪽으로 돈 각, el = 위로 든 각 [도]. az 0 = 정면, 90 = 왼쪽 옆, el 90 = 위
- 결과 png → webp 는 python 으로 (PIL): Image.open(p).save(q, 'WEBP', quality=88)
"""
import bpy, sys, re, math, argparse
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ap = argparse.ArgumentParser()
ap.add_argument('--glb', required=True); ap.add_argument('--focus', required=True); ap.add_argument('--ghost', default='')
ap.add_argument('--az', type=float, default=35); ap.add_argument('--el', type=float, default=20)
ap.add_argument('--out', default='part.png'); ap.add_argument('--w', type=int, default=1080); ap.add_argument('--h', type=int, default=675)
ap.add_argument('--pad', type=float, default=1.25); ap.add_argument('--ghost-r', type=float, default=1.6, help='--ghost 없을 때 초점 크기의 몇 배 안을 흐리게')
ap.add_argument('--persp', action='store_true'); ap.add_argument('--line', type=float, default=1.8)
A = ap.parse_args(argv)

# 1. 빈 장면 + glb
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=A.glb)
sc = bpy.context.scene
meshes = [o for o in sc.objects if o.type == 'MESH']
pname = lambda o: (o.data.name if o.data else o.name).split('|', 1)[-1]   # 메시 이름 "순번|부품 이름"
focus = [o for o in meshes if re.search(A.focus, pname(o))]
if not focus: sys.exit('초점 부품을 못 찾음: ' + A.focus)
def bbox(objs):
    ps = [o.matrix_world @ Vector(c) for o in objs for c in o.bound_box]
    lo = Vector((min(p.x for p in ps), min(p.y for p in ps), min(p.z for p in ps))); hi = Vector((max(p.x for p in ps), max(p.y for p in ps), max(p.z for p in ps)))
    return lo, hi
flo, fhi = bbox(focus); fc = (flo + fhi) / 2; fr = (fhi - flo).length / 2
if A.ghost: ghost = [o for o in meshes if o not in focus and re.search(A.ghost, pname(o))]
else: ghost = [o for o in meshes if o not in focus and ((sum(bbox([o]), Vector()) / 2) - fc).length < fr * A.ghost_r]
for o in meshes:
    if o not in focus and o not in ghost: bpy.data.objects.remove(o, do_unlink=True)

# 2. 재질: 초점 = 회색 금속 느낌, 주변 = 흰 반투명
def mat(name, rgb, alpha, rough, metal):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*rgb, 1); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    b.inputs['Alpha'].default_value = alpha
    if alpha < 1:
        try: m.surface_render_method = 'BLENDED'
        except Exception: m.blend_method = 'BLEND'
    return m
MF = mat('focus', (0.42, 0.44, 0.48), 1.0, 0.35, 0.55)   # 기존 img/comp 그림의 회색에 맞춤
MG = mat('ghost', (0.95, 0.93, 0.88), 0.28, 0.8, 0.0)
cf = bpy.data.collections.new('focus'); cg = bpy.data.collections.new('ghost'); sc.collection.children.link(cf); sc.collection.children.link(cg)
for objs, col, m in ((focus, cf, MF), (ghost, cg, MG)):
    for o in objs:
        for c in list(o.users_collection): c.objects.unlink(o)
        col.objects.link(o); o.data.materials.clear(); o.data.materials.append(m)

# 3. 빛 · 배경 (흰 바탕, 색 그대로)
w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs[0].default_value = (1, 1, 1, 1); w.node_tree.nodes['Background'].inputs[1].default_value = 1.0
sc.view_settings.view_transform = 'Standard'
for rot, en in (((math.radians(50), 0, math.radians(30)), 3.0), ((math.radians(70), 0, math.radians(-140)), 1.2)):
    l = bpy.data.lights.new('sun', 'SUN'); l.energy = en; lo = bpy.data.objects.new('sun', l); lo.rotation_euler = rot; sc.collection.objects.link(lo)

# 4. 카메라: 방향 (az, el) 에서 초점 부품을 화면에 맞춤. glTF(y 위) → Blender(z 위): 사이트 x 앞 → X, 사이트 z 왼쪽 → -Y
az, el = math.radians(A.az), math.radians(A.el)
d = Vector((math.cos(el) * math.cos(az), -math.cos(el) * math.sin(az), math.sin(el)))
cam = bpy.data.cameras.new('cam'); co = bpy.data.objects.new('cam', cam); sc.collection.objects.link(co); sc.camera = co
co.location = fc + d * fr * 8; co.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
bpy.context.view_layer.update()
inv = co.matrix_world.inverted(); pts = [inv @ (o.matrix_world @ Vector(c)) for o in focus for c in o.bound_box]
sx = max(abs(p.x) for p in pts); sy = max(abs(p.y) for p in pts); asp = A.w / A.h
span = max(2 * sx, 2 * sy * asp) * A.pad
cam.clip_start = 0.1; cam.clip_end = fr * 40 + 10000
if A.persp:
    cam.lens = 85; fov = 2 * math.atan(cam.sensor_width / 2 / cam.lens)
    co.location = fc + d * (span / 2 / math.tan(fov / 2) + fr)
else:
    cam.type = 'ORTHO'; cam.ortho_scale = span

# 5. 외곽선 (Freestyle): 초점 부품만
r = sc.render; r.engine = 'BLENDER_EEVEE_NEXT' if 'BLENDER_EEVEE_NEXT' in {e.identifier for e in r.bl_rna.properties['engine'].enum_items} else 'BLENDER_EEVEE'
r.resolution_x, r.resolution_y, r.resolution_percentage = A.w, A.h, 100; r.film_transparent = False
r.use_freestyle = True; r.line_thickness_mode = 'ABSOLUTE'; r.line_thickness = A.line
fs = bpy.context.view_layer.freestyle_settings; ls = fs.linesets[0] if fs.linesets else fs.linesets.new('lines')
ls.select_by_collection = True; ls.collection = cf; ls.collection_negation = 'INCLUSIVE'
ls.select_silhouette = ls.select_border = ls.select_crease = True
if ls.linestyle is None: ls.linestyle = bpy.data.linestyles.new('line')   # 빈 장면에서 만든 lineset 은 선 모양이 없음
ls.linestyle.color = (0.08, 0.08, 0.1); ls.linestyle.thickness = A.line
r.image_settings.file_format = 'PNG'; r.filepath = A.out
bpy.ops.render.render(write_still=True)
print('RENDER', A.out, 'focus', len(focus), 'ghost', len(ghost))
