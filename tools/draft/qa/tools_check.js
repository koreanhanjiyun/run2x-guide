// 작업창 도구 공통 점검: 열기 · 결과 · 검증표 · 콘솔 오류 · 스크린샷.  node tools_check.js [스크린샷 폴더 | -] [도구 id …]
/* 첫 인자가 숫자(포트 · 도구 번호)면 폴더로 쓰지 않고 멈춤: 예전에 포트를 넣어 저장소에 8765/ 폴더가 생겼음 (119차). 스크린샷 없이 도구만 고르려면 첫 인자를 - 로 */
if(/^\d+$/.test(process.argv[2]||'')){ console.error('첫 인자는 스크린샷 폴더입니다 (숫자 "'+process.argv[2]+'" 는 받지 않음). 스크린샷 없이 도구만 고르려면: node tools_check.js - 1 3 8'); process.exit(1); }
const H=require('./h.js');
(async()=>{ await H.start(); const b=await H.chromium.launch(); const p=await H.page(b,'lead'); const W=H.sleep, d=process.argv[2]==='-' ? '' : process.argv[2], ids=process.argv.slice(3).length ? process.argv.slice(3) : ['T','5','6','7','4','9'];
  await p.evaluate(()=>showTab('tools')); await W(500);
  console.log('rows', await p.evaluate(()=>[...document.querySelectorAll('[data-wb]')].map(x=>x.dataset.wb).join(',')));
  for(const id of ids){ await p.evaluate(i=>{ wbModeSet('ex'); localStorage.removeItem(wbStoreKey(i)); wbOpen(i,null,'ex'); }, id); await W(1500);
    const st=await p.evaluate(()=>({err:WB.err, n:WB.R ? Object.keys(WB.R.out).length : 0, cards:document.querySelectorAll('#wbout .wb-oc, #wbout section, #wbout > div > div').length}));
    if(d) await p.screenshot({path:`${d}/tool_${id}.png`});
    await p.click('[data-wbcode]'); await W(300); await p.click('[data-wbver]'); await W(id==='2'||id==='G' ? 90000 : 2500);
    const v=await p.evaluate(()=>{ const m=document.querySelector('#wbm'); return m.querySelectorAll('tr.ok').length+' ok / '+m.querySelectorAll('tr.ng').length+' ng'; });
    await p.evaluate(()=>wbModalClose());
    console.log('tool', id, JSON.stringify(st), 'verify', v); }
  console.log('errs', p.errs, p.cons); await b.close(); await H.end(); })();
