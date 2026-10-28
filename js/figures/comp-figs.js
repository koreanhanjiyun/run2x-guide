/* 부품 소개 그림 (시작 탭 시스템 화면). 라벨 파일(comp-figs-3d.js)은 시스템 화면을 처음 열 때 불러오고, 그림(img/comp/*.webp)은 화면에 보일 때 브라우저가 불러옴 */
const COMP_FIG = {};
const COMP_FIG_FILES = ['js/figures/comp-figs-3d.js'];
let COMP_FIG_STATE = 0;   // 0 안 불러옴, 1 불러오는 중, 2 다 불러옴
function loadCompFigs(cb){ if(COMP_FIG_STATE===2 || Object.keys(COMP_FIG).length>=60){ COMP_FIG_STATE=2; return cb && cb(); } if(COMP_FIG_STATE===1){ (loadCompFigs.q=loadCompFigs.q||[]).push(cb); return; }
  COMP_FIG_STATE=1; (loadCompFigs.q=loadCompFigs.q||[]).push(cb); const me=[...document.scripts].find(x=>/comp-figs\.js/.test(x.src)); const v=me&&me.src.match(/\?v=[^&]+/);
  let left=COMP_FIG_FILES.length; const fin=()=>{ if(--left>0) return; COMP_FIG_STATE=2; (loadCompFigs.q||[]).splice(0).forEach(f=>{ try{ f&&f(); }catch(e){} }); };
  COMP_FIG_FILES.forEach(f=>{ const s=document.createElement('script'); s.src=f+(v?v[0]:''); s.onload=fin; s.onerror=fin; document.head.appendChild(s); }); }
