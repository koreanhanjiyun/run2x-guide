# 팀 설계값 저장 구조 (설계안)

마지막 갱신: 2026-11-02 · 상태: 시안 구현 완료(저장소 `firestore.rules` 에 규칙 반영) — **Firebase 콘솔 배포 전**. 작업 환경에서는 Firestore 에뮬레이터를 받을 수 없어(다운로드 차단) 규칙 시험은 콘솔 규칙 시뮬레이터로 한다(3절 시험표)

관련 문서: `docs/DASH-VARS.md`(변수 목록·풀이), `docs/TOOLS-PLAN.md`(도구 계획)

## 1. 결정 사항 (2026-11-02)

| 결정 | 내용 |
|---|---|
| 기존 "우리 팀 값" | 자동 변환하지 않는다. 기존 글 값(`val`)은 그대로 두고, 숫자 키가 연결된 항목에서는 새 숫자 칸 옆에 '이전 기록(글)'을 보여 주어 팀원이 직접 옮긴다. 실제 데이터를 바꾸는 이전 작업이 없다. |
| 드라이버 | 드라이버 값은 무게 배분 계산에 쓰이므로 **프레임 파트** 담당. |
| 그 밖 | 저장 위치 · 권한은 2절 제안대로(권장안). |
| 드라이버 개인 정보 | 키 · 몸무게는 팀원만 읽는다(3절). 실명 대신 '1st · 2nd · 3rd'와 팀이 정한 표시 이름(`label`)만 저장한다. |
| 지난 시즌 값 가져오기 | 설계값 표 위에 '값 가져오기' 버튼 하나. 창에서 시즌 → 파트 → 항목(여러 개)을 고르고, 지금 값과 그 시즌 값을 나란히 본 뒤 가져온다. 가져온 값은 이번 시즌 칸에 복사되며 상태 '검토 중', 출처 '○○ 시즌 값'. 파트장에게는 담당 파트만 보인다. 지난 시즌 기록은 그대로 남는다(시즌별 저장이라 추가 저장 공간 없음). |
| 같은 시즌 안 이전 값 | 따로 저장하지 않는다. 값마다 마지막 값 · 고친 사람 · 시각만 남기고, 실수로 덮어쓴 값은 백업 파일로 되돌린다. |

## 2. 저장 위치

모두 `teams/{팀ID}/` 아래. 시즌별 값은 지금 `val`과 같이 `s: {시즌: …}` 묶음에 둔다(지난 시즌 기록 보존, 이번 시즌만 수정 가능).

| 컬렉션 / 문서 id | 내용 | 한 문서의 모양 |
|---|---|---|
| `dv/{파트코드}__{키}` 예: `sus__kw_f`, `aero__cla` | 숫자 변수 하나 | `{ s: { "2026": { v, st, src, by, name, at, in } } }` |
| `mass/{어셈블리id}` 예: `mass/g1a2b3c` | 질량 표의 어셈블리 하나 (2026-11-02 변경: 파트별 표 → 어셈블리 하나 = 문서 하나). **팀원 누구나 이번 시즌 칸을 고침** (계산기는 자유, 대시보드 반영만 담당) | `{ s: { "2026": { name, x, y, z, cat, hue, pos: {c, r}, items: [ { name, m, n } ], ord } } }` — 좌표 · 범주는 어셈블리에만, 항목은 이름 · 한 개 질량 · 개수. `hue` = 카드 머리 색(색상 0~359). 지우면 문서는 두고 이번 시즌 칸만 뺀다 |
| `drivers/{d1 · d2 · d3}` | 1st · 2nd · 3rd 드라이버 (팀원 누구나 고침) | `{ s: { "2026": { label, sex, height, mass, gear: {helmet, suit, belt}, seg: {…}, hip: {x, z}, back, foot, pedal: {x, z}, sw: {x, z} } } }` (`pedal` = 발목(복사뼈) 중심, `foot` = 발 각도) — `sex` 체절 비율 표(m/f), `gear` 장비 kg (헬멧 → 머리, 드라이버 복 → 체절 비율로, 안전벨트 → 몸통) |
| `dtab/{파트코드}__{표키}` 예: `pt__motor_curve` | 그 밖의 표(모터 곡선, 트랙, 하드포인트, 하중 케이스 등) | `{ s: { "2026": { cols: [...], rows: [[...], ...] } } }` |

칸 뜻

| 칸 | 뜻 |
|---|---|
| `v` | 숫자 값 (`DASH-VARS.md` 단위 그대로). 비우면 `null` |
| `st` | 상태: `ok` 확정 · `rev` 검토 중 · `asm` 가정 · `calc` 계산값 |
| `src` | 출처 한 줄 (예: "도구 1", "TTC 2025 맞춤", "제조사 카탈로그"). 200자 이내 |
| `by`, `name`, `at` | 고친 사람 uid · 이름 · 시각(ISO) |
| `in` | 계산값일 때만: 계산에 쓴 입력 키와 그 입력의 `at` (예: `{ L: "2026-…", fr: "2026-…" }`). 입력의 `at`가 이보다 새로우면 화면에 '재계산 필요' 표시 |
| `cat` (질량 표) | 범주: `s` 현가상 · `uf` 현가하 앞 · `ur` 현가하 뒤 (드라이버는 `drivers`에서 가져와 '현가상 · 드라이버'로 합산) |
| `x`, `y`, `z` (질량 표 · 드라이버) | 좌표 [mm]: x = 앞 차축 중심에서 뒤로 +, y = 차 중심선에서 왼쪽 +, z = 지면에서 위로 + (대시보드 CoP 위치 `xcop`과 같은 기준, 2026-11-02 결정) |
| `height` (드라이버) | 키 [cm] |

문서 id 앞에 파트 코드를 붙이는 이유: 규칙(3절)이 문서 id만 보고 담당 파트를 알 수 있어, 파트장이 다른 파트의 키를 자기 파트 이름으로 만들어 고치는 것을 막는다.

### 파트 코드

| 코드 | 파트 | 코드 | 파트 |
|---|---|---|---|
| `all` | 공통 | `mc` | 모터컨트롤러 |
| `frame` | 프레임 | `bat` | 배터리 |
| `sus` | 서스 | `cool` | 냉각 |
| `str` | 조향 | `elec` | 회로 |
| `brk` | 제동 | `daq` | 데이터로거 |
| `pt` | 구동계 | `aero` | 에어로 |

코드표는 코드(`js/store/dash-keys.js`, 새 파일)와 규칙(`partOfCode`) 두 곳에 같게 둔다. 파트를 바꾸면 `PGROUP`(`status-shared.js`) · `grpOf`(규칙)와 함께 네 곳을 고친다.

### 키별 담당 파트

`DASH-VARS.md` 각 키의 '항목' 칸이 가리키는 설계 항목의 파트를 따른다. 예외(2026-11-02 확정):

| 키 | 제안 담당 | 이유 |
|---|---|---|
| 차량 전체 질량 · CG 결과(`m`, `fr`, `left`, `h`, `m_s`, `h_s`, `m_us_f/r`, 관성 모멘트) | 프레임 (확정) | 도구 1과 드라이버를 프레임이 맡으므로 결과 반영도 같은 파트가 한다 |
| 휠베이스 · 트레드(`L`, `tf`, `tr`) | 서스 (확정) | 서스 기하의 기본 치수 |
| 차량 목표값: `score_goal`, `t_acc` · `t_skid` · `t_ax` · `t_end` | 공통 (팀장 · 회장, 확정) | 차량 목표(P0) 항목 |
| `ay_max`, `k_us` | 서스 (확정) | 캠버 · 롤 · 밸런스 설계의 기준이라 서스가 정함 |
| 그 밖 | 항목 파트 그대로 | |

## 3. 권한 (규칙 초안)

읽기는 팀원 모두. 쓰기는 지금 `val`과 같은 원칙: 회장은 전부, 팀장 · 파트장은 담당 파트(또는 묶음)의 이번 시즌만.

```
// 파트 코드 → 파트 이름 (문서 id 앞부분). ※ js/store/dash-keys.js 의 PCODE 와 같게
function partOfCode(c) { return {'all':'공통','frame':'프레임','sus':'서스','str':'조향','brk':'제동','pt':'구동계',
                                 'mc':'모터컨트롤러','bat':'배터리','cool':'냉각','elec':'회로','daq':'데이터로거','aero':'에어로'}.get(c, ''); }
function codeOf(d) { return d.split('__')[0]; }
function curSzn(t) { return string(get(sznPath(t)).data.season); }
// 이번 시즌 항목 한 칸 검사: 값은 숫자 또는 비움, 상태는 네 가지 중 하나, 출처 200자 이내
function validDvEntry(e) { return e is map && (e.get('v', null) == null || e.v is number)
                                  && e.get('st', 'rev') in ['ok','rev','asm','calc'] && str(e.get('src', ''), 200); }
function validDv(t, m) { return m.keys().hasOnly(['s']) && (!exists(sznPath(t)) || !(curSzn(t) in m.s) || validDvEntry(m.s[curSzn(t)])); }

match /dv/{d} { allow read: if isMember(t);
  allow create: if validDv(t, request.resource.data) && (isTAdmin(t)
                || (canEditPart(t, partOfCode(codeOf(d))) && onlyCurKey(t, request.resource.data.get('s', {}))));
  allow update: if validDv(t, request.resource.data) && (isTAdmin(t)
                || (canEditPart(t, partOfCode(codeOf(d))) && curKeyChange(t, request.resource.data.get('s', {}), resource.data.get('s', {}))));
  allow delete: if isTAdmin(t); }
match /dtab/{d} { allow read: if isMember(t);
  allow create: if isTAdmin(t) || (canEditPart(t, partOfCode(codeOf(d))) && onlyCurKey(t, request.resource.data.get('s', {})));
  allow update: if isTAdmin(t) || (canEditPart(t, partOfCode(codeOf(d))) && curKeyChange(t, request.resource.data.get('s', {}), resource.data.get('s', {})));
  allow delete: if isTAdmin(t); }
match /mass/{c} { allow read: if isMember(t);
  allow create: if isTAdmin(t) || (canEditPart(t, partOfCode(c)) && onlyCurKey(t, request.resource.data.get('s', {})));
  allow update: if isTAdmin(t) || (canEditPart(t, partOfCode(c)) && curKeyChange(t, request.resource.data.get('s', {}), resource.data.get('s', {})));
  allow delete: if isTAdmin(t); }
match /drivers/{n} { allow read: if isMember(t);
  allow create: if n in ['d1','d2','d3'] && (isTAdmin(t) || (canEditPart(t, '프레임') && onlyCurKey(t, request.resource.data.get('s', {}))));
  allow update: if n in ['d1','d2','d3'] && (isTAdmin(t) || (canEditPart(t, '프레임') && curKeyChange(t, request.resource.data.get('s', {}), resource.data.get('s', {}))));
  allow delete: if isTAdmin(t); }
```

규칙 초안은 배포 전에 Firebase 규칙 시뮬레이터(또는 에뮬레이터)로 아래 경우를 시험한다.

| 시험 | 기대 |
|---|---|
| 서스 파트장이 `sus__kw_f` 이번 시즌 값 쓰기 | 허용 |
| 서스 파트장이 `aero__cla` 쓰기 | 거부 |
| 샤시 묶음 팀장이 `aero__cla` 쓰기 | 허용 |
| 파트장이 지난 시즌 값 고치기 | 거부 |
| 값에 글자 넣기 (`v: "1550"`) | 거부 |
| 프레임 파트장이 `drivers/d1` 쓰기 / 서스 파트장이 쓰기 | 허용 / 거부 |
| 팀원(권한 없음)이 아무 문서 쓰기 | 거부 |
| 팀 밖 사용자가 읽기 | 거부 |

## 4. 코드에서 함께 고칠 곳

| 파일 | 할 일 |
|---|---|
| `js/store/dash-keys.js` (새) | 키 목록(이름 · 단위 · 파트 · 상태 기본값 · 연결 항목 · 풀이)과 파트 코드표. `DASH-VARS.md`를 기준으로 만든다 |
| `js/store/backend.js` | 백업 대상 `BACKUP_COLS`에 `dv` · `mass` · `drivers` · `dtab` 추가, 불러오기(시즌 골라 복구)도 같은 방식으로. 팀 삭제(`delTeam`)의 컬렉션 목록에도 추가. 백업 형식 `version`을 2로 올리고 1도 계속 읽기 |
| `js/app/season.js` | 시즌 값 지우기 · 넘기기에 새 컬렉션 포함 |
| `js/app/tools-tab.js` | 시안의 `DASH.P` 대신 `dv`에서 읽고, 값 고치기를 저장으로 연결(권한 없으면 읽기 전용) |
| 설계 탭 (`step-html.js` 등) | 숫자 키가 연결된 항목: 키 값을 읽기 전용으로 보여 주고, 옆에 '이전 기록(글)'과 '대시보드에서 고치기' 연결 |
| `firestore.rules` | 3절 규칙 추가 |

## 5. 배포 순서

1. 코드와 규칙을 시안으로 만들고 데모(저장소 없음)에서 화면 확인.
2. 규칙 시뮬레이터로 3절 시험표를 모두 통과.
3. 회장 계정으로 팀 백업 내보내기(지금 데이터 보관용, 이번 작업은 기존 데이터를 바꾸지 않지만 안전을 위해).
4. Firebase 콘솔에 규칙 배포(회장 · 개발자 계정). 규칙 배포 후 사이트 배포 순서로 해야 새 화면이 권한 오류를 내지 않는다.
5. 사이트 배포(`main` 푸시, 변경 이력 기록).
6. 팀 계정으로 실제 쓰기 · 읽기 · 백업 내보내기를 한 번씩 확인.

## 6. 남은 결정

- 없음 (2026-11-02 기준)

