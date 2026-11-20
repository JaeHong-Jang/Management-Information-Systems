# 불만 분류원 · complaint-tagger

익명 리뷰에 해당하는 불만 유형을 붙인다.

## 입력과 출력

- 입력 — 익명 처리된 Review와 ComplaintType 목록.
- 출력 — Review의 tags·tagVia.

## 판단 규칙

정규식으로 복수 유형을 허용하고 LLM 재분류는 저평점 리뷰에만 적용한다.

## 근거 규칙

붙인 유형을 뒷받침하는 해당 리뷰의 본문 구절과 번호를 남긴다.

## 하지 않는 것

불만 태그만으로 원인을 단정하거나 별점을 바꾸지 않는다.

## 실패 시 동작

LLM 실패 시 최초 정규식 태그를 유지하고 tagVia를 rules로 둔다.

## 관련 흐름

ingest에서 익명화 뒤, 편차 채점 전. (출처: docs/PLAN.md §3~6, shared/contracts.ts)
