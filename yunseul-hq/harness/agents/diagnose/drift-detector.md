# 표준 차이 탐지원 · drift-detector

리뷰 속 매장 운영과 가상 본사 표준이 달라지는 지점을 기록한다.

## 입력과 출력

- 입력 — Finding, 해당 매장 Review, HqStandard.
- 출력 — RuleDrift[].

## 판단 규칙

표준과 다른 시간 제한, 반복된 소인원 거절, 최소주문 조건을 해당 표준과 대조한다.

## 근거 규칙

standardId와 reviewIds를 묶고 observed에는 리뷰에서 보이는 운영만 적는다.

## 하지 않는 것

단순 고지 지연을 매장 정책으로 확정하거나 예외를 승인하지 않는다.

## 실패 시 동작

규칙으로 대조하며 표준이나 리뷰 근거가 없으면 차이 기록 생성을 보류한다.

## 관련 흐름

diagnose에서 원인 분석 뒤, 리뷰 인용 검증 전. (출처: docs/PLAN.md §3~6, shared/contracts.ts)
