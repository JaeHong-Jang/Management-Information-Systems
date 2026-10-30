---
title: "논문: 지식경영 × 생성형 AI (papers-km-genai)"
tags: ["논문", "지식경영", "생성형AI", "SECI재해석", "암묵지", "생산성실증", "jagged frontier", "RAG", "탈숙련"]
created: 2026-10-30T15:45:43.180Z
updated: 2026-10-30T15:45:43.180Z
sources: ["research_notes/지식경영학회 스마트서비스 공모전 아이디어/04_지식경영_생성형AI.md", "reports/지식경영학회 스마트서비스 공모전 아이디어.md"]
links: ["kmsk-contest-hub.md", "papers-classic-theory.md", "papers-ai-cx.md", "papers-kmr-journal.md", "idea-1-hotel-knowledge-copilot.md", "pre-submission-checklist.md"]
category: pattern
confidence: medium
schemaVersion: 1
---

# 논문: 지식경영 × 생성형 AI (papers-km-genai)

> 2023–2026 생성형 AI·LLM·RAG × 지식경영 연구(생산성 실증, KM 이론 재해석, 암묵지 포착 도구, 국내 연구)의 서지와 검증 상태(노트 04). 공통 메시지: 생성형 AI는 숙련자의 암묵지를 초보자에게 전파하는 지식이전 장치로 작동하며, 이득은 저숙련·신입에게 가장 크다.

상위: [[kmsk-contest-hub]] · 관련: [[papers-classic-theory]] · [[papers-ai-cx]] · [[papers-kmr-journal]] · [[idea-1-hotel-knowledge-copilot]]

## 검증 태그 (노트 04 표기 그대로)

- **[검증]** 이번 세션 검색으로 서지/수치 확인
- **[고전]** 널리 알려진 고전 문헌, DOI 링크는 제공했으나 이번 세션에서 원문은 열어보지 않음
- **[부분검증]** 일부 정보만 확인
- **[부분검증, 프리프린트]**, **[부분검증, 언론 인용]**, **[고전/기술]** 등 복합 표기는 원문대로

## 시사점 (노트 04 추론)

- Brynjolfsson 연구의 KM 번역: "**AI가 고성과자의 암묵지를 형식화·전파하는 지식이전 매개체**". 신입 비중·이직이 높은 한국 콜센터, 호텔 프런트, 민원 창구에 적용 가능. "영어 유창성, 국제 상담원" 결과는 외국인 근로자 한국어 업무 의사소통 지원의 해외 실증 근거.
- Jagged frontier → "AI가 잘하는/못하는 과업의 경계를 조직이 관리해야 한다" → **모를 때는 사람(숙련자)에게 넘기는 에스컬레이션 + 사람 피드백이 지식베이스로 들어가는 루프**.
- Alavi 외(2024)의 **주니어 소외·과의존** 위험(탈숙련의 KM 버전) → "정답 대신 단계별 힌트로 내면화를 유도하는 모드".
- Cybernetic Teammate(개인+AI ≈ 팀, 사일로 완화) → 팀이 없거나 혼자 일하는 SME 현장에서 AI가 '가상 동료(Ba의 대화 상대)'.
- 공통 설계 원칙 셋: ① 암묵지 표출화는 대화형·음성 인터뷰 ② 저장 지식은 RAG로 현장 질문에 연결 ③ AI가 모르는 영역은 사람 숙련자에게 에스컬레이션하고 답을 환류.
- 모든 아이디어의 위험 관리 포인트: 과의존과 주니어 탈숙련(Alavi 외 2024), 경계 밖 과업의 오답(Dell'Acqua 외), 민감정보 유출.

---

## A. 생산성·지식이전 실증 (현장 실험)

- [검증] Brynjolfsson, Li & Raymond, "Generative AI at Work". NBER Working Paper No. 31161(2023) → *Quarterly Journal of Economics*, 140(2), 889–942(2025), DOI 10.1093/qje/qjae044. 고객지원 상담원 **5,172명**(노트 04 기준; 노트 02는 5,179명) 단계적 도입 자연실험. — [IDEAS/RePEc QJE 서지](https://ideas.repec.org/a/oup/qjecon/v140y2025i2p889-942..html); [NBER w31161 PDF](https://www.nber.org/system/files/working_papers/w31161/w31161.pdf); [Stanford GSB](https://www.gsb.stanford.edu/faculty-research/publications/generative-ai-work)
  - 시간당 해결 건수 평균 **14% 증가**(NBER WP 2023 기준), 초보·저숙련 상담원에게 가장 큰 효과, **고성과자의 잠재적 암묵지(potentially tacit knowledge) 전파**의 시사적 증거.
  - **주의(수치 불일치)**: QJE 게재본 요약은 **15%**라는 2차 출처 → "14%(WP)/15%(QJE 게재본)" 구분하거나 게재본 수치 사용.
  - 게재본 초록: AI 지원이 근로자 학습과 **영어 유창성**을 도움, **국제(해외) 상담원**에게 효과 큼, '중간 정도로 드문 문제'에서 이득 최대, 고객이 더 정중해지고 관리자 연결 요구 감소. — [academicnewsletter.sufe.edu.cn (QJE 초록 전재)](https://academicnewsletter.sufe.edu.cn/info/344659)
  - 표본 기업 "Fortune 500 소프트웨어 기업" 대 "대형 온라인 리테일러" 엇갈림 — 원문 확인 필요. — [Benefit News](https://benefitnews.com/articles/generative-ai-boosts-worker-productivity-14-study-finds)
  - 노트 02 표기는 [초록 확인]. → [[papers-ai-cx]] · 확인 과제 → [[pre-submission-checklist]]
- [부분검증] Dell'Acqua, McFowland, Mollick, Lifshitz-Assaf, Kellogg 외, "Navigating the Jagged Technological Frontier: Field Experimental Evidence of the Effects of AI on Knowledge Worker Productivity and Quality". HBS Working Paper 24-013 / SSRN 4573321(2023). 2차 목록에 따르면 *Organization Science*(DOI 10.1287/orsc.2025.21838, 2026) 게재. — [SSRN 4573321](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4573321); [ablesci 서지 목록(2차)](https://www.ablesci.com/assist/detail?id=Xzyooj)
  - 널리 인용되는 수치: 경계 **안쪽** 과업 완료 12.2% 증가, 속도 25.1% 향상, 품질 40% 이상 향상. 경계 **바깥**에서는 정답률 하락. **이번 세션에서 원문으로 확인하지 못함 — 인용 전 SSRN 원문 대조 필요.**
- [검증] Dell'Acqua 외(2025), "The Cybernetic Teammate: A Field Experiment on Generative AI Reshaping Teamwork and Expertise", NBER WP 33641 / SSRN 5188231. P&G 전문가 776명 사전등록 현장실험. **AI를 쓴 개인이 AI 없는 팀과 같은 성과**, R&D·상업 부문 **전문성 사일로 완화**, 긍정적 정서 반응 증가. 한 출판사 목록은 *Organization Science* 2026년 6월 게재 예정 표기. — [NBER w33641](https://www.nber.org/papers/w33641); [SSRN 5188231](https://papers.ssrn.com/abstract=5188231)
- [검증] Noy & Zhang(2023), "Experimental evidence on the productivity effects of generative artificial intelligence", *Science*, 381(6654), 187–192, DOI 10.1126/science.adh2586. 글쓰기 과업에서 **소요시간 40% 감소, 품질 18% 향상**, 근로자 간 격차 축소. WP 기준 대졸 전문직 444명(일부 2차 출처 453명). — [DOI](https://doi.org/10.1126/science.adh2586); [MIT WP PDF](https://economics.mit.edu/sites/default/files/inline-files/Noy_Zhang_1_0.pdf); [Stanford SCALE 요약](https://scale.stanford.edu/publications/experimental-evidence-productivity-effects-generative-artificial-intelligence)

## B. KM 이론 관점의 생성형 AI 연구

- [검증] Alavi, Leidner & Mousavi(2024), "A Knowledge Management Perspective of Generative Artificial Intelligence", *JAIS*, 25(1), 1–12, DOI 10.17705/1jais.00859. KM 4과정으로 GenAI 분석: 창출 — 정보처리·학습 강화하나 인간 상호작용 감소로 **주니어 지식근로자 소외 우려**; 저장/검색 — 인간 암묵지와 AI 생성 형식지의 균형; 이전 — 교육·학습문화 지원과 함께 과의존·민감정보 유출 위험; 적용 — 생산성과 함께 오적용·지재권·윤리 문제. (초록·2차 인용 기반, 전문 미확인) 보고서 표기 "[검증] (초록·2차 인용 기반)". — [AIS eLibrary](https://aisel.aisnet.org/jais/vol25/iss1/15/)
- [부분검증] 같은 JAIS 특별호(생성형 AI와 지식노동)에 Benbya, Strich & Tamm의 지식·창의 노동에서 GenAI의 약속과 위험 논문. 정확한 제목·DOI 미확인. — [JAIS 특별호 안내 PDF](https://aisel.aisnet.org/jais/SI_GenerativeAIKnowlegeWork.pdf); [AIS 공지](https://aisnet.org/news/661545/JAIS-Announces-January---February-Issue-Now-Available.htm)
- [검증] Liccardo, Cerchione & Trabucco Aurilio(2026), "Framing SECI model through an artificial knowledge generation perspective: a case study analysis in the GenAI era", *Journal of Knowledge Management*, DOI 10.1108/JKM-02-2026-0365. 사이버보안 기업 사례, GenAI가 SECI 4단계 모두에 영향, '인공 지식 생성'으로 개념화, 암묵지는 여전히 인간 차원. — [Emerald DOI](https://doi.org/10.1108/JKM-02-2026-0365)
- [부분검증] Burger-Helmchen(2026), "Revisiting Ba", *JKM*, vol. 30, pp. 846–869. 생성형 AI가 Ba 맥락의 지식창조를 어떻게 바꾸는지. 참고문헌 목록에서만 확인, 초록 미확인. — [Liccardo et al. 2026 JKM 페이지](https://doi.org/10.1108/JKM-02-2026-0365)
- [부분검증] VINE Journal of Information and Knowledge Management Systems(2024) "Knowledge management in the age of generative artificial intelligence"(DOI 10.1108/VJIKMS-10-2024-0357). SECI 수정, 'GRAI' 확장 제안. 검색 요약상 저자 Durst이나 원문 미확인. — [Emerald](https://www.emerald.com/insight/content/doi/10.1108/vjikms-10-2024-0357/full/html); [ResearchGate "Time for Revisiting SECI"](https://www.researchgate.net/publication/381259232_Knowledge_Management_in_the_Age_of_Generative_Artificial_Intelligence_Time_for_Revisiting_SECI)
- [부분검증] Matsumoto, Nishikawa & Morimoto(2024, KES 학술대회), "Human-AI-Collaboration SECI Model". LLM으로 전문가 암묵지를 이전하는 HAC-SECI. — [Tokyo Univ. of Science 연구DB](https://tus.elsevierpure.com/en/publications/human-ai-collaboration-seci-model-the-knowledge-management-model-/)
- [부분검증, 프리프린트] "Tacit Knowledge Management with Generative AI: Proposal of the GenAI SECI Model"(arXiv 2603.21866, 2026). '디지털 파편 지식' 개념으로 SECI 재설계. — [arXiv PDF](https://arxiv.org/pdf/2603.21866)
- [부분검증, 프리프린트] AquiLLM(arXiv 2508.05648, 2025). 연구 그룹 암묵지를 포착하는 경량 모듈식 RAG 도구, 내부자료 프라이버시 고려. — [alphaxiv](https://www.alphaxiv.org/ko/abs/2508.05648)
- [부분검증] 2025년 arXiv 연구(암묵지 보존 에이전트): 신뢰 부족 때문에 암묵지 공유를 꺼리는 문제를 RAG + 사고연쇄(CoT) '사회적 상호작용 에이전트'로 보존·이전 시도(동료심사 전 프리프린트). — [arXiv 2508.19942](https://www.alphaxiv.org/ko/abs/2508.19942)

## C. 기술 기반 (RAG)

- [고전/기술] Lewis 외(2020) RAG, NeurIPS 2020. → [[papers-classic-theory]]
- [검증] 국내 RAG 기술 동향 리뷰: 「생성형 AI를 위한 Retrieval-Augmented Generation(RAG) 기술 동향 및 전망」(컴퓨터교육학회 논문지, 2025, 28(2)). — [KCI](https://www.kci.go.kr/kciportal/ci/sereArticleSearch/ciSereArtiView.kci?sereArticleSearchBean.artiId=ART003176569)
- KMR 정천수(2024) Advanced RAG·Graph Agent → [[papers-kmr-journal]]

## D. 국내 학술지·보고서

- [검증] 노환호·김현정·김민진(2024), 「한국형 생성 인공지능 리터러시 척도 개발 및 타당화」, *지식경영연구*, 25(3), 145–171. — [KCI](https://www.kci.go.kr/kciportal/ci/sereArticleSearch/ciSereArtiView.kci?sereArticleSearchBean.artiId=ART003120476)
- [검증] 「생성형 AI에 대한 신뢰와 구매의도: 촉진과 억제요인 중심으로」(박대성 외), *지식경영연구*, 26(3), 175–202(2025). — [KCI](https://www.kci.go.kr/kciportal/ci/sereArticleSearch/ciSereArtiView.kci?sereArticleSearchBean.artiId=ART003248276)
- [검증] *지식경영연구*는 KCI 등재지, KCI 2024년 분야 순위 18/104(Q1). — [KCI 학술지 정보](https://www.kci.go.kr/kciportal/po/search/poCitaView.kci?sereId=001510)
- [부분검증] *경영정보학연구(Information Systems Review)* 27(2), 2025년 5월(DOI 10.14329/isr.2025.27.2.149): 김용영의 연구, **고용센터 취업상담사 업무를 지원하는 생성형 AI 플랫폼**. 정확한 논문 제목은 PDF 텍스트 추출 실패로 미확인. (보고서 표기: 김용영 (2025), *경영정보학연구* 27(2) — [부분검증] (제목 미확인)) — [KoreaScience PDF](https://koreascience.kr/article/JAKO202526036064925.pdf)
- [부분검증] 「경영정보학 분야 AI 연구동향: 네트워크 분석과 전문가 인터뷰」(Knowledge Management Research 표기, 2025). — [KoreaScience](https://koreascience.kr/article/JAKO202532350449049.pub)
- [검증] 한국노동연구원 『노동리뷰』 2026년 2월호: 생성형 AI 노동시장 영향은 전반적으로 제한적이나 **청년층, 정보통신업, 사무직**에서 가시화. — [KLI 노동리뷰 no.251 PDF](https://repository.kli.re.kr/bitstream/2021.oak/11966/2/%EB%85%B8%EB%8F%99%EB%A6%AC%EB%B7%B0_no.251_2026.2_5.pdf)
- 안홍환 외(2025) 공공 GenAI VOC 기대-현실 격차(ISR 27(4)) [서지만 확인] → [[papers-ai-cx]]

## 노트 04 아이디어 시드 (참고)

1. 숙련공 노하우 인터뷰 에이전트(중소 제조, 숙련공 은퇴) — 표출화, 조직기억, DeLong
2. 모국어 현장 코파일럿(외국인 근로자 온보딩·안전) — 흡수역량, 내면화·Exercising Ba, 정당한 주변적 참여 → [[idea-1-hotel-knowledge-copilot]]에 흡수
3. 베테랑 응대 노하우 RAG 코치(호텔·콜센터·리테일) — war stories, 끈적임 → [[idea-1-hotel-knowledge-copilot]]에 흡수
4. 지식은닉을 줄이는 기여 가시화형 사내 Q&A 에이전트(SME·대학 행정·공공) — 지식은닉, 실천공동체
5. 인수인계 자동화 에이전트(순환보직 공공기관·대학 행정·프랜차이즈) — 조직기억, KM 4과정, jagged frontier

노트 04 우선순위 추천(추론): 시드 2와 시드 1이 근거가 가장 탄탄, 시드 4는 KM 색채가 가장 강함. 시드 1+3 또는 2+4 결합 가능.

## 공백 (노트 04)

- Dell'Acqua(2023) 핵심 수치와 Organization Science 게재 서지는 1차 원문 미확인.
- 지식경영연구·인사조직연구에서 생성형 AI × 지식공유/지식은닉/암묵지를 직접 다룬 2023–2026 실증 논문은 찾지 못함.
- 'deskilling' 실증 연구는 별도 검색 필요.

