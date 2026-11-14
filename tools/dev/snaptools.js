const H=require(process.argv[2]+'/tools/draft/qa/h.js'); const out=process.argv[3];
(async()=>{ await H.start(); const b=await H.chromium.launch(); const W=H.sleep; const p=await H.page(b,'lead',{W:1600,H:900});
 await p.addStyleTag({content:'*{animation:none!important;transition:none!important;caret-color:transparent!important} #demoBar{display:none!important}'});
 await p.evaluate(()=>showTab('tools')); await W(600);
 for(const id of ['1','2','3','4','5','6','7','8','9','G','T']){ await p.evaluate(i=>{ wbModeSet('ex'); localStorage.removeItem(wbStoreKey(i)); wbOpen(i,null,'ex'); }, id); await W(id==='2'?9000:2500);
   for(const tab of ['res','edit']){ await p.evaluate(t=>{ try{ wbTabSet(t); }catch(e){} },tab); await W(id==='2'?4000:1500); await p.screenshot({path:`${out}/t${id}_${tab}.png`}); } }
 require('fs').writeFileSync(out+'/terr.json',JSON.stringify(p.errs.concat(p.cons))); await b.close(); await H.end(); })();
