"""FSK 2026 공식 내구 코스 → js/data/fsk2026-course.js 에 슬라럼 콘 자리(slalom)를 붙임 (2026-11-06)
   원본: FSK-2026-Endurance.json (관리자 제공 cone2track 내보내기). 중심선은 가운데 콘(side = center, 11개 = 슬라럼)을 그대로 지나가므로,
   콘마다 가장 가까운 중심선 점 번호를 slalom 에 적는다. 도구 2 의 최소 곡률 주행선이 이 점에서 콘을 번갈아 비켜 가도록 제약으로 씀.
   실행: python3 docs/data/fsk2026/make_course.py  (여러 번 돌려도 같은 결과)
"""
import json
src = json.load(open('docs/data/fsk2026/FSK-2026-Endurance.json'))
path = 'js/data/fsk2026-course.js'; js = open(path, encoding='utf-8').read()
o = json.loads(js[js.index('{'):js.rindex('}') + 1]); pr = src['projection']
X, Y = o['X'], o['Y']; N = len(X)
idx = []
for c in src['cones']:
    if c['side'] != 'center': continue
    x = (c['lng'] - pr['lng0']) * pr['mlng']; y = (c['lat'] - pr['lat0']) * pr['mlat']
    idx.append(min(range(N), key=lambda i: (X[i] - x) ** 2 + (Y[i] - y) ** 2))
o['slalom'] = sorted(idx)
head = js[:js.index('const FSK26')]
if 'slalom:' not in head:
    head = head.replace(' */', '\n   slalom: 가운데 콘(슬라럼) 자리의 중심선 점 번호 — 주행선이 콘을 번갈아 비켜 가는 제약. docs/data/fsk2026/make_course.py */', 1)
open(path, 'w', encoding='utf-8').write(head + 'const FSK26 = ' + json.dumps(o, ensure_ascii=False, separators=(',', ':')) + ';\n')
print('slalom', o['slalom'], '한 바퀴', o['len'])
