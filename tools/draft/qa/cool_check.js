// 도구 9 냉각 계통 계산기 점검: 기본 회로 · 끌기 · 선 끊고 잇기 · 블럭 입력 · 갈라짐 · 회로 추가 · 결과 · 도구 2 와 주고받기 (등가값 넣기 · 평균 발열 보내기 · 모델 단계 공랭 / 수랭).  node cool_check.js [스크린샷 폴더]
const H=require('./h.js');
(async()=>{ await H.start(); const b=await H.chromium.launch(); const p=await H.page(b,'lead'); const W=H.sleep;
  await p.evaluate(()=>showTab('tools')); await W(600); await p.evaluate(()=>{ wbOpen('9'); wbTabSet('edit'); }); await W(1500);
  console.log('net', JSON.stringify(await p.evaluate(()=>t9CoolCompile())).slice(0,400));
  console.log('t9 out', await p.evaluate(()=>JSON.stringify(WB.R && WB.R.out, (k,v)=>typeof v==='number'?+v.toFixed(2):v)), 'sig', await p.locator('#wbsig path').count());
  console.log('cards', await p.locator('.t9-cc').count(), 'blocks', await p.locator('.t9-cb').count(), 'links', await p.locator('.t9-clhit').count());
  // drag motor block
  const g=await p.$('[data-t9cb="w1:k4"] rect'); const bb=await g.boundingBox(); await p.mouse.move(bb.x+40,bb.y+20); await p.mouse.down(); await p.mouse.move(bb.x+10,bb.y+80,{steps:5}); await p.mouse.up(); await W(300);
  console.log('moved', await p.evaluate(()=>JSON.stringify(T9.cool.circuits[0].blocks[3])));
  // delete link k3->k4 by clicking it then reconnect
  await p.evaluate(()=>{ const C=T9.cool.circuits[0]; C.links=C.links.filter(([a,b])=>!(a==='k3'&&b==='k4')); t9Save(); wbPaint(['ext']); }); await W(300);
  console.log('broken', JSON.stringify(await p.evaluate(()=>t9CoolCompile().err)));
  const o=await (await p.$('[data-t9cpo="w1:k3"]')).boundingBox(), t=await (await p.$('[data-t9cb="w1:k4"] rect')).boundingBox();
  await p.mouse.move(o.x+o.width/2,o.y+o.height/2); await p.mouse.down(); await p.mouse.move(t.x+30,t.y+30,{steps:6}); await W(100);
  console.log('dragging', await p.evaluate(()=>[document.querySelector('.t9-hose.drag').style.display, !!document.querySelector('.t9-cb.tgt')]));
  if(process.argv[2]) await p.screenshot({path:process.argv[2]+'/cool_drag.png'});
  await p.mouse.up(); await W(300);
  console.log('relinked', JSON.stringify(await p.evaluate(()=>t9CoolCompile().err)), await p.evaluate(()=>JSON.stringify(T9.cool.circuits[0].links)));
  await p.click('[data-t9cb="w1:k1"] rect'); await W(300); console.log('sel form', await p.locator('.t9-csel input').count());
  { // 병렬: 펌프에서 모터로 호스 하나 더 → 갈라짐 · 번호 · 비율 · 지우기
    const o=await (await p.$('[data-t9cpo="w1:k2"]')).boundingBox(), t=await (await p.$('[data-t9cb="w1:k4"] rect')).boundingBox();
    await p.mouse.move(o.x+o.width/2,o.y+o.height/2); await p.mouse.down(); await p.mouse.move(t.x+40,t.y+30,{steps:6}); await p.mouse.up(); await W(300);
    console.log('branch', await p.locator('.t9-cbadge').count(), JSON.stringify(await p.evaluate(()=>T9.cool.circuits[0].links)), JSON.stringify(await p.evaluate(()=>t9CoolCompile().err)));
    await p.click('.t9-cbadge >> nth=0'); await W(300); const ri=await p.$('[data-t9crat]'); await ri.fill('30'); await ri.press('Enter'); await ri.dispatchEvent('change'); await W(300);
    console.log('ratios', JSON.stringify(await p.evaluate(()=>T9.cool.circuits[0].links.filter(l=>l[0]==='k2').map(l=>+(+l[2]).toFixed(3)))), JSON.stringify(await p.evaluate(()=>t9CoolCompile().net.water[0].nodes.map(n=>[n.t,n.part||'',+n.q.toFixed(2)]))));
    if(process.argv[2]) await p.screenshot({path:process.argv[2]+'/cool_par.png'});
    await p.keyboard.press('Delete'); await W(300); console.log('after del', await p.locator('.t9-cbadge').count(), JSON.stringify(await p.evaluate(()=>t9CoolCompile().err)));
    await p.click('[data-t9cb="w1:k2"] rect'); await W(200); console.log('block sel', await p.evaluate(()=>T9.cool.circuits[0].sel)); }
  await p.click('[data-t9cnew="water"]'); await W(300); console.log('new circuit', await p.locator('.t9-cc').count(), JSON.stringify(await p.evaluate(()=>t9CoolCompile().err)));
  if(process.argv[2]) await p.screenshot({path:process.argv[2]+'/cool.png', fullPage:false});
  { const w0=await p.evaluate(()=>document.querySelector('svg[data-t9csvg="w2"]').getBoundingClientRect().width);
    await p.click('[data-t9cadd="w2:b"]'); await W(300); await p.click('[data-t9cadd="w2:b"]').catch(()=>{}); await W(200);
    const w1=await p.evaluate(()=>document.querySelector('svg[data-t9csvg="w2"]').getBoundingClientRect().width);
    console.log('add bat to w2', JSON.stringify(await p.evaluate(()=>T9.cool.circuits.map(c=>c.id+':'+c.blocks.map(b=>b.t).join(',')))), 'width', Math.round(w0), '->', Math.round(w1), 'err', JSON.stringify(await p.evaluate(()=>t9CoolCompile().err)));
    for(let k=0;k<4;k++){ await p.evaluate(()=>{ const C=T9.cool.circuits[0]; }); }
    await p.click('[data-t9cadd="w2:m"]'); await W(300);
    console.log('move motor', JSON.stringify(await p.evaluate(()=>T9.cool.circuits.map(c=>c.id+':'+c.blocks.map(b=>b.t).join(',')))));
    await p.evaluate(()=>{ T9.cool=T9COOL_DEF(); t9Save(); wbPaint(['ext']); wbCalcSoon(); }); await W(800); }

  // 펌프 여러 개: 직렬 (펌프 하나 더 → 큰 유량) · 병렬 (라디에서 갈래마다 펌프 → 유량 합, 비율 = 유량 비)
  await p.evaluate(()=>{ const C=T9.cool.circuits[0]; C.blocks.push({id:'kp2', t:'pump', x:250, y:200, p:{flow:12, V:0.1}}); C.links=[['k1','k2'],['k2','kp2'],['kp2','k3'],['k3','k4'],['k4','k1']]; t9Save(); wbPaint(['ext']); wbCalcSoon(); }); await W(800);
  console.log('series pumps', JSON.stringify(await p.evaluate(()=>{ const c=t9CoolCompile(); return [c.err, c.mode, +c.net.water[0].Cc.toFixed(2)]; })), await p.evaluate(()=>document.querySelector('.t9-cmsg').textContent));
  await p.evaluate(()=>{ const C=T9.cool.circuits[0]; C.blocks.find(b=>b.id==='k2').p.flow=8; C.blocks.find(b=>b.id==='kp2').p.flow=4; C.links=[['k1','k2'],['k1','kp2'],['k2','k3'],['kp2','k4'],['k3','k1'],['k4','k1']]; C.selL=0; t9Save(); wbPaint(['ext']); wbCalcSoon(); }); await W(800);
  console.log('parallel pumps', JSON.stringify(await p.evaluate(()=>{ const c=t9CoolCompile(); return [c.err, c.mode, +c.net.water[0].Cc.toFixed(2), c.net.water[0].nodes.map(n=>n.t+(n.part||'')+':'+n.q.toFixed(3))]; })), await p.evaluate(()=>(document.querySelector('.t9-csel')||{}).textContent));
  if(process.argv[2]) await p.screenshot({path:process.argv[2]+'/cool_pumps.png'});
  await p.evaluate(()=>{ const C=T9.cool.circuits[0]; C.links=[['k1','k2'],['k2','k3'],['k3','kp2'],['kp2','k4'],['k4','k1'],['k2','k4']]; C.selL=-1; t9Save(); wbPaint(['ext']); }); await W(300);
  console.log('bad pumps', JSON.stringify(await p.evaluate(()=>t9CoolCompile().err)));
  await p.evaluate(()=>{ T9.cool=T9COOL_DEF(); t9Save(); wbPaint(['ext']); wbCalcSoon(); }); await W(800);
  // 도구 2 에 등가값 넣기 → 도구 2 저장값
  await p.evaluate(()=>{ localStorage.removeItem(wbStoreKey('2')); }); await W(100); await p.click('[data-t9x="put"]'); await W(300);
  console.log('put', await p.evaluate(()=>{ const s=JSON.parse(localStorage.getItem(wbStoreKey('2'))||'{}'); return JSON.stringify([s.cw_c,s.ua0,s.ua60,s.m_cool,s.i_cool,s.b_cool,s.cw_on]); }));
  await p.click('[data-t9x="get"]'); await W(300); console.log('get th_c', await p.evaluate(()=>WB.I.th_c));
  // 도구 2: 모델 단계 공랭 / 수랭 단추 · [냉각] 탭 · 평균 발열 보내기
  await p.evaluate(()=>wbOpen('2')); await W(9000);
  console.log('t2 out', await p.evaluate(()=>{ const o=WB.R.out; return [o.c_qm,o.c_qi,o.c_qb,o.c_vavg,o.c_trun,o.c_tw,o.c_tm].map(v=>+(+v).toFixed(2)); }), 'I', await p.evaluate(()=>JSON.stringify([WB.I.cw_c,WB.I.ua0,WB.I.ua60,WB.I.cw_on])));
  await p.click('[data-t2tab="edit"]'); await W(300); await p.click('[data-t2eg="model"]'); await W(300);
  console.log('model cool seg', await p.evaluate(()=>[...document.querySelectorAll('.t2-mdc .dc-seg')].map(g=>[...g.querySelectorAll('button')].map(x=>x.textContent+(x.getAttribute('aria-pressed')==='true'?'*':'')).join('/')).join(' | ')));
  await p.click('[data-t2cool-b_cool="1"]'); await W(300); console.log('b_cool', await p.evaluate(()=>WB.I.b_cool)); await p.click('[data-t2cool-b_cool="0"]'); await W(200);
  await p.click('[data-t2eg="cool"]'); await W(300); console.log('t2 cool tab', await p.locator('.t2-coolq .wb-ir').count(), await p.evaluate(()=>document.querySelector('.t2-cq').textContent.replace(/\s+/g,' ').slice(0,260)));
  if(process.argv[2]) await p.screenshot({path:process.argv[2]+'/cool_t2.png'});
  await p.click('[data-t2to9="send"]'); await W(1500);
  console.log('sent → t9', await p.evaluate(()=>[WB.id, WB.I.L_m, WB.I.L_i, WB.I.L_b, WB.I.v, WB.I.t_run, document.getElementById('wb').classList.contains('t2-edit')].join(',')));
  if(process.argv[2]) await p.screenshot({path:process.argv[2]+'/cool_t9.png'});
  console.log('errs', p.errs, p.cons);
  await b.close(); await H.end(); })();
