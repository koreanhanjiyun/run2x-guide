"""FSK 2026 공식 내구 코스 → js/data/fsk2026-course.js 의 슬라럼 고침 (2026-11-05)
   원본: FSK-2026-Endurance.json (관리자 제공 cone2track 내보내기). 중심선은 콘 가운데를 지나므로,
   가운데 콘(side = center, 11개 = 슬라럼)을 그대로 통과한다. 슬라럼 구간만 콘을 번갈아 비켜 가도록 고친다.
   - 콘마다 가장 가까운 중심선 점 s_j 에서 옆으로 ±A (번갈아, 첫 콘은 왼쪽) 비켜 감
   - 가로 이동 e(s): 첫 콘 한 간격 앞 · 끝 콘 한 간격 뒤에서 0, 콘에서 ±A, 사이는 코사인으로 이음
   - 곡률 k = k_원래 + e'' (작은 이동 근사), 칸 길이 = 원래 × √((1 − k e)² + e'²)
   A = 1.0 m (가정: 차 폭 절반 약 0.6 m + 콘과 여유 0.4 m). 실행: python3 make_course.py  → 슬라럼만 바꾼 X · Y · seg 를 덮어씀
"""
import json, math, re
A = 1.0
src = json.load(open('docs/data/fsk2026/FSK-2026-Endurance.json'))
path = 'js/data/fsk2026-course.js'; js = open(path, encoding='utf-8').read()
o = json.loads(js[js.index('{'):js.rindex('}') + 1])
P = src['centerline']['points']; N = len(P); pr = src['projection']
X = [p['x'] for p in P]; Y = [p['y'] for p in P]
assert '슬라럼(가운데 콘' not in js[:js.index('const FSK26')], '이미 슬라럼을 고친 파일입니다 (두 번 돌리면 두 번 비켜 감). git 에서 고치기 전 파일로 되돌린 뒤 실행'
assert abs(X[0] - o['X'][0]) < 0.01 and len(o['seg']) == N
# 원래 곡률 · 칸 길이 (이미 3 m 로 부드럽게 한 값), 방향 (왼쪽 법선)
k0 = [1 / R if R else 0.0 for _, R in o['seg']]; l0 = [l for l, _ in o['seg']]
s = [0.0]
for l in l0[:-1]: s.append(s[-1] + l)
def nrm(i):
    a, b = (i - 1) % N, (i + 1) % N; dx, dy = X[b] - X[a], Y[b] - Y[a]; d = math.hypot(dx, dy); return (-dy / d, dx / d)
# 가운데 콘 → 가장 가까운 점, 묶음 (간격 20 m 넘으면 다른 슬라럼)
cs = []
for c in src['cones']:
    if c['side'] != 'center': continue
    x = (c['lng'] - pr['lng0']) * pr['mlng']; y = (c['lat'] - pr['lat0']) * pr['mlat']
    cs.append(min(range(N), key=lambda i: (X[i] - x) ** 2 + (Y[i] - y) ** 2))
cs.sort(); groups = [[cs[0]]]
for i in cs[1:]:
    (groups[-1].append(i) if s[i] - s[groups[-1][-1]] < 20 else groups.append([i]))
e = [0.0] * N
for g in groups:
    sp = [s[g[j + 1]] - s[g[j]] for j in range(len(g) - 1)]
    knots = [(s[g[0]] - sp[0], 0.0)] + [(s[i], A if j % 2 == 0 else -A) for j, i in enumerate(g)] + [(s[g[-1]] + sp[-1], 0.0)]
    for i in range(N):
        for (sa, ea), (sb, eb) in zip(knots, knots[1:]):
            if sa <= s[i] <= sb:
                t = (s[i] - sa) / (sb - sa); e[i] = ea + (eb - ea) * (1 - math.cos(math.pi * t)) / 2
    print('슬라럼', [round(s[i], 1) for i in g], '콘 간격', [round(v, 1) for v in sp])
# 미분 (1 m 간격, 닫힌 고리)
de = [(e[(i + 1) % N] - e[i - 1]) / (l0[i - 1] + l0[i]) for i in range(N)]
dde = [(e[(i + 1) % N] - 2 * e[i] + e[i - 1]) / (l0[i] * l0[i - 1]) for i in range(N)]
Xn, Yn, seg = [], [], []
for i in range(N):
    nx, ny = nrm(i); Xn.append(round(X[i] + e[i] * nx, 2)); Yn.append(round(Y[i] + e[i] * ny, 2))
    k = k0[i] + dde[i]; l = l0[i] * math.sqrt((1 - k0[i] * e[i]) ** 2 + de[i] ** 2)
    seg.append([round(l, 3), round(1 / k, 2) if abs(k) > 1e-4 else 0])
o['X'], o['Y'], o['seg'] = Xn, Yn, seg; o['len'] = round(sum(l for l, _ in seg), 2)
print('한 바퀴', o['len'], 'm · 가장 작은 반경', round(min(abs(R) for _, R in seg if R), 2), 'm')
head = js[:js.index('const FSK26')]
if '슬라럼' not in head:
    head = head.replace(' */', '\n   슬라럼(가운데 콘 11개)은 콘을 번갈아 ±1.0 m 비켜 가게 고침 — docs/data/fsk2026/make_course.py */', 1)
open(path, 'w', encoding='utf-8').write(head + 'const FSK26 = ' + json.dumps(o, ensure_ascii=False, separators=(',', ':')) + ';\n')
