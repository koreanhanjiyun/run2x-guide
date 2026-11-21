const H=require(require('path').join(__dirname,'..','draft','qa','h.js')); const out=process.argv[2];
(async()=>{ await H.start(); const b=await H.chromium.launch(); const W=H.sleep; const fs=require('fs'); const txt={};
 for(const role of ['none','member','admin']){ const p=await H.page(b,role,{W:1600,H:900});
  await p.addStyleTag({content:'*{animation:none!important;transition:none!important;caret-color:transparent!important} #demoBar{display:none!important}'});
  for(const t of ['start','steps','graph','tools','ref','team']){ await p.evaluate(t=>{ showTab(t); scrollTo(0,0); },t); await W(1500);
    await p.screenshot({path:`${out}/${role}_${t}.png`}); txt[role+'_'+t]=await p.evaluate(()=>document.body.innerText.length+' '+document.querySelectorAll('*').length); }
  txt[role+'_errs']=p.errs.concat(p.cons); await p.context().close(); }
 fs.writeFileSync(out+'/txt.json',JSON.stringify(txt,null,1)); await b.close(); await H.end(); })();
