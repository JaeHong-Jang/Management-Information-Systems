---
title: "논문: 스마트관광·호텔·관광약자 (papers-smart-tourism-hotel)"
tags: ["논문", "스마트관광", "스마트호텔", "서비스로봇", "관광약자", "오버투어리즘", "ChatGPT여행계획", "Gretzel", "KCI"]
created: 2026-10-30T15:44:46.928Z
updated: 2026-10-30T15:44:46.928Z
sources: ["research_notes/지식경영학회 스마트서비스 공모전 아이디어/03_스마트관광_호텔.md", "reports/지식경영학회 스마트서비스 공모전 아이디어.md"]
links: ["kmsk-contest-hub.md", "papers-ai-cx.md", "papers-kmr-journal.md", "kmsk-society-judges.md", "idea-2-barrier-free-travel.md", "idea-3-crowd-dispersal-curator.md", "idea-1-hotel-knowledge-copilot.md", "topics-to-avoid.md", "pre-submission-checklist.md"]
category: pattern
confidence: medium
schemaVersion: 1
---

# 논문: 스마트관광·호텔·관광약자 (papers-smart-tourism-hotel)

> 스마트관광 기초, 생성형 AI 여행계획과 신뢰, 스마트호텔·서비스로봇, 관광약자(무장애), 오버투어리즘, 국내 KCI 논문의 서지(노트 03). 심사진(경희대 스마트관광원) 언어와 맞추기 위한 문헌.

상위: [[kmsk-contest-hub]] · 관련: [[papers-ai-cx]] · [[papers-kmr-journal]] · [[kmsk-society-judges]]

## 검증 상태

- 노트 03: 웹 검색 약 20회. **검색 결과에서 제목·저자·학술지·DOI/URL을 직접 확인한 것만** 실었다. 노트 03은 항목별 태그를 달지 않았고, 보고서 부록 D는 이를 **[검색결과 서지]**(검색 결과에서 제목·학술지·DOI/URL 확인)로 표기했다. 아래 태그는 보고서 표기를 따른다.
- 프리프린트는 **[프리프린트]**(동료심사 전). 경단혜·구철모 외, 김계수·곽지영은 노트 02 기준 **[서지만 확인]**.
- 번호(#)는 노트 03 Q1의 원 번호다.

## 핵심 시사점 (노트 03 추론)

- **심사위원 연결고리**: Gretzel et al.(2015)이 경희대 성과로 등재(공저자 Koo). 제안서 이론 배경에 Gretzel et al.(2015)과 Buhalis & Amaranggana(2015)의 "개인화된 스마트 목적지"를 넣어 심사진 언어와 맞춘다. → [[kmsk-society-judges]]
- **생성형 AI 여행계획 연구는 "신뢰·오류·윤리"로 수렴**(#6, #7, #8, #10) → 공공데이터 RAG, 제약 충족 검증(#13), 출처 표시로 "신뢰 가능한 AI 일정"을 내세운다. → [[idea-2-barrier-free-travel]], [[idea-3-crowd-dispersal-curator]]
- **서비스로봇 수용 연구는 메타분석(#15)까지 나온 성숙 분야** → 하드웨어보다 소프트웨어(AI 백오피스·다국어 응대). 진각영·정남호(#27) "양가적 수용"은 사람 대 AI 하이브리드 설계 근거. → [[idea-1-hotel-knowledge-copilot]], [[topics-to-avoid]]
- **관광약자 × AI는 스코핑 리뷰(#23)가 "이제 막 등장"이라 명시한 공백 영역** → 차별성 점수에 유리.

---

## A. 스마트관광 기초 (고전)

1. Gretzel, U., Sigala, M., Xiang, Z., & Koo, C. (2015). Smart tourism: foundations and developments. *Electronic Markets*, 25(3), 179–188. DOI 10.1007/s12525-015-0196-8. 스마트관광 개념 정의의 모호성이 이론 발전을 막는다고 지적하는 포지션 페이퍼, 기술적·비즈니스적 기반 정리. 경희대 연구성과 DB(Elsevier Pure)에 등재. [검색결과 서지] — [Springer](https://link.springer.com/article/10.1007/s12525-015-0196-8); [Kyung Hee Univ. Pure](https://khu.elsevierpure.com/en/publications/smart-tourism-foundations-and-developments/)
2. "AI-powered smart tourism 2.0: A 10-year retrospective and updated model", *Electronic Markets* (2025). DOI 10.1007/s12525-025-00847-y. Gretzel et al.(2015)의 Google Scholar 피인용이 3,000회를 넘는다고 적음. [검색결과 서지] (**저자 미확인**) — [Springer](https://link.springer.com/article/10.1007/s12525-025-00847-y)
3. Buhalis, D., & Amaranggana, A. (2015). Smart Tourism Destinations Enhancing Tourism Experience Through Personalisation of Services. In Tussyadiah & Inversini (eds.), *Information and Communication Technologies in Tourism 2015*, Springer, pp. 377–389. DOI 10.1007/978-3-319-14343-9_28. [검색결과 서지] — [Springer](https://link.springer.com/chapter/10.1007/978-3-319-14343-9_28)
   - 선행 버전: Buhalis & Amaranggana (2014), Smart Tourism Destinations, *ICT in Tourism 2014*, pp. 553–564, DOI 10.1007/978-3-319-03973-2_40. — [Springer](https://link.springer.com/chapter/10.1007/978-3-319-03973-2_40)
4. Tussyadiah, I. (2020). A review of research into automation in tourism: Launching the Annals of Tourism Research Curated Collection on Artificial Intelligence and Robotics in Tourism. *Annals of Tourism Research*, 81, 102883. DOI 10.1016/j.annals.2020.102883 (오픈액세스). [검색결과 서지] — [ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S016073832030027X); [Surrey repository](https://openresearch.surrey.ac.uk/esploro/outputs/journalArticle/A-review-of-research-into-automation/99515172702346)

## B. 생성형 AI·ChatGPT 기반 여행계획과 신뢰 (2023–2026)

5. Wong, I. A., Lian, Q. L., & Sun, D. (2023). Autonomous travel decision-making: An early glimpse into ChatGPT and generative AI. *Journal of Hospitality and Tourism Management*, 56, 253–263. DOI 10.1016/j.jhtm.2023.06.022. [검색결과 서지] — [Semantic Scholar](https://www.semanticscholar.org/paper/Autonomous-travel-decision-making:-An-early-glimpse-Wong-Lian/fb0a138e8b39bb55745e81122b313e7ceae573c8)
6. Kim, Kim, Kim & Hailu (2024). Effects of AI ChatGPT on travelers' travel decision-making. *Tourism Review*, 79(5), 1038–1057. DOI 10.1108/TR-07-2023-0489. ChatGPT 오류가 여행 의사결정에 미치는 영향. [검색결과 서지] — [PolyU Scholars Hub](https://research.polyu.edu.hk/en/publications/effects-of-ai-chatgpt-on-travelers-travel-decision-making)
7. "Do you trust ChatGPTs? Effects of the ethical and quality issues of generative AI on travel decisions", *Journal of Travel & Tourism Marketing* (2023/2024 온라인). DOI 10.1080/10548408.2023.2293006. [검색결과 서지] (**저자 미확인**) — [Taylor & Francis](https://www.tandfonline.com/doi/full/10.1080/10548408.2023.2293006)
8. "Extending UTAUT2 to explore intention to use ChatGPT for travel planning: a hybrid PLS-ANN approach", *Journal of Tourism Futures*. DOI 10.1108/JTF-11-2023-0256. [검색결과 서지] — [Emerald](https://www.emerald.com/jtf/article/doi/10.1108/JTF-11-2023-0256/1256475/Extending-UTAUT2-to-explore-intention-to-use)
9. "Understanding the impact of ChatGPT on tourism and hospitality: Trends, prospects and research agenda", *Journal of Hospitality and Tourism Management* (2024). DOI 10.1016/j.jhtm.2024.08.004. [검색결과 서지] — [ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S144767702400086X)
10. Halibas, A. S., Hiele, T. M., Pang, J. M., & Yap, S. T. L. (2026). I can't travel without ChatGPT: Trends, insights, and future research directions of Gen AI in travel planning. *Tourism and Hospitality Research*. DOI 10.1177/14673584261446307. [검색결과 서지] — [SAGE](https://doi.org/10.1177/14673584261446307)
11. "ChatGPT and tourism academia", *Annals of Tourism Research* (2023). (**저자 미확인**) — [ScienceDirect](https://sciencedirect.com/science/article/abs/pii/S0160738323000178)
12. "Analysing how AI-powered chatbots influence destination decisions" (PMC 게재, Wong et al. 2023 인용). — [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC11893117)
13. 관련 공학 연구 [프리프린트]: **TRIP-PAL** — LLM과 자동계획기를 결합해 여행계획의 제약조건 충족 보장(arXiv 2406.10196). **AlterAtlas** — AI 일정 "생성"에서 페르소나 시뮬레이션 기반 "검증"으로 관점 이동(arXiv 2607.16565). — [TRIP-PAL](https://arxiv.org/pdf/2406.10196); [AlterAtlas](https://arxiv.org/pdf/2607.16565)
14. 관광 RAG 챗봇의 프롬프트 인젝션 방어 사례(대만 신주): RAG 기반 스마트관광 고객서비스 챗봇 설계와 보안. [프리프린트] — [arXiv 2509.21367](https://arxiv.org/pdf/2509.21367)

## C. 스마트호텔·서비스로봇 (해외)

15. Begum et al. (2025). Consumers acceptance of service robots in hotels: A meta-analytic review. *International Journal of Hospitality Management*, 126, 104052. DOI 10.1016/j.ijhm.2024.104052. 태도, 고객 감정, 지각된 사회적 존재감이 핵심 수용 요인. [검색결과 서지] — [QUB PDF](https://pureadmin.qub.ac.uk/ws/portalfiles/portal/622719931/Begum_et_al_2025_-_IJHM.pdf)
16. Said et al. (2024). Customer acceptance of humanoid service robots in hotels: moderating effects of service voluntariness and culture. *IJCHM*, 36(6), 1844–. DOI 10.1108/IJCHM-12-2022-1523. 일본·미국 호텔 고객 395명. [검색결과 서지] — [Emerald](https://www.emerald.com/ijchm/article-abstract/36/6/1844/1212343/Customer-acceptance-of-humanoid-service-robots-in?redirectedFrom=fulltext)
17. "Understanding the drivers of consumers' acceptance and use of service robots in the hotel industry", *IJCHM*, 37(2), 541– (2025). DOI 10.1108/IJCHM-02-2024-0163. [검색결과 서지] — [Emerald](https://doi.org/10.1108/IJCHM-02-2024-0163)
18. "Pursuing the drivers of consumer behaviour toward service robots in the hotel industry", *IJHM* (2024). — [ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S0278431924000641)
19. "Are you ready for robot services? Exploring robot-service adoption behaviors of hotel-goers", *IJHM* (2022). — [ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S0278431922002705)
20. "The Value of Service Robots from the Hotel Guest's Perspective: A Mixed-Method Approach", *IJHM* (2021). — [ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S0278431921000190)

## D. 관광약자(무장애·접근가능 관광)와 기술

21. Domínguez Vila, T., Rubio-Escuderos, L., & Alén González, E. (2024). Accessible tourism: using technology to increase social equality for people with disabilities. *Tourism Review*. DOI 10.1108/TR-11-2023-0812. 장애인에게 공평한 온라인 정보 접근이 여전히 큰 과제. [검색결과 서지] — [Emerald](https://www.emerald.com/insight/content/doi/10.1108/tr-11-2023-0812/full/html)
22. Ali, F., Cain, L., Legendre, T. S., & Wu, L. (2023). The Intersection of Technology, Accessible Tourism and Tourists With Intellectual Disabilities: Proposing a Novel Conceptual Framework. *Journal of Hospitality & Tourism Research*. DOI 10.1177/10963480221142499. [검색결과 서지] — [SAGE](https://journals.sagepub.com/doi/10.1177/10963480221142499)
23. Sugden, Lewis, Small & Wood (2026). Experiences of consuming and supplying accessible tourism for people with disabilities: A scoping review and agenda for future research. *Tourism Management Perspectives*. 177편 검토, 기존 연구는 "웹사이트 정보 제공" 위주, VR·AI 장애 관광객 지원 연구는 이제 막 등장. [검색결과 서지] — [ScienceDirect](https://www.sciencedirect.com/science/article/pii/S221197362600067X)
24. Rielander (2025). Accessible and Inclusive Tourism for Persons with Hidden Disabilities: A Systematic Literature Review. *Journal of Tourism, Sustainability and Well-Being*, 13(3), 189–205. DOI 10.34623/fcam-mw21. [검색결과 서지] — [JTSW](https://journals.cinturs.pt/index.php/jtsw/article/view/614)

## E. 오버투어리즘·혼잡

25. "Tourist Experiences at Overcrowded Attractions: A Text Analytics Approach" (PMC). UGC 텍스트 분석으로 혼잡 경험 분석. [검색결과 서지] — [PMC7798079](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7798079/)
26. "Use of Artificial Intelligence in Controlling Overtourism: A Case of Nainital City" (Springer 챕터, 2026). 센서 군중 통제, 관광카드, AI 주차, 모바일 앱 프레임워크 "제안"(효과 평가 아님). — [Springer](https://link.springer.com/chapter/10.1007/978-981-96-5794-0_8)

## F. 국내 논문 (KCI 등)

27. 진각영·정남호 (2024). 스마트호텔의 인공지능 서비스에 대한 양가적 수용행동에 영향을 미치는 이용동기와 만족의 역할. *관광연구저널*, 38(3). [검색결과 서지] — [KCI](https://www.kci.go.kr/kciportal/ci/sereArticleSearch/ciSereArtiView.kci?sereArticleSearchBean.artiId=ART003128111)
28. 정지혜·윤지환 (2024). 호텔 AI 서비스로봇의 서비스품질이 호텔 이미지와 고객 만족에 미치는 영향. *관광진흥연구*, 12(4), 329–351. [검색결과 서지] — [KCI](https://www.kci.go.kr/kciportal/ci/sereArticleSearch/ciSereArtiView.kci?sereArticleSearchBean.artiId=ART003140970)
29. (2024). 인공지능 기반 호텔 서비스 로봇에 대한 고객 경험과 브랜드 충성도에 관한 연구. *경영정보학연구*, 26(4), 237–263. [검색결과 서지] (**저자 미확인**) — [KCI](https://www.kci.go.kr/kciportal/ci/sereArticleSearch/ciSereArtiView.kci?sereArticleSearchBean.artiId=ART003142146)
30. 김범진·황조혜 (2023). 호텔 서비스 로봇의 의인화 수준이 로봇 서비스품질 기대에 미치는 영향: 가젯 러빙 성향의 조절효과. *관광학연구*, 47(2). [검색결과 서지] — [KCI](https://www.kci.go.kr/kciportal/ci/sereArticleSearch/ciSereArtiView.kci?sereArticleSearchBean.artiId=ART002945331)
31. 이예솔·이충훈 (2023). 호텔 서비스 로봇의 사용성이 고객 만족과 재사용 의도에 미치는 영향. *유통경영학회지*, 26(5). — [KCI](https://www.kci.go.kr/kciportal/ci/sereArticleSearch/ciSereArtiView.kci?sereArticleSearchBean.artiId=ART003015936)
32. 최현준·강희석·허종국 (2023). 엔데믹시대의 호텔 종업원이 인식하는 로봇서비스 도입에 관한 정책 연구. *한국엔터테인먼트산업학회논문지*, 17(4). [검색결과 서지] — [KCI](https://www.kci.go.kr/kciportal/ci/sereArticleSearch/ciSereArtiView.kci?sereArticleSearchBean.artiId=ART002976641)
33. 진홍우·오현정·이상준 (2023). 스마트 관광 혁신을 위한 ChatGPT: 생성형 AI를 활용한 서비스 품질 개선 연구. *정보화연구*, 20(4). [검색결과 서지] — [KCI](https://www.kci.go.kr/kciportal/ci/sereArticleSearch/ciSereArtiView.kci?sereArticleSearchBean.artiId=ART003030157)
34. 장원중 (2023). 관광 빅데이터와 인공지능 기술을 활용한 스마트관광 활성화 방안 제언: 강원지역 사례를 중심으로. *아시아태평양융합연구교류논문지*, 9(4). — [KCI](https://www.kci.go.kr/kciportal/ci/sereArticleSearch/ciSereArtiView.kci?sereArticleSearchBean.artiId=ART002953783)
35. 관광분야 생성형 AI ChatGPT 패러다임 탐색을 위한 의미연결망 분석 연구 (2023). *디지털산업정보학회지*. — [KoreaScience](https://www.koreascience.kr/article/JAKO202303847941223.page)
36. ChatGPT를 활용한 액티브 시니어 여행 인식 연구 (2024). *디지털산업정보학회지*. — [KoreaScience](https://koreascience.kr/article/JAKO202429145953724.page)
37. 비정형 빅데이터 분석을 활용한 무장애 관광 인식 탐색 연구 (2025). — [KoreaScience PDF](https://koreascience.kr/article/JAKO202519139605707.pdf)
38. 한국관광공사 API를 활용한 무장애 여행 일정 시스템 (DBpia). 학부 수준에서도 TourAPI로 무장애 일정 시스템 구현 가능하다는 선례. [검색결과 서지] — [DBpia](https://www.dbpia.co.kr/journal/articleDetail?nodeId=NODE11485630)
39. 우은주·김영국·남장현 (2017). 투어리스트피케이션 현상이 지역주민의 삶에 미치는 영향에 대한 정성적 연구: 북촌한옥마을과 이화벽화마을 사례를 중심으로 (KCI). 주민 15명 심층면접, 공동체·경제·건강·안전 생활 전반 부정적 영향. [검색결과 서지] — [KCI](https://www.kci.go.kr/kciportal/ci/sereArticleSearch/ciSereArtiView.kci?sereArticleSearchBean.artiId=ART002290297)
40. 국토연구원 WP 19-15. 오버투어리즘으로 인한 지역공동체 갈등 해결 사례연구: 부산 감천문화마을. 관광 수익 주민 환원 모델 제안. [검색결과 서지] — [KRIHS](https://www.krihs.re.kr/board.es?mid=a10607000000&bid=0008&list_no=345810&act=view)
41. 서울연구원 (2016). 투어리스티피케이션 현상에 의한 지역주민 갈등관리 연구. [검색결과 서지] — [서울연구원 PDF](https://www.si.re.kr/sites/default/files/smallresearch/2016-CR-06-06.pdf)

### 관광·문화 관련 국내 논문 (노트 02, 전체 서지는 [[papers-ai-cx]])

- 경단혜·구철모 외 (2026). Generative AI versus Official Guides in Museums. *Information Systems Review*, 28(1), 129–152. [서지만 확인] — [DOI](https://doi.org/10.14329/isr.2026.28.1.129)
- 김계수·곽지영 (2023). 관광 공공 AI 챗봇. *고객만족경영연구*, 25(1), 79–96. [서지만 확인] — [DOI](https://doi.org/10.34183/kcsma.25.1.4)

### 「지식경영연구」 관광·호스피탈리티 논문 → [[papers-kmr-journal]]

## 공백 (노트 03)

- Koens, Postma & Papp(2018), Ivanov & Webster, Gursoy et al.(2023), Carvalho & Ivanov(2024), Buhalis 외 2019 등 자주 인용되는 고전은 서지를 직접 확인하지 못해 목록에서 뺐다. 쓰려면 DOI 별도 확인.
- 호텔경영학연구·지식경영연구의 2023–2026 관광 AI 논문은 노트 03 검색에서 나오지 않았다(노트 01이 KMR 목차로 보완).
- 저자명 미확인: Annals 2023 "ChatGPT and tourism academia", JTTM "Do you trust ChatGPTs?", 경영정보학연구 26(4), Electronic Markets 2025 회고. → [[pre-submission-checklist]]
- 2023–2026 국내 오버투어리즘·주민 갈등 KCI 논문은 찾지 못했다(2016–2019 연구뿐).

