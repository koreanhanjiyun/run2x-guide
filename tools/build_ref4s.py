# 사용: python3 tools/build_ref4s.py <REF4 조립품 GLB(ref4car.glb, STEP 변환본)> img/3d/ref4s.glb
# 필요: trimesh, numpy, fast_simplification. 원본 CAD·변환본은 저장소에 넣지 않음
# REF4 조립품(ref4car.glb, mm, X 앞·Y 위·Z 왼쪽, 뒤 차축 x=0) → 작업창 3D용 단순화 GLB
# 묶음(cluster)마다 메시 하나. 이름 = 묶음 키. 늘림 방식은 JS(workbench)에서 이름으로 정함
import re, json, sys, numpy as np, trimesh, fast_simplification
SRC = sys.argv[1]; OUT = sys.argv[2]
sc = trimesh.load(SRC)
LREF = 1599.65
C = [  # (정규식, 묶음, 색, 목표 삼각형 비율)
 (r'2024_frame', 'frame', '#7a7f8c', .25),
 (r'Cowl_', 'body', '#e7e5ee', 1),
 (r'Front_Wing|Fr Wng rod|^80mm_|Impact_Attenuator', 'fwing', '#c9ccd6', .3),
 (r'Rear_wing|Rear_Wing|Rear_2nd|Rr Wing Rod', 'rwing', '#c9ccd6', .3),
 (r'OZ racing', 'wheel', None, .1),
 (r'_Hub$|Knuckle|^디스크|Caliper Assembly', 'hub', '#9fb0bf', .05),
 (r'_Arm_|Tie_Rod|Toe_Bar|Shock_Rod|Anti_Rod|Bell_Crank|Upper_Shock_Assy|Lower_Shock_Assy', 'susp', '#8b93a3', .06),
 (r'^24_Seat$|Head_Restraint$|Fire_Wall', 'cockpit', '#b9bcc6', .5),
 (r'24_Steering_Wheel|Steering_Column|Dashboard_Box', 'steer', '#4a4f5c', .1),
 (r'24_Brake_Pedal|Pedal_Mount|Throttle_Pedal|Master_Cylinder', 'pedal', '#8b93a3', .06),
 (r'^Battery_Drawing$', 'acc', '#d8d5e2', .3),
 (r'^228_A01$|^228_dodatki$', 'motor', '#b9bcc6', .05),
 (r'^LSD_Drexler$|24_Big_Sprocket|LSD_Mount', 'diff', '#9aa0ad', .06),
 (r'^Gen5 SIZE 9 CONTROLLER', 'mc', '#a7abb8', .04),
]
HULL = {'hub', 'susp', 'pedal', 'motor', 'diff', 'mc', 'steer'}
out = {}
for nm in sc.graph.nodes_geometry:
    T, gk = sc.graph[nm]; leaf = gk.split('|')[1] if '|' in gk else gk
    for rx, cl, col, red in C:
        if not re.search(rx, leaf): continue
        m = sc.geometry[gk].copy(); m.apply_transform(T)
        if cl in HULL and len(m.vertices) > 8: m = m.convex_hull
        cx, cz = m.centroid[0], m.centroid[2]
        key = cl
        if cl in ('wheel', 'hub', 'susp'):
            fr = 'F' if cx > LREF/2 else 'R'
            key = cl + '_' + fr + ('L' if cz > 0 else 'R') if cl != 'susp' else cl + '_' + fr
        if cl == 'wheel':   # 타이어 · 휠: 바퀴 중심에서 반경 185 mm 밖 면 = 타이어
            ctr = (m.bounds[0] + m.bounds[1])/2; fc = m.triangles_center
            rr = np.hypot(fc[:, 0]-ctr[0], fc[:, 1]-ctr[1]); tire = rr > .185*1000
            for part, msk, pc in (('_tire', tire, '#2b2f35'), ('_rim', ~tire, '#c4cad1')):
                if not msk.any(): continue
                sub = m.submesh([np.where(msk)[0]], append=True)
                if part == '_rim': sub = sub.convex_hull
                out.setdefault(key + part, [pc, red, []])[2].append(sub)
            break
        out.setdefault(key, [col, red, []])[2].append(m)
        break
scene = trimesh.Scene(); meta = {}; tot = 0
for key, (col, red, ms) in sorted(out.items()):
    m = trimesh.util.concatenate(ms); m.merge_vertices(merge_tex=True, merge_norm=True)
    if red < 1 and len(m.faces) > 400:
        v, f = fast_simplification.simplify(m.vertices.astype(np.float32), m.faces.astype(np.int32), target_reduction=1-red, agg=8)
        m = trimesh.Trimesh(v, f, process=True)
    m.vertices /= 1000.0   # m
    m.visual = trimesh.visual.ColorVisuals(m, face_colors=None)
    rgb = [int(col[i:i+2], 16) for i in (1, 3, 5)]
    mat = trimesh.visual.material.PBRMaterial(baseColorFactor=rgb + [255], metallicFactor=.05, roughnessFactor=.7)
    m.visual = trimesh.visual.TextureVisuals(material=mat)
    scene.add_geometry(m, node_name=key, geom_name=key)
    b = m.bounds; meta[key] = {'tris': int(len(m.faces)), 'x': [round(b[0][0], 3), round(b[1][0], 3)]}; tot += len(m.faces)
scene.export(OUT)
print(json.dumps(meta, ensure_ascii=False)); print('total tris', tot)
