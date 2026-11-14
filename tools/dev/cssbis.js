const {chromium}=require('playwright'); const fs=require('fs');
(async()=>{ const b=await chromium.launch(); const p=await b.newPage(); const T=fs.readFileSync('css/style.css','utf8');
 const r=await p.evaluate(T=>{ const cnt=t=>{ const s=new CSSStyleSheet(); s.replaceSync(t); let n=0; const w=rs=>{ for(const r of rs){ n++; if(r.cssRules) w(r.cssRules); } }; w(s.cssRules); return n; };
  const res=[]; let prev=0; for(let k=2000;k<=T.length+2000;k+=2000){ const c=cnt(T.slice(0,k)); res.push([k,c]); } return res; }, T);
 let best=0; for(let i=1;i<r.length;i++){ if(r[i][1]<=r[i-1][1]){ console.log('stall at', r[i-1][0], r[i][0], r[i][1]); break; } }
 await b.close(); })();
