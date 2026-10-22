/* ============================================================
   사이트 설정 — 다른 팀이 이 사이트를 쓸 때는 이 파일만 바꾸면 됩니다.
   ============================================================ */
window.RUN2X_CONFIG = {
  /* 공유 저장소(Firebase) 설정. Firebase 콘솔 > 프로젝트 설정 > 내 앱 > SDK 설정의 firebaseConfig 값을 그대로 붙여 넣습니다.
     null이면 공유 저장소 없이 읽기 전용("연결 안 됨")으로 동작합니다. */
  firebase: {
    apiKey: "AIzaSyDWQSx8mULtqTpaQmc3HkKdmOSxlYgcwdU",
    authDomain: "run2x-guide.firebaseapp.com",
    projectId: "run2x-guide",
    storageBucket: "run2x-guide.firebasestorage.app",
    messagingSenderId: "33027610895",
    appId: "1:33027610895:web:c3895e91cd0bb8d5cc867a"
  },
  /* 개발자(플랫폼 수정·디버깅 권한) 구글 계정 이메일. firestore.rules의 isDev()에도 같은 값을 넣습니다. */
  developers: ['disguv1709@gmail.com'],
  /* 공개 주소 (링크 복사가 웹 주소를 알 수 없을 때 — 아티팩트·파일로 열었을 때 — 씀). 자기 팀 버전이면 자기 주소로 */
  siteUrl: 'https://koreanhanjiyun.github.io/run2x-guide/',
  /* Firebase SDK 버전 (compat) */
  firebaseSdk: '10.14.1'
};
