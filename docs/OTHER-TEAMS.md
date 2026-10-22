# 다른 팀이 이 가이드를 쓰는 법

라이선스(CC BY-NC 4.0)에 따라 출처("Run2X 19 한지윤", 원본 저장소 링크)를 밝히고, 고쳤다면 고쳤다고 표시하면 비영리로 자유롭게 쓸 수 있습니다.

## 1. 내 저장소로 복제
1. 이 저장소 오른쪽 위 **Fork** → 내 계정(또는 팀 계정)으로 복제합니다.
2. 복제한 저장소의 **Settings → Pages → Branch: main / (root)** 로 공개합니다.

## 2. 우리 팀 공유 저장소 만들기 (진행 상태·팀 값·질문용)
**반드시 우리 팀의 Firebase를 새로 만드십시오.** 원본 설정을 그대로 두면 원본 팀 저장소에 붙으려 하고, 원본 팀의 보안 규칙에 막혀 동작하지 않습니다.

1. https://console.firebase.google.com 에서 팀 구글 계정으로 프로젝트를 만듭니다.
2. **Firestore Database** 만들기 (프로덕션 모드, 지역 asia-northeast3 서울 권장).
3. **Authentication → 로그인 방법**에서 **Google**과 **익명** 사용 설정.
4. Authentication → 설정 → **승인된 도메인**에 `내아이디.github.io` 추가.
5. 프로젝트 설정 → 내 앱 → 웹 앱 추가 → 나오는 `firebaseConfig` 값을 `js/config.js` 의 `firebase:` 에 붙여 넣습니다.
6. `js/config.js` 의 `developers` 와 `firestore.rules` 의 `isDev()` 에 우리 팀 개발자 이메일을 넣습니다.
7. Firestore → 규칙 에 `firestore.rules` 내용을 붙여 넣고 게시합니다.
8. Firestore 콘솔에서 `meta/roles` 문서를 만들고 `admins` 필드(배열)에 관리자 이메일을 넣습니다. (사이트 관리 창에서 입력하는 기능은 준비 중)

우리 팀 데이터는 우리 팀 Firebase에만 저장되므로 다른 팀과 섞이지 않습니다.

## 3. 내용 고치기
- 단계·항목: `js/data/items.js`, 항목별 할 일: `js/data/act.js`, 상세 카드: `js/data/cards.js`
- 사이트 하단·변경 이력의 원작자 표기는 지우지 마십시오 (라이선스 조건).
