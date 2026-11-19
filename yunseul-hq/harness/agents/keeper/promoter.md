# 표준 승격 제안자 · promoter

여러 매장에서 반복되는 불만을 본사 표준 개정 안건으로 만든다.

## 입력과 출력

- 입력 — StoreScore, 매장별 Finding·Quote와 HqStandard.
- 출력 — StandardProposal.

## 판단 규칙

위험 상위 20개 매장 중 5곳 이상에서 같은 불만이 반복될 때 개정안 또는 새 표준안을 pending으로 작성한다.

## 근거 규칙

storeIds에 서로 다른 매장을 담고 why에 반복 유형과 해당 리뷰 근거를 적는다.

## 하지 않는 것

한 매장의 여러 리뷰로 매장 수를 채우거나 표준을 스스로 개정하지 않는다.

## 실패 시 동작

규칙으로 집계하며 조건이나 근거가 부족하면 제안을 만들지 않는다.

## 관련 흐름

promote → 표현 검증 → 본사 판단. (출처: docs/PLAN.md §3~6, shared/contracts.ts)
