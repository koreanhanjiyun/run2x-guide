// 냉각 편집기 점검 (시뮬링크식, 2026-11-09): 기본 회로 · 휠 확대 · 휠 버튼 이동 · 블럭 끌기 · 영역 고르기 · Delete · 합쳐진 호스 하나만 고르기 · 토막 옮기기 · 호스 잇기 · 손잡이 없이 호스 토막 끌기 · 휠은 누른 뒤에만 확대 ·
//   호스 유량 (안지름 · 길이) · 공랭 갈라짐 비율 · 지우기 단추 없음 · 도구 2P 쪽 같은 편집기.  node cool_check.js [스크린샷 폴더]
const H=require('./h.js');
(async()=>{ await H.start(); const b=await H.chromium.launch(); const p=await H.page(b,'lead'); const W=H.sleep, d=process.argv[2];
  await p.evaluate(()=>showTab('tools')); await W(600); await p.evaluate(()=>{ localStorage.removeItem('run2x.t9@ex'); T9.cool=T9COOL_DEF(); wbOpen('9',null,'ex'); wbTabSet('edit'); }); await W(1500);
  const C0=()=>p.evaluate(()=>{ const C=T9.cool.circuits[0]; return {selB:C.selB, selL:C.selL, n:C.blocks.length, l:C.links.length, view:C.view}; });
  console.log('err', JSON.stringify(await p.evaluate(()=>t9CoolCompile().err)), 'cards', await p.locator('.t9-cc').count(), 'blocks', await p.locator('.t9-cb').count(), 'round', await p.locator('.t9-cb.rd').count());
  console.log('delete buttons', await p.locator('[data-t9cbx], [data-t9clx]').count(), 'zoom buttons', await p.locator('.t9-cool button:has-text("+"):has-text("확대")').count());
  const svg=await p.$('svg[data-t9csvg="w1"]'); let bb=await svg.boundingBox();
  // 휠 = 확대
  const v0=(await C0()).view; await p.mouse.move(bb.x+bb.width/2, bb.y+bb.height/2); await p.mouse.wheel(0,-300); await W(300); const va=(await C0()).view;
  console.log('wheel before click (no zoom)', JSON.stringify(va)===JSON.stringify(v0));
  await p.mouse.click(bb.x+bb.width-4, bb.y+4); await W(200); await p.mouse.wheel(0,-300); await W(300); const v1=(await C0()).view;
  console.log('wheel zoom after click', v1.w < v0.w, (v0.w/v1.w).toFixed(2));
  // 휠 버튼 끌기 = 화면 이동
  await p.mouse.move(bb.x+300, bb.y+100); await p.mouse.down({button:'middle'}); await p.mouse.move(bb.x+400, bb.y+140, {steps:5}); await p.mouse.up({button:'middle'}); await W(300); const v2=(await C0()).view;
  console.log('middle pan', v2.x < v1.x && v2.y < v1.y, (v1.x-v2.x).toFixed(1));
  { const s=await (await p.$('svg[data-t9csvg="w1"]')).boundingBox(); await p.mouse.click(s.x+5,s.y+5); await W(120); await p.mouse.click(s.x+5,s.y+5); await W(400); console.log('dblclick fit', JSON.stringify((await C0()).view), (await C0()).view.w >= 600); }
  // 블럭 끌기
  const pos=async id=>(await (await p.$(`[data-t9cb="w1:${id}"]`)).boundingBox());
  let m=await pos('k4'); const x0=await p.evaluate(()=>T9.cool.circuits[0].blocks.find(b=>b.id==='k4').x);
  await p.mouse.move(m.x+40,m.y+20); await p.mouse.down(); await p.mouse.move(m.x+40,m.y+110,{steps:6}); await p.mouse.up(); await W(400);
  console.log('drag block', JSON.stringify(await p.evaluate(()=>{ const b=T9.cool.circuits[0].blocks.find(b=>b.id==='k4'); return [b.x,b.y]; })), 'x0', x0);
  // 누르기 = 고르기 (패널), Shift = 더하기
  m=await pos('k1'); await p.mouse.click(m.x+30,m.y+15); await W(300); console.log('click sel', JSON.stringify((await C0()).selB), 'form', await p.locator('[data-t9cbp]').count());
  m=await pos('k3'); await p.keyboard.down('Shift'); await p.mouse.click(m.x+30,m.y+15); await p.keyboard.up('Shift'); await W(300); console.log('shift sel', JSON.stringify((await C0()).selB));
  // 영역 고르기: 빈 곳에서 끌기
  bb=await svg.boundingBox(); const s2=await p.$('svg[data-t9csvg="w1"]'); bb=await s2.boundingBox();
  await p.mouse.move(bb.x+3, bb.y+3); await p.mouse.down(); await p.mouse.move(bb.x+bb.width-3, bb.y+bb.height-3, {steps:8}); await p.mouse.up(); await W(300);
  console.log('marquee', JSON.stringify(await C0()));
  await p.keyboard.press('Escape'); await W(200); console.log('esc', JSON.stringify((await C0()).selB));
  // 병렬: 펌프 뒤 분기점 j1 에서 인버터 · 모터로 갈라져 합류점 j2 에서 합쳐져 라디로 (80차: 가르기 · 합치기는 분기점으로만)
  await p.evaluate(()=>{ const C=T9.cool.circuits[0]; C.blocks.find(b=>b.id==='k4').x=440; C.blocks.find(b=>b.id==='k4').y=200; C.blocks.push({id:'j1',t:'j',x:360,y:110,p:{}},{id:'j2',t:'j',x:640,y:110,p:{}}); C.blocks.find(b=>b.id==='k3').x=440; C.blocks.find(b=>b.id==='k3').y=40; C.links=[['k1','k2'],['k2','j1'],['j1','k3'],['j1','k4'],['k3','j2'],['k4','j2'],['j2','k1']]; C.links.forEach(l=>{}); C.selB=[]; C.selL=[]; C.view=null; t9Save(); wbPaint(['ext']); }); await W(500);
  console.log('parallel err', JSON.stringify(await p.evaluate(()=>t9CoolCompile().err)), 'lq', await p.evaluate(()=>{ const r=t9CoolCompile().lq.w1; return [...r.m.values()].map(x=>+x.toFixed(3)).join(','); }));
  if(d && await p.$('.t9-cc')) await (await p.$('.t9-cc')).screenshot({path:`${d}/cool_parallel.png`});
  const hits=await p.$$('[data-t9clink^="w1:"].t9-clhit'); const want=await p.evaluate(()=>T9.cool.circuits[0].links.findIndex(l=>l[0]==='j2' && l[1]==='k1'));
  // 그 호스 경로 위 한 점 (다른 호스와 겹치지 않는 토막 가운데)
  const pt=await p.evaluate(j=>{ const C=T9.cool.circuits[0], by=new Map(C.blocks.map(b=>[b.id,b])), P=t9Route(C,j,by), svg=document.querySelector('svg[data-t9csvg="w1"]'), m=svg.getScreenCTM();
    const oth=C.links.map((l,i)=>i===j?null:t9Route(C,i,by)).filter(Boolean), on=(x,y)=>oth.some(R=>R.some((a,k)=>k<R.length-1 && Math.abs((R[k+1][0]-a[0])*(y-a[1])-(R[k+1][1]-a[1])*(x-a[0]))<1e-6 && x>=Math.min(a[0],R[k+1][0])-1 && x<=Math.max(a[0],R[k+1][0])+1 && y>=Math.min(a[1],R[k+1][1])-1 && y<=Math.max(a[1],R[k+1][1])+1));
    let best=null; for(let q=1;q<P.length-2;q++){ const L=Math.hypot(P[q+1][0]-P[q][0],P[q+1][1]-P[q][1]), mx=(P[q][0]+P[q+1][0])/2, my=(P[q][1]+P[q+1][1])/2; if(on(mx,my)) continue; if(!best||L>best[0]) best=[L,mx,my]; }
    const s=svg.createSVGPoint(); s.x=best[1]; s.y=best[2]; const r=s.matrixTransform(m); return [r.x,r.y]; }, want);
  await p.mouse.click(pt[0], pt[1]); await W(300); console.log('pick merged hose', JSON.stringify((await C0()).selL), 'want', want, 'hose form', await p.locator('[data-t9chp]').count(), 'flow txt', await p.locator('.t9-csel .t9-cfi b').first().textContent().catch(()=>''));
  // 토막 옮기기
  console.log('seg handles', await p.locator('[data-t9cseg]').count());
  await p.mouse.move(pt[0], pt[1]); await p.mouse.down(); await p.mouse.move(pt[0]+40, pt[1]+40, {steps:5}); await p.mouse.up(); await W(300);
  console.log('seg drag pts', JSON.stringify(await p.evaluate(j=>(T9.cool.circuits[0].links[j][3]||{}).pts, want)));
  await p.click(`[data-t9clink="w1:${want}"].t9-clhit`, {force:true}).catch(()=>{}); await W(200);
  await p.evaluate(()=>{ const C=T9.cool.circuits[0]; C.selL=[C.links.findIndex(l=>l[0]==='k3' && l[1]==='j2')]; C.selB=[]; }); await p.keyboard.press('Delete'); await W(400);
  console.log('delete one hose', JSON.stringify(await p.evaluate(()=>T9.cool.circuits[0].links.map(l=>l[0]+'>'+l[1]))));
  // 입구가 찬 라디로는 안 이어짐 · 출구가 찬 블럭 점은 끌기 안 됨
  { const o=await (await p.$('[data-t9cpt="w1:k3:o"]')).boundingBox(), t=await pos('k1'); await p.mouse.move(o.x+o.width/2,o.y+o.height/2); await p.mouse.down(); await p.mouse.move(t.x+40,t.y+20,{steps:8}); await p.mouse.up(); await W(400);
    console.log('to full input (no new hose)', await p.evaluate(()=>T9.cool.circuits[0].links.length)); }
  // 호스 잇기 (인버터 오른쪽 점 → 합류점)
  const o=await (await p.$('[data-t9cpt="w1:k3:o"]')).boundingBox(), t=await pos('j2');
  await p.mouse.move(o.x+o.width/2,o.y+o.height/2); await p.mouse.down(); await p.mouse.move(t.x+t.width/2,t.y+t.height/2,{steps:8}); await p.mouse.up(); await W(400);
  console.log('connect', JSON.stringify(await p.evaluate(()=>T9.cool.circuits[0].links.map(l=>l[0]+'>'+l[1]))), 'err', JSON.stringify(await p.evaluate(()=>t9CoolCompile().err)));
  // 81차: 끝 옮기기 · 흰 점에서 끌기
  const lks=()=>p.evaluate(()=>T9.cool.circuits[0].links.map(l=>l[0]+'>'+l[1]).join(' '));
  const dragTo=async(sel,tgt)=>{ const o=await (await p.$(sel)).boundingBox(); await p.mouse.move(o.x+o.width/2,o.y+o.height/2); await p.mouse.down(); await p.mouse.move(tgt[0],tgt[1],{steps:8}); await p.mouse.up(); await W(400); };
  { const before=await lks(); const bb2=await (await p.$(`svg[data-t9csvg="w1"]`)).boundingBox(); await dragTo('[data-t9cpt="w1:k3:o"]',[bb2.x+8,bb2.y+8]); console.log('grab end, drop empty -> same', (await lks())===before); }
  { const t=await pos('j1'); await dragTo('[data-t9cpt="w1:k4:o"]',[t.x+t.width/2,t.y+t.height/2]); console.log('move k4 out end to j1', await lks()); }
  { const L=await p.evaluate(()=>{ const C=T9.cool.circuits[0], by=new Map(C.blocks.map(b=>[b.id,b])), j=C.links.findIndex(l=>l[0]==='j1'&&l[1]==='j2'), P=t9Route(C,j,by), svg=document.querySelector('svg[data-t9csvg="w1"]'), m=svg.getScreenCTM(), s=svg.createSVGPoint(); const dx=P[1][0]-P[0][0], dy=P[1][1]-P[0][1], n=Math.hypot(dx,dy)||1; s.x=P[0][0]+dx/n*15; s.y=P[0][1]+dy/n*15; const r=s.matrixTransform(m); return [r.x,r.y]; });
    const t=await pos('k4'); await p.mouse.move(L[0],L[1]); await p.mouse.down(); await p.mouse.move(t.x+t.width/2,t.y+t.height/2,{steps:8}); await p.mouse.up(); await W(400); console.log('grab end at j1, back to k4', await lks()); }
  await p.evaluate(()=>{ const C=T9.cool.circuits[0]; C.selL=[C.links.findIndex(l=>l[0]==='k1'&&l[1]==='k2')]; C.selB=[]; }); await p.keyboard.press('Delete'); await W(400);
  { const t=await pos('k1'); await dragTo('[data-t9cpt="w1:k2:i"]',[t.x+t.width/2,t.y+t.height/2]); console.log('white(pump in) -> rad', await lks(), 'err', JSON.stringify(await p.evaluate(()=>t9CoolCompile().err.w1||[]))); }
  // 호스 안지름 바꾸면 갈래 몫이 바뀜
  await p.evaluate(()=>{ const C=T9.cool.circuits[0], j=C.links.findIndex(l=>l[0]==='j1' && l[1]==='k3'); (C.links[j][3]=C.links[j][3]||{}).d=6; t9Save(); }); const lq=await p.evaluate(()=>{ const C=T9.cool.circuits[0], r=t9CoolCompile().lq.w1; return C.links.map(l=>l[0]+'>'+l[1]+'='+(r.m.get(l)||0).toFixed(3)).join(' '); });
  console.log('hose d 6 mm', lq);
  // 공랭: 입구 → 축전지 · 모터 갈라짐 → 출구, 비율
  await p.evaluate(()=>{ const A=T9.cool.circuits[1]; T9.cool.circuits[0].blocks=T9.cool.circuits[0].blocks.filter(b=>b.t!=='m'); T9.cool.circuits[0].links=T9.cool.circuits[0].links.filter(l=>l[0]!=='k4'&&l[1]!=='k4');
    A.blocks.push({id:'k9', t:'m', x:360, y:200, p:{}},{id:'j5',t:'j',x:200,y:90,p:{}},{id:'j6',t:'j',x:560,y:90,p:{}}); A.links=[['k5','j5'],['j5','k6',0.3],['j5','k9',0.7],['k6','j6'],['k9','j6'],['j6','k7']]; A.selL=[]; A.selB=[]; A.view=null; t9Save(); wbPaint(['ext']); }); await W(500);
  console.log('air err', JSON.stringify(await p.evaluate(()=>t9CoolCompile().err)), 'air net', JSON.stringify(await p.evaluate(()=>t9CoolCompile().net.air[0].nodes)));
  await p.waitForTimeout(1500); console.log('t9 out', await p.evaluate(()=>WB.err || JSON.stringify({tm:WB.R.out.s_tm, tb:WB.R.out.s_tb, ti:WB.R.out.s_ti})));
  if(d) await (await p.$$('.t9-cc'))[1].screenshot({path:`${d}/cool_air.png`});
  // 블럭 넣기: 지금 보는 화면 가운데
  console.log('palette j', await p.locator('[data-t9cadd="w1:j"]').count(), await p.locator('[data-t9cadd="a1:j"]').count());
  await p.click('[data-t9cadd="w1:pump"]'); await W(300); console.log('add pump', await p.evaluate(()=>{ const C=T9.cool.circuits[0]; return JSON.stringify([C.blocks.length, C.selB]); }));
  // 도구 2P 쪽 같은 편집기
  await p.evaluate(()=>{ wbOpen('2',null,'ex'); }); await W(7000); await p.click('[data-t2tab="edit"]'); await W(300);
  await p.evaluate(()=>{ WB.I.cw_mode=1; wbSave(); }); await p.click('[data-t2eg="cool"]'); await W(600);
  console.log('2P editor', await p.locator('.t9-cool svg[data-t9csvg]').count(), 'round', await p.locator('.t9-cb.rd').count(), 'mode btn in head', await p.evaluate(()=>{ return null; }));
  await p.click('[data-t2eg="model"]'); await W(400); console.log('2P head cw seg', await p.locator('.t2-mdh [data-t2cwm]').count(), 'card seg', await p.locator('.t2c [data-t2cwm]').count());
  console.log('errs', p.errs, p.cons); await b.close(); await H.end(); })();
