# 이 저장소에서 작업할 때 (Claude용)

- 사이트 원본은 이 저장소다. 여러 파일로 나뉜 정적 사이트(GitHub Pages)이며 빌드 단계가 없다. 스크립트는 `index.html` 의 `<script>` 순서대로 전역에서 실행된다 (모듈 아님). 파일 사이 순서를 바꾸지 말 것.
- 내용: `js/data/*`. 화면 동작: `js/app/*`. 그림: `js/figures/*`. 저장소: `js/store/backend.js` (Firebase/Claude/없음).
- 파트 묶음: 모든 파트(공통 제외)는 샤시·전기 중 하나에 속한다. 파트를 추가·변경하면 `js/app/status-shared.js` 의 `PGROUP` 과 `firestore.rules` 의 `grpOf` 를 같이 고칠 것 (한쪽만 고치면 팀장 저장 때 권한 오류).
- 변경 이력 (`js/data/refs.js`): 모든 버전을 적는다 (Keep a Changelog). 설계 내용 변경·정정은 자세히(정정은 `cl-fix`), 화면·기능만 바뀐 버전은 `sec-label cl-ui` + "화면·기능" 표시로 짧게 한두 줄. 자세한 화면·기능 변경은 커밋 메시지에. 업데이트 알림은 cl-ui가 아닌 버전에만 뜬다.
- 하단 버전·갱신일: `index.html` 의 `#verline`.
- 커밋 전에 항상 `python3 tools/stamp.py` 실행 (css·js 주소에 ?v= 꼬리표 → 방문자 캐시 무효화).
- 계산 도구의 검증표(`WB_TOOLS[번호].verify`): 새 물리 항이나 식을 넣으면, 그 항이 0이 아닌 해석해(손계산) 경우를 검증표에 같이 추가한다. 기존 경우만 통과해서는 새 항이 맞는지 알 수 없다 (관리자 결정 2026-11-05).
- 검증: `python3 -m http.server` 로 띄워 Playwright로 콘솔 오류 없이 로드되는지, 항목 수(details.item)·단계 수가 그대로인지 확인.
- Claude 아티팩트 게시용 한 파일: `python3 tools/build_single.py`.
- 사용자(관리자)의 작업 규칙: 명확한 실행 지시("ㄱㄱ", "진행", "반영" 등) 없이는 파일을 고치지 않고 논의만 한다. 답변은 한국어 존댓말.
- 이어서 작업할 때: 먼저 `docs/HANDOFF.md` (현재 상태 · 시안 빌드와 검사 · 결정 사항 · 남은 일)를 읽는다.
- 커밋 범위(2026-11-04 결정): 지시받아 끝낸 작업은 묻지 않고 `redesign-v1` 에 커밋 · 푸시하고, 공개 시안 `main` 의 `draft/` 도 같이 갱신한다(`tools/draft/build.py` → `tools/draft/publish.py`). 그 밖의 `main` 반영(배포 · 버전 올림)은 지시가 있을 때만.
- 시안 확인 주소: https://koreanhanjiyun.github.io/run2x-guide/draft/ (더미 팀 · 가짜 저장소, 실제 Firebase 연결 안 함). 역할별 화면 시험은 시안의 '시안' 버블에서 (디버깅 모드는 2026-11-13 없앰).
- 더미 팀: `tools/dummy/gen.js` (만드는 규칙) → `node tools/dummy/make.js` (build.py 뒤에) → `tools/dummy/run2x-dummy-team.json`. 시안 가짜 저장소 기본 데이터이자 실제 팀 [가져오기]용 시험 파일. 항목 · 대시보드 키 · 도구 예제가 바뀌면 다시 만든다.
- 대시보드는 보기 전용: 값은 도구 [대시보드에 반영]으로만 바뀐다. 도구 쪽 되돌리기는 공통 [대시보드 값으로 초기화].
