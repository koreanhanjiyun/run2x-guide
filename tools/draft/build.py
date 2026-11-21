"""시안(데모) 빌드: index.html + css + js 를 한 파일로 합치고 가짜 저장소(demo-mock.js)를 넣습니다.
사용: python3 tools/draft/build.py   → dist/draft/run2x_redesign.html (아티팩트용 본문) + dist/draft/_t.html (검사용 완전한 문서)
실제 Firebase 에 연결하지 않습니다 (demo-mock.js 가 firebase 대역을 미리 넣음)."""
import os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'dist', 'draft', 'run2x_redesign.html')
html = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
rd = lambda p: open(os.path.join(ROOT, p), encoding='utf-8').read()
import base64
# 부품 그림은 사이트에서는 필요할 때 불러오지만, 한 파일판에는 미리 넣음
html = re.sub(r'(<script src="js/figures/comp-figs\.js[^"]*"></script>)', lambda m: m.group(1) + '\n<script src="js/figures/comp-figs-3d.js"></script>', html)
# 그림 창을 열 때 따로 불러오는 좌표계 그림 파일도 한 파일 안에 미리 넣음
html = re.sub(r'(<script src="js/figures/modes-anim\.js[^"]*"></script>)', r'<script src="js/figures/coord-figs.js"></script>\n\1', html)
def css_inline(path):
    c = rd(path)
    # css 안의 이미지 주소(../img/…)는 data: 주소로 넣음 (아티팩트는 파일 하나)
    return re.sub(r'url\(\.\./(img/[^)]+\.png)\)', lambda m: 'url(data:image/png;base64,' + base64.b64encode(open(os.path.join(ROOT, m.group(1)),'rb').read()).decode() + ')', c)
# 시안 데모: 역할(비로그인·팀원·파트장·관리자)을 바꿔 보는 가짜 저장소 + 전환 막대 (사이트 저장소에는 넣지 않음)
MOCK = open(os.path.join(HERE, 'demo-mock.js'), encoding='utf-8').read()
# 더미 팀 (tools/dummy/run2x-dummy-team.json, node tools/dummy/make.js 로 만듦) → 가짜 저장소 기본 데이터
MOCK = 'window.__RUN2X_DUMMY = ' + open(os.path.join(ROOT, 'tools', 'dummy', 'run2x-dummy-team.json'), encoding='utf-8').read().replace('</', '<\\/') + ';\n' + MOCK
html = html.replace('<script src="js/core/boot.js', '<script>\n' + MOCK + '</script>\n<script src="js/core/boot.js', 1)
html = re.sub(r'<link rel="stylesheet" href="(css/[^"?]+)(?:\?v=[^"]*)?">', lambda m: '<style>\n' + css_inline(m.group(1)) + '</style>', html)
def js_inline(path):
    c = rd(path)
    # 부품 그림 파일의 이미지 주소(img/comp/…webp)는 data: 주소로 넣음
    if path.endswith('workbench.js'):   # 아티팩트는 .glb 를 서빙하지 않음 → data: 주소로
        c = c.replace("'img/3d/ref4s.glb'", "'data:model/gltf-binary;base64," + base64.b64encode(open(os.path.join(ROOT, 'img', '3d', 'ref4s.glb'), 'rb').read()).decode() + "'")
    if False:
        c = re.sub(r'img/comp/([\w-]+\.webp)', lambda m: 'data:image/webp;base64,' + base64.b64encode(open(os.path.join(ROOT, 'img', 'comp', m.group(1)), 'rb').read()).decode(), c)
    return c
html = re.sub(r'<script (?:defer (?:onerror="[^"]*" )?)?src="((?:js|vendor)/[^"?]+)(?:\?v=[^"]*)?"></script>', lambda m: '<script>\n' + js_inline(m.group(1)).replace('</script>', '<\\/script>') + '</script>', html)
# 아티팩트는 자체 문서 틀을 씌우므로 doctype·html·head·body 태그를 뺀 본문만 남김
body = re.sub(r'(?s)^.*?<head>\s*', '', html)
body = re.sub(r'(?s)<meta charset="utf-8">\s*<meta name="viewport"[^>]*>\s*', '', body)
body = body.replace('</head>\n<body>\n', '\n').replace('</body>\n</html>\n', '')
body = body.replace('<meta name="robots" content="noindex,nofollow">\n', '')
body = '<meta name="claude:viewport-fit-sides" content="cover">\n' + body if '<title>' not in body[:300] else body.replace('</title>', '</title>\n<meta name="claude:viewport-fit-sides" content="cover">', 1)
os.makedirs(os.path.dirname(out), exist_ok=True)
open(out, 'w', encoding='utf-8', newline='\n').write(body)
open(os.path.join(os.path.dirname(out), '_t.html'), 'w', encoding='utf-8', newline='\n').write('<!doctype html><meta charset="utf-8">' + body)
print(out, len(body))
