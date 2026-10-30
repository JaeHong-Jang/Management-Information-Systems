---
title: "논문: 이론 고전 (papers-classic-theory)"
tags: ["논문", "이론고전", "SECI", "고객여정", "알고리즘회피", "보정된신뢰", "지식은닉", "흡수역량", "조직기억", "S-D Logic"]
created: 2026-10-30T15:42:30.679Z
updated: 2026-10-30T15:42:30.679Z
sources: ["research_notes/지식경영학회 스마트서비스 공모전 아이디어/02_AI_고객경험_논문.md", "research_notes/지식경영학회 스마트서비스 공모전 아이디어/04_지식경영_생성형AI.md", "reports/지식경영학회 스마트서비스 공모전 아이디어.md"]
links: ["kmsk-contest-hub.md", "papers-ai-cx.md", "papers-km-genai.md", "papers-smart-tourism-hotel.md", "papers-kmr-journal.md", "pre-submission-checklist.md", "idea-1-hotel-knowledge-copilot.md", "idea-2-barrier-free-travel.md", "idea-4-lodging-dispute-prevention.md", "idea-5-emotion-handoff-cs.md", "idea-3-crowd-dispersal-curator.md", "idea-8-polypharmacy-coach.md", "idea-7-senior-screen-coach.md"]
category: pattern
confidence: high
schemaVersion: 1
---

# 논문: 이론 고전 (papers-classic-theory)

> 고객경험·서비스·AI 수용 고전(노트 02)과 지식경영 고전(노트 04)의 전체 서지와 검증 상태. 제안서의 "왜 이 과업에 이 AI인가"와 "지식경영 이론 고리"를 세우는 뼈대다.

상위: [[kmsk-contest-hub]] · 관련: [[papers-ai-cx]] · [[papers-km-genai]] · [[papers-smart-tourism-hotel]] · [[papers-kmr-journal]]

## 검증 태그 (원 노트 표기 그대로)

- 노트 02: **[고전]** 서지는 Crossref로 확인, 핵심 주장은 분야에서 널리 인용되는 결론을 요약(이번 세션에서 원문 재독 안 함). **[초록·보도자료 확인]**, **[서지 확인, 세부 결과는 원문 확인 필요]** 등은 항목별 표기.
- 노트 04: **[고전]** 널리 알려진 고전 문헌, DOI 링크는 제공했으나 이번 세션에서 원문은 열어보지 않음. **[고전/기술]**.
- 보고서 체크리스트: 고전 DOI(Polanyi, Nonaka, Connelly 등)는 이번 세션에서 원문을 열지 않았다. 최종 제출 전 DOI 링크를 한 번씩 확인할 것. → [[pre-submission-checklist]]

## 활용 틀 1: "AI 기술 적합성" 4단계 논증 (노트 02)

1. **Lemon & Verhoef**로 여정 중 어느 단계·접점의 문제인지 특정
2. **Huang & Rust 3분류**로 그 과업에 기계적·사고·감성 AI 중 무엇이 맞는지 판단
3. **Castelo 등(2019)과 Longoni 등(2019)**으로 고객이 해당 과업에서 AI를 거부할 위험 점검
4. **Lee & See(2004)** 보정된 신뢰 원칙으로 설계 장치(출처 표시, 에스컬레이션) 정당화

→ "그냥 AI를 썼다"는 비판을 피한다. 알고리즘 회피(Dietvorst)와 선호(Logg)는 모순이 아니라 과업 유형(Castelo)과 오류 경험에 따라 갈린다. 객관적·반복적 과업은 AI에게, 주관적·감정적 과업은 사람이나 하이브리드에게.

발표 자료용 공통 프레임(노트 02): 문제 = Lemon & Verhoef + 한국 통계 / 기술 적합성 = Huang & Rust + Castelo + TTF(Zhang 등 2025) / 신뢰 설계 = Lee & See + RAG·출처 표시 + 핸드오프 / 가치 = S-D Logic(Vargo & Lusch; Kaartemo & Helkkula 2024) / 수용 검증 = UTAUT2 설문.

## 활용 틀 2: KM 이론 다섯 축 (노트 04)

① 암묵지↔형식지 전환(SECI, Polanyi) ② 지식이 만들어지는 맥락 Ba ③ 지식은닉 ④ 흡수역량·지식이전의 '끈적임' ⑤ 조직기억·실천공동체.
- 생성형 AI가 가장 직접 기여하는 SECI 단계는 **표출화**(대화·음성 인터뷰로 암묵지 문서화)와 **연결화**(RAG로 형식지 결합). **공동화**(사람 간 공감)는 AI가 대체하기 어렵다 → 한계를 솔직히 적으면 이론 이해도를 보여 준다.
- 짝짓기 예: 숙련공 은퇴 ↔ 표출화·조직기억(개인 저장소 소실) / 외국인·신입 온보딩 ↔ 흡수역량·내면화(Exercising Ba) / 동료 간 노하우 공유 ↔ 지식은닉·실천공동체(war stories).

---

## A. 고객경험·서비스·AI 수용 고전 (노트 02)

### 고객경험·고객여정
- Lemon, K. N., & Verhoef, P. C. (2016). Understanding Customer Experience Throughout the Customer Journey. *Journal of Marketing*, 80(6), 69–96. CX를 인지·감정·행동·감각·사회적 반응의 다차원 개념으로 정의, 여정을 구매 전·구매·구매 후로, 접점을 브랜드 소유·파트너 소유·고객 소유·사회적/외부로 구분. [고전] — [DOI](https://doi.org/10.1509/jm.15.0420)

### 서비스지배논리·가치공동창출
- Vargo, S. L., & Lusch, R. F. (2004). Evolving to a New Dominant Logic for Marketing. *Journal of Marketing*, 68(1), 1–17. [고전] — [DOI](https://doi.org/10.1509/jmkg.68.1.1.24036)
- Vargo, S. L., & Lusch, R. F. (2008). Service-dominant logic: continuing the evolution. *Journal of the Academy of Marketing Science*, 36(1), 1–10. [고전] — [DOI](https://doi.org/10.1007/s11747-007-0069-6)
- (Kaartemo & Helkkula 2024, Kim 2026은 [서지만 확인] → [[papers-ai-cx]])

### 서비스 속 AI (Huang & Rust 계열)
- Huang, M.-H., & Rust, R. T. (2018). Artificial Intelligence in Service. *Journal of Service Research*, 21(2), 155–172. AI 지능 4유형(기계적·분석적·직관적·공감적), 직무가 아닌 과업 수준 대체. [고전] — [DOI](https://doi.org/10.1177/1094670517752459)
- Huang, M.-H., & Rust, R. T. (2021). A strategic framework for artificial intelligence in marketing. *Journal of the Academy of Marketing Science*, 49(1), 30–50. 기계적·사고·감성 AI 3분류. [고전] — [DOI](https://doi.org/10.1007/s11747-020-00749-9)
- Huang, M.-H., & Rust, R. T. (2024). The Caring Machine: Feeling AI for Customer Care. *Journal of Marketing*, 88(5), 1–23. 감정 인식 → 공감적 응답 → 감정 관리 → 정서적 연결 4단계, 미국 CMO·CCO 305명 설문. [초록·보도자료 확인] — [DOI](https://doi.org/10.1177/00222429231224748); [AMA 보도자료](https://www.ama.org/press-releases/press-release-from-the-journal-of-marketing-creating-a-machine-that-feels-and-cares-how-companies-can-use-generative-ai-for-empathetic-customer-relationships-to-create-lifetime-value/)
- Puntoni, S., Reczek, R. W., Giesler, M., & Botti, S. (2021). Consumers and Artificial Intelligence: An Experiential Perspective. *Journal of Marketing*, 85(1), 131–151. AI 경험 4유형(데이터 수집, 분류, 위임, 사회적)과 부정 경험(착취당함, 오해받음, 대체됨, 소외됨). [고전] — [DOI](https://doi.org/10.1177/0022242920953847)

### 서비스 로봇·자동화된 사회적 존재감
- Wirtz, J., Patterson, P. G., Kunz, W. H., Gruber, T., Lu, V. N., Paluch, S., & Martins, A. (2018). Brave new world: service robots in the frontline. *Journal of Service Management*, 29(5), 907–931. 서비스 로봇 수용 모형 sRAM. [고전] — [DOI](https://doi.org/10.1108/JOSM-04-2018-0119)
- van Doorn, J., Mende, M., Noble, S. M., Hulland, J., Ostrom, A. L., Grewal, D., & Petersen, J. A. (2017). Domo Arigato Mr. Roboto: Emergence of Automated Social Presence in Organizational Frontlines and Customers' Service Experiences. *Journal of Service Research*, 20(1), 43–58. [고전] — [DOI](https://doi.org/10.1177/1094670516679272)

### 기술수용 (TAM/UTAUT)
- Davis, F. D. (1989). Perceived Usefulness, Perceived Ease of Use, and User Acceptance of Information Technology. *MIS Quarterly*, 13(3), 319–340. [고전] — [DOI](https://doi.org/10.2307/249008)
- Venkatesh, V., Morris, M. G., Davis, G. B., & Davis, F. D. (2003). User Acceptance of Information Technology: Toward a Unified View. *MIS Quarterly*, 27(3), 425–478. [고전] — [DOI](https://doi.org/10.2307/30036540)
- Venkatesh, V., Thong, J. Y. L., & Xu, X. (2012). Consumer Acceptance and Use of Information Technology: Extending UTAUT (UTAUT2). *MIS Quarterly*, 36(1), 157–178. [고전] — [DOI](https://doi.org/10.2307/41410412)

### 알고리즘 회피·선호
- Dietvorst, B. J., Simmons, J. P., & Massey, C. (2015). Algorithm aversion: People erroneously avoid algorithms after seeing them err. *Journal of Experimental Psychology: General*, 144(1), 114–126. [고전] — [DOI](https://doi.org/10.1037/xge0000033)
- Logg, J. M., Minson, J. A., & Moore, D. A. (2019). Algorithm appreciation: People prefer algorithmic to human judgment. *Organizational Behavior and Human Decision Processes*, 151, 90–103. [고전] — [DOI](https://doi.org/10.1016/j.obhdp.2018.12.005)
- Castelo, N., Bos, M. W., & Lehmann, D. R. (2019). Task-Dependent Algorithm Aversion. *Journal of Marketing Research*, 56(5), 809–825. 주관적 과업에서 회피가 강하고, 과업을 객관적으로 지각시키면 회피 감소. [고전] — [DOI](https://doi.org/10.1177/0022243719851788)
- Longoni, C., Bonezzi, A., & Morewedge, C. K. (2019). Resistance to Medical Artificial Intelligence. *Journal of Consumer Research*, 46(4), 629–650. 고유성 무시(uniqueness neglect)가 저항 원인. [고전] — [DOI](https://doi.org/10.1093/jcr/ucz013)

### 의인화·신뢰·공개
- Epley, N., Waytz, A., & Cacioppo, J. T. (2007). On seeing human: A three-factor theory of anthropomorphism. *Psychological Review*, 114(4), 864–886. [고전] — [DOI](https://doi.org/10.1037/0033-295X.114.4.864)
- Blut, M., Wang, C., Wünderlich, N. V., & Brock, C. (2021). Understanding anthropomorphism in service provision: a meta-analysis of physical robots, chatbots, and other AI. *Journal of the Academy of Marketing Science*, 49(4), 632–658. [고전] — [DOI](https://doi.org/10.1007/s11747-020-00762-y)
- Lee, J. D., & See, K. A. (2004). Trust in Automation: Designing for Appropriate Reliance. *Human Factors*, 46(1), 50–80. 신뢰는 시스템 능력에 맞게 보정되어야 한다 — 할루시네이션 대응 설계의 이론적 근거. [고전] — [DOI](https://doi.org/10.1518/hfes.46.1.50_30392)
- Adam, M., Wessel, M., & Benlian, A. (2021). AI-based chatbots in customer service and their effects on user compliance. *Electronic Markets*, 31(2), 427–445. [고전] — [DOI](https://doi.org/10.1007/s12525-020-00414-7)
- Luo, X., Tong, S., Fang, Z., & Qu, Z. (2019). Frontiers: Machines vs. Humans: The Impact of Artificial Intelligence Chatbot Disclosure on Customer Purchases. *Marketing Science*, 38(6), 937–947. 대화 전 챗봇 공개 시 구매율 크게 하락. [고전] (감소 폭 약 80% 수준으로 알려짐 — 원문 재확인 필요) — [DOI](https://doi.org/10.1287/mksc.2019.1192)
- Mozafari, N., Weiger, W. H., & Hammerschmidt, M. (2022). Trust me, I'm a bot – repercussions of chatbot disclosure in different service frontline settings. *Journal of Service Management*, 33(2), 221–245. [서지 확인, 세부 결과는 원문 확인 필요] — [DOI](https://doi.org/10.1108/JOSM-10-2020-0380)
- Crolic, C., Thomaz, F., Hadi, R., & Stephen, A. T. (2022). Blame the Bot: Anthropomorphism and Anger in Customer–Chatbot Interactions. *Journal of Marketing*, 86(1), 132–148. 통신사 실데이터 1건+실험 4건. 화난 고객은 의인화 챗봇에 만족·기업평가·구매의도 낮음(기대 불일치), 챗봇이 기대를 낮추면 효과 사라짐. 분노를 먼저 감지해 비의인화 챗봇이나 상담원으로 라우팅 제안. [초록·보도자료 확인] — [DOI](https://doi.org/10.1177/00222429211045687); [Oxford SBS 요약](https://sbs.ox.ac.uk/news/chatbots-get-blame-if-they-look-too-human); [AMA](https://www.ama.org/2021/10/20/when-humanlike-chatbots-miss-the-mark-in-customer-service-interactions/)

### 선택 과부하
- Iyengar, S. S., & Lepper, M. R. (2000). When choice is demotivating: Can one desire too much of a good thing? *Journal of Personality and Social Psychology*, 79(6), 995–1006. [고전] — [DOI](https://doi.org/10.1037/0022-3514.79.6.995)
- Chernev, A., Böckenholt, U., & Goodman, J. (2015). Choice overload: A conceptual review and meta-analysis. *Journal of Consumer Psychology*, 25(2), 333–358. 선택 과부하는 조절변수에 따라 조건부로 발생. [고전] — [DOI](https://doi.org/10.1016/j.jcps.2014.08.002)

---

## B. 지식경영 고전 (노트 04)

### 암묵지와 SECI
- [고전] Polanyi (1966). *The Tacit Dimension*. Univ. of Chicago Press. "우리는 말할 수 있는 것보다 더 많이 안다." — [링크](https://press.uchicago.edu/ucp/books/book/chicago/T/bo6035368.html)
- [고전] Nonaka, I. (1994). A dynamic theory of organizational knowledge creation. *Organization Science*, 5(1), 14–37. 공동화(암→암), 표출화(암→형), 연결화(형→형), 내면화(형→암), 개인→조직 나선형 확장. — [DOI 10.1287/orsc.5.1.14](https://doi.org/10.1287/orsc.5.1.14)
- [고전] Nonaka, Toyama & Konno (2000). *Long Range Planning*, 33(1), 5–34. SECI, Ba, 지식자산, 리더십 통합. — [DOI 10.1016/S0024-6301(99)00115-6](https://doi.org/10.1016/S0024-6301%2899%2900115-6)

### Ba(場)
- [고전] Nonaka, I., & Konno, N. (1998). The concept of "Ba": Building a foundation for knowledge creation. *California Management Review*, 40(3), 40–54. 4가지 Ba: Originating(대면 공감), Interacting/Dialoguing(대화), Cyber/Systemizing(가상 공간 형식지 결합), Exercising(실습 체화). — [DOI 10.2307/41165942](https://doi.org/10.2307/41165942)
- (Burger-Helmchen 2026 "Revisiting Ba" [부분검증] → [[papers-km-genai]])

### 지식은닉
- [고전] Connelly, C. E., Zweig, D., Webster, J., & Trougakos, J. P. (2012). Knowledge hiding in organizations. *Journal of Organizational Behavior*, 33(1), 64–88. 회피적 은닉, 모르는 척, 합리화된 은닉. 지식공유 부족과 구별되는 별도 행동. — [DOI 10.1002/job.737](https://doi.org/10.1002/job.737)

### 흡수역량·지식이전의 끈적임
- [고전] Cohen, W. M., & Levinthal, D. A. (1990). Absorptive capacity: A new perspective on learning and innovation. *Administrative Science Quarterly*, 35(1), 128–152. 사전지식에 의존 → 사전지식이 적은 신입·외국인에게 같은 매뉴얼도 흡수되지 않는다는 논리. — [DOI 10.2307/2393553](https://doi.org/10.2307/2393553)
- [고전] Szulanski, G. (1996). Exploring internal stickiness. *Strategic Management Journal*, 17(S2), 27–43. 수용자 흡수역량 부족, 인과적 모호성, 전달자-수용자 관계 어려움. — [DOI 10.1002/smj.4250171105](https://doi.org/10.1002/smj.4250171105)

### 실천공동체·조직기억
- [고전] Lave & Wenger (1991). *Situated Learning*. Cambridge Univ. Press. 정당한 주변적 참여. — [DOI](https://doi.org/10.1017/CBO9780511815355)
- [고전] Wenger (1998). *Communities of Practice*. — [DOI](https://doi.org/10.1017/CBO9780511803932)
- [고전] Brown, J. S., & Duguid, P. (1991). Organizational learning and communities-of-practice. *Organization Science*, 2(1), 40–57. 제록스 수리기사(Orr의 민족지), 매뉴얼과 실제 업무의 간극, 'war stories'. 현장 지식은 서사로 유통된다. — [DOI 10.1287/orsc.2.1.40](https://doi.org/10.1287/orsc.2.1.40)
- [고전] Walsh, J. P., & Ungson, G. R. (1991). Organizational memory. *Academy of Management Review*, 16(1), 57–91. 저장소: 개인, 문화, 변환(절차), 구조, 생태, 외부 아카이브. 개인 저장소는 이직·은퇴와 함께 사라진다. — [DOI 10.5465/amr.1991.4278992](https://doi.org/10.5465/amr.1991.4278992)
- [고전] Alavi, M., & Leidner, D. E. (2001). Knowledge management and knowledge management systems. *MIS Quarterly*, 25(1), 107–136. KM 4과정: 창출, 저장/검색, 이전, 적용. — [DOI 10.2307/3250961](https://doi.org/10.2307/3250961)

### 이직·은퇴에 따른 지식손실
- [고전] DeLong, D. W. (2004). *Lost Knowledge: Confronting the Threat of an Aging Workforce*. Oxford University Press. — [DOI 10.1093/acprof:oso/9780195170979.001.0001](https://doi.org/10.1093/acprof:oso/9780195170979.001.0001)

### 기술 기반
- [고전/기술] Lewis 외 (2020). Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks. NeurIPS 2020. 파라메트릭 기억 + 외부 문서 검색(비파라메트릭 기억). 조직 매뉴얼·사례 DB를 '조직기억'으로 연결하는 기술 기반. — [arXiv 2005.11401](https://arxiv.org/abs/2005.11401)

## 어떤 아이디어에 쓰이나

- SECI·war stories·흡수역량·지식은닉·조직기억 → [[idea-1-hotel-knowledge-copilot]]
- Castelo·Lee & See·실천공동체·S-D Logic → [[idea-2-barrier-free-travel]]
- Walsh & Ungson(외부 아카이브)·Lemon & Verhoef → [[idea-4-lodging-dispute-prevention]]
- Crolic·Luo·Mozafari → [[idea-5-emotion-handoff-cs]]
- Chernev → [[idea-3-crowd-dispersal-curator]] · Longoni → [[idea-8-polypharmacy-coach]] · Castelo → [[idea-7-senior-screen-coach]]

