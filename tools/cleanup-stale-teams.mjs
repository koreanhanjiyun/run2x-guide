// 2년(STALE_YEARS) 동안 팀원이 아무도 접속하지 않은 팀을 지웁니다. (깃허브 액션에서 실행)
// - 기준: teams/<id>.lastActive (없으면 createdAt). 날짜 기록이 전혀 없으면 건너뜀
// - 지우기 전 팀 전체를 Firestore trash/<id> 에 백업(개발자만 읽기 가능), 90일 지난 백업은 정리
// - DRY_RUN=true 이면 대상만 출력
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp({ credential: applicationDefault(), projectId: process.env.PROJECT_ID || 'run2x-guide' });
const db = getFirestore();
const YEARS = Number(process.env.STALE_YEARS || 2), KEEP_DAYS = 90, DRY = process.env.DRY_RUN === 'true';
const cutoff = new Date(); cutoff.setFullYear(cutoff.getFullYear() - YEARS);
const norm = n => String(n || '').trim().replace(/\s+/g, ' ').toLowerCase();

let removed = 0, kept = 0;
for (const t of (await db.collection('teams').get()).docs) {
  const d = t.data(), last = d.lastActive || d.createdAt || '';
  if (!last || new Date(last) >= cutoff) { kept++; continue; }
  console.log(`${DRY ? '[확인만] ' : ''}삭제 대상: ${d.name} (${t.id}) · 마지막 활동 ${last}`);
  if (DRY) continue;
  const backup = { format: 'run2x-team-backup', version: 1, team: d.name, exportedAt: new Date().toISOString(), teamDoc: d, data: {} };
  for (const col of ['status', 'val', 'qa', 'meta', 'members']) {
    backup.data[col] = {}; (await t.ref.collection(col).get()).docs.forEach(x => { backup.data[col][x.id] = x.data(); });
  }
  await db.doc('trash/' + t.id).set({ team: d.name || '', deletedAt: new Date().toISOString(), reason: `${YEARS}년 미접속`, backup: JSON.stringify(backup) });
  if (d.key) await db.doc('joinKeys/' + d.key).delete().catch(() => {});
  if (d.name) await db.doc('teamNames/' + norm(d.name)).delete().catch(() => {});
  await db.recursiveDelete(t.ref);
  removed++;
}
// 90일 지난 백업 정리
const old = new Date(Date.now() - KEEP_DAYS * 864e5).toISOString();
let purged = 0;
for (const x of (await db.collection('trash').where('deletedAt', '<', old).get()).docs) { if (!DRY) { await x.ref.delete(); purged++; } }
console.log(`완료 · 유지 ${kept} · ${DRY ? '삭제 안 함(확인만)' : `삭제 ${removed}`} · 오래된 백업 정리 ${purged}`);
