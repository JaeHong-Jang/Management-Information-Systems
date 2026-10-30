---
title: "공공데이터·API 목록 (public-data-apis)"
tags: ["공공데이터", "API", "TourAPI", "무장애여행정보", "집중률예측", "실현가능성", "LLM", "AI기본법"]
created: 2026-10-30T15:48:30.867Z
updated: 2026-10-30T15:48:30.867Z
sources: ["research_notes/지식경영학회 스마트서비스 공모전 아이디어/03_스마트관광_호텔.md", "research_notes/지식경영학회 스마트서비스 공모전 아이디어/05_생활공공_문제_시장공백.md", "reports/지식경영학회 스마트서비스 공모전 아이디어.md"]
links: ["kmsk-contest-hub.md", "contest-rules.md", "pre-submission-checklist.md", "idea-1-hotel-knowledge-copilot.md", "idea-2-barrier-free-travel.md", "idea-3-crowd-dispersal-curator.md", "idea-4-lodging-dispute-prevention.md", "idea-6-restaurant-voc-copilot.md", "idea-8-polypharmacy-coach.md", "a4-proposal-drafts.md", "papers-smart-tourism-hotel.md", "papers-km-genai.md"]
category: environment
confidence: medium
schemaVersion: 1
---

# 공공데이터·API 목록 (public-data-apis)

> 「기술 현실적 실현 가능성」 점수를 받치는 공개 데이터·API·LLM 선택지·규제 자원 목록. 확인된 항목과 노트 작성자의 사전지식(미검증) 항목을 구분했다.

상위: [[kmsk-contest-hub]] · 관련: [[contest-rules]] · [[pre-submission-checklist]]

## 1. 관광 데이터 (확인됨, 노트 03)

| 자원 | 내용 | 쓰는 아이디어 | 출처 |
|---|---|---|---|
| **TourAPI 4.0** (2022 구축) | 18종 관광데이터 280만 건(2024년 기준), 국내 관광정보 8개 외국어 | [[idea-1-hotel-knowledge-copilot]], [[idea-2-barrier-free-travel]] | [아주경제](https://www.ajunews.com/view/20240725074641040); [정부24 TourAPI](https://www.gov.kr/portal/service/serviceInfo/B55101100003) |
| **무장애 여행 정보 API** (한국관광공사) | 13종 약 6만 건, 무료, 개발계정 트래픽 1,000건 | [[idea-2-barrier-free-travel]] | [data.go.kr 15101897](https://www.data.go.kr/data/15101897/openapi.do) |
| **관광지 집중률 방문자 추이 예측** | 데이터랩 관광지별 향후 30일 집중률 예측치, 이동통신 방문자 데이터 기반 | [[idea-3-crowd-dispersal-curator]], [[idea-2-barrier-free-travel]] | [15128555](https://data.go.kr/catalog/15128555/openapi.json) |
| 빅데이터 지역별 방문자수 | — | [[idea-3-crowd-dispersal-curator]] | [15101972](https://www.data.go.kr/data/15101972/openapi.do) |
| 지역별 관광 수요 강도 | — | [[idea-3-crowd-dispersal-curator]] | [15151868](https://www.data.go.kr/data/15151868/openapi.do) |
| 지역별 관광 다양성 | — | [[idea-3-crowd-dispersal-curator]] | [15151365](https://www.data.go.kr/data/15151365/openapi.do) |
| 의료관광정보 | — | — | [15143913](https://www.data.go.kr/data/15143913/openapi.do) |
| 관광불편신고 종합분석서 | 2023·2024년판 공개 (2025년판 원문은 못 찾음) | [[idea-4-lodging-dispute-prevention]] | [2024년판](https://datalab.visitkorea.or.kr/site/portal/ex/bbs/View.do?cbIdx=1129&bcIdx=308975&pageIndex=1&cateCont=tlt02); [2023년판](https://datalab.visitkorea.or.kr/site/portal/ex/bbs/View.do?cbIdx=1129&bcIdx=307054&pageIndex=1&cateCont=tlt02) |

**주의**
- 공공데이터포털 공지: 무장애 여행 정보 API 등 **10건의 URL과 오퍼레이션이 바뀌었으므로** 최신 명세 확인. — [공지](https://www.data.go.kr/bbs/ntc/selectNotice.do?originId=NOTICE_0000000004082)
- 집중률 API 상세 명세(필드, 대상 관광지 수)는 확인하지 못했다.
- 학부 수준 구현 선례: 한국관광공사 API를 활용한 무장애 여행 일정 시스템(DBpia). — [DBpia](https://www.dbpia.co.kr/journal/articleDetail?nodeId=NODE11485630)

## 2. 생활·공공 데이터 (확인됨, 노트 05)

| 자원 | 내용 | 출처 |
|---|---|---|
| 공공데이터포털 오픈 API 일반 | 회원가입·활용신청 후 대부분 즉시 승인 | [위키독스 가이드](https://wikidocs.net/292158) |
| 국립중앙의료원 응급의료기관 정보 조회 | 실시간 가용병상 API, 시간대별 가용병상·포화도 가공 파일(2023.12~2024.11) | [data.go.kr 15088733](https://www.data.go.kr/data/15088733/fileData.do); [15055028](https://www.data.go.kr/data/15055028/fileData.do) |
| DRT 관련 데이터셋 | — | [15144160](https://www.data.go.kr/biz/dcat/metadata/15144160.do); [15157020](https://www.data.go.kr/biz/dcat/metadata/15157020.do) |
| 국토부 DRT 가이드라인 | 2025.12.30 발간 「수요응답형교통 도입·운영 가이드라인」 | [PDF](https://smartcity.go.kr/wp-content/uploads/2026/01/251230_수요응답형교통-도입운영-가이드라인국토교통부.pdf) |

## 3. 사전지식·미검증 자원 (노트 05, 팀이 직접 확인)

- 서울 열린데이터광장(data.seoul.go.kr: 생활인구·상권·따릉이)
- AI Hub(aihub.or.kr: 한국어 대화, 민원 상담, 의약품 이미지, 생활폐기물 이미지 데이터셋 등) — 구체 데이터셋명·라이선스 미확인
- 국토부 실거래가 API, 대법원 등기정보
- 소상공인시장진흥공단 상권정보 API → [[idea-6-restaurant-voc-copilot]]
- 식약처 의약품 낱알식별·DUR API → [[idea-8-polypharmacy-coach]]
- 국가데이터처(KOSIS) API

## 4. 구현 스택과 LLM 선택지

- 1위 초안 기준: 상용 LLM API + 오픈소스 RAG + 음성 인식(STT), 현직자 인터뷰 10건 + 모의 SOP. → [[a4-proposal-drafts]]
- 2위 초안 기준: LLM + RAG + 제약조건 검증 로직, 무장애 API(15101897) + TourAPI 4.0 + 집중률 예측 API.
- (사전지식·미검증, 노트 05) Claude, GPT 등 상용 API로 프로토타입. 한국어 특화·국산 선호를 의식하면 HyperCLOVA X(네이버클라우드), EXAONE(LG AI연구원) 대체 가능성 언급. 건강·금융 민감정보는 온디바이스(경량 sLLM)나 가명처리 후 전송 구조. 개인정보보호법 가명정보 특례(통계작성·과학적 연구·공익적 기록보존)를 데이터 윤리 계획에 적는다(세부 조문 확인 필요).
- 관련 기술 선례: TRIP-PAL(제약 충족), AlterAtlas(검증), 관광 RAG 챗봇 프롬프트 인젝션 방어(arXiv 2509.21367), AquiLLM(암묵지 RAG). → [[papers-smart-tourism-hotel]], [[papers-km-genai]]

## 5. 규제 자원

- AI 기본법(2026.01.22 시행), 고영향 AI 검토, 생성물 표시, 과태료 → [[contest-rules]] 12절
- 확인 못 한 것: AI 기본법 시행령 고영향 기준 최신본, 개인정보보호법 가명정보·민감정보 조문, AI Hub 데이터셋명·라이선스. → [[pre-submission-checklist]]

