# 관리자 문서 (공개 사이트에는 링크하지 않음)

## 권한
| 역할 | 할 수 있는 것 | 정해지는 곳 |
|---|---|---|
| 개발자 | 코드 수정(깃허브), 디버깅, 플랫폼 문의 읽기, 팀 삭제 | 깃허브 저장소 권한 + `js/config.js` `developers` + `firestore.rules` `isDev()` |
| 팀 관리자 | 자기 팀 관리자 모드(진행 상태·우리 팀 값·이번 시즌·초기화, 부적절한 논의 글 삭제), 팀 비밀번호 변경, 초대 문구 복사, 관리자 지정·해제, 팀원 내보내기·차단, 백업 | `teams/<팀>/members/<uid>.role = 'admin'` (사이트 칩 → 팀 패널에서 관리) |
| 팀원 | 자기 팀 데이터 보기, 항목별 논의(댓글·답글, 자기 글 수정·삭제), 플랫폼 문의 | `teams/<팀>/members/<uid>.role = 'member'` |
| 로그인 사용자 | 가이드·계산기, 팀 만들기, 팀 이름+비밀번호로 가입, 플랫폼 문의 | 구글 로그인 |
| 비로그인 | 가이드·계산기 | — |

개발자는 팀 운영에 관여하지 않습니다. 팀 인수인계는 팀 관리자끼리 사이트에서 합니다.

## 데이터 구조 (Firestore)
- `teams/<팀ID>` {name, createdBy, createdAt, key} — 팀 (팀원만 읽음, 목록 공개 안 함)
- `teamNames/<소문자 팀 이름>` {team} — 팀 이름 중복 방지
- `joinKeys/<열쇠>` {team} — 가입 열쇠. 열쇠 = SHA-256(소문자 팀 이름 + ':' + 비밀번호). 비밀번호 원문은 어디에도 저장하지 않음
- `teams/<팀ID>/members/<uid>` {role, name, email, at, via} — 팀원 명단
- `teams/<팀ID>/status/<시즌>-<항목>`, `val/<항목>`, `qa/*`(항목별 논의), `meta/season`, `meta/state` — 팀 데이터 (팀원만)
- `teams/<팀ID>/blocked/<uid>` 팀에서 차단한 사람 (관리자만, 재가입 막음)
- `profiles/<uid>` 표시 이름, `users/<uid>` 마지막으로 고른 팀, `feedback/*` 플랫폼 문의(개발자만 읽고 처리 상태 변경), `fbBlocked/<uid>` 문의 차단한 계정(개발자만)
- 팀 백업: 팀 창 [내보내기]·[불러오기](덮어쓰기). 무료 요금제에는 자동 백업이 없음.
- 보안 규칙: `firestore.rules` 를 main 에 올리면 깃허브 액션(`.github/workflows/firestore-rules.yml`)이 자동 게시합니다. 저장소 Secrets 의 `FIREBASE_SA`(서비스 계정 JSON, 역할: Firebase 규칙 관리자 + Cloud Datastore 사용자)가 필요합니다. 결과는 저장소 Actions 탭에서 확인.

## 디버깅 모드
- 주소 끝에 `#debug` (예: `https://koreanhanjiyun.github.io/run2x-guide/#debug`). **개발자 계정으로 로그인한 상태**에서만 켜집니다.
- 공유 저장소에 쓰지 않고 이 브라우저에만 따로 저장(`run2x.dbg.*`). 화면 테두리 빨간 선, 상단 칩 "디버깅".
- 오른쪽 아래 **DBG** 버블: 상태·최근 오류, 디버깅 데이터 지우기, 끄기.

## 변경 이력 쓰는 법
- 사이트(참고 탭) 변경 이력에는 **설계 내용의 추가·변경·정정만** (`js/data/refs.js`). 정정은 `<b class="cl-fix">정정</b>`.
- 화면·기능 변경은 깃허브 커밋 메시지로만. 1.0.0 이전 개발 기록: `docs/devlog.html`.

## 올리기 전에
- `python3 tools/stamp.py` (css·js 주소에 ?v= 꼬리표 → 방문자 캐시 무효화)

## 자동 작업 (깃허브 Actions)
| 작업 | 언제 | 내용 |
|---|---|---|
| Firestore 규칙 게시 | `firestore.rules` 를 올릴 때 | 보안 규칙 자동 게시 |
| 오래 안 쓴 팀 정리 | 매달 1일 03:17 (수동 실행 시 기본은 확인만) | 2년간 팀원 접속이 없는 팀 삭제. 삭제 전 `trash/<팀ID>` 에 백업(90일 보관, 개발자만 읽기) |
| Firestore 예전 데이터 정리 | 수동 (한 번만) | 단일 팀 시절 데이터 삭제 |

- 마지막 활동일: 팀원이 접속하면 하루 한 번 `teams/<팀ID>.lastActive` 갱신.
- 자동 삭제된 팀 복구: Firebase 콘솔 → Firestore → `trash/<팀ID>` 의 `backup` 값(JSON 문자열)을 파일로 저장 → 같은 이름으로 팀을 새로 만든 뒤 팀 창 [불러오기].

## 1.0.0 조건
팀 기능 실사용 안정 + 사이트 정보(정보 모음) 완성 + 회장 시험 사용 1회 후.
