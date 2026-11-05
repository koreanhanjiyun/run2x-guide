// 도구 2 점검: 작업창 · 결과(감속비 모드 · 3행) · 검증표(코드 창 안) · 코스 5개(같은 모양, 공식은 비활성) · 볼 랩 · 내 코스 표 고치기(칸 · # 옮기기 · × · + 구간)
//   · 코스 입력하기(붙여넣기 · .xlsx/.csv 가져오기 · 양식 받기) · 모터 · 효율 탭 · 입력 훑기 · 모양 보기 · 사용법 · 대시보드 파트별.
//   node tool2_check.js [스크린샷 폴더] [xlsx] [csv]
const H=require('./h.js'); const [out, xlsx, csv]=process.argv.slice(2);
(async()=>{ await H.start(); const b=await H.chromium.launch(); const p=await H.page(b,'lead');
  const R=()=>p.evaluate(()=>WB.R&&WB.R.out); const f=(v,d=2)=>typeof v==='number'?v.toFixed(d):v; const W=ms=>H.sleep(ms);
  const rows=()=>p.evaluate(()=>t2Track(T2.free.text).rows.map(r=>[+r.l.toFixed(2),+r.R.toFixed(2)]).join(' | '));
  const cell=async(i,k,v)=>{ await p.click(`#t2tt [data-t2e="${i},${k}"]`); await W(150); const e=await p.$(`#t2tt [data-t2e="${i},${k}"] .t2-ci`); if(k==='type') await e.selectOption(v); else { await e.fill(String(v)); await e.press('Enter'); } await W(400); };
  await p.evaluate(()=>showTab('tools')); await W(600); await p.evaluate(()=>wbOpen('2')); await W(5000);
  let o=await R(); console.log('open', 'gr_use', o.gr_use, 'acc', f(o.t_acc_s,3), 'ax', f(o.t_ax_s), 'end', f(o.t_end_s,1), 'avg', f(o.t_endavg), 'best', o.gr_opt, o.gr_acc, o.gr_ax, o.gr_end, 'd', f(o.d_acc,3), f(o.d_end,2), 'err', await p.evaluate(()=>WB.err));
  console.log('result cards', await p.locator('#wbout .wb-oc').count(), 'grt', await p.locator('#wbout .t2-grt').count(), 'mode btns', await p.locator('#wbout [data-t2gm]').count(), 'cmp btn', await p.locator('[data-wbcmp]').count(), 'main', await p.locator('#wbmain').count());
  console.log('minsec', await p.evaluate(()=>[...document.querySelectorAll('#wbout .wb-ov b')].map(x=>x.textContent).filter(t=>/분/.test(t)).join(' / ')));
  await p.click('#wbout [data-t2gm="opt"]'); await W(5000); o=await R(); console.log('opt', 'gr_use', o.gr_use, 'c_gr', o.c_gr, 'd_acc', f(o.d_acc,3), 'd_end', f(o.d_end,2), (await p.textContent('#wbout .wb-oc:nth-child(2) h4')).trim().slice(0,40));
  if(out) await p.screenshot({path:out+'/t2_opt.png'});
  await p.click('#wbout [data-t2gm="my"]'); await W(5000);
  await p.click('.wb-bar [data-wbcode]'); await W(300); await p.click('#wbm [data-wbver]'); await W(30000); console.log('verify', (await p.textContent('#wbm .dvi-foot')).trim().slice(0,40));
  console.log('code lines', await p.evaluate(()=>WB_TOOLS['2'].code.split('\n').length)); await p.click('#wbm [data-wbmx]');
  for(const c of ['ax','acc','skid','free','end']){ await p.click(`[data-t2course="${c}"]`); await W(5000); const r=await p.evaluate(()=>({n:WB.R&&WB.R.x.d.length, rows:document.querySelectorAll('#t2tt tbody tr').length, edit:document.querySelectorAll('#t2tt [data-t2e]').length, laps:document.querySelector('[data-t2o="laps"]').disabled, menu:document.querySelector('[data-t2menu]').disabled, lapsel:document.querySelector('[data-t2lap]').disabled, cones:document.querySelectorAll('#t2map .t2-cone').length, leg:!!document.querySelector('#t2mcap .t2-mleg'), card:(document.querySelector('#wbout .t2-orow.three h4 span')||{}).textContent, err:WB.err}));
    console.log('course', c, JSON.stringify(r)); if(out) await p.screenshot({path:`${out}/t2_${c}.png`}); }
  const tw=await p.evaluate(()=>document.querySelector('#t2tt').getBoundingClientRect().height); console.log('table height', tw);
  for(const l of ['1','14','all','2']){ await p.selectOption('[data-t2lap]', l); await W(5000); o=await R(); console.log('lap', l, await p.evaluate(()=>WB.R.x.d.length), 'c_lap', o.c_lap, 'c_t', f(o.c_t), 'c_soc', f(o.c_soc,1), (await p.textContent('#t2mcap')).slice(0,50)); }
  // 내 코스
  await p.click('[data-t2course="free"]'); await W(4000);
  await p.click('[data-t2menu="track"]'); await W(200); await p.click('[data-t2act="paste"]'); await W(300);
  console.log('paste ph', (await p.getAttribute('#t2pta','placeholder')).split('\n')[0]);
  await p.fill('#t2pta','종류, 길이, 반경\n직선, 100\n왼쪽, 31.4159, 10\n직선, 100\n왼쪽, 31.4159, 10'); await p.click('[data-t2pok]'); await W(4500); o=await R();
  console.log('paste', await rows(), (await p.textContent('#t2sum')).trim(), 'free1', f(o.t_free), 'toast', await p.evaluate(()=>document.querySelector('#toast')?.textContent));
  await cell(0,'l',120); console.log('edit l', await rows());
  await cell(1,'type','오른쪽'); console.log('edit type', await rows());
  await cell(1,'ang',90); console.log('edit ang', await rows());
  await cell(3,'no',1); console.log('move 4→1', await rows());
  await p.click('#t2tt [data-t2del="0"]'); await W(400); console.log('del', await rows());
  await p.click('#t2tt [data-t2add]'); await W(400); console.log('add', await rows());
  await p.locator('[data-t2o="laps"]').fill('5'); await W(5000); o=await R(); console.log('laps5', o.n_free, 'avg', f(o.t_freeavg), 'opts', await p.locator('[data-t2lap] option').count(), (await p.textContent('#wbout')).includes('내 코스 5랩'));
  await p.locator('[data-t2o="laps"]').fill('1'); await W(4000);
  if(xlsx){ await p.click('[data-t2menu="track"]'); await W(200); await p.setInputFiles('[data-t2file="track"]', xlsx); await W(4000); console.log('xlsx', await rows(), await p.evaluate(()=>document.querySelector('#toast')?.textContent)); }
  if(csv){ await p.click('[data-t2menu="track"]'); await W(200); await p.setInputFiles('[data-t2file="track"]', csv); await W(4000); console.log('csv', await rows(), await p.evaluate(()=>document.querySelector('#toast')?.textContent)); }
  for(const k of ['track.csv','track.xlsx']){ await p.click('[data-t2menu="track"]'); await W(200); const [dl]=await Promise.all([p.waitForEvent('download',{timeout:5000}).catch(()=>null), p.click(`[data-t2tpl="${k}"]`)]); console.log('tpl', k, dl?dl.suggestedFilename():'none');
    if(dl && out){ const fp=out+'/tpl_'+k; await dl.saveAs(fp); if(k==='track.csv') console.log('tpl csv head', require('fs').readFileSync(fp,'utf8').split('\n').slice(0,2).join(' / ').slice(0,90)); } }
  if(out){ await p.click('[data-t2menu="track"]'); await W(200); await p.setInputFiles('[data-t2file="track"]', out+'/tpl_track.xlsx'); await W(3000); console.log('tpl reimport', await rows(), await p.evaluate(()=>document.querySelector('#toast')?.textContent)); }
  await p.click('[data-t2menu="track"]'); await W(200); await p.click('[data-t2act="ex"]'); await W(4500); console.log('example', (await p.textContent('#t2sum')).trim());
  if(out) await p.screenshot({path:out+'/t2_free.png'});
  // 모터 탭
  await p.click('[data-t2tab="motor"]'); await W(500);
  for(const k of ['mt','eM','eI']){ await p.click(`[data-t2mt="${k}"]`); await W(400); console.log('motor', k, (await p.textContent('#t2msum')).trim().slice(0,60), 'cells', await p.locator('#t2tt [data-t2e]').count(), 'plots', await p.locator('#t2mc svg').count(), 'heat', await p.locator('#t2mc .t2-heat').count()); if(out) await p.screenshot({path:`${out}/t2_m_${k}.png`}); }
  await p.click('[data-t2mt="mt"]'); await W(300);
  const t0=(await R()).t_acc_s; await p.selectOption('[data-t2mcol]','2'); await W(5000); console.log('col2 acc', f(t0,3), '->', f((await R()).t_acc_s,3)); await p.selectOption('[data-t2mcol]','1'); await W(3000);
  await p.click('#t2tt [data-t2e="1,1"]'); await W(150); await p.fill('#t2tt .t2-ci','100'); await p.press('#t2tt .t2-ci','Enter'); await W(5000); console.log('torque edit acc', f((await R()).t_acc_s,3));
  await p.click('[data-t2menu="mt"]'); await W(200); await p.click('[data-t2act="ex"][data-t2k="mt"]'); await W(4000); console.log('torque reset acc', f((await R()).t_acc_s,3));
  await p.click('[data-t2mt="eI"]'); await W(300); await p.click('[data-t2menu="eI"]'); await W(200); await p.click('[data-t2act="paste"]'); await W(200); await p.fill('#t2pta','95'); await p.click('[data-t2pok]'); await W(5000); console.log('eI const', (await p.textContent('#t2msum')).trim(), 'cells', await p.locator('#t2tt [data-t2e]').count());
  await p.click('[data-t2menu="eI"]'); await W(200); await p.click('[data-t2act="clear"]'); await W(4000); console.log('eI cleared', (await p.textContent('#t2msum')).trim());
  await p.click('[data-t2tab="course"]'); await W(300); await p.click('[data-t2course="end"]'); await W(5000);
  await p.click('[data-wbviz="mu_s"]'); await W(400); console.log('viz', await p.evaluate(()=>!!document.querySelector('#wbvz .wb-plot'))); await p.keyboard.press('Escape'); await W(200);
  await p.locator('[data-wbi="t_skid"]').fill('4.6'); await W(5000); o=await R(); console.log('cla_req', f(o.cla_req));
  await p.locator('[data-wbi="e_target"]').fill('5'); await W(6000); o=await R(); console.log('e_target 5', f(o.c_plim,1), f(o.c_ec), o.e_ok);
  console.log('goal text', await p.evaluate(()=>/목표 [0-9]/.test(document.querySelector('#wbout').textContent)));
  await p.selectOption('[data-wbxa]','in:gr'); await W(25000); console.log('sweep', await p.evaluate(()=>WB.sw&&WB.sw.X?WB.sw.X.length+' outs '+document.querySelectorAll('#wbsl [data-wbso]').length:'none'), await p.evaluate(()=>WB.err));
  await p.selectOption('[data-wbxa]',''); await W(5000);
  await p.locator('#wbsig svg .wb-hit').click({position:{x:300,y:100}}); await W(300);
  console.log('cursor', await p.evaluate(()=>WB.xi), await p.evaluate(()=>!!document.querySelector('#t2map .t2-cur')), 'probe', await p.locator('#wbsig .wb-pv').count());
  if(out) await p.screenshot({path:out+'/t2_end.png', fullPage:false});
  await p.evaluate(()=>tourStart('wb:2')); await W(1500); const seen=[];
  for(let i=0;i<20;i++){ seen.push(await p.evaluate(()=>document.querySelector('.tour-n')?.textContent)); const nx=await p.$('[data-tour-next]'); if(!nx || /마치기/.test(await nx.textContent())) break; await nx.click(); await W(5000); }
  console.log('tour', seen.join(','));
  await p.evaluate(()=>{ try{ tourStop(); }catch(e){} }); await W(3000); console.log('after tour', await p.evaluate(()=>T2.course+' '+T2.tab));
  await p.evaluate(()=>wbClose()); await W(300);
  for(const k of ['goal','pt']){ await p.evaluate(k=>{ DASH.part=k; dashPaint(['part']); }, k); await W(7000); console.log('part', k, (await p.textContent('#t2part')).replace(/\s+/g,' ').slice(0,120)); }
  console.log('errs', JSON.stringify(p.errs), JSON.stringify(p.cons)); await b.close(); await H.end(); })();
