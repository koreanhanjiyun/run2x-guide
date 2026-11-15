"""STEP 조립품 → GLB (부품 이름 · 색 · 위치 유지). OpenCASCADE(OCP) 로 읽고 메시로 바꿈.

사용: python tools/cad/step2glb.py <입력.STEP> <출력.glb> [--defl 0.5] [--ang 0.35] [--frame ref4] [--only 정규식] [--skip 정규식]
      [--fine 정규식 --fine-defl 0.02 --fine-ang 0.1]
필요: pip install cadquery-ocp trimesh numpy
- --only · --skip · --fine 은 "부품 이름|상위 조립품들" 에서 찾음 (예: --fine "Front_Hub|Caliper" = 그 조립품 부품 전부 곱게)
- --fine: 렌더할 부품만 곱게 (나사산 · 작은 모깎기가 깨지지 않게). 나머지는 --defl 로 거칠게 (주변 반투명용)
- 법선: CAD 곡면에서 바로 계산해 넣음 (삼각형 법선이면 곡면이 자글자글). 같은 위치 · 같은 법선 점은 하나로 붙임
  → 평면이 CAD 면 경계로 갈라져 보이지 않고, 모서리(법선이 꺾이는 곳)만 갈라져 선으로 그려짐
- 출력 좌표 단위는 mm. 메시 이름 = "<순번>|<부품 이름>|<상위 조립품 이름들, 가까운 것부터 / 로>"
  (tools/build_ref4s.py 가 부품 이름으로 묶고, 안 맞으면 상위 조립품 이름으로 — 예: 'Caliper Assembly' 는 하위 조립품)
- --frame ref4: REF4 조립품(SolidWorks 원점)을 사이트 3D 좌표로 (x 앞 · y 위 · z 왼쪽, 뒤 차축 x = 0, 지면 y = 0, mm).
  바퀴 4개(이름 'OZ racing')의 위치로 축 방향 · 뒤 차축 · 지면을 자동으로 찾음
- --defl: 메시 선형 허용 오차 [mm], --ang: 각도 허용 오차 [rad]. 작을수록 곱고 무거움
- 원본 CAD · 변환본은 저장소에 넣지 않음 (img/3d/ 에는 build_ref4s.py 로 단순화한 결과만)
"""
import argparse, re, sys, time
import numpy as np
import trimesh
from OCP.STEPCAFControl import STEPCAFControl_Reader
from OCP.TDocStd import TDocStd_Document
from OCP.TCollection import TCollection_ExtendedString
from OCP.XCAFDoc import XCAFDoc_DocumentTool, XCAFDoc_ColorType
from OCP.TDF import TDF_Label
import importlib
TDF_LabelSequence = importlib.import_module('OCP.OCP.collections').Sequence_TDF_Label   # cadquery-ocp 7.8: 컬렉션은 OCP.OCP.collections 에
from OCP.TDataStd import TDataStd_Name
from OCP.Quantity import Quantity_Color
from OCP.BRepMesh import BRepMesh_IncrementalMesh
from OCP.TopExp import TopExp_Explorer
from OCP.TopAbs import TopAbs_FACE, TopAbs_REVERSED
from OCP.TopoDS import TopoDS
from OCP.BRep import BRep_Tool
from OCP.BRepTools import BRepTools
from OCP.BRepLib import BRepLib_ToolTriangulatedShape
from OCP.TopLoc import TopLoc_Location
from OCP.IFSelect import IFSelect_RetDone

ap = argparse.ArgumentParser()
ap.add_argument('src'); ap.add_argument('out')
ap.add_argument('--defl', type=float, default=0.5); ap.add_argument('--ang', type=float, default=0.35)
ap.add_argument('--frame', default='', choices=['', 'ref4'])
ap.add_argument('--only', default=''); ap.add_argument('--skip', default='')
ap.add_argument('--fine', default=''); ap.add_argument('--fine-defl', type=float, default=0.02); ap.add_argument('--fine-ang', type=float, default=0.1)
A = ap.parse_args()
t0 = time.time(); say = lambda *a: print(f'[{time.time()-t0:7.1f}s]', *a, flush=True)

# 1. 읽기 (이름 · 색 · 조립 구조)
doc = TDocStd_Document(TCollection_ExtendedString('XmlOcaf'))
rd = STEPCAFControl_Reader(); rd.SetNameMode(True); rd.SetColorMode(True); rd.SetLayerMode(False)
if rd.ReadFile(A.src) != IFSelect_RetDone: sys.exit('STEP 을 읽지 못함: ' + A.src)
say('읽음, 변환 중'); rd.Transfer(doc); say('변환 끝')
ST = XCAFDoc_DocumentTool.ShapeTool_s(doc.Main()); CT = XCAFDoc_DocumentTool.ColorTool_s(doc.Main())

def name_of(lab):
    a = TDataStd_Name()
    return a.Get().ToExtString() if lab.FindAttribute(TDataStd_Name.GetID_s(), a) else ''
def color_of(lab, shape):
    c = Quantity_Color()
    for t in (XCAFDoc_ColorType.XCAFDoc_ColorSurf, XCAFDoc_ColorType.XCAFDoc_ColorGen):
        if CT.GetColor_s(lab, t, c) or CT.GetColor(shape, t, c): return [c.Red(), c.Green(), c.Blue()]
    return None
def mat_of(loc):
    tr = loc.Transformation(); m = np.eye(4)
    for i in range(3):
        for j in range(4): m[i, j] = tr.Value(i + 1, j + 1)
    return m

# 2. 조립 트리를 따라 부품 인스턴스 모으기 (부품 정의 라벨 · 누적 위치 · 이름)
inst = []   # (부품 정의 라벨, 누적 위치, 색, 부품 이름, 상위 조립품 이름들 — 가까운 것부터)
def walk(lab, M, pcol, path):
    if ST.IsReference_s(lab):
        ref = TDF_Label(); ST.GetReferredShape_s(lab, ref)
        M2 = M @ mat_of(ST.GetLocation_s(lab)); col = color_of(lab, ST.GetShape_s(lab)) or pcol
        return walk_def(ref, M2, col, name_of(lab), path)
    return walk_def(lab, M, pcol, name_of(lab), path)
def walk_def(lab, M, pcol, iname, path):
    nm = name_of(lab) or iname
    if ST.IsAssembly_s(lab):
        seq = TDF_LabelSequence(); ST.GetComponents_s(lab, seq, False)
        for i in range(1, seq.Length() + 1): walk(seq.Value(i), M, pcol, [nm] + path)
    else:
        inst.append((lab, M, color_of(lab, ST.GetShape_s(lab)) or pcol, nm, path))
top = TDF_LabelSequence(); ST.GetFreeShapes(top)
for i in range(1, top.Length() + 1): walk(top.Value(i), np.eye(4), None, [])
say('부품 인스턴스', len(inst))
full = lambda x: x[3] + '|' + '/'.join(x[4])   # "부품|상위1/상위2…" 에서 찾음
if A.only: inst = [x for x in inst if re.search(A.only, full(x))]
if A.skip: inst = [x for x in inst if not re.search(A.skip, full(x))]
say('고른 인스턴스', len(inst), ' 곱게', sum(1 for x in inst if A.fine and re.search(A.fine, full(x))))

# 3. 부품 정의마다 한 번만 메시 (같은 볼트 수백 개도 한 번)
cache = {}
def weld(P, N, F):
    """같은 위치 · 같은 법선(약 1°)인 점을 하나로. CAD 면 경계 중 매끈하게 이어지는 곳(평면 분할선 · 모깎기 접선)은 붙고,
    모서리(법선이 꺾임)는 갈라진 채 남음 — 렌더 선이 진짜 모서리에만 생김"""
    key = np.hstack([np.round(P / 1e-4), np.round(N * 60)]).astype(np.int64)
    _, first, inv = np.unique(key, axis=0, return_index=True, return_inverse=True)
    inv = inv.reshape(-1); F2 = inv[F]
    F2 = F2[(F2[:, 0] != F2[:, 1]) & (F2[:, 1] != F2[:, 2]) & (F2[:, 0] != F2[:, 2])]   # 붙이다 뭉개진 삼각형 제거
    return P[first], N[first], F2
def mesh_of(lab, fine):
    k = (lab.Tag(), fine)
    if k in cache: return cache[k]
    shp = ST.GetShape_s(lab)
    if fine: BRepTools.Clean_s(shp)   # 거친 메시가 이미 붙어 있으면 지우고 다시
    BRepMesh_IncrementalMesh(shp, A.fine_defl if fine else A.defl, False, A.fine_ang if fine else A.ang, True)
    V, N, F, n0 = [], [], [], 0
    ex = TopExp_Explorer(shp, TopAbs_FACE)
    while ex.More():
        fc = TopoDS.Face(ex.Current()); loc = TopLoc_Location()
        tri = BRep_Tool.Triangulation_s(fc, loc)
        if tri is not None and tri.NbTriangles() > 0:
            tr = loc.Transformation(); nn = tri.NbNodes(); rev = fc.Orientation() == TopAbs_REVERSED
            if not tri.HasNormals(): BRepLib_ToolTriangulatedShape.ComputeNormals_s(fc, tri)   # 곡면에서 바로
            pts = np.empty((nn, 3)); nrm = np.empty((nn, 3))
            for i in range(1, nn + 1):
                p = tri.Node(i).Transformed(tr); pts[i - 1] = (p.X(), p.Y(), p.Z())
                d = tri.Normal(i).Transformed(tr); nrm[i - 1] = (d.X(), d.Y(), d.Z())
            fs = np.array([tri.Triangle(i).Get() for i in range(1, tri.NbTriangles() + 1)], dtype=np.int64) - 1
            if rev: fs = fs[:, [0, 2, 1]]
            # 법선 방향은 삼각형(바깥 방향)에 맞춤 — 면 방향 · 곡면 매개변수 방향이 섞여 있어 면 단위로 다수결
            tn = np.cross(pts[fs[:, 1]] - pts[fs[:, 0]], pts[fs[:, 2]] - pts[fs[:, 0]])
            if np.sum(np.einsum('ij,ij->i', tn, nrm[fs[:, 0]])) < 0: nrm = -nrm
            V.append(pts); N.append(nrm); F.append(fs + n0); n0 += nn
        ex.Next()
    cache[k] = weld(np.vstack(V), np.vstack(N), np.vstack(F)) if V else None
    return cache[k]

parts = []
for n, x in enumerate(inst):
    lab, M, col, nm, path = x
    g = mesh_of(lab, bool(A.fine and re.search(A.fine, full(x))))
    if g is None: continue
    R3 = M[:3, :3]; v = g[0] @ R3.T + M[:3, 3]; nv = g[1] @ R3.T
    f = g[2][:, [0, 2, 1]] if np.linalg.det(R3) < 0 else g[2]   # 거울 배치(좌우 대칭 부품)면 감는 순서 뒤집음 — 안 하면 안팎이 바뀌어 투명하게 보임
    parts.append((nm, v, f, col, path, nv))
    if n % 500 == 0: say(f'메시 {n}/{len(inst)}  (부품 정의 {len(cache)})')
say('메시 끝, 삼각형', sum(len(p[2]) for p in parts))

# 4. 좌표계 (--frame ref4): 바퀴 4개 중심으로 축 방향 · 원점
R = np.eye(4)
if A.frame == 'ref4':
    W = [p for p in parts if re.search(r'OZ racing', p[0])]
    if len(W) < 4: sys.exit(f'바퀴(OZ racing)를 {len(W)}개만 찾음 — 좌표계를 정할 수 없음')
    allw = np.vstack([p[1] for p in W]); ext = allw.max(0) - allw.min(0)
    # 바퀴 무리: 가장 긴 축 = 앞뒤(휠베이스+타이어), 두 번째 = 좌우(트레드+폭), 가장 짧은 축 = 위아래(타이어 지름)
    ax = np.argsort(ext)[::-1]; ia, il, iu = ax[0], ax[1], ax[2]
    ctrs = np.array([(p[1].min(0) + p[1].max(0)) / 2 for p in W])
    # 바퀴 하나는 여러 부품(림 · 타이어 …)일 수 있어 위치로 4 무리로 나눔
    sgn_a = ctrs[:, ia] > ctrs[:, ia].mean(); sgn_l = ctrs[:, il] > ctrs[:, il].mean()
    # 앞 = 노즈(프론트 윙)가 있는 쪽
    FW = [p for p in parts if re.search(r'Front_Wing', p[0])]
    fwa = np.vstack([p[1] for p in FW])[:, ia].mean() if FW else ctrs[:, ia].max()
    hi = ctrs[sgn_a, ia].mean(); lo = ctrs[~sgn_a, ia].mean()
    front_is_hi = abs(fwa - hi) < abs(fwa - lo)
    rear_x = lo if front_is_hi else hi
    sa = 1.0 if front_is_hi else -1.0
    # 위 = 바퀴 중심에서 차체(프레임) 쪽 (프레임 무게중심이 바퀴 중심보다 위)
    FR = [p for p in parts if re.search(r'2024_frame', p[0])]
    up_c = np.vstack([p[1] for p in FR])[:, iu].mean() if FR else ctrs[:, iu].mean() + 1
    su = 1.0 if up_c > ctrs[:, iu].mean() else -1.0
    ground = allw[:, iu].min() if su > 0 else allw[:, iu].max()
    # z = 왼쪽. 사이트 좌표(x 앞 · y 위 · z 왼쪽)는 왼손 좌표계: 앞 × 위 = 오른쪽 (ISO 8855 앞 × 왼쪽 = 위 에서) → z = −(앞 × 위)
    # 거울 변환이라 아래에서 면 방향(감는 순서)도 뒤집음
    ex_, ey_ = np.zeros(3), np.zeros(3); ex_[ia] = sa; ey_[iu] = su; ez_ = -np.cross(ex_, ey_)
    Rm = np.vstack([ex_, ey_, ez_])              # 원본 → 새 축
    org = np.zeros(3); org[ia] = rear_x; org[iu] = ground; org[il] = ctrs[:, il].mean()
    R[:3, :3] = Rm; R[:3, 3] = -Rm @ org
    say(f'좌표계: 앞뒤 축 {"XYZ"[ia]}({"+" if sa>0 else "-"}), 위 {"XYZ"[iu]}({"+" if su>0 else "-"}), 뒤 차축 {rear_x:.2f}, 지면 {ground:.2f}, 가운데 {org[il]:.2f}')

# 5. 내보내기 (mm, 메시 이름 = 순번|부품 이름)
sc = trimesh.Scene()
for i, (nm, v, f, col, path, nv) in enumerate(parts):
    v2 = v @ R[:3, :3].T + R[:3, 3]; n2 = nv @ R[:3, :3].T
    if np.linalg.det(R[:3, :3]) < 0: f = f[:, [0, 2, 1]]   # 거울 변환이면 바깥쪽 면이 바깥을 보게
    m = trimesh.Trimesh(v2, f, vertex_normals=n2, process=False)
    rgb = [int(round(255 * c)) for c in (col or [0.62, 0.65, 0.70])]
    m.visual = trimesh.visual.TextureVisuals(material=trimesh.visual.material.PBRMaterial(baseColorFactor=rgb + [255], metallicFactor=.05, roughnessFactor=.7))
    key = f'{i}|{nm}|' + '/'.join(p.replace('|', ' ').replace('/', ' ') for p in path)   # 순번|부품|상위 조립품(가까운 것부터, / 로)
    sc.add_geometry(m, node_name=key, geom_name=key)
sc.export(A.out, include_normals=True)
b = sc.bounds
say(f'저장 {A.out}  부품 {len(parts)}  범위 x[{b[0][0]:.0f}, {b[1][0]:.0f}] y[{b[0][1]:.0f}, {b[1][1]:.0f}] z[{b[0][2]:.0f}, {b[1][2]:.0f}] mm')
