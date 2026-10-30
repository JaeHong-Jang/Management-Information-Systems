---
title: "피해야 할 주제 (topics-to-avoid)"
tags: ["회피주제", "중복수상", "정신건강", "커리어", "분리배출", "그림자노동", "레드오션", "서비스로봇"]
created: 2026-10-30T15:42:30.146Z
updated: 2026-10-30T15:42:30.146Z
sources: ["reports/지식경영학회 스마트서비스 공모전 아이디어.md", "research_notes/지식경영학회 스마트서비스 공모전 아이디어/05_생활공공_문제_시장공백.md", "research_notes/지식경영학회 스마트서비스 공모전 아이디어/03_스마트관광_호텔.md", "research_notes/지식경영학회 스마트서비스 공모전 아이디어/01_학회_공모전_맥락.md"]
links: ["kmsk-contest-hub.md", "kmsk-society-judges.md", "papers-kmr-journal.md", "papers-ai-cx.md", "idea-5-emotion-handoff-cs.md", "idea-7-senior-screen-coach.md", "idea-2-barrier-free-travel.md", "papers-smart-tourism-hotel.md", "idea-1-hotel-knowledge-copilot.md", "korea-problem-statistics.md"]
category: decision
confidence: medium
schemaVersion: 1
---

# 피해야 할 주제 (topics-to-avoid)

> 과거 수상작과 겹치거나, 시장이 포화됐거나, 학회지가 비판하는 '디지털 그림자노동'에 해당해 이 공모전에서 불리한 주제 목록과 그 이유.

상위: [[kmsk-contest-hub]] · 근거: [[kmsk-society-judges]] · [[papers-kmr-journal]]

## 요약 표

| # | 피할 주제 | 핵심 이유 | 꼭 다루려면 |
|---|---|---|---|
| 1 | 정신건강·심리상담 | 같은 학회에서 2023·2024 두 번 수상 | 상담 예약 트리아지 같은 대학 행정 쪽으로 틀기 |
| 2 | 커리어·취업 매칭 | 2024년 대상 주제와 겹침 | — |
| 3 | 사진으로 분류하는 분리배출 앱 | 시장 포화 | 지자체별 배출 규칙 RAG + 아파트 단지 단위 오배출 피드백(B2G·B2B) |
| 4 | 고객에게 일을 넘기는 셀프서비스 확대 | 학회지가 반복 비판하는 '디지털 그림자노동' | 직원 호출 버튼 등 선택권 보장 원칙 |
| 5 | 'ChatGPT로 여행 일정 짜 주기'·단순 다국어 챗봇 | 레드오션 | 공공데이터 RAG·출처 표시·제약 검증으로 "믿을 수 있는 AI" |
| 6 | 하드웨어 서비스로봇 | 학부생 구현 어려움, 연구 포화 | 소프트웨어(직원용 AI, SaaS)로 전환 |
| 7 | 빈 병상 지도 | 공개 API 학생 프로젝트 이미 존재 | — |
| 8 | 외국인 유학생 정착 에이전트 | 네스티아 진입, 차별화 여지 작음 | "대학 학사 연계"로 차별화(노트 05) |

## 1. 정신건강·심리상담

- 같은 학회에서 이미 두 번 수상: 2023년 국민대 버추얼 심리상담 우수상, 2024년 대나무숲팀 정신질환 조기탐지 우수상. — [국민대](https://biz.kookmin.ac.kr/community/newnhot/people/1075036?pn=20); [대학저널](https://dhnews.co.kr/news/view/1065573097329537)
- 대학 상담 대기가 길어졌다는 최신 통계가 있어도(서울대 학생상담 평균 대기 2022~2024년 10주 → 2025년 12주, 2026년 3~8월 약 24일; 우울·불안 상담 2022년 155건 → 2025년 287건, [프레시안](https://www.pressian.com/pages/articles/2026101215102852368)) 정면으로 다루면 중복 인상을 피하기 어렵다.
- 대교협 실태조사(2025.12, 1,549명)는 상담이 필요하다고 느끼면서도 실제 상담으로 이어지지 않는 "서비스 단절"을 확인했다. — [대교협 PDF](https://www.kcue.or.kr/_upload/news/2025/12/29/application_3f8927e7f651a6143aa16806d3d53de8.pdf)
- 굳이 다루려면 **상담 예약 트리아지·예약 최적화** 같은 행정 쪽으로 틀어야 한다.
- 정서적 동반 AI는 의존 위험도 지적된다(Xie 등 2023, [JOSM](https://doi.org/10.1108/josm-02-2022-0072)). → [[papers-ai-cx]]

## 2. 커리어·취업 매칭

- 2024년 대상(한기대 BCSD팀: LinkedIn·GitHub·Notion 데이터 통합 커리어 브랜딩)과 겹친다. → [[kmsk-society-judges]]

## 3. 사진 분류형 분리배출 앱

- 이미 포화: 에코클·분리고 같은 앱, 서울시 AI 페트병 회수기, 지자체 AI 폐기물 앱 실증 사례. — [에코클](https://apps.apple.com/us/app/-/id6504528263); [분리고](https://apps.apple.com/us/app/-/id6748918333); [서울시](https://mediahub.seoul.go.kr/archives/2015762); [아보다](https://aboda.kr/?p=33430)
- 서울시는 2026년까지 투명 페트병 고품질 재활용률 10% 목표.
- 노트 05는 우선순위가 낮다고 평가. 분리배출 오배출률과 AI 앱 인식 정확도의 공식 통계는 찾지 못했다.

## 4. 고객에게 일을 넘기는 셀프서비스 확대

- 무인 체크인 키오스크, 상담원 연결을 막는 챗봇 등은 학회지가 반복 비판하는 **'디지털 그림자노동' 그 자체**다. — [유팅팅·고준 2024](https://doi.org/10.15813/kmr.2024.25.1.005)
- 고준 교수(현 부회장) 그룹이 2023~2025년 네 편 연속 게재. → [[papers-kmr-journal]]
- 챗봇 고객서비스는 장벽, 계층화, 노동·비용 전가로 불평등을 재생산한다(Zhao 2026). 서울시 조사의 가장 큰 불만도 "자동응답 때문에 고객센터 연결이 어렵다"(41.1%). → [[idea-5-emotion-handoff-cs]]
- 경계 사례: 고령층 화면 코치는 문제 근거가 강하지만 이 논리로 읽힐 위험이 있다. → [[idea-7-senior-screen-coach]]

## 5. 'ChatGPT로 여행 일정 짜 주기'와 단순 다국어 챗봇

- 이미 차지한 서비스: 한국관광공사 여행콕콕(AI콕콕 플래너, 2022년 말), 놀유니버스 NOL(AI 여행 일정, AI 노리, AI 컨시어지), 여기어때(생성형 AI 자연어 검색, 도입 한 달여 만에 검색 고객 20.6%가 AI 검색 경험), 야놀자 텔라(20개 언어 전화 응대), 하나투어 '하이(H-AI)', 대한항공 '대이'. — [한국금융신문](https://www.fntimes.com/html/view.php?ud=2022111708054971608579a3016_18); [ZDNet](https://zdnet.co.kr/view/?no=20250708162003); [파이낸셜뉴스](https://www.fnnews.com/news/202604280942344097); [신아일보](https://www.shinailbo.co.kr/news/articleView.html?idxno=5061359); [브런치](https://brunch.co.kr/@acc9b16b9f0f430/62)
- 관광 생성형 AI 연구는 "신뢰·오류·편향"으로 수렴 → 일정 생성 자체로는 차별성이 없다. 공공데이터 RAG, 출처 표시, 제약조건 검증을 핵심 기술로 내세워야 한다. → [[idea-2-barrier-free-travel]], [[papers-smart-tourism-hotel]]

## 6. 하드웨어 서비스로봇

- 학부생이 구현하기 어렵고, 호텔 서비스로봇 수용 연구는 메타분석(Begum 등 2025)까지 나온 성숙 분야다. 하드웨어보다 인력난을 메우는 AI 백오피스·다국어 응대 같은 소프트웨어 쪽이 낫다(노트 03). → [[idea-1-hotel-knowledge-copilot]]

## 7. 빈 병상 지도

- 국립중앙의료원 응급의료기관 정보 API(실시간 가용병상)가 공개돼 있고, 이를 쓴 학생·개인 프로젝트(HopitHopit, Here Now ER MCP 서버)가 이미 있다. 단순 "빈 병상 지도"만으로는 차별성이 약하다. — [HopitHopit](https://github.com/dnbi/HopitHopit); [Glama](https://glama.ai/mcp/servers/blottosicei/here-now-er-mcp/tree)
- 노트 05의 "증상 기반 AI 병원 매칭"은 고영향 AI(의료) 해당 가능성 때문에 "진단"이 아닌 "정보 안내"로 포지셔닝해야 한다.

## 8. 외국인 유학생 정착 에이전트

- AI 정착 케어 스타트업 네스티아가 진입했고, 다방은 30개 언어 매물·문의 번역을 시작했다. — [벤처스퀘어 네스티아](https://www.venturesquare.net/1109487/); [벤처스퀘어 다방](https://www.venturesquare.net/1111635/)

## 참고: 노트 05의 다른 생활·공공 영역 (순위권 밖)

보고서 상위 8개에 들지 않은 후보로, 피해야 할 주제는 아니지만 학회 적합도가 낮게 평가된 영역: 1인가구·고독사 AI 안부·연결, 청년 전세계약 위험진단(HUG 안심전세앱 비교 필요), 대학생 금융 코치(토스·뱅크샐러드와 겹침), 농촌 DRT 통합 이동 에이전트(시뮬레이션 수준), 지역축제 성과·체류 설계. 통계는 [[korea-problem-statistics]].

