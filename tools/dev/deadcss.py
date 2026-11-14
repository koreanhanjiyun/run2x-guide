import re,glob,sys
files=glob.glob('js/**/*.js',recursive=True)+['index.html','tools/draft/demo-mock.js']+glob.glob('tools/draft/*.py')
txt='\n'.join(open(f,encoding='utf-8').read() for f in files)
css=open('css/style.css',encoding='utf-8').read()
words=set(re.findall(r'[A-Za-z_][\w-]*',txt))
def alive(tok):
    if tok in words: return True
    # 동적으로 만드는 이름: 'xx-'+..., `xx-${..}`
    for k in range(len(tok)-1,2,-1):
        if tok[k]=='-' and (tok[:k+1]+"'" in txt or tok[:k+1]+'${' in txt or tok[:k+1]+'"+' in txt or "'"+tok[:k+1]+"'" in txt): return True
    return False
# 규칙 단위: 주석 지우고 { } 짝으로
c=re.sub(r'/\*.*?\*/','',css,flags=re.S)
out=[]; i=0; n=len(c)
def parse(block,base):
    i=0
    while i<len(block):
        j=block.find('{',i)
        if j<0: break
        sel=block[i:j].strip()
        d=1;k=j+1
        while d and k<len(block):
            if block[k]=='{': d+=1
            elif block[k]=='}': d-=1
            k+=1
        body=block[j+1:k-1]
        if sel.startswith('@media') or sel.startswith('@supports'): parse(body,base)
        elif not sel.startswith('@'):
            sels=[x.strip() for x in sel.split(',')]
            dead=[x for x in sels if any(not alive(t) for t in re.findall(r'[#.]([A-Za-z_][\w-]*)',x))]
            if dead: out.append((len(dead)==len(sels),sel[:150],[x for x in dead][:4]))
        i=k
parse(c,'')
for full,sel,d in out: print('ALL ' if full else 'PART', sel if full else d)
