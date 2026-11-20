---
title: "수상작 레퍼런스: 해외 쇼케이스 (ref-winners-international)"
tags: ["reference", "winners", "devpost", "microsoft", "google", "hospitality", "onboarding"]
created: 2026-10-31T00:00:00.000Z
updated: 2026-10-31T00:00:00.000Z
sources: ["docs/references/winners.md"]
links: ["kmsk-society-judges.md", "kmsk-contest-hub.md", "contest-rules.md"]
category: pattern
confidence: medium
schemaVersion: 1
---

# 수상작 레퍼런스: 해외 쇼케이스 (ref-winners-international)

> 관련: [[kmsk-society-judges]] · [[kmsk-contest-hub]] · 전체본 docs/references/winners.md. 확인하지 못한 항목은 [미검증]으로 표시. 평가항목 약칭: [문제][AI][창의][비즈][기술] 각 20점.

## 3. 해외 쇼케이스 (Devpost, Microsoft, Google, 호스피탈리티)

### 3-1. Konveyor: AI-Powered Knowledge Transfer Agent (Microsoft AI Agents Hackathon 2025, Best Python Agent)
- URL: https://microsoft.github.io/AI_Agents_Hackathon/winners/ , 제출 글 https://github.com/microsoft/AI_Agents_Hackathon/issues/645 , 코드 github.com/sdamache/konveyor-onboarding-agent
- 무엇을: 엔지니어 온보딩용 에이전트. 문서 질의응답(출처 인용), 코드 설명, 지식 공백 분석(질문을 지식 영역에 매핑해 영역별 확신도 추적), Slack 연동. Semantic Kernel, Azure OpenAI, Azure Cognitive Search.
- 왜 이겼나: 대회 페이지는 "전문가가 떠나거나 팀이 바뀔 때 지식이 사라지는 문제"를 다룬 점을 적었다. 심사 기준은 혁신·임팩트·사용성·솔루션 품질·카테고리 적합성.
- 한계: 제출 글은 온보딩 시간 30-50% 단축을 주장하지만 측정 데이터는 없다. 우리는 수치를 "목표 가정"으로 표시하고 출처 있는 문제 통계와 분리한다.
- 가져올 점: 우리 아이디어와 가장 가까운 선례(온보딩 + 지식 이전). "Knowledge Gap Analyzer"는 우리 에스컬레이션 루프(모르는 질문을 점장에게)와 비슷한 구조다. 차별화 포인트는 매장 현장(비정형 예외 처리)과 실시간 온톨로지 그래프.
- 도움 항목: [문제] [AI] [창의]

### 3-2. Bit2Brain (Microsoft AI Agents Hackathon 2025, Best Java Agent)
- 같은 winners 페이지.
- 무엇을: 영상·기사·스크린샷을 연결된 "Knowledge Star Map"으로 정리. Neo4j + Langchain4j + Azure Video Indexer, AI 노드 확장 제안, 유사 노드 병합 요약, 그래프를 탐색하는 대화형 에이전트.
- 가져올 점: 지식그래프를 "보여주는 화면"이 입상 요소였다. 실시간 온톨로지 그래프 시연의 직접 선례.
- 도움 항목: [AI] [창의]

### 3-3. WorkWizee (Best Copilot Agent) / RiskWise (Best Overall) / TARIFFED / Apollo
- 같은 winners 페이지. WorkWizee: Teams에서 자연어로 P1/P2 장애 대응(Jira·Confluence 등), 팀 주장 40% 시간 절감은 검증되지 않았다고 페이지가 표시. RiskWise: 공급망 리스크 에이전트(종합 1위). TARIFFED: 자체 DB 기반 관세 질의응답. Apollo: 하위 에이전트 조율과 자기성찰형 RAG.
- 가져올 점: 종합 1위가 "엔드투엔드 해결 + 실시간 위험 신호" 구조. 에이전트 팀은 역할명을 붙여 설명(Apollo의 Athena/Hermes). 우리도 에이전트 역할 이름을 붙인 구조도를 쓴다.
- 도움 항목: [AI] [기술]

### 3-4. Google ADK 해커톤 2025 (Grand Prize SalesShortcut 외)
- URL: https://cloud.google.com/blog/products/ai-machine-learning/adk-hackathon-results-winners-and-highlights
- 종합 SalesShortcut(멀티에이전트 영업개발), 지역 우승 Energy Agent AI, Edu.AI, GreenOps, Nexora-AI. 블로그에 심사평 없음.
- 가져올 점: 우승작 대부분이 "멀티에이전트 + 구체 업무 흐름"이다. 에이전트 수보다 업무 흐름(리드 발굴, 조사, 제안, 아웃리치)이 한 줄로 설명된다.
- 도움 항목: [AI] [창의]

### 3-5. ODSC x Google Cloud 해커톤 2025: konveyN2AI (결선), StoryGrow(2위)
- URL: https://opendatascience.com/insights-from-the-winners-of-the-2025-odsc-google-cloud-hackathon/
- konveyN2AI: 기업 지식 이전 시간을 "수 주에서 수 분"으로 줄이는 3-에이전트 구조(Janapada=기억 검색, Amatya=역할별 프롬프트, Svami=출처 인용 답변과 확신도).
- 발표 조언 원문: "Start with the pain. A crystal-clear 'why' aligns code and pitch." "Story > slides. A 60-second live demo sticks longer than any deck." 2위 팀: "Have a story, since judges remember narratives more than features." 결선 팀: "Keeping each agent laser-focused minimized hallucination and made debugging a breeze."
- 가져올 점: 에이전트별 단일 책임 + 확신도 표시, 60초 라이브 데모, 문제 먼저 시작.
- 도움 항목: [문제] [AI] [기술]

### 3-6. Cornell Hospitality Hackathon 2024 (우승 Pineapple Posse)
- URL: https://business.cornell.edu/hub/2024/10/02/hospitality-hackathon-embraces-ai-improve-guest-experience
- 16팀 71명, 금요일 오후 4시 시작 ~ 일요일 오전 7시까지 발표 준비. 우승안: 앱 내 AI 챗봇이 호텔 소유주가 정한 금액 한도 이하 청구 분쟁을 처리하고, 한도 초과는 직원에게 넘김. 특별상으로 최우수 시각화, 최우수 발표.
- 심사평 원문: Kelly McGuire "everyone is excited about the potential of AI but struggling to figure out what the applications are", Leonard Gooz(Hilton) "the winning team helped us identify an area where we're seeing a high number of complaints".
- 가져올 점: AI 자동 처리 + 한도 초과 시 사람에게 이관하는 구조가 우승했다. 우리 "점장 에스컬레이션 루프"의 직접 선례. 불만이 많은 구체 영역을 짚은 점이 평가됐다.
- 도움 항목: [문제] [비즈] [기술]

### 3-7. AAHOACON26 Tech Pitch Competition, Sadie AI
- URL: https://www.hotelmanagement.net/tech/sadie-ai-wins-top-honors-aahoacon26-tech-pitch-competition (WebFetch 403, 검색 결과 제목만 확인)
- 내용 [미검증]. 호텔 업계 피치 대회의 존재만 확인.
- 도움 항목: 없음(후속 확인 대상)

### 3-8. Devpost 개별 제출물 (수상 여부 미확인)
- Employee Onboarding Assistant(Salesforce Agentforce) https://devpost.com/software/employee-onboarding-assistant-2xrady , MCP 해커톤 온보딩 에이전트 https://devpost.com/software/noname-qg47t6 , lablab.ai onboard ai agent https://lablab.ai/ai-hackathons/techex-intelligent-enterprise-solutions-hackathon/core-agents/onboard-ai-agent
- Devpost는 WebFetch 403이라 본문과 수상 여부 확인 불가 [미검증]. 사람이 브라우저로 열어 "Problem Statement/What it does" 구조를 확인할 가치가 있다.

