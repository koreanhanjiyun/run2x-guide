/* ============================================================
   사용법 튜토리얼 (A11): 화면을 어둡게 하고 해당 버튼만 밝게 + 설명 말풍선
   - 처음 방문하면 한 번 자동(nav2.js), 이후 상단 [?] 또는 시작 탭 [사이트 사용법]으로 다시 보기
   - [?]는 지금 탭의 짧은 코스, 시작 탭 버튼은 전체 코스
   ============================================================ */
const TOUR = {
 all: [
  ['.tabs .tab[data-tab=start]','시작','처음 온 사람을 위한 배경입니다. 각 시스템이 왜 있고 어떻게 발전했는지 읽고, 부품·설계 단계로 넘어갈 수 있습니다.'],
  ['.tabs .tab[data-tab=goals]','목표','왜 이렇게 설계하는지: 대회 배점과 목표 갈래입니다.'],
  ['.tabs .tab[data-tab=parts]','부품','무엇을 만드는지: 부품과, 부품을 그리는 데 필요한 설계 인자입니다.'],
  ['.tabs .tab[data-tab=steps]','설계 단계','어떤 순서로 설계하는지: P0부터 P10까지 단계와 항목입니다. 설계자는 주로 여기서 작업합니다.'],
  ['.tabs .tab[data-tab=graph]','연결도','항목끼리 무엇을 주고받는지 한눈에 보는 그림입니다.'],
  ['.tabs .tab[data-tab=ref]','참고','용어집·출처·변경 이력입니다.'],
  ['.tabs .tab-team','팀','팀의 진행 현황, 시즌 요약, 팀원·계정, 팀 설정이 모두 여기 있습니다.'],
  ['#gsearch','검색','항목·단계 이름으로 찾습니다. 키보드 / 를 누르면 바로 입력할 수 있습니다.'],
  ['#seasonChip','상태','지금 시즌과 로그인·팀 연결 상태입니다. 누르면 팀 탭으로 갑니다.'],
  ['#tourBtn','사용법','이 안내는 언제든 [?]를 눌러 다시 볼 수 있습니다. 지금 보는 탭의 사용법이 나옵니다.'],
 ],
 start: [
  ['#v-start .st-entry','어디로 갈까','왜(목표) → 무엇(부품) → 어떻게(설계 단계) 순서로 보면 자연스럽습니다.'],
  ['#v-start .st-card','시스템 카드','시스템마다 왜 있나 · 어떻게 발전했나 · FS에서는 순서로 읽습니다. 아래 버튼으로 부품과 단계로 넘어갑니다.'],
 ],
 steps: [
  ['#toc','목차','단계 목록입니다. 누르면 그 단계로 이동합니다.'],
  ['#partRail','파트 강조','파트를 고르면 그 파트 항목만 진하게 보입니다. 여러 개 고를 수 있습니다.'],
  ['.vtabs','보기 방식','전체 보기는 항목을 펼쳐 깊게 읽고, 흐름만 보기는 단계별 핵심 한 줄만 훑습니다.'],
  ['#step-list details.step>summary','단계','단계를 누르면 설계 항목이 펼쳐집니다. 항목을 누르면 결론·질문·계산기·논의가 나옵니다.'],
  ['#figRail','좌표계·거동','이 사이트가 쓰는 좌표계와 차체 움직임 그림입니다. 읽는 중 언제든 띄워 볼 수 있습니다.'],
 ],
 graph: [
  ['#v-graph .gcanvas','연결도','빈 곳을 끌어 이동하고, 휠로 확대·축소합니다. 항목을 누르면 받는 정보와 넘기는 결과가 강조됩니다.'],
  ['#v-graph .gctl','도구','전체 화면, 확대·축소, 전체 보기, 처음 위치입니다.'],
 ],
 parts: [
  ['#part-tree .ptflow','읽는 순서','완성차 → 시스템 → 부품 → 설계 인자 → 설계 항목. 설계 단계는 이 순서를 거꾸로 따라갑니다.'],
  ['#part-tree .ptcard, #part-tree .ptgrid > div','부품 카드','표의 인자를 누르면 그 값을 정하는 설계 항목으로 갑니다.'],
 ],
 goals: [['#goal-tree','목표','최상위 목표(종합점수)와 그 아래 갈래입니다. 펼치면 관련 설계 항목이 나옵니다.']],
 ref: [['#ref-list','참고','용어집·출처·변경 이력을 펼쳐 봅니다.']],
 team: [
  ['#v-team .tt-nav','팀 메뉴','진행 현황 · 시즌 요약 · 팀원·계정 · 팀 설정(관리자)으로 나뉩니다.'],
  ['#v-team .tt-season','보는 시즌','◀ ▶로 지난 시즌을 볼 수 있습니다. 내 화면에서만 바뀝니다.'],
  ['#v-team .tt-mat','단계 × 파트','칸마다 완료/전체 항목 수입니다. 칸을 누르면 아래 목록이 그 항목들로 바뀝니다.'],
  ['#v-team .tt-list','항목 목록','팀 관리자와 담당 파트장은 여기서 진행 상태를 바꾸고, 아래 막대의 [모두 저장]으로 저장합니다.'],
 ],
};
let TR = null;
function tourStop(){ if(!TR) return; TR.el.remove(); TR=null; removeEventListener('resize', tourPlace); }
function tourVis(sel){ const el=[...document.querySelectorAll(sel)].find(x=>{ const r=x.getBoundingClientRect(); return r.width>0 && r.height>0 && !x.closest('[hidden]'); }); return el||null; }
function tourPlace(){ if(!TR) return; const [sel,t,txt]=TR.steps[TR.i]; const el=tourVis(sel); if(!el){ return; }
  const r=el.getBoundingClientRect(), pad=6, hole=TR.el.querySelector('.tour-hole'), card=TR.el.querySelector('.tour-card');
  Object.assign(hole.style,{left:(r.left-pad)+'px', top:(r.top-pad)+'px', width:(r.width+pad*2)+'px', height:(r.height+pad*2)+'px'});
  card.querySelector('.tour-t').textContent=t; card.querySelector('.tour-x').textContent=txt; card.querySelector('.tour-n').textContent=`${TR.i+1} / ${TR.steps.length}`;
  card.querySelector('[data-tour-prev]').disabled = TR.i===0; card.querySelector('[data-tour-next]').textContent = TR.i===TR.steps.length-1 ? '마치기' : '다음';
  const cw=Math.min(340, innerWidth-24), ch=card.offsetHeight||140; let x=Math.min(Math.max(12, r.left), innerWidth-cw-12), y=r.bottom+pad+12;
  if(y+ch>innerHeight-12) y=Math.max(12, r.top-pad-12-ch);
  Object.assign(card.style,{left:x+'px', top:y+'px', width:cw+'px'}); card.querySelector('[data-tour-next]').focus({preventScroll:true}); }
function tourGo(i){ if(!TR) return; TR.i=i; const el=tourVis(TR.steps[i][0]);
  if(el){ const r=el.getBoundingClientRect(); if(r.top<60 || r.bottom>innerHeight-20) el.scrollIntoView({block:'center'}); }
  requestAnimationFrame(()=>requestAnimationFrame(tourPlace)); }
function tourStart(name){ tourStop(); const steps=(TOUR[name]||TOUR.all).filter(s=>tourVis(s[0])); if(!steps.length) return;
  const el=document.createElement('div'); el.id='tour'; el.setAttribute('role','dialog'); el.setAttribute('aria-modal','true'); el.setAttribute('aria-label','사용법 안내');
  el.innerHTML=`<div class="tour-hole"></div><div class="tour-card" aria-live="polite"><div class="tour-h"><b class="tour-t"></b><span class="tour-n muted"></span></div><p class="tour-x"></p>
    <div class="tour-b"><button type="button" class="btn small" data-tour-skip>그만 보기</button><span></span><button type="button" class="btn small" data-tour-prev>이전</button><button type="button" class="btn small pri" data-tour-next>다음</button></div></div>`;
  document.body.appendChild(el); TR={el, steps, i:0}; addEventListener('resize', tourPlace); tourGo(0); SETP('tourdone','1'); }
document.addEventListener('click', e=>{
  const s=e.target.closest('[data-tour]'); if(s){ e.preventDefault(); if(s.dataset.tour==='all'){ showTab('start'); window.scrollTo(0,0); } tourStart(s.dataset.tour); return; }
  if(e.target.closest('#tourBtn')){ e.preventDefault(); tourStart(TOUR[TAB] ? TAB : 'all'); return; }
  if(!TR) return;
  if(e.target.closest('[data-tour-next]')){ e.preventDefault(); TR.i>=TR.steps.length-1 ? tourStop() : tourGo(TR.i+1); return; }
  if(e.target.closest('[data-tour-prev]')){ e.preventDefault(); if(TR.i>0) tourGo(TR.i-1); return; }
  if(e.target.closest('[data-tour-skip]')){ e.preventDefault(); tourStop(); return; }
  if(TR.el.contains(e.target)) { e.preventDefault(); e.stopPropagation(); }
}, true);
document.addEventListener('keydown', e=>{ if(!TR) return; if(e.key==='Escape') tourStop(); else if(e.key==='ArrowRight') TR.i<TR.steps.length-1 ? tourGo(TR.i+1) : tourStop(); else if(e.key==='ArrowLeft' && TR.i>0) tourGo(TR.i-1); });
addEventListener('scroll', ()=>{ if(TR) tourPlace(); }, {passive:true});
