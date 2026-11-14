import re,sys
def end_of(s,i):
    """i = start of def; return index of last char of the statement (closing } or ;)"""
    j=i; n=len(s); depth=0; seen=False; mode=[None]  # mode stack: None=code, '`'=template; tpl brace depth markers
    marks=[]
    while j<n:
        c=s[j]; m=mode[-1]
        if m in ("'",'"'):
            if c=='\\': j+=2; continue
            if c==m: mode.pop()
            j+=1; continue
        if m=='`':
            if c=='\\': j+=2; continue
            if c=='`': mode.pop(); j+=1; continue
            if c=='$' and s[j+1:j+2]=='{': mode.append(None); marks.append(depth); depth+=1; j+=2; continue
            j+=1; continue
        if c in '\'"`': mode.append(c); j+=1; continue
        if c=='/' and s[j+1:j+2]=='*': j=s.index('*/',j)+2; continue
        if c=='/' and s[j+1:j+2]=='/': j=s.index('\n',j); continue
        if c=='=' and depth==0: seen=True
        if c in '{[(': depth+=1; seen=True
        elif c in '}])':
            depth-=1
            if c=='}' and marks and depth==marks[-1]: marks.pop(); mode.pop(); j+=1; continue
            if seen and depth==0 and c=='}':
                k=j+1
                while k<n and s[k] in ' \t': k+=1
                if s[k:k+1]==';': return k
                # arrow fn const: maybe followed by ; later on line
                return j
        elif c==';' and depth==0 and seen: return j
        elif c=='\n' and depth==0 and seen: return j-1
        j+=1
    raise SystemExit('no end')
def rmdef(path,name):
    s=open(path).read()
    m=re.search(r'^[ \t]*(?:async\s+)?function\s+'+re.escape(name)+r'\b|^[ \t]*(?:const|let)\s+'+re.escape(name)+r'\s*=',s,re.M)
    assert m,(path,name)
    i=m.start(); e=end_of(s,i)
    k=s.find('\n',e); k=len(s) if k<0 else k
    rest=s[e+1:k].strip()
    if rest and not rest.startswith('/*') and not rest.startswith('//'):
        raise SystemExit(f'trailing code after {name} in {path}: {rest[:80]!r}')
    open(path,'w').write(s[:i]+s[k+1:])
if __name__=='__main__':
    for a in sys.argv[1:]:
        p,n=a.split(':'); rmdef(p,n); print('rm',p,n)
