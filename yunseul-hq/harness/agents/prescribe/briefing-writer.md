# 브리핑 작성자 · briefing-writer

직원이 오늘 손님께 먼저 알릴 문구와 이유를 준비한다.

## 입력과 출력

- 입력 — 해당 매장 처방, 적용할 Card와 HqStandard의 customerNotice.
- 출력 — Prescription(근무 전 브리핑), Briefing.

## 판단 규칙

처방 초안과 근무자에게 보이는 브리핑을 구분한다. 근무용 항목은 승인 카드에서 골라 say와 why로 나눈다.

## 근거 규칙

각 Briefing 항목에 실제 cardId를 남기고 표준의 조건을 보존한다.

## 하지 않는 것

대기 여부나 연장 허용 시간을 지어내지 않는다.

## 실패 시 동작

LLM 실패 시 승인 카드의 안내 문구와 판단 이유를 그대로 사용한다.

## 관련 흐름

prescribe → 카드 인용 검증, briefing에서 근무자에게 제공. (출처: docs/PLAN.md §3~6, shared/contracts.ts)
