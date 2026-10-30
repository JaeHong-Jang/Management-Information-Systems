---
title: "논문: AI 고객경험(CX) 실증 (papers-ai-cx)"
tags: ["논문", "AI고객경험", "CX", "챗봇", "핸드오프", "할루시네이션", "백스테이지", "취약계층", "에이전틱AI", "국내학술지"]
created: 2026-10-30T15:43:41.380Z
updated: 2026-10-30T15:43:41.380Z
sources: ["research_notes/지식경영학회 스마트서비스 공모전 아이디어/02_AI_고객경험_논문.md", "reports/지식경영학회 스마트서비스 공모전 아이디어.md"]
links: ["kmsk-contest-hub.md", "papers-classic-theory.md", "papers-km-genai.md", "papers-smart-tourism-hotel.md", "papers-kmr-journal.md", "idea-1-hotel-knowledge-copilot.md", "idea-5-emotion-handoff-cs.md", "idea-7-senior-screen-coach.md", "idea-2-barrier-free-travel.md", "pre-submission-checklist.md"]
category: pattern
confidence: medium
schemaVersion: 1
---

# 논문: AI 고객경험(CX) 실증 (papers-ai-cx)

> AI 고객경험(CX)·서비스 실증·개념 연구(2022–2026)와 국내 서비스·정보시스템 학술지 서지(노트 02). 핵심 메시지: 생성형 AI는 백스테이지(직원 보조·지식 검색)에서 효과가 분명하고, 프런트스테이지 감성 상호작용에서는 역효과가 반복 보고된다.

상위: [[kmsk-contest-hub]] · 관련: [[papers-classic-theory]] · [[papers-km-genai]] · [[papers-smart-tourism-hotel]] · [[papers-kmr-journal]]

## 검증 태그 (노트 02 표기 그대로)

- **[초록 확인]** Crossref나 출판사 페이지에서 초록을 읽고 핵심 결과를 정리함
- **[서지만 확인]** 서지정보만 확인. 초록을 구하지 못해 내용은 제목 수준. 인용 전에 원문을 읽을 것
- 노트 02 검증 방법: 모든 논문을 Crossref API(`api.crossref.org/works/{DOI}`)로 제목·저자·학술지·권호·쪽수 조회. 총 고전·이론 21편, 2022–2026 실증·개념 31편(국내 KCI 계열 11편 포함).
- 보고서 부록 C는 Brynjolfsson 항목을 "[초록 확인]/[검증] (수치 불일치 주의)"로 병기했다.

## 핵심 시사점 (노트 02 추론)

- **백스테이지 우선 원칙**: Brynjolfsson 등(2025)과 Reinhard 등(2026) → 직원 보조·지식 검색에서 효과 분명. Han 등(2026), Crolic 등(2022), Chacon 등(2026) → 고객 직접 대면 감성 상호작용에서 역효과. → [[idea-1-hotel-knowledge-copilot]]
- **핸드오프 설계는 그 자체로 차별화 포인트**: Chacon(사용자 주도 조기 전환) + Gnewuch & Reinkemeier(협업적 복구) + 서울시 41.1%. → [[idea-5-emotion-handoff-cs]]
- **하이브리드라고 항상 좋은 것은 아니다**: Ding 등(2025).
- **에이전틱 AI는 위임 수준을 단계적으로**: "AI가 준비하고 사람이 최종 승인한다".
- **취약계층 연구는 '보조'에서 '역량 강화'로**: Fan(2026), 의존 위험 Xie 등(2023). → [[idea-7-senior-screen-coach]], [[idea-2-barrier-free-travel]]

---

## (1) 생성형 AI와 상담·고객서비스 성과

- Brynjolfsson, E., Li, D., & Raymond, L. (2025). Generative AI at Work. *The Quarterly Journal of Economics*, 140(2), 889–942. 고객지원 상담원 5,179명(노트 02 기준; 노트 04는 5,172명)에게 생성형 AI 보조도구 단계적 도입. 시간당 해결 건수 평균 14% 증가, 초보·저숙련 34% 증가, 숙련자는 효과 거의 없음. 고객 감정 개선, 직원 이직 감소. (14%·34%는 NBER WP 초록 기준, QJE 최종본은 다를 수 있음.) [초록 확인] — [DOI](https://doi.org/10.1093/qje/qjae044); [NBER w31161](https://www.nber.org/papers/w31161)
  - 노트 04 [검증] 추가 정보: QJE 게재본 요약은 **15%**라는 2차 출처 → "14%(WP)/15%(QJE 게재본)" 구분. 게재본 초록: 영어 유창성이 낮은 **국제 상담원**에게 효과가 컸고, '중간 정도로 드문 문제'에서 이득 최대, 고객이 더 정중해지고 관리자 연결 요구 감소. 표본 기업 설명("Fortune 500 소프트웨어 기업" 대 "대형 온라인 리테일러")이 엇갈림. → [[papers-km-genai]], [[pre-submission-checklist]]
- Reinhard, P., Li, M. M., Peters, C., Janson, A., & Leimeister, J. M. (2026). GenAI-Infused Service Delivery: Micro-Level Augmentation Patterns at the Service Frontline. *Journal of Service Research*. 2020–2024 종단 질적연구 41명 인터뷰. 생성형 AI는 주로 지식집약 서비스 백스테이지에 들어가 있었고 7가지 미시 증강 패턴 도출. '동시적 침투'와 문서화·AI 학습데이터 공급 루틴을 통한 '순차적 침투'. [초록 확인] — [DOI](https://doi.org/10.1177/10946705251414283)
- Ferraro, C., Demsar, V., Sands, S., Restrepo, M., & Campbell, C. (2024). The paradoxes of generative AI-enabled customer service: A guide for managers. *Business Horizons*, 67(5), 549–559. [서지만 확인] — [DOI](https://doi.org/10.1016/j.bushor.2024.04.013)
- Wirtz, J., & Stock-Homburg, R. (2025). Generative AI Meets Service Robots. *Journal of Service Research*, 28(4), 527–543. LLM·LBM·에이전틱 AI가 서비스 로봇에 결합. 노코드로 일선 직원이 '시민 개발자'로서 로봇을 학습시킴. [초록 확인] — [DOI](https://doi.org/10.1177/10946705251340487)
- Larivière, B., Verleye, K., De Keyser, A., Koerten, K., & Schmidt, A. L. (2025). The Service Robot Customer Experience (SR-CX): A Matter of AI Intelligences and Customer Service Goals. *Journal of Service Research*, 28(1), 35–56. 쾌락적 목표에서 정교한 AI 지능이 SR-CX 강화. [초록 확인] — [DOI](https://doi.org/10.1177/10946705241296051)
- Huang, Y., Markovitch, D. G., & Stough, R. A. (2024). Can chatbot customer service match human service agents on customer satisfaction? An investigation in the role of trust. *Journal of Retailing and Consumer Services*, 76, 103600. [서지만 확인] — [DOI](https://doi.org/10.1016/j.jretconser.2023.103600)

## (2) 공감·의인화의 역효과와 서비스 실패·복구

- Han, E., Yin, D., & Zhang, H. (2026). Bots with Empathy: Reactance Against Emotion-Aware AI Agents in Customer Service. *MIS Quarterly*. 실험 3건. 서비스 실패 후 챗봇 공감 표현 → 반발 → 유능성·따뜻함 지각 하락 → 평가 하락. [초록 확인] — [DOI](https://doi.org/10.25300/misq/2026/18683)
- Fürst, A., Trißler, M., & Friedrich, M. (2026). Managing Critical Frontline Agent–Customer Interactions: The Role of Service Recovery Explanations Across AI and Human Agents. *Journal of Service Research*. 부분적으로만 유리한 복구 결과에서 이유 설명이 복구 후 반응 개선. 주연구 3건+보조 3건. [초록 확인] — [DOI](https://doi.org/10.1177/10946705261460013)
- Zhang, Wu, & Liu (2026). Understanding AI service failures: insights from attribution theory. *Journal of Service Management*, 37(2), 320–343. AI 서비스 실패를 알고리즘 실패, 전달매체 실패, 상업 시스템 실패로 분류. [초록 확인] — [DOI](https://doi.org/10.1108/josm-08-2024-0354)
- Villarroel Ordenes, F., Packard, G., Hartmann, J., & Proserpio, D. (2025). Using Traditional Text Analysis and Large Language Models in Service Failure and Recovery. *Journal of Service Research*, 28(3), 382–388. [서지만 확인] — [DOI](https://doi.org/10.1177/10946705241307678)
- (Crolic 등 2022는 [[papers-classic-theory]])

## (3) 대화 단절, 휴먼 핸드오프, 하이브리드 운영

- Gnewuch, U., & Reinkemeier, F. (2026). Overcoming Breakdowns in Customer-Chatbot Interaction: Design and Impact of Collaborative Repair Strategies. *MIS Quarterly*, 50(2), 497–526. "추측 게임" 대신 협업적 복구 전략을 대형 보험사 챗봇에 넣은 무작위 현장실험. 해결 단절 증가, 부정 영향 감소. [초록 확인] — [DOI](https://doi.org/10.25300/misq/2025/18742)
- Chacon & Martinez-Troncoso (2026). Chatbot or Human? Rethinking Complaint Handling in Customer Service. *Journal of Consumer Behaviour*, 25(5), 2608–2628. 사전등록 4건. 불만 처리는 사람 선호(Study 1, N=200), 빠른 응답이 챗봇 수용 높임(Study 2–3), 사용자가 원할 때 조기 핸드오프 선호(Study 4, N=160). [초록 확인] — [DOI](https://doi.org/10.1002/cb.70185)
- Ding, Zhang, Sun, Goh, & Yang (2025). Harmonizing Human Touch and AI Precision in Customer Service. *Journal of Service Research*, 29(3), 377–390. 게임이론 '협업의 함정': 정체성 민감 고객에서 협업 증가 → AI 위임 가속 → 수익성 하락. 인건비 중간 수준일 때 협업이 사람만보다 성과 낮음. [초록 확인] — [DOI](https://doi.org/10.1177/10946705251384692)
- Zhao (2026). Algorithmic inequality by design: Human resistance and its limits in chatbot-based customer service. *Big Data & Society*, 13(2). 중국 SNS 3곳 게시물 1,081건 넷노그래피. 장벽, 계층화, 노동·비용 전가로 불평등 재생산. [초록 확인] — [DOI](https://doi.org/10.1177/20539517261458297)

## (4) 할루시네이션과 신뢰

- Larsen, Skjuve, Følstad, & van As (2025). LLM Hallucinations in Conversational AI for Customer Service: Framework and End-User Perceptions. *International Journal of Human–Computer Interaction*. 잠재 사용자 274명 설문에서 모든 유형이 신뢰를 해칠 수 있고 해가 될 수 있는 잘못된 정보가 가장 심각(**검색 스니펫 기반**). [서지 확인] — [DOI](https://doi.org/10.1080/10447318.2025.2580540)
- Huang, G., Wong, I. A., Zhang, C., & Liang, Q.-L. (2025). Generative AI inspiration and hotel recommendation acceptance: Does anxiety over lack of transparency matter? *International Journal of Hospitality Management*, 126, 104112. [서지만 확인] — [DOI](https://doi.org/10.1016/j.ijhm.2025.104112)
- Jia, Ma, Chi, & Fan (2026). A socio-technical exploration of bias in generative AI travel planners. *Tourism Management*, 116, 105442. [서지만 확인] — [DOI](https://doi.org/10.1016/j.tourman.2026.105442)
- Shi, Zhang, Xu, Filieri, & Jia (2026). Biased or credible? Investigating perceived persuasiveness of AI-generated review summaries in online travel platforms. *Tourism Management*, 117, 105446. [서지만 확인] — [DOI](https://doi.org/10.1016/j.tourman.2026.105446)
- Zhang, H., Xiang, Z., & Zach, F. J. (2025). Generative AI vs. humans in online hotel review management: A Task-Technology Fit perspective. *Tourism Management*, 110, 105187. TTF 관점, 공모전 "AI 기술 적합성" 기준과 직결. 오픈액세스. [서지만 확인] — [DOI](https://doi.org/10.1016/j.tourman.2025.105187); [OA](https://hdl.handle.net/10919/124883)

## (5) 개인화·추천과 프라이버시

- Wang, Zhu, Liu, & Jiang (2024). Enhancing recommendation acceptance: Resolving the personalization–privacy paradox in recommender systems: A privacy calculus perspective. *International Journal of Information Management*, 76, 102755. [서지만 확인] — [DOI](https://doi.org/10.1016/j.ijinfomgt.2024.102755)
- Islam, Tan, Sinha, & Selem (2024). Gaps between customer compatibility and usage intentions: The moderation function of subjective norms towards chatbot-powered hotel apps. *International Journal of Hospitality Management*, 123, 103910. [서지만 확인] — [DOI](https://doi.org/10.1016/j.ijhm.2024.103910)
- Heitmann, Jansen, Reisenbichler, & Schweidel (2026). Picture Perfect: Engaging Customers with Visual Generative AI. *Journal of Marketing*, 90(4), 74–96. [서지만 확인] — [DOI](https://doi.org/10.1177/00222429251356993)

## (6) 에이전틱 AI와 구매 위임

- Alyahya, Agag, & Shehawy (2027, 온라인 선공개). When AI shops for me: How agentic retail representation turns assistance into purchase delegation. *Journal of Retailing and Consumer Services*, 95, 105174. [서지만 확인] — [DOI](https://doi.org/10.1016/j.jretconser.2026.105174)
- Balaskas (2026). From Recommendations to Delegation: A Systematic Review Mapping Agentic AI in E-Commerce and Its Consumer Effects. *Information* (MDPI), 17(3), 222. [서지만 확인] — [DOI](https://doi.org/10.3390/info17030222)
- Hasselwander (2026). AI agent, take over?! Task delegation to agentic AI systems in the Philippines. *AI & Society*, 41(9), 8641–8656. [서지만 확인] — [DOI](https://doi.org/10.1007/s00146-026-03060-3)
- (산업 보고서, 학술논문 아님) Accenture(2026): AI 에이전트와 최적 옵션 탐색에 85% 개방, 완전 자율 구매 동의 9%. Worldpay(미국): 대리 검색 허용 44%, 구매 완전 위임 6%. — [Accenture](https://www.accenture.com/ch-en/insights/consulting/talk-my-ai-agent); [arXiv 2608.08395 인용](https://arxiv.org/pdf/2608.08395) (원자료 확인 못함)

## (7) 가치공동창출·S-D Logic 확장

- Kaartemo, V., & Helkkula, A. (2024). Human–AI resource relations in value cocreation in service ecosystems. *Journal of Service Management*, 36(2), 291–306. [서지만 확인] — [DOI](https://doi.org/10.1108/josm-03-2023-0104)
- Kim (2026). Artificial intelligence-driven reconfiguration of customer experience: A service-dominant logic framework. *Journal of Hospitality and Tourism Management*, 69, 101578. 호텔관광대학 소속 심사위원에게 설명하기 좋은 연결고리. [서지만 확인] (보고서: 저자명 미확인 항목으로 분류) — [DOI](https://doi.org/10.1016/j.jhtm.2026.101578)

## (8) 취약계층 접근성: 고령자, 소수자, 외국인

- Fan (2026). From support to empowerment: AI-enabled transformative service for positive aging. *Journal of Service Management*. 고령자 시나리오 실험 3건. 생성형 AI 자기학습 서비스 → 개인적 성장·사회적 연결감 → 삶의 목적의식·만족. [초록 확인] — [DOI](https://doi.org/10.1108/josm-08-2025-0384)
- Elkattan, Ekroos, Biscevic, Ligthart, & El-Manstrly (2026). How generative AI companions alleviate situational vulnerability and enhance consumer well-being. *Journal of Service Management*, 37(3), 451–485. [초록 확인] — [DOI](https://doi.org/10.1108/josm-04-2025-0165)
- Xie, Pentina, & Hancock (2023). Friend, mentor, lover: does chatbot engagement lead to psychological dependence? *Journal of Service Management*, 34(4), 806–828. Replika 사용자 혼합연구, 심리적 의존. [초록 확인] — [DOI](https://doi.org/10.1108/josm-02-2022-0072)
- Kim, Biswas, Szocs, & Jenkins (2026). Human or AI? Identity Salience Enhances Historically Marginalized (but Not Privileged) Consumers' Choice of Algorithmic Service Providers. *Journal of Marketing*. [초록 확인] — [DOI](https://doi.org/10.1177/00222429261444284)
- Hou & Ismiati (2026). Generative AI Labeling, Communication Style, and Perceived Emotional Support in Chatbot Interactions among International Students. *Information Systems Frontiers*. [서지만 확인] — [DOI](https://doi.org/10.1007/s10796-026-10814-3)
- Kekäläinen, Heinonen-Kemppi, Pesonen, Sthapit, & Garrod (2026). Generative AI Chatbot Prompting for Excellent Customer Service in Tourism. *Services Marketing Quarterly*, 1–23. [서지만 확인] — [DOI](https://doi.org/10.1080/15332969.2025.2610137)

## (9) 국내 학술지 (KCI 계열, Crossref 서지 확인)

> 노트 02 주의: Crossref에는 저자명이 로마자로만 등록돼 있어 **한글 저자명은 로마자를 보고 추정**한 것이다. 인용 전에 KCI에서 정확한 한글 표기를 확인할 것. 학술지명은 DOI 접두어(10.15706=서비스경영학회지, 10.14329=ISR/APJIS, 10.7838=한국전자거래학회)를 근거로 붙였다. → [[pre-submission-checklist]]

- 전소영·유한주 (2023). A Study on the Effect of Chatbot Service Quality on Intention to Use and a Comparative Study Between Industries. *서비스경영학회지*, 24(3), 395–418. [서지만 확인] — [DOI](https://doi.org/10.15706/jksms.2023.24.3.017)
- 박영진·김태진·김주희·강주영 (2024). The Impact of Elderly Individuals' Perceived Self-control and Constraints on the Intention to Use Self-Service Kiosks: Focusing on Positive and Negative Psychological-Personality Factors. *서비스경영학회지*, 25(4), 149–180. [서지만 확인] — [DOI](https://doi.org/10.15706/jksms.2024.25.4.007)
- 이인태 (2025). A Study on the Negative Effects of Risk Factors of AI Recommendation Service on Continuous Use Intention. *서비스경영학회지*, 26(4), 25–43. [서지만 확인] — [DOI](https://doi.org/10.15706/jksms.2025.26.4.002)
- 박인영·김영준 (2026). An Empirical Study on The Impact of AI Agent Service Quality Factors on Users' Continued Use Intention: An Integrated Approach to ISSM, VAM, and ECM. *서비스경영학회지*, 27(1), 194–234. [서지만 확인] — [DOI](https://doi.org/10.15706/jksms.2026.27.1.008)
- 김혜경·도미라·최재섭·최정일 (2023). A Study on the Relationship between Characteristics of AI Recommendation System-based Fashion Subscription Service and Intention to Use. *서비스경영학회지*, 24(1), 26–54. [서지만 확인] — [DOI](https://doi.org/10.15706/jksms.2023.24.1.002)
- 안홍환 외 (2025). Generative AI VOC System Acceptance in Public Organizations: An Expectation-Reality Gap Perspective. *Information Systems Review*, 27(4), 157–183. [서지만 확인] — [DOI](https://doi.org/10.14329/isr.2025.27.4.157)
- 경단혜·구철모 외 (2026). Generative AI versus Official Guides in Museums: The Mediating Role of Perceived Understanding. *Information Systems Review*, 28(1), 129–152. 구철모 교수는 경희대 소속으로 알려져 있으나 확인하지 않음. [서지만 확인] — [DOI](https://doi.org/10.14329/isr.2026.28.1.129)
- Wang, Kim, & Kwon (2026). Empirical Validation of Information, Service, and Personal Characteristics Influencing Adoption Intentions of Generative AI Services: A Focus on ChatGPT. *Asia Pacific Journal of Information Systems(경영정보학연구)*, 36(3), 649–674. [서지만 확인] — [DOI](https://doi.org/10.14329/apjis.2026.36.3.649)
- 이은서·최련희·권오병 (2024). The Effect of Risk Communication by Generative AI Virtual Humans on the Compliance Behavior with the Safety Rules. *한국전자거래학회지*, 29(4), 49–70. [서지만 확인] — [DOI](https://doi.org/10.7838/jsebs.2024.29.4.049)
- 김계수·곽지영 (2023). Development of AI chatbot to improve public service quality and increase administrative satisfaction: Focused on Tourism AI Chatbot. *고객만족경영연구*, 25(1), 79–96. [서지만 확인] — [DOI](https://doi.org/10.34183/kcsma.25.1.4)
- 박윤주·김용겸 (2025). A Structural Relationship Analysis of How Customer Experience with AI Chatbot Services Influences Relationship Formation and Maintenance: Focusing on the Food Service Industry. *외식경영연구*, 28(5), 99–117. [서지만 확인] — [DOI](https://doi.org/10.47584/jfm.2025.28.5.99)
- (Q3 언급) 셀프서비스 키오스크가 고령층에게 '그림자 노동'과 기술스트레스를 지운다는 국내 연구(2023, 고령층 159명 설문). 원문 접속 실패로 서지 세부 미확인. — [KoreaScience JAKO202306057720491](https://koreascience.or.kr/article/JAKO202306057720491.pdf)

## 공백 (노트 02)

- [서지만 확인] 국내 논문은 Crossref에 초록이 없어 결과 방향 미확인 → KCI·DBpia에서 초록 확인 후 인용.
- 할루시네이션이 고객 신뢰에 미치는 인과효과를 실험한 JM·JSR·JOSM 논문은 찾지 못함(Larsen 등이 가장 가까움).
- IJHM·Tourism Management 생성형 AI 논문 다수는 Crossref 초록 미제공.
- 노트 02는 「지식경영연구」 DOI 접두를 찾지 못했다고 적었으나, 노트 01이 KoreaScience에서 10.15813/kmr을 확인했다. → [[papers-kmr-journal]]

