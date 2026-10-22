"""index.html 이 부르는 css·js 주소 끝에 ?v=<시각> 꼬리표를 붙입니다.
파일을 바꿔 올릴 때마다 실행하면, 방문자 브라우저가 예전 파일(캐시) 대신 새 파일을 받습니다.
사용: python3 tools/stamp.py"""
import os, re, time
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
p = os.path.join(ROOT, 'index.html')
s = open(p, encoding='utf-8').read()
v = time.strftime('%Y%m%d%H%M')
s, n = re.subn(r'((?:href|src)="(?:css|js)/[^"?]+)(?:\?v=[^"]*)?"', lambda m: f'{m.group(1)}?v={v}"', s)
open(p, 'w', encoding='utf-8').write(s)
print(f'{n}개 파일에 ?v={v}')
