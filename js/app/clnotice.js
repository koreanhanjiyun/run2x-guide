/* ============================================================
   업데이트 알림 (이 브라우저 기준)
   - 변경 이력의 최신 버전이 마지막으로 확인한 버전과 다르면:
     참고 탭 버튼 숨쉬기 → 변경 이력 칸 숨쉬기 → 최신 버전의 항목 줄마다 [이동] (data-go="항목ID") → 이동한 항목 숨쉬기
   - [확인]을 누르면 꺼짐. 기한 없음(다음 업데이트 전까지). 처음 방문한 브라우저는 알림 없이 최신으로 기록
   ============================================================ */
(function(){
  const KEY = 'run2x.clSeen';
  const get = () => { try{ return localStorage.getItem(KEY); }catch(e){ return null; } };
  const put = v => { try{ localStorage.setItem(KEY, v); }catch(e){} };
  function latest(){ const r = (typeof REFS!=='undefined') && REFS.find(x=>x.t==='변경 이력'); const m = r && /(\d+\.\d+\.\d+) · \d{4}-\d{2}-\d{2}/.exec(r.b); return m ? m[1] : null; }
  let L = null, ON = false;
  function clDetails(){ return [...document.querySelectorAll('#ref-list > details')].find(x=>x.querySelector(':scope>summary .stitle')?.textContent.trim()==='변경 이력'); }
  function apply(){
    if(!ON) return;
    const tb = document.querySelector('.tab[data-tab="ref"]'); if(tb) tb.classList.add('cl-breathe');
    const d = clDetails(); if(!d) return;
    d.querySelector(':scope>summary').classList.add('cl-breathe');
    const body = d.querySelector('.dbody'); if(!body || body.querySelector('.cl-new')) return;
    const box = document.createElement('div'); box.className='cl-new';
    box.innerHTML = `<span><b>새 업데이트 v${L}</b> · 아래 항목을 눌러 바뀐 곳으로 이동할 수 있습니다.</span><button type="button" class="btn small pri cl-ok">확인</button>`;
    body.prepend(box);
    const first = body.querySelector('.clv') || body; const ul = first.querySelector('ul');
    if(ul) ul.querySelectorAll('li[data-go]').forEach(li=>{ if(li.querySelector('.cl-go') || !IT[li.dataset.go]) return; const b=document.createElement('button'); b.type='button'; b.className='btn small cl-go'; b.textContent='이동'; li.appendChild(b); });
  }
  function done(){ ON=false; put(L);
    document.querySelectorAll('.cl-breathe').forEach(e=>e.classList.remove('cl-breathe'));
    document.querySelectorAll('.cl-new,.cl-go').forEach(e=>e.remove()); }
  document.addEventListener('click', e=>{
    if(e.target.closest('.cl-ok')){ e.preventDefault(); done(); toast('업데이트 알림을 껐습니다'); return; }
    const g = e.target.closest('.cl-go'); if(g){ e.preventDefault(); const id = g.closest('li').dataset.go; openItem(id);
      setTimeout(()=>{ const it=document.getElementById('it-'+id); if(!it) return; const sm=it.querySelector(':scope>summary'); sm.classList.add('cl-hit'); setTimeout(()=>sm.classList.remove('cl-hit'), 6000); }, 300); }
  });
  function init(){ L = latest(); if(!L) return; const seen = get(); if(!seen){ put(L); return; } ON = seen !== L; apply();
    const _st = showTab; showTab = function(){ const r=_st.apply(this, arguments); try{ setTimeout(apply, 50); }catch(e){} return r; }; }
  if(document.readyState==='complete') setTimeout(init, 0); else addEventListener('load', ()=>setTimeout(init, 0));
})();
