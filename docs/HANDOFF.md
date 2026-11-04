# 인수인계 (다음 Claude 세션용)

새 세션은 이 문서와 `CLAUDE.md` 를 먼저 읽고 시작한다. 작업은 GitHub 저장소만으로 이어 간다(관리자 PC 저장소에 의존하지 않음).

## 1. 지금 상태 (2026-11-04)

| 구분 | 위치 | 내용 |
|---|---|---|
| 실제 사이트 | `main` → https://koreanhanjiyun.github.io/run2x-guide/ | v1.3.8. 바꾸려면 관리자 지시 필요 |
| 시안 브랜치 | `redesign-v1` | 개편 작업 전부 (도구 탭 · 작업창 · 도구 1 · 대시보드 · 규칙) |
| 공개 시안 | `main` 의 `draft/` → https://koreanhanjiyun.github.io/run2x-guide/draft/ | 관리자는 이 주소로 시안을 확인함. 예시 데이터 · 가짜 저장소(실제 Firebase 연결 안 함), 검색 제외 |
| Claude 아티팩트 | https://claude.ai/artifact/4iS9LPPNesPsXZfEUTk2jr | 예전 시안 확인 경로. 이제는 공개 시안 주소를 씀 |

## 2. 시안 만들기 · 검사 · 공개

```bash
python3 tools/stamp.py                    # css · js 주소 ?v= 꼬리표 (커밋 전 항상)
python3 tools/draft/build.py              # → dist/draft/run2x_redesign.html, dist/draft/_t.html (dist/ 는 git 제외)

# 검사 (Playwright, 콘솔 오류 없어야 함)
python3 -m http.server 8801 &             # 저장소 맨 위에서
node tools/draft/qa/site_check.js 8801    # 기대: uniq 125, 오류 []
node tools/draft/qa/tools_tour.js         # 기대: 1 / 6 … 6 / 6, errs []
node tools/draft/qa/tool1_check.js       # 기대: 끼워 넣기 · 드라이버 선택 · verify 32/32 · 도움말 1~13, errs []
# (node 가 playwright 를 못 찾으면 NODE_PATH=$(npm root -g) 를 앞에 붙임)

# 공개 시안 갱신: main 작업 트리에 draft/ 만 넣어 커밋 · 푸시
git fetch origin main && git worktree add --detach ../mainwt origin/main
python3 tools/draft/publish.py ../mainwt
cd ../mainwt && git add draft && git commit -m "시안 갱신: draft/ (redesign-v1 <커밋>)" && git push origin HEAD:main
```

- `tools/draft/demo-mock.js`: 가짜 저장소 + 역할 전환 막대(비로그인 · 팀원 · 팀장 · 파트장 · 회장) + 도구 1 예시 데이터(어셈블리 18개, 드라이버 3명). 예시 데이터를 바꾸면 `demo-mock.js` 의 키(`__run2xdemoNN`, `run2x.mass.vN`)와 `qa/h2.js` 의 KEY 를 같이 올려야 이미 본 브라우저에도 새 데이터가 들어감.
- `publish.py` 는 브라우저 저장 키 앞에 `run2x-draft:` 를 붙여 실제 사이트 저장값과 섞이지 않게 하고, 사진은 사이트의 `img/` 를, 3D 라이브러리는 `draft/vendor/three/` 를 쓴다.
- `main` 푸시는 작업 환경의 권한 검사에서 막힐 수 있다. 그때는 관리자에게 허락을 받는다.

## 3. 관리자와 정한 작업 규칙

- 명확한 실행 지시("ㄱㄱ", "진행", "반영", "가자", "해줘" 등) 없이는 파일을 고치지 않고 논의만 한다. 답변은 한국어 존댓말, 답부터, 선택지는 표 + (권장).
- 지시받아 끝낸 작업은 묻지 않고 `redesign-v1` 에 커밋 · 푸시하고, 공개 시안(`draft/`)도 같이 갱신한다. 그 밖의 `main` 반영(배포 · 버전 올림)은 지시가 있을 때만.
- 사이트 본문에는 출처를 쓰지 않고 참고 탭에 모은다. "추측" · "확인 필요" 같은 말은 사이트 글에 쓰지 않는다. 디버깅 모드는 공개 변경 이력에 쓰지 않는다.
- PC Chrome 1440 px 이상만 지원(모바일 미지원). 애니메이션 · 부드러운 이동은 OS '움직임 줄이기' 설정과 상관없이 항상 동작.
- 비밀번호 입력 · 대신 로그인 금지. 서비스 계정 키는 저장소 · 대화에 넣지 않는다.

## 4. 도구 1 (질량 · 무게중심) 결정 사항

- 부품 질량 표: 어셈블리 하나 = 문서 하나 `teams/<팀>/mass/<id>` (docs/STORE-PLAN.md 2절). 좌표는 사이트 차량 좌표계(ISO 8855 방향, 2026-11-04 결정): 원점 = 뒤 차축 중심 · 차량 중심면 · 지면, x = 앞으로 +, y = 왼쪽 +, z = 위 + [mm]. 설계 탭 좌표계 그림 · 도구 탭 [좌표계]와 같음. 드라이버 그림 · 차 윤곽은 안에서 '앞 차축에서 뒤로' 좌표로 그리므로 그릴 때만 x_그림 = L − x.
- 카드 배치: 4열, 줄마다 왼쪽부터 빈칸 없이. 카드 위에 놓으면 그 앞에 끼우고, 줄이 넘치면 마지막 카드가 바로 아래 새 줄로. 줄 끝 빈칸 = 그 줄 끝, 줄 사이 = 새 줄. 드라이버 카드는 첫 줄 첫 칸 고정(첫 줄 3장).
- 걸침(½): 항목마다 체크(기본 해제). 체크한 항목 질량의 절반은 반대쪽으로 — 현가하 카드면 현가상, 현가상 카드면 가장 가까운(3차원) 현가하 카드의 앞 · 뒤(없으면 휠베이스 절반 기준). 저장은 항목의 `half: true`.
- 드라이버 카드 항목(몸무게 · 헬멧 · 드라이버 복 · 안전벨트)은 드라이버 모델 값과 같은 값. 드라이버 실측 CG 기능은 관리자 지시로 뺐다(2026-11-04).
- 드라이버 모델: de Leva 1996 표 4 (머리 · 목 VERT–CERV, 몸통 CERV–MIDH 무게중심 51.38 % / 49.64 %, 정강이 KJC–LMAL 44.59 % / 44.16 %, 남 / 여). 발은 발목 높이 0.039 H · 발 길이 0.152 H 비율(Winter 2009 그림 4.1, Drillis & Contini), 뒤꿈치 ~ 발목 0.22 × 발 길이는 근사.
- 헬멧 색: 1st 보라 `#6A4294` · 2nd 파랑 `#1d5f9a` · 3rd 주황 `#c2410c`.
- 작업창 [도움말]: `WB_TOOLS[번호].tour` 에 단계를 두면 생김. 표 탭이 바뀌는 단계는 `click`, 작업창 안쪽 스크롤은 `inner` 로 부드럽게.

## 5. 남은 일

| 누가 | 일 |
|---|---|
| 관리자 | 규칙 플레이그라운드 시험 8번(기대값 허용으로 바뀜) · 12~15번 → 통과하면 게시 (docs/RULES-TEST.md) |
| Claude (지시 필요) | `main` 배포: 변경 이력(`js/data/refs.js`) 추가 · 버전 올림 · `#verline` |
| Claude (지시 필요) | 다음 도구(TOOLS-PLAN.md 순서) |
| 확인 못 함 | Winter 그림 4.1 비율(0.039 H, 0.152 H)은 원문을 열람하지 못했다. 원문 확인 전까지 근사값으로 다룬다 |

## 6. 주의

- `firestore.rules` 의 `mass` · `drivers` 는 팀원 쓰기로 바뀌었는데 아직 게시 전(시험 12~15 대기). `main` 에 올리면 GitHub Action 이 규칙을 자동 게시하므로, 시험 통과 전에는 `firestore.rules` 를 `main` 에 올리지 않는다.
- 논문 결과 · 학위논문 폴더 등 관리자 PC 의 다른 폴더는 이 저장소와 무관하며 수정 금지.
