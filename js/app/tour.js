/* ============================================================
   사용법 안내: 지금 화면을 그대로 복제해 화면 전체에 덮고, 사용법은 그 복제본만 움직임
   - 보는 사람의 화면 그대로(해상도·창 크기 무관). 실제 화면(펼침·스크롤·탭·패널)은 끝나면 시작 전 그대로 되돌림
   - 단계 사이: 버튼을 누르는 동작(포인터) → 화면이 바뀜 → 부드럽게 스크롤 → 하이라이트 옆에 설명 카드
   - 단계: [선택자, 제목, 설명(HTML 또는 함수), {tab, home, sub(팀 하위 화면), vm(보기 방식), prep(), fx(복제본만 꾸밈), union, sync, pic}]
   ============================================================ */
const chipPic = (cls, a, b) => `<span class="tc-chip ${cls}">${a?`<b>${a}</b>`:''}<i></i><span>${b}</span></span>`;
const PIC = {
  chip: `<table class="tc-tab"><tr><td>${chipPic('tc-login','','로그인')}</td><td>로그인 전. 누르면 로그인</td></tr>
    <tr><td>${chipPic('tc-gray','2026 시즌','팀 없음')}</td><td>로그인했지만 팀이 없음. 누르면 가입</td></tr>
    <tr><td>${chipPic('tc-green','Run2X · 2026','연결됨')}</td><td>정상. 팀과 공유 중</td></tr>
    <tr><td>${chipPic('tc-orange','Run2X · 2025','지난 시즌 보는 중')}</td><td>주의. 내 화면만 지난 시즌</td></tr>
    <tr><td>${chipPic('tc-orange','Run2X · 2026','저장 안 한 변경 2')}</td><td>주의. 아래 막대에서 저장</td></tr>
    <tr><td>${chipPic('tc-orange','','연결 끊김')}</td><td>주의. 새로고침</td></tr>
    <tr><td>${chipPic('tc-red','2026 시즌','디버깅')}</td><td>개발자 시험 중(공유 안 됨)</td></tr></table>`,
  depth: `<div class="tc-depth"><div><b>단계</b> P3-1 휠 패키징 <span>펼치면 ↓</span></div><div class="d2"><b>항목</b> 스크럽 반경 <span>펼치면 ↓</span></div><div class="d3">배경 · 왜 하나 · <b>핵심</b> · 우리 팀 값 · 참고 · 질문 · 계산기 · 💬 논의</div></div>`,
  card: `<div class="tc-card"><div class="k">핵심 <span>이 항목에서 정할 것 (설계 결론)</span></div><div class="r">참고 <span>배경 설명</span></div><div class="t">우리 팀 값 <span>시즌마다 팀이 기록한 값</span></div><div class="q">질문 ▸ <span>펼쳐서 근거·유도·그림</span></div><div class="c">💬 논의 <span>팀원끼리 댓글</span></div></div>`,
  edit: `<div class="tc-flow"><span>[편집]</span>→<span>값 입력</span>→<span>[적용]</span>→<span class="pri">아래 막대 [모두 저장]</span></div><p class="tc-n">[적용]은 입력칸을 닫기만 하고, 팀원에게는 [모두 저장]을 눌러야 보입니다.</p>`,
  graph: `<div class="tc-g"><span class="n">받는 항목</span><i class="in"></i><span class="n sel">고른 항목</span><i class="out"></i><span class="n">넘기는 항목</span></div><p class="tc-n">파란 선 = 받는 정보, 초록 선 = 넘기는 결과. 오른쪽 칸에 고른 항목 내용이 나옵니다.</p>`,
  _badges: `<table class="tc-tab"><tr><td><span class="badge b-card">상세</span></td><td>상세 카드(그림·표가 많은 긴 설명)가 있는 항목</td></tr><tr><td><span class="badge b-assume">가정값</span></td><td>설명용 숫자. 팀 실측값으로 바꿀 것</td></tr><tr><td><span class="ipill st-doing">진행 중</span> <span class="ipill st-done">완료</span> <span class="ipill st-skip">이번 시즌 제외</span></td><td>팀 진행 상태. 예정이면 표시 없음</td></tr></table>`,
  roles: `<table class="tc-tab"><tr><th>팀원</th><td>읽기 · 논의 글쓰기</td></tr><tr><th>팀장·파트장</th><td>담당 파트 항목의 진행 상태·우리 팀 값 편집</td></tr><tr><th>회장</th><td>모든 편집 + 시즌 넘기기 · 팀원 역할·담당 지정 · 백업 · 팀 설정</td></tr></table>`,
};

const B = (c,t) => `<span class="badge ${c}">${t}</span>`;
/* 사용법 중에만 실제 화면을 잠깐 바꾸고, 끝나면 되돌릴 동작을 등록 */
const tgUndo = f => { if(TR && TR.snap) TR.snap.undo.push(f); };
/* 숨겨진 '진행 상태' 칸(팀원·비로그인)을 사용법 중에만 보이게 */
const showStatus = () => { const sb=$('#it-s_scrub .stbox'); if(!sb || (!sb.hidden && sb.querySelector('.stctl'))) return; const h=sb.innerHTML; sb.hidden=false;
  sb.innerHTML=`<span class="sec-label">진행 상태</span><span class="stctl">${['todo','doing','done','skip'].map(k=>`<button type="button" class="stbtn st-${k}" aria-pressed="${k==='doing'}">${ST_LABEL[k]}</button>`).join('')}</span>`;
  const wasH=sb.hidden; tgUndo(()=>{ sb.innerHTML=h; sb.hidden=wasH; }); };
const openFig = () => { const fr=$('#figRail'), md=$('#figModal'); if(!fr || !md || !md.hidden) return; const b=$('#figToggle'); if(b){ b.click(); tgUndo(()=>{ if(!md.hidden) b.click(); }); } };
const showSearch = () => { const i=$('#gsearch'); if(!i || i.value) return; i.value='ㅅㅋㄹ'; i.dispatchEvent(new Event('input',{bubbles:true})); tgUndo(()=>{ i.value=''; i.dispatchEvent(new Event('input',{bubbles:true})); i.blur(); }); };
const hideSearch = () => { const i=$('#gsearch'); if(i && i.value==='ㅅㅋㄹ'){ i.value=''; i.dispatchEvent(new Event('input',{bubbles:true})); } };
const showAsk = () => { const f=$('#fbPanel'); if(f && !f.hidden) return; const a=document.querySelector('.topask'); if(!a) return; a.click(); tgUndo(()=>{ const g=$('#fbPanel'); if(g && !g.hidden){ const x=g.querySelector('.fbp-x'); if(x) x.click(); else g.hidden=true; } }); };
const hideAsk = () => { const g=$('#fbPanel'); if(g && !g.hidden){ const x=g.querySelector('.fbp-x'); if(x) x.click(); } };
const openScrub = () => { const st=$('#st-P3-1'); if(st) st.open=true; const it=$('#it-s_scrub'); if(it){ try{ fillItem(it); }catch(e){} it.open=true; } showBits(); };
/* 로그인 전·팀원에게 숨겨진 '진행 상태'·'우리 팀 값' 칸을 사용법 중에만 보이게 (끝나면 되돌림) */
function showBits(){ const it=$('#it-s_scrub'); if(!it || !TR) return; it.querySelectorAll('.stbox,.tval').forEach(x=>{ if(x.classList.contains('tg-show')) return; x.classList.add('tg-show'); tgUndo(()=>x.classList.remove('tg-show')); }); showStatus(); }
const SC = { tab:'steps', vm:'full', prep:openScrub, fx:'doing' };
const TOUR = {
 top: [
  ['.tabs','탭','시작 → 설계 → 연결도 → 참고 순서로 보면 "왜 → 무엇을 → 어떻게"가 이어집니다. 오른쪽 끝 [팀]은 팀의 진행 기록입니다.',{union:'.tab'}],
  ['.gsearch','검색','항목·단계·부품·용어를 한 번에 찾고, 종류별로 묶어 보여 줍니다. 키보드 / 를 누르면 바로 입력합니다. 초성(ㅅㅋㄹ = 스크럽 반경…)이나 영문 약어(KPI)도 됩니다.',{prep:()=>{ showSearch(); }, also:'#gsearch-list'}],
  ['#seasonChip','상태 칩','지금 상태를 색으로 알려 줍니다. 누르면 로그인하거나 팀 탭으로 갑니다.',{pic:PIC.chip,prep:()=>{ hideSearch(); }}],
  ['.topask','문의','내용 오류·사이트 오류·기능 제안을 사이트 개발자에게 보냅니다(로그인 필요). 누르면 이렇게 문의 칸이 내려옵니다. 종류·위치(탭·단계·항목)를 고르고 내용을 적어 보냅니다. 팀과 무관하게 개발자에게만 갑니다.',{prep:()=>{ showAsk(); }, also:'#fbPanel'}],
 ],
 start: [
  ['#v-start .st-story','자동차에서 FS까지','자동차가 생기고 레이스카와 F1을 거쳐 Formula Student까지 이어진 흐름입니다. 왜 지금의 모양이 되었는지 먼저 훑습니다.',{tab:'start',home:true,prep:()=>{ hideAsk(); hideSearch(); }}],
  ['#v-start .st-goals','목표','레이스카의 목표는 "더 빠른 차" 하나입니다. 다섯 카드(그립·더 큰 힘·가볍게·일관성·끝까지)를 누르면 세부 목표와 판단 기준, 그 목표를 다루는 설계 항목이 나옵니다.',{tab:'start',home:true}],
  ['#v-start .st-sysw','시스템 카드','차를 이루는 시스템들입니다. 카드를 누르면 그 시스템 화면으로 바뀝니다: 왜 생겼나 → F1에서 어떻게 발전했나 → FS에서는 → 구성 부품(그림) → F1이 시도한 기술. 그 화면에서 [이 탭 사용법]을 누르면 시스템 화면 안내가 나옵니다.',{tab:'start',home:true}],
 ],
 sys: [
  ['#v-start .sp-nav','이동','[← 모든 시스템]으로 처음 화면에 돌아가고, 오른쪽 ‹ › 로 앞뒤 시스템으로 넘어갑니다. 같은 막대가 맨 아래에도 있습니다.',{tab:'start'}],
  ['#v-start .sp-grid .sp-sec:nth-child(1)','왜 생겼나','이 시스템이 왜 필요한지부터 읽습니다. 밑줄 친 용어에 마우스를 올리면 뜻이 나옵니다.',{tab:'start'}],
  ['#v-start .sp-grid .sp-sec:nth-child(2)','F1에서 어떻게 발전했나','시대별로 무엇이 바뀌었는지입니다.',{tab:'start'}],
  ['#v-start .sp-fs','FS에서는','FS 차에서는 어떻게 쓰는지입니다. 아래 단계 버튼을 누르면 설계 탭의 그 단계로 갑니다.',{tab:'start'}],
  ['#v-start .sp-comp .cp-card','구성 부품','부품마다 왼쪽 그림, 오른쪽 설명입니다. 설명을 내려 읽는 동안 그림이 따라옵니다. 아래로 같은 모양의 부품 카드가 이어집니다.',{tab:'start'}],
  ['#v-start .sp-tech','F1이 시도한 기술','옆으로 끌거나 양쪽 ‹ › 버튼으로 넘깁니다. 버튼으로 넘기면 카드 한 장씩 맞춰 멈춥니다.',{tab:'start',union:':scope > *, :scope .f1r-b'}],
 ],
 goalpage: [
  ['#v-start .sp-nav','이동','[← 처음 화면]으로 돌아가고, 오른쪽 ‹ › 로 앞뒤 목표로 넘어갑니다.',{tab:'start'}],
  ['#v-start .sp-head','목표','이 목표가 무엇인지 한 줄로 적었습니다.',{tab:'start'}],
  ['#v-start .gp-sec','왜','이 목표가 왜 빠른 차로 이어지는지입니다.',{tab:'start'}],
  ['#v-start .gp-subs','세부 목표','세부 목표마다 펼치면 근거와 판단 기준, 이 목표를 다루는 설계 항목이 나옵니다. 항목을 누르면 설계 탭의 그 항목으로 갑니다.',{tab:'start'}],
 ],
 steps: [
  ['#toc','목차','단계 목록입니다. 누르면 그 단계로 갑니다. 머리를 누르면 접히고(접으면 세로 글자 막대), 오른쪽 끝을 끌면 너비가 바뀝니다.',{tab:'steps',vm:'full',prep:()=>{ const t=$('#toc'); if(t) t.classList.remove('coll'); window.scrollTo({top:0,behavior:'instant'}); }}],
  ['#v-steps header .legend','표시 배지',`항목 줄과 본문에 붙는 표시입니다. ${B('b-card','상세')} 상세 카드(그림·표가 많은 긴 설명)가 있는 항목, ${B('b-assume','가정값')} 설명용 숫자라 팀 실측값으로 바꿀 것입니다.`,{tab:'steps',vm:'full',union:'span:nth-child(-n+2)'}],
  ['#v-steps [data-vm=full]','전체 보기','단계와 항목을 펼쳐 깊게 읽는 보기입니다. 처음에는 이 보기로 시작합니다.',{tab:'steps',vm:'full'}],
  ['#flow-list','흐름만 보기','단계마다 핵심 한 줄만 이어 보여 줍니다. 전체 순서를 빠르게 훑을 때 씁니다. 줄의 [열기 ›]를 누르면 전체 보기의 그 항목으로 갑니다.',{tab:'steps',vm:'flow'}],
  ['#collapse-all','모두 접기','펼친 단계·항목을 한 번에 닫습니다. 내려 읽는 중에는 위에 뜨는 경로 줄에도 같은 버튼이 있습니다.',{tab:'steps',vm:'full'}],
  ['#st-P3-1>summary','단계 줄','단계 → 항목 → 질문 순서로 세 번 펼칩니다. 단계 줄에는 항목 수·진행 막대가 있고, 오른쪽 칩은 이 단계에 나오는 파트입니다.',{tab:'steps',vm:'full',fx:'doing',reveal:'#st-P3-1>summary',prep:()=>{ const st=$('#st-P3-1'); if(st) st.open=true; }, pic:PIC.depth}],
  ['#it-s_scrub>summary','항목 줄',`항목 이름 · 파트 칩 · ${B('b-card','상세')} · 보라 칩(이 항목을 마치면 확정되는 것) · 오른쪽에 팀 진행 상태(<span class="ipill st-doing">진행 중</span> <span class="ipill st-done">완료</span>, 예정이면 표시 없음) · [연결도] 버튼입니다. 마우스를 올리면 🔗(링크 복사)가 보입니다.`,{...SC,reveal:'#it-s_scrub>summary'}],
  ['#it-s_scrub','항목 카드','펼친 항목 전체입니다. 위에서부터 차례로 짚어 내려가겠습니다. 항목에 따라 맨 위에 [배경](처음 보는 사람을 위한 설명)이 있습니다.',{...SC,pic:PIC.card}],
  ['#it-s_scrub .stbox','진행 상태','담당 팀장·파트장과 회장에게만 보이는 칸입니다. 예정·진행 중·완료·제외를 바로 누르면 "저장 전"으로 표시되고, 아래 막대의 [모두 저장]을 눌러야 팀에 저장됩니다. 저장한 상태는 항목 줄 오른쪽에 표시됩니다.',{...SC}],
  ['#it-s_scrub .gpath','왜 하나','이 항목이 어떤 목표로 이어지는지 보여 줍니다. 누르면 시작 탭의 그 목표 화면으로 갑니다.',{...SC}],
  ['#it-s_scrub .actbox','핵심','이 항목에서 정할 것, 즉 설계 결론입니다. 항목을 열면 이것부터 읽으십시오.',{...SC}],
  ['#it-s_scrub .vrow','값 이름 표시','밑줄 글자는 누르는 버튼이 아니라 값 이름입니다. 진한 밑줄 = 우리 팀이 정할 값, 가는 밑줄 = 앞 값에서 계산되는 값, 점선 = 지켜야 할 제약(규정·조건)입니다.',{...SC}],
  ['#it-s_scrub .tval','우리 팀 값','위 값들을 팀이 이 시즌에 실제로 정해 기록한 것입니다. 시즌 글자를 누르면 다른 해 값을 봅니다. 담당 팀장·파트장과 회장은 [편집]으로 고칩니다.',{...SC,pic:PIC.edit}],
  ['#it-s_scrub .concl','참고','핵심을 뒷받침하는 배경 설명입니다. 점선 상자는 "결론이 아니라 읽을거리"라는 뜻입니다.',{...SC}],
  ['#it-s_scrub details.calc','계산기','예시값(가정값)이 들어 있습니다. 우리 팀 값으로 바꾸면 결과가 바로 다시 계산됩니다. [예시값으로]는 처음 값으로 되돌립니다.',{...SC}],
  ['#it-s_scrub','질문 펼침','근거는 질문 단위로 접혀 있습니다. 질문을 펼치면 유도·그림·표가 나옵니다. 질문 안에 또 질문이 있으면 한 번 더 펼칩니다.',{...SC,union:':scope details.q:not(details.q details.q)'}],
  ['#it-s_scrub .tk>.tk-d','논의','팀원끼리 이 항목에 대해 이야기하는 곳입니다. 답글을 달 수 있고, 내 글은 고치거나 지울 수 있습니다. 새 글이 있으면 항목 줄에 글 수가 뜹니다.',{...SC}],
  ['#crumb','지금 위치','내려 읽는 동안 지금 단계 › 항목을 위에 한 줄로 보여 줍니다. 눌러서 그 머리로 가거나 [이 항목 접기]·[모두 접기]로 닫습니다.',{...SC,sync:true,prep:()=>{ openScrub(); const it=$('#it-s_scrub'); if(it) window.scrollTo({top:it.getBoundingClientRect().top+scrollY+260,behavior:'instant'}); }}],
  ['#partRail','파트 강조','평소에는 접혀 있고 마우스를 올리면 펼쳐집니다(빼면 다시 접힘). 파트를 고르면 그 파트 항목만 진하게 보이고 나머지는 흐려지며, 여러 개 고를 수 있습니다. 머리를 누르면 펼친 채 고정(📌)됩니다.',{...SC,sync:true,prep:()=>{ const r=$('#partRail'); if(r) r.classList.remove('coll'); }}],
  ['#figModal .fm-panel','좌표계·거동','오른쪽 [좌표계·거동] 배너를 누르면 이 가이드가 쓰는 좌표계와 차체 움직임 그림이 겹쳐 뜹니다. 바깥을 누르거나 Esc로 닫습니다.',{...SC,sync:true,reveal:'#figToggle',prep:()=>{ const r=$('#partRail'); if(r) r.classList.add('coll'); openFig(); }}],
 ],
 graph: [
  ['#v-graph .gcanvas','연결도','가로는 설계 단계, 세로는 파트입니다. 빈 곳을 끌어 이동하고 휠로 확대·축소합니다.',{tab:'graph'}],
  ['#v-graph .gcanvas','항목 고르기','항목 카드를 누르면 받는 정보(파랑)와 넘기는 결과(초록) 선이 강조되고, 오른쪽 칸에 그 항목 내용이 나옵니다. 빈 곳을 누르면 선택이 풀립니다.',{tab:'graph',pic:PIC.graph,press:'#graph .node[data-id=g_mass]',prep:()=>{ try{ selectItem('g_mass',false); }catch(e){} }}],
  ['#v-graph .g-legend','범례','선 색·점 이은 선·주황 세로선·보라 점·진행 표시의 뜻입니다.',{tab:'graph',union:'span'}],
  ['#v-graph .gctl','도구','전체 화면, 확대·축소, 전체 보기, 처음 위치입니다. 오른쪽 파트 강조로 원하는 파트만 진하게 볼 수 있습니다.',{tab:'graph',union:'button'}],
 ],
 ref: [['#ref-list','참고','용어집(검색 가능)·기준 규정·출처·변경 이력입니다. 줄을 누르면 펼쳐집니다.',{tab:'ref'}]],
 team_nolog: [
  ['#v-team .tt-nav','팀 메뉴','로그인 전에는 [팀원 · 계정]이 먼저 열립니다. 로그인하고 팀에 가입하면 진행 현황·시즌 요약이 보입니다. [대회 점수]는 로그인 없이 볼 수 있습니다.',{tab:'team',sub:'account',union:'button:not([hidden])'}],
  ['#v-team #teamPanel','로그인 · 가입','구글로 로그인한 뒤 회장에게 받은 팀 이름·비밀번호로 가입합니다. 가이드와 계산기는 로그인 없이 쓸 수 있습니다.',{tab:'team',sub:'account'}],
 ],
 team_common: [
  ['#v-team .tt-nav','팀 메뉴',()=>'진행 현황 · 시즌 요약 · 대회 점수 · 팀원·계정'+((SH.on&&SH.canAdmin)?', 회장은 팀 설정까지 있습니다. 팀 설정 사용법은 팀 설정 화면에서 [이 탭 사용법]을 누르면 따로 나옵니다.':'입니다.'),{tab:'team',sub:'progress',union:'button:not([hidden])',pic:PIC.roles}],
  ['#v-team .tt-season','보는 시즌','‹ ›로 지난 시즌을 봅니다. 내 화면만 바뀌고, 진행 현황·시즌 요약·팀원 명단이 모두 그 시즌으로 바뀝니다. 지난 시즌을 보는 동안은 주황 띠가 뜹니다.',{tab:'team',sub:'progress'}],
  ['#v-team .tt-sum','진행 요약','파트별 완료 비율입니다.',{tab:'team',sub:'progress'}],
  ['#v-team .tt-cards','바로 볼 것','착수 가능(앞 항목이 끝나 시작해도 되는 것) · 선행 미완료 경고 · 제외 영향 · 최근 변경 · 최근 논의 · 우리 팀 값 입력 현황입니다.',{tab:'team',sub:'progress'}],
  ['#v-team .tt-card:has(.tt-mat)','단계 × 파트','칸마다 완료/전체 항목 수입니다. 칸을 누르면 아래 목록이 그 칸의 항목으로 바뀝니다.',{tab:'team',sub:'progress'}],
  ['#v-team .tt-card:has(.tt-list)','항목 목록',()=> (SH.on && SH.canAdmin) ? '항목 이름을 누르면 설계 탭의 그 항목으로 갑니다. 회장은 모든 항목의 진행 상태(예정·진행 중·완료·제외)를 여기서 바로 바꾸고, 아래 막대의 [모두 저장]으로 저장합니다.'
     : (SH.on && isLeadRole(SH.role)) ? '항목 이름을 누르면 설계 탭의 그 항목으로 갑니다. 담당 파트 항목은 진행 상태(예정·진행 중·완료·제외)를 여기서 바로 바꾸고, 아래 막대의 [모두 저장]으로 저장합니다.'
     : '항목 이름을 누르면 설계 탭의 그 항목으로 갑니다. 진행 상태는 담당 팀장·파트장과 회장이 바꿉니다.',{tab:'team',sub:'progress'}],
  ['#v-team [data-ttp=summary] .tt-report','시즌 요약','진행 상태·우리 팀 값·논의를 자동으로 모은 읽기 전용 페이지입니다. 인수인계 때 그대로 보여 주면 됩니다.',{tab:'team',sub:'summary'}],
  ['#v-team #fsRec','대회 점수','FS 종목별 배점과 우리 팀의 지난 기록입니다. 고른 시즌을 가운데에 두고 앞뒤 시즌과 비교합니다.',{tab:'team',sub:'score'}],
  ['#v-team #teamPanel .tp-s-me','내 계정','로그인한 구글 계정입니다. 이메일은 기본으로 가려져 있고 [보기]로 잠깐 봅니다. [로그아웃]도 여기 있습니다.',{tab:'team',sub:'account'}],
  ['#v-team #teamPanel .tp-s-dname','팀에 보이는 이름','팀원 명단·검토 기록·논의에 보이는 이름입니다. 구글 계정 이름과 따로 정하고(1~20자), 회장도 바꿀 수 있습니다. 서로 알아볼 수 있게 실명을 권장합니다.',{tab:'team',sub:'account'}],
  ['#v-team #teamPanel .tp-s-teams','내 팀','가입한 팀 목록입니다. [이동]으로 지금 팀을 바꾸고, [나가기]는 한 번 더 눌러 확인합니다. 회장은 나갈 수 없습니다.',{tab:'team',sub:'account'}],
  ['#v-team #teamPanel .tp-s-invite','팀원 초대','사이트 주소·팀 이름·가입 방법이 담긴 문구를 복사합니다. 비밀번호는 따로 알려 주십시오.',{tab:'team',sub:'account'}],
  ['#v-team #teamPanel .tp-s-join','다른 팀 가입','회장에게 받은 팀 이름(대소문자 무관)과 비밀번호(대소문자 구분)로 가입합니다.',{tab:'team',sub:'account'}],
  ['#v-team #teamPanel .tp-s-create','새 팀 만들기','만든 사람이 첫 회장이 됩니다. 팀 이름은 다른 팀과 겹칠 수 없습니다.',{tab:'team',sub:'account'}],
  ['#v-team #teamPanel .tp-mbar','명단 검색·거르기','이름·역할·파트로 찾고(초성 가능), 역할과 명단(이 시즌 / 전체)으로 거릅니다. 오른쪽 숫자는 지금 보이는 인원입니다.',{tab:'team',sub:'account'}],
  ['#v-team #teamPanel .tp-mscroll','팀원 명단','회장 → 팀장 → 파트장 → 팀원 순, 같은 역할은 가나다순입니다. 팀장·파트장은 담당 파트가 함께 보입니다. 보는 시즌을 바꾸면 그 시즌 명단이 나옵니다.',{tab:'team',sub:'account'}],
 ],
 team_admin: [
  ['#v-team .adm-tm .tp-s-season','팀의 이번 시즌 (회장)','새 시즌이 시작되면 여기서 ‹ ›로 해를 고르고 [이번 시즌으로 정하기]를 두 번 누릅니다. 팀 전체가 새 시즌이 되고, 지난 시즌 기록은 그대로 남습니다. 위쪽 "보는 시즌"과는 따로 움직입니다.',{tab:'team',sub:'settings'}],
  ['#v-team .adm-tm .tp-mtw','팀원 관리 (회장)','전체 팀원 표에서 이번 시즌 명단·역할·담당 파트·이름을 바꾸고, 내보내기·차단을 합니다. 칸마다 차례로 봅니다.',{tab:'team',sub:'settings',pic:PIC.roles}],
  ['#v-team .adm-tm .tp-mtm tbody tr td:nth-child(2)','명단 체크 (회장)','체크한 사람만 이번 시즌 명단입니다. 새 시즌에는 이어 가는 사람을 체크하십시오. 빼도 지난 시즌 기록은 남습니다.',{tab:'team',sub:'settings'}],
  ['#v-team .adm-tm .tp-mtm tbody tr td:nth-child(3)','역할 (회장)','회장·팀장·파트장·팀원 중 고릅니다. 회장은 한 명 이상 남아야 저장됩니다. 명단·역할·담당 파트를 바꾼 줄은 "저장 전"으로 표시되고, 아래 막대 [모두 저장]을 눌러야 반영됩니다.',{tab:'team',sub:'settings'}],
  ['#v-team .adm-tm .tp-mtm tbody tr[data-r="head"] td.tp-mp, #v-team .adm-tm .tp-mtm tbody tr[data-r="lead"] td.tp-mp','담당 파트 칩 (회장)','팀장·파트장만 나옵니다. 고른 칩만 보이다가 [바꾸기]로 펼쳐 켜고 끄고, [접기]로 닫습니다. 팀장은 샤시·전기 묶음 칩 하나로 그 묶음 전체와 공통 항목을 편집하고, 파트장을 겸하면 그 파트 칩을 더 켜 둡니다.',{tab:'team',sub:'settings',prep:tmDemoRow}],
  ['#v-team .adm-tm .tp-mtm tbody .tp-nmbtn','이름 바꾸기 (회장)','이름 옆 [이름]으로 그 사람의 팀에 보이는 이름을 고칩니다. 이것은 [저장]을 누르면 바로 저장됩니다.',{tab:'team',sub:'settings'}],
  ['#v-team .adm-tm .tp-mtm tbody td.tp-mx button','내보내기 · 차단 (회장)','한 번 더 눌러 확인하면 바로 실행됩니다. 차단한 사람은 비밀번호를 알아도 다시 가입할 수 없습니다. 표 위 명단 선택을 [차단한 사람]으로 바꾸면 같은 자리에 차단 목록이 나오고, 여기서 [차단 해제]합니다.',{tab:'team',sub:'settings',prep:tmDemoRow}],
  ['#v-team .adm-tm .tp-s-name','팀 이름·비밀번호 (회장)','팀 이름과 가입 비밀번호를 바꿉니다. 현재 비밀번호는 [보기]로 확인하고 [복사]로 공유합니다.',{tab:'team',sub:'settings'}],
  ['#v-team .adm-tm .tp-s-backup','백업 (회장)','시즌이 끝날 때마다 [내보내기]로 파일을 저장해 두십시오. [불러오기]는 고른 시즌만 복구합니다.',{tab:'team',sub:'settings'}],
  ['#v-team .adm-tm .tp-dz','위험 구역 (회장)','시즌 초기화·팀 삭제처럼 되돌릴 수 없는 작업입니다. 두 번 확인한 뒤 실행됩니다.',{tab:'team',sub:'settings'}],
 ],
 end: [['#tourBtn','언제든 다시','이 안내는 오른쪽 위 [이 탭 사용법]으로 언제든 다시 볼 수 있습니다. 지금 보고 있는 탭(시작 탭은 지금 보는 화면)의 안내가 나옵니다.']],
};
/* 팀 설정 사용법: 팀장·파트장이 없거나 회장 혼자인 팀에서도 칩·내보내기·차단 단계를 보이도록, 표 맨 위에 "사용법 예시" 줄을 잠깐 넣음 (화면에만, 저장 안 됨, 사용법이 끝나면 지움) */
function tmDemoRow(){ const tb=document.querySelector('#v-team .adm-tm .tp-mtm tbody'); if(!tb || tb.querySelector('tr.tg-demo')) return;
  const hasLead = tb.querySelector('tr[data-r="head"] td.tp-mp, tr[data-r="lead"] td.tp-mp'), hasMx = tb.querySelector('td.tp-mx button');
  if(hasLead && hasMx) return;
  const tr=document.createElement('tr'); tr.className='tp-card tp-person tg-demo'; tr.dataset.r='head'; tr.dataset.in='1';
  tr.innerHTML=`<td class="tp-mn">예시 팀장 <span class="pend-tag">사용법 예시</span> <button type="button" class="lnk tp-nmbtn" tabindex="-1">이름</button></td>
    <td><label class="tp-small"><input type="checkbox" checked disabled> 명단</label></td>
    <td><select disabled><option>팀장</option></select></td>
    <td class="tp-mp"><div class="tp-parts tp-parts-ro"><span class="tp-pchip on ro grp">샤시</span><span class="tp-pchip on ro">서스</span><button type="button" class="lnk tp-chipt" tabindex="-1">바꾸기</button></div></td>
    <td class="tp-mx"><button type="button" class="lnk" tabindex="-1">내보내기</button> <button type="button" class="lnk tp-warnlnk" tabindex="-1">차단</button></td>`;
  tb.prepend(tr); tgUndo(()=>tr.remove()); }
const teamNolog = () => !SH.on && !!(window.Backend && Backend.kind()==='firebase') && !(typeof TT!=='undefined' && TT.ctx && TT.ctx.state==='member');
const teamCourse = () => teamNolog() ? [...TOUR.team_nolog] : [...TOUR.team_common];
/* 팀 설정 화면에서 [이 탭 사용법]을 누르면 팀 설정 사용법만 */
const teamSettingsOn = () => !!document.querySelector('#v-team [data-ttp=settings]:not([hidden])');
const startCourse = () => { const s=(typeof START!=='undefined' && START.sys) || ''; return !s ? TOUR.start : s.startsWith('goal:') ? TOUR.goalpage : TOUR.sys; };
const courseOf = name => name==='all' ? [...TOUR.top, ...TOUR.start, ...TOUR.steps, ...TOUR.graph, ...TOUR.ref, ...teamCourse(), ...TOUR.end]
  : name==='team' ? (teamSettingsOn() && SH.on && SH.canAdmin ? [...TOUR.team_admin] : teamCourse()) : name==='start' ? [...startCourse()] : (TOUR[name] ? [...TOUR[name]] : [...TOUR.top]);

/* ---------- 엔진 ---------- */
let TR = null;
const tgReduced = () => false;   /* 사용법 애니메이션은 OS의 '움직임 줄이기' 설정과 상관없이 항상 보여 줌 */
const tgSleep = ms => new Promise(r=>setTimeout(r, (TR && TR.fast) ? 0 : ms));
const tgFrame = () => new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
const tourTabH = () => { try{ return tabH(); }catch(e){ return 50; } };
function tourVis(sel){ return [...document.querySelectorAll(sel)].find(x=>{ if(x.closest('#tour')) return false; const r=x.getBoundingClientRect(); return r.width>0 && r.height>0 && !x.closest('[hidden]'); }) || null; }
function tourRect(el, o){ const r0=tourRect0(el,o); const a=o && o.also && tourVis(o.also); if(!a) return r0; const q=a.getBoundingClientRect(); const L=Math.min(r0.left,q.left), T=Math.min(r0.top,q.top), R=Math.max(r0.right,q.right), Bt=Math.max(r0.bottom,q.bottom); return {left:L, top:T, right:R, bottom:Bt, width:R-L, height:Bt-T}; }
function tourRect0(el, o){ if(o && o.union){ const ks=[...el.querySelectorAll(o.union)].map(x=>x.getBoundingClientRect()).filter(r=>r.width&&r.height); if(ks.length){ const L=Math.min(...ks.map(r=>r.left)), T=Math.min(...ks.map(r=>r.top)), R=Math.max(...ks.map(r=>r.right)), Bt=Math.max(...ks.map(r=>r.bottom)); return {left:L, top:T, right:R, bottom:Bt, width:R-L, height:Bt-T}; } } return el.getBoundingClientRect(); }
/* 화면에 붙어 있는 것(탭 막대·목차·패널·경로 줄)인지 */
function tgFixed(el){ let t=el; while(t && t.parentElement!==document.body) t=t.parentElement; if(!t) return false; const p=getComputedStyle(t).position; return p==='fixed' || p==='sticky'; }

/* 시작 전 상태 → 끝나면 그대로 */
function tgSnap(){ return { tab:TAB, vm:(typeof VMODE!=='undefined')?VMODE:undefined, y:scrollY, open:new Set(document.querySelectorAll('details[open]')), sys:(typeof START!=='undefined')?START.sys:undefined,
    ttsub:(typeof TT!=='undefined')?TT.sub:undefined, picked:(typeof TT!=='undefined')?TT.picked:undefined, sel:(typeof SEL!=='undefined')?SEL:undefined, rail:($('#partRail')||{}).className, toc:($('#toc')||{}).className, undo:[], status:(typeof STATUS!=='undefined')?Object.assign({},STATUS):null }; }
function tgRestore(s){
  (s.undo||[]).reverse().forEach(f=>{ try{ f(); }catch(e){} });
  try{ if(TAB!==s.tab) showTab(s.tab); }catch(e){}
  try{ if(s.vm!==undefined && VMODE!==s.vm) setVM(s.vm); }catch(e){}
  try{ if(s.sys!==undefined && START.sys!==s.sys) renderStart(s.sys); }catch(e){}
  try{ if(s.ttsub!==undefined && (TT.sub!==s.ttsub || TT.picked!==s.picked)){ TT.sub=s.ttsub; TT.picked=s.picked; if(TAB==='team') renderTeamTab(); } }catch(e){}
  document.querySelectorAll('details[open]').forEach(d=>{ if(!s.open.has(d) && !d.closest('#tour')) d.open=false; }); s.open.forEach(d=>{ if(d.isConnected && !d.open) d.open=true; });
  try{ if(s.sel!==undefined && SEL!==s.sel){ s.sel ? selectItem(s.sel,false) : clearSel(); } }catch(e){}
  const r=$('#partRail'); if(r && s.rail!=null) r.className=s.rail; try{ applyPart(); }catch(e){}
  const t=$('#toc'); if(t && s.toc!=null) t.className=s.toc;
  requestAnimationFrame(()=>requestAnimationFrame(()=>{ window.scrollTo({top:s.y, behavior:'instant'}); try{ dispatchEvent(new Event('scroll')); }catch(e){} })); }

/* 지금 화면을 복제 (스크립트·겹친 층 제외). 화면에 붙은 것은 따로 고정 층에 */
const TG_SKIPID = new Set(['tour','demoBar','demoDiag','tip','busyBar','mobileNote']);
/* 본문이 실제로 놓이는 폭. 시안 뷰어에서는 짧은 페이지일 때 clientWidth(1920)가 스크롤바 자리를 빼지 않아 body(1905)와 달라져 복제 화면이 오른쪽으로 밀렸음 */
const tgW = () => { const b=document.body, cs=getComputedStyle(b); return Math.round(b.getBoundingClientRect().width + parseFloat(cs.marginLeft) + parseFloat(cs.marginRight)); };
function tgClone(fx){ const W=tgW(), H=innerHeight;
  const page=document.createElement('div'); page.className='tg-page'; page.style.width=W+'px'; page.style.height=document.documentElement.scrollHeight+'px';
  const fix=document.createElement('div'); fix.className='tg-fix'; fix.style.width=W+'px'; fix.style.height=H+'px';
  for(const el of [...document.body.children]){ if(/^(SCRIPT|STYLE|LINK|NOSCRIPT|TEMPLATE)$/.test(el.tagName) || TG_SKIPID.has(el.id) || el.classList.contains('toast')) continue;
    if(el.id==='crumb' && !(TR && TR.keepCrumb)) continue;   /* 경로 줄은 '지금 위치' 단계에서만 */
    const cs=getComputedStyle(el); if(cs.display==='none' || el.hidden) continue;
    const c=el.cloneNode(true); const src=[...el.querySelectorAll('input,select,textarea')], dst=[...c.querySelectorAll('input,select,textarea')];
    src.forEach((x,i)=>{ const y=dst[i]; if(!y) return; if(x.type==='checkbox'||x.type==='radio'){ if(x.checked) y.setAttribute('checked',''); else y.removeAttribute('checked'); } else if(x.tagName==='SELECT'){ [...y.options].forEach((o,j)=>{ if(j===x.selectedIndex) o.setAttribute('selected',''); else o.removeAttribute('selected'); }); } else y.setAttribute('value', x.value); if(x.tagName==='TEXTAREA') y.textContent=x.value; });
    /* 그림(캔버스)은 복제되지 않으므로 지금 그려진 것을 옮겨 그림 (안 되면 빈칸) */
    const cv=[...el.querySelectorAll('canvas')], cc=[...c.querySelectorAll('canvas')]; cv.forEach((x,i)=>{ const y=cc[i]; if(!y) return; try{ y.width=x.width; y.height=x.height; y.getContext('2d').drawImage(x,0,0); }catch(e){ y.style.visibility='hidden'; } });
    const sc=[...el.querySelectorAll('*')].filter(x=>x.scrollTop||x.scrollLeft), dc=sc.map(x=>{ const path=[]; let n=x; while(n && n!==el){ path.unshift([...n.parentNode.children].indexOf(n)); n=n.parentNode; } return path; });
    if(cs.position==='fixed' || cs.position==='sticky'){ const r=el.getBoundingClientRect();
      if(cs.position==='sticky'){ const ph=el.cloneNode(true); ph.style.visibility='hidden'; page.appendChild(ph); }
      Object.assign(c.style,{position:'absolute', left:r.left+'px', top:r.top+'px', width:r.width+'px', height:r.height+'px', right:'auto', bottom:'auto', margin:'0', transform:'none', maxHeight:'none'});
      fix.appendChild(c); }
    else page.appendChild(c);
    /* 안쪽 스크롤 위치(표·목차 등)도 그대로 */
    requestAnimationFrame(()=>dc.forEach((path,i)=>{ let n=c; for(const k of path){ n=n && n.children[k]; } if(n){ n.scrollTop=sc[i].scrollTop; n.scrollLeft=sc[i].scrollLeft; } })); }
  [page, fix].forEach(x=>{ x.querySelectorAll('[id]').forEach(n=>n.setAttribute('data-tgid', n.id));  x.querySelectorAll('[autofocus]').forEach(n=>n.removeAttribute('autofocus')); });
  if(fx==='doing'){ const it=page.querySelector('[data-tgid="it-s_scrub"]'); if(it){ it.classList.add('st-doing'); const pl=it.querySelector(':scope>summary .ipill'); if(pl){ pl.hidden=false; pl.removeAttribute('hidden'); pl.className='ipill st-doing'; pl.textContent='진행 중'; }
      const sb=it.querySelector('.stbox'); if(sb){ sb.hidden=false; sb.removeAttribute('hidden'); if(sb.querySelector('.stctl')) sb.querySelectorAll('.stbtn').forEach(x=>x.setAttribute('aria-pressed', String(x.classList.contains('st-doing')))); else sb.innerHTML=`<span class="sec-label">진행 상태</span><span class="stctl">${['todo','doing','done','skip'].map(k=>`<button type="button" class="stbtn st-${k}" aria-pressed="${k==='doing'}">${ST_LABEL[k]}</button>`).join('')}</span>`; } } }
  return {page, fix}; }

/* 기하: 실제 화면 좌표 → 복제본 좌표 */
function tgGeom(el, o){ const r=tourRect(el,o), H=innerHeight, top=tourTabH()+14, docH=document.documentElement.scrollHeight;
  const pr=[tourRect0(el,o)]; const a=o && o.also && tourVis(o.also); if(a) pr.push(a.getBoundingClientRect());
  const fx=tgFixed(el), mk=(off)=>pr.map(q=>({x:q.left, y: fx||(a&&q!==pr[0]&&tgFixed(a)) ? q.top : q.top+scrollY-off, w:q.width, h:q.height}));
  if(fx){ const off2=o.sync ? scrollY : TR.off; return {fixed:true, off:off2, x:r.left, y:r.top, w:r.width, h:r.height, parts:mk(off2)}; }
  const dt=r.top+scrollY, avail=H-top-14; let off=TR.off;
  const big = r.height > avail;
  if(big) off = dt-top;                                     /* 큰 대상: 위 모서리를 탭 막대 바로 밑에 */
  else if(o.sync) off = scrollY;
  else if(dt < off+top || dt+r.height > off+H-14) off = dt - top - (avail-r.height)/2;
  off = Math.max(0, Math.min(off, Math.max(0, docH-H)));
  return {fixed:false, off, x:r.left, y:dt-off, w:r.width, h:Math.min(r.height, H-(dt-off)-6), dt, parts:mk(off).map(q=>({...q, h:Math.min(q.h, H-q.y-6)}))}; }
function tgApply(){ if(!TR) return; const pg=TR.page; if(pg) pg.style.transform=`translateY(${-TR.off}px)`; }
function tgScrollTo(off){ return new Promise(res=>{ if(!TR) return res(); const a=TR.off, d=off-a; if(Math.abs(d)<2 || tgReduced() || TR.fast){ TR.off=off; tgApply(); return res(); }
  const dur=Math.min(1600, Math.max(700, 500+Math.abs(d)*0.6)), t0=performance.now(), ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2, tk=TR;
  const step=now=>{ if(TR!==tk) return res(); const t=TR.fast ? 1 : Math.min(1,(now-t0)/dur); TR.off=a+d*ease(t); tgApply(); if(t<1) requestAnimationFrame(step); else res(); };
  requestAnimationFrame(step); }); }
/* 어둑한 화면(하이라이트 없음) ↔ 하이라이트: 서로 교차해 밝기를 바꿈 */
function tgDim(on){ if(!TR) return; TR.el.classList.toggle('tg-dimmed', !!on); }
/* 하이라이트: 여러 조각(예: 문의 버튼 + 문의 칸)이면 이어 붙인 모양으로 구멍을 내고, 그 바깥선만 테두리 */
function tgHole(g){ if(!TR) return; const h=TR.el.querySelector('.tg-hole'); if(!g){ h.classList.remove('on'); return; } const pad=8, rr=10, ow=3;
  const parts=(g.parts && g.parts.length ? g.parts : [g]).filter(q=>q.w>0 && q.h>0);
  /* 가까운 조각(세로 간격 48px 이하, 가로로 겹침)은 다리 사각형으로 이어 한 모양으로 */
  const base=parts.slice();
  for(let i=0;i<base.length;i++) for(let j=0;j<base.length;j++){ if(i===j) continue; const a=base[i], b=base[j];
    const gap=b.y-(a.y+a.h); if(gap<-2 || gap>48) continue;
    const x0=Math.max(a.x,b.x), x1=Math.min(a.x+a.w,b.x+b.w); if(x1-x0<12) continue;
    parts.push({x:x0+4, y:a.y+a.h-rr, w:x1-x0-8, h:gap+rr*2}); }
  const R=(q,e)=>`<rect x="${q.x-pad-e}" y="${q.y-pad-e}" width="${q.w+(pad+e)*2}" height="${q.h+(pad+e)*2}" rx="${rr+e}"/>`;
  const W=innerWidth, H=innerHeight, id='tgm'+(++TR.hn);
  /* 조각이 여럿이면 흐림 → 경계 다시 세우기(goo)로 이음매의 안쪽 모서리도 둥글게 */
  const goo = parts.length>1 ? ` filter="url(#${id}g)"` : '';
  h.innerHTML=`<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs><filter id="${id}g" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><feGaussianBlur stdDeviation="5"/><feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -12"/></filter>
    <mask id="${id}a"><rect width="${W}" height="${H}" fill="#fff"/><g fill="#000"${goo}>${parts.map(q=>R(q,0)).join('')}</g></mask></defs>
    <rect width="${W}" height="${H}" fill="rgba(14,10,24,.55)" mask="url(#${id}a)"/><g mask="url(#${id}a)"><g fill="#ffb454"${goo}>${parts.map(q=>R(q,ow)).join('')}</g></g></svg>`;
  h.classList.add('on'); }
/* 설명 카드: 하이라이트 옆(오른쪽 → 왼쪽 → 아래 → 위), 자리가 없으면 화면 아래 구석 (제목을 가리지 않게) */
function tgCard(g){ const c=TR.el.querySelector('.tour-card'), vw=document.documentElement.clientWidth, vh=innerHeight, pad=6, top=tourTabH();
  const o=(TR.steps[TR.i]||[])[3]||{}; const cw=Math.min(o.pic?440:360, vw-24); c.style.width=cw+'px'; const ch=c.offsetHeight||170;
  const L=g.x-pad, T=g.y-pad, R=g.x+g.w+pad, Bt=Math.min(vh, g.y+g.h+pad);
  const cy=v=>Math.max(top+8, Math.min(v, vh-ch-12)); let x, y;
  if(vw-R-16 >= cw+12){ x=R+16; y=cy(T); }
  else if(L-16 >= cw+12){ x=L-cw-16; y=cy(T); }
  else if(vh-Bt-12 >= ch+12){ y=Bt+12; x=Math.max(12, Math.min(L, vw-cw-12)); }
  else if(T-top-12 >= ch+12){ y=T-ch-12; x=Math.max(12, Math.min(L, vw-cw-12)); }
  else { x=vw-cw-16; y=vh-ch-16; }
  Object.assign(c.style,{left:x+'px', top:y+'px'}); }
async function tgRebuild(fx, fade){ if(!TR) return; const sc=TR.el.querySelector('.tg-scale'), old=[...sc.querySelectorAll('.tg-page,.tg-fix')]; const {page, fix}=tgClone(fx);
  sc.insertBefore(fix, sc.querySelector('.tg-hole')); sc.insertBefore(page, fix); TR.off=Math.max(0, Math.min(TR.off, Math.max(0, document.documentElement.scrollHeight-innerHeight))); page.style.transform=`translateY(${-TR.off}px)`; TR.page=page;
  if(fade && !tgReduced()) old.forEach(o=>o.style.transitionDuration=fade+'ms'); requestAnimationFrame(()=>old.forEach(o=>{ o.classList.add('tg-old'); })); await tgSleep(tgReduced()?0:(fade||140)+20); old.forEach(o=>o.remove()); }
/* 버튼을 누르는 동작: 포인터가 가서 누름 (복제본 위에서) */
async function tgPress(sel){ if(!TR) return; const el=tourVis(sel); if(!el) return; let g=tgGeom(el,{});
  if(!g.fixed && Math.abs(g.off-TR.off)>2){ tgHole(null); await tgScrollTo(g.off); if(!TR) return; g=tgGeom(el,{}); }
  const p=TR.el.querySelector('.tg-ptr'), cx=g.x+g.w/2, cy=g.y+g.h/2; tgHole(g); tgDim(false);
  if(tgReduced() || TR.fast){ Object.assign(p.style,{left:cx+'px',top:cy+'px'}); return; }
  const tk=TR; p.classList.add('on'); p.style.left=cx+'px'; p.style.top=cy+'px'; await tgSleep(620); if(TR!==tk) return; p.classList.add('down'); await tgSleep(240); p.classList.remove('down'); await tgSleep(200); if(TR!==tk) return;
  p.classList.remove('on'); tgDim(true); tgHole(null); await tgSleep(200); }
async function tgFind(sel){ for(let k=0;k<20;k++){ const el=tourVis(sel); if(el) return el; await tgSleep(60); } return null; }
function tgText(i){ const st=TR.steps[i], o=st[3]||{}, card=TR.el.querySelector('.tour-card');
  card.querySelector('.tour-t').textContent=st[1]; card.querySelector('.tour-x').innerHTML = typeof st[2]==='function' ? st[2]() : st[2];
  const pc=card.querySelector('.tour-pic'); pc.innerHTML=o.pic||''; pc.hidden=!o.pic;
  card.querySelector('.tour-n').textContent=`${i+1} / ${TR.steps.length}`;
  card.querySelector('[data-tour-prev]').disabled = i===0; card.querySelector('[data-tour-next]').textContent = i===TR.steps.length-1 ? '마치기' : '다음'; }
/* 그 단계 화면으로 가는 데 필요한 버튼 누름(탭·처음 화면·하위 화면·보기 방식) */
function tgClicks(o){ const c=[];
  if(o.tab && TAB!==o.tab) c.push({sel:`.tabs .tab[data-tab="${o.tab}"]`, run:()=>{ showTab(o.tab); }, reset:true});
  if(o.home && typeof START!=='undefined' && START.sys) c.push({sel:'#v-start .sp-nav [data-sysgo=""]', run:()=>{ renderStart(''); window.scrollTo({top:0,behavior:'instant'}); }, reset:true});
  if(o.sub && typeof TT!=='undefined'){ const vis=document.querySelector(`#v-team [data-ttp="${o.sub}"]:not([hidden])`); if(!vis || (o.tab && TAB!==o.tab)) c.push({sel:`#v-team .tt-nav [data-tts="${o.sub}"]`, run:()=>{ TT.sub=o.sub; TT.picked=1; renderTeamTab(); }}); }
  if(o.vm && typeof VMODE!=='undefined' && VMODE!==o.vm) c.push({sel:`#v-steps [data-vm="${o.vm}"]`, run:()=>setVM(o.vm)});
  if(o.press) c.push({sel:o.press, run:()=>{}});
  return c; }
/* 복제본이 보여 주는 화면 상태의 요약 (같으면 다시 복제할 필요 없음) */
const tgSig = o => [TAB, (typeof VMODE!=='undefined'?VMODE:''), (typeof TT!=='undefined'?TT.sub:''), (typeof START!=='undefined'?START.sys:''), o.fx||'', document.querySelectorAll('details[open]').length, (typeof SEL!=='undefined'?SEL:'')].join('|');
/* 진행 중에 [다음]·[이전]을 또 누르면: 지금 동작을 바로 끝내고, 누른 횟수만큼 넘어감 */
function tgQueue(d){ TR.fast=true; TR.queue = TR.queue || {n:0}; TR.queue.n += d; }
async function tourGo(i, dir){ if(!TR) return; if(TR.busy){ tgQueue(dir||1); return; } dir=dir||1; const tk=TR; TR.busy=true; TR.el.classList.add('tg-busy');
  try{
    /* 1·2: 설명 카드 → 하이라이트를 지우고 화면 전체를 어둑하게 */
    if(TR.inited){ await tgSleep(200); if(TR!==tk) return; tgDim(true); tgHole(null); await tgSleep(220); if(TR!==tk) return; }
    while(i>=0 && i<TR.steps.length){ const st=TR.steps[i], o=st[3]||{}; TR.keepCrumb=!!o.sync;
      /* 4: 화면을 바꾸는 버튼(탭·하위 화면·보기 방식·항목)을 누르는 모습 → 바뀐 화면으로 서서히 */
      for(const c of tgClicks(o)){
        if(TR.inited && dir>0) await tgPress(c.sel); if(TR!==tk) return;
        try{ await c.run(); }catch(e){} await tgFrame(); await tgSleep(60); if(TR!==tk) return;
        if(c.reset) TR.off=scrollY;
        await tgRebuild(o.fx, c.reset ? 260 : 450); if(TR!==tk) return; }
      /* 펼치기 등 준비: 바뀌기 전 모습에서 대상까지 내려간 뒤 펼친 모습으로 */
      if(o.prep){ const before = o.reveal ? tourVis(o.reveal) : null;
        if(before && TR.inited && dir>0){ const gb=tgGeom(before,{}); await tgScrollTo(gb.off); if(TR!==tk) return; await tgPress(o.reveal); if(TR!==tk) return; }
        try{ await o.prep(); }catch(e){} await tgFrame(); if(TR!==tk) return; }
      const el=await tgFind(st[0]); if(TR!==tk) return;
      if(!el){ i+=dir; continue; }
      /* 화면이 바뀐 경우에만 다시 복제 (안 바뀌면 바로 스크롤) */
      const sig=tgSig(o); if(!TR.inited || sig!==TR.sig || o.prep || o.sync!==TR.lastSync) await tgRebuild(o.fx, 450); if(TR!==tk) return; TR.sig=sig; TR.lastSync=o.sync; TR.inited=true;
      TR.el.querySelector('.tg-ptr').classList.remove('on'); tgDim(true); tgHole(null);
      /* 3: 어둑한 채로 스르륵 */
      const g=tgGeom(el,o); await tgScrollTo(g.off); if(TR!==tk) return;
      /* 5·6: 도착한 자리에서 하이라이트가 밝아지고, 잠깐 뒤 설명 카드 */
      const gg=tgGeom(el,o); tgHole(gg); tgDim(false); TR.i=i; TR.cur=el; tgText(i); tgCard(gg);
      await tgSleep(300+150); if(TR!==tk) return;
      TR.el.classList.remove('tg-wait'); return; }
    if(dir>0) tourStop();
  } finally { if(TR===tk){ TR.busy=false; TR.el.classList.remove('tg-busy'); const q=TR.queue; TR.queue=null; TR.fast=false; if(q && q.n){ const n=TR.i+q.n; if(n<0) return tourGo(0,-1); if(n>=TR.steps.length) return tourStop(); tourGo(n, q.n>0?1:-1); } } } }
async function tgRefresh(){ if(!TR || TR.busy) return; const st=TR.steps[TR.i]; if(!st) return; const o=st[3]||{}; await tgRebuild(o.fx); const el=tourVis(st[0]); if(!el) return; const g=tgGeom(el,o); TR.off=g.off; tgApply(); const gg=tgGeom(el,o); tgHole(gg); tgCard(gg); }
function tourStop(){ if(!TR) return; const s=TR.snap; (TR.inert||[]).forEach(n=>n.inert=false); TR.el.remove(); TR=null; removeEventListener('resize', tgOnResize); tgRestore(s); }
let tgRT=0; function tgOnResize(){ clearTimeout(tgRT); tgRT=setTimeout(tgRefresh, 200); }
function tourStart(name){ tourStop(); const steps=courseOf(name); if(!steps.length) return;
  const el=document.createElement('div'); el.id='tour'; el.className='tg tg-wait'; el.setAttribute('role','dialog'); el.setAttribute('aria-modal','true'); el.setAttribute('aria-label','사용법 안내');
  el.innerHTML=`<div class="tg-stage" aria-hidden="true"><div class="tg-scale"><div class="tg-hole"></div><div class="tg-ptr"><svg viewBox="0 0 24 24" width="26" height="26"><path d="M5 3l14 8-6 1.6L10 19z" fill="#fff" stroke="#1d2128" stroke-width="1.6" stroke-linejoin="round"/></svg><i></i></div></div><span class="tg-badge">사용법 화면 · 끝나면 지금 화면 그대로 돌아갑니다</span></div>
    <div class="tour-card" aria-live="polite"><div class="tour-h"><b class="tour-t"></b><span class="tour-n muted"></span></div><div class="tour-pic" hidden></div><p class="tour-x"></p>
      <div class="tour-b"><button type="button" class="btn small" data-tour-skip>그만 보기</button><span></span><button type="button" class="btn small" data-tour-prev>이전</button><button type="button" class="btn small pri" data-tour-next>다음</button></div></div>`;
  const snap=tgSnap();
  /* 설계 탭 사용법은 접힌 상태 기준: [모두 접기]와 같게 닫고 맨 위에서 시작(끝나면 snap으로 원래대로) */
  if(name==='steps'){ const v=$('#v-steps'); if(v) v.querySelectorAll('details[open]').forEach(d=>d.open=false); if(TAB==='steps') window.scrollTo({top:0,behavior:'instant'}); }
  /* 문의 칸이 열려 있으면 안내 동안 닫았다가 끝나면 다시 엶 (쓰던 글은 fbOpen 이 유지) */
  { const f=$('#fbPanel'); if(f && !f.hidden){ const x=f.querySelector('.fbp-x'); if(x) x.click(); snap.undo.push(()=>{ const g=$('#fbPanel'); if(g && g.hidden){ const a=document.querySelector('.topask'); if(a) a.click(); } }); } }
  document.body.appendChild(el); TR={el, steps, i:0, cur:null, off:scrollY, snap, busy:false, hn:0};
  /* 안내 중에는 뒤 화면을 키보드·마우스로 조작할 수 없게 (Tab은 안내 카드 안에서만 돎) */
  TR.inert=[...document.body.children].filter(n=>n!==el && n.id!=='demoBar' && n.id!=='demoDiag' && !n.inert && n.tagName!=='SCRIPT'); TR.inert.forEach(n=>n.inert=true);
  try{ if(document.activeElement && document.activeElement!==document.body) document.activeElement.blur(); }catch(e){}
  addEventListener('resize', tgOnResize); tgRebuild().then(()=>{ tourGo(0,1); const nb=el.querySelector('[data-tour-next]'); if(nb) nb.focus({preventScroll:true}); }); SETP('tourdone','1'); }
document.addEventListener('click', e=>{
  const s=e.target.closest('[data-tour]'); if(s && !e.target.closest('#tour')){ e.preventDefault(); tourStart(s.dataset.tour); return; }
  if(e.target.closest('#tourBtn')){ e.preventDefault(); tourStart(TAB==='team' ? 'team' : (TAB==='start' ? 'start' : (TOUR[TAB] ? TAB : 'top'))); return; }
  if(!TR) return;
  if(e.target.closest('[data-tour-next]')){ e.preventDefault(); if(TR.busy){ tgQueue(1); return; } TR.i>=TR.steps.length-1 ? tourStop() : tourGo(TR.i+1, 1); return; }
  if(e.target.closest('[data-tour-prev]')){ e.preventDefault(); if(TR.busy){ tgQueue(-1); return; } if(TR.i>0) tourGo(TR.i-1, -1); return; }
  if(e.target.closest('[data-tour-skip]')){ e.preventDefault(); tourStop(); return; }
  if(TR.el.contains(e.target)) { e.preventDefault(); e.stopPropagation(); }
}, true);
document.addEventListener('keydown', e=>{ if(!TR) return; if(e.key==='Escape') tourStop(); else if(TR.busy) return; else if(e.key==='ArrowRight') TR.i<TR.steps.length-1 ? tourGo(TR.i+1,1) : tourStop(); else if(e.key==='ArrowLeft' && TR.i>0) tourGo(TR.i-1,-1); });

/* 사용법 중에는 뒤 페이지가 스크롤되지 않게: 잠그는 대신(스크롤바가 사라져 본문이 밀림) 사용법 화면 위의 휠·터치·키 스크롤만 막음 */
addEventListener('wheel', e=>{ if(TR) e.preventDefault(); }, {passive:false, capture:true});
addEventListener('touchmove', e=>{ if(TR) e.preventDefault(); }, {passive:false, capture:true});
addEventListener('keydown', e=>{ if(TR && [' ','PageDown','PageUp','Home','End','ArrowDown','ArrowUp'].includes(e.key) && !(e.target.closest && e.target.closest('.tour-card button'))) e.preventDefault(); }, true);
