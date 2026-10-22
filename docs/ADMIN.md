# 관리자 문서 (공개 사이트에는 링크하지 않음)

## 권한
| 역할 | 할 수 있는 것 | 정해지는 곳 |
|---|---|---|
| 개발자 | 코드 수정(깃허브), 디버깅, 플랫폼 문의 읽기, 팀 삭제 | 깃허브 저장소 권한 + `js/config.js` `developers` + `firestore.rules` `isDev()` |
| 팀 관리자 | 자기 팀 관리자 모드(진행 상태·우리 팀 값·이번 시즌·초기화, 질문 상태 변경·삭제), 팀 비밀번호 변경, 관리자 지정·해제, 내보내기 | `teams/<팀>/members/<uid>.role = 'admin'` (사이트 칩 → 팀 패널에서 관리) |
| 팀원 | 자기 팀 데이터 보기, 질문·오류 남기기(자기 글 수정·삭제) | `teams/<팀>/members/<uid>.role = 'member'` |
| 로그인 사용자 | 가이드·계산기, 팀 만들기, 팀 이름+비밀번호로 가입, 플랫폼 문의 | 구글 로그인 |
| 비로그인 | 가이드·계산기 | — |

개발자는 팀 운영에 관여하지 않습니다. 팀 인수인계는 팀 관리자끼리 사이트에서 합니다.

## 데이터 구조 (Firestore)
- `teams/<팀ID>` {name, createdBy, createdAt, key} — 팀 (팀원만 읽음, 목록 공개 안 함)
- `teamNames/<소문자 팀 이름>` {team} — 팀 이름 중복 방지
- `joinKeys/<열쇠>` {team} — 가입 열쇠. 열쇠 = SHA-256(소문자 팀 이름 + ':' + 비밀번호). 비밀번호 원문은 어디에도 저장하지 않음
- `teams/<팀ID>/members/<uid>` {role, name, email, at, via} — 팀원 명단
- `teams/<팀ID>/status/<시즌>-<항목>`, `val/<항목>`, `qa/*`, `meta/season`, `meta/state` — 팀 데이터 (팀원만)
- `profiles/<uid>` 표시 이름, `users/<uid>` 마지막으로 고른 팀, `feedback/*` 플랫폼 문의(개발자만 읽음)
- 보안 규칙: `firestore.rules` 를 Firebase 콘솔 → Firestore → 규칙에 붙여 넣고 게시. **규칙을 바꾸면 콘솔에서 다시 게시해야 적용됩니다.**

## 디버깅 모드
- 주소 끝에 `#debug` (예: `https://koreanhanjiyun.github.io/run2x-guide/#debug`). **개발자 계정으로 로그인한 상태**에서만 켜집니다.
- 공유 저장소에 쓰지 않고 이 브라우저에만 따로 저장(`run2x.dbg.*`). 화면 테두리 빨간 선, 상단 칩 "디버깅".
- 오른쪽 아래 **DBG** 버블: 상태·최근 오류, 디버깅 데이터 지우기, 끄기.

## 변경 이력 쓰는 법
- 사이트(참고 탭) 변경 이력에는 **설계 내용의 추가·변경·정정만** (`js/data/refs.js`). 정정은 `<b class="cl-fix">정정</b>`.
- 화면·기능 변경은 깃허브 커밋 메시지로만. 1.0.0 이전 개발 기록: `docs/devlog.html`.

## 올리기 전에
- `python3 tools/stamp.py` (css·js 주소에 ?v= 꼬리표 → 방문자 캐시 무효화)
