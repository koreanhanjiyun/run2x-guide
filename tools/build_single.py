"""index.html + css + js 를 한 파일로 합칩니다 (Claude 아티팩트 게시·오프라인 배포용).
사용: python3 tools/build_single.py [출력경로]   (기본: dist/run2x_guide.html)"""
import os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'dist', 'run2x_guide.html')
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
html = re.sub(r'<link rel="stylesheet" href="(css/[^"?]+)(?:\?v=[^"]*)?">', lambda m: '<style>\n' + css_inline(m.group(1)) + '</style>', html)
def js_inline(path):
    c = rd(path)
    # 부품 그림 파일의 이미지 주소(img/comp/…webp)는 data: 주소로 넣음
    if path.endswith('comp-figs-3d.js'):
        c = re.sub(r'img/comp/([\w-]+\.webp)', lambda m: 'data:image/webp;base64,' + base64.b64encode(open(os.path.join(ROOT, 'img', 'comp', m.group(1)), 'rb').read()).decode(), c)
    return c
html = re.sub(r'<script src="((?:js|vendor)/[^"?]+)(?:\?v=[^"]*)?"></script>', lambda m: '<script>\n' + js_inline(m.group(1)).replace('</script>', '<\\/script>') + '</script>', html)
# 아티팩트는 자체 문서 틀을 씌우므로 doctype·html·head·body 태그를 뺀 본문만 남김
body = re.sub(r'(?s)^.*?<head>\s*', '', html)
body = re.sub(r'(?s)<meta charset="utf-8">\s*<meta name="viewport"[^>]*>\s*', '', body)
body = body.replace('</head>\n<body>\n', '\n').replace('</body>\n</html>\n', '')
body = body.replace('<meta name="robots" content="noindex,nofollow">\n', '')
body = '<meta name="claude:viewport-fit-sides" content="cover">\n' + body if '<title>' not in body[:300] else body.replace('</title>', '</title>\n<meta name="claude:viewport-fit-sides" content="cover">', 1)
os.makedirs(os.path.dirname(out), exist_ok=True)
open(out, 'w', encoding='utf-8').write(body)
print(out, len(body))
