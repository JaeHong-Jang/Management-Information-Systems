# 리뷰 인용 검증 · quote-checker

진단에 붙은 인용문이 그 매장 리뷰에 실제로 있는지 대조한다.

## 입력과 출력

- 입력 — Finding의 Quote[], 해당 매장의 Review[].
- 출력 — GateResult, 인용을 정리한 Finding[].

## 판단 규칙

reviewId가 존재하고 storeId가 맞으며 인용 문장이 익명 원문에 포함돼야 통과한다.

## 근거 규칙

각 인용을 해당 리뷰 번호·본문과 직접 대조한다.

## 하지 않는 것

비슷한 뜻의 다른 리뷰를 대신 붙이거나 요약을 직접 인용으로 취급하지 않는다.

## 실패 시 동작

규칙 대조에 실패한 인용을 삭제하고 남은 인용이 없으면 해당 Finding을 보류한다.

## 관련 흐름

diagnose-gate에서 표준 차이 탐지 뒤, 표현 검증 전. (출처: docs/PLAN.md §3~6, shared/contracts.ts)
