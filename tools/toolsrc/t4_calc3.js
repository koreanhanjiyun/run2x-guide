// ================================================================
// 도구 4 축전지 팩 계산기 — 계산 코드
//   팀원 Yechan Hyun 의 FSK Battery Calculator 1.0.1 (calculator.js) 계산을 그대로 옮김 (허락 받음)
// ================================================================
// 입력 I : 셀 c_vmax · c_vnom · c_vmin [V], c_ah [Ah], c_imax [A], c_r [mΩ], c_g [g]
//          셀 최대 충전 전류 c_ich [A] (회생용, 없으면 충전 전류 한계 —)
//          인버터 최대 직류 전압 v_inv [V] (vi_on 1 = 확인 · 직렬 자동이면 팩 최대 전압이 이 값을 넘지 않게, 0 = 확인 안 함)
//          구성 n_seg 세그먼트 수, s_seg 세그먼트 직렬 수, n_p 병렬 수, auto = 0 수동 · 1 병렬 자동 (직렬 입력) · 2 직렬 자동 (병렬 입력)
//          추가 x_mseg 세그먼트당 무게 [kg], x_mpack 팩 전체 무게 [kg], x_r 팩 전체 저항 [mΩ], i_lim 팩 사용 전류 제한 [A] (il_on 1 = 제한 적용, 0 = 셀 사양 최대)
//          출력 표 전류 o_mode = 0 제한 적용 · 1 셀 사양 최대 · 2 직접 (o_i [A])
// 규정 (FSAE / FSK EV): 세그먼트 최대 전압 ≤ 120 V, 세그먼트 에너지 ≤ 6 MJ (셀 최대 전압 × 정격 용량으로 셈), 세그먼트 질량 ≤ 12 kg
// 식:
//   전체 직렬 S = n_seg × s_seg,  세그먼트 셀 수 = s_seg × n_p
//   셀로 본 팩 저항 R_cell = (S ÷ n_p) × r_셀,  팩 저항 R = R_cell + 추가 저항
//   셀 사양 최대 전류 = 셀 최대 전류 × n_p,  적용 전류 I = min(최대, 제한),  충전 전류 한계 = 셀 최대 충전 전류 × n_p
//   세그먼트 에너지 [MJ] = 셀 수 × V_max × Ah × 0.0036,  공칭 에너지 [kWh] = S × V_nom × Ah × n_p ÷ 1000
//   출력 표 (셀 무부하 전압 v = V_max, V_nom, V_min + (V_max − V_min) × 0.9 · 0.7 · 0.5 · 0.3 · 0.1 — 충전율(SOC)이 아니라 전압 범위 비율):
//     팩 무부하 전압 = v × S,  부하 전압 = v × S − I R,  부하 시 셀 전압 = v − (I ÷ n_p) r_셀,  단자 출력 = I × 부하 전압,  저항 손실 = I² R
//     최소 셀 전압 판정: 부하 시 셀 전압 ≥ V_min 이고 부하 전압 > 0
//   이론 단락 전류 = S × V_max ÷ R
// 셀 표 (넣었을 때만, 도구 2P 와 같은 형식): OCV [V] · 내부저항 [mΩ] = SOC × 셀 온도 2차원 표 (사이는 이중선형 · 밖은 끝값), 용량 [Ah] = [[온도, Ah]] (사이는 직선)
//   온도 o_T 에서 SOC 100 · 90 · … · 0 % 마다: 셀 OCV = 표 (없으면 V_min + (V_max − V_min) × SOC), 셀 저항 r = 표 (없으면 r_셀),
//     팩 저항 = (S ÷ n_p) × r + 추가 저항, 부하 전압 = OCV × S − I × 팩 저항, 부하 시 셀 전압 = OCV − (I ÷ n_p) r, 단자 출력 = I × 부하 전압
//   온도 o_T 의 셀 용량 = 표 (없으면 셀 용량), 팩 에너지 = S × n_p × 용량 × (SOC 0 ~ 100 % OCV 평균, 사다리꼴 21 점)

const t4Tab1 = (t, x) => { if (x <= t[0][0]) return t[0][1]; for (let i = 1; i < t.length; i++) if (x <= t[i][0]) { const a = t[i - 1], b = t[i]; return a[1] + (b[1] - a[1]) * (x - a[0]) / ((b[0] - a[0]) || 1); } return t[t.length - 1][1]; };
function t4Bil(M, n, T) { const f = (a, x) => { if (x <= a[0]) return [0, 0, 0]; const k = a.length - 1; if (x >= a[k]) return [k, k, 0]; let i = 0; while (a[i + 1] < x) i++; return [i, i + 1, (x - a[i]) / (a[i + 1] - a[i])]; };
  const [j0, j1, u] = f(M.n, n), [i0, i1, w] = f(M.t, T), e = M.e; return (e[i0][j0] * (1 - u) + e[i0][j1] * u) * (1 - w) + (e[i1][j0] * (1 - u) + e[i1][j1] * u) * w; }
function calc(I) {
  const fl = v => Math.floor(v + 1e-10);
  const c = { vmax: I.c_vmax, vmin: I.c_vmin, vnom: I.c_vnom, ah: I.c_ah, amps: I.c_imax, r: I.c_r, g: I.c_g };
  for (const k of ['vmax', 'vmin', 'vnom', 'ah', 'amps', 'r', 'g']) if (!Number.isFinite(c[k]) || c[k] <= 0) throw new Error('셀 정보는 모두 0보다 큰 숫자로 입력하세요.');
  if (!(c.vmin < c.vnom && c.vnom <= c.vmax)) throw new Error('셀 전압은 최소 < 공칭 ≤ 최대 순서로 입력하세요.');
  const xm = Math.max(0, I.x_mseg || 0), xmp = Math.max(0, I.x_mpack || 0), xr = Math.max(0, I.x_r || 0), lim = I.il_on === 1 ? I.i_lim : null;
  if (lim !== null && !(lim > 0)) throw new Error('팩 사용 전류 제한은 0 보다 커야 합니다 (제한을 쓰지 않으려면 [셀 사양 최대]).');
  let n = Math.round(I.n_seg), s = Math.round(I.s_seg), p = Math.round(I.n_p), why = '';
  if (!(n >= 1)) throw new Error('세그먼트 개수는 1 이상의 정수로 입력하세요.');
  const vinv = I.vi_on !== 0 ? I.v_inv : 0;   // 인버터 최대 직류 전압 [V] (부품 한계, 규정 아님)
  if (I.vi_on !== 0 && !(vinv > 0)) throw new Error('인버터 최대 직류 전압은 0 보다 커야 합니다 (확인하지 않으려면 [확인 안 함]).');
  // 자동 구성: 한쪽(직렬 또는 병렬)을 넣으면 규정 안에서 다른 쪽 최대
  if (I.auto === 1) {
    if (!(s >= 1)) throw new Error('세그먼트 직렬 수는 1 이상의 정수로 입력하세요.');
    if (s * c.vmax > 120 + 1e-9) throw new Error('입력 직렬 수만으로 세그먼트 120 V를 초과합니다. 직렬 수를 줄이세요.');
    const b = [['6 MJ 에너지', fl(6 / (s * c.vmax * c.ah * 0.0036))], ['12 kg 질량', fl((12 - xm) / (s * c.g / 1000))]];
    p = Math.min(...b.map(z => z[1])); why = b.filter(z => z[1] === p).map(z => z[0]).join(' · ');
    if (p < 1) throw new Error('이 조건에서는 1개 이상의 셀 구성이 불가능합니다. 구성 또는 추가 무게를 줄이세요.');
  } else if (I.auto === 2) {
    if (!(p >= 1)) throw new Error('병렬 수는 1 이상의 정수로 입력하세요.');
    const b = [['120 V 전압', fl(120 / c.vmax)], ['6 MJ 에너지', fl(6 / (p * c.vmax * c.ah * 0.0036))], ['12 kg 질량', fl((12 - xm) / (p * c.g / 1000))], ['팩 600 V 전압', fl(600 / (n * c.vmax))], ...(vinv ? [[`인버터 ${vinv} V`, fl(vinv / (n * c.vmax))]] : [])];
    s = Math.min(...b.map(z => z[1])); why = b.filter(z => z[1] === s).map(z => z[0]).join(' · ');
    if (s < 1) throw new Error('이 조건에서는 1개 이상의 셀 구성이 불가능합니다. 구성 또는 추가 무게를 줄이세요.');
  } else if (!(s >= 1) || !(p >= 1)) throw new Error('세그먼트 직렬, 병렬은 1 이상의 정수로 입력하세요.');

  const S = n * s, cells = s * p, Rcell = S / p * c.r / 1000, R = Rcell + xr / 1000, maxI = c.amps * p, Iap = lim === null ? maxI : Math.min(maxI, lim);
  const mseg = cells * c.g / 1000 + xm, ej = cells * c.vmax * c.ah * 0.0036;
  // 출력 표 전류: 제한 적용 (기본) · 셀 사양 최대 · 직접 (0 ~ 적용 상한)
  const Io = I.o_mode === 1 ? maxI : I.o_mode === 2 ? Math.max(0, Math.min(Iap, I.o_i || 0)) : Iap;
  const lv = [['최대', c.vmax], ['공칭', c.vnom], ...[0.9, 0.7, 0.5, 0.3, 0.1].map(t => [`${Math.round(t * 100)} %`, c.vmin + (c.vmax - c.vmin) * t])];
  const tab = lv.map(([nm, v]) => { const loadCell = v - Io / p * c.r / 1000, load = v * S - Io * R;
    return { nm, v, oc: v * S, drop: Io * R, load, loadCell, power: load > 0 ? Io * load / 1000 : NaN, loss: Io * Io * R / 1000, lossCell: Io * Io * Rcell / 1000, lossX: Io * Io * xr / 1e6,
             ok: loadCell >= c.vmin - 1e-10 && load > 0 }; });
  // 셀 표: 온도 o_T 에서 SOC 별
  const cO = I.cellO && Array.isArray(I.cellO.n) ? I.cellO : null, cR = I.cellR && Array.isArray(I.cellR.n) ? I.cellR : null, cC = Array.isArray(I.cellC) && I.cellC.length ? I.cellC : null;
  const TT = Number.isFinite(I.o_T) ? I.o_T : 25, ocvAt = sc => cO ? t4Bil(cO, TT, sc) : c.vmin + (c.vmax - c.vmin) * sc / 100, rAt = sc => cR ? t4Bil(cR, TT, sc) : c.r;
  const soc = [100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 0].map(sc => { const v = ocvAt(sc), r = rAt(sc), Rp = S / p * r / 1000 + xr / 1000, load = v * S - Io * Rp, loadCell = v - Io / p * r / 1000;
    return { sc, v, r, oc: v * S, rp: Rp * 1000, load, loadCell, power: load > 0 ? Io * load / 1000 : NaN, ok: loadCell >= c.vmin - 1e-10 && load > 0 }; });
  // 최소 셀 전압 충족 경계 SOC: 이 SOC 이상에서 늘 충족 (100 % 미달이면 NaN, 0 % 까지 충족이면 0). 0.5 % 간격으로 내려가며 첫 미달을 찾고 이분법
  const okAt = sc => { const v = ocvAt(sc), r = rAt(sc), Rp = S / p * r / 1000 + xr / 1000; return v - Io / p * r / 1000 >= c.vmin - 1e-10 && v * S - Io * Rp > 0; };
  let s_bd = NaN;
  if (okAt(100)) { let hi = 100, lo = null; for (let k = 199; k >= 0; k--) { const sc = k * 0.5; if (!okAt(sc)) { lo = sc; break; } hi = sc; }
    if (lo === null) s_bd = 0; else { for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (okAt(m)) hi = m; else lo = m; } s_bd = hi; } }
  const capT = cC ? t4Tab1(cC, TT) : c.ah, ocvMean = (() => { let s2 = 0; for (let k = 0; k <= 20; k++) s2 += ocvAt(k * 5) * (k === 0 || k === 20 ? 0.5 : 1); return s2 / 20; })();
  const out = {
    n_s: S, n_p_o: p, s_seg_o: s, n_seg_o: n, cells: cells * n, cells_seg: cells,
    v_seg_max: s * c.vmax, v_pack_max: S * c.vmax, v_pack: S * c.vnom, v_pack_min: S * c.vmin,                 // [V]
    cap_ah: c.ah * p, e_pack: S * c.vnom * c.ah * p / 1000, ej_seg: ej, ej_pack: ej * n,                     // [Ah] · [kWh] · [MJ]
    m_cells_seg: cells * c.g / 1000, m_seg: mseg, m_pack: mseg * n + xmp,                                     // [kg]
    r_cell: Rcell * 1000, r_pack: R * 1000, i_cellmax: maxI, i_bms_max: Iap, i_chg: I.c_ich > 0 ? I.c_ich * p : NaN, i_cell: Iap / p, i_short: S * c.vmax / R,   // [mΩ] · [A]
    rule_inv: vinv ? (S * c.vmax <= vinv + 1e-9 ? 1 : 0) : NaN, v_inv_o: vinv || NaN,   // 팩 최대 전압 ≤ 인버터 최대 직류 전압 (1 = 충족, 0 = 확인 안 함이면 —)
    rule_vp: S * c.vmax <= 600 + 1e-9 ? 1 : 0,   // 규정 팩 최대 전압 600 V (1 = 충족)
    rule_v: s * c.vmax <= 120 + 1e-9 ? 1 : 0, rule_e: ej <= 6 + 1e-9 ? 1 : 0, rule_m: mseg <= 12 + 1e-9 ? 1 : 0,   // 규정 충족 (1 = 충족)
    o_i: Io, t_load_max: tab[0].load, t_p_max: tab[0].power, t_loss: tab[0].loss, t_p_nom: tab[1].power, t_ok10: tab[6].ok ? 1 : 0, t_cell10: tab[6].loadCell,
    o_T: TT, s_bd, cap_T: capT, e_T: S * p * capT * ocvMean / 1000, ocv_mean: ocvMean, s_ocv100: soc[0].v, s_r50: soc[5].r, s_rp50: soc[5].rp, s_p50: soc[5].power, s_load0: soc[10].load, cell_tab: (cO ? 1 : 0) + (cR ? 2 : 0) + (cC ? 4 : 0),
    c_vmax_o: c.vmax, c_vnom_o: c.vnom, c_vmin_o: c.vmin, c_ah_o: c.ah, c_imax_o: c.amps, c_ich_o: I.c_ich > 0 ? I.c_ich : NaN, c_r_o: c.r, c_g_o: c.g, n_seg_d: n,   // 셀 값 · 세그먼트 수 (대시보드 반영 확인용, 입력 그대로)
  };
  return { out, tab, why, soc };
}
