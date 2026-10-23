/* ============================================================
   사이트 정보 (하단 "사이트 정보" → 팝업): 소개·근거 원칙·면책·라이선스·개인정보 처리·다른 팀 안내·관리자 안내·플랫폼 문의
   ============================================================ */
(function(){
  const REPO = 'https://github.com/koreanhanjiyun/run2x-guide';
  const HTML = `
  <div class="ip-h"><b>사이트 정보</b><button type="button" class="ip-x" aria-label="닫기">×</button></div>
  <section><h4>이 사이트</h4>
    <p>Formula Student(전기차) 팀을 위한 차량 설계 단계·항목 가이드입니다. 설계 단계마다 무엇을 정하고, 무엇을 받아 무엇을 넘기는지 근거 수식·그림·계산기와 함께 정리했습니다.</p>
    <p>원작: <b>Run2X 19 한지윤</b> · 원본 저장소: <a href="${REPO}" target="_blank" rel="noopener">${REPO.replace('https://','')}</a></p></section>
  <section><h4>근거 원칙</h4>
    <p>대회 규정, 문헌, 실측, 수식 유도로 확인한 내용만 단정합니다. 그 밖의 숫자는 <span class="badge b-assume">가정값</span>, 근거가 부족한 내용은 <span class="badge b-verify">확인 필요</span>로 표시합니다. 설계 내용의 변경·정정은 참고 탭 <b>변경 이력</b>에 남기고, 정정은 <b class="cl-fix">정정</b>으로 표시합니다.</p></section>
  <section><h4>면책</h4>
    <p>이 가이드는 대회 공식 규정의 해석이 아닙니다. 설계 전 반드시 최신 규정을 확인하십시오. 계산 예시에는 설명용 가정값이 포함되며, 설계 판단과 그 결과의 책임은 각 팀에 있습니다.</p></section>
  <section><h4>라이선스</h4>
    <p><a href="https://creativecommons.org/licenses/by-nc/4.0/deed.ko" target="_blank" rel="noopener">CC BY-NC 4.0</a>: 원작자 표시와 원본 링크를 남기고, 고쳤다면 고쳤다고 밝히면 비영리로 자유롭게 쓰고 고칠 수 있습니다. 영리 목적(유료 강의·판매 등)으로는 쓸 수 없습니다. 대회 규정·외부 문헌·물리 법칙은 각 원저작자의 것입니다.</p></section>
  <section><h4>개인정보 처리</h4>
    <ul><li>로그인한 구글 계정의 이메일·이름과 팀 데이터(진행 상태·우리 팀 값·논의)와 차단 목록은 사이트 운영자의 Firebase(서울 리전)에 저장됩니다.</li>
      <li>팀 데이터는 그 팀원만 볼 수 있습니다. 운영자는 장애 대응과 플랫폼 문의 처리 목적 외에는 열람하지 않습니다.</li>
      <li>팀을 삭제하면 그 팀의 데이터는 지워집니다. <b>2년 동안 팀원이 아무도 접속하지 않은 팀은 자동으로 삭제</b>됩니다(삭제 직전 백업을 90일 보관).</li>
      <li>로그인하지 않으면 아무것도 저장되지 않습니다. 화면 설정(보기 방식·창 너비 등)은 이 브라우저에만 저장됩니다.</li></ul></section>
  <section><h4>다른 팀이 쓰려면</h4>
    <p>오른쪽 위 상태 칩 → 구글 로그인 → <b>새 팀 만들기</b>(팀 이름 + 비밀번호). 팀원은 같은 팀 이름과 비밀번호로 가입합니다. 팀 데이터는 팀마다 따로 저장됩니다.</p>
    <p class="muted">코드를 가져가 자기 팀 버전으로 따로 운영하려면 <a href="${REPO}/blob/main/docs/OTHER-TEAMS.md" target="_blank" rel="noopener">운영 안내</a>를 보십시오(자기 Firebase를 만들어 연결).</p></section>
  <details class="ip-adm"><summary><h4>팀 관리자 안내</h4></summary>
    <ul><li><b>팀 관리 위치</b>: 관리자 모드를 켜면 오른쪽 관리 창 맨 위에 <b>팀 관리</b>(팀원 관리·차단·비밀번호·백업·팀 삭제)가 있습니다. 칩을 눌러 여는 팀 창에는 모두가 쓰는 기능(가입·초대·팀원 보기·나가기·문의)만 있습니다.</li>
      <li><b>인수인계</b>: 관리 창 <b>팀 관리</b>에서 새 회장을 <b>관리자로</b> 지정한 뒤 자기는 관리자 내려놓기 또는 팀 나가기. 마지막 관리자 1명은 내려오거나 나갈 수 없습니다.</li>
      <li><b>비밀번호</b>: 팀원을 내보낸 뒤에는 관리 창 <b>팀 관리</b>에서 비밀번호를 바꾸십시오. 기존 팀원은 그대로입니다.</li>
      <li><b>백업</b>: 관리 창 <b>팀 관리</b> <b>[내보내기]</b>로 진행 상태·우리 팀 값·논의·이번 시즌을 파일로 저장합니다. 무료 요금제에는 자동 백업이 없으니 시즌이 끝날 때마다 내보내 두십시오.</li>
      <li><b>복구</b>: 관리 창 <b>팀 관리</b> <b>[불러오기]</b> → 백업 파일 선택 → 내용 확인 → 덮어쓰기. 팀이 삭제됐다면 같은 이름으로 팀을 새로 만든 뒤 불러옵니다(팀원은 새 비밀번호로 다시 가입).</li>
      <li><b>초대</b>: 팀 창 <b>[초대 문구 복사]</b>(팀원 누구나)로 사이트 주소·팀 이름·가입 방법을 복사해 공지방에 붙여 넣습니다. 비밀번호는 따로 알려 주십시오.</li>
      <li><b>논의 관리</b>: 각 항목 아래 논의는 팀원이 자유롭게 씁니다. 부적절한 글은 관리자 모드에서 <b>[삭제 (관리)]</b>로 지웁니다(답글이 달린 글은 "관리자가 삭제한 댓글입니다"로 남음).</li>
      <li><b>차단</b>: 관리 창 <b>팀 관리</b> 팀원 목록의 <b>[차단]</b>은 내보내면서 같은 비밀번호로도 다시 가입하지 못하게 합니다. 차단 해제도 같은 곳에서 합니다.</li>
      <li><b>관리자 모드 편집</b>은 아래 막대의 [모두 저장]을 눌러야 팀원에게 보입니다.</li>
      <li><b>자동 삭제</b>: 2년 동안 팀원이 아무도 접속하지 않으면 팀이 삭제됩니다. 접속(읽기)만 해도 활동으로 기록됩니다.</li></ul></details>
  <section><h4>플랫폼 문의</h4>
    <p>설계 내용 오류·사이트 오류·기능 제안은 팀과 무관하게 사이트 개발자에게 전달됩니다(로그인 필요). 어느 탭·단계·항목인지 골라 보내면 개발자가 처리 상태(접수·검토 중·반영됨·반영 안 함)를 관리합니다. 반복해서 부적절한 문의를 보내는 계정은 문의가 차단될 수 있습니다.</p><button type="button" class="btn small tp-fbopen">플랫폼 문의 쓰기</button></section>`;
  let P = null;
  function open(){ if(!P){ P=document.createElement('div'); P.id='infoPanel'; P.setAttribute('role','dialog'); P.setAttribute('aria-label','사이트 정보'); P.innerHTML='<div class="ip-card">'+HTML+'</div>'; document.body.appendChild(P);
      P.addEventListener('click', e=>{ if(e.target===P || e.target.closest('.ip-x')) close(); if(e.target.closest('.tp-fbopen')) close(); }); }
    P.hidden=false; }
  function close(){ if(P) P.hidden=true; }
  document.addEventListener('click', e=>{ if(e.target.closest('.info-open')){ e.preventDefault(); open(); } });
  document.addEventListener('keydown', e=>{ if(e.key==='Escape') close(); });
  /* 팀 창의 문의 버튼 처리가 클릭을 먼저 가로채므로, 그보다 앞(window 캡처)에서 팝업을 닫음 */
  addEventListener('click', e=>{ if(P && !P.hidden && e.target.closest && e.target.closest('#infoPanel .tp-fbopen')) close(); }, true);
  window.openInfo = open;
})();
