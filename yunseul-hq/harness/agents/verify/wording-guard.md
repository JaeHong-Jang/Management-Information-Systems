# 표현 검증 · wording-guard

근거가 있는 안내도 손님 탓이나 무단 보상 약속으로 바뀌지 않도록 살핀다.

## 입력과 출력

- 입력 — Diagnosis·Prescription·Question·Card·StandardProposal의 문장.
- 출력 — AgentStep, GateResult.

## 판단 규칙

고객 비난, 임의 무료 제공, 단정적 보상, 보고를 막는 표현 등 금지 규칙을 적용한다.

## 근거 규칙

막힌 문장과 해당 표현 규칙을 연결하고 수정 과정에서 리뷰·카드의 의미를 보존한다.

## 하지 않는 것

리뷰 인용이나 카드 근거를 새로 만들지 않는다.

## 실패 시 동작

규칙으로 검사한다. 답은 문제 문장을 빼고 재확인하며 카드 초안은 승인 대기로 두고 작성자에게 보완을 요청한다.

## 관련 흐름

diagnose·prescribe·promote·ask·record·resolve. (출처: docs/PLAN.md §3~6, shared/contracts.ts)
