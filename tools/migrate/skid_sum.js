// 한 번만 쓰는 정리: 대시보드 '목표 기록 (스키드패드)' t_skid 를 한 바퀴 기준 → 좌우 한 바퀴 합으로 (2026-11-05, 도구 2 정의 변경)
//   대상: teams/<팀>/dv/all__t_skid 의 시즌별 값 중 7 s 미만 (한 바퀴 기록은 보통 4.5 ~ 6.5 s, 좌우 합은 9 s 이상)
//   node skid_sum.js dry   → 바꿀 대상만 출력 /  node skid_sum.js apply → ×2 로 바꾸고 바꾼 내용 출력
//   필요: GOOGLE_APPLICATION_CREDENTIALS = 서비스 계정 키 파일
const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'run2x-guide' });
const db = admin.firestore(), apply = process.argv[2] === 'apply';
(async () => {
  const teams = await db.collection('teams').get(); let n = 0;
  for (const t of teams.docs) {
    const ref = db.doc(`teams/${t.id}/dv/all__t_skid`), d = await ref.get();
    if (!d.exists) { console.log(`${t.id}: 값 없음`); continue; }
    const s = { ...(d.data().s || {}) }; let ch = false;
    for (const [se, e] of Object.entries(s)) {
      if (e && typeof e.v === 'number' && e.v > 0 && e.v < 7) {
        console.log(`${t.id} · ${se} 시즌: ${e.v} s → ${+(e.v * 2).toFixed(3)} s (원래 값 기록)`);
        s[se] = { ...e, v: +(e.v * 2).toFixed(3), src: `${e.src ? e.src + ' · ' : ''}좌우 합으로 바꿈 (원래 한 바퀴 ${e.v} s)`, at: new Date().toISOString() };
        ch = true; n++;
      } else console.log(`${t.id} · ${se} 시즌: ${e && e.v} s (그대로)`);
    }
    if (ch && apply) await ref.set({ ...d.data(), s });
  }
  console.log(`${apply ? '바꿈' : '대상'} ${n}개 (팀 ${teams.size}개 확인)`);
})().catch(e => { console.error(e); process.exit(1); });
