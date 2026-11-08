# 도구 2P 교차 비교 — 사이트 계산 코드(JavaScript)를 쓰지 않고, 도구 2P 머리말 · HANDOFF 에 적힌 모델 식만으로 Python 으로 다시 짠 계산.
#   범위 (관리자 결정 2026-11-08, 안 (나)): 차량 모델 0 · 축전지 (개방 전압 SOC 직선 · 내부저항 · 전류 · 출력 한계) · 모터 토크 표 (전압 환산) ·
#   효율 (상수 또는 맵) · 모터 · 인버터 · 축전지 · 냉각수 열 (한 덩어리 / 직렬 회로) · 디레이팅 · 내구 에너지 상한 (출력 상한 배율) · 현실 운전자 배율
#   주행선은 넣은 구간 곡률 그대로 (dump_t2.js 에서 주행선 끔), 회생 · 타력 운전자 · 모델 1 ~ 3 은 범위 밖.
#   같은 것: 준정적(QSS) 앞 → 뒤 두 번 훑기 · 칸 크기 (가속 0.5 m, 오토크로스 · 내구 1 m) · 칸 안 차속 평균으로 시간 적분 (문서에 적힌 수치 방법)
#   다른 것: 고정점 되풀이는 수렴할 때까지 (사이트는 3 ~ 4 번), 구동력 · 코너 속도를 기억표 없이 매번, 에너지 상한 배율은 다 셈 이분법 (사이트는 줄여 셈 할선 + 보정 1 번)
# 쓰는 법: python3 tools/xcheck/t2x.py [cases.json]  → 경우마다 사이트 값 · Python 값 · 차이 (허용: 시간 0.5 %, 에너지 1 %, 온도 0.5 K)
import json, math, sys, os

G = 9.81; RHO = 1.225; ACC_L = 75.0; SK_R = 9.125; SK_C = 2 * math.pi * SK_R


def tab1(t, x):
    if x <= t[0][0]: return t[0][1]
    for i in range(1, len(t)):
        if x <= t[i][0]:
            a, b = t[i - 1], t[i]; d = (b[0] - a[0]) or 1
            return a[1] + (b[1] - a[1]) * (x - a[0]) / d
    return t[-1][1]


def bilin(M, n, T):
    def f(a, x):
        if x <= a[0]: return 0, 0, 0.0
        k = len(a) - 1
        if x >= a[k]: return k, k, 0.0
        i = 0
        while a[i + 1] < x: i += 1
        return i, i + 1, (x - a[i]) / (a[i + 1] - a[i])
    j0, j1, u = f(M['n'], n); i0, i1, w = f(M['t'], T); e = M['e']
    return (e[i0][j0] * (1 - u) + e[i0][j1] * u) * (1 - w) + (e[i1][j0] * (1 - u) + e[i1][j1] * u) * w


def clamp01(x): return max(0.0, min(1.0, x))


class Car:
    def __init__(s, I, gr, kP=1.0, kG=1.0):
        s.I = I; s.gr = gr; s.kP = kP; s.kG = kG
        s.m = I['m']; s.L = I['L'] / 1000; s.h = I['h'] / 1000; s.fs = I['fr'] / 100; s.fa = I['xcop'] / I['L']; s.hc = I['hcop'] / 1000
        s.r = I['r_eff'] / 1000; s.tf = I['tf'] / 1000; s.tr = I['tr'] / 1000; s.mu = I['mu']; s.mus = I.get('mu_s') or 0
        s.fz0 = I['tire_fz0'] if I.get('fz0_m', 1) != 0 else 0
        s.crr = I['crr']; s.cl = 0.5 * RHO * I['cla']; s.cd = 0.5 * RHO * I['cda']; s.eta = I['eta_dt'] / 100
        s.meff = s.m + I['j_eq'] / (s.r * s.r)
        # 축전지
        s.Ns = I['n_s']; s.Rb = max(0, I['r_pack']) / 1000; s.Imax = I['i_bms_max']; s.Pmax = I['pmax'] * 1000
        s.Epack = s.Ns * I['n_p'] * I['c_ah'] * I['c_vnom'] * 3600
        el = I.get('e_lim', 0)
        s.Ecap = math.inf if el == 0 else (I['e_target'] * 3.6e6 if el == 2 and I.get('e_target', 0) > 0 else s.Epack)
        # 모터 · 인버터
        s.tq = sorted(I.get('motor') or []); s.tqC = sorted(I.get('motorC') or [])
        s.ke = I['ke_ratio'] if I.get('ke_ratio', 0) > 0 else 1; s.nmax = I['nmax']
        s.cpct = max(1e-3, min(1, (I.get('c_pct', 100)) / 100))
        s.kt = I['kt']; s.ipk = I['i_pk']
        s.ict = max(0, min(I['i_ct'], s.ipk)) if I.get('ict_m', 1) != 0 else s.ipk * clamp01(I.get('i_cpct', 100) / 100)
        # 열
        s.mW = I.get('m_cool', 1) != 0; s.iW = I.get('i_cool', 1) != 0; s.bW = I.get('b_cool', 0) == 1
        s.thOn = I.get('th_on', 1) != 0; s.inOn = I.get('in_on', 0) == 1; s.btOn = I.get('bt_on', 0) == 1
        s.cwOn = I.get('cw_on', 0) == 1 and ((s.thOn and s.mW) or s.iW or (s.btOn and s.bW))
        s.dr0, s.dr1 = I['dr_t0'], I['dr_t1']; s.drM = s.thOn and s.dr1 > s.dr0
        s.di0, s.di1 = I['di_t0'], I['di_t1']
        s.drOn = s.drM or (s.inOn and s.di1 > s.di0 and s.ict < s.ipk)
        s.thC = max(1, I['th_c']); s.thR = max(1e-9, I['th_r']); s.thCo = I['th_cool']
        s.Tamb = I.get('t_amb', 25); s.Cw = max(1, I.get('cw_c') or 1); s.ua0 = max(0, I.get('ua0') or 0); s.ua60 = max(0, I.get('ua60') or 0)
        s.Cb = max(1, I.get('b_c') or 1); s.alp = I.get('b_alpha') or 0; s.Rbt = max(1e-9, I.get('b_r') or 0.05)
        s.Ci = max(1, I.get('i_c') or 1); s.Ri = max(1e-9, I.get('i_r') or 0.05)
        s.ser = s.cwOn and I.get('cw_ser', 0) == 1 and I.get('cw_cc', 0) > 0; s.Cc = I.get('cw_cc', 0)
        order = sorted([(p, (o if o > 0 else 99 + j)) for j, (p, o) in enumerate([('m', I.get('cw_om', 0)), ('i', I.get('cw_oi', 0)), ('b', I.get('cw_ob', 0))])], key=lambda x: x[1])
        s.order = [p for p, _ in order]
        s.TH0 = {'m': I['th_init'], 'i': I.get('i_init', I['th_init']), 'w': I['th_cool'], 'b': I.get('b_t0', 25)}
        s.vtop = s.nmax / gr * 2 * math.pi / 60 * s.r * (1 - 1e-9)
        s.vc = {}

    # ---- 하중 · 타이어
    def Fres(s, v): return s.cd * v * v + s.crr * (s.m * G + s.cl * v * v)
    def Fzf(s, v, ax): return s.m * G * s.fs + s.cl * v * v * s.fa - s.m * ax * s.h / s.L - s.cd * v * v * s.hc / s.L
    def Fzr(s, v, ax): return s.m * G * (1 - s.fs) + s.cl * v * v * (1 - s.fa) + s.m * ax * s.h / s.L + s.cd * v * v * s.hc / s.L
    def dF(s, ay, front):   # 모델 0: 넘기려는 모멘트 m a_y h 를 축 무게 몫대로, 윤거로 나눔
        return (s.fs if front else 1 - s.fs) * s.m * ay * s.h / (s.tf if front else s.tr)
    def muZ(s, z): return max(0.0, s.mu - s.mus * (z - s.fz0) / 1000)
    def cap(s, Fz, d):
        if not s.mus: return s.kG * s.mu * max(0, Fz)
        o, i = Fz / 2 + d, Fz / 2 - d
        if i < 0: o, i = Fz, 0.0
        o = max(0, o)
        return s.kG * (s.muZ(o) * o + s.muZ(i) * i)
    def capF(s, v, ax, ay): return s.cap(s.Fzf(v, ax), s.dF(ay, True))
    def capR(s, v, ax, ay): return s.cap(s.Fzr(v, ax), s.dF(ay, False))

    def vCorner(s, k):
        k = abs(k)
        if k < 1e-9: return math.inf
        if k in s.vc: return s.vc[k]
        ok = lambda u: s.m * u * u * k * s.fs <= s.capF(u, 0, u * u * k) + 1e-9 and s.m * u * u * k * (1 - s.fs) <= s.capR(u, 0, u * u * k) + 1e-9
        lo, hi = 0.0, 150.0
        if ok(hi): v = math.inf
        else:
            for _ in range(60):
                md = (lo + hi) / 2
                if ok(md): lo = md
                else: hi = md
            v = lo
        s.vc[k] = v; return v

    # ---- 축전지
    def Voc(s, soc): return s.Ns * (s.I['c_vmin'] + (s.I['c_vmax'] - s.I['c_vmin']) * clamp01(soc))
    def term(s, P, V0, rs=1.0):
        Rx = s.Rb * rs
        if P <= 0: return 0.0, V0
        if Rx <= 0: return P / V0, V0
        D = V0 * V0 - 4 * Rx * P
        if D < 0: return None
        i = (V0 - math.sqrt(D)) / (2 * Rx); return i, V0 - i * Rx
    def ptMax(s, V0):
        iI = min(s.Imax, V0 / (2 * s.Rb) if s.Rb > 0 else math.inf)
        return s.kP * min(s.Pmax, (V0 - iI * s.Rb) * iI)

    # ---- 모터
    def fromTab(s, t, n, V):
        sf = (V / s.I['v_ref']) / s.ke; nt = n / sf; z = t[-1]
        return tab1(t, nt) if nt <= z[0] else z[1] * z[0] / nt
    def Tpk(s, n, V):
        if s.tq: return s.fromTab(s.tq, n, V)
        if s.tqC: return s.fromTab(s.tqC, n, V) / s.cpct
        return s.I['tmax']
    def Tct(s, n, V):
        if s.tqC: return min(s.fromTab(s.tqC, n, V), s.Tpk(n, V))
        return s.Tpk(n, V) * s.cpct
    def rM(s, Tm): return clamp01((Tm - s.dr0) / (s.dr1 - s.dr0)) if s.drM and Tm is not None and math.isfinite(Tm) else 0.0
    def rI(s, Ti): return clamp01((Ti - s.di0) / (s.di1 - s.di0)) if s.inOn and s.di1 > s.di0 and s.ict < s.ipk and Ti is not None and math.isfinite(Ti) else 0.0
    def Tlim(s, n, V, rm, ri):
        if n > s.nmax: return 0.0
        P = s.Tpk(n, V); T = P - rm * (P - s.Tct(n, V)) if rm > 0 else P
        return min(T, s.kt * (s.ipk - ri * (s.ipk - s.ict)))
    def eM(s, n, T): return (bilin(s.I['effM'], n, abs(T)) if s.I.get('effM') else s.I['eta_mot']) / 100
    def eI(s, n, T): return (bilin(s.I['effI'], n, abs(T)) if s.I.get('effI') else s.I['eta_inv']) / 100
    def rpm(s, v): return v / s.r * s.gr * 60 / (2 * math.pi)
    def drive(s, v, V0, Tm, Ti):
        n = s.rpm(v); w = n * 2 * math.pi / 60; Pt = s.ptMax(V0); rm, ri = s.rM(Tm), s.rI(Ti)
        V = V0; T = s.Tlim(n, V0, rm, ri)
        for _ in range(3):   # 사이트와 같이 3 번 (단자 전압이 전류로 떨어지는 고정점; 문서에 '3 번 되풀이')
            e = s.eM(n, T) * s.eI(n, T); T = s.Tlim(n, V, rm, ri)
            if w > 0: T = min(T, Pt * e / w)
            tr = s.term(T * w / e, V0); V = tr[1] if tr else V0 / 2
        return T * s.gr * s.eta / s.r

    # ---- 가속 · 감속
    def aDrive(s, v, k, a0, V0, Tm, Ti):
        ay = v * v * abs(k); Fyr = s.m * ay * (1 - s.fs); Fyf = s.m * ay * s.fs; Fm = s.drive(v, V0, Tm, Ti); ax = a0
        for _ in range(60):
            N = s.capR(v, ax, ay); Fx = N * math.sqrt(max(0, 1 - (Fyr / N) ** 2)) if N > 0 else 0
            nx = (min(Fm, Fx) - s.Fres(v)) / s.meff
            if abs(nx - ax) < 1e-10: ax = nx; break
            ax = nx
        if Fyf > 0 and s.h > 0 and s.capF(v, ax, ay) < Fyf:
            lo, hi = -3 * G, ax
            if s.capF(v, lo, ay) >= Fyf:
                for _ in range(60):
                    md = (lo + hi) / 2
                    if s.capF(v, md, ay) >= Fyf: lo = md
                    else: hi = md
                ax = lo
        return ax
    def aBrake(s, v, k):
        ay = v * v * abs(k); d = 0.0
        for _ in range(60):
            N = s.capF(v, -d, ay) + s.capR(v, -d, ay); Fx = N * math.sqrt(max(0, 1 - (s.m * ay / N) ** 2)) if N > 0 else 0
            nd = (Fx + s.Fres(v)) / s.meff
            if abs(nd - d) < 1e-10: d = nd; break
            d = nd
        return d

    # ---- 전기 · 열
    def rS(s, Tb): return max(0.3, 1 + s.alp * (25 - Tb)) if s.btOn else 1.0
    def elec(s, F, v, V0, rs):
        if F <= 0: return dict(P=0.0, I=0.0, L=0.0, Li=0.0)
        n = s.rpm(v); w = n * 2 * math.pi / 60; T = F * s.r / (s.gr * s.eta); em = s.eM(n, T); e = em * s.eI(n, T); P = T * w / e
        tr = s.term(P, V0, rs)
        Ib = tr[0] if tr else min(s.Imax, V0 / (2 * max(s.Rb * rs, 1e-9)))
        return dict(P=P, I=Ib, L=T * w * (1 / em - 1), Li=P - T * w / em)
    def hV(s, h0, h60, v):
        h0 = h0 or 0; h60 = h0 if h60 is None or not math.isfinite(h60) else h60
        return max(0, h0 + (h60 - h0) * v / (60 / 3.6))
    @staticmethod
    def tow(T, Teq, k, dt): return Teq + (T - Teq) * math.exp(-k * dt)
    def air(s, T, Q, h, C, dt): return s.tow(T, s.Tamb + Q / h, h / C, dt) if h > 0 else T + Q * dt / C
    def thStep(s, st, Lm, Li, Ib, v, dt):
        I = s.I; Tw = st['w'] if s.cwOn else s.thCo; Qb = Ib * Ib * s.Rb * s.rS(st['b'])
        m = st['m'] if not s.thOn else (s.tow(st['m'], Tw + Lm * s.thR, 1 / (s.thR * s.thC), dt) if s.mW else s.air(st['m'], Lm, s.hV(I.get('m_ha0'), I.get('m_ha60'), v), s.thC, dt))
        i = st['i'] if not s.inOn else (s.tow(st['i'], Tw + Li * s.Ri, 1 / (s.Ri * s.Ci), dt) if s.iW else s.air(st['i'], Li, s.hV(I.get('i_ha0'), I.get('i_ha60'), v), s.Ci, dt))
        b = st['b'] if not s.btOn else (s.tow(st['b'], Tw + Qb * s.Rbt, 1 / (s.Rbt * s.Cb), dt) if s.bW else s.air(st['b'], Qb, s.hV(I.get('b_ha'), I.get('b_ha60'), v), s.Cb, dt))
        w = s.thCo
        if s.ser:   # 직렬 회로: 라디 출구에서 부품 순서대로 (부품 점 = 잘 섞인 덩어리, 그 점 출구 온도)
            Gr = min(s.Cc, max(1e-6, s.hV(I.get('cw_g0'), I.get('cw_g60'), v)))
            base = st['w'] - Gr * (st['w'] - s.Tamb) / s.Cc; Qs = 0.0; nx = {'m': m, 'i': i, 'b': b}
            for p in s.order:
                if p == 'm' and s.thOn and s.mW:
                    Re = s.thR + 1 / s.Cc; Q = (st['m'] - base) / Re; nx['m'] = s.tow(st['m'], base + Lm * Re, 1 / (Re * s.thC), dt)
                elif p == 'i' and s.iW:
                    if s.inOn: Re = s.Ri + 1 / s.Cc; Q = (st['i'] - base) / Re; nx['i'] = s.tow(st['i'], base + Li * Re, 1 / (Re * s.Ci), dt)
                    else: Q = Li
                elif p == 'b' and s.btOn and s.bW:
                    Re = s.Rbt + 1 / s.Cc; Q = (st['b'] - base) / Re; nx['b'] = s.tow(st['b'], base + Qb * Re, 1 / (Re * s.Cb), dt)
                else: continue
                Qs += Q; base += Q / s.Cc
            w = s.tow(st['w'], s.Tamb + Qs / Gr, Gr / s.Cw, dt)
            return {'m': nx['m'], 'i': nx['i'], 'w': w, 'b': nx['b']}
        if s.cwOn:
            UA = max(1e-6, s.hV(s.ua0, s.ua60, v))
            Q = ((st['m'] - st['w']) / s.thR if s.thOn and s.mW else 0) + (((st['i'] - st['w']) / s.Ri if s.inOn else Li) if s.iW else 0) + ((st['b'] - st['w']) / s.Rbt if s.btOn and s.bW else 0)
            w = s.tow(st['w'], s.Tamb + Q / UA, UA / s.Cw, dt)
        return {'m': m, 'i': i, 'w': w, 'b': b}


# ---- 칸 · 차속 · 적분
def grid(segs, ds):
    S = [0.0]; K = []
    for l, R in segs:
        n = max(1, math.ceil(l / ds - 1e-9)); st = l / n
        for _ in range(n): K.append(1 / R if R else 0.0); S.append(S[-1] + st)
    return S, K


def speed(C, S, K, V0, TM, TI):
    N = len(S); v = [0.0] * N; lim = [0.0] * N
    for i in range(N):
        a = K[i - 1] if i >= 1 else 0.0; b = K[i] if i < len(K) else 0.0
        kp = a if abs(a) > abs(b) else b
        lim[i] = min(C.vCorner(abs(kp)), C.vtop)
    a = 0.0
    for i in range(N - 1):
        a = C.aDrive(v[i], K[i], a, V0[i], TM[i] if TM else C.TH0['m'], TI[i] if TI else C.TH0['i'])
        v[i + 1] = min(lim[i + 1], math.sqrt(max(0, v[i] ** 2 + 2 * a * (S[i + 1] - S[i]))))
    for i in range(N - 2, -1, -1):
        bk = C.aBrake(v[i + 1], K[i])
        v[i] = min(v[i], math.sqrt(v[i + 1] ** 2 + 2 * bk * (S[i + 1] - S[i])))
    return v


def walk(C, S, K, v, V0, T0):
    N = len(v); tc = [0.0]; ec = [0.0]; st = dict(T0); tm = [st['m']]; ti = [st['i']]
    for i in range(N - 1):
        ds = S[i + 1] - S[i]; vm = (v[i] + v[i + 1]) / 2; dt = ds / vm if vm > 0 else math.inf
        ax = (v[i + 1] ** 2 - v[i] ** 2) / (2 * ds); F = C.meff * ax + C.Fres(vm)
        E = C.elec(F, vm, V0[i], C.rS(st['b']))
        tc.append(tc[-1] + dt); ec.append(ec[-1] + V0[i] * E['I'] * dt)
        st = C.thStep(st, E['L'], E['Li'], E['I'], vm, dt if math.isfinite(dt) else 0); tm.append(st['m']); ti.append(st['i'])
    return tc, ec, tm, ti, st


def laps(C, segs, m, ds, soc0, fixedV=None, T0=None):
    S1, _ = grid(segs, ds); P = len(S1) - 1
    S, K = grid(segs * m, ds); N = len(S); t0 = dict(C.TH0) if T0 is None else dict(T0)
    V0 = [fixedV if fixedV else C.Voc(soc0)] * N; TM = TI = None
    passes = 1 if (fixedV and not C.drOn) else 2
    for _ in range(passes):
        v = speed(C, S, K, V0, TM, TI); tc, ec, tm, ti, T1 = walk(C, S, K, v, V0, t0)
        if C.drOn: TM, TI = tm, ti
        if fixedV: continue
        socs = []; soc = soc0
        for j in range(m): socs.append(soc); soc -= (ec[(j + 1) * P] - ec[j * P]) / C.Epack
        V0 = [C.Voc(socs[min(m - 1, i // P)]) for i in range(N)]
    t = [tc[(j + 1) * P] - tc[j * P] for j in range(m)]; E = [ec[(j + 1) * P] - ec[j * P] for j in range(m)]
    return dict(t=t, Ec=E, soc1=soc0 - sum(E) / C.Epack, T1=T1)


def reverse(segs): return [[l, -R] for l, R in reversed(segs)]


def endurance(I, C):
    E = I['end']; n = E['laps']; n1 = E['stint']; n2 = n - n1
    A = laps(C, E['seg'], n1, 1, 1.0); B = laps(C, E['seg'], n2, 1, A['soc1'], None, A['T1'])
    return dict(T=sum(A['t']) + sum(B['t']), Ec=sum(A['Ec']) + sum(B['Ec']), T1=B['T1'])


def kGrip(I, which):
    if I.get('dr_real', 0) != 1 or which == 'acc': return 1.0
    ks = max(0.05, I['dr_ks'] if I.get('dr_ks', 0) > 0 else 1)
    return ks * (max(0.05, I['dr_ke'] if I.get('dr_ke', 0) > 0 else 1) if which == 'end' else 1)


def run(I):
    gr = I['gr']
    CA = Car(I, gr, 1, kGrip(I, 'acc'))
    S, K = grid([[ACC_L, 0]], 0.5); V = [CA.Voc(1)] * len(S)
    v = speed(CA, S, K, V, None, None); acc = walk(CA, S, K, v, V, CA.TH0)[0][-1]
    C = Car(I, gr, 1, kGrip(I, 'ax'))
    # 스키드패드: 일정 반경에서 가장 빠른 일정 차속 (앞축 횡 · 뒤축 마찰원 · 모터 힘)
    def ok(u):
        ay = u * u / SK_R; Fx = C.Fres(u)
        if C.drive(u, C.Voc(1), C.TH0['m'], None) < Fx: return False
        if C.m * ay * C.fs > C.capF(u, 0, ay) + 1e-9: return False
        N = C.capR(u, 0, ay)
        return N > 0 and (C.m * ay * (1 - C.fs) / N) ** 2 + (Fx / N) ** 2 <= 1
    lo, hi = 0.0, C.vtop
    if ok(hi): vs = hi
    else:
        for _ in range(80):
            md = (lo + hi) / 2
            if ok(md): lo = md
            else: hi = md
        vs = lo
    skid = 2 * SK_C / vs
    ax = laps(C, reverse(I['end']['seg']), 1, 1, 1.0, C.Voc(1))['t'][0]
    kE = kGrip(I, 'end'); CE = Car(I, gr, 1, kE); EN = endurance(I, CE); k = 1.0
    if EN['Ec'] > CE.Ecap:   # 에너지 상한: 출력 상한 배율 k 를 다 셈 이분법으로 (소비 = 상한)
        lo, hi = 0.05, 1.0
        for _ in range(30):
            md = (lo + hi) / 2
            if endurance(I, Car(I, gr, md, kE))['Ec'] > CE.Ecap: hi = md
            else: lo = md
        k = lo; EN = endurance(I, Car(I, gr, k, kE))
    T1 = EN['T1']; C0 = Car(I, gr, 1, kE)
    return dict(t_acc_s=acc, t_skid_s=skid, t_ax_s=ax, t_end_s=EN['T'], e_use=EN['Ec'] / 3.6e6, p_lim=k * 100,
                c_tm=T1['m'] if C0.thOn else None, c_ti=T1['i'] if C0.inOn else None, c_tw=T1['w'] if C0.cwOn else None, c_tb=T1['b'] if C0.btOn else None)


TOL = dict(t_acc_s=('%', 0.5), t_skid_s=('%', 0.5), t_ax_s=('%', 0.5), t_end_s=('%', 0.5), e_use=('%', 1.0), p_lim=('%', 2.0),
           c_tm=('K', 0.5), c_ti=('K', 0.5), c_tw=('K', 0.5), c_tb=('K', 0.5))


def main():
    f = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), 'cases.json')
    D = json.load(open(f, encoding='utf-8')); bad = 0; rows = []
    for c in D['cases']:
        R = run(c['I']); print(f"\n[{c['id']}] {c['n']}")
        for k, (kind, tol) in TOL.items():
            a, b = c['out'].get(k), R.get(k)
            if a is None and b is None: continue
            if a is None or b is None: print(f'  {k:9s} 사이트 {a}  Python {b}  ← 한쪽만 있음'); bad += 1; continue
            d = (b - a) / a * 100 if kind == '%' else b - a; okk = abs(d) <= tol; bad += 0 if okk else 1
            print(f"  {k:9s} 사이트 {a:12.4f}  Python {b:12.4f}  차이 {d:+8.3f} {'%' if kind == '%' else 'K'}  {'ok' if okk else '← 넘음'}")
            rows.append((c['id'], k, a, b, d, okk))
    print(f"\n허용 넘음 {bad} 개 / {len(rows)} 개")
    return bad


if __name__ == '__main__':
    sys.exit(1 if main() else 0)
