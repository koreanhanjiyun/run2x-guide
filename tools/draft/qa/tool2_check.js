// 도구 2 점검: 작업창 열기 · 결과 · 검증표 · 결과 그래프 전환 · 트랙 고치기 · 입력 훑기(감속비) · 사용법 · 대시보드 파트별
const H=require('./h.js'); const out=process.argv[2];
(async()=>{ await H.start(); const b=await H.chromium.launch(); const p=await H.page(b,'lead');
  await p.evaluate(()=>{ document.querySelector('[data-tab="tools"],[data-t="tools"]')?.click(); }); await H.sleep(600);
  await p.evaluate(()=>wbOpen('2')); await H.sleep(1500);
  const o=await p.evaluate(()=>({out:WB.R&&WB.R.out, err:WB.err, n:WB.R&&WB.R.x.d.length}));
  console.log('ax', o.err||'', o.n, JSON.stringify(o.out,(k,v)=>typeof v==='number'?+v.toPrecision(4):v));
  if(out) await p.screenshot({path:out+'/t2_main.png', fullPage:false});
  await p.click('[data-wbver]'); await H.sleep(2500); console.log((await p.textContent('#wbm .dvi-foot')).trim().slice(0,40)); await p.click('#wbm [data-wbmx]');
  for(const v of ['end','acc','ft','ax']){ await p.click(`[data-t2view="${v}"]`); await H.sleep(900); const r=await p.evaluate(()=>({n:WB.R&&WB.R.x.d.length, sel:[...WB.sel].join(','), main:document.querySelectorAll('#wbmain polyline').length, sig:document.querySelectorAll('#wbsig polyline').length})); console.log(v, JSON.stringify(r)); }
  await p.fill('#t2trk','100, 0\n31.4159, 10\n100, 0\n31.4159, 10'); await H.sleep(1200);
  console.log('track', await p.textContent('#t2tmsg'), await p.evaluate(()=>WB.R.out.t_ax_s.toFixed(2)));
  await p.click('[data-t2ex="track"]'); await H.sleep(1000);
  await p.click('[data-t2tab="motor"]'); await H.sleep(300); await p.fill('#t2mot','0, 200\n5000, 200\n6500, 120'); await H.sleep(1200);
  console.log('motor', (await p.textContent('#t2mmsg')).slice(0,30), await p.evaluate(()=>WB.R.out.t_acc_s.toFixed(3)), await p.evaluate(()=>document.querySelectorAll('#t2mc polyline').length));
  if(out) await p.screenshot({path:out+'/t2_motor.png'});
  await p.click('[data-t2ex="motor"]'); await H.sleep(800); await p.click('[data-t2tab="track"]');
  await p.selectOption('[data-wbxa]','in:gr'); await H.sleep(2500); console.log('sweep', await p.evaluate(()=>WB.sw&&WB.sw.X?WB.sw.X.length+' '+(WB.sw.err||''):'none'));
  // 커서 → 지도 점
  await p.locator('#wbmain svg .wb-hit').click({position:{x:300,y:100}}); await H.sleep(300);
  console.log('cursor', await p.evaluate(()=>WB.xi), await p.evaluate(()=>!!document.querySelector('#t2map .t2-cur')));
  // 사용법
  await p.evaluate(()=>tourStart('wb:2')); await H.sleep(1500); const seen=[];
  for(let i=0;i<20;i++){ seen.push(await p.evaluate(()=>document.querySelector('.tour-n')?.textContent)); const nx=await p.$('[data-tour-next]'); if(!nx || /마치기/.test(await nx.textContent())) break; await nx.click(); await H.sleep(2600); }
  console.log('tour', seen.join(','));
  await p.evaluate(()=>{ try{ tourStop(); }catch(e){} });
  await p.evaluate(()=>wbClose()); await H.sleep(300);
  for(const k of ['goal','pt']){ await p.evaluate(k=>{ DASH.part=k; dashPaint(['part']); }, k); await H.sleep(1500); console.log('part', k, (await p.textContent('#t2part')).replace(/\s+/g,' ').slice(0,120)); }
  if(out){ await p.evaluate(()=>document.querySelector('#dpart').scrollIntoView()); await H.sleep(300); await p.screenshot({path:out+'/t2_part.png'}); }
  console.log('errs', JSON.stringify(p.errs), JSON.stringify(p.cons)); await b.close(); await H.end(); })();
