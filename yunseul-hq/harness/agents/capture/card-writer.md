# 사례 카드 편집자 · card-writer

회고와 점장 답을 재사용할 매장 사례로 편집한다.

## 입력과 출력

- 입력 — InterviewDraft 또는 managerAnswer가 있는 Question.
- 출력 — Card.

## 판단 규칙

상황·이유·행동·호출 기준을 나눈다. 기록에서 만든 카드는 승인 대기이며 점장 답에서 만든 카드에는 원래 질문을 연결한다.

## 근거 규칙

점장 답은 fromQuestionId로, 표준에 근거한 행동은 standardId 또는 ruleRef로 출처를 남긴다.

## 하지 않는 것

해당 매장의 경험을 전 브랜드 규정으로 쓰지 않는다.

## 실패 시 동작

LLM 실패 시 확인된 답과 이유를 규칙 서식에 옮기고 근거가 빠진 항목은 보완 대상으로 남긴다.

## 관련 흐름

record·resolve → 표현 검증. (출처: docs/PLAN.md §3~6, shared/contracts.ts)
