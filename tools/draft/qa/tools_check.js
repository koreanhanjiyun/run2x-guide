// 작업창 도구 공통 점검: 열기 · 결과 · 검증표 · 콘솔 오류 · 스크린샷.  node tools_check.js [스크린샷 폴더] [도구 id …]
const H=require('./h.js');
(async()=>{ await H.start(); const b=await H.chromium.launch(); const p=await H.page(b,'lead'); const W=H.sleep, d=process.argv[2], ids=process.argv.slice(3).length ? process.argv.slice(3) : ['T','5','6','7','4','9'];
  await p.evaluate(()=>showTab('tools')); await W(500);
  console.log('rows', await p.evaluate(()=>[...document.querySelectorAll('[data-wb]')].map(x=>x.dataset.wb).join(',')));
  for(const id of ids){ await p.evaluate(i=>{ wbModeSet('ex'); localStorage.removeItem(wbStoreKey(i)); wbOpen(i,null,'ex'); }, id); await W(1500);
    const st=await p.evaluate(()=>({err:WB.err, n:WB.R ? Object.keys(WB.R.out).length : 0, cards:document.querySelectorAll('#wbout .wb-oc, #wbout section, #wbout > div > div').length}));
    if(d) await p.screenshot({path:`${d}/tool_${id}.png`});
    await p.click('[data-wbcode]'); await W(300); await p.click('[data-wbver]'); await W(2500);
    const v=await p.evaluate(()=>{ const m=document.querySelector('#wbm'); return m.querySelectorAll('tr.ok').length+' ok / '+m.querySelectorAll('tr.ng').length+' ng'; });
    await p.evaluate(()=>wbModalClose());
    console.log('tool', id, JSON.stringify(st), 'verify', v); }
  console.log('errs', p.errs, p.cons); await b.close(); await H.end(); })();
