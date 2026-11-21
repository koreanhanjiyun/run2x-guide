/* 안전장치: 어떤 이유로 nav2.js 가 첫 탭을 못 정해도 페이지가 다 불러와지면 본문을 보임 (style.css html:not(.booted)) */
addEventListener('load', ()=>setTimeout(()=>document.documentElement.classList.add('booted'), 300));
