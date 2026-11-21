"""시안을 main 의 draft/ 폴더(공개 시안 https://koreanhanjiyun.github.io/run2x-guide/draft/)용으로 만듦.
사용: python3 tools/draft/build.py 다음에 python3 tools/draft/publish.py <main 작업 트리> → 그 트리에서 draft/ 커밋 · 푸시"""
import os, re, sys, shutil
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..')); WT = sys.argv[1]
body = open(os.path.join(ROOT, 'dist', 'draft', 'run2x_redesign.html'), encoding='utf-8').read()
body = re.sub(r'(["\'(])img/(?!3d/)', r'\1../img/', body)          # 사진 · 아이콘은 사이트(main)의 img/ 를 씀
# 부품 그림 중 main 과 달라진 것(새 렌더)은 draft/img/comp/ 에 따로 두고 그것을 씀 → 실제 사이트(main 의 img/comp)는 그대로
import filecmp
dc = os.path.join(WT, 'draft', 'img', 'comp'); os.makedirs(dc, exist_ok=True); changed = []
for f in sorted(os.listdir(os.path.join(ROOT, 'img', 'comp'))):
    src, live = os.path.join(ROOT, 'img', 'comp', f), os.path.join(WT, 'img', 'comp', f)
    if not os.path.exists(live) or not filecmp.cmp(src, live, shallow=False):
        shutil.copy(src, os.path.join(dc, f)); changed.append(f); body = body.replace('../img/comp/' + f, 'img/comp/' + f)
for f in os.listdir(dc):
    if f not in changed: os.remove(os.path.join(dc, f))               # main 과 같아진 그림은 지움
print('draft 전용 부품 그림', len(changed))
# img/ 바로 아래 파일(히어로 그림 등) 중 main 에 없거나 다른 것도 draft/img/ 에 두고 그것을 씀
dt = os.path.join(WT, 'draft', 'img'); top = []
for f in sorted(os.listdir(os.path.join(ROOT, 'img'))):
    src, live = os.path.join(ROOT, 'img', f), os.path.join(WT, 'img', f)
    if not os.path.isfile(src): continue
    if not os.path.exists(live) or not filecmp.cmp(src, live, shallow=False):
        shutil.copy(src, os.path.join(dt, f)); top.append(f); body = body.replace('../img/' + f, 'img/' + f)
for f in os.listdir(dt):
    if os.path.isfile(os.path.join(dt, f)) and f not in top: os.remove(os.path.join(dt, f))
print('draft 전용 그림', len(top))
head = ('<!doctype html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n'
        '<meta name="robots" content="noindex,nofollow">\n'
        # 같은 주소(github.io)를 쓰는 실제 사이트의 브라우저 저장값과 섞이지 않게 저장 키에 머리말
        '<script>(()=>{ const P="run2x-draft:", s=Storage.prototype, g=s.getItem, st=s.setItem, r=s.removeItem;'
        ' s.getItem=function(k){ return g.call(this, P + k); }; s.setItem=function(k, v){ return st.call(this, P + k, v); }; s.removeItem=function(k){ return r.call(this, P + k); }; })();</script>\n'
        '</head>\n<body>\n')
d = os.path.join(WT, 'draft'); os.makedirs(os.path.join(d, 'vendor', 'three'), exist_ok=True)
# 캐시 방지: 본문은 내용 해시를 붙인 app-<해시>.html 로, index.html 은 ver.txt 를 (캐시 없이) 읽어 그 파일로 넘기는 작은 안내 페이지 (내용이 늘 같아 캐시돼도 됨)
import hashlib, glob
page = head + body + '\n</body>\n</html>\n'; hv = hashlib.sha1(page.encode('utf-8')).hexdigest()[:10]; name = f'app-{hv}.html'
for old in glob.glob(os.path.join(d, 'app-*.html')):
    if os.path.basename(old) != name: os.remove(old)                   # 예전 본문은 지움 (최신 하나만)
W = lambda p: open(p, 'w', encoding='utf-8', newline='\n')           # Windows 에서도 LF 그대로
W(os.path.join(d, name)).write(page)
W(os.path.join(d, 'ver.txt')).write(name + '\n')
W(os.path.join(d, 'index.html')).write(
    '<!doctype html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n<meta name="robots" content="noindex,nofollow">\n<title>Run2X 시안</title>\n'
    '<script>fetch("ver.txt?t=" + Date.now(), {cache:"no-store"}).then(r => r.text()).then(v => location.replace(v.trim() + location.search + location.hash))'
    '.catch(() => { document.body.textContent = "시안을 불러오지 못했습니다. 새로고침해 주십시오."; });</script>\n'
    '</head>\n<body>시안 여는 중…</body>\n</html>\n')
for f in ['three.min.js', 'GLTFLoader.js', 'LICENSE']: shutil.copy(os.path.join(ROOT, 'vendor', 'three', f), os.path.join(d, 'vendor', 'three', f))
print(name, os.path.getsize(os.path.join(d, name)))
