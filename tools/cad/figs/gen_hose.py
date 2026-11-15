"""냉각 배관 그림 (카드 글: 좌우 두 회로) → tools/cad/figs/cool.json 의 'hose' 를 만들어 넣음.
왼쪽: 펌프(왼) → 인버터 콜드 플레이트 → 왼쪽 라디 → 펌프. 오른쪽: 펌프(오른) → 모터 재킷 → 오른쪽 라디 → 펌프.
REF4: 펌프 2개(z ±330) · 인버터 · 모터 · 리저버는 실물, 라디 · 배관 · 화살표는 모델링 (사이트 좌표 mm)"""
import json, math, os
HERE = os.path.dirname(os.path.abspath(__file__))
th = 20
add = []
def rad(s):   # s = +1 왼쪽, -1 오른쪽
    C = [930, 270, 440 * s]; n = 'L' if s > 0 else 'R'
    return [{"type": "box", "name": "rad" + n + "_core", "c": C, "size": [32, 260, 230], "rot2": [0, 0, th * s]},
            {"type": "box", "name": "rad" + n + "_tank", "c": [930, 415, 440 * s], "size": [44, 30, 240], "rot2": [0, 0, th * s]},
            {"type": "box", "name": "rad" + n + "_tank", "c": [930, 125, 440 * s], "size": [44, 30, 240], "rot2": [0, 0, th * s]}]
add += rad(1) + rad(-1)
HOT, COLD = [], []
def hose(kind, pts):
    (HOT if kind == 'hot' else COLD).append(pts)
    add.append({"type": "tube", "name": "hose_" + kind, "pts": pts, "r": 11})
    # 흐름 화살표 (원뿔) — 가장 긴 구간 가운데
    seg = max(zip(pts[:-1], pts[1:]), key=lambda ab: math.dist(ab[0], ab[1])); a, b = seg
    m = [(a[i] + b[i]) / 2 for i in range(3)]; d = [(b[i] - a[i]) / math.dist(a, b) for i in range(3)]
    add.append({"type": "cyl", "name": "arrow_" + kind, "a": [m[i] - 30 * d[i] for i in range(3)], "b": [m[i] + 30 * d[i] for i in range(3)], "r": 26, "r2": 0.5})
# 왼쪽 회로
hose('cold', [[400, 205, 350], [430, 330, 260], [380, 440, 180], [330, 458, 150]])          # 펌프(왼) 출구 → 인버터 입구
hose('hot', [[520, 458, 150], [700, 470, 260], [880, 440, 420], [905, 415, 440]])           # 인버터 출구 → 왼 라디 위 물통
hose('cold', [[905, 125, 440], [700, 90, 420], [400, 90, 380], [290, 125, 345]])            # 왼 라디 아래 물통 → 펌프(왼) 입구
# 오른쪽 회로
hose('cold', [[400, 195, -350], [330, 260, -250], [230, 320, -140], [180, 335, -110]])      # 펌프(오른) 출구 → 모터 재킷
hose('hot', [[100, 335, -110], [200, 470, -250], [700, 470, -380], [905, 415, -440]])       # 모터 재킷 → 오른 라디 위 물통
hose('cold', [[905, 125, -440], [700, 90, -420], [400, 100, -360], [290, 145, -335]])       # 오른 라디 아래 물통 → 펌프(오른) 입구
# 리저버 → 왼쪽 펌프 입구 (보충 관)
add.append({"type": "tube", "name": "hose_fill", "pts": [[420, 315, 318], [380, 200, 330], [330, 110, 360]], "r": 6})
cool = json.load(open(os.path.join(HERE, 'cool.json'), encoding='utf-8'))
cool['figs']['hose'] = {
 "aria": "배관·피팅", "add": add,
 "focus": "^hose_|^arrow_|^rad[LR]_|^TL-B10-B|^Reservoir[|]|^Gen5|^228_A01",
 "ghost": "2024_frame", "hide": "Rodend|Battery|OZ racing|Cowl|^duct|^fan|^shroud|^rad_",
 "color": {"^hose_hot|^arrow_hot": "#e03131", "^hose_cold|^arrow_cold": "#1c7ed6", "^hose_fill": "#868e96", "^rad[LR]_core": "#3d4450", "^rad[LR]_tank": "#8c96a3",
           "^Gen5": "#c3c8d0", "^228_A01": "#8c96a3", "^TL-B10-B": "#2b2f36"},
 "az": 180, "el": 62, "pad": 1.04, "fit": [[60, 60, -600], [1000, 520, 600]],
 "manual_labels": True,
 "anchors": {"rl": {"obj": "^radL_core"}, "rr": {"obj": "^radR_core"}, "pl": {"obj": "^TL-B10-B", "near": [350, 200, 330]}, "pr": {"obj": "^TL-B10-B", "near": [350, 200, -330]},
             "inv": {"obj": "^Gen5", "near": [400, 504, 0]}, "mot": {"obj": "^228_A01", "near": [140, 335, -80]}, "res": {"obj": "^Reservoir[|]"}},
 "labels": [{"t": "왼쪽 라디에이터", "a": "rl", "x": 20, "y": 40}, {"t": "오른쪽 라디에이터", "a": "rr", "x": 470, "y": 40, "anchor": "end"},
            {"t": "펌프 (왼쪽 회로)", "a": "pl", "x": 20, "y": 255}, {"t": "펌프 (오른쪽 회로)", "a": "pr", "x": 470, "y": 255, "anchor": "end"},
            {"t": "인버터 (콜드 플레이트)", "a": "inv", "x": 240, "y": 100, "anchor": "middle"}, {"t": "모터 (재킷)", "a": "mot", "x": 238, "y": 232, "anchor": "end"},
            {"t": "리저버", "a": "res", "x": 20, "y": 150}],
 "notes": [{"t": "빨강 = 뜨거운 물 · 파랑 = 식은 물 (뒤에서 내려다봄)", "x": 20, "y": 290, "c": "#495057"}]}
cool['_note'] = cool['_note'].split(' · hose 는')[0] + ' · hose 는 gen_hose.py 가 만듦 (카드 글의 좌우 두 회로)'
json.dump(cool, open(os.path.join(HERE, 'cool.json'), 'w', encoding='utf-8', newline='\n'), ensure_ascii=False, indent=1)
print(len(add), 'parts')
