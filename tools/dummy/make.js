/* 더미 팀 JSON 만들기: python3 tools/draft/build.py 뒤에 node tools/dummy/make.js
   → tools/dummy/run2x-dummy-team.json (시안 가짜 저장소의 기본 데이터 + 실제 팀 [가져오기]용 파일) */
const H = require('../draft/qa/h.js'), fs = require('fs'), path = require('path');
(async () => { await H.start(); const b = await H.chromium.launch(); const p = await H.page(b, 'none', {W:1600, H:900});
  const src = fs.readFileSync(path.join(__dirname, 'gen.js'), 'utf8');
  const out = await p.evaluate(`(${src})({})`);
  fs.writeFileSync(path.join(__dirname, 'run2x-dummy-team.json'), JSON.stringify(out, null, 1));
  const c = Object.fromEntries(Object.entries(out.data).map(([k, v]) => [k, Object.keys(v).length]));
  console.log('members', Object.keys(out.members).length, c, 'errs', p.errs);
  await b.close(); await H.end(); })();
