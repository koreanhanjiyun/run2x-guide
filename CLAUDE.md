# 이 저장소에서 작업할 때 (Claude용)

- 사이트 원본은 이 저장소다. 여러 파일로 나뉜 정적 사이트(GitHub Pages)이며 빌드 단계가 없다. 스크립트는 `index.html` 의 `<script>` 순서대로 전역에서 실행된다 (모듈 아님). 파일 사이 순서를 바꾸지 말 것.
- 내용: `js/data/*`. 화면 동작: `js/app/*`. 그림: `js/figures/*`. 저장소: `js/store/backend.js` (Firebase/Claude/없음).
- 변경 이력: 사이트에는 설계 내용 변경·정정만 (`js/data/refs.js` 의 변경 이력 항목). 화면·기능 변경은 커밋 메시지로만. 디버깅 모드는 공개 이력에 쓰지 않는다.
- 하단 버전·갱신일: `index.html` 의 `#verline`.
- 커밋 전에 항상 `python3 tools/stamp.py` 실행 (css·js 주소에 ?v= 꼬리표 → 방문자 캐시 무효화).
- 검증: `python3 -m http.server` 로 띄워 Playwright로 콘솔 오류 없이 로드되는지, 항목 수(details.item)·단계 수가 그대로인지 확인.
- Claude 아티팩트 게시용 한 파일: `python3 tools/build_single.py`.
- 사용자(관리자)의 작업 규칙: 명확한 실행 지시("ㄱㄱ", "진행", "반영" 등) 없이는 파일을 고치지 않고 논의만 한다. 답변은 한국어 존댓말.
