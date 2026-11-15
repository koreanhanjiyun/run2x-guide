"""APPS 그림 (카드 글: 같은 축 반대편 두 번째 센서 + 리턴 스프링 2개) → misc.json 의 'apps'.
REF4: 가속 페달 · 링크 · 포텐쇼미터 1개 · 마운트는 실물. 두 번째 센서 = REF4 포텐쇼미터 복제, 스프링 = 나선 관 모델링 (사이트 좌표 mm)"""
import json, math, os
HERE = os.path.dirname(os.path.abspath(__file__))
def helix(a, b, R=7, turns=7, n=120):
    ax = [b[i] - a[i] for i in range(3)]; L = math.sqrt(sum(v * v for v in ax)); u = [v / L for v in ax]
    t1 = [0, 0, 1] if abs(u[2]) < 0.9 else [1, 0, 0]
    v1 = [u[1] * t1[2] - u[2] * t1[1], u[2] * t1[0] - u[0] * t1[2], u[0] * t1[1] - u[1] * t1[0]]; m = math.sqrt(sum(x * x for x in v1)); v1 = [x / m for x in v1]
    v2 = [u[1] * v1[2] - u[2] * v1[1], u[2] * v1[0] - u[0] * v1[2], u[0] * v1[1] - u[1] * v1[0]]
    return [[round(a[i] + u[i] * L * k / n + R * (math.cos(2 * math.pi * turns * k / n) * v1[i] + math.sin(2 * math.pi * turns * k / n) * v2[i]), 2) for i in range(3)] for k in range(n + 1)]
add = [{"type": "copy", "name": "apps_s2", "obj": "^Potentiometer[|]", "from": [[2028, 208, -111], [2028, 208, -61]], "to": [[2028, 208, -163], [2028, 208, -113]]}]
for z in (-89, -99):
    add.append({"type": "tube", "name": "apps_spring", "r": 1.6, "pts": helix([1965, 300, z], [2000, 215, z])})
    add.append({"type": "cyl", "name": "apps_spring_end", "a": [1963, 305, z], "b": [1967, 295, z], "r": 4})
d = json.load(open(os.path.join(HERE, 'misc.json'), encoding='utf-8'))
d['figs']['apps'] = {
 "aria": "가속 페달 센서 APPS·BSE", "add": add,
 "focus": "^Throttle_Pedal[|]|^Pedal_Link|^Potentiometer|^Pedal_Pad[|]Throttle|^Throttle_Pedal_Mount|^apps_",
 "ghost": "2024_frame|^24_Brake_Pedal[|]|^Pedal_Pad[|]Brake", "hide": "Rodend|^Torsion|^Return_Spring|^스토퍼|^Bushing",
 "color": {"^Potentiometer": "#2f6fb5", "^apps_s2": "#7048e8", "^Pedal_Link": "#e8590c", "^Pedal_Pad": "#2b2f36", "^apps_spring": "#c92a2a"},
 "az": -45, "el": 30, "pad": 1.1, "fit": [[1930, 170, -200], [2060, 450, -40]],
 "anchors": {"ped": {"obj": "^Pedal_Pad[|]Throttle", "near": [1945, 400, -95]}, "s1": {"obj": "^Potentiometer[|]"}, "s2": {"obj": "^apps_s2"},
             "lk": {"obj": "^Pedal_Link"}, "sp": {"obj": "^apps_spring[|]", "near": [1982, 258, -94]}},
 "manual_labels": True,
 "labels": [{"t": "가속 페달", "a": "ped", "x": 470, "y": 30, "anchor": "end"}, {"t": "APPS 센서 1 (포텐쇼미터)", "a": "s1", "x": 470, "y": 240, "anchor": "end"},
            {"t": "APPS 센서 2 (같은 축, 전기적으로 분리)", "a": "s2", "x": 20, "y": 225}, {"t": "링크", "a": "lk", "x": 470, "y": 125, "anchor": "end"},
            {"t": "리턴 스프링 2개 (하나만으로도 되돌림)", "a": "sp", "x": 20, "y": 120}],
 "notes": [{"t": "두 센서 출력 기울기를 다르게 → 고장 나면 VCU 가 바로 알아챔", "x": 20, "y": 290, "c": "#1f62a8"}]}
d['_note'] = d['_note'].split(' · apps 는')[0] + ' · apps 는 gen_apps.py 가 만듦 (센서 2개 · 스프링 2개)'
json.dump(d, open(os.path.join(HERE, 'misc.json'), 'w', encoding='utf-8', newline='\n'), ensure_ascii=False, indent=1)
print('ok')
