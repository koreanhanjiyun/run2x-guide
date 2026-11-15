"""부품 렌더 (Blender, 화면 없이): 초점 부품 = 회색 금속 + 검은 외곽선, 주변 부품 = 흐린 반투명. 사이트 부품 그림(img/comp/*.webp)용.

사용 (저장소 맨 위에서):
  blender -b -P tools/cad/render_part.py -- --glb <glb> --focus "정규식" [--ghost "정규식"] [--az 35 --el 20] [--out 그림.png]
      [--w 1080 --h 675] [--pad 1.25] [--persp] [--line 1.6] [--bg none|white] [--samples 128] [--corner FL|FR|RL|RR]
      [--spec 그림.json] [--anchors 점.json]
- glb 는 tools/cad/step2glb.py 결과 (메시 이름 "순번|부품 이름|상위 조립품들", mm). 렌더할 부품은 --fine 으로 곱게 변환해 둘 것
  (거칠게 변환한 부품은 나사산 · 작은 구멍이 깨짐)
- --focus · --ghost 는 "부품 이름|상위 조립품들" 에서 찾음. --ghost 가 없으면 초점 둘레 반경 안의 부품 전부를 흐리게
- 방향: az = 위에서 보아 앞(+x)에서 왼쪽으로 돈 각, el = 위로 든 각 [도]. az 0 = 정면, 90 = 왼쪽 옆, el 90 = 위
- --spec: 그림 한 장의 설정(JSON, tools/cad/comp_fig.py 가 만듦). 명령줄 값보다 우선. 추가 기능:
  · hl: 한 부품 안의 관 일부만 초점으로 (프레임에서 롤후프만 등). 관 축 선분(사이트 좌표 mm)에서 반경 안 삼각형을 떼어 냄
  · hide: 주변에서도 뺄 부품 · driver: 드라이버 모형(헬멧 · 몸 · 팔다리, REF4 시트 · 헤드레스트 · 핸들 · 페달에 맞춰 둠)
  · belts: 안전벨트(어깨 · 랩 · 안티서브) · fit: 화면에 맞출 점(사이트 좌표)
  · anchors: 라벨 점 이름 → 부품(정규식) / 'hl:번호' / 'driver:부위' / 점. 보이는 점의 그림 좌표[px]를 --anchors 파일로
- 렌더 방식:
  · Cycles (광선 추적): 반투명 겹침 · 앞뒤 가림이 정확함 (EEVEE 반투명은 물체 단위로 정렬해 앞뒤가 뒤바뀜)
  · 외곽선은 초점 부품만 따로 한 번 더 렌더해 얹음 → 반투명 주변 부품에 가려 선이 끊기지 않음
  · 선은 진짜 모서리 · 윤곽에만 (step2glb 가 매끈한 면 경계를 붙여 둠)
- 결과 png → webp 는 python 으로 (PIL): Image.open(p).save(q, 'WEBP', quality=88)
"""
import bpy, bmesh, sys, re, math, argparse, os, json
import numpy as np
from mathutils import Vector, Matrix
from bpy_extras.object_utils import world_to_camera_view

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ap = argparse.ArgumentParser()
ap.add_argument('--glb', required=True); ap.add_argument('--focus', default=''); ap.add_argument('--ghost', default='')
ap.add_argument('--az', type=float, default=35); ap.add_argument('--el', type=float, default=20)
ap.add_argument('--out', default='part.png'); ap.add_argument('--w', type=int, default=1080); ap.add_argument('--h', type=int, default=675)
ap.add_argument('--pad', type=float, default=1.25); ap.add_argument('--ghost-r', type=float, default=1.6, help='--ghost 없을 때 초점 크기의 몇 배 안을 흐리게')
ap.add_argument('--persp', action='store_true'); ap.add_argument('--line', type=float, default=1.6)
ap.add_argument('--bg', default='none', choices=['none', 'white']); ap.add_argument('--samples', type=int, default=128)
ap.add_argument('--corner', default='', choices=['', 'FL', 'FR', 'RL', 'RR'], help='초점을 이 바퀴 쪽 부품만으로')
ap.add_argument('--spec', default=''); ap.add_argument('--anchors', default='')
A = ap.parse_args(argv)
SP = json.load(open(A.spec, encoding='utf-8')) if A.spec else {}
for k in ('focus', 'ghost', 'az', 'el', 'pad', 'persp', 'corner', 'line', 'w', 'h', 'samples', 'bg'):
    if k in SP: setattr(A, k, SP[k])
OUT = os.path.abspath(A.out)
B = lambda p: Vector((p[0], p[2], p[1]))   # 사이트 좌표(x 앞 · y 위 · z 왼쪽) → Blender(X 앞 · Y 왼쪽 · Z 위), mm

# 1. 빈 장면 + glb
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=A.glb)
sc = bpy.context.scene
# step2glb --frame ref4 결과는 사이트 좌표(z 왼쪽, 왼손 좌표계)라 오른손 좌표계인 Blender 에서는 거울상(글자가 뒤집혀 보임).
# 좌우를 한 번 더 뒤집어 실제 CAD 와 같게: 이제 Blender X 앞 · Y 왼쪽 · Z 위 (ISO 8855)
S = Matrix.Diagonal((1, -1, 1, 1))
for o in [o for o in sc.objects if o.parent is None]: o.matrix_world = S @ o.matrix_world
bpy.context.view_layer.update()
meshes = [o for o in sc.objects if o.type == 'MESH']
pname = lambda o: (o.data.name if o.data else o.name).split('|', 1)[-1]   # "부품 이름|상위 조립품들"
def bbox(objs):
    ps = [o.matrix_world @ Vector(c) for o in objs for c in o.bound_box]
    lo = Vector((min(p.x for p in ps), min(p.y for p in ps), min(p.z for p in ps))); hi = Vector((max(p.x for p in ps), max(p.y for p in ps), max(p.z for p in ps)))
    return lo, hi
ctr = lambda o: sum(bbox([o]), Vector()) / 2
find = lambda rx: [o for o in meshes if re.search(rx, pname(o))]

def apply_tf(o):   # 위치를 메시에 굳힘 (삼각형 좌표를 월드 기준으로 다루려고)
    o.data = o.data.copy(); o.data.transform(o.matrix_world); o.matrix_world = Matrix.Identity(4); o.data.update(); bpy.context.view_layer.update()

# 1-1. hl: 부품 안의 관 일부를 떼어 초점으로 (관 축 선분에서 반경 r 안의 삼각형)
hl_objs = []
for i, h in enumerate(SP.get('hl', [])):
    src = find(h['obj']); r = h.get('r', 14.5); got = []
    if h.get('near'):   # 다른 부품(예: 벨크랭크) 둘레 r 안 → 그 부품을 거는 브래킷. side L/R 로 한쪽만
        ref = [o for o in find(h['near']) if not h.get('side') or (ctr(o).y > 0) == (h['side'] == 'L')]
        c = (sum(bbox(ref), Vector()) / 2)[:] if ref else (0, 0, 0); c = [c[0] + h.get('dx', 0), c[2] + h.get('dz', 0), c[1]]
        h['segs'] = [[c, c]]
        if h.get('pool'):   # whole_tubes: 그 둘레를 지나는 관을 통째로 (관 하나 = 선분 묶음)
            cc = np.array(c); keep = []
            for tube in h['pool']:
                for s in tube:
                    P = np.array(s, float)
                    for a, b in zip(P[:-1], P[1:]):
                        ab = b - a; t = np.clip(((cc - a) @ ab) / max(ab @ ab, 1e-9), 0, 1)
                        if np.linalg.norm(cc - (a + t * ab)) < r: keep.append(tube); break
                    else: continue
                    break
            h['segs'] = [s for tube in keep for s in tube]; r = 14.5; h.pop('near')
    for o in src:
        apply_tf(o)
        bm = bmesh.new(); bm.from_mesh(o.data); bm.faces.ensure_lookup_table()
        C = np.array([f.calc_center_median()[:] for f in bm.faces])
        near = np.zeros(len(C), bool)
        band = r == 14.5 and not h.get('near')   # 관 표면만 (축에서 관 반경 근처) → 이웃 관 끝이 같이 떨어져 나와 너덜거리지 않게
        for seg in h['segs']:
            P = np.array([B(p)[:] for p in seg])
            for a, b in zip(P[:-1], P[1:]):
                ab = b - a; L2 = max(ab @ ab, 1e-9); t = np.clip(((C - a) @ ab) / L2, 0, 1)
                dd = np.linalg.norm(C - (a + t[:, None] * ab), axis=1)
                near |= (dd > 9.0) & (dd < 16.0) if band else dd < r   # 굽힘(원환)은 축을 꺾은선으로 잡아 바깥 면이 2 ~ 3 mm 더 멀어짐 → 여유를 둠
        if not near.any(): bm.free(); continue
        b2 = bm.copy(); b2.faces.ensure_lookup_table()
        bmesh.ops.delete(b2, geom=[f for f, k in zip(b2.faces, near) if not k], context='FACES')
        bmesh.ops.delete(bm, geom=[f for f, k in zip(bm.faces, near) if k], context='FACES')
        bm.to_mesh(o.data); bm.free()
        me = bpy.data.meshes.new(f'hl{i}|hl{i}'); b2.to_mesh(me); b2.free()
        n = bpy.data.objects.new(f'hl{i}', me); sc.collection.objects.link(n); got.append(n)
    hl_objs.append(got); meshes += got

# 0-9. 새로 만드는 부품 (add): REF4 에 없는 부품을 기본 도형으로, 또는 REF4 부품을 복제해 다른 자리에 다시 조립.
#      좌표는 사이트 mm. 이름 = name → 정규식 '^name' 으로 focus · ghost · color · anchors 에서 씀
#      box {c, size[앞뒤, 위아래, 좌우], rot[deg, Blender X·Y·Z]} · cyl {a, b, r, r2?, seg?} · tube {pts, r} · sphere {c, r}
#      plate {pts (평면 다각형), t} · airfoil {naca, le, chord, span(좌우 +z 방향 길이), aoa(뒷전이 올라가는 각), invert, z0?}
#      copy {obj, near?, from[p0,p1], to[q0,q1], scale?} (두 점 → 두 점으로 옮김 · 돌림 · 크기) · torus {c, R, r, axis}
def _mk(name, bm):
    me = bpy.data.meshes.new('x|' + name + '|'); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); sc.collection.objects.link(o); meshes.append(o); return o
def _naca(code, n=60):
    m, p, t = int(code[0]) / 100, int(code[1]) / 10, int(code[2:]) / 100
    xs = (1 - np.cos(np.linspace(0, math.pi, n))) / 2
    yt = 5 * t * (0.2969 * np.sqrt(xs) - 0.126 * xs - 0.3516 * xs ** 2 + 0.2843 * xs ** 3 - 0.1036 * xs ** 4)
    yc = np.where(xs < p, m / max(p, 1e-9) ** 2 * (2 * p * xs - xs ** 2), m / max(1 - p, 1e-9) ** 2 * ((1 - 2 * p) + 2 * p * xs - xs ** 2)) if p > 0 else 0 * xs
    up = list(zip(xs, yc + yt)); lo = list(zip(xs, yc - yt))
    return [(float(a), float(b)) for a, b in up[::-1] + lo[1:-1]]   # 뒷전 → 위면 → 앞전 → 아랫면 (닫힌 다각형)
for ad in SP.get('add', []):
    k, nm_ = ad['type'], ad['name']; bm = bmesh.new()
    if k == 'box':
        bmesh.ops.create_cube(bm, size=1); sz = ad['size']; bmesh.ops.scale(bm, vec=(sz[0], sz[2], sz[1]), verts=bm.verts)
        Rxyz = lambda r: Matrix.Rotation(math.radians(r[2]), 3, 'Z') @ Matrix.Rotation(math.radians(r[1]), 3, 'Y') @ Matrix.Rotation(math.radians(r[0]), 3, 'X')   # X → Y → Z 순서
        for key_ in ('rot', 'rot2'):   # rot 다음 rot2 (예: 날개 비틀기 → 팬 축으로 돌리기 → 라디 기울기)
            if ad.get(key_): bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Rxyz(ad[key_]))
        bmesh.ops.translate(bm, vec=B(ad['c']), verts=bm.verts); o = _mk(nm_, bm)
    elif k in ('cyl', 'tube'):
        P_ = [B(p) for p in (ad['pts'] if k == 'tube' else [ad['a'], ad['b']])]
        for a_, b_ in zip(P_[:-1], P_[1:]):
            d_ = b_ - a_; r1 = ad['r']; r2 = ad.get('r2', r1)
            res = bmesh.ops.create_cone(bm, cap_ends=True, segments=ad.get('seg', 32), radius1=r1, radius2=r2, depth=d_.length)
            M_ = Matrix.Translation((a_ + b_) / 2) @ d_.to_track_quat('Z', 'Y').to_matrix().to_4x4()
            bmesh.ops.transform(bm, matrix=M_, verts=res['verts'])
        if k == 'tube':
            for p_ in P_[1:-1]:
                s_ = bmesh.ops.create_uvsphere(bm, u_segments=24, v_segments=12, radius=ad['r']); bmesh.ops.translate(bm, vec=p_, verts=s_['verts'])
        o = _mk(nm_, bm)
    elif k == 'sphere':
        bmesh.ops.create_uvsphere(bm, u_segments=32, v_segments=16, radius=ad['r']); bmesh.ops.translate(bm, vec=B(ad['c']), verts=bm.verts); o = _mk(nm_, bm)
    elif k == 'torus':
        bm.free(); bpy.ops.mesh.primitive_torus_add(major_radius=ad['R'], minor_radius=ad['r'], location=B(ad['c']))
        o = bpy.context.active_object; ax_ = B(ad.get('axis', [1, 0, 0])).normalized(); o.rotation_euler = ax_.to_track_quat('Z', 'Y').to_euler()
        o.name = nm_; o.data.name = 'x|' + nm_ + '|'; meshes.append(o)
    elif k == 'plate':
        V_ = [bm.verts.new(B(p)) for p in ad['pts']]; bm.faces.new(V_); o = _mk(nm_, bm)
        so_ = o.modifiers.new('t', 'SOLIDIFY'); so_.thickness = ad.get('t', 3); so_.offset = 0
    elif k == 'airfoil':
        sec = _naca(ad.get('naca', '4412')); c_ = ad['chord']; a_ = math.radians(ad.get('aoa', 0)); le = B(ad['le'])
        dch = Vector((-math.cos(a_), 0, math.sin(a_))); nrm_ = Vector((math.sin(a_), 0, math.cos(a_))); sg_ = -1 if ad.get('invert', True) else 1
        y0, y1 = le.y, le.y + ad['span']
        ring = lambda y: [bm.verts.new(Vector((le.x, y, le.z)) + c_ * (u * dch + sg_ * v * nrm_)) for u, v in sec]
        r0, r1 = ring(y0), ring(y1); n_ = len(r0)
        for i_ in range(n_): bm.faces.new((r0[i_], r0[(i_ + 1) % n_], r1[(i_ + 1) % n_], r1[i_]))
        bm.faces.new(r0[::-1]); bm.faces.new(r1)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces); o = _mk(nm_, bm)
        for pg in o.data.polygons: pg.use_smooth = True
    elif k == 'copy':
        bm.free(); cand = find(ad['obj'])
        if ad.get('near'): cand = [min(cand, key=lambda o: (ctr(o) - B(ad['near'])).length)]
        p0, p1, q0, q1 = [B(v) for v in (ad['from'][0], ad['from'][1], ad['to'][0], ad['to'][1])]
        Rq = (p1 - p0).rotation_difference(q1 - q0).to_matrix().to_4x4(); s_ = (q1 - q0).length / max((p1 - p0).length, 1e-6) if ad.get('scale') else 1
        M_ = Matrix.Translation(q0) @ Rq @ Matrix.Scale(s_, 4) @ Matrix.Translation(-p0)
        for j_, c0 in enumerate(cand):
            o = c0.copy(); o.data = c0.data.copy(); o.data.name = 'x|' + nm_ + '|'; o.name = nm_ + str(j_); sc.collection.objects.link(o)
            o.matrix_world = M_ @ c0.matrix_world; meshes.append(o)
        continue
    if k in ('cyl', 'tube', 'sphere', 'torus'):   # 둥근 면은 매끈하게, 원통 마개(n각형)는 평평하게
        for pg in o.data.polygons: pg.use_smooth = len(pg.vertices) <= 4
    if ad.get('smooth') is False:
        for pg in o.data.polygons: pg.use_smooth = False
bpy.context.view_layer.update()

# 1-0. 단면 (cut): 부품을 평면으로 잘라 한쪽을 지움 → 잘린 안쪽(뒷면)을 단면 색으로 칠함 (메시가 닫혀 있지 않아도 됨)
#      [{"obj": 정규식, "p": [사이트 점], "n": [지울 쪽 방향], "c": 단면 색}]
cut_objs = {}
for ci, cc in enumerate(SP.get('cut', [])):
    pp, nn = B(cc['p']), B(cc['n']).normalized()
    for o in find(cc['obj']):
        apply_tf(o); bm = bmesh.new(); bm.from_mesh(o.data)
        bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=pp, plane_no=nn, clear_outer=True)
        bm.to_mesh(o.data); bm.free(); cut_objs[o.name] = cc.get('c', '#e9b949')
        o.data.update()
bpy.context.view_layer.update()   # 자른 뒤 bound_box 를 새로 (안 하면 좌우 판정이 틀림)
focus = find(A.focus) if A.focus else []
if A.corner:   # 같은 조립품이 네 바퀴에 다 있을 때 한 곳만. 앞 = 휠베이스 절반보다 앞(x > 800 mm), 왼쪽 = Blender +Y
    focus = [o for o in focus if (ctr(o).x > 800) == (A.corner[0] == 'F') and (ctr(o).y > 0) == (A.corner[1] == 'L')]
for rx_, pt_ in SP.get('pick', []):   # 같은 이름 부품 여럿 중 이 점에 가장 가까운 하나만 초점으로
    cand = find(rx_)
    if cand: focus.append(min(cand, key=lambda o: (ctr(o) - B(pt_)).length))
for g, h in zip(hl_objs, SP.get('hl', [])):
    if h.get('as', 'focus') == 'focus': focus += g

# 1-2. 드라이버 모형 (REF4 에는 없음): 헬멧 뒤 = 헤드레스트 앞, 엉덩이 = 시트 바닥, 손 = 핸들 잡는 곳, 발 = 페달
drv = {}
def capsule(name, a, b, r, sy=1.0):
    a, b = Vector(a), Vector(b); d = b - a; L = d.length
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=False, segments=32, radius1=r, radius2=r, depth=L)
    for p in (Vector((0, 0, -L / 2)), Vector((0, 0, L / 2))):
        s = bmesh.ops.create_uvsphere(bm, u_segments=32, v_segments=16, radius=r); bmesh.ops.translate(bm, verts=s['verts'], vec=p)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = True
    o = bpy.data.objects.new(name, me); sc.collection.objects.link(o)
    q = d.to_track_quat('Z', 'Y'); o.matrix_world = Matrix.Translation((a + b) / 2) @ q.to_matrix().to_4x4() @ Matrix.Diagonal((sy, 1, 1, 1))   # to_track_quat('Z', 'Y'): 지역 Y 가 세계 위쪽에 가깝게 → 지역 X = 좌우. 몸통을 옆으로 넓게
    return o
def ik(a, c, l1, l2, hint):   # 두 마디(허벅지-정강이, 위팔-아래팔): 가운데 관절을 hint 쪽으로 굽힘
    a, c = Vector(a), Vector(c); d = c - a; L = min(d.length, l1 + l2 - 1e-3); u = d.normalized()
    x = (l1 * l1 - l2 * l2 + L * L) / (2 * L); y = math.sqrt(max(l1 * l1 - x * x, 0))
    h = Vector(hint) - (Vector(hint) @ u) * u
    return a + u * x + h.normalized() * y
if SP.get('driver'):
    # 자세 = FSK 2024 차량기술규정 제15조 ① 그림8 '95 % 드라이버 모델'의 배치법을 키에 맞춰 줄여 씀 (근거 있는 자세, 눈대중 아님):
    #  · 엉덩이 원 Ø200 은 시트 바닥에, 어깨 원 Ø200 은 등받이에 닿음, 두 원 중심 거리 490, 머리 원 Ø300 중심 = 어깨 원 중심 + 연직 280,
    #    머리 원 ~ 헤드레스트 25.4 mm 이하
    #  · 줄임 비율 k = 키 ÷ 95 % 남성 키(p95, 기본 1880 mm — 추측값, spec 로 바꿈). 팔다리는 키 × 신체 비율 (Drillis · Contini)
    #  · 시트 가운데 단면(사이트 x, 높이) = driver.seat [등 위, 등 꺾임, 엉덩이, 바닥 앞] (REF4 를 slice 로 잼)
    #  · 등 각: 어깨 원이 시트를 뚫지 않는 한에서 가장 눕히되, 헬멧(머리 원)이 헤드레스트를 파고들면 그만큼 세움
    DV = SP['driver'] if isinstance(SP['driver'], dict) else {}
    Hs = DV.get('stature', 1750); seatP = [Vector((p[0], 0, p[1])) for p in DV.get('seat', [[617, 569], [661, 425], [990, 118], [1338, 173]])]
    hr = bbox(find(r'^Head_Restraint\|'))
    wheels = find(r'^24_Steering_Wheel\|'); wheel = ctr(wheels[0]); pads = sorted(find(r'^Pedal_Pad\|'), key=lambda o: ctr(o).y)
    kk = Hs / DV.get('p95', 1880); rC, Lsh, Hh, Rh = 100 * kk, 490 * kk, 280 * kk, DV.get('helmet_r', 150 * kk)
    def nrm2(a, b, toward):   # 선분 ab 의 (X, Z) 평면 법선 중 toward 쪽
        d = (b - a).normalized(); n = Vector((-d.z, 0, d.x)); return n if n.dot(toward - a) > 0 else -n
    C = seatP[2]; nb = nrm2(seatP[1], C, C + Vector((300, 0, 300))); npn = nrm2(C, seatP[3], C + Vector((0, 0, 300)))
    M2 = Matrix(((nb.x, nb.z), (npn.x, npn.z))); dx, dz = M2.inverted() @ Vector((rC, rC))   # 엉덩이 원: 바닥 · 등받이에 닿음
    hip = C + Vector((dx, 0, dz))
    def seg_dist(p, a, b):
        ab = b - a; t = max(0, min(1, (p - a).dot(ab) / ab.length_squared)); return (p - (a + ab * t)).length
    def clear(a, b):   # 선분 a→b 에서 시트 단면까지 가장 가까운 거리
        return min(min(seg_dist(a.lerp(b, k / 20), s0, s1) for s0, s1 in zip(seatP[:-1], seatP[1:])) for k in range(21))
    def pose(th):
        t = math.radians(th); u = Vector((-math.sin(t), 0, math.cos(t))); S = hip + u * Lsh; return u, S, S + Vector((0, 0, Hh))
    th_seat = next(th for th in range(80, -1, -1) if clear(hip + pose(th)[0] * 1, pose(th)[1]) >= rC - 1)
    gap = lambda th: pose(th)[2].x - Rh - hr[1].x   # 머리 원 뒤 ~ 헤드레스트 앞면
    th = next((t for t in range(th_seat, -1, -1) if gap(t) >= DV.get('hr_gap', 12)), 0)   # 헬멧이 패드에 눌리지 않게 (규정: 25.4 이하, 눌리면 안 됨)
    u, sc_, head = pose(th); hd = (head - sc_).normalized(); flex = 0
    TR, TS = rC, 1.75; TA, TB = hip, sc_; neck = sc_ + u * 20
    parts = []
    hm = bpy.data.meshes.new('helmet'); bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=64, v_segments=32, radius=Rh); bm.to_mesh(hm); bm.free()
    for p in hm.polygons: p.use_smooth = True
    ho = bpy.data.objects.new('drv_helmet', hm); sc.collection.objects.link(ho); ho.location = head; parts.append(ho)
    # 바이저: 헬멧보다 조금 큰 구에서 앞쪽 띠만 남김
    vm = bpy.data.meshes.new('visor'); bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=64, v_segments=32, radius=Rh * 1.012)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not (v.co.x > Rh * 0.35 and -0.12 * Rh < v.co.z < 0.38 * Rh)], context='VERTS')
    bm.to_mesh(vm); bm.free()
    for p in vm.polygons: p.use_smooth = True
    vo = bpy.data.objects.new('drv_visor', vm); sc.collection.objects.link(vo); vo.location = head
    for s in (1, -1):   # 바이저 회전축 캡
        cp = capsule('drv_cap', head + Vector((Rh * 0.1, s * Rh * 0.98, Rh * 0.05)), head + Vector((Rh * 0.1, s * Rh * 1.04, Rh * 0.05)), 20); parts.append(cp)
    parts.append(capsule('drv_neck', neck, head - hd * Rh * 0.6, 46))
    sh = [sc_ + Vector((0, s * 180, 0)) for s in (1, -1)]
    parts.append(capsule('drv_torso', TA, TB, TR, sy=TS))
    # 핸들: wheel_turn 만큼 칼럼 축으로 돌림 (90° = 손이 위 · 아래). 손잡이 = 핸들 중심에서 좌우 grip mm 를 같이 돌린 점
    ang = math.radians(DV.get('wheel_turn', 0)); col = find(r'^24_Steering_Column_Top\|')
    ax = (wheel - ctr(col[0])).normalized() if col else Vector((1, 0, 0))
    Rw = Matrix.Translation(wheel) @ Matrix.Rotation(ang, 4, ax) @ Matrix.Translation(-wheel)
    if ang:
        for o in wheels: o.matrix_world = Rw @ o.matrix_world
    grips = [Rw @ (wheel + Vector((-15, s * DV.get('grip', 110), 0))) for s in (1, -1)]
    for s, g in zip(sh, grips):
        el = ik(s, g, 0.186 * Hs, 0.19 * Hs, (0, (s.y > 0) * 2 - 1, -1.2)); parts += [capsule('drv_arm', s, el, 44), capsule('drv_farm', el, g, 38)]
        parts.append(capsule('drv_hand', g, g + Vector((5, 0, 0)), 40))
    thighs = {}
    for k, s in enumerate((-1, 1)):   # 오른발(−Y) = 가속 페달 쪽 · 왼발 = 브레이크 쪽 (패드 y 순서)
        hj = hip + Vector((0, s * 90, 0)); p = pads[0 if s < 0 else -1] if pads else None
        ank = (ctr(p) if p else hip + Vector((850, s * 90, 0))) + Vector((-110, 0, -50))   # 발목 = 페달 면 뒤 · 아래 (발볼이 페달에)
        kn = ik(hj, ank, 0.245 * Hs, 0.246 * Hs, (0, 0, 1)); parts += [capsule('drv_thigh', hj, kn, 66), capsule('drv_shin', kn, ank, 46)]; thighs[s] = (hj, kn, 66)
        parts.append(capsule('drv_foot', ank, (ctr(p) if p else ank) + Vector((-10, 0, 0)), 38))
    hand_top = max(grips, key=lambda g: g.z) + Vector((0, 0, 40))
    drv = {'helmet': [ho], 'visor': [vo], 'body': parts, 'hip': hip, 'neck': neck, 'sh': sh, 'head': head, 'Rh': Rh, 'torso': (TA, TB, TR, TS), 'hand_top': hand_top, 'thighs': thighs}
    site = lambda v: [round(v.x), round(v.z), round(v.y)]
    # 헤드레스트 높이: 규정은 헬멧 뒤 중앙 = 패드 중앙. 헤드레스트는 드라이버마다 조절하는 부품이라 그림에서는 이 드라이버에 맞춰 올리고 내린 양을 찍음
    hr_dz = head.z - (hr[0].z + hr[1].z) / 2
    if DV.get('hr_to_helmet', True):
        for o in find('Head_Restraint'): o.matrix_world = Matrix.Translation((0, 0, hr_dz)) @ o.matrix_world
        print('DRIVER 헤드레스트를 헬멧 중심 높이로', round(hr_dz), 'mm 옮김 (REF4 위치 대비)')
    print('DRIVER 키', Hs, '등 각', th, '° (시트 한계', th_seat, '°)  엉덩이 원', site(hip), '어깨 원', site(sc_), '머리 원', site(head), '꼭대기', round(head.z + Rh),
          '헤드레스트까지', round(gap(th)), 'mm (규정 25.4 이하)  위 손 꼭대기', site(hand_top), ' 엉덩이~페달', round(min(((ctr(p) - hip).length for p in pads), default=0)), 'mm (95 % 템플릿 915 이상 ×', round(kk, 3), ')')
    meshes += parts + [vo]
# 1-3. 안전벨트 (띠 = 폭 50 mm 판): 어깨띠는 숄더 하니스 바에서 어깨를 넘어 버클로, 랩벨트는 양옆 고정점에서 골반을 감아 버클로,
#      안티서브는 버클에서 다리 사이로 내려감. 고정점은 spec 의 사이트 좌표(프레임 관 위 점)
belts = []
def ribbon(name, pts, out_c, w=50, proj=None):
    P = [Vector(p) for p in pts]; V = []
    if proj:   # 점 사이를 촘촘히 나눠 하나하나 몸 겉면으로 (직선 구간이 가슴 · 허벅지 곡면 속으로 묻히지 않게). 양 끝(고정점 · 버클)은 그대로
        Q = [P[0]]
        for a, b in zip(P[:-1], P[1:]):
            n = max(2, int((b - a).length / 15)); Q += [a.lerp(b, k / n) for k in range(1, n + 1)]
        P = [Q[0]] + [proj(q) for q in Q[1:-1]] + [Q[-1]]
    for i, p in enumerate(P):
        t = (P[min(i + 1, len(P) - 1)] - P[max(i - 1, 0)]).normalized(); n = (p - Vector(out_c)); n = (n - (n @ t) * t).normalized()
        s = t.cross(n).normalized() * w / 2; V += [p - s + n * 2, p + s + n * 2]
    me = bpy.data.meshes.new(name); me.from_pydata([v[:] for v in V], [], [(2 * i, 2 * i + 1, 2 * i + 3, 2 * i + 2) for i in range(len(P) - 1)])
    o = bpy.data.objects.new(name, me); sc.collection.objects.link(o); o['pts'] = [list(p) for p in P]   # 띠 중심선 (라벨 점용)
    m = o.modifiers.new('t', 'SOLIDIFY'); m.thickness = 3; return o
if SP.get('belts') and drv:
    BL = SP['belts']; hip, sh, neck = drv['hip'], drv['sh'], drv['neck']; TA, TB, TR, TS = drv['torso']
    def onbody(p, gap=6):   # 몸통(타원 단면 캡슐) 겉면으로 밀어냄 — 띠가 몸 안으로 묻히지 않게
        p = Vector(p); ax = TB - TA; t = max(0, min(1, (p - TA).dot(ax) / ax.length_squared)); c = TA + ax * t; d = p - c
        lat = Vector((0, 1, 0)); dl = d.dot(lat); df = (d - dl * lat - d.dot(ax.normalized()) * ax.normalized())
        e = math.sqrt((dl / (TR * TS)) ** 2 + (df.length / TR) ** 2) or 1
        return c + (d - d.dot(ax.normalized()) * ax.normalized()) / e * (1 + gap / TR) + d.dot(ax.normalized()) * ax.normalized()
    up = (TB - TA).normalized(); fwd = Vector((up.z, 0, -up.x)) if up.x < 0 else Vector((-up.z, 0, up.x))   # 몸통 앞쪽 (가슴 방향)
    buckle = onbody(TA + (TB - TA) * 0.02 + fwd * 200, 10); tc = (TA + TB) / 2
    for s, shp in zip((1, -1), sh):
        bar = B(BL['shoulder'][0 if s > 0 else 1])
        over = shp + Vector((-20, -s * 55, 95))   # 어깨 위
        chest = [onbody(TA + (TB - TA) * k + fwd * 200 + Vector((0, s * (40 + 70 * k), 0))) for k in (0.75, 0.5, 0.25)]
        oc = lambda q: onbody(q, 9) if (q - TB).dot(TB - TA) < 0 else q   # 어깨 너머 구간은 그대로, 몸통 앞은 겉면에
        belts.append(ribbon('belt_sh', [bar, bar.lerp(over, 0.5) + Vector((0, 0, 15)), over] + chest + [buckle + Vector((0, s * 25, 10))], tc, proj=oc))
    for s in (1, -1):
        an = B(BL['lap'][0 if s > 0 else 1])
        side = onbody(TA + Vector((0, s * 400, 0)) + fwd * 40)
        belts.append(ribbon('belt_lap', [an, an.lerp(side, 0.6), side, onbody(TA + fwd * 200 + Vector((0, s * 120, 0))), buckle + Vector((0, s * 25, 0))], tc,
                            proj=lambda q: onbody(q, 9) if (q - TA).length < TR * TS * 1.2 else q))
    def onthigh(q, s, gap=7):   # 허벅지(캡슐) 겉면으로 밀어냄
        a, b, r = drv['thighs'][s]; ab = b - a; t = max(0, min(1, (q - a).dot(ab) / ab.length_squared)); c = a + ab * t; d = q - c
        return c + d.normalized() * (r + gap) if d.length < r + gap else q
    for sp_ in (BL['sub'] if isinstance(BL['sub'][0], list) else [BL['sub']]):   # 6점식 = 안티서브 두 줄 (다리마다)
        sub = B(sp_); sg = 1 if sub.y > 0 else -1
        # 규정 제23조 ⑤: 버클에서 다리 사이로 내려가 허벅지 밑을 감고, 허벅지 바깥쪽(측면 아래 부재)의 고정점으로
        a, b, r = drv['thighs'][sg]; c = a.lerp(b, 0.28)
        path = [buckle, c + Vector((0, -sg * (r + 12), 0)), c + Vector((0, -sg * r * 0.7, -r - 8)), c + Vector((0, 0, -r - 12)), c + Vector((0, sg * r * 0.7, -r - 8)), c + Vector((0, sg * (r + 14), -10)), sub]
        belts.append(ribbon('belt_sub', path, c, w=44, proj=lambda q, sg=sg: onthigh(q, sg)))
    bk = capsule('belt_buckle', buckle - fwd * 6, buckle + fwd * 6, 34)
    belts.append(bk); meshes += belts

# 1-4. 공기 흐름선 (flow): 앞에서 오는 공기가 표면(obj)을 따라 갈라지는 선. CFD 가 아니라 표면을 뚫지 않고 미끄러지게 그린 그림
#      한 걸음마다: 자유 흐름(-x) → 표면 가까우면 표면을 파고드는 성분을 빼서 표면을 따라 미끄러짐 → 표면에서 clear 만큼 띄움
flows = []
if SP.get('flow'):
    from mathutils.bvhtree import BVHTree
    FL = SP['flow']; obs = find(FL['obj']); Vs, Ps = [], []
    for o in obs:
        M = o.matrix_world; off = len(Vs); Vs += [M @ v.co for v in o.data.vertices]; Ps += [[off + i for i in p.vertices] for p in o.data.polygons]
    bvh = BVHTree.FromPolygons(Vs, Ps); R, cl, st = FL.get('reach', 90), FL.get('clear', 14), FL.get('step', 6)
    for sd in FL['seeds']:   # 사이트 좌표 [x, y(위), z(왼)]
        p = B(sd); y0, z0 = p.y, p.z; v = Vector((-1, 0, 0)); pts = [p.copy()]
        for _ in range(4000):
            if p.x < FL['x_end']: break
            vf = Vector((-1, (y0 - p.y) * FL.get('ret', 0.004), (z0 - p.z) * FL.get('ret', 0.004))).normalized()
            loc, n, _, dist = bvh.find_nearest(p, R)
            if loc is not None:
                if (p - loc).dot(n) < 0: n = -n   # 법선을 점 쪽으로
                w = 1 - dist / R
                if vf.dot(n) < 0: vf = (vf - vf.dot(n) * n * min(1, 1.6 * w)).normalized()
            v = (v * 0.6 + vf * 0.4).normalized(); q = p + v * st
            loc, n, _, dist = bvh.find_nearest(q, cl)
            if loc is not None:   # 너무 가까우면 표면에서 cl 만큼 띄움 (지금 점이 있던 쪽으로)
                n = n if (p - loc).dot(n) >= 0 else -n
                q = loc + n * cl
            pts.append(q); p = q
        cu = bpy.data.curves.new('flow', 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = FL.get('r', 2.6); cu.bevel_resolution = 3
        sp = cu.splines.new('POLY'); P = pts[::3]; sp.points.add(len(P) - 1)
        for i, q in enumerate(P): sp.points[i].co = (*q, 1)
        o = bpy.data.objects.new('flow', cu); sc.collection.objects.link(o); flows.append(o)
# 1-5. 모노코크 (mono): REF4 에는 없음. 단면 몇 개(sections: [x, 바닥 높이, 윗면 높이, 반폭], 사이트 mm)를 매끈하게 이은 통.
#      벽 = 외피(탄소) · 허니콤 코어 · 내피 세 겹을 따로 만들어 앞 끝을 계단처럼 벗김(peel: 외피가 가장 짧고 내피가 가장 긺)
#      → 코어 겉면이 드러난 띠에 벌집 무늬가 보임 (확대 원은 단면이라 기둥으로만 보이므로). 콕핏은 불리언으로 매끈하게 잘라 엶
mono = []
if SP.get('mono'):
    MO = SP['mono']; S_ = np.array(MO['sections'], float)
    xs = np.linspace(S_[0, 0], S_[-1, 0], 110)
    prof = np.stack([np.interp(xs, S_[:, 0], S_[:, k]) for k in (1, 2, 3)], 1)
    for k in range(MO.get('smooth', 10)): prof = np.vstack([prof[:1], (prof[:-2] + prof[1:-1] * 2 + prof[2:]) / 4, prof[-1:]])
    nv = 96; ex = 2 / MO.get('n', 3.2)
    def hex_image(name):   # 벌집 무늬 (육각 셀) 이미지 — 가로로 이어지게 4칸, 세로 2칸
        W_, s_ = 512, 512 / (math.sqrt(3) * 4); H_ = int(round(6 * s_))
        yy, xx = np.mgrid[0:H_, 0:W_].astype(float)
        q = (math.sqrt(3) / 3 * xx - yy / 3) / s_; r = (2 / 3 * yy) / s_; cx, cz = q, r; cy = -cx - cz
        rx, ry, rz = np.round(cx), np.round(cy), np.round(cz); dx, dy, dz = np.abs(rx - cx), np.abs(ry - cy), np.abs(rz - cz)
        m1 = (dx > dy) & (dx > dz); m2 = ~m1 & (dy > dz); rx = np.where(m1, -ry - rz, rx); rz = np.where(~m1 & ~m2, -rx - ry, rz)
        hx = s_ * math.sqrt(3) * (rx + rz / 2); hy = s_ * 1.5 * rz; px_, py_ = xx - hx, yy - hy
        mtr = np.max([np.abs(px_ * math.cos(a) + py_ * math.sin(a)) for a in (0, math.pi / 3, 2 * math.pi / 3)], axis=0)
        wall = mtr > s_ * math.sqrt(3) / 2 * 0.86; shade = 1 - 0.18 * (mtr / (s_ * math.sqrt(3) / 2))
        col = np.zeros((H_, W_, 4)); base = np.array([0.95, 0.80, 0.42]); dark = np.array([0.55, 0.38, 0.12])
        col[..., :3] = np.where(wall[..., None], dark, base * shade[..., None]); col[..., 3] = 1
        im = bpy.data.images.new(name, W_, H_, alpha=False, float_buffer=True); im.pixels.foreach_set(col[::-1].astype(np.float32).reshape(-1)); im.update(); im.pack()   # 렌더러가 읽도록 파일 없이 묶어 둠
        return im
    def shell(name, off, mt, xend, uv=False):
        idx = [i for i, x in enumerate(xs) if x <= xend + 1e-6]; V, F, U = [], [], []
        for i in idx:
            lo, hi, hw = prof[i]; pad = -off; lo, hi, hw = lo - pad, hi + pad, hw + pad
            yc, a_, b_ = (lo + hi) / 2, hw, (hi - lo) / 2
            for j in range(nv + 1):   # 마지막 열 = 첫 열 (UV 이음매)
                t = 2 * math.pi * j / nv; c, s = math.cos(t), math.sin(t)
                V.append(B([xs[i], yc + b_ * math.copysign(abs(s) ** ex, s), a_ * math.copysign(abs(c) ** ex, c)])[:]); U.append((j / nv * 9, xs[i] / 210))   # 벌집 칸이 그림에서 보일 만큼 크게 (실제 칸보다 과장)
        for ii in range(len(idx) - 1):
            for j in range(nv):
                a0 = ii * (nv + 1) + j; F.append((a0, a0 + 1, a0 + nv + 2, a0 + nv + 1))
        me = bpy.data.meshes.new(name); me.from_pydata(V, [], F)
        if uv:
            ul = me.uv_layers.new(name='uv')
            for poly in me.polygons:
                for li in poly.loop_indices: ul.data[li].uv = U[me.loops[li].vertex_index]
        bm = bmesh.new(); bm.from_mesh(me); bm.faces.ensure_lookup_table()
        for f in bm.faces:   # 면 방향을 바깥으로 → SOLIDIFY 가 안쪽으로 두께를 냄
            c = f.calc_center_median(); k = min(range(len(xs)), key=lambda k: abs(xs[k] - c.x)); yc = (prof[k][0] + prof[k][1]) / 2
            if f.normal.dot(Vector((0, c.y, c.z - yc))) < 0: f.normal_flip()
        bm.to_mesh(me); bm.free()
        for pg in me.polygons: pg.use_smooth = True
        o = bpy.data.objects.new(name, me); sc.collection.objects.link(o)
        so = o.modifiers.new('t', 'SOLIDIFY'); so.thickness = mt; so.offset = -1; so.use_rim = True; so.material_offset_rim = 1
        bo = o.modifiers.new('c', 'BOOLEAN'); bo.operation = 'DIFFERENCE'; bo.object = cut; bo.solver = MO.get('solver', 'FLOAT')
        return o
    ck = MO['cockpit']   # [x 시작, x 끝, 이 높이(사이트 y)보다 위를 엶]
    bpy.ops.mesh.primitive_cube_add(size=1); cut = bpy.context.active_object; cut.name = 'mono_cut'
    cut.scale = (ck[1] - ck[0], 3000, 3000); cut.location = ((ck[0] + ck[1]) / 2, 0, ck[2] + 1500); cut.hide_render = True; cut.display_type = 'WIRE'
    T = MO.get('core', 16); xe = S_[-1, 0]; pe = MO.get('peel', 70)
    mono = [shell('mono_outer', 0, 2.4, xe - 2 * pe), shell('mono_core', 2.4, T, xe - pe, uv=True), shell('mono_inner', 2.4 + T, 2.4, xe)]
    MO['hex'] = hex_image('honeycomb')
    meshes += mono; focus += mono
# 1-6. 방화벽 두 층 개념도 (scene: fwlayers) — CAD 없이 기본 도형으로. 고전압 쪽(−X) = 알루미늄판(차체 접지), 드라이버 쪽(+X) = 불연 절연층,
#      배선은 두 층을 뚫고 양쪽으로 길게(관통 느낌), 관통부는 그로밋, 접지선은 판 → 프레임 관 (불과 떨어진 쪽)
glows = []
if SP.get('scene') == 'fwlayers':
    def box(name, c, sz):
        bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1); bmesh.ops.scale(bm, vec=sz, verts=bm.verts); bmesh.ops.translate(bm, vec=c, verts=bm.verts)
        me = bpy.data.meshes.new('x|' + name); bm.to_mesh(me); bm.free(); o = bpy.data.objects.new(name, me); sc.collection.objects.link(o); return o
    def tube(name, a, b, r, seg=48):
        o = capsule(name, a, b, r); o.data.name = 'x|' + name; return o
    al = box('fw_al', (0, 0, 260), (2, 520, 420)); ins = box('fw_ins', (70, 0, 255), (4, 500, 400))   # 두 층을 조금 떼어 둘 다 보이게
    ft = tube('fw_tube', Vector((-45, 330, 28)), Vector((-45, -330, 28)), 12.7)
    cab = tube('fw_cable', Vector((-230, -60, 300)), Vector((260, -60, 300)), 7)
    # 그로밋: 원환
    for gx in (0, 70):
        bpy.ops.mesh.primitive_torus_add(major_radius=13, minor_radius=5, location=(gx, -60, 300), rotation=(0, math.pi / 2, 0)); gr = bpy.context.active_object; gr.name = 'fw_grommet'; gr.data.name = 'x|fw_grommet'; meshes.append(gr); focus.append(gr)
    # 접지선: 판 고전압 면 오른쪽 아래(−Y) → 관 위. 굵은 땋은 줄 느낌으로 원통 몇 마디
    gp = [Vector((-3, -205, 95)), Vector((-20, -215, 70)), Vector((-38, -225, 48)), Vector((-45, -232, 41))]
    gw = [tube('fw_gnd', a, b, 4.5) for a, b in zip(gp[:-1], gp[1:])]
    lug = box('fw_lug', (-3, -205, 98), (4, 22, 16))
    for i, (y, z, h) in enumerate(((210, 70, 230), (150, 60, 170), (260, 65, 150))):   # 불꽃: 고전압 쪽 왼편(+Y)
        bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=32, v_segments=24, radius=1)
        for v in bm.verts:
            t = (v.co.z + 1) / 2; k = (1 - t) ** 0.6 * (1 + 0.15 * math.sin(6 * t + i)); v.co.x *= 34 * k; v.co.y *= 46 * k; v.co.z = v.co.z * h / 2 + h / 2
        me = bpy.data.meshes.new('x|fw_flame'); bm.to_mesh(me); bm.free()
        for pg in me.polygons: pg.use_smooth = True
        fo = bpy.data.objects.new('fw_flame', me); sc.collection.objects.link(fo); fo.location = (-70 - 15 * i, y, z); glows.append(fo)
    fwobj = [al, ins, ft, cab, gr, lug] + gw
    for o in fwobj:
        if o.type == 'MESH':
            for pg in o.data.polygons: pg.use_smooth = o.name not in ('fw_al', 'fw_ins', 'fw_lug')
    meshes += fwobj; focus += fwobj
if SP.get('slice'):   # 조사: 부품의 가운데 단면(좌우 |Y| < 25) 점을 옆에서 본 (x, 높이) 로 찍고 끝
    for o in find(SP['slice']):
        bm = bmesh.new(); bm.from_mesh(o.data); bm.transform(o.matrix_world)
        r = bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=(0, SP.get('slice_y', 0), 0), plane_no=(0, 1, 0))
        P = sorted({(round(v.co.x), round(v.co.z)) for v in r['geom_cut'] if isinstance(v, bmesh.types.BMVert)})
        print('SLICE', pname(o)[:30], P)
    sys.exit(0)
if SP.get('probe'):   # 조사: 맞는 부품의 범위를 사이트 좌표로 찍고 끝
    site = lambda v: [round(v.x), round(v.z), round(v.y)]
    for o in [o for o in meshes if re.search(SP['probe'], pname(o))]:
        lo, hi = bbox([o]); print('PROBE', pname(o)[:60], 'x', round(lo.x), round(hi.x), 'y(위)', round(lo.z), round(hi.z), 'z(왼)', round(lo.y), round(hi.y))
    sys.exit(0)
hide = SP.get('hide', '')
if not focus: sys.exit('초점 부품을 못 찾음: ' + A.focus)
flo, fhi = bbox(focus); fc = (flo + fhi) / 2; fr = (fhi - flo).length / 2
extra = set(drv.get('body', []) + drv.get('helmet', []) + drv.get('visor', []) + belts + mono + flows)
if A.ghost: ghost = [o for o in meshes if o not in focus and o not in extra and re.search(A.ghost, pname(o))]
else: ghost = [o for o in meshes if o not in focus and o not in extra and (ctr(o) - fc).length < fr * A.ghost_r]
if hide: ghost = [o for o in ghost if not re.search(hide, pname(o))]
for o in meshes:
    if o not in focus and o not in ghost and o not in extra: bpy.data.objects.remove(o, do_unlink=True)
meshes = [o for o in focus + ghost] + list(extra)

# 2. 재질: 초점 = 회색 금속 느낌, 주변 = 흰 반투명
def mat(name, rgb, alpha, rough, metal):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*rgb, 1); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    b.inputs['Alpha'].default_value = alpha
    return m
hexc = lambda h: tuple((int(h[i:i + 2], 16) / 255) ** 2.2 for i in (1, 3, 5))
MF = mat('focus', (0.42, 0.44, 0.48), 1.0, 0.38, 0.5)   # 기존 img/comp 그림의 회색에 맞춤
MG = mat('ghost', (0.95, 0.93, 0.88), SP.get('ghost_alpha', 0.22), 0.8, 0.0)
MD = mat('driver', hexc(SP.get('driver_color', '#c9d2de')), 1.0 if (SP.get('driver') or {}) != 'ghost' else 0.35, 0.6, 0.0)
MV = mat('visor', (0.02, 0.03, 0.06), 1.0, 0.15, 0.0); MW = mat('helmet', (0.92, 0.92, 0.93), 1.0, 0.3, 0.0)
MBL = mat('belt', hexc(SP.get('belt_color', '#4f86c6')), 1.0, 0.6, 0.0)
MH = bpy.data.materials.new('hold'); MH.use_nodes = True; nt = MH.node_tree   # 선만 뽑을 때: 면은 투명(holdout)
nt.nodes.remove(nt.nodes['Principled BSDF']); nt.links.new(nt.nodes.new('ShaderNodeHoldout').outputs[0], nt.nodes['Material Output'].inputs['Surface'])
cf = bpy.data.collections.new('focus'); cg = bpy.data.collections.new('ghost'); sc.collection.children.link(cf); sc.collection.children.link(cg)
def put(o, col, m):
    for c in list(o.users_collection): c.objects.unlink(o)
    col.objects.link(o); o.data.materials.clear(); o.data.materials.append(m)
for o in focus: put(o, cf, MF)
for o in ghost: put(o, cg, MG)
for o in drv.get('body', []): put(o, cf, MD)
for o in drv.get('helmet', []): put(o, cf, MW)
for o in drv.get('visor', []): put(o, cf, MV)
for o in belts: put(o, cf, MBL)
MC = mat('carbon', (0.035, 0.04, 0.05), 1.0, 0.35, 0.1); MHC = mat('core', hexc('#e3c16f'), 1.0, 0.7, 0.0)
if mono:   # 외피 · 내피 = 탄소(검정), 코어 = 벌집 무늬(겉면) + 노란 단면(테두리). 불리언 잘린 면은 그 겹의 0번 재질
    MHX = mat('hexcore', (1, 1, 1), 1.0, 0.7, 0.0); nt_ = MHX.node_tree; tx = nt_.nodes.new('ShaderNodeTexImage'); tx.image = SP['mono']['hex']
    uvn = nt_.nodes.new('ShaderNodeUVMap'); uvn.uv_map = 'uv'; nt_.links.new(uvn.outputs[0], tx.inputs[0]); nt_.links.new(tx.outputs['Color'], nt_.nodes['Principled BSDF'].inputs['Base Color'])
    for o in mono:
        put(o, cf, MHX if o.name == 'mono_core' else MC); o.data.materials.append(MHC if o.name == 'mono_core' else MC)
        for m in o.modifiers:
            if m.type == 'BOOLEAN': m.material_mode = 'INDEX'
cfl = bpy.data.collections.new('flow'); sc.collection.children.link(cfl)   # 흐름선: 외곽선 없음
MFL = mat('flow', hexc(SP.get('flow', {}).get('color', '#4dabf7')), 1.0, 0.5, 0.0)
for o in glows:   # 불꽃: 스스로 빛나는 주황 (외곽선 없음)
    gm = mat('flame', (1.0, 0.45, 0.08), 1.0, 0.5, 0.0); gb = gm.node_tree.nodes['Principled BSDF']
    gb.inputs['Emission Color'].default_value = (1.0, 0.28, 0.03, 1); gb.inputs['Emission Strength'].default_value = 0.9
    cfl.objects.link(o) if o.name not in cfl.objects else None; o.data.materials.append(gm)
for o in flows:
    for c in list(o.users_collection): c.objects.unlink(o)
    cfl.objects.link(o); o.data.materials.append(MFL)
# 강조색: spec 의 color = {정규식 또는 hl:번호: '#rrggbb'}
for key, col in SP.get('color', {}).items():
    objs = hl_objs[int(key[3:])] if key.startswith('hl:') else [o for o in focus if re.search(key, pname(o))]
    m = mat('c' + col, hexc(col), 1.0, 0.45, 0.2)
    for o in objs: o.data.materials.clear(); o.data.materials.append(m)
# 단면 색: 잘린 부품의 재질마다 '뒷면이면 단면 색' 을 섞음 (잘린 틈으로 보이는 안쪽 = 단면)
for o in [o for o in focus if o.name in cut_objs]:
    for si, m0 in enumerate(list(o.data.materials)):
        m = m0.copy(); nt_ = m.node_tree; out = nt_.nodes['Material Output']; src = out.inputs['Surface'].links[0].from_socket
        cb = nt_.nodes.new('ShaderNodeBsdfPrincipled'); cb.inputs['Base Color'].default_value = (*hexc(cut_objs[o.name]), 1); cb.inputs['Roughness'].default_value = 0.8
        gm = nt_.nodes.new('ShaderNodeNewGeometry'); mx_ = nt_.nodes.new('ShaderNodeMixShader')
        nt_.links.new(gm.outputs['Backfacing'], mx_.inputs[0]); nt_.links.new(src, mx_.inputs[1]); nt_.links.new(cb.outputs[0], mx_.inputs[2]); nt_.links.new(mx_.outputs[0], out.inputs['Surface'])
        o.data.materials[si] = m

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

# 3-1. 움직이기 (move): 애니메이션 한 장면 — {정규식: [dx, dy, dz] (사이트 mm)} 만큼 옮김. 카메라는 spec 의 fit 으로 고정해 장면마다 같게
for rx_, off_ in SP.get('move', {}).items():
    for o in [o for o in focus + ghost + list(extra) if re.search(rx_, pname(o))]:
        o.matrix_world = Matrix.Translation(B(off_)) @ o.matrix_world
bpy.context.view_layer.update()

# 4. 카메라: 방향 (az, el) 에서 초점 부품(또는 spec 의 fit 점)을 화면에 맞춤
az, el = math.radians(A.az), math.radians(A.el)
d = Vector((math.cos(el) * math.cos(az), math.cos(el) * math.sin(az), math.sin(el)))
fobj = focus
if SP.get('fit_objs'):   # 화면에 맞출 부품 (정규식 | hl:번호 를 | 로 이어서)
    fobj = []
    for k in SP['fit_objs'].split('|'):
        fobj += hl_objs[int(k[3:])] if k.startswith('hl:') else [o for o in focus + ghost if re.search(k, pname(o))]
if SP.get('fit') and len(SP['fit']) == 2:   # 두 점 = 상자의 두 꼭짓점 → 여덟 꼭짓점 (대각선만 쓰면 보는 방향에 따라 폭이 사라짐)
    (x0_, y0_, z0_), (x1_, y1_, z1_) = SP['fit']; SP['fit'] = [[x, y, z] for x in (x0_, x1_) for y in (y0_, y1_) for z in (z0_, z1_)]
fitp = [B(p) for p in SP['fit']] if SP.get('fit') else [o.matrix_world @ Vector(c) for o in fobj for c in o.bound_box]
if SP.get('fit') or SP.get('fit_objs'): fc = sum(fitp, Vector()) / len(fitp); fr = max((p - fc).length for p in fitp)
cam = bpy.data.cameras.new('cam'); co = bpy.data.objects.new('cam', cam); sc.collection.objects.link(co); sc.camera = co
co.location = fc + d * fr * 8; co.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
bpy.context.view_layer.update()
inv = co.matrix_world.inverted(); pts = [inv @ p for p in fitp]
cx = (max(p.x for p in pts) + min(p.x for p in pts)) / 2; cyy = (max(p.y for p in pts) + min(p.y for p in pts)) / 2
co.location = co.matrix_world @ Vector((cx, cyy, 0)) + Vector(SP.get('shift', (0, 0, 0)))   # 맞출 점 묶음의 가운데로
bpy.context.view_layer.update(); inv = co.matrix_world.inverted(); pts = [inv @ p for p in fitp]
sx = max(abs(p.x) for p in pts); sy = max(abs(p.y) for p in pts); asp = A.w / A.h
span = max(2 * sx, 2 * sy * asp) * A.pad
cam.clip_start = 1; cam.clip_end = fr * 60 + 20000
if A.persp:
    cam.lens = SP.get('lens', 85); fov = 2 * math.atan(cam.sensor_width / 2 / cam.lens)
    co.location = co.location - d * fr * 8 + d * (span / 2 / math.tan(fov / 2) + fr)
else:
    cam.type = 'ORTHO'; cam.ortho_scale = span
bpy.context.view_layer.update()

# 4-1. 라벨 점: 보이는 점 중 가운데에 가까운 것의 그림 좌표 [px] (반투명 주변 부품은 가리지 않는 것으로 봄)
if A.anchors and SP.get('anchors'):
    for o in ghost: o.hide_viewport = True
    bpy.context.view_layer.update(); dg = bpy.context.evaluated_depsgraph_get()
    cdir = (co.matrix_world.to_3x3() @ Vector((0, 0, -1))).normalized()
    def px(p):
        u = world_to_camera_view(sc, co, p); return [u.x * A.w, (1 - u.y) * A.h]
    def visible_pt(objs, near=None):
        V = []
        for o in objs:
            vs = o.data.vertices; step = max(1, len(vs) // 1500)
            V += [o.matrix_world @ vs[i].co for i in range(0, len(vs), step)]
            if len(vs) < 400:   # 꼭짓점이 적은 부품(상자 · 판)은 면 위 점도 (꼭짓점만 쓰면 점이 모서리에만 찍힘)
                for pg in o.data.polygons:
                    cc_ = pg.center; V.append(o.matrix_world @ cc_)
                    V += [o.matrix_world @ cc_.lerp(vs[vi].co, f_) for vi in pg.vertices for f_ in (0.35, 0.7)]
        ok = []
        for p in V:
            org = (p - cdir * 50000) if not A.persp else co.location
            dd = (p - org).normalized(); hit, loc, _, _, ob, _ = sc.ray_cast(dg, org, dd)
            if hit and ob is not None and ob.name in {o.name for o in objs} and (loc - p).length < 3: ok.append(p)
        # 안쪽 점만: 화면에서 6 px 둘레 네 방향도 같은 부품에 맞아야 함 (윤곽 위 점은 그림에서 부품 밖에 찍힘)
        if ok and not A.persp:
            names = {o.name for o in objs}; pxw = cam.ortho_scale / A.w
            rgt = (co.matrix_world.to_3x3() @ Vector((1, 0, 0))).normalized(); upv = (co.matrix_world.to_3x3() @ Vector((0, 1, 0))).normalized()
            step_ = max(1, len(ok) // 500); inner = []
            for rad_ in (6, 2):   # 얇은 부품(링크 · 관)은 2 px 로 다시
              if inner: break
              for p in ok[::step_]:
                good = True
                for dx_, dy_ in ((rad_, 0), (-rad_, 0), (0, rad_), (0, -rad_)):
                    q = p + (rgt * dx_ + upv * dy_) * pxw
                    hit, loc, _, _, ob, _ = sc.ray_cast(dg, q - cdir * 50000, cdir)
                    if not (hit and ob is not None and ob.name in names): good = False; break
                if good: inner.append(p)
            if inner: ok = inner
            else: print('WARN 안쪽 점 없음', [o.name[:20] for o in objs][:2])
        if not ok: ok = V
        if near is not None: return px(min(ok, key=lambda q: (q - near).length))   # 그 부품의 보이는 점 중 주어진 점에 가장 가까운 것
        P2 = np.array([px(p) for p in ok]); m = np.median(P2, axis=0)
        return P2[np.argmin(np.linalg.norm(P2 - m, axis=1))].tolist()
    AN = {}
    for k, v in SP['anchors'].items():
        if isinstance(v, list): AN[k] = px(B(v)); continue
        if isinstance(v, dict):   # {"obj": 정규식, "near": [사이트 점]} → 그 부품 위의 보이는 점
            objs = [o for o in focus + list(extra) + ghost if re.search(v['obj'], pname(o))]
            if v.get('corner'): objs = [o for o in objs if (ctr(o).x > 800) == (v['corner'][0] == 'F') and (ctr(o).y > 0) == (v['corner'][1] == 'L')]
            AN[k] = visible_pt(objs, B(v['near']) if 'near' in v else None) if objs else None; continue
        if v.startswith('drvpt:'):   # 드라이버 기준점: top = 헬멧 꼭대기, head = 헬멧 중심, hip = 엉덩이
            p = {'top': drv['head'] + Vector((0, 0, drv['Rh'])), 'head': drv['head'], 'hip': drv['hip'], 'hand_top': drv['hand_top']}[v[6:]]; AN[k] = px(p); continue
        if v.startswith('beltpt:'):   # 띠 중심선 위 비율 점: beltpt:sh:0.5 (첫 번째 띠)
            nm_, fr_ = v[7:].split(':'); bo_ = [o for o in belts if o.name.startswith('belt_' + nm_)][0]; Pp = [Vector(q) for q in bo_['pts']]
            L_ = [0]; [L_.append(L_[-1] + (b_ - a_).length) for a_, b_ in zip(Pp[:-1], Pp[1:])]; t_ = float(fr_) * L_[-1]
            i_ = max(i for i in range(len(L_) - 1) if L_[i] <= t_); w_ = (t_ - L_[i_]) / max(L_[i_ + 1] - L_[i_], 1e-6)
            AN[k] = px(Pp[i_].lerp(Pp[i_ + 1], w_)); continue
        if v.startswith('tan:'):   # 두 부품의 윗면에 함께 접하는 선 (그림 평면에서): k_a · k_b
            S2 = []
            for key in v[4:].split(','):
                objs = hl_objs[int(key[3:])] if key.startswith('hl:') else [o for o in focus + ghost if re.search(key, pname(o))]
                S2.append(np.array([px(o.matrix_world @ vv.co) for o in objs for vv in o.data.vertices]))
            a, b = S2[0][np.argmin(S2[0][:, 1])], S2[1][np.argmin(S2[1][:, 1])]
            for _ in range(8):
                d = (b - a) / np.linalg.norm(b - a); n = np.array([d[1], -d[0]]); n = n if n[1] < 0 else -n
                a, b = S2[0][np.argmax(S2[0] @ n)], S2[1][np.argmax(S2[1] @ n)]
            AN[k + '_a'], AN[k + '_b'] = a.tolist(), b.tolist(); continue
        if v.startswith('hl:'): objs = hl_objs[int(v[3:])]
        elif v.startswith('driver:'): objs = drv.get(v[7:], [])
        elif v.startswith('belt:'): objs = [o for o in belts if o.name.startswith('belt_' + v[5:])]
        else: objs = [o for o in focus + list(extra) if re.search(v, pname(o))] or [o for o in ghost if re.search(v, pname(o))]
        AN[k] = visible_pt(objs) if objs else None
    json.dump(AN, open(A.anchors, 'w', encoding='utf-8'), ensure_ascii=False)
    for o in ghost: o.hide_viewport = False

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
for o in ghost + flows + glows: o.hide_render = True
for o in cf.objects: o.data.materials.clear(); o.data.materials.append(MH)
r.use_freestyle = True; r.film_transparent = True; cy.samples = 1; cy.use_denoising = False
line = shot(OUT + '.line.png')
# 5-3. 합치기 (선을 위에) — Blender 이미지 픽셀은 아래 줄부터, 색은 곧은 알파
la = line[..., 3:4]; ba = base[..., 3:4]
oa = la + ba * (1 - la)
oc = np.where(oa > 0, (line[..., :3] * la + base[..., :3] * ba * (1 - la)) / np.maximum(oa, 1e-6), 0)
out = np.concatenate([oc, oa], axis=2)
img = bpy.data.images.new('out', A.w, A.h, alpha=True); img.pixels[:] = out.reshape(-1); img.filepath_raw = OUT; img.file_format = 'PNG'; img.save()
for p in (OUT + '.base.png', OUT + '.line.png'): os.remove(p)
print('RENDER', OUT, 'focus', len(focus), 'ghost', len(ghost)); print('FOCUS', sorted({pname(o)[:40] for o in focus})[:14])
