// 도구 4 축전지 팩 계산기 점검: 열기 · 결과 · 규정 막대 · 자동 구성 · 출력 표 전류 · 셀 프리셋 · 검증표 · 대시보드 반영 목록 · 도구 2 받기.  node tool4_check.js [스크린샷 폴더]
const H=require('./h.js');
(async()=>{ await H.start(); const b=await H.chromium.launch(); const p=await H.page(b,'lead'); const W=H.sleep, d=process.argv[2];
  await p.evaluate(()=>{ localStorage.removeItem(wbStoreKey('4')); localStorage.removeItem('run2x.t4.presets'); showTab('tools'); }); await W(600);
  await p.evaluate(()=>wbOpen('4')); await W(1200);
  const o=await p.evaluate(()=>WB.R && WB.R.out); console.log('out', o && [o.n_s,o.n_p_o,o.r_pack,o.i_bms_max,o.e_pack,o.ej_seg,o.m_seg,o.v_pack_max].join(','), 'err', await p.evaluate(()=>WB.err));
  console.log('rules', await p.locator('.t4-rule').count(), 'bad', await p.locator('.t4-rule.bad').count(), 'table cols', await p.locator('.t4-t thead th').count(), 'rows', await p.locator('.t4-t tbody tr').count());
  if(d) await p.screenshot({path:d+'/t4.png'});
  await p.click('[data-t4auto="1"]'); await W(600); console.log('auto P', await p.evaluate(()=>[WB.R.out.n_p_o, document.getElementById('t4why').textContent, !!document.querySelector('#wbin input[data-k="n_p"]:disabled, #wbin [data-k="n_p"] input:disabled')].join(' | ')));
  await p.click('[data-t4auto="2"]'); await W(600); console.log('auto S', await p.evaluate(()=>[WB.R.out.s_seg_o, WB.R.out.n_s, document.getElementById('t4why').textContent].join(' | ')));
  await p.click('[data-t4auto="0"]'); await W(600);
  await p.click('[data-t4om="2"]'); await W(600); const oi=await p.$('[data-t4oi]'); await oi.fill('100'); await oi.dispatchEvent('change'); await W(600);
  console.log('table I', await p.evaluate(()=>[WB.R.out.o_i, WB.R.out.t_load_max].join(',')));
  if(d){ await p.evaluate(()=>document.querySelector('.t4-pw').scrollIntoView()); await W(200); await p.screenshot({path:d+'/t4_pw.png'}); }
  await p.fill('[data-t4pn]', '시험 셀'); await p.click('[data-t4p="save"]'); await W(300); console.log('presets', await p.evaluate(()=>JSON.parse(localStorage.getItem('run2x.t4.presets')).map(x=>x.name+':'+x.cell.c_ah).join(',')));
  await p.evaluate(()=>{ WB.I.c_ah=3; wbSave(); wbPaint(['in']); wbCalcSoon(); }); await W(600); await p.selectOption('[data-t4ps]', '0'); await W(600); console.log('preset load c_ah', await p.evaluate(()=>WB.I.c_ah));
  await p.click('[data-wbcode]'); await W(300); await p.click('[data-wbver]'); await W(2000);
  console.log('verify', await p.evaluate(()=>{ const m=document.querySelector('#wbm'); return m.querySelectorAll('tr.ok').length+' ok / '+m.querySelectorAll('tr.ng').length+' ng'; }));
  await p.evaluate(()=>wbModalClose()); await W(200);
  await p.click('[data-wbput]'); await W(500); console.log('put list', await p.evaluate(()=>{ const m=document.querySelector('#wbm'); return m ? m.textContent.replace(/\s+/g,' ').slice(0,500) : ''; }));
  await p.evaluate(()=>wbModalClose());
  // 도구 2 축전지 탭: 안내 · 도구 4 열기
  await p.evaluate(()=>wbOpen('2')); await W(8000); await p.click('[data-t2tab="edit"]'); await W(300); await p.click('[data-t2eg="bat"]'); await W(300);
  console.log('t2 bat note', await p.evaluate(()=>(document.querySelector('.t2-cnote')||{}).textContent), 'dk', await p.evaluate(()=>WB_TOOLS['2'].inputs.filter(x=>['c_vmax','c_vnom','c_vmin','c_ah','n_s','n_p','r_pack','i_bms_max','cw_c','ua0','ua60'].includes(x.k)).map(x=>x.k+'>'+x.dk).join(' ')));
  await p.click('[data-t2to4]'); await W(800); console.log('to4', await p.evaluate(()=>WB.id));
  console.log('errs', p.errs, p.cons); await b.close(); await H.end(); })();
