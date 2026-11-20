---
title: "이어받기 프로토타입 결정 기록 (eoeobatgi-decisions)"
tags: ["prototype", "decision", "harness", "judge", "store-wiki"]
created: 2026-10-30T16:52:22.592Z
updated: 2026-10-30T16:52:22.592Z
sources: []
links: ["idea-1-hotel-knowledge-copilot.md", "ref-adoption-decision-repo.md", "pattern-winners-common.md", "kmsk-society-judges.md"]
category: decision
confidence: medium
schemaVersion: 1
---

# 이어받기 프로토타입 결정 기록 (eoeobatgi-decisions)

# 이어받기 프로토타입 결정 기록

선정 아이디어: 사용자 위키 I02 "알바가 바뀌어도 서비스는 이어지는 매장". 연구 근거는 [[idea-1-hotel-knowledge-copilot]], 레퍼런스는 [[ref-adoption-decision-repo]], 수상작 패턴은 [[pattern-winners-common]], 학회 성향은 [[kmsk-society-judges]].

## 왜 이 방향인가
- 직원용 AI 매뉴얼 챗봇은 이미 있다(GS25 챗봇지니, 스타벅스 Green Dot Assist, Trainual). "AI로 매뉴얼을 묻는다"만으로는 차별점이 없다.
- 그래서 차별점을 네 가지로 좁혔다: 현장 사건에서 바텀업 수집, 회고 인터뷰로 판단 이유(왜)를 묻기(SECI 표출화), 점장 결정이 다시 카드가 되는 순환, 공식규정과 현장노하우의 구분과 상충 점검.
- 학회 2025 주제가 "Agentic AI 시대, 안전한 정보와 지식"이라 검증팀(근거·규정·표현·개인정보)을 하네스 중심에 뒀다.
- 디지털 그림자노동 비판: 고객이 아니라 직원 도구이고, 기록은 짧게·나중에 확인·크레딧 선택·질문자 개인 통계 없음으로 설계했다.

## 구조 결정
- 하네스 구조는 사용자 프로젝트 masdae-pass(AI Innovation 공모전)를 따랐다: harness/(config·agents·policies) · shared/contracts.ts · backend(runner·trace·gates·llm) · frontend/features · docs/judge.
- 에이전트 5팀 13개. LLM은 이해·작성(인터뷰어·카드 편집자·코치·종합·점검·훈련), 규칙은 검색·검증·개인정보·점장 연결.
- API 키가 없으면 규칙 모드로 같은 모양의 결과를 낸다. 화면에 모드를 표시한다.
- 실시간: SSE 실행 버스 → 에이전트 진행, 위키 변경 피드, cytoscape 온톨로지 그래프 증분.
- UI: 토스 원칙(한 화면 한 가지 일, 해요체, 이모지 없음), TDS식 시맨틱 색 토큰, 차트 범주색은 검증 스크립트 통과 팔레트.

## 개발 오케스트라
- 팀장: Claude Opus 5.5(코드·통합), GPT-6 Astra(기획·글). 작업자: Claude Sonnet 5.5(레퍼런스·화면), GPT-6.1 Sol(에이전트 카드·README). 구성은 .orchestra/team.json.
- 심사는 Opus 5.5와 Astra가 서로 보지 않고 공모전 5기준으로 채점(docs/judge).

## 심사 라운드
- 1차: Opus 68, Astra 70 (/100). 공통 지적: 게이트가 답을 실제로 막지 못함, 만료·상충 카드가 근거로 쓰임, LLM 모드 증거 없음, 사업성·순노동 근거 없음, 역할별 첫 화면 없음.
- 1차 반영: 만료·상충 카드 근거 제외, 허위 인용·금지 표현 줄 삭제 후 없으면 점장 이관, 호출 기준 해당 시 이관, 개인정보 선마스킹, 점장 답 표현 재검사, 비슷한 대기 질문 자동 해결, 역할 선택 첫 화면, 지표 n·시드 구분, 테스트 23개.
- 남은 과제: API 키로 LLM 모드 실측(backend/scripts/compare_modes.ts), 실제 매장 인터뷰와 파일럿.


## 2·3차 심사 (2026-10-31)
- 2차: Opus 70, Astra 72. 지적: 호출 기준 글자 일치의 빈틈(말 바꾼 위험 상황), 규칙 모드 카드 편집자의 금지 칸 왜곡, 질문자 통계 원칙 불일치, '공식규정' 단어만으로 근거 없는 줄 통과, 승인 대기 점장 답 노출, 금액 조건 오판.
- 2차 반영: 안전 어휘 안전망(harness/policies alwaysEscalate), 금액 숫자 비교, 질문자 역할 묶음, 승인 대기 답 비노출, 검증 예외 제거.
- 3차(최종): Opus 70, Astra 73. 반영: 최종 출력 관문, 안전 답에 카드 행동 미첨부, 고친 점장 답은 승인 카드로 재생성, 크레딧 비공개 전 경로, 보관 사유 저장, 규정 원문 미첨부 표시. 테스트 31개.
- 점수가 70 안팎에서 멈춘 이유(심사위원 공통): LLM 모드 실측 0회와 실제 매장의 지불 의향·검수 시간 데이터 0건. 둘 다 코드가 아니라 API 키와 현장 인터뷰가 있어야 풀린다.
