/* ============================================================
   사이트 정보 (하단 "사이트 정보" → 팝업): 소개·근거 원칙·면책·라이선스·개인정보 처리·다른 팀 안내·회장 안내·플랫폼 문의
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
    <ul><li>로그인한 구글 계정의 이메일·이름과 팀 데이터(진행 상태·우리 팀 값·논의), 차단 목록, 팀 비밀번호(입장 코드 수준으로 취급, 회장과 운영자가 볼 수 있음)는 사이트 운영자의 Firebase(서울 리전)에 저장됩니다.</li>
      <li>팀 데이터는 그 팀원만 볼 수 있습니다. 운영자는 장애 대응과 플랫폼 문의 처리 목적 외에는 열람하지 않습니다.</li>
      <li>팀을 삭제하면 그 팀의 데이터는 지워집니다. <b>2년 동안 팀원이 아무도 접속하지 않은 팀은 자동으로 삭제</b>됩니다(삭제 직전 백업을 90일 보관).</li>
      <li>로그인하지 않으면 아무것도 저장되지 않습니다. 화면 설정(보기 방식·창 너비 등)은 이 브라우저에만 저장됩니다.</li></ul></section>
  <section><h4>다른 팀이 쓰려면</h4>
    <p>오른쪽 위 <b>[로그인]</b> → 팀 탭 <b>팀원·계정</b> → <b>새 팀 만들기</b>(팀 이름 + 비밀번호). 팀원은 같은 팀 이름과 비밀번호로 가입합니다. 팀 데이터는 팀마다 따로 저장됩니다.</p>
    <p class="muted">코드를 가져가 자기 팀 버전으로 따로 운영하려면 <a href="${REPO}/blob/main/docs/OTHER-TEAMS.md" target="_blank" rel="noopener">운영 안내</a>를 보십시오(자기 Firebase를 만들어 연결).</p></section>
  <section><h4>사용법</h4>
    <p>버튼 위치와 기능은 오른쪽 위 <b>[이 탭 사용법]</b>(지금 탭 안내)과 시작 탭의 <b>[사이트 사용법]</b>(전체 안내)에서 차례로 보여 줍니다. 회장이 할 일(시즌 넘기기·팀원 역할과 담당 지정·백업·팀 삭제)은 팀 탭에서 [이 탭 사용법]을 누르면 나옵니다.</p></section>
  <section><h4>플랫폼 문의</h4>
    <p>설계 내용 오류·사이트 오류·기능 제안은 팀과 무관하게 사이트 개발자에게 전달됩니다(로그인 필요). 어느 탭·단계·항목인지 골라 보내면 개발자가 처리 상태(접수·검토 중·반영됨·반영 안 함)를 관리합니다. 반복해서 부적절한 문의를 보내는 계정은 문의가 차단될 수 있습니다.</p><button type="button" class="btn small tp-fbopen">플랫폼 문의 쓰기</button></section>`;
  /* G1: 기본 <dialog>로 열어 초점이 창 안에 머물고, 닫으면 연 버튼으로 돌아감 */
  let P = null, from = null;
  function open(){ from = document.activeElement;
    if(!P){ P=document.createElement('dialog'); P.id='infoPanel'; P.setAttribute('aria-labelledby','ipT'); P.innerHTML='<div class="ip-card">'+HTML.replace('<b>사이트 정보</b>','<b id="ipT">사이트 정보</b>')+'</div>'; document.body.appendChild(P);
      P.addEventListener('click', e=>{ if(e.target===P || e.target.closest('.ip-x')) close(); });
      P.addEventListener('close', ()=>{ try{ if(from && from.focus) from.focus(); }catch(_){} }); }
    if(!P.open){ try{ P.showModal(); }catch(_){ P.setAttribute('open',''); } const x=P.querySelector('.ip-x'); if(x) x.focus(); } }
  function close(){ if(P && P.open){ try{ P.close(); }catch(_){ P.removeAttribute('open'); } } }
  document.addEventListener('click', e=>{ if(e.target.closest('.info-open')){ e.preventDefault(); open(); } });
  addEventListener('click', e=>{ if(P && P.open && e.target.closest && e.target.closest('#infoPanel .tp-fbopen')) close(); }, true);
  window.openInfo = open;
})();
