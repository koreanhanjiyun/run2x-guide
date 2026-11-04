"""docs/DASH-VARS.md → js/store/dash-keys.js (팀 설계값 키 목록)
사용: python3 tools/gen_dash_keys.py   (DASH-VARS.md를 고친 뒤 다시 실행)"""
import re, json, os, subprocess
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
md = open(os.path.join(ROOT, 'docs/DASH-VARS.md'), encoding='utf-8').read()
# 항목 id → 파트 (items.js)
items = json.loads(subprocess.check_output(['node', '-e', """
const fs=require('fs'); const src=fs.readFileSync(process.argv[1],'utf8')+';console.log(JSON.stringify(Object.fromEntries(ITEMS.map(i=>[i.id,i.p]))));';
eval(src);""", os.path.join(ROOT, 'js/data/items.js')]).decode())
PCODE = {'all':'공통','frame':'프레임','sus':'서스','str':'조향','brk':'제동','pt':'구동계','mc':'모터컨트롤러','bat':'배터리','cool':'냉각','elec':'회로','daq':'데이터로거','aero':'에어로'}
# 담당 파트 예외 (STORE-PLAN 2절) + 항목이 없는 키
OWN = {**{k:'프레임' for k in ['m','m_s','h_s','m_us_f','m_us_r','fr','left','h','a_cg','ixx','iyy','izz']},
       **{k:'서스' for k in ['L','tf','tr','ay_max','ay_max_sim','k_us','k_us_meas']},
       **{k:'공통' for k in ['score_goal','t_acc','t_skid','t_ax','t_end']},
       'hcop':'에어로', 'eta_dt':'구동계', 'j_eq':'구동계', 'crr':'구동계', 'vmax':'구동계'}
# 여러 키가 한 줄인 경우의 이름
NAMES = {'tf':'앞 트레드','tr':'뒤 트레드','ixx':'롤 관성 모멘트','iyy':'피치 관성 모멘트','izz':'요 관성 모멘트',
         't_acc':'목표 기록 (가속)','t_skid':'목표 기록 (스키드패드)','t_ax':'목표 기록 (오토크로스)','t_end':'목표 기록 (내구)',
         'margin_camber':'캠버 여유 (변형 대비)','margin_toe':'토 여유 (변형 대비)',
         'meas_camber_load':'실측 하중당 캠버 변화','meas_toe_load':'실측 하중당 토 변화',
         'cla_drs':'C<sub>L</sub>·A (DRS 열림)','cda_drs':'C<sub>D</sub>·A (DRS 열림)','xcop_drs':'CoP 위치 (DRS 열림)',
         'lsd_ramp_acc':'LSD 램프각 (가속)','lsd_ramp_dec':'LSD 램프각 (감속)',
         'derate_t0':'디레이팅 시작 온도','derate_t1':'디레이팅 끝 온도','n_s':'셀 직렬 수','n_p':'셀 병렬 수'}
# 함께 고치는 파트 (담당 파트 외에 이 파트 담당도 고침). firestore.rules 의 coOwn 과 같게
CO = {'r_load':'프레임'}
UNITS = {'cla_drs':'m²','cda_drs':'m²','xcop_drs':'mm'}
def clean(n): return re.sub(r'\s*\((?:앞 · 뒤[^)]*|앞 · 뒤)\)', lambda m: '', n).replace('앞 · 뒤 ','').strip()
keys = []
for sec in re.findall(r'(?s)\n## ([1-7])\. [^\n]*\n(.*?)(?=\n## )', md):
    for row in re.findall(r'(?m)^\| (`[^|]+) \|(.*)$', sec[1]):
        cells = [c.strip() for c in ('|'+row[1]).split('|')[1:-1]]
        ks = re.findall(r'`([A-Za-z][A-Za-z0-9_]*)`', row[0]); name, unit, item, make, use, dash = cells[:6]
        for k in ks:
            n = NAMES.get(k)
            if not n:
                base = clean(name)
                if len(ks) > 1 and k.endswith('_f'): n = base + ' (앞' + (', 바퀴 하나)' if '바퀴 하나' in name else ')')
                elif len(ks) > 1 and k.endswith('_r'): n = base + ' (뒤' + (', 바퀴 하나)' if '바퀴 하나' in name else ')')
                else: n = name
                n = n.replace(' (, 바퀴 하나)', '')
            first_item = (re.findall(r'[a-z][a-z0-9_]+', item) or [''])[0]
            part = OWN.get(k) or items.get(first_item, '공통')
            keys.append({'k':k, 'n':n, 'u':UNITS.get(k, '' if unit in ('—','-') else unit), 'p':part, 'it':first_item if first_item in items else '',
                         'calc': make.startswith('계산') or make.startswith('도구') and '팀' not in make, 'dash': dash.strip()})
# 풀이 (12절): "- **이름 `k`, `k2`** [그림] — 풀이"
defs, figs = {}, set()
for line in re.findall(r'(?m)^- \*\*(.+)$', md.split('\n## 12.')[1]):
    head, _, body = line.partition('—')
    ks = re.findall(r'`([A-Za-z][A-Za-z0-9_]*)`', head)
    for k in ks:
        defs[k] = body.strip()
        if '[그림]' in head: figs.add(k)
for d in keys:
    d['def'] = defs.get(d['k'], ''); d['fig'] = d['k'] in figs
miss = [d['k'] for d in keys if not d['def']]
assert not miss, ('풀이 없음', miss)
out = ['/* ============================================================',
       '   팀 설계값 키 목록 — docs/DASH-VARS.md 에서 만든 파일 (tools/gen_dash_keys.py). 직접 고치지 말고 문서를 고친 뒤 다시 만들 것',
       '   k 키 · n 이름 · u 단위 · p 담당 파트 · p2 함께 고치는 파트(있으면) · it 연결 설계 항목 · calc 계산값 · def 풀이 · fig 풀이 그림 대상',
       '   ※ 파트 코드표 PCODE 는 firestore.rules 의 partOfCode 와 같게',
       '   ============================================================ */',
       'const PCODE = ' + json.dumps(PCODE, ensure_ascii=False) + ';',
       'const PCODE_OF = Object.fromEntries(Object.entries(PCODE).map(([c,p])=>[p,c]));',
       'const DKEYS = [']
for d in keys:
    o = {x:d[x] for x in ('k','n','u','p','it','calc','def','fig')}
    if d['k'] in CO: o['p2'] = CO[d['k']]
    out.append('  ' + json.dumps(o, ensure_ascii=False) + ',')
out += ['];', 'const DK = Object.fromEntries(DKEYS.map(d=>[d.k,d]));',
        '/* 저장 문서 id: 파트코드__키 (규칙이 id 앞부분으로 담당 파트를 판정) */',
        'const dvId = k => PCODE_OF[DK[k].p] + \'__\' + k;', '']
open(os.path.join(ROOT, 'js/store/dash-keys.js'), 'w', encoding='utf-8').write('\n'.join(out))
print(len(keys), 'keys,', len(figs), 'fig keys')
