import re,glob,collections
files=glob.glob('js/**/*.js',recursive=True)+['index.html','tools/draft/demo-mock.js']
src={f:open(f,encoding='utf-8').read() for f in files}
cnt=collections.Counter()
for s in src.values(): cnt.update(re.findall(r'[A-Za-z_$][\w$]*',s))
for f,s in src.items():
    if not f.endswith('.js'): continue
    for m in re.finditer(r'^\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)|^\s*(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=',s,re.M):
        n=m.group(1) or m.group(2)
        if cnt[n]<=1: print(f,n)
