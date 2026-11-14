import re,glob
exec(open(__import__('os').path.join(__import__('os').path.dirname(__file__),'deadcss.py')).read().split('# 규칙 단위')[0])
css=open('css/style.css').read()
# 주석 자리를 같은 길이 공백으로 가린 사본으로 위치 계산
mask=re.sub(r'/\*.*?\*/',lambda m:' '*len(m.group(0)),css,flags=re.S)
edits=[]  # (start,end,replacement)
def split_top(sel):
    out=[];d=0;cur=''
    for ch in sel:
        if ch=='(': d+=1
        elif ch==')': d-=1
        if ch==',' and d==0: out.append(cur.strip()); cur=''
        else: cur+=ch
    out.append(cur.strip()); return out
def strip_par(x):
    r='';d=0
    for ch in x:
        if ch=='(': d+=1; continue
        if ch==')': d-=1; continue
        if d==0: r+=ch
    return r
nall=npart=0
def walk(a,b):
    global nall,npart
    i=a
    while i<b:
        j=mask.find('{',i,b)
        if j<0: break
        d=1;k=j+1
        while d and k<b:
            if mask[k]=='{': d+=1
            elif mask[k]=='}': d-=1
            k+=1
        sel=mask[i:j].strip()
        if sel.startswith('@media') or sel.startswith('@supports'): walk(j+1,k-1)
        elif sel and not sel.startswith('@'):
            sels=split_top(sel)
            dead=[x for x in sels if any(not alive(t) for t in re.findall(r'[#.]([A-Za-z_][\w-]*)',strip_par(x)))]
            s0=i+ (len(mask[i:j])-len(mask[i:j].lstrip()))
            if dead and len(dead)==len(sels):
                # 규칙 전체 지움 (선택자 앞 공백 포함, 뒤 공백 한 칸까지)
                e=k
                edits.append((s0,e,'')); nall+=1
            elif dead:
                keep=[x for x in sels if x not in dead]
                edits.append((s0,j,','.join(keep))); npart+=1
        i=k
walk(0,len(mask))
for s,e,r in sorted(edits,reverse=True): css=css[:s]+r+css[e:]
# 빈 @media 블록 지움
for _ in range(3): css=re.sub(r'@media[^{]*\{\s*\}','',css)
css=re.sub(r'\n[ \t]*\n(\s*\n)+','\n\n',css)
open('css/style.css','w').write(css); print('rules',nall,'partial',npart)
