"""부품 소개 그림(시작 탭 시스템 화면) 만들기: 설정 파일 → Blender 렌더 → img/comp/<id>.webp + 라벨 SVG(js/figures/comp-figs-3d.js 의 해당 키).

사용: python tools/cad/comp_fig.py tools/cad/figs/frame.json [그림 id …] [--glb 변환본.glb] [--tubes 관.json] [--check 폴더]
  - 변환본: tools/cad/step2glb.py <REF4.STEP> x.glb --frame ref4 --fine "…" --tubes "2024_frame" (x.tubes.json 이 같이 생김)
  - --check 폴더: 사이트에 넣지 않고 그 폴더에 png(라벨 포함 미리보기)만 만듦
설정 파일(JSON):
  tube_groups: {이름: 조건식} — 관(x.tubes.json) 고르기. 변수 x0 x1 y0 y1 z0 z1(범위, 사이트 좌표 mm) · wall(벽 두께) · len
  figs: {그림 id: {render_part.py --spec 항목 + 아래}}
    hl: [{"tubes": [관 묶음 이름…], "obj": 정규식, "as": "focus"}] → 관 축 선분으로 바꿔 넘김
    labels: [{"t": 글자, "a": 점 이름, "x": , "y": (480 × 300 좌표, 글자 기준선), "anchor": start|end|middle}]
    notes: [{"t": 글자, "x", "y", "c": 색}] — 부품이 아닌 표시(하중 · 흐름 등)의 짧은 글 (연결선 없음, 기울임)
    lines: [{"a": 점, "b": 점, "c": 색, "dash": true}] · arrows: [{"a": 점 또는 [x,y], "b": 점 또는 [x,y], "c": 색}]
"""
import json, re, sys, os, subprocess, argparse, tempfile
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BLENDER = r'C:\Program Files\Blender Foundation\Blender 5.3\blender.exe'
ap = argparse.ArgumentParser(); ap.add_argument('spec'); ap.add_argument('ids', nargs='*')
ap.add_argument('--glb', default=''); ap.add_argument('--tubes', default=''); ap.add_argument('--check', default='')
ap.add_argument('--cache', default='', help='라벨 점 저장 폴더. --svg-only 와 같이 쓰면 렌더 없이 라벨 SVG 만 다시 만듦 (글자 위치만 고칠 때)')
ap.add_argument('--svg-only', action='store_true'); ap.add_argument('--preview', action='store_true', help='낮은 화질(샘플 16)로 빨리 — 확인용')
A = ap.parse_args()
SPEC = json.load(open(A.spec, encoding='utf-8'))
TUBES = json.load(open(A.tubes, encoding='utf-8')) if A.tubes else []
W, H, K = 1080, 675, 480 / 1080   # 렌더 크기, 그림 좌표(480 × 300) 배율

def pick(cond):
    out = []
    for t in TUBES:
        P = np.vstack([np.array(s) for s in t['segs']])
        v = dict(x0=P[:, 0].min(), x1=P[:, 0].max(), y0=P[:, 1].min(), y1=P[:, 1].max(), z0=P[:, 2].min(), z1=P[:, 2].max(), wall=t['wall'], len=t['len'])
        if eval(cond, {}, v): out += t['segs']
    return out

FONT = 'IBM Plex Sans KR, Malgun Gothic, Apple SD Gothic Neo, sans-serif'
def tw(s, fs=12.5):   # 글자 폭 어림 (한글 ≈ 1 em, 그 밖 ≈ 0.55 em)
    return sum(fs * (1.0 if ord(c) > 0x2E80 else 0.56) for c in s)
def pt(v, AN):
    return [v[0], v[1]] if isinstance(v, list) else [AN[v][0] * K, AN[v][1] * K]
def cross(p1, p2, p3, p4):   # 두 선분이 끝점 근처가 아닌 곳에서 엇갈리면 True
    d = lambda a, b, c: (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
    d1, d2, d3, d4 = d(p3, p4, p1), d(p3, p4, p2), d(p1, p2, p3), d(p1, p2, p4)
    return d1 * d2 < -1 and d3 * d4 < -1
def near_par(a, b, c, d):   # 두 연결선이 11 px 안으로 나란히 붙어 지나감 (끝 쪽 제외)
    A_ = [a + (b - a) * t for t in np.linspace(0.15, 0.85, 8)]; B_ = [c + (d - c) * t for t in np.linspace(0.15, 0.85, 8)]
    return sum(min(np.linalg.norm(x - y) for y in B_) < 11 for x in A_) >= 2
def seg_box(a, b, bx):   # 선분이 상자를 지나가는지 (표본 점으로)
    return any(bx[0] < x < bx[2] and bx[1] < y < bx[3] for x, y in (a + (b - a) * t for t in np.linspace(0.05, 0.95, 19)))
def place(f, AN, mask, fixed_segs):
    """라벨 글자 자리 자동 고르기: 후보 자리마다 비용 = 부품 위에 글자가 얹힘(진한 부품 크게, 흐린 주변 부품 작게) + 연결선 길이
    + 선끼리 엇갈림 + 글자끼리 겹침 + 선이 다른 글자를 지남. 욕심쟁이로 한 번 놓고 세 번 다시 고쳐 놓음.
    mask = 렌더 알파(480 × 300, 0 ~ 1). spec 의 keepout = 직접 그린 그림(그래프 · 확대 원) 자리 [x0, y0, x1, y1]"""
    H_, W_ = mask.shape; ii = np.cumsum(np.cumsum(np.pad(mask > 0.55, ((1, 0), (1, 0))), 0), 1); jj = np.cumsum(np.cumsum(np.pad((mask > 0.12) & (mask <= 0.55), ((1, 0), (1, 0))), 0), 1)
    def frac(I, bx):
        x0, y0, x1, y1 = [int(round(v)) for v in (max(bx[0], 0), max(bx[1], 0), min(bx[2], W_), min(bx[3], H_))]
        if x1 <= x0 or y1 <= y0: return 0
        return (I[y1, x1] - I[y0, x1] - I[y1, x0] + I[y0, x0]) / ((x1 - x0) * (y1 - y0))
    keep = [tuple(k) for k in f.get('keepout', [])]
    nb = []   # 표시 글(notes) 상자
    for nt in f.get('notes', []):
        w = tw(nt['t']); an = nt.get('anchor', 'start'); x0 = nt['x'] if an == 'start' else nt['x'] - w if an == 'end' else nt['x'] - w / 2
        nb.append((x0 - 3, nt['y'] - 13, x0 + w + 3, nt['y'] + 4))
    L = [lb for lb in f.get('labels', []) if 'p' not in lb and AN.get(lb['a']) is not None and not lb.get('fix')]
    P = {id(lb): np.array([AN[lb['a']][0] * K, AN[lb['a']][1] * K]) for lb in L}
    cands = [(14, y, 'start') for y in range(22, 296, 6)] + [(466, y, 'end') for y in range(22, 296, 6)] + \
            [(x, y, an) for x in range(30, 460, 16) for y in range(22, 296, 10) for an in ('start', 'end')]   # 빈 곳 어디든 (부품 가까이)
    def geom(lb, c):
        x, y, an = c; w = tw(lb['t']); x0 = x if an == 'start' else x - w
        bx = (x0 - 3, y - 13, x0 + w + 3, y + 4); p = P[id(lb)]; q = np.array([min(max(p[0], bx[0]), bx[2]), min(max(p[1], bx[1]), bx[3])])
        return bx, q, p
    def cost(lb, c, chosen):
        bx, q, p = geom(lb, c)
        if bx[0] < 2 or bx[2] > 478 or bx[1] < 2 or bx[3] > 299: return 1e9
        if bx[0] <= p[0] <= bx[2] and bx[1] <= p[1] <= bx[3]: return 1e9
        Lq = np.linalg.norm(q - p); smp = [q + (p - q) * t for t in np.linspace(0, 1, 24) if np.linalg.norm((p - q) * (1 - t)) > 9]
        over = np.mean([mask[min(int(y), H_ - 1), min(int(x), W_ - 1)] > 0.55 for x, y in smp]) if smp else 0   # 연결선이 진한 부품 위를 지나는 비율
        sm = [mask[min(int(z[1]), H_ - 1), min(int(z[0]), W_ - 1)] > 0.55 for t in np.linspace(0, 1, 60) for z in [q + (p - q) * t] if np.linalg.norm((p - q) * (1 - t)) > 9]
        cuts = sum(1 for a_, b_ in zip(sm[:-1], sm[1:]) if b_ and not a_)   # 연결선이 진한 부품을 가로질러 넘는 횟수 (점이 있는 부품 앞에서 끝나는 것 제외)
        v = 9000 * frac(ii, bx) + 300 * frac(jj, bx) + 2.0 * Lq + 500 * over + 600 * cuts
        for o in keep + nb:
            if not (bx[2] < o[0] or bx[0] > o[2] or bx[3] < o[1] or bx[1] > o[3]): v += 10000
            if seg_box(q, p, o): v += 2500
        for nm_, a, b in fixed_segs:
            if cross(q, p, a, b): v += 4000
        for ob, oc in chosen.items():
            if ob == id(lb): continue
            obx, oq, op = geom(next(l for l in L if id(l) == ob), oc)
            if not (bx[2] < obx[0] or bx[0] > obx[2] or bx[3] < obx[1] or bx[1] > obx[3]): v += 10000
            if cross(q, p, oq, op): v += 4000
            if near_par(q, p, oq, op): v += 1500
            if seg_box(q, p, obx) or seg_box(oq, op, bx): v += 2500
        return v
    chosen = {}
    for lb in sorted(L, key=lambda l: P[id(l)][1]):
        chosen[id(lb)] = min(cands, key=lambda c: cost(lb, c, chosen))
    for _ in range(3):
        for lb in L: chosen[id(lb)] = min(cands, key=lambda c: cost(lb, c, chosen))
    for lb in L:
        x, y, an = chosen[id(lb)]; lb['x'], lb['y'], lb['anchor'] = x, y, an
        bx = geom(lb, chosen[id(lb)])[0]
        if frac(ii, bx) > 0.04: print(f'  글자가 부품 위: {lb["t"]}')
def svg_of(fid, f, AN, mask=None):
    if mask is not None and not f.get('manual_labels'):
        pre = []   # 자동 배치 전에 정해진 선 (표시선 · 화살표 · 수선)
        for ln in f.get('lines', []):
            a, b = np.array(pt(ln['a'], AN)), np.array(pt(ln['b'], AN)); e = ln.get('ext', 0); pre.append(('선', a - (b - a) * e, b + (b - a) * e))
        for ar in f.get('arrows', []): pre.append(('화살표', np.array(pt(ar['a'], AN)), np.array(pt(ar['b'], AN))))
        for pp in f.get('perp', []):
            p, a, b = [np.array(pt(v, AN)) for v in (pp['p'], pp['l'][0], pp['l'][1])]; u = (b - a) / np.linalg.norm(b - a); pre.append(('수선', p, a + ((p - a) @ u) * u))
        f = dict(f, labels=[dict(lb) for lb in f.get('labels', [])]); place(f, AN, mask, pre)
    o = [f'<svg viewBox="0 0 480 300" role="img" class="cfig3" aria-label="{f["aria"]}"><image href="img/comp/{fid}.webp" x="0" y="0" width="480" height="300"/><g font-family="{FONT}" font-size="12.5">']
    dots = []; segs = []   # segs: (이름, 시작, 끝) — 연결선 · 표시선끼리 엇갈리는지 마지막에 검사
    def arrow(a, b, c, w):   # 화살표 머리는 선 굵기에 비례 (작으면 막대 · 유선처럼 보임)
        L, hw = max(10, 3.6 * w + 4), max(5, 1.9 * w + 2); u = (b - a) / max(np.linalg.norm(b - a), 1e-6); n = np.array([-u[1], u[0]])
        h1, h2, e = b - u * L + n * hw, b - u * L - n * hw, b - u * (L * 0.8)
        o.append(f'<path d="M{a[0]:.1f} {a[1]:.1f}L{e[0]:.1f} {e[1]:.1f}" stroke="{c}" stroke-width="{w}" fill="none" stroke-linecap="round"/><path d="M{b[0]:.1f} {b[1]:.1f}L{h1[0]:.1f} {h1[1]:.1f}L{h2[0]:.1f} {h2[1]:.1f}Z" fill="{c}" stroke="#fff" stroke-width=".8"/>')
    for ln in f.get('lines', []):
        a, b = np.array(pt(ln['a'], AN)), np.array(pt(ln['b'], AN)); e = ln.get('ext', 0)   # ext: 양 끝을 길이 비율만큼 늘림
        a, b = a - (b - a) * e, b + (b - a) * e; segs.append(('선', a, b))
        o.append(f'<path d="M{a[0]:.1f} {a[1]:.1f}L{b[0]:.1f} {b[1]:.1f}" stroke="{ln.get("c", "#c0392b")}" stroke-width="1.5" fill="none"' + (' stroke-dasharray="6 4"' if ln.get('dash') else '') + '/>')
    for ar in f.get('arrows', []):
        a, b = np.array(pt(ar['a'], AN)), np.array(pt(ar['b'], AN)); arrow(a, b, ar.get('c', '#d6336c'), ar.get('w', 2.4)); segs.append(('화살표', a, b))
    for pp in f.get('perp', []):   # 점에서 선(두 점)으로 내린 수선 화살표 (여유 거리 표시)
        p, a, b = [np.array(pt(v, AN)) for v in (pp['p'], pp['l'][0], pp['l'][1])]; u = (b - a) / np.linalg.norm(b - a)
        q = a + ((p - a) @ u) * u; arrow(p, q, pp.get('c', '#c0392b'), 1.8); segs.append(('수선', p, q))
        if pp.get('both', True): arrow(q, p, pp.get('c', '#c0392b'), 1.8)   # 양방향 = '사이 거리' (규정 그림처럼)
    o.append(f.get('raw', ''))
    for lb in f.get('labels', []):
        if 'p' in lb: p = lb['p']   # 그림 좌표(480 × 300)로 바로 (확대 원 안 등)
        else:
            p = AN.get(lb['a'])
            if p is None: print('  점 없음:', lb['a']); continue
            p = [p[0] * K, p[1] * K]
        x, y, an = lb['x'], lb['y'], lb.get('anchor', 'start'); w = tw(lb['t'])
        x0 = x if an == 'start' else x - w if an == 'end' else x - w / 2
        box = (x0 - 3, y - 13, x0 + w + 3, y + 4)   # 글자 상자 → 가장 가까운 테두리 점으로 선을 이음
        q = [min(max(p[0], box[0]), box[2]), min(max(p[1], box[1]), box[3])]   # 상자에서 점에 가장 가까운 곳
        d = f'M{q[0]:.1f} {q[1]:.1f}L{p[0]:.1f} {p[1]:.1f}'; segs.append((lb['t'], np.array(q, float), np.array(p, float)))
        o.append(f'<path d="{d}" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/><path d="{d}" stroke="#e8590c" stroke-width="1.2" fill="none"/>')
        o.append(f'<text x="{x:.1f}" y="{y:.1f}" text-anchor="{an}" font-weight="600" fill="#1d232a" paint-order="stroke" stroke="#fff" stroke-width="3.2" stroke-linejoin="round">{lb["t"]}</text>')
        dots.append(f'<circle cx="{p[0]:.1f}" cy="{p[1]:.1f}" r="3" fill="#e8590c" stroke="#fff" stroke-width="1.4"/>')
    for nt in f.get('notes', []):
        o.append(f'<text x="{nt["x"]:.1f}" y="{nt["y"]:.1f}" text-anchor="{nt.get("anchor", "start")}" font-weight="600" font-style="italic" fill="{nt.get("c", "#c0392b")}" paint-order="stroke" stroke="#fff" stroke-width="3.2" stroke-linejoin="round">{nt["t"]}</text>')
    o += dots; o.append('</g></svg>')
    for i in range(len(segs)):
        for j in range(i + 1, len(segs)):
            if cross(segs[i][1], segs[i][2], segs[j][1], segs[j][2]): print(f'  교차: {segs[i][0]} × {segs[j][0]}')
    return ''.join(o)

FIGJS = os.path.join(ROOT, 'js', 'figures', 'comp-figs-3d.js')
def put_svg(fid, svg):   # comp-figs-3d.js 의 키 값에서 n 번째 SVG 만 바꿈 (id__2 = 둘째 그림, 나머지는 그대로)
    key, n = (fid.split('__')[0], int(fid.split('__')[1])) if '__' in fid else (fid, 1)
    t = open(FIGJS, encoding='utf-8').read(); m = re.search(r'^"' + re.escape(key) + r'": (".*?"),?\s*$', t, re.M)
    parts = [s + '</svg>' for s in json.loads(m.group(1)).split('</svg>') if s]; parts[n - 1] = svg
    t = t[:m.start(1)] + json.dumps(''.join(parts), ensure_ascii=False) + t[m.end(1):]; open(FIGJS, 'w', encoding='utf-8', newline='\n').write(t)
def mask_of(path):   # 렌더 알파 → 480 × 300 (라벨 자동 배치용)
    return np.asarray(Image.open(path).convert('RGBA').resize((480, 300)), float)[..., 3] / 255
tmp = tempfile.mkdtemp()
for fid in (A.ids or list(SPEC['figs'])):
    f = dict(SPEC['figs'][fid]); rs = {k: v for k, v in f.items() if k not in ('labels', 'notes', 'lines', 'arrows', 'aria')}
    rs['hl'] = [dict(h, segs=[s for g in h.get('tubes', []) for s in pick(SPEC['tube_groups'][g])]) for h in f.get('hl', [])]
    for h in rs['hl']:
        h.pop('tubes', None)
        if h.pop('whole_tubes', False): h['pool'] = [t['segs'] for t in TUBES]
    if 'mono' in rs: rs['mono'] = dict(rs['mono'], pool=[s for g in rs['mono'].get('tubes', []) for s in pick(SPEC['tube_groups'][g])])
    if A.preview: rs['samples'] = 16
    sp = os.path.join(tmp, fid + '.json'); json.dump(rs, open(sp, 'w', encoding='utf-8'), ensure_ascii=False)
    png = os.path.join(tmp, fid + '.png'); an = os.path.join(A.cache or tmp, fid + '.an.json')
    if A.svg_only:
        mp = os.path.join(A.check, fid + '.webp') if A.check and os.path.exists(os.path.join(A.check, fid + '.webp')) else os.path.join(ROOT, 'img', 'comp', fid + '.webp')
        AN = json.load(open(an, encoding='utf-8')); svg = svg_of(fid, f, AN, mask_of(mp))
        if A.check: open(os.path.join(A.check, fid + '.html'), 'w', encoding='utf-8').write(svg.replace('img/comp/', '')); print('라벨만 (확인용)', fid); continue
        put_svg(fid, svg); print('라벨만', fid); continue
    r = subprocess.run([BLENDER, '-b', '-P', os.path.join(ROOT, 'tools', 'cad', 'render_part.py'), '--', '--glb', A.glb, '--spec', sp, '--out', png, '--anchors', an], capture_output=True, text=True, encoding='utf-8', errors='replace')
    if not os.path.exists(png): print(r.stdout[-3000:], r.stderr[-3000:]); sys.exit('렌더 실패: ' + fid)
    for ln in r.stdout.splitlines():
        if ln.startswith(('DRIVER', 'RENDER')): print(' ', ln)
    AN = json.load(open(an, encoding='utf-8')) if os.path.exists(an) else {}
    svg = svg_of(fid, f, AN, mask_of(png))
    if A.check:
        os.makedirs(A.check, exist_ok=True)
        Image.open(png).save(os.path.join(A.check, fid + '.webp'), 'WEBP', quality=88)
        html = os.path.join(A.check, fid + '.html'); open(html, 'w', encoding='utf-8').write(svg.replace('img/comp/', ''))
        json.dump(AN, open(os.path.join(A.check, fid + '.an.json'), 'w'), ensure_ascii=False)
        print('확인용', fid, AN); continue
    Image.open(png).save(os.path.join(ROOT, 'img', 'comp', fid + '.webp'), 'WEBP', quality=88)
    put_svg(fid, svg)
    print('반영', fid, AN)
