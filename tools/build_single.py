"""index.html + css + js 를 한 파일로 합칩니다 (Claude 아티팩트 게시·오프라인 배포용).
사용: python3 tools/build_single.py [출력경로]   (기본: dist/run2x_guide.html)"""
import os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'dist', 'run2x_guide.html')
html = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
rd = lambda p: open(os.path.join(ROOT, p), encoding='utf-8').read()
html = re.sub(r'<link rel="stylesheet" href="(css/[^"]+)">', lambda m: '<style>\n' + rd(m.group(1)) + '</style>', html)
html = re.sub(r'<script src="(js/[^"]+)"></script>', lambda m: '<script>\n' + rd(m.group(1)).replace('</script>', '<\\/script>') + '</script>', html)
# 아티팩트는 자체 문서 틀을 씌우므로 doctype·html·head·body 태그를 뺀 본문만 남김
body = re.sub(r'(?s)^.*?<head>\s*', '', html)
body = re.sub(r'(?s)<meta charset="utf-8">\s*<meta name="viewport"[^>]*>\s*', '', body)
body = body.replace('</head>\n<body>\n', '\n').replace('</body>\n</html>\n', '')
body = body.replace('<meta name="robots" content="noindex,nofollow">\n', '')
body = '<meta name="claude:viewport-fit-sides" content="cover">\n' + body if '<title>' not in body[:300] else body.replace('</title>', '</title>\n<meta name="claude:viewport-fit-sides" content="cover">', 1)
os.makedirs(os.path.dirname(out), exist_ok=True)
open(out, 'w', encoding='utf-8').write(body)
print(out, len(body))
