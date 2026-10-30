# 이어받기 설계

매장 하나의 예외 대응 지식을 사례 카드로 쌓는 위키와, 그 위키를 다루는 에이전트 팀. 이 문서는 코드가 실제로 하는 일만 적는다.

## 한 장 요약

```
숙련 직원 기록 ─▶ [수집팀] 개인정보 가드 → 회고 인터뷰어(왜?) → 사례 카드 편집자 → 표현 검증 ─▶ 승인 대기 카드
                                                                                            │ 점장 승인
신입 질문 ─▶ [답변팀] 검색 사서 → 현장 코치 ─▶ [검증팀] 근거 → 규정 우선 → 표현 ─▶ 점장 연결 ─┤
                                                     (answer-gate)                │ 근거 없음      ▼
                                                                                  └─▶ 점장 답 ─▶ 새 카드 (질문 → 카드: became)
[위키 관리팀] 종합 편집자(토픽 원칙 재작성) · 위키 점검관(상충·만료·중복·공백) · 훈련 코치(AI 없이 먼저 판단)
모든 실행 ─▶ 실행 버스(SSE /api/stream) ─▶ 화면: 에이전트 진행, 위키 변경 피드, 온톨로지 그래프 증분
```

## 폴더 (하네스 구조)

| 폴더 | 내용 |
|---|---|
| `harness/` | 하네스 선언. `harness.config.json`(팀 5·에이전트 13·흐름 6·게이트 2·LLM), `agents/`(에이전트 카드), `policies/forbidden-phrases.json`(금지 표현 6·개인정보 패턴 3) |
| `shared/contracts.ts` | 백엔드·프론트 공통 타입 (카드, 질문, 실행 이벤트, 그래프) |
| `backend/src/harness/` | 런타임: `config`(선언 읽기) · `runner`(흐름 실행, 이벤트 발행) · `trace`(실행 버스) · `llm`(Claude 호출 한 곳) |
| `backend/src/agents/` | 팀별 1파일: `capture` · `answer` · `verify` · `keeper` |
| `backend/src/flows/` | 흐름 6개: 질문 · 피드백 · 기록(인터뷰/저장) · 점장 승인 · 점장 답 재축적 · 점검 · 훈련 |
| `backend/src/store/` | `db`(JSON 원본 + 마크다운 위키 컴파일) · `graph`(온톨로지 그래프) |
| `backend/src/tools/` | `search`(한국어 2-gram BM25) · `policies`(금지 표현·개인정보) |
| `frontend/src/features/` | 화면 1개 = 폴더 1개: overview · ask · record · train · manager · wiki · ontology · agents · metrics · judge |
| `frontend/src/shared/` | `api/client`(API) · `api/live`(SSE 실시간 상태) · `ui`(공통 컴포넌트) · `theme/tokens`(그래프·팀·차트 색) |
| `data/` | `seed.json`(가상 데모 매장) · `wiki/`(자동 컴파일된 마크다운 위키: index · log · people · topics/) |
| `docs/` | 설계, 전략, 레퍼런스, 심사(`judge/`) |
| `.orchestra/` | 이 작품을 만든 개발팀 구성(`team.json`), 작업 지시문, 실행 로그 |

## LLM이 하는 일과 규칙이 하는 일

| LLM (Claude, `claude-opus-5-5`, 구조화 출력) | 규칙 |
|---|---|
| 회고 인터뷰어: 빠진 판단 이유·금지·호출 기준을 되묻는 질문 | 개인정보 가드: 전화번호·카드번호·고객 이름 가림 |
| 사례 카드 편집자: 기록을 카드 필드로 구조화 | 검색 사서: 조사 제거 후 2-gram BM25 |
| 현장 코치: 찾은 카드만 근거로 답 | 근거 검증: 없는 카드·검색되지 않은 카드 인용 차단, 근거 없는 줄 삭제 |
| 종합 편집자: 토픽 판단 원칙 3~5개 | 규정 우선 검증: 공식규정·현장노하우가 섞이면 규정 우선 안내 |
| 위키 점검관: 의미상 상충 찾기 | 표현 검증: 금지 표현 6종 |
| 훈련 코치: 신입 답 채점 | 점장 연결: 근거 없음·게이트 실패·호출 기준 해당 |
|  | 점검관의 만료·효과 낮음·중복·빈 토픽·승인 대기 |

LLM이 쓴 답은 같은 실행 안에서 규칙(검증팀)이 다시 확인한다. API 키가 없거나 호출이 실패하면 각 LLM 에이전트는 같은 모양의 결과를 규칙으로 만든다. 화면 상단과 실행 기록에 `규칙 모드` 또는 `rules(LLM 실패 대체)`로 표시한다. 그래서 키 없이도 전체 흐름이 돈다.

## 지식 모델

- 사례 카드: 상황 · **판단 이유** · 대응 · 하면 안 되는 것 · 점장 호출 기준 · 출처(공식규정/현장노하우) · 상태(승인 대기/승인/반려/보관) · 만료일 · 재사용·도움·안 됨 횟수 · 출처 질문.
- 수명: 기록 → 승인 대기 → 점장 승인 → 사용(재사용·피드백) → 점검(만료·효과 낮음·상충) → 갱신 또는 보관. KCS의 지식 상태 흐름과 Karpathy LLM Wiki의 ingest · query · lint 세 동작을 따른다.
- 그래프 노드: 토픽 · 사례 카드 · 사람 · 질문 · 출처. 관계: 속함 · 남김 · 물음 · 근거로 씀 · 점장 답 → 카드 · 출처 · 상충 · 중복.
- 마크다운 위키(`data/wiki/`)는 바뀔 때마다 다시 컴파일된다. 사람도, 다른 LLM도 그대로 읽을 수 있다.

## 실시간

`Run`이 에이전트를 부를 때마다 `run-start · agent-start · agent-end · gate · wiki · run-end` 이벤트를 버스로 보낸다. `/api/stream`(SSE)은 새로 붙은 화면에 최근 300개를 재생한 뒤 이어서 보낸다. 프론트 `LiveProvider`는 `wiki` 이벤트의 노드·관계를 그래프에 바로 합치고(새 노드는 이웃 옆에서 나타나 자리 잡음), 실행이 끝나면 스냅숏을 다시 받는다. `매장의 하루 재생`(`/api/demo/play`)은 실제 흐름 8개를 차례로 돌린다.

## API

| 메서드 | 경로 | 하는 일 |
|---|---|---|
| GET | `/api/state` · `/api/graph` · `/api/harness` · `/api/metrics` · `/api/judge` | 조회 |
| GET | `/api/stream` | 실행 이벤트 SSE |
| POST | `/api/ask` | 신입 질문 흐름 |
| POST | `/api/questions/:id/feedback` · `/api/questions/:id/resolve` | 해결 여부 · 점장 답 재축적 |
| POST | `/api/record/interview` · `/api/cards` | 회고 인터뷰 · 카드 저장 |
| POST | `/api/cards/:id/(approve|reject|renew|archive)` | 점장 처리 |
| GET | `/api/lint` · `/api/training` · POST `/api/training/grade` | 점검 · 훈련 |
| POST | `/api/demo/play` · `/api/reset` | 시연 |

## 검증

- `backend`: `npm test` (vitest, 규칙 모드) — 검색 정답 5건, 검증팀 5건, 흐름 4건(질문 에이전트 순서, 에스컬레이션→재축적→재질문, 회고 인터뷰, 점검 상충·만료·중복).
- `frontend`: `npm run build` 통과, Playwright로 10개 화면 캡처(1440px) 콘솔 오류·가로 넘침 0, 하루 재생 중 화면 4회 캡처로 실시간 반영 확인.

## 한계

- 데모 매장과 사례는 가상이다. 실제 매장 효과는 측정하지 않았다.
- 한국어 검색은 형태소 분석 없이 2-gram이라 동의어(예: 포스/POS)는 일부만 잡는다.
- 규칙 모드의 회고 인터뷰·카드 구조화는 문장 단위 휴리스틱이라 LLM 모드보다 거칠다.
- 사람 계정·권한은 없다. 화면 위 `지금 사용하는 사람`으로 역할을 바꿔 시연한다.
