"""계산 도구 파일 조립 (도구 2·3·4·5·6·7·8·9·G·T).
js/app/tool*.js 중 이 목록의 파일은 여기 tools/toolsrc/ 의 조각을 합쳐 만든 결과다. 도구 1 은 js/app/tool1*.js 를 직접 고친다.
조각: tN_head(머리) · tN_ui(화면) · tN_def(정의, /*@@VERIFY@@*/ /*@@CODE@@*/ 자리) · tN_verify(검증표) · tN_calc(계산식, 화면의 '코드 보기'에도 그대로 실림) · k3d.js(3D 기구학 엔진) · cool_net.js(냉각망).
사용: python3 tools/toolsrc/asm.py   (그 뒤 stamp.py · draft/build.py · QA)
주의: 조립 결과 파일을 직접 고치면 다음 조립 때 덮어써진다. 고칠 때는 조각을 고칠 것.
2026-11-14 이전(클라우드 세션 시절)에는 이 조각들이 세션 임시 폴더에 있었고, 그때 저장소 결과물과 바이트 단위로 같음을 확인하고 옮겼다."""
import os
S = os.path.dirname(os.path.abspath(__file__)) + os.sep
R = os.path.normpath(os.path.join(S, '..', '..', 'js', 'app')) + os.sep
r = lambda f: open(S+f, encoding='utf-8').read()
q = lambda c: '`'+c.replace('\\','\\\\').replace('`','\\`').replace('${','\\${')+'`'
def w(out, s): open(R+out, 'w', encoding='utf-8', newline='\n').write(s)
code = r('cool_net.js').strip()+'\n\n'+r('t2_calc29.js').strip()+'\n'
d = r('t2_def26.js').replace('/*@@VERIFY@@*/', r('t2_verify25.js').strip()).replace('/*@@CODE@@*/', q(code))
w('tool2-lap.js', r('t2_head13.js')+r('t2_ui27.js')+d)
code9 = r('cool_net.js').strip()+'\n\n'+r('t9_calc2.js').strip()+'\n'
d9 = r('t9_def2.js').replace('/*@@VERIFY@@*/', r('t9_verify3.js').strip()).replace('/*@@CODE@@*/', q(code9))
w('tool9-cool.js', r('t9_head1.js')+r('cool_net.js')+'\n'+r('t9_ed3.js')+d9)
code4 = r('t4_calc3.js').strip()+'\n'
d4 = r('t4_def3.js').replace('/*@@VERIFY@@*/', r('t4_verify3.js').strip()).replace('/*@@CODE@@*/', q(code4))
w('tool4-bat.js', d4)
def tool(out, calc_src, verf, deff, eng=False):
    c = (r('k3d.js').strip()+'\n\n' if eng else '')+calc_src.strip()+'\n'
    d = r(deff).replace('/*@@VERIFY@@*/', r(verf).strip()).replace('/*@@CODE@@*/', q(c))
    w(out, d)
tool('toolT-tire.js',  r('tT_calc.js'), 'tT_verify.js', 'tT_def.js')
tool('tool7-spring.js', r('t7_calc.js'), 't7_verify.js', 't7_def.js', eng=True)
tool('tool5-geo.js',   r('t5_calc.js'), 't5_verify.js', 't5_def.js', eng=True)
tool('tool6-steer.js', r('t6_calc.js'), 't6_verify.js', 't6_def.js', eng=True)
tool('tool3-brake.js', r('t3_calc.js'), 't3_verify.js', 't3_def.js')
tool('tool8-load.js',  r('t8_calc.js'), 't8_verify.js', 't8_def.js', eng=True)
tg2 = (r('cool_net.js').strip()+'\n\n'+r('t2_calc29.js')).replace('function calc(I) {', 'function calcT2(I) {', 1)
tool('toolG-goal.js', tg2.strip()+'\n\n'+r('tG_calc.js'), 'tG_verify.js', 'tG_def.js')
print('ok: 도구 2·3·4·5·6·7·8·9·G·T 조립')
