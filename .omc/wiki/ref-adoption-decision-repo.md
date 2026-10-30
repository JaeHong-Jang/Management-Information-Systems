---
title: "ref-adoption-decision (참고 repo 채택 결정)"
tags: ["reference", "repo", "decision", "palette", "typography", "이어받기"]
created: 2026-10-30T16:19:59.747Z
updated: 2026-10-30T16:19:59.747Z
sources: ["docs/references/repos.md"]
links: ["ref-toss-ux-repo-ux-ui.md", "ref-graph-viz-repo.md", "ref-llm-wiki-kb-repo-llm-kcs.md", "ref-agent-trace-repo-ui.md", "ref-dashboard-components-repo.md", "ref-frontline-onboarding.md", "kmsk-contest-hub.md"]
category: decision
confidence: medium
schemaVersion: 1
---

# ref-adoption-decision (참고 repo 채택 결정)

# 참고 repo 채택 결정

근거 표: [[ref-toss-ux-repo-ux-ui]], [[ref-graph-viz-repo]], [[ref-llm-wiki-kb-repo-llm-kcs]], [[ref-agent-trace-repo-ui]], [[ref-dashboard-components-repo]], [[ref-frontline-onboarding]]. 프로젝트 맥락: [[kmsk-contest-hub]]

## 상위 8개 차용
1. cytoscape.js + react-cytoscapejs: 그래프 엔진. 증분은 ref로 cy.add 직접 호출 + 등장 애니메이션 + fcose. 확장 시 sigma.js로 이전.
2. 토스 8가지 라이팅 원칙 + 해요체 + CTA 규칙(닫기/다음에, "~하기").
3. TDS 컬러 시스템: 시맨틱 토큰 Target-Role-Variant, 다크모드 별도 명도 기준.
4. Value first, Cost later + Easy to answer: 베테랑 인터뷰 화면 원칙.
5. OpenAI Agents SDK trace/span/handoff/guardrail 모델 + AG-UI 분류: SSE 이벤트 스키마.
6. LangGraph Studio 타임라인 + interrupt 패턴: 매니저 에스컬레이션 루프.
7. KCS v6 지식 상태 라이프사이클 + Karpathy ingest/query/lint.
8. shadcn/ui + Radix + Tremor 스타일 KPI + Recharts + Sonner, 폰트 Pretendard.

## 팔레트 (흰 배경 대비 직접 계산)
brand #3182F6 (3.71, 큰 글자/배경만), brand-strong #1B64DA (5.41, 링크/작은 글자), brand-weak #E8F3FF, text-strong #191F28 (16.56), text-body #4E5968 (7.11), text-weak #6B7684 (4.62), disabled #8B95A1 (3.04, 장식만), surface-subtle #F2F4F6, border #E5E8EB, danger #B42318 (6.57), success #067647 (5.69), warning #B54708 (5.43).
그래프 노드: 토픽 #3182F6 큰 원, 케이스 #0E7490 둥근 사각형, 직원 #6941C6 이니셜 원, 질문 #B54708 마름모, 규칙 #191F28 육각형 (색 + 모양 병행).

## 타이포그래피
Pretendard Variable. 화면 제목 26/34/700, 섹션 20/28/700, 카드 제목 17/24/600, 본문 15/24/400, 캡션 13/18/500, KPI 32/40/700 tabular-nums. 해요체, 이모지 없음, 그림자 대신 면 명도 차, 카드 radius 16.

## 라이선스 주의
Logseq, Wiki.js, Docmost, Trilium, Frappe LMS는 AGPL-3.0: 코드 복사 금지. Outline은 BSL로 알려짐. TDS UI 키트는 앱인토스 한정이므로 구조만 참고.

## 미검증
Neo4j NVL repo/라이선스, reagraph 증분 애니메이션, LightRAG WebUI 그래프 라이브러리, Karpathy 원문 URL, 토스 공식 컬러 토큰, Trainual/Axonify.

