// 시안 빌드에서 도구 탭 사용법(7단계)이 끝까지 도는지. 기대: 1 / 7 … 7 / 7, errs []
const {start,sleep,chromium,PORT,end}=require('./h'); const {fpage}=require('./h2'); const ev=(p,f,a)=>p.evaluate(f,a);
(async()=>{ await start(); const b=await chromium.launch(); const p=await fpage(b,`http://127.0.0.1:${PORT}/_t.html`,'admin',{W:1920,H:1080});
 await ev(p,()=>showTab('tools')); await sleep(600); await ev(p,()=>tourStart('tools')); await sleep(1500); const seen=[];
 for(let i=0;i<30;i++){ seen.push(await ev(p,()=>document.querySelector('.tour-n')?.textContent)); const nx=await p.$('[data-tour-next]'); if(!nx || /마치기/.test(await nx.textContent())) break; await nx.click(); await sleep(2600); }
 console.log(seen.join(','),'errs',p.errs); await p.context().close(); await b.close(); await end(); })();
