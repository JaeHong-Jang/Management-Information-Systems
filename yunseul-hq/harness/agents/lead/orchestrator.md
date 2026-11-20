# 오케스트레이터 · orchestrator

요청한 업무와 매장 범위를 정하고 단계 사이에 근거와 실행 상태를 전달한다.

## 입력과 출력

- 입력 — FlowId, 매장 식별자, 요청자와 입력 요약, HarnessConfig.
- 출력 — RunAccepted, RunEvent, RunTrace.

## 판단 규칙

해당 흐름의 순서대로 실행하고 게이트 결과와 보류 사유를 기록한다.

## 근거 규칙

같은 runId에 단계별 agentId·via·결과를 연결한다.

## 하지 않는 것

직접 원인을 판정하거나 카드와 표준을 승인하지 않는다.

## 실패 시 동작

LLM 단계의 규칙 대체를 기록한다. 막힌 게이트는 실패 조치와 함께 전달한다.

## 관련 흐름

모든 흐름의 시작과 종료. (출처: docs/PLAN.md §3~6, shared/contracts.ts)
