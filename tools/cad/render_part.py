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
    o.data = o.data.copy(); o.data.transform(o.matrix_world); o.matrix_world = Matrix.Identity(4)

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
                near |= (dd > 10.5) & (dd < 13.6) if band else dd < r
        if not near.any(): bm.free(); continue
        b2 = bm.copy(); b2.faces.ensure_lookup_table()
        bmesh.ops.delete(b2, geom=[f for f, k in zip(b2.faces, near) if not k], context='FACES')
        bmesh.ops.delete(bm, geom=[f for f, k in zip(bm.faces, near) if k], context='FACES')
        bm.to_mesh(o.data); bm.free()
        me = bpy.data.meshes.new(f'hl{i}|hl{i}'); b2.to_mesh(me); b2.free()
        n = bpy.data.objects.new(f'hl{i}', me); sc.collection.objects.link(n); got.append(n)
    hl_objs.append(got); meshes += got

focus = find(A.focus) if A.focus else []
if A.corner:   # 같은 조립품이 네 바퀴에 다 있을 때 한 곳만. 앞 = 휠베이스 절반보다 앞(x > 800 mm), 왼쪽 = Blender +Y
    focus = [o for o in focus if (ctr(o).x > 800) == (A.corner[0] == 'F') and (ctr(o).y > 0) == (A.corner[1] == 'L')]
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
    q = d.to_track_quat('Z', 'Y'); o.matrix_world = Matrix.Translation((a + b) / 2) @ q.to_matrix().to_4x4() @ Matrix.Diagonal((1, sy, 1, 1))   # 지역 Y ≈ 좌우 → 몸통을 옆으로 넓게
    return o
def ik(a, c, l1, l2, hint):   # 두 마디(허벅지-정강이, 위팔-아래팔): 가운데 관절을 hint 쪽으로 굽힘
    a, c = Vector(a), Vector(c); d = c - a; L = min(d.length, l1 + l2 - 1e-3); u = d.normalized()
    x = (l1 * l1 - l2 * l2 + L * L) / (2 * L); y = math.sqrt(max(l1 * l1 - x * x, 0))
    h = Vector(hint) - (Vector(hint) @ u) * u
    return a + u * x + h.normalized() * y
if SP.get('driver'):
    DV = SP['driver'] if isinstance(SP['driver'], dict) else {}
    hr = bbox(find(r'^Head_Restraint\|')); seat = bbox(find(r'^24_Seat\|'))
    wheel = ctr(find(r'^24_Steering_Wheel\|')[0]); pads = sorted(find(r'^Pedal_Pad\|'), key=lambda o: ctr(o).y)
    Rh = DV.get('helmet_r', 140)
    head = Vector((hr[1].x + Rh + DV.get('head_gap', 25), 0, (hr[0].z + hr[1].z) / 2))
    neck = head + Vector((-25, 0, -Rh - 55))
    hipz = seat[0].z + DV.get('hip_h', 110); torso = DV.get('torso', 520)
    hip = Vector((neck.x + math.sqrt(max(torso ** 2 - (neck.z - hipz) ** 2, 0)), 0, hipz))
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
    parts.append(capsule('drv_neck', neck, head + Vector((0, 0, -Rh * 0.6)), 48))
    sh = [neck + Vector((10, s * 175, -35)) for s in (1, -1)]
    TA, TB, TR, TS = hip + Vector((0, 0, 40)), neck + Vector((5, 0, -90)), 115, 1.5
    parts.append(capsule('drv_torso', TA, TB, TR, sy=TS))
    grips = [wheel + Vector((-15, s * DV.get('grip', 125), 0)) for s in (1, -1)]
    for s, g in zip(sh, grips):
        el = ik(s, g, 300, 290, (0, (s.y > 0) * 2 - 1, -1.2)); parts += [capsule('drv_arm', s, el, 46), capsule('drv_farm', el, g, 40)]
        parts.append(capsule('drv_hand', g, g + Vector((5, 0, 0)), 42))
    for k, s in enumerate((-1, 1)):   # 오른발(−Y) = 가속 페달 쪽 · 왼발 = 브레이크 쪽 (패드 y 순서)
        hj = hip + Vector((0, s * 95, 0)); p = pads[0 if s < 0 else -1] if pads else hip + Vector((900, s * 95, 0))
        ft = (ctr(p) if pads else p) + Vector((-60, 0, 10))
        kn = ik(hj, ft, 450, 460, (0, 0, 1)); parts += [capsule('drv_thigh', hj, kn, 68), capsule('drv_shin', kn, ft, 48)]
        parts.append(capsule('drv_foot', ft, ft + Vector((90, 0, 40)), 40))
    drv = {'helmet': [ho], 'visor': [vo], 'body': parts, 'hip': hip, 'neck': neck, 'sh': sh, 'head': head, 'Rh': Rh, 'torso': (TA, TB, TR, TS)}
    site = lambda v: [round(v.x), round(v.z), round(v.y)]
    print('DRIVER head', site(head), 'hip', site(hip), 'neck', site(neck), 'wheel', site(wheel), 'seat', site(seat[0]), site(seat[1]), 'hr', site(hr[0]), site(hr[1]))
    meshes += parts + [vo]
# 1-3. 안전벨트 (띠 = 폭 50 mm 판): 어깨띠는 숄더 하니스 바에서 어깨를 넘어 버클로, 랩벨트는 양옆 고정점에서 골반을 감아 버클로,
#      안티서브는 버클에서 다리 사이로 내려감. 고정점은 spec 의 사이트 좌표(프레임 관 위 점)
belts = []
def ribbon(name, pts, out_c, w=50):
    P = [Vector(p) for p in pts]; V = []
    for i, p in enumerate(P):
        t = (P[min(i + 1, len(P) - 1)] - P[max(i - 1, 0)]).normalized(); n = (p - Vector(out_c)); n = (n - (n @ t) * t).normalized()
        s = t.cross(n).normalized() * w / 2; V += [p - s + n * 2, p + s + n * 2]
    me = bpy.data.meshes.new(name); me.from_pydata([v[:] for v in V], [], [(2 * i, 2 * i + 1, 2 * i + 3, 2 * i + 2) for i in range(len(P) - 1)])
    o = bpy.data.objects.new(name, me); sc.collection.objects.link(o)
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
        belts.append(ribbon('belt_sh', [bar, bar.lerp(over, 0.5) + Vector((0, 0, 15)), over] + chest + [buckle + Vector((0, s * 25, 10))], tc))
    for s in (1, -1):
        an = B(BL['lap'][0 if s > 0 else 1])
        side = onbody(TA + Vector((0, s * 400, 0)) + fwd * 40)
        belts.append(ribbon('belt_lap', [an, an.lerp(side, 0.6), side, onbody(TA + fwd * 200 + Vector((0, s * 120, 0))), buckle + Vector((0, s * 25, 0))], tc))
    for sp_ in (BL['sub'] if isinstance(BL['sub'][0], list) else [BL['sub']]):   # 6점식 = 안티서브 두 줄 (다리마다)
        sub = B(sp_)
        belts.append(ribbon('belt_sub', [buckle, buckle + (sub - buckle) * 0.3 + fwd * 30, sub], tc))
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
# 1-5. 모노코크 (mono): REF4 에는 없음. 프레임 관 범위(pool)에서 단면 크기를 뽑아 둥근 사각 단면을 이어 만든 통.
#      벽 = 외피(탄소) + 허니콤 코어 + 내피 세 겹. 콕핏은 위를 터서 열고, 앞 끝은 잘라 세 겹이 보이게
mono = []
if SP.get('mono'):
    MO = SP['mono']; pool = np.array([p for s in MO['pool'] for p in s], float)   # 사이트 좌표 점들
    xs = np.linspace(MO['x0'], MO['x1'], 60); prof = []
    for x in xs:
        m = np.abs(pool[:, 0] - x) < 60; q = pool[m] if m.sum() > 2 else pool[np.argsort(np.abs(pool[:, 0] - x))[:6]]
        prof.append([q[:, 1].min(), q[:, 1].max(), np.abs(q[:, 2]).max()])
    prof = np.array(prof)
    for k in range(MO.get('smooth', 12)): prof = np.vstack([prof[:1], (prof[:-2] + prof[1:-1] * 2 + prof[2:]) / 4, prof[-1:]])   # 매끈하게 (앞 상자 → 콕핏 폭이 서서히 바뀌게)
    def shell(name, off, mt):
        nv = 72; V, F = [], []
        for i, x in enumerate(xs):
            lo, hi, hw = prof[i]; lo -= MO.get('pad', 22) - off; hi += MO.get('pad', 22) - off; hw += MO.get('pad', 22) - off
            yc, a, b = (lo + hi) / 2, hw, (hi - lo) / 2
            for j in range(nv):
                t = 2 * math.pi * j / nv; c, s = math.cos(t), math.sin(t)
                ex = 2 / MO.get('n', 3.2)
                V.append(B([x, yc + b * math.copysign(abs(s) ** ex, s), a * math.copysign(abs(c) ** ex, c)])[:])
        for i in range(len(xs) - 1):
            for j in range(nv):
                a0, a1 = i * nv + j, i * nv + (j + 1) % nv; F.append((a0, a1, a1 + nv, a0 + nv))
        me = bpy.data.meshes.new(name); me.from_pydata(V, [], F)
        bm = bmesh.new(); bm.from_mesh(me); bm.faces.ensure_lookup_table()
        for f in bm.faces:   # 면 방향을 바깥으로 (단면 중심에서 멀어지는 쪽) → SOLIDIFY 가 안쪽으로 두께를 냄
            c = f.calc_center_median(); i = min(range(len(xs)), key=lambda k: abs(xs[k] - c.x)); yc = (prof[i][0] + prof[i][1]) / 2
            if f.normal.dot(Vector((0, c.y, c.z - yc))) < 0: f.normal_flip()
        bm.to_mesh(me); bm.free()
        for p in me.polygons: p.use_smooth = True
        o = bpy.data.objects.new(name, me); sc.collection.objects.link(o)
        # 벽 하나 (외피 + 코어 + 내피 두께). 잘린 테두리(rim)는 코어 색 → 단면에서 샌드위치가 보임, 겹 구조는 확대 원 그림으로
        so = o.modifiers.new('t', 'SOLIDIFY'); so.thickness = mt; so.offset = -1; so.use_rim = True; so.material_offset_rim = 1
        # 콕핏: 위를 상자로 잘라 엶 (면을 지우면 계단처럼 깨져서 불리언으로 매끈하게). 잘린 면도 코어 색
        ck = MO['cockpit']   # [x 시작, x 끝, 이 높이(사이트 y)보다 위를 엶]
        bpy.ops.mesh.primitive_cube_add(size=1); cut = bpy.context.active_object; cut.name = 'mono_cut'
        cut.scale = (ck[1] - ck[0], 3000, 3000); cut.location = ((ck[0] + ck[1]) / 2, 0, ck[2] + 1500); cut.hide_render = True; cut.display_type = 'WIRE'
        bo = o.modifiers.new('c', 'BOOLEAN'); bo.operation = 'DIFFERENCE'; bo.object = cut; bo.solver = MO.get('solver', 'FLOAT')
        return o, cut
    T = MO.get('core', 16)
    o, cut = shell('mono', 0, T + 4.4); mono = [o]
    cut.data.materials.append(bpy.data.materials.new('cutm'))   # 불리언 잘린 면 재질 자리 (아래에서 코어 색으로 바꿈)
    meshes += mono; focus += mono
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
for o in mono:
    put(o, cf, MC); o.data.materials.append(MHC)   # 0 = 외피 · 내피(탄소), 1 = 잘린 테두리(코어)
    for m in o.modifiers:
        if m.type == 'BOOLEAN': m.object.data.materials.clear(); m.object.data.materials.append(MHC); m.material_mode = 'TRANSFER'
cfl = bpy.data.collections.new('flow'); sc.collection.children.link(cfl)   # 흐름선: 외곽선 없음
MFL = mat('flow', hexc(SP.get('flow', {}).get('color', '#4dabf7')), 1.0, 0.5, 0.0)
for o in flows:
    for c in list(o.users_collection): c.objects.unlink(o)
    cfl.objects.link(o); o.data.materials.append(MFL)
# 강조색: spec 의 color = {정규식 또는 hl:번호: '#rrggbb'}
for key, col in SP.get('color', {}).items():
    objs = hl_objs[int(key[3:])] if key.startswith('hl:') else [o for o in focus if re.search(key, pname(o))]
    m = mat('c' + col, hexc(col), 1.0, 0.45, 0.2)
    for o in objs: o.data.materials.clear(); o.data.materials.append(m)

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

# 4. 카메라: 방향 (az, el) 에서 초점 부품(또는 spec 의 fit 점)을 화면에 맞춤
az, el = math.radians(A.az), math.radians(A.el)
d = Vector((math.cos(el) * math.cos(az), math.cos(el) * math.sin(az), math.sin(el)))
fobj = focus
if SP.get('fit_objs'):   # 화면에 맞출 부품 (정규식 | hl:번호 를 | 로 이어서)
    fobj = []
    for k in SP['fit_objs'].split('|'):
        fobj += hl_objs[int(k[3:])] if k.startswith('hl:') else [o for o in focus + ghost if re.search(k, pname(o))]
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
    def visible_pt(objs):
        V = []
        for o in objs:
            vs = o.data.vertices; step = max(1, len(vs) // 1500)
            V += [o.matrix_world @ vs[i].co for i in range(0, len(vs), step)]
        ok = []
        for p in V:
            org = (p - cdir * 50000) if not A.persp else co.location
            dd = (p - org).normalized(); hit, loc, _, _, ob, _ = sc.ray_cast(dg, org, dd)
            if hit and ob is not None and ob.name in {o.name for o in objs} and (loc - p).length < 3: ok.append(p)
        if not ok: ok = V
        P2 = np.array([px(p) for p in ok]); m = np.median(P2, axis=0)
        return P2[np.argmin(np.linalg.norm(P2 - m, axis=1))].tolist()
    AN = {}
    for k, v in SP['anchors'].items():
        if isinstance(v, list): AN[k] = px(B(v)); continue
        if v.startswith('drvpt:'):   # 드라이버 기준점: top = 헬멧 꼭대기, head = 헬멧 중심, hip = 엉덩이
            p = {'top': drv['head'] + Vector((0, 0, drv['Rh'])), 'head': drv['head'], 'hip': drv['hip']}[v[6:]]; AN[k] = px(p); continue
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
for o in ghost + flows: o.hide_render = True
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
print('RENDER', OUT, 'focus', len(focus), 'ghost', len(ghost))
