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
ap.add_argument('--glb', required=True); ap.add_argument('--tubes', default=''); ap.add_argument('--check', default='')
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
def svg_of(fid, f, AN):
    o = [f'<svg viewBox="0 0 480 300" role="img" class="cfig3" aria-label="{f["aria"]}"><image href="img/comp/{fid}.webp" x="0" y="0" width="480" height="300"/><g font-family="{FONT}" font-size="12.5">']
    dots = []
    for ln in f.get('lines', []):
        a, b = pt(ln['a'], AN), pt(ln['b'], AN)
        o.append(f'<path d="M{a[0]:.1f} {a[1]:.1f}L{b[0]:.1f} {b[1]:.1f}" stroke="{ln.get("c", "#c0392b")}" stroke-width="1.3" fill="none"' + (' stroke-dasharray="5 4"' if ln.get('dash') else '') + '/>')
    for ar in f.get('arrows', []):
        a, b = np.array(pt(ar['a'], AN)), np.array(pt(ar['b'], AN)); c = ar.get('c', '#d6336c'); u = (b - a) / max(np.linalg.norm(b - a), 1e-6); n = np.array([-u[1], u[0]])
        h1, h2 = b - u * 9 + n * 4.5, b - u * 9 - n * 4.5
        o.append(f'<path d="M{a[0]:.1f} {a[1]:.1f}L{(b - u * 7)[0]:.1f} {(b - u * 7)[1]:.1f}" stroke="{c}" stroke-width="{ar.get("w", 2.4)}" fill="none"/><path d="M{b[0]:.1f} {b[1]:.1f}L{h1[0]:.1f} {h1[1]:.1f}L{h2[0]:.1f} {h2[1]:.1f}Z" fill="{c}"/>')
    for pp in f.get('perp', []):   # 점에서 선(두 점)으로 내린 수선 화살표 (여유 거리 표시)
        p, a, b = [np.array(pt(v, AN)) for v in (pp['p'], pp['l'][0], pp['l'][1])]; u = (b - a) / np.linalg.norm(b - a)
        b = a + ((p - a) @ u) * u; a = p; c = pp.get('c', '#c0392b'); u = (b - a) / max(np.linalg.norm(b - a), 1e-6); n = np.array([-u[1], u[0]])
        h1, h2 = b - u * 7 + n * 3.5, b - u * 7 - n * 3.5
        o.append(f'<path d="M{a[0]:.1f} {a[1]:.1f}L{(b - u * 5)[0]:.1f} {(b - u * 5)[1]:.1f}" stroke="{c}" stroke-width="1.6" fill="none"/><path d="M{b[0]:.1f} {b[1]:.1f}L{h1[0]:.1f} {h1[1]:.1f}L{h2[0]:.1f} {h2[1]:.1f}Z" fill="{c}"/>')
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
        d = f'M{q[0]:.1f} {q[1]:.1f}L{p[0]:.1f} {p[1]:.1f}'
        o.append(f'<path d="{d}" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/><path d="{d}" stroke="#e8590c" stroke-width="1.2" fill="none"/>')
        o.append(f'<text x="{x:.1f}" y="{y:.1f}" text-anchor="{an}" font-weight="600" fill="#1d232a" paint-order="stroke" stroke="#fff" stroke-width="3.2" stroke-linejoin="round">{lb["t"]}</text>')
        dots.append(f'<circle cx="{p[0]:.1f}" cy="{p[1]:.1f}" r="3" fill="#e8590c" stroke="#fff" stroke-width="1.4"/>')
    for nt in f.get('notes', []):
        o.append(f'<text x="{nt["x"]:.1f}" y="{nt["y"]:.1f}" text-anchor="{nt.get("anchor", "start")}" font-weight="600" font-style="italic" fill="{nt.get("c", "#c0392b")}" paint-order="stroke" stroke="#fff" stroke-width="3.2" stroke-linejoin="round">{nt["t"]}</text>')
    o += dots; o.append('</g></svg>')
    return ''.join(o)

FIGJS = os.path.join(ROOT, 'js', 'figures', 'comp-figs-3d.js')
tmp = tempfile.mkdtemp()
for fid in (A.ids or list(SPEC['figs'])):
    f = dict(SPEC['figs'][fid]); rs = {k: v for k, v in f.items() if k not in ('labels', 'notes', 'lines', 'arrows', 'aria')}
    rs['hl'] = [dict(h, segs=[s for g in h.get('tubes', []) for s in pick(SPEC['tube_groups'][g])]) for h in f.get('hl', [])]
    for h in rs['hl']:
        h.pop('tubes', None)
        if h.pop('whole_tubes', False): h['pool'] = [t['segs'] for t in TUBES]
    if 'mono' in rs: rs['mono'] = dict(rs['mono'], pool=[s for g in rs['mono'].get('tubes', []) for s in pick(SPEC['tube_groups'][g])])
    sp = os.path.join(tmp, fid + '.json'); json.dump(rs, open(sp, 'w', encoding='utf-8'), ensure_ascii=False)
    png = os.path.join(tmp, fid + '.png'); an = os.path.join(tmp, fid + '.an.json')
    r = subprocess.run([BLENDER, '-b', '-P', os.path.join(ROOT, 'tools', 'cad', 'render_part.py'), '--', '--glb', A.glb, '--spec', sp, '--out', png, '--anchors', an], capture_output=True, text=True, encoding='utf-8', errors='replace')
    if not os.path.exists(png): print(r.stdout[-3000:], r.stderr[-3000:]); sys.exit('렌더 실패: ' + fid)
    for ln in r.stdout.splitlines():
        if ln.startswith(('DRIVER', 'RENDER')): print(' ', ln)
    AN = json.load(open(an, encoding='utf-8')) if os.path.exists(an) else {}
    svg = svg_of(fid, f, AN)
    if A.check:
        os.makedirs(A.check, exist_ok=True)
        Image.open(png).save(os.path.join(A.check, fid + '.webp'), 'WEBP', quality=88)
        html = os.path.join(A.check, fid + '.html'); open(html, 'w', encoding='utf-8').write(svg.replace('img/comp/', ''))
        json.dump(AN, open(os.path.join(A.check, fid + '.an.json'), 'w'), ensure_ascii=False)
        print('확인용', fid, AN); continue
    Image.open(png).save(os.path.join(ROOT, 'img', 'comp', fid + '.webp'), 'WEBP', quality=88)
    t = open(FIGJS, encoding='utf-8').read()
    m = re.search(r'^"' + re.escape(fid) + r'": (".*?"),?\s*$', t, re.M)
    old = json.loads(m.group(1)); rest = old[old.index('</svg>') + 6:]   # 둘째 그림(단면 등)은 그대로
    new = json.dumps(svg + rest, ensure_ascii=False)
    t = t[:m.start(1)] + new + t[m.end(1):]
    open(FIGJS, 'w', encoding='utf-8', newline='\n').write(t)
    print('반영', fid, AN)
