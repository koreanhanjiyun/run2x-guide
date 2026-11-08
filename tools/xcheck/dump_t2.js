// 도구 2P (사이트 계산 코드) 로 교차 비교 경우를 계산해 cases.json 으로 저장.
//   먼저 python3 tools/draft/build.py (시안 빌드) → node tools/xcheck/dump_t2.js → python3 tools/xcheck/t2x.py
//   경우 = 도구 2P 기본 입력 + 아래 덮어쓰기. 코스는 아래 시험 코스 (주행선 끔 = 구간 곡률 그대로), 차량 모델 0, 회생 · 타력 끔
const path = require('path'), fs = require('fs');
const H = require(path.resolve(__dirname, '..', 'draft', 'qa', 'h.js')), { fpage } = require(path.resolve(__dirname, '..', 'draft', 'qa', 'h2.js'));
// 시험 코스 [길이 m, 반경 m (왼쪽 +, 0 = 직선)]: 약 620 m, 반경 8 ~ 40 m 좌우
const SEG = [[60, 0], [15.708, 10], [40, 0], [23.562, -15], [30, 0], [47.124, 30], [80, 0], [12.566, -8], [25, 0], [31.416, 20], [50, 0],
             [18.85, -12], [35, 0], [62.832, 40], [45, 0], [25.133, -16], [20, 0]];
const COMMON = { md: 0, rl_on: 0, wc_on: 0, rg_on: 0, drv: 0, course: 'end', lap: 'all', grMode: 'my', end: { seg: SEG, laps: 10, stint: 5 } };
const CASES = [
  { id: 'base', n: '기본 차 (열 끔, 에너지 상한 없음, 효율 맵)', o: { th_on: 0, in_on: 0, bt_on: 0, cw_on: 0, e_lim: 0 } },
  { id: 'const_eff', n: '효율 상수 (모터 95 % · 인버터 97 %)', o: { th_on: 0, in_on: 0, bt_on: 0, cw_on: 0, e_lim: 0, effM: null, effI: null, eta_mot: 95, eta_inv: 97 } },
  { id: 'thermal', n: '모터 · 인버터 · 냉각수 (한 덩어리) · 축전지 열 + 디레이팅 (낮은 디레이팅 온도로 일부러 걸리게)',
    o: { th_on: 1, in_on: 1, bt_on: 1, cw_on: 1, m_cool: 1, i_cool: 1, b_cool: 0, e_lim: 0, dr_t0: 45, dr_t1: 70, di_t0: 42, di_t1: 60, th_c: 3000, i_c: 800, cw_c: 3000, b_alpha: 0.01 } },
  { id: 'serial', n: '위 + 직렬 냉각 회로 (라디 → 인버터 → 모터)',
    o: { th_on: 1, in_on: 1, bt_on: 1, cw_on: 1, m_cool: 1, i_cool: 1, b_cool: 0, e_lim: 0, dr_t0: 45, dr_t1: 70, di_t0: 42, di_t1: 60, th_c: 3000, i_c: 800, cw_c: 3000, b_alpha: 0.01,
         cw_ser: 1, cw_cc: 557.3, cw_g0: 63.2, cw_g60: 174.3, cw_oi: 1, cw_om: 2, cw_ob: 0 } },
  { id: 'elim', n: '에너지 상한 (내구 1.6 kWh, 최대 운전자 = 출력 상한 배율)', o: { th_on: 0, in_on: 0, bt_on: 0, cw_on: 0, e_lim: 2, e_target: 1.6 } },
  { id: 'real', n: '현실 운전자 (k_s 0.9 · k_e 0.7)', o: { th_on: 0, in_on: 0, bt_on: 0, cw_on: 0, e_lim: 0, dr_real: 1, dr_ks: 0.9, dr_ke: 0.7 } },
];
const KEYS = ['t_acc_s', 't_skid_s', 't_ax_s', 't_end_s', 'e_use', 'p_lim', 'c_tm', 'c_ti', 'c_tw', 'c_tb', 'ax_0'];
(async () => {
  await H.start(); const b = await H.chromium.launch(); const p = await fpage(b, `http://127.0.0.1:${H.PORT}/_t.html`, 'admin', { W: 1400, H: 900 });
  await p.evaluate(() => { showTab('tools'); localStorage.removeItem(wbStoreKey('2')); wbOpen('2'); }); await H.sleep(9000);
  const out = [];
  for (const c of CASES) {
    const r = await p.evaluate(async ([c, COMMON, KEYS]) => { const I = { ...wbInputs(), ...COMMON, ...c.o };
      const R = await wbRun(I, wbCode()); if (!R.ok) return { err: R.err };
      const mo = R.r.modes.my.out, o = {}; KEYS.forEach(k => { o[k] = Number.isFinite(mo[k]) ? mo[k] : null; }); return { I, out: o, ms: R.ms }; }, [c, COMMON, KEYS]);
    if (r.err) { console.log(c.id, 'ERR', r.err); continue; }
    console.log(c.id, JSON.stringify(r.out), Math.round(r.ms) + ' ms');
    out.push({ id: c.id, n: c.n, I: r.I, out: r.out });
  }
  fs.writeFileSync(path.resolve(__dirname, 'cases.json'), JSON.stringify({ made: new Date().toISOString(), cases: out }, null, 1));
  console.log('errs', p.errs, p.cons); await b.close(); await H.end();
})();
