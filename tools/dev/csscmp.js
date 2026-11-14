const {chromium}=require('playwright'); const fs=require('fs');
(async()=>{ const b=await chromium.launch(); const p=await b.newPage();
 const A=fs.readFileSync(process.argv[2],'utf8'), B=fs.readFileSync(process.argv[3],'utf8');
 const r=await p.evaluate(([A,B])=>{ const sel=t=>{ const s=new CSSStyleSheet(); s.replaceSync(t); const out=[]; const walk=(rs,pre)=>{ for(const r of rs){ if(r.selectorText) out.push(pre+r.selectorText); else if(r.cssRules) walk(r.cssRules, pre+(r.conditionText||'')+'|'); } }; walk(s.cssRules,''); return out; };
   const a=sel(A), b=sel(B), sb=new Set(b), sa=new Set(a); return {na:a.length, nb:b.length, missing:a.filter(x=>!sb.has(x)).slice(0,600), extra:b.filter(x=>!sa.has(x)).slice(0,50)}; },[A,B]);
 console.log(r.na, r.nb); fs.writeFileSync(require('os').tmpdir()+'/css_missing.txt', r.missing.join('\n')); console.log('extra', r.extra.slice(0,20)); await b.close(); })();
