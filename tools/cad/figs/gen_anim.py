"""브래킷 애니메이션 설정 → tools/cad/figs/anim.json (사용: python tools/cad/figs/gen_anim.py)"""
import json, os
OUT =os.path.join(os.path.dirname(os.path.abspath(__file__)), 'anim.json')
states = []
for i in range(7):   # 부품이 브래킷 사이로 들어옴 (볼트는 빠져 있음)
    t = 1 - i / 6
    states.append({"move": {"^Front_Bell_Crank": [0, round(70 * t, 1), round(120 * t, 1)], "^bolt": [-110, 0, 0]}})
for i in range(1, 6):   # 볼트가 두 장 · 부품을 지나 체결
    t = 1 - i / 5
    states.append({"move": {"^bolt": [round(-110 * t, 1), 0, 0]}})
n = len(states)
seq = list(range(n)) + [n - 1] * 6 + list(range(n - 1, -1, -1)) + [0] * 4
fig = {
 "aria": "브래킷",
 "add": [{"type": "cyl", "name": "bolt", "a": [1572, 550, 245], "b": [1628, 550, 245], "r": 5},
         {"type": "cyl", "name": "bolt_head", "a": [1564, 550, 245], "b": [1572, 550, 245], "r": 9, "seg": 6},
         {"type": "cyl", "name": "bolt_nut", "a": [1628, 550, 245], "b": [1636, 550, 245], "r": 9, "seg": 6}],
 "hl": [{"obj": "2024_frame.*~판", "near": "^Front_Bell_Crank", "side": "L", "r": 95}],
 "focus": "^Front_Bell_Crank|^bolt", "corner": "FL", "ghost": "2024_frame", "hide": "Rodend", "ghost_alpha": 0.45,
 "color": {"^Front_Bell_Crank": "#9db4cc", "^bolt": "#e8590c"},
 "az": 65, "el": 35, "pad": 1.0, "fit": [[1565, 515, 200], [1640, 690, 370]], "samples": 48,
 "anchors": {"br": "hl:0", "bc": {"obj": "^Front_Bell_Crank", "near": [1600, 600, 290]}, "bo": {"obj": "^bolt[|]", "near": [1600, 550, 245]}},
 "labels": [{"t": "브래킷 (두 장, 관에 용접)", "a": "br", "x": 20, "y": 270},
            {"t": "부품", "a": "bc", "x": 400, "y": 50, "follow": True},
            {"t": "볼트 (두 장을 모두 관통 = 이중 전단)", "a": "bo", "x": 20, "y": 40}],
 "manual_labels": True,
 "anim": {"states": states, "seq": seq, "dur": 7}}
json.dump({"_note": "애니메이션 그림 (129차): 브래킷 — 부품(벨크랭크)이 두 장 사이로 들어오고 볼트 체결, 반대로 반복", "tube_groups": {}, "figs": {"bracket": fig}},
          open(OUT, 'w', encoding='utf-8', newline='\n'), ensure_ascii=False, indent=1)
print(n, 'states', len(seq), 'slots')
