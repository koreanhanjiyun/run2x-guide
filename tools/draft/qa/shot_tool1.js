// 도구 1 화면 그림 (dist/draft/): 결과 카드 · 드라이버 모델 · 대시보드 파트별. 검증표 결과도 출력
const {start,sleep,chromium,PORT,end,S}=require('./h'); const {fpage}=require('./h2'); const ev=(p,f,a)=>p.evaluate(f,a);
(async()=>{ await start(); const b=await chromium.launch(); const p=await fpage(b,`http://127.0.0.1:${PORT}/_t.html`,'admin',{W:1920,H:1080});
 await ev(p,()=>showTab('tools')); await sleep(600); await p.click('[data-wb="1"]'); await sleep(2500);
 await (await p.$('#wb .wb-sec[aria-label="결과"]')).screenshot({path:S+'/shot_out.png'});
 await (await p.$('#wbmain')).screenshot({path:S+'/shot_main.png'});
 await p.click('[data-m1tab="drv"]'); await sleep(900); await (await p.$('#wbext')).screenshot({path:S+'/shot_drv.png'});
 await p.click('[data-wbver]'); await sleep(1500); console.log('verify', await ev(p,()=>document.querySelector('#wbm .dvi-foot span').textContent.trim())); await ev(p,()=>wbModalClose());
 await p.click('[data-wbcmp]'); await sleep(600); await (await p.$('#wb .wb-sec[aria-label="결과"]')).screenshot({path:S+'/shot_cmp.png'});
 console.log('errs',p.errs,p.cons); await p.context().close(); await b.close(); await end(); })();
