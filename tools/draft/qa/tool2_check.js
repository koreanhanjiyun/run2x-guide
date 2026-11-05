// 도구 2 점검: [시뮬레이션 | 맵 편집] · 결과(두 모드 미리 계산 · 줄 맞춤 · ± · m s 표기) · 검증표 · 코스 5개 · 볼 랩 · 지도(색 범위 고정 · 확대 · 누르기 프로브)
//   · 구동력 선도 프로브(멈춘 뒤 계산) · 맵 편집(코스 표 고치기 · 입력하기 · 공식 코스 막힘 · 모터 · 효율 · 타이어 표 → 입력 칸 막힘) · 입력 훑기 · 사용법 · 대시보드 파트별.
//   node tool2_check.js [스크린샷 폴더] [xlsx] [csv]
const H=require('./h.js'); const [out, xlsx, csv]=process.argv.slice(2);
(async()=>{ await H.start(); const b=await H.chromium.launch(); const p=await H.page(b,'lead');
  const R=()=>p.evaluate(()=>WB.R&&WB.R.out); const f=(v,d=2)=>typeof v==='number'?v.toFixed(d):v; const W=ms=>H.sleep(ms);
  const rows=()=>p.evaluate(()=>t2Track(T2.free.text).rows.map(r=>[+r.l.toFixed(2),+r.R.toFixed(2)]).join(' | '));
  const cell=async(i,k,v)=>{ await p.click(`#t2tt [data-t2e="${i},${k}"]`); await W(150); const e=await p.$(`#t2tt [data-t2e="${i},${k}"] .t2-ci`); if(e.tagName && false); if(await e.evaluate(x=>x.tagName)==='SELECT') await e.selectOption(v); else { await e.fill(String(v)); await e.press('Enter'); } await W(400); };
  await p.evaluate(()=>showTab('tools')); await W(600); await p.evaluate(()=>wbOpen('2')); await W(7000);
  let o=await R(); console.log('open', 'gr_use', o.gr_use, 'acc', f(o.t_acc_s,3), 'skid', f(o.t_skid_s,3), 'ax', f(o.t_ax_s), 'end', f(o.t_end_s,1), 'gr', o.gr_opt, o.gr_acc, o.gr_ax, o.gr_end, 'd', f(o.d_acc,3), f(o.d_end,2), 'ms', await p.evaluate(()=>Math.round(WB.ms)), 'err', await p.evaluate(()=>WB.err));
  console.log('layout', 'cards', await p.locator('#wbout .t2-oc').count(), 'rows g/rec', await p.locator('#wbout .t2-oc.g .t2-r').count(), await p.locator('#wbout .t2-orow:first-child .t2-oc:nth-child(2) .t2-r').count(),
    'align', await p.evaluate(()=>{ const a=[...document.querySelectorAll('#wbout .t2-oc.g .t2-r')].map(r=>Math.round(r.getBoundingClientRect().top)), b=[...document.querySelectorAll('#wbout .t2-orow:first-child .t2-oc:nth-child(2) .t2-r')].map(r=>Math.round(r.getBoundingClientRect().top)); return a[4]===b[4] && a[1]===b[1] && a[3]===b[3]; }),
    'mid', await p.locator('#wbmid .t2-ftw, #wbmid .t2-mapw').count(), 'msfmt', await p.evaluate(()=>[...document.querySelectorAll('#wbout b')].map(x=>x.textContent).find(t=>/\dm \d/.test(t))), 'dt', await p.evaluate(()=>[...document.querySelectorAll('#wbout .t2-dt')].map(x=>x.textContent).join(' ')));
  const t0=Date.now(); await p.click('[data-t2gm="opt"]'); await W(300); o=await R(); console.log('opt instant', Date.now()-t0 < 1500, 'gr_use', o.gr_use, 'c_gr', o.c_gr, (await p.textContent('#wbout .t2-orow:first-child .t2-oc:nth-child(2) h4')).trim().slice(0,40));
  if(out) await p.screenshot({path:out+'/t2_opt.png'});
  await p.click('[data-t2gm="my"]'); await W(300); console.log('my back', (await R()).gr_use);
  await p.click('.wb-bar [data-wbcode]'); await W(300); await p.click('#wbm [data-wbver]'); await W(45000); console.log('verify', (await p.textContent('#wbm .dvi-foot')).trim().slice(0,40)); await p.click('#wbm [data-wbmx]');
  // 구동력 선도 프로브
  await p.evaluate(()=>document.querySelector('#wbsig').scrollIntoView({block:'center'})); await W(300); await p.locator('#wbsig svg .wb-hit').click({position:{x:300,y:100}}); await W(150); console.log('pf moving', await p.evaluate(()=>{ const o=document.querySelector('#t2ftov'); return o && !o.hidden ? o.textContent : 'hidden'; }));
  await W(2500); console.log('pf done', await p.evaluate(()=>document.querySelector('#t2ftov').hidden), (await p.textContent('#t2ftv')).replace(/\s+/g,' ').slice(0,160));
  // 코스 · 볼 랩 · 지도
  for(const c of ['ax','acc','skid','free','end']){ await p.click(`.t2-hr [data-t2course="${c}"]`); await W(7000); const r=await p.evaluate(()=>({n:WB.R&&WB.R.x.d.length, lapsel:document.querySelector('[data-t2lap]').disabled, cones:document.querySelectorAll('#t2map .t2-cone').length, cap:(document.querySelector('#t2mcap')||{}).textContent.slice(0,60), card:(document.querySelector('#wbout .t2-orow:nth-child(2) h4 span')||{}).textContent, err:WB.err}));
    console.log('course', c, JSON.stringify(r)); if(out) await p.screenshot({path:`${out}/t2_${c}.png`}); }
  for(const l of ['1','14','all']){ await p.selectOption('[data-t2lap]', l); await W(7000); o=await R(); console.log('lap', l, 'c_lap', o.c_lap, f(o.c_t), 'cap', (await p.textContent('#t2mcap')).slice(0,40)); }
  await p.selectOption('[data-t2lap]', '2'); await W(7000);
  await p.evaluate(()=>document.querySelector('#t2map').scrollIntoView({block:'center'})); await W(300); const box=await (await p.$('#t2map svg')).boundingBox(); await p.mouse.move(box.x+box.width*0.5, box.y+box.height*0.5); await p.mouse.wheel(0,-300); await W(300); console.log('zoom', await p.evaluate(()=>T2.zoom.k.toFixed(2)));
  await p.mouse.move(box.x+box.width*0.3, box.y+box.height*0.5); await p.mouse.down(); await p.mouse.move(box.x+box.width*0.4, box.y+box.height*0.55, {steps:5}); await p.mouse.up(); await W(200); console.log('pan', await p.evaluate(()=>T2.zoom.cx.toFixed(3)));
  await p.click('[data-t2z="fit"]'); await W(200); await p.evaluate(()=>document.querySelector('#t2map').scrollIntoView({block:'center'})); await W(300); const xi0=await p.evaluate(()=>WB.xi); const pt=await p.evaluate(()=>{ const s=document.querySelector('#t2map svg'), q=T2.mp.pts[Math.floor(T2.mp.pts.length/3)], m=s.getScreenCTM(); return [q[0]*m.a+m.e, q[1]*m.d+m.f]; });
  await p.mouse.click(pt[0], pt[1]); await W(300); console.log('map probe', xi0, '->', await p.evaluate(()=>WB.xi), 'n', await p.evaluate(()=>WB.R.x.d.length));
  // 맵 편집: 코스
  await p.click('[data-t2tab="edit"]'); await W(500); console.log('edit hides', await p.evaluate(()=>getComputedStyle(document.querySelector('#wbmid')).display), await p.evaluate(()=>getComputedStyle(document.querySelector('#wb .wb-sec[aria-label="결과"]')).display));
  console.log('official menu disabled', await p.evaluate(()=>document.querySelector('[data-t2menu="track"]').disabled));
  await p.click('.t2-set [data-t2course="free"]'); await W(4000);
  await p.click('[data-t2menu="track"]'); await W(200); await p.click('[data-t2act="paste"]'); await W(300);
  await p.fill('#t2pta','종류, 길이, 반경\n직선, 100\n왼쪽, 31.4159, 10\n직선, 100\n왼쪽, 31.4159, 10'); await p.click('[data-t2pok]'); await W(500);
  console.log('paste', await rows(), (await p.textContent('#t2sum')).trim());
  await cell(0,'l',120); await cell(1,'type','오른쪽'); await cell(1,'ang',90); console.log('edit', await rows());
  await cell(3,'no',1); console.log('move 4→1', await rows()); await p.click('#t2tt [data-t2del="0"]'); await W(400); await p.click('#t2tt [data-t2add]'); await W(400); console.log('del · add', await rows());
  await p.locator('[data-t2o="laps"]').fill('5'); await W(500);
  if(xlsx){ await p.click('[data-t2menu="track"]'); await W(200); await p.setInputFiles('[data-t2file="track"]', xlsx); await W(1500); console.log('xlsx', await rows(), await p.evaluate(()=>document.querySelector('#toast')?.textContent)); }
  if(csv){ await p.click('[data-t2menu="track"]'); await W(200); await p.setInputFiles('[data-t2file="track"]', csv); await W(1500); console.log('csv', await rows()); }
  for(const k of ['track.csv','tire.xlsx']){ await p.click(k.startsWith('track') ? '[data-t2menu="track"]' : '[data-t2menu="track"]'); await W(200); const [dl]=await Promise.all([p.waitForEvent('download',{timeout:5000}).catch(()=>null), p.click(`[data-t2tpl="${k.startsWith('track') ? k : 'track.xlsx'}"]`)]); console.log('tpl', k, !!dl); if(dl && out) await dl.saveAs(out+'/tpl_'+k); }
  await p.click('[data-t2menu="track"]'); await W(200); await p.click('[data-t2act="ex"]'); await W(500); console.log('example', (await p.textContent('#t2sum')).trim());
  if(out) await p.screenshot({path:out+'/t2_edit_course.png'});
  // 맵 편집: 모터 · 효율 · 타이어
  for(const k of ['mt','eM','eI','tire']){ await p.click(`[data-t2et="${k}"]`); await W(500); console.log('edit', k, (await p.textContent('#t2msum')).trim().slice(0,60), 'cells', await p.locator('#t2tt [data-t2e]').count(), 'svg', await p.locator('#t2mc svg').count()); if(out) await p.screenshot({path:`${out}/t2_e_${k}.png`}); }
  await p.click('[data-t2et="tire"]'); await W(300); await p.click('[data-t2menu="tire"]'); await W(200); await p.click('[data-t2act="paste"]'); await W(200); await p.fill('#t2pta','하중 N, μ\n0, 1.8\n1000, 1.6\n2000, 1.45'); await p.click('[data-t2pok]'); await W(500);
  console.log('tire', (await p.textContent('#t2msum')).trim(), 'lock mu', await p.evaluate(()=>document.querySelector('[data-wbi="mu"]').disabled), 'lock eta_mot', await p.evaluate(()=>document.querySelector('[data-wbi="eta_mot"]').disabled));
  await W(5000); console.log('tire acc', f((await R()).t_skid_s,3));
  await p.click('[data-t2menu="tire"]'); await W(200); await p.click('[data-t2act="clear"]'); await W(500); console.log('tire cleared lock', await p.evaluate(()=>document.querySelector('[data-wbi="mu"]').disabled));
  await p.click('[data-t2et="mt"]'); await W(300); await p.click('#t2tt [data-t2e="1,1"]'); await W(150); await p.fill('#t2tt .t2-ci','100'); await p.press('#t2tt .t2-ci','Enter'); await W(6000); console.log('torque edit acc', f((await R()).t_acc_s,3));
  await p.click('[data-t2menu="mt"]'); await W(200); await p.click('[data-t2act="ex"][data-t2k="mt"]'); await W(6000); console.log('torque reset acc', f((await R()).t_acc_s,3));
  // 디레이팅 켜기
  await p.click('[data-t2tab="sim"]'); await W(500); await p.click('.t2-hr [data-t2course="end"]'); await W(7000); const e0=(await R()).t_end_s;
  await p.locator('[data-wbi="th_k"]').fill('3'); await p.locator('[data-wbi="th_t0"]').fill('45'); await W(9000); o=await R(); console.log('derate end', f(e0,1), '->', f(o.t_end_s,1), 'tmax', f(o.c_tmax,1));
  await p.locator('[data-wbi="th_k"]').fill('0'); await W(7000);
  await p.locator('[data-wbi="t_skid"]').fill('9.2'); await W(7000); o=await R(); console.log('cla_req', f(o.cla_req)); await p.locator('[data-wbi="t_skid"]').fill('10.5'); await W(7000); console.log('cla_req neg', f((await R()).cla_req));
  await p.click('[data-wbviz="mu_s"]'); await W(400); console.log('viz', await p.evaluate(()=>!!document.querySelector('#wbvz .wb-plot'))); await p.keyboard.press('Escape'); await W(200);
  await p.selectOption('[data-wbxa]','in:gr'); await W(30000); console.log('sweep', await p.evaluate(()=>WB.sw&&WB.sw.X?WB.sw.X.length:'none'), await p.evaluate(()=>WB.err)); await p.selectOption('[data-wbxa]',''); await W(7000);
  console.log('axis colors', await p.evaluate(()=>[...document.querySelectorAll('#wbsig .wb-tl tspan')].map(t=>t.style.fill).filter(Boolean).slice(0,4).join(' ')), 'probe color', await p.evaluate(()=>{ const t=document.querySelector('#wbsig .wb-pv'); return t ? t.style.fill : 'none'; }));
  if(out) await p.screenshot({path:out+'/t2_end.png'});
  await p.evaluate(()=>tourStart('wb:2')); await W(3000); const seen=[];
  for(let i=0;i<20;i++){ seen.push(await p.evaluate(()=>document.querySelector('.tour-n')?.textContent)); const nx=await p.$('[data-tour-next]'); if(!nx || /마치기/.test(await nx.textContent())) break; await nx.click(); await W(6000); }
  console.log('tour', seen.join(','));
  await p.evaluate(()=>{ try{ tourStop(); }catch(e){} }); await W(4000); console.log('after tour', await p.evaluate(()=>T2.course+' '+T2.tab));
  await p.evaluate(()=>wbClose()); await W(300);
  for(const k of ['goal','pt']){ await p.evaluate(k=>{ DASH.part=k; dashPaint(['part']); }, k); await W(9000); console.log('part', k, (await p.textContent('#t2part')).replace(/\s+/g,' ').slice(0,120)); }
  console.log('errs', JSON.stringify(p.errs), JSON.stringify(p.cons)); await b.close(); await H.end(); })();
