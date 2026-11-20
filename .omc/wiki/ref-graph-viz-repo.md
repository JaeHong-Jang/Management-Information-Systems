---
title: "ref-graph-viz (참고 repo: 온톨로지 그래프 시각화)"
tags: ["reference", "repo", "graph", "cytoscape", "ontology", "visualization"]
created: 2026-10-30T16:19:56.771Z
updated: 2026-10-30T16:19:56.771Z
sources: ["docs/references/repos.md"]
links: ["ref-toss-ux-repo-ux-ui.md", "kmsk-contest-hub.md", "ref-adoption-decision-repo.md"]
category: pattern
confidence: medium
schemaVersion: 1
---

# ref-graph-viz (참고 repo: 온톨로지 그래프 시각화)

# 참고 repo: 온톨로지 그래프 시각화

전체 표는 docs/references/repos.md 참고. 관련: [[ref-toss-ux-repo-ux-ui]], [[kmsk-contest-hub]]

| 이름 | URL | 라이선스/규모 | 가져올 점 | 증분 추가/애니메이션 |
|---|---|---|---|---|
| cytoscape.js | https://github.com/cytoscape/cytoscape.js | MIT, 약 11.3k | cy.add, 셀렉터 스타일, 요소/뷰포트 애니메이션 (문서 명시) | 지원 (채택) |
| react-cytoscapejs | https://github.com/plotly/react-cytoscapejs | MIT, 약 0.5k | React 래퍼. 증분은 ref로 cy.add 직접 호출 권장 | 래퍼는 diff |
| cytoscape.js-fcose | https://github.com/iVis-at-Bilkent/cytoscape.js-fcose | MIT | compound 레이아웃, 토픽 묶기 | 지원 |
| cytoscape.js-popper | https://github.com/cytoscape/cytoscape.js-popper | MIT | 노드 호버 HTML 툴팁 | - |
| react-force-graph / force-graph | https://github.com/vasturiano/react-force-graph | MIT, 약 3.3k | 파티클 링크로 데이터 흐름 표현 | 지원 |
| sigma.js | https://github.com/jacomyal/sigma.js | MIT, 약 12.2k | WebGL 대규모. 규모 확장 시 이전 경로 | 지원 (트윈은 별도) |
| @react-sigma | https://github.com/sim51/react-sigma | MIT | sigma React 훅 | 동일 |
| reagraph | https://github.com/reaviz/reagraph | Apache-2.0, 약 1.1k | 컨텍스트 메뉴, 선택/하이라이트 | [미검증] |
| Neo4j NVL | https://neo4j.com/docs/nvl/current/ | 라이선스 [미검증] | 시각 언어(크기=중요도). GitHub repo 미확인 | [미검증] |
| antvis/G6 | https://github.com/antvis/G6 | MIT, 약 12.4k | 내장 인터랙션/애니메이션 | 지원 |
| xyflow | https://github.com/xyflow/xyflow | MIT, 약 38.8k | 에이전트 파이프라인 도식 (노드=React 컴포넌트) | 지원 |
| vis-network, memgraph/orb | https://github.com/visjs/vis-network , https://github.com/memgraph/orb | Apache-2.0 | 비교용 | - |
| LightRAG (WebUI) | https://github.com/HKUDS/LightRAG | MIT, 약 40.4k | 같은 스택(Vite+TS+Tailwind), 그래프 뷰어 화면 구성 | [미검증] |
| Microsoft GraphRAG | https://github.com/microsoft/graphrag | MIT, 약 36.5k | 엔티티-관계 추출, 커뮤니티 요약 | 배치 |
| graphrag-visualizer | https://github.com/noworneverev/graphrag-visualizer | MIT | 그래프 + 테이블 동시 열람 | [미검증] |
| Quartz | https://github.com/jackyzha0/quartz | MIT, 약 13.5k | 로컬 그래프(N-hop), 백링크 | 정적 |
| Foam | https://github.com/foambubble/foam | LICENSE 확인 필요 | 고아 노트 / 빈 링크 개념 (lint) | - |
| Logseq | https://github.com/logseq/logseq | AGPL-3.0 | 글로벌 그래프 필터, 노드 크기=링크 수 (UX만) | - |

노드 5종(토픽, 케이스, 직원, 질문, 규칙)은 색과 모양을 함께 달리한다. 상세 팔레트는 [[ref-adoption-decision-repo]].

