"""에어로 그림 설정 만들기 → tools/cad/figs/aero2.json (REF4 에 없는 에어로 부품과 유선용 날개 단면).
사용: python tools/cad/figs/gen_aero.py
- 날개 단면: REF4 앞 · 뒤 날개 위치 · 시위를 따라 NACA 단면을 속이 찬 짧은 토막(폭 200 mm)으로 만들고, 가운데 높이에서 유선을 그림
  (REF4 날개는 속 빈 껍데기라 유선이 날개를 뚫는 것처럼 보여서)
- 카나드 · 사이드윙 · 디퓨저 · VG · 거니: FS 차량에서 흔한 형태로 REF4 차에 붙임 (REF4 에는 없음)"""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
F = {}
seeds = lambda x, ys, z: [[x, y, z] for y in ys]
# 1. 앞날개 단면 (REF4 앞날개: 메인 x 2138 ~ 2485, 플랩 2장 x 2068 ~ 2215, 지면 위 76 ~ 312)
fw = [{"type": "airfoil", "name": "fw_main", "naca": "6412", "le": [2485, 100, 0], "chord": 350, "span": 200, "aoa": 6},
      {"type": "airfoil", "name": "fw_flap1", "naca": "4412", "le": [2210, 140, 0], "chord": 110, "span": 200, "aoa": 28},
      {"type": "airfoil", "name": "fw_flap2", "naca": "4412", "le": [2150, 215, 0], "chord": 115, "span": 200, "aoa": 48},
      {"type": "box", "name": "ground", "c": [2300, -5, 100], "size": [1200, 10, 400]}]
F["fwing__2"] = {"aria": "프런트 윙 단면 유선", "add": fw, "focus": "^fw_", "ghost": "^ground", "hide": "zzz",
  "color": {"^fw_": "#3d4450", "^ground": "#d8d5ce"},
  "flow": {"obj": "^fw_|^ground", "x_end": 1880, "clear": 6, "reach": 80, "step": 3, "ret": 0.0025, "r": 2.2,
           "seeds": seeds(2800, [22, 45, 68, 90, 110, 128, 146, 165, 185, 210, 240, 275, 320, 380, 450], 100)},
  "az": 90, "el": 0, "pad": 1.02, "fit": [[1880, 0, 100], [2780, 470, 100]],
  "anchors": {"main": {"obj": "^fw_main", "near": [2350, 105, 100]}, "f1": {"obj": "^fw_flap1", "near": [2160, 165, 100]}, "f2": {"obj": "^fw_flap2", "near": [2100, 280, 100]}},
  "labels": [{"t": "메인 날개", "a": "main"}, {"t": "플랩 1", "a": "f1"}, {"t": "플랩 2", "a": "f2"}],
  "notes": [{"t": "날개 아래: 빨라져 압력 낮음", "x": 20, "y": 290, "c": "#1f62a8"}, {"t": "공기가 위로 꺾여 나감 → 반작용 = 다운포스", "x": 20, "y": 24, "c": "#1f62a8"}],
  "arrows": [{"a": [2330, 420, 100], "b": [2330, 175, 100], "c": "#e03131", "w": 4}]}
# 2. 뒷날개 단면 (REF4 뒷날개: 메인 x -228 ~ 260 · 위 842 ~ 969, 2번 x -312 ~ -160, 3번 x -357 ~ -285, 위 1096 ~ 1194)
rw = [{"type": "airfoil", "name": "rw_main", "naca": "6412", "le": [260, 900, 0], "chord": 490, "span": 200, "aoa": 10},
      {"type": "airfoil", "name": "rw_f2", "naca": "4412", "le": [-150, 985, 0], "chord": 165, "span": 200, "aoa": 38},
      {"type": "airfoil", "name": "rw_f3", "naca": "4412", "le": [-280, 1100, 0], "chord": 100, "span": 200, "aoa": 58}]
F["rwing"] = {"aria": "리어 윙 단면 유선", "add": rw, "focus": "^rw_", "ghost": "zzz", "hide": "zzz", "color": {"^rw_": "#3d4450"},
  "flow": {"obj": "^rw_", "x_end": -520, "clear": 6, "reach": 90, "step": 3, "ret": 0.0025, "r": 2.2,
           "seeds": seeds(500, [780, 820, 850, 880, 905, 930, 955, 985, 1015, 1050, 1090, 1130, 1180, 1240], 100)},
  "az": 90, "el": 0, "pad": 1.02, "fit": [[-520, 760, 100], [500, 1260, 100]],
  "anchors": {"main": {"obj": "^rw_main", "near": [50, 910, 100]}, "f2": {"obj": "^rw_f2", "near": [-220, 1020, 100]}, "f3": {"obj": "^rw_f3", "near": [-320, 1150, 100]}},
  "labels": [{"t": "메인 날개", "a": "main"}, {"t": "2번 플랩", "a": "f2"}, {"t": "3번 플랩", "a": "f3"}],
  "notes": [{"t": "틈(슬롯)으로 아래면에 빠른 공기를 다시 넣어 흐름이 안 떨어짐", "x": 20, "y": 290, "c": "#1f62a8"}, {"t": "위로 꺾여 나가는 공기", "x": 20, "y": 24, "c": "#1f62a8"}],
  "arrows": [{"a": [20, 1240, 100], "b": [20, 960, 100], "c": "#e03131", "w": 4}]}
# 3. 카나드: 노즈 옆 (REF4 노즈 카울 x 1424 ~ 2461, 반폭 247)
cn = []
for s in (1, -1):
    z0 = 230 if s > 0 else -230 - 110
    cn.append({"type": "airfoil", "name": "canard", "naca": "4412", "le": [2330, 300, z0], "chord": 140, "span": 110, "aoa": 16})
    cn.append({"type": "plate", "name": "canard_ep", "t": 3, "pts": [[2340, 270, z0 + (110 if s > 0 else 0)], [2340, 350, z0 + (110 if s > 0 else 0)], [2180, 360, z0 + (110 if s > 0 else 0)], [2180, 280, z0 + (110 if s > 0 else 0)]]})
F["canard"] = {"aria": "카나드·다이브 플레인", "add": cn, "focus": "^canard", "ghost": "^Cowl_Body|^Front_Wing|OZ racing|^Impact|2024_frame", "hide": "Rodend|^Rear",
  "color": {"^canard": "#2f6fb5"},
  "flow": {"obj": "^canard|^Cowl_Body", "x_end": 1700, "clear": 8, "reach": 60, "step": 5, "ret": 0.003, "seeds": seeds(2650, [300, 330, 360], 300) + seeds(2650, [300, 330], 360)},
  "az": 35, "el": 20, "pad": 1.1, "fit": [[1750, 150, -400], [2600, 450, 420]],
  "anchors": {"c": {"obj": "^canard$|^canard\\|", "near": [2260, 320, 300]}, "ep": {"obj": "^canard_ep", "near": [2260, 320, 340]}, "nose": {"obj": "^Cowl_Body", "near": [2100, 450, 0]}},
  "labels": [{"t": "카나드 (작은 날개)", "a": "c"}, {"t": "끝판", "a": "ep"}, {"t": "노즈 카울", "a": "nose"}],
  "notes": [{"t": "끝에서 생긴 소용돌이가 차 옆을 따라가며 흐름을 정리", "x": 20, "y": 290, "c": "#1f62a8"}]}
# 4. 사이드윙: 앞 · 뒷바퀴 사이, 사이드포드 바깥 (FS 에서 흔한 2단 날개 + 끝판, 프레임에 지지대)
sw = [{"type": "airfoil", "name": "sw_main", "naca": "6412", "le": [1150, 120, 360], "chord": 420, "span": 240, "aoa": 4},
      {"type": "airfoil", "name": "sw_flap", "naca": "4412", "le": [760, 185, 360], "chord": 160, "span": 240, "aoa": 30},
      {"type": "plate", "name": "sw_ep", "t": 3, "pts": [[1180, 60, 600], [1180, 330, 600], [560, 380, 600], [560, 60, 600]]},
      {"type": "plate", "name": "sw_ep", "t": 3, "pts": [[1180, 60, 360], [1180, 300, 360], [560, 340, 360], [560, 60, 360]]},
      {"type": "cyl", "name": "sw_strut", "a": [950, 150, 470], "b": [950, 330, 330], "r": 7}]
F["sidewing"] = {"aria": "사이드 윙", "add": sw, "focus": "^sw_", "ghost": "2024_frame|Cowl_Side|OZ racing|^Battery_Box_Inlet", "hide": "Rodend",
  "color": {"^sw_main|^sw_flap": "#3d4450", "^sw_ep": "#8c96a3", "^sw_strut": "#5a606b"},
  "az": 60, "el": 22, "pad": 1.1, "fit": [[450, 0, 250], [1350, 450, 700]],
  "anchors": {"m": {"obj": "^sw_main", "near": [1000, 140, 480]}, "f": {"obj": "^sw_flap", "near": [700, 210, 480]}, "ep": {"obj": "^sw_ep", "near": [870, 250, 600]}, "st": {"obj": "^sw_strut"}},
  "labels": [{"t": "메인 날개", "a": "m"}, {"t": "플랩", "a": "f"}, {"t": "엔드플레이트", "a": "ep"}, {"t": "지지대 (프레임에 볼트)", "a": "st"}]}
# 5. 언더트레이 · 디퓨저 · 사이드 스커트 (REF4 언더 카울 x 125 ~ 1425 를 늘린 평판 + 뒤 차축 뒤에서 들림)
dt = [{"type": "plate", "name": "ut_floor", "t": 4, "pts": [[1500, 40, -330], [1500, 40, 330], [250, 40, 330], [250, 40, -330]]},
      {"type": "plate", "name": "ut_diff", "t": 4, "pts": [[250, 40, -330], [250, 40, 330], [-330, 230, 330], [-330, 230, -330]]},
      {"type": "plate", "name": "ut_skirt", "t": 3, "pts": [[1500, 40, 330], [1500, 120, 330], [-330, 250, 330], [-330, 230, 330], [250, 40, 330]]},
      {"type": "plate", "name": "ut_skirt", "t": 3, "pts": [[1500, 40, -330], [1500, 120, -330], [-330, 250, -330], [-330, 230, -330], [250, 40, -330]]}]
for z in (-110, 110):
    dt.append({"type": "plate", "name": "ut_fence", "t": 3, "pts": [[250, 40, z], [250, 70, z], [-330, 260, z], [-330, 230, z]]})
F["diffuser"] = {"aria": "언더트레이·디퓨저·사이드 스커트", "add": dt, "focus": "^ut_", "ghost": "2024_frame|OZ racing|Cowl_Side", "hide": "Rodend|^Rear_Wing|^Front_Wing|Wing_Rod|Wng",
  "color": {"^ut_floor|^ut_diff": "#2b2f36", "^ut_skirt": "#5a606b", "^ut_fence": "#2f6fb5"},
  "az": -150, "el": -15, "pad": 1.05, "fit": [[-400, 0, -400], [1550, 300, 400]],
  "anchors": {"fl": {"obj": "^ut_floor", "near": [900, 40, -100]}, "df": {"obj": "^ut_diff", "near": [-50, 130, -200]}, "sk": {"obj": "^ut_skirt", "near": [600, 90, -330]}, "fe": {"obj": "^ut_fence", "near": [-100, 150, -110]}},
  "labels": [{"t": "언더트레이 (평평한 바닥)", "a": "fl"}, {"t": "디퓨저 (뒤로 갈수록 들림)", "a": "df"}, {"t": "사이드 스커트", "a": "sk"}, {"t": "세로 핀", "a": "fe"}],
  "notes": [{"t": "아래에서 본 모습 (차를 아래에서 올려다봄)", "x": 20, "y": 24, "c": "#495057"}]}
# 6. VG: 언더트레이 아랫면, 디퓨저 앞에 각도를 번갈아 세운 작은 삼각판
vg = [dict(d) for d in dt]
for i, z in enumerate(range(-250, 260, 70)):
    a = 20 if i % 2 else -20
    import math
    dz = 45 * math.sin(math.radians(a)); dx = 45 * math.cos(math.radians(a))
    vg.append({"type": "plate", "name": "vg", "t": 2, "pts": [[420, 38, z], [420 - dx, 38, z - dz], [420 - dx, 10, z - dz]]})
F["vg"] = {"aria": "볼텍스 제너레이터", "add": vg, "focus": "^vg", "ghost": "^ut_", "hide": "Rodend|2024_frame|OZ racing|Cowl|Wing",
  "color": {"^vg": "#e8590c", "^ut_": "#3d4450"},
  "az": -160, "el": -35, "pad": 1.15, "fit": [[100, 0, -320], [700, 60, 320]],
  "anchors": {"v": {"obj": "^vg", "near": [400, 30, 0]}, "fl": {"obj": "^ut_floor", "near": [600, 40, -200]}, "df": {"obj": "^ut_diff", "near": [200, 60, 0]}},
  "labels": [{"t": "볼텍스 제너레이터 (각도를 번갈아)", "a": "v"}, {"t": "언더트레이 아랫면", "a": "fl"}, {"t": "디퓨저 시작", "a": "df"}],
  "notes": [{"t": "서로 반대로 도는 소용돌이가 바닥 흐름에 힘을 보태 디퓨저에서 안 떨어지게", "x": 20, "y": 290, "c": "#1f62a8"}]}
# 7. 거니 플랩: REF4 뒷날개 3번 플랩 뒷전에 직각 띠
F["gurney"] = {"aria": "거니 플랩", "add": [{"type": "box", "name": "gurney", "c": [-354, 1206, 0], "size": [3, 22, 850]}],
  "focus": "^gurney|^Rear_3rd_Flap_(Upper|lower)", "ghost": "^Rear_wing_Endplate|^Rear_Wing_Main|^Rear_2nd", "hide": "Rodend|2024_frame|OZ racing",
  "color": {"^gurney": "#e8590c", "^Rear_3rd": "#8c96a3"},
  "az": -120, "el": 25, "pad": 1.3, "fit": [[-400, 1080, -200], [-250, 1240, 200]],
  "anchors": {"g": {"obj": "^gurney", "near": [-354, 1210, 0]}, "f": {"obj": "^Rear_3rd_Flap_Upper", "near": [-320, 1150, 0]}},
  "labels": [{"t": "거니 플랩 (뒷전에 직각)", "a": "g"}, {"t": "3번 플랩", "a": "f"}],
  "notes": [{"t": "높이는 시위의 1 ~ 2 % 정도, 뒷전 뒤에 작은 소용돌이 2개 → 다운포스 증가", "x": 20, "y": 290, "c": "#1f62a8"}]}
json.dump({"_note": "에어로: REF4 에 없는 부품 · 유선용 단면 (gen_aero.py 가 만듦)", "tube_groups": {}, "figs": F},
          open(os.path.join(HERE, 'aero2.json'), 'w', encoding='utf-8', newline='\n'), ensure_ascii=False, indent=1)
print('figs', list(F))
