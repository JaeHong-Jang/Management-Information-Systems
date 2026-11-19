# 윤슬 HQ 구현 계획 (기술 원본)

이 문서는 구현의 단일 원본이다. 타입은 `shared/contracts.ts`가 원본이고, 이 문서는 그 타입을 쓰는 방법을 정한다. 기획 서술은 `docs/기획구상안.md`(GPT 작성)에 있다.

## 1. 한 줄 정의

**(v3)** 가맹점 서비스 편차의 뿌리는 매장마다 '겪어 본 사람만 아는 대처법'이 사람 머릿속에만 있다는 것이다. 알바가 바뀌면 새로 온 사람은 처음부터 다시 배우고, 갑자기 터진 상황에서 막힌다. 윤슬은 직원이 막힌 순간에 우리 매장 대처 카드로 바로 답하고, 답이 없으면 선배·점장에게 넘겨 그 답을 카드로 남기고, 새 알바가 첫 근무 전에 이 매장에서 실제로 자주 터진 상황부터 읽게 한다. 전국 리뷰는 '어떤 상황이 실제로 손님 불만이 됐는지'를 알려 주는 근거로 쓰여 카드의 우선순위를 정한다. 본사 화면은 그 근거와 매장 간 카드 공유를 보는 보조 화면이다. 개편 브리프는 `docs/PIVOT.md`.

(v2까지의 정의) 역전할머니맥주 본사가 전국 가맹점 리뷰에서 서비스 편차가 큰 매장을 찾고, 원인을 리뷰 근거로 진단하고, 지식으로 풀 수 있는 원인은 매장 사례 카드와 근무 전 브리핑으로 내려보내는 서비스다. 매장에서 쌓인 노하우와 점장 답은 다시 근거가 되고, 여러 매장에 공통인 것은 본사 표준 개정 제안으로 올라간다. v3에서도 이 기능은 남지만 본사 보조 화면으로 내려간다.

- 브랜드는 실명(역전할머니맥주)이다. 매장은 모두 익명이다. 시연 타깃은 **강남 윤슬점**이다(실제 리뷰 데이터는 서울 강남구의 한 매장 것이지만, 화면·시드·문서 어디에도 실제 매장명과 주소를 쓰지 않는다).
- 본사 표준은 가상이다(`HqStandard.virtual = true`). 실제 역전할머니맥주 본사 규정이라고 쓰지 않는다.
- 처방 이후의 리뷰는 가상 시나리오다(`Review.virtual = true`). 화면에 '가상' 표지를 붙인다.

## 2. 사용자와 화면

| 사용자 | 기기 | 하는 일 |
|---|---|---|
| 본사 SV(슈퍼바이저) | PC | 전국 매장 편차 보기 → 매장 진단 → 처방 발송 → 효과 확인, 본사 표준·개정 제안 관리 |
| 점장(강남 윤슬점) | PC/태블릿 | 우리 매장 진단과 받은 처방 확인, 처방 카드 승인, 직원 질문 답하기, 사례 기록 검토 |
| 알바(강남 윤슬점) | 휴대폰 | 근무 전 브리핑 확인, 상황 질문 → 근거 카드 답, 사례 기록 |

### 화면 목록(라우트)

> v3 우선순위: 직원 → 점장 → 본사 순이다. 첫 화면은 직원 홈(`/store/:id/staff`)이고, 역할 전환 순서도 직원 / 점장 / 본사 SV다. 직원·점장 화면의 v3 구성은 `docs/PIVOT.md` §3이 이 절보다 우선한다.

본사 SV (`/hq`)
- `/hq` 전국 현황: KPI 6개, 위험 순위 표, 평점 분포(카카오·네이버), 매장 × 불만 유형 히트맵, 지역별 요약
- `/hq/stores/:id` 매장 상세: 점수 구성(R1~R5, 근거 문장), 월별 추이, 원인 진단(원인 4분류, 리뷰 인용), 본사 표준과 다른 운영(RuleDrift), 처방 목록과 발송, 효과(처방 전·후), 비교 매장
- `/hq/reviews` 리뷰 탐색: 매장·플랫폼·별점·불만 유형 필터, 원문
- `/hq/standards` 본사 표준(가상)과 개정 제안 승인
- `/hq/agents` 에이전트 팀과 실행 기록(실시간)

점장 (`/store/:id/manager`)
- 우리 매장 진단 요약과 받은 처방, 승인 대기 카드, 점장에게 넘어온 질문, 위키 점검 할 일

알바 (`/store/:id/staff`, 모바일 우선)
- 오늘의 브리핑(손님께 미리 알릴 것), 질문하기(답 + 근거 카드 + 점장 호출), 기록하기(회고 인터뷰)

공통
- `/store/:id/wiki` 매장 위키(카드·토픽), `/graph` 지식 그래프(매장 → 불만 → 원인 → 처방 → 카드)
- 화면 위에 역할 전환(본사 SV / 점장 / 알바)과 AI 모드 표시(Claude / Ollama / 규칙)

## 3. 편차 점수 (규칙, 공개 배점, 0~100 위험 점수)

순위 대상: 카카오 별점 10개 이상이고 `excluded`가 없는 매장. 나머지는 `rank = null`, 점수는 계산하되 '표본 부족' 표지.

| 항목 | 배점 | 계산 |
|---|---|---|
| R1 카카오 평점 | 30 | (5 − 평점) / 4 × 30 |
| R2 저평점 비율 | 20 | 카카오 2점 이하 비율 × 20 |
| R3 최근 추세 | 15 | 2025-01-01 이후 평균이 전체 평균보다 낮은 만큼: min(15, (전체 − 최근) × 15). 최근 리뷰 3건 미만이면 '미확인' 0 |
| R4 네이버 교차 | 15 | 네이버 첫 페이지 별점 5건 이상일 때 (5 − 평균) / 4 × 15. 미매칭·표본 부족이면 '미확인' 0 |
| R5 지식 공백 비중 | 20 | 저평점 리뷰 불만 중 원인이 '지식 공백'인 비중 × 20 |

`trend`: 최근 평균이 전체보다 0.3 이상 낮으면 worse, 0.3 이상 높으면 better, 그 사이 flat, 최근 3건 미만이면 unknown. 위험 60 이상을 '고위험'으로 센다.

## 4. 불만 유형 → 원인 분류 (규칙 기본값, LLM이 인용과 함께 다듬는다)

| 불만 유형 | 기본 원인 | 다르게 볼 때 |
|---|---|---|
| 규칙 미고지·말바꿈 | 지식 공백 | — |
| 이용시간제한 | 지식 공백 (고지 실패) | 본사 표준과 다른 제한(웨이팅 없어도 퇴장 등)이 리뷰에 보이면 매장 자체 규칙 + RuleDrift |
| 좌석·인원 | 지식 공백 | 소인원 손님 거절이 반복되면 매장 자체 규칙 + RuleDrift |
| 최소주문 | 매장 자체 규칙 (본사 표준 H03: 최소주문 없음) | — |
| 품절·대체 | 지식 공백 | — |
| 결제·계산 | 지식 공백 | — |
| 신분증 | 지식 공백 | — |
| 직원 태도 | 운영·인력 | 같은 리뷰에 규칙 관련 유형이 함께 있으면 지식 공백 |
| 대기·서빙지연 | 운영·인력 | — |
| 위생 | 위생·품질 | — |
| 맛·품질 | 위생·품질 | — |
| 다른 지점 비교 | 원인 아님(브랜드 일관성 신호). Finding을 만들지 않고 점수 보조 지표로만 쓴다 | — |

리뷰 불만 유형 태깅은 `data/source/README.md`의 정규식(12종)을 기본으로 하고, LLM이 켜져 있으면 저평점 리뷰만 다시 분류한다(근거 문장 필수, 실패하면 규칙 결과 유지).

## 5. 처방 규칙

| 원인 | 처방 | 받는 곳 |
|---|---|---|
| 지식 공백 | 사례 카드(점장 승인 후 위키) + 근무 전 브리핑 항목 | 매장 |
| 매장 자체 규칙 | SV 방문 과제(본사 표준 확인) + RuleDrift 기록 | SV |
| 운영·인력 | SV 방문 과제(피크 인력·응대 점검 체크리스트) | SV |
| 위생·품질 | SV 방문 과제(QSC 점검) | SV |
| 같은 불만이 위험 상위 20개 매장 중 5곳 이상에서 반복 | 표준 개정 제안 | 본사 |

## 6. 하네스 (제품 안의 에이전트 팀)

`harness/harness.config.json`에 선언하고, 카드는 `harness/agents/<team>/<id>.md`(GPT 작성).

| 팀 | 에이전트 id | 이름 | LLM |
|---|---|---|---|
| lead | orchestrator | 오케스트레이터 | 규칙 |
| monitor (관측팀) | review-collector | 리뷰 수집원 | 규칙 |
| monitor | complaint-tagger | 불만 분류원 | LLM(규칙 대체) |
| monitor | variance-scorer | 편차 채점원 | 규칙 |
| diagnose (진단팀) | cause-analyst | 원인 분석가 | LLM(규칙 대체) |
| diagnose | drift-detector | 표준 차이 탐지원 | 규칙 |
| prescribe (처방팀) | playbook-writer | 처방 카드 작성자 | LLM(규칙 대체) |
| prescribe | sv-planner | SV 과제 설계자 | 규칙 |
| prescribe | briefing-writer | 브리핑 작성자 | LLM(규칙 대체) |
| capture (수집팀) | privacy-guard | 개인정보·익명화 가드 | 규칙 |
| capture | interviewer | 회고 인터뷰어 | LLM |
| capture | card-writer | 사례 카드 편집자 | LLM |
| answer (답변팀) | librarian | 검색 사서 | 규칙 |
| answer | coach | 현장 코치 | LLM |
| answer | escalator | 점장 연결 | 규칙 |
| verify (검증팀) | quote-checker | 리뷰 인용 검증 | 규칙 |
| verify | citation-checker | 카드 인용 검증 | 규칙 |
| verify | policy-checker | 표준 우선 검증 | 규칙 |
| verify | wording-guard | 표현 검증 | 규칙 |
| keeper (위키 관리팀) | synthesizer | 종합 편집자 | LLM |
| keeper | linter | 위키 점검관 | LLM+규칙 |
| keeper | promoter | 표준 승격 제안자 | 규칙 |

흐름(steps 순서)
- ingest: review-collector → privacy-guard → complaint-tagger → variance-scorer
- diagnose: cause-analyst → drift-detector → quote-checker → wording-guard
- prescribe: playbook-writer → sv-planner → briefing-writer → citation-checker → wording-guard
- promote: promoter → wording-guard
- ask: librarian → coach → citation-checker → policy-checker → wording-guard → escalator
- record: privacy-guard → interviewer → card-writer → wording-guard
- approve / resolve / lint / briefing: 기존 윤슬과 같은 방식

게이트: diagnose-gate(quote-checker: 인용한 reviewId가 실제로 그 매장 리뷰이고 문장이 원문에 있어야 통과, 아니면 그 Finding의 인용 삭제·인용 0이면 Finding 보류), answer-gate, card-gate.

## 7. API (백엔드 포트 8788, 프론트 5176, Vite가 /api를 프록시)

| 메서드 | 경로 | 응답 |
|---|---|---|
| GET | /api/hq/overview | HqOverview (v3: `situations` 추가, 전국에서 자주 터지는 상황) |
| GET | /api/hq/stores/:id | StoreDetail |
| GET | /api/hq/reviews?storeId&platform&type&maxStar&q&offset&limit | ReviewPage |
| POST | /api/hq/stores/:id/diagnose | RunAccepted (끝나면 Diagnosis 저장) |
| POST | /api/hq/stores/:id/prescribe | RunAccepted (Prescription[] 초안) |
| POST | /api/hq/prescriptions/:id/send · /done · /reject | Prescription |
| GET | /api/hq/standards | { standards: HqStandard[]; proposals: StandardProposal[]; drifts: RuleDrift[] } |
| POST | /api/hq/promote | RunAccepted (개정 제안 생성) |
| POST | /api/hq/proposals/:id/approve · /reject | StandardProposal |
| POST | /api/hq/drifts/:id/accept · /fix | RuleDrift |
| POST | /api/hq/simulate/:storeId | Outcome (가상 처방 이후 리뷰를 넣고 효과 계산) |
| GET | /api/stores/:id/state | StoreState (v3: `situations`, `onboarding` 추가 · v3.1: `now` 추가) |
| POST | /api/stores/:id/onboarding/read | body `{ personId, cardId }` → Onboarding (읽음 표시, 중복은 한 번만. 매장 사람이 아니거나 목록에 없는 카드면 400) |
| GET | /api/stores/:id/briefing | Briefing |
| POST | /api/stores/:id/ask | AskResult. body `{ text, askerId, situationId? }` (v3.1: situationId가 있으면 검색 없이 그 상황 카드로 답하고 text는 생략 가능, 없는 상황이면 400. 넘김이면 `nearCardId`) |
| POST | /api/stores/:id/questions/:qid/feedback · /resolve | Question |
| POST | /api/stores/:id/record/interview | InterviewDraft |
| POST | /api/stores/:id/cards | Card |
| POST | /api/stores/:id/cards/:cid/approve · /reject · /archive | Card |
| POST | /api/stores/:id/cards/:cid/edit | Card. body `{ edits, editorId }` (v3.1: 그 매장 점장이 고치면 승인 유지, 아니면 승인 대기. 본사 카드 403) |
| GET | /api/stores/:id/lint | LintIssue[] |
| GET | /api/graph?storeId | Graph |
| GET | /api/harness | HarnessConfig |
| GET | /api/runs/:id | RunTrace |
| GET | /api/stream?storeId | SSE RunEvent (storeId가 있으면 그 매장 + 본사 이벤트만) |
| POST | /api/reset | 시드로 초기화 |

## 8. 데이터

- 원자료: `data/source/*.csv` (실명 포함, 커밋 대상 아님 — 시드 생성 입력으로만 쓴다)
- 시드: `data/seed/` (`scripts/build_seed.py`가 생성. 실명·실제 주소·실제 place id 0건이어야 한다)
  - `brand.json` Brand
  - `stores.json` Store[] (역전할머니맥주 매장 전부, 분석 제외 매장은 excluded 사유 포함)
  - `reviews.json` Review[] (카카오 전량 + 네이버 첫 페이지, 익명화된 본문)
  - `standards.json` HqStandard[] (가상 본사 표준 8개 안팎: 이용시간 고지, 좌석 배정, 최소주문 없음, 품절 대체 안내, 중간결제 확인, 신분증 종류, 이물 대응, 서비스 응대)
  - `knowledge.json` { people: Person[]; cards: Card[]; questions: Question[]; topicSummaries } — 강남 윤슬점 직원(가상)과 카드. 본사 표준 카드(scope=brand)와 매장 카드(scope=store). 기존 포차 달빛 카드 중 주점에 맞는 것은 강남 윤슬점용으로 고쳐 쓴다
  - `virtual_after.json` Review[] (강남 윤슬점 처방 이후 4주 가상 리뷰, virtual=true)
- 익명화 규칙: 매장명은 `{시군구 약칭} {A,B,C…}점`(같은 시군구 안에서 알파벳). 리뷰 본문 속 다른 매장·지점명은 '○○점', 사람 이름·닉네임은 '○○○', 직원 인상착의(머리 길이·안경·체형·성별+외모)는 '[직원]'으로 바꾼다.
- 저장소: 기존처럼 JSON 한 파일(`backend/var/store.json`)에 시드를 불러와 쓰되, 모든 지식 엔티티에 storeId를 둔다.

## 9. 폴더

```
yunseul-hq/
  CLAUDE.md            작업 규칙
  docs/PLAN.md         이 문서(기술 원본)
  docs/기획구상안.md     기획 서술 원본(GPT)
  docs/진단_체계.md      점수·원인·처방 규칙 설명(GPT)
  docs/DESIGN.md       디자인 시스템(프론트)
  shared/contracts.ts  공통 타입
  harness/             에이전트 선언·카드·정책
  backend/             Express 5 + TS (기존 윤슬 백엔드에서 출발)
  frontend/            새로 만든 대시보드 (Vite + React + TS + Tailwind)
  data/source|seed     원자료 / 익명 시드
  scripts/             시드 생성
```
