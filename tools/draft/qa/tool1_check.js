// 시안 빌드에서 도구 1 확인: 카드 끼워 넣기(줄마다 왼쪽 정렬), 드라이버 선택, 검증표, 도움말 12단계. 그림은 dist/draft/ 에 저장
const {start,sleep,chromium,PORT,end,S}=require('./h'); const {fpage}=require('./h2'); const ev=(p,f,a)=>p.evaluate(f,a);
(async()=>{ await start(); const b=await chromium.launch(); const p=await fpage(b,`http://127.0.0.1:${PORT}/_t.html`,'admin',{W:1920,H:1080});
 await ev(p,()=>showTab('tools')); await sleep(600); await p.click('[data-wb="1"]'); await sleep(2500); await ev(p,()=>wbTabSet('edit')); await sleep(500);
 const rows=async()=>(await ev(p,()=>m1Layout(m1Groups()).rows)).map(r=>r.map(x=>x.slice(-2)).join(' ')).join(' | ');
 const L=await ev(p,()=>m1Layout(m1Groups()).rows); console.log('rows    ', await rows());
 await ev(p,()=>document.querySelector('.wb-right').scrollTo(0,0)); await sleep(300);
 const mv=L[3][0], tg=L[1][2]; const g=await p.$(`[data-m1g="${mv}"] [data-m1grip]`); await g.scrollIntoViewIfNeeded(); await sleep(200);
 const gb=await (await p.$(`[data-m1g="${mv}"] [data-m1grip]`)).boundingBox(); await p.mouse.move(gb.x+5,gb.y+5); await p.mouse.down();
 const tb=await (await p.$(`[data-m1g="${tg}"]`)).boundingBox(); await p.mouse.move(tb.x+120,tb.y+60,{steps:10}); await sleep(200); await p.mouse.up(); await sleep(900);
 console.log('insert  ', await rows(), '(넘친 카드는 바로 아래 새 줄)');
 await ev(p,()=>document.querySelector('.wb-right').scrollTo(0,0)); await p.selectOption('[data-m1dsel]','d3'); await sleep(1200);
 console.log('driver d3 card mass', await ev(p,()=>document.querySelector('[data-m1dc="mass"]').value), '= model', await ev(p,()=>(m1Drv('d3')||{}).mass));
 await p.click('.wb-bar [data-wbcode]'); await sleep(300); await p.click('#wbm [data-wbver]'); await sleep(1500); console.log('verify', await ev(p,()=>document.querySelector('#wbm .dvi-foot span').textContent.trim())); await ev(p,()=>wbModalClose());
 await p.click('[data-tour="wb:1"]'); await sleep(2500); const seen=[];
 for(let i=0;i<20;i++){ seen.push(await ev(p,()=>document.querySelector('.tour-n')?.textContent)); const nx=await p.$('[data-tour-next]'); if(!nx || /마치기/.test(await nx.textContent())) break; await nx.click(); await sleep(4500); }
 { const fin=await p.$('[data-tour-next]'); if(fin) await fin.click(); await sleep(1500); }
 console.log('help', seen.join(','), '(탭을 누르는 단계는 한 번 더 기다림)');
 await ev(p,()=>wbTabSet('edit')); await sleep(400); await p.click('[data-m1tab="drv"]'); await sleep(900); await (await p.$('#wbext')).screenshot({path:S+'/tool1_drv.png'});
 console.log('errs',p.errs,p.cons); await p.context().close(); await b.close(); await end(); })();
