# Run2X 설계 가이드

Formula Student(전기차) 팀을 위한 차량 설계 단계·항목 가이드입니다. 설계 단계(P0–P10)마다 무엇을 정하고, 무엇을 받아 무엇을 넘기는지, 근거 수식·그림·계산기와 함께 정리했습니다.

- 원작: **Run2X 19 한지윤**
- 라이선스: [CC BY-NC 4.0](LICENSE) — 다른 팀도 출처를 밝히면 비영리로 쓰고 고칠 수 있습니다.
- 권장 환경: PC 크롬, 화면 너비 1440 px 이상

## 구조

| 경로 | 내용 |
|---|---|
| `index.html` | 화면 틀 |
| `css/` | 스타일 (`base.css` 초기화, `style.css` 본 스타일) |
| `js/config.js` | **팀별 설정** (공유 저장소 Firebase, 개발자 이메일) |
| `js/store/backend.js` | 공유 저장소 어댑터 (Firebase / Claude 아티팩트 / 없음) |
| `js/data/` | **내용**: 단계·항목(`items.js`), 항목별 활동(`act.js`), 상세 카드(`cards.js`), 부품(`parts.js`), 참고·변경 이력(`refs.js`) |
| `js/figures/` | 그림·3D·애니메이션 |
| `js/app/` | 화면 동작 |
| `firestore.rules` | 공유 저장소 보안 규칙 |
| `tools/build_single.py` | 한 파일(html)로 합치기 |
| `docs/` | 관리 문서 |

내용을 고칠 때는 대부분 `js/data/` 만 보면 됩니다.

## 문서
- [다른 팀이 쓰는 법](docs/OTHER-TEAMS.md)
- 관리자 문서: [docs/ADMIN.md](docs/ADMIN.md)

## 면책
이 가이드는 대회 공식 규정 해석이 아닙니다. 설계 전 최신 규정을 확인하십시오. 계산 예시에는 설명용 가정값이 포함됩니다.
