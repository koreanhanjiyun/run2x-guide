"""시안을 main 의 draft/ 폴더(공개 시안 https://koreanhanjiyun.github.io/run2x-guide/draft/)용으로 만듦.
사용: python3 tools/draft/build.py 다음에 python3 tools/draft/publish.py <main 작업 트리> → 그 트리에서 draft/ 커밋 · 푸시"""
import os, re, sys, shutil
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..')); WT = sys.argv[1]
body = open(os.path.join(ROOT, 'dist', 'draft', 'run2x_redesign.html'), encoding='utf-8').read()
body = re.sub(r'(["\'(])img/(?!3d/)', r'\1../img/', body)          # 사진 · 아이콘은 사이트(main)의 img/ 를 씀
head = ('<!doctype html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n'
        '<meta name="robots" content="noindex,nofollow">\n'
        # 같은 주소(github.io)를 쓰는 실제 사이트의 브라우저 저장값과 섞이지 않게 저장 키에 머리말
        '<script>(()=>{ const P="run2x-draft:", s=Storage.prototype, g=s.getItem, st=s.setItem, r=s.removeItem;'
        ' s.getItem=function(k){ return g.call(this, P + k); }; s.setItem=function(k, v){ return st.call(this, P + k, v); }; s.removeItem=function(k){ return r.call(this, P + k); }; })();</script>\n'
        '</head>\n<body>\n')
d = os.path.join(WT, 'draft'); os.makedirs(os.path.join(d, 'vendor', 'three'), exist_ok=True)
open(os.path.join(d, 'index.html'), 'w', encoding='utf-8').write(head + body + '\n</body>\n</html>\n')
for f in ['three.min.js', 'GLTFLoader.js', 'LICENSE']: shutil.copy(os.path.join(ROOT, 'vendor', 'three', f), os.path.join(d, 'vendor', 'three', f))
print(os.path.getsize(os.path.join(d, 'index.html')))
