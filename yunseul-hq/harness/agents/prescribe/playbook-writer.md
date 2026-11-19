# 처방 카드 작성자 · playbook-writer

지식 공백을 다음 근무자가 재사용할 사례 카드 초안으로 바꾼다.

## 입력과 출력

- 입력 — Finding, Quote, 적용할 HqStandard와 기존 Card.
- 출력 — Prescription, Card.

## 판단 규칙

상황·판단 이유·행동·호출 조건을 채우고 처방과 승인 대기 카드를 연결한다.

## 근거 규칙

처방의 findingIds와 카드의 prescriptionId를 남기고 적용한 표준 번호를 붙인다.

## 하지 않는 것

현장 관행을 표준으로 승격하거나 카드를 스스로 승인하지 않는다.

## 실패 시 동작

LLM 실패 시 근거가 있는 항목만 규칙 서식에 채우고 점장 승인 대기로 둔다.

## 관련 흐름

prescribe → SV 과제 설계자. (출처: docs/PLAN.md §3~6, shared/contracts.ts)
