"""부품 렌더 (Blender, 화면 없이): 초점 부품 = 회색 금속 + 검은 외곽선, 주변 부품 = 흐린 반투명. 사이트 부품 그림(img/comp/*.webp)용.

사용 (저장소 맨 위에서):
  blender -b -P tools/cad/render_part.py -- --glb <glb> --focus "정규식" [--ghost "정규식"] [--az 35 --el 20] [--out 그림.png]
      [--w 1080 --h 675] [--pad 1.25] [--persp] [--line 1.6] [--bg none|white] [--samples 128] [--corner FL|FR|RL|RR]
- glb 는 tools/cad/step2glb.py 결과 (메시 이름 "순번|부품 이름|상위 조립품들", mm). 렌더할 부품은 --fine 으로 곱게 변환해 둘 것
  (거칠게 변환한 부품은 나사산 · 작은 구멍이 깨짐)
- --focus · --ghost 는 "부품 이름|상위 조립품들" 에서 찾음. --ghost 가 없으면 초점 둘레 반경 안의 부품 전부를 흐리게
- 방향: az = 위에서 보아 앞(+x)에서 왼쪽으로 돈 각, el = 위로 든 각 [도]. az 0 = 정면, 90 = 왼쪽 옆, el 90 = 위
- 렌더 방식 (예전 EEVEE 결과의 결함 대응):
  · Cycles (광선 추적): 반투명 겹침 · 앞뒤 가림이 정확함 (EEVEE 반투명은 물체 단위로 정렬해 앞뒤가 뒤바뀜)
  · 외곽선은 초점 부품만 따로 한 번 더 렌더해 얹음 → 반투명 주변 부품에 가려 선이 끊기지 않음
  · 선은 진짜 모서리 · 윤곽에만 (step2glb 가 매끈한 면 경계를 붙여 둠)
- 결과 png → webp 는 python 으로 (PIL): Image.open(p).save(q, 'WEBP', quality=88)
"""
import bpy, sys, re, math, argparse, os
import numpy as np
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ap = argparse.ArgumentParser()
ap.add_argument('--glb', required=True); ap.add_argument('--focus', required=True); ap.add_argument('--ghost', default='')
ap.add_argument('--az', type=float, default=35); ap.add_argument('--el', type=float, default=20)
ap.add_argument('--out', default='part.png'); ap.add_argument('--w', type=int, default=1080); ap.add_argument('--h', type=int, default=675)
ap.add_argument('--pad', type=float, default=1.25); ap.add_argument('--ghost-r', type=float, default=1.6, help='--ghost 없을 때 초점 크기의 몇 배 안을 흐리게')
ap.add_argument('--persp', action='store_true'); ap.add_argument('--line', type=float, default=1.6)
ap.add_argument('--bg', default='none', choices=['none', 'white']); ap.add_argument('--samples', type=int, default=128)
ap.add_argument('--corner', default='', choices=['', 'FL', 'FR', 'RL', 'RR'], help='초점을 이 바퀴 쪽 부품만으로')
A = ap.parse_args(argv)
OUT = os.path.abspath(A.out)

# 1. 빈 장면 + glb
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=A.glb)
sc = bpy.context.scene
# step2glb --frame ref4 결과는 사이트 좌표(z 왼쪽, 왼손 좌표계)라 오른손 좌표계인 Blender 에서는 거울상(글자가 뒤집혀 보임).
# 좌우를 한 번 더 뒤집어 실제 CAD 와 같게: 이제 Blender X 앞 · Y 왼쪽 · Z 위 (ISO 8855)
from mathutils import Matrix
S = Matrix.Diagonal((1, -1, 1, 1))
for o in [o for o in sc.objects if o.parent is None]: o.matrix_world = S @ o.matrix_world
bpy.context.view_layer.update()
meshes = [o for o in sc.objects if o.type == 'MESH']
pname = lambda o: (o.data.name if o.data else o.name).split('|', 1)[-1]   # "부품 이름|상위 조립품들"
def bbox(objs):
    ps = [o.matrix_world @ Vector(c) for o in objs for c in o.bound_box]
    lo = Vector((min(p.x for p in ps), min(p.y for p in ps), min(p.z for p in ps))); hi = Vector((max(p.x for p in ps), max(p.y for p in ps), max(p.z for p in ps)))
    return lo, hi
focus = [o for o in meshes if re.search(A.focus, pname(o))]
if A.corner:   # 같은 조립품이 네 바퀴에 다 있을 때 한 곳만. 앞 = 휠베이스 절반보다 앞(x > 800 mm), 왼쪽 = Blender +Y
    ctr = lambda o: sum(bbox([o]), Vector()) / 2
    focus = [o for o in focus if (ctr(o).x > 800) == (A.corner[0] == 'F') and (ctr(o).y > 0) == (A.corner[1] == 'L')]
if not focus: sys.exit('초점 부품을 못 찾음: ' + A.focus)
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
    return m
MF = mat('focus', (0.42, 0.44, 0.48), 1.0, 0.38, 0.5)   # 기존 img/comp 그림의 회색에 맞춤
MG = mat('ghost', (0.95, 0.93, 0.88), 0.22, 0.8, 0.0)
MH = bpy.data.materials.new('hold'); MH.use_nodes = True; nt = MH.node_tree   # 선만 뽑을 때: 면은 투명(holdout)
nt.nodes.remove(nt.nodes['Principled BSDF']); nt.links.new(nt.nodes.new('ShaderNodeHoldout').outputs[0], nt.nodes['Material Output'].inputs['Surface'])
cf = bpy.data.collections.new('focus'); cg = bpy.data.collections.new('ghost'); sc.collection.children.link(cf); sc.collection.children.link(cg)
for objs, col, m in ((focus, cf, MF), (ghost, cg, MG)):
    for o in objs:
        for c in list(o.users_collection): c.objects.unlink(o)
        col.objects.link(o); o.data.materials.clear(); o.data.materials.append(m)

# 3. 빛 · 배경: 카메라에는 흰 배경(또는 투명), 조명으로는 은은한 회색 → 그림자 · 틈의 음영으로 앞뒤가 보임
w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True; wn = w.node_tree.nodes; wl = w.node_tree.links
bg = wn['Background']; bg.inputs[0].default_value = (0.75, 0.76, 0.78, 1); bg.inputs[1].default_value = 0.8
wb = wn.new('ShaderNodeBackground'); wb.inputs[0].default_value = (1, 1, 1, 1); wb.inputs[1].default_value = 1.0
lp = wn.new('ShaderNodeLightPath'); mx = wn.new('ShaderNodeMixShader')
wl.new(lp.outputs['Is Camera Ray'], mx.inputs[0]); wl.new(bg.outputs[0], mx.inputs[1]); wl.new(wb.outputs[0], mx.inputs[2])
wl.new(mx.outputs[0], wn['World Output'].inputs['Surface'])
sc.view_settings.view_transform = 'Standard'
for rot, en, ang in (((math.radians(45), 0, math.radians(35)), 2.6, 8), ((math.radians(65), 0, math.radians(-135)), 0.9, 20)):
    l = bpy.data.lights.new('sun', 'SUN'); l.energy = en; l.angle = math.radians(ang)
    lo = bpy.data.objects.new('sun', l); lo.rotation_euler = rot; sc.collection.objects.link(lo)

# 4. 카메라: 방향 (az, el) 에서 초점 부품을 화면에 맞춤 (위에서 좌우를 바로잡아 Blender X 앞 · Y 왼쪽 · Z 위)
az, el = math.radians(A.az), math.radians(A.el)
d = Vector((math.cos(el) * math.cos(az), math.cos(el) * math.sin(az), math.sin(el)))
cam = bpy.data.cameras.new('cam'); co = bpy.data.objects.new('cam', cam); sc.collection.objects.link(co); sc.camera = co
co.location = fc + d * fr * 8; co.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
bpy.context.view_layer.update()
inv = co.matrix_world.inverted(); pts = [inv @ (o.matrix_world @ Vector(c)) for o in focus for c in o.bound_box]
sx = max(abs(p.x) for p in pts); sy = max(abs(p.y) for p in pts); asp = A.w / A.h
span = max(2 * sx, 2 * sy * asp) * A.pad
cam.clip_start = fr * 0.5; cam.clip_end = fr * 40   # 앞뒤 범위를 좁게 → 깊이 정밀도
if A.persp:
    cam.lens = 85; fov = 2 * math.atan(cam.sensor_width / 2 / cam.lens)
    co.location = fc + d * (span / 2 / math.tan(fov / 2) + fr); cam.clip_start = fr * 0.2; cam.clip_end = (co.location - fc).length + fr * 30
else:
    cam.type = 'ORTHO'; cam.ortho_scale = span

# 5. 렌더 설정 (Cycles)
r = sc.render; r.engine = 'CYCLES'; cy = sc.cycles
cy.device = 'CPU'; cy.samples = A.samples; cy.use_denoising = True
cy.transparent_max_bounces = 64; cy.max_bounces = 6   # 반투명 겹이 많아도 끝까지 통과
r.resolution_x, r.resolution_y, r.resolution_percentage = A.w, A.h, 100
r.image_settings.file_format = 'PNG'; r.image_settings.color_mode = 'RGBA'
fs = bpy.context.view_layer.freestyle_settings; ls = fs.linesets[0] if fs.linesets else fs.linesets.new('lines')
ls.select_by_collection = True; ls.collection = cf; ls.collection_negation = 'INCLUSIVE'
ls.select_silhouette = ls.select_border = ls.select_crease = True; ls.select_external_contour = True
fs.crease_angle = math.radians(140)
if ls.linestyle is None: ls.linestyle = bpy.data.linestyles.new('line')   # 빈 장면에서 만든 lineset 은 선 모양이 없음
ls.linestyle.color = (0.08, 0.08, 0.1); ls.linestyle.thickness = A.line; ls.linestyle.caps = 'ROUND'
r.line_thickness_mode = 'ABSOLUTE'; r.line_thickness = A.line

def shot(path):
    r.filepath = path; bpy.ops.render.render(write_still=True)
    im = bpy.data.images.load(path); a = np.array(im.pixels[:], dtype=np.float32).reshape(A.h, A.w, 4); bpy.data.images.remove(im); return a

# 5-1. 면 (초점 + 주변, 선 없음)
r.use_freestyle = False; r.film_transparent = (A.bg == 'none')
base = shot(OUT + '.base.png')
# 5-2. 선 (초점 부품만, 면은 투명) — 주변 반투명 부품에 가려지지 않게 따로
for o in ghost: o.hide_render = True
for o in focus: o.data.materials.clear(); o.data.materials.append(MH)
r.use_freestyle = True; r.film_transparent = True; cy.samples = 1; cy.use_denoising = False
line = shot(OUT + '.line.png')
# 5-3. 합치기 (선을 위에) — Blender 이미지 픽셀은 아래 줄부터, 색은 곧은 알파
la = line[..., 3:4]; ba = base[..., 3:4]
oa = la + ba * (1 - la)
oc = np.where(oa > 0, (line[..., :3] * la + base[..., :3] * ba * (1 - la)) / np.maximum(oa, 1e-6), 0)
out = np.concatenate([oc, oa], axis=2)
img = bpy.data.images.new('out', A.w, A.h, alpha=True); img.pixels[:] = out.reshape(-1); img.filepath_raw = OUT; img.file_format = 'PNG'; img.save()
for p in (OUT + '.base.png', OUT + '.line.png'): os.remove(p)
print('RENDER', OUT, 'focus', len(focus), 'ghost', len(ghost))
