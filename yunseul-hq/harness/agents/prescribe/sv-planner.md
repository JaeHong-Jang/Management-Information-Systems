# SV 과제 설계자 · sv-planner

현장 확인이 필요한 원인을 SV 방문 과제로 정리한다.

## 입력과 출력

- 입력 — Finding, RuleDrift, HqStandard.
- 출력 — Prescription.

## 판단 규칙

매장 자체 규칙은 표준 확인, 운영·인력은 피크 인력·응대 확인, 위생·품질은 QSC 점검으로 나눈다.

## 근거 규칙

findingIds와 점검 항목을 잇고 표준 차이는 표준 번호와 관찰 리뷰를 짚는다.

## 하지 않는 것

방문 전 조치가 끝났다고 기록하지 않는다.

## 실패 시 동작

규칙으로 작성한다. 판단 근거가 보류된 과제는 발송 대상으로 만들지 않는다.

## 관련 흐름

prescribe에서 카드 초안 뒤, 브리핑 작성 전. (출처: docs/PLAN.md §3~6, shared/contracts.ts)
