const H=require('/home/claude/run2x-guide/tools/draft/qa/h.js');
(async()=>{ await H.start(); const b=await H.chromium.launch(); const p=await H.page(b,'lead'); const W=H.sleep;
 await p.evaluate(()=>showTab('tools')); await W(500); await p.evaluate(()=>wbOpen('7',null,'ex')); for(let i=0;i<30 && !(await p.evaluate(()=>!!WB.R));i++) await W(400);
 console.log(await p.evaluate(()=>{ const o=WB.R.out; return Object.keys(o).filter(k=>/^sh_/.test(k)).map(k=>k+'='+(+o[k]).toFixed(2)).join(' '); }));
 await b.close(); await H.end(); })();
