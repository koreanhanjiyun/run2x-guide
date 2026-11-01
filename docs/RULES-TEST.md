# 팀 설계값 규칙 시험 (Firebase 규칙 플레이그라운드)

대상: `firestore.rules` 에 새로 넣은 `dv` · `dtab` · `mass` · `drivers` 규칙 (docs/STORE-PLAN.md 3절)
누가: 회장(Firebase 콘솔에 들어갈 수 있는 계정)

## 결과 기록

| 날짜 | 규칙 | 결과 | 비고 |
|---|---|---|---|
| 2026-11-02 | redesign-v1 의 `firestore.rules` (main 대비 28줄 추가, 삭제·변경 0줄) | 11/11 통과 | 시험 뒤 콘솔에서 게시 |

규칙을 다시 고치면 아래 절차로 다시 시험하고 이 표에 한 줄 더한다.

## 원리

플레이그라운드는 실제 데이터를 바꾸지 않는다. 다만 규칙 안의 `get()` · `exists()`(팀원인지, 역할 · 담당 파트, 이번 시즌)는 **실제 데이터베이스**를 읽어서 판정한다. 그래서 시험용 팀을 콘솔에서 직접 만들어 두고 시험한다. 콘솔에서 넣는 데이터는 보안 규칙을 거치지 않는다.

플레이그라운드는 구글 계정이 실제로 있는지 보지 않고 `members` 에 그 UID 문서가 있는지만 본다. 그래서 사람 UID는 가짜 문자열(`sus1` 등)로 충분하다.

## 1. 시험 팀 만들기 (Firestore Database → 데이터 탭)

| # | 위치 | 문서 ID | 필드 (이름 · 유형 · 값) |
|---|---|---|---|
| 1 | `teams` 칸 → **+ 문서 추가** | `ruletest` | `name` · string · `규칙시험팀` |
| 2 | `ruletest` 선택 → **+ 컬렉션 시작** `meta` | `season` | `season` · int64 · `2026` |
| 3 | `ruletest` 선택 → **+ 컬렉션 시작** `members` | `admin1` | `role` · string · `admin` |
| 4 | `members` → **+ 문서 추가** | `sus1` | `role` · string · `lead`, `parts` · array · [string `서스`] |
| 5 | 〃 | `chassis1` | `role` · string · `head`, `parts` · array · [string `샤시`] |
| 6 | 〃 | `frame1` | `role` · string · `lead`, `parts` · array · [string `프레임`] |
| 7 | 〃 | `member1` | `role` · string · `member` |

- 문서 ID는 직접 적는다([자동 ID] 쓰지 않음).
- `meta` · `members` 는 반드시 `ruletest` 를 선택한 상태에서 오른쪽 칸의 [컬렉션 시작]으로 만든다(맨 왼쪽 칸에서 만들면 최상위 컬렉션이 됨).
- 콘솔에는 number 유형이 없다. 정수는 int64(규칙의 `is number` 는 int64 · double 모두 받음).
- `teamNames` · `joinKeys` 에 등록하지 않으므로 사이트에서 이 팀을 찾거나 가입할 수 없다.

## 2. 플레이그라운드 열기 (Firestore Database → 규칙 탭)

1. 편집기의 규칙 전체를 새 `firestore.rules` 로 바꿔 붙여 넣는다. **시험이 끝날 때까지 [게시]는 누르지 않는다.**
2. **규칙 플레이그라운드**를 연다.
3. 칸 채우기
   - **시뮬레이션 유형**: `create` 또는 `get`
   - **위치**: 아래 표의 경로 (앞의 `/databases/(default)/documents` 는 이미 적혀 있음)
   - **데이터 → [빌드 문서]** (`create` 일 때만 보임): 아래 표의 데이터
   - **인증됨**: 켬 · **제공업체**: `google.com` · **Firebase UID**: 아래 표의 UID (이메일 · 이름 · 전화는 비워 둠)
4. **[실행]** → 허용 / 거부를 표와 비교.

## 3. 시험표

데이터 D1 (빌드 문서): `s` map → `2026` map → `v` int64 `1600`, `st` string `rev`
데이터 D2 (빌드 문서): `s` map → `2026` map → `label` string `1st`

| # | 유형 | 위치 | UID | 데이터 | 기대 | 2026-11-02 |
|---|---|---|---|---|---|---|
| 1 | create | `teams/ruletest/dv/sus__kw_f` | `sus1` | D1 | 허용 | 허용 |
| 2 | create | `teams/ruletest/dv/aero__cla` | `sus1` | D1 | 거부 | 거부 |
| 3 | create | `teams/ruletest/dv/aero__cla` | `chassis1` | D1 | 허용 | 허용 |
| 4 | create | `teams/ruletest/dv/sus__kw_f` | `sus1` | D1에서 `2026` → `2025` | 거부 | 거부 |
| 5 | create | `teams/ruletest/dv/sus__kw_f` | `admin1` | D1에서 `v` 유형 string | 거부 | 거부 |
| 6 | create | `teams/ruletest/dv/sus__kw_f` | `admin1` | D1 | 허용 | 허용 |
| 7 | create | `teams/ruletest/drivers/d1` | `frame1` | D2 | 허용 | 허용 |
| 8 | create | `teams/ruletest/drivers/d1` | `sus1` | D2 | 거부 | 거부 |
| 9 | create | `teams/ruletest/dv/sus__kw_f` | `member1` | D1 | 거부 | 거부 |
| 10 | get | `teams/ruletest/dv/sus__kw_f` | `nobody123` | — | 거부 | 거부 |
| 11 | get | `teams/ruletest/dv/sus__kw_f` | `member1` | — | 허용 | 허용 |

무엇을 보는 시험인지

| # | 확인하는 규칙 |
|---|---|
| 1 · 2 | 파트장은 문서 id 앞부분(파트 코드)이 담당 파트일 때만 씀 (`partOfCode` · `codeOf`) |
| 3 | 팀장은 담당 묶음(샤시)의 모든 파트를 씀 (`grpOf`) |
| 4 | 이번 시즌 칸만 씀 (`onlyCurKey`) |
| 5 | 값은 숫자 또는 비움 (`validDvEntry`), 회장이라도 형식 검사는 받음 |
| 6 | 회장은 모든 파트 |
| 7 · 8 | 드라이버는 프레임 담당만 |
| 9 | 일반 팀원은 쓰지 못함 |
| 10 · 11 | 읽기는 팀원만 |

## 4. 끝난 뒤

1. 모두 기대와 같으면 이 자리에서 [게시]해도 된다. 새 규칙이 새 컬렉션 규칙만 더하는 경우에는 지금 사이트에 영향이 없다. 게시하지 않으면 편집기 변경을 취소하고 나간다(`main` 반영 때 GitHub Action이 자동 게시).
2. 다르면 몇 번이 어떻게 나왔는지 Claude에게 알려 준다(규칙을 고침). 거부일 때는 편집기에 막힌 줄이 표시된다.
3. **`teams/ruletest` 삭제** (데이터 탭 → `ruletest` 의 ⋮ → 문서 삭제, 하위 컬렉션까지 삭제 선택).
4. 위 "결과 기록" 표에 한 줄 더한다.
