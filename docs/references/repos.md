# 참고 repo / 디자인 레퍼런스 모음 ("이어받기" 매장 LLM 위키)

기준일 2026-10-31. 별 수와 라이선스는 GitHub API(2026-10-31 조회) 또는 해당 페이지 직접 확인값이다. 표기 규칙은 다음과 같다.

- 별 수는 근사치(k = 1,000).
- "NOASSERTION"은 GitHub가 단일 SPDX로 판정하지 못한 것이다. 이 경우 괄호에 일반적으로 알려진 라이선스를 적고 "(LICENSE 확인 필요)"를 붙였다.
- "[미검증]"은 URL 존재 또는 세부 기능을 이번 조사에서 직접 확인하지 못한 항목이다. 채택 전 재확인한다.
- 이모지 사용 금지. 본 문서에도 쓰지 않는다.

관련 위키 페이지: [[kmsk-contest-hub]], [[idea-1-hotel-knowledge-copilot]], [[idea-6-restaurant-voc-copilot]]

---

## 1. Toss UX/UI

| 이름 | URL | 라이선스/규모 | 가져올 점 | 우리 화면 어디에 |
|---|---|---|---|---|
| 토스의 8가지 라이팅 원칙 | https://toss.tech/article/8-writing-principles-of-toss | 글(2022-11). 코어밸류 5개(Clear, Concise, Casual, Respect, Emotional) + 프린시플 8개 | Predictable hint, Weed cutting, Remove empty sentences, Focus on key message, Easy to speak, Suggest over force, Universal words, Find hidden emotion. 버튼/빈 화면/에러 문구를 이 8개로 점검 | 모든 마이크로카피. 특히 신입 답변 카드, 매니저 에스컬레이션 요청 문구 |
| 토스 UX 라이팅 인터뷰 (토스피드) | https://toss.im/tossfeed/article/uxwriter-interview | 글 | CTA 한 개면 "~하기", 다음 화면 전환은 "확인/다음", CTA 두 개면 취소 대신 "닫기/다음에", 바텀시트 제목은 한 줄, 해요체 통일 | 모달/바텀시트 버튼, 카드 승인 흐름 |
| 가이드라인을 시스템으로 만드는 법 (에러 메시지 시스템) | https://toss.tech/article/introducing-toss-error-message-system | 글 | 에러를 상황 카테고리로 분류하고 템플릿화. 원인이 우리 쪽이어도 해요체. "다음으로 넘어가게 안내"가 목적(Navigating error) | POS 오류/쿠폰 오류 사례의 표준 응답 템플릿, lint 에이전트 경고 문구 |
| 토스 디자인 원칙 Value first, Cost later | https://toss.tech/article/value-first-cost-later | 글. 조회 완료율 67% 상승 사례 | 입력/인증을 요구하기 전에 얻을 결과를 먼저 보여줌. 질문 3~4개 넘으면 가치를 먼저 제시 | 베테랑 인터뷰 시작 화면(이 인터뷰가 신입에게 줄 가치를 먼저 노출), 온보딩 |
| 토스 디자인 원칙 Easy to answer | https://toss.tech/article/insurance-claim-process | 글 | 3초 안에 답하기 어려운 질문은 개선 대상. 상황을 묻는 질문, 대표 예시 이미지, 관련 선택지만 노출 | 에이전트 인터뷰 질문 설계("왜 그렇게 판단하셨나요?"를 상황형 객관식 + 짧은 자유입력으로) |
| 달리는 기차 바퀴 칠하기: TDS 컬러 시스템 업데이트 | https://toss.tech/article/tds-color-system-update | 글. 이번 조사에서 본문 확인 | 같은 단계 번호 = 같은 명도(OKLCH 기반), 다크모드는 별도 명도 기준, 시맨틱 토큰을 Target-Role-Variant(예: fill-brand)로 명명, Style Dictionary로 CSS/TS 생성, `data-tds-color-scheme` 선택자 | tailwind 토큰 설계(`fill-brand`, `text-weak` 식 의미 토큰), 다크모드 |
| 토스 디자이너가 제품에만 집중할 수 있는 방법 (TDS) | https://toss.tech/article/toss-design-system | 글 | 컴포넌트에 긴 텍스트 min/max 폭, 큰 글자 대응, 스크린리더 초점, 위아래 페이드 같은 케이스를 내장. 제작 속도 3~5배 | 공통 컴포넌트 라이브러리 설계 원칙 |
| 앱인토스 UI/UX 가이드 | https://developers-apps-in-toss.toss.im/landing-page/landing-page-en/design/consumer-ux-guide | 공식 문서(앱인토스 개발자센터) | 해요체 일관, 능동태, 긍정 표현, 왼쪽 버튼 "닫기", 화면당 핵심 그래픽 1개, 아이콘 24~40px, 상태를 정확히 표시(오류 아님이면 오류 아이콘 금지), 다크패턴 금지 | 화면 구성 체크리스트 |
| 토스 디자인 시스템(TDS) 컴포넌트 목록 | https://developers-apps-in-toss.toss.im/design/components | 공식 문서. UI 키트 자체는 앱인토스 제휴 용도 한정 라이선스. 우리는 복제 불가, 구조만 참고 | 핵심 11개 컴포넌트(Badge, Border, BottomCTA, Button, Asset, ListRow, ListHeader, Navigation, Paragraph, Tab, Top). 특히 ListRow/ListHeader의 행 중심 레이아웃 | 질문 목록, 케이스 카드 목록, 대시보드 리스트 |
| TDS Mobile 컴포넌트 문서 | https://tossmini-docs.toss.im/tds-mobile/components/ListRow/list-row-overview/ | 공식 문서 | ListRow 구성(좌 아이콘, 본문, 우 보조 텍스트/화살표) | 케이스 카드 행 UI |
| A11y Fundamentals | https://frontend-fundamentals.com/a11y/ (토스 글: https://toss.tech/article/A11y_Fundamentals) | 2025-08 공개. URL은 글 링크에서 추론, 실제 접속 200 확인은 상위 도메인만 | 구조 명확화, 접근 가능한 이름, 예측 가능한 동작, 시각 정보 대체 텍스트 | 그래프 캔버스의 대체 목록 뷰, 아이콘 버튼 aria-label |
| toss/frontend-fundamentals | https://github.com/toss/frontend-fundamentals | MIT, 약 2.0k | 코드 품질 4기준: 가독성, 예측 가능성, 응집도, 결합도. 기준 간 충돌 시 판단 근거 | 코드 리뷰 기준, 디렉터리 구조(응집도) |
| toss/technical-writing | https://github.com/toss/technical-writing | 콘텐츠 CC BY-NC-SA 4.0, 약 1.1k | 문서 구조화와 AI 프롬프트 글쓰기. 비영리 조건 있으므로 직접 복제 대신 원칙만 참고 | 케이스 카드 서식, 위키 토픽 페이지 구조 |
| toss/es-toolkit | https://github.com/toss/es-toolkit | MIT, 약 11.4k | lodash 대체 유틸. 번들 작고 TS 친화 | 프론트/백 공통 유틸 |
| toss/overlay-kit | https://github.com/toss/overlay-kit | MIT, 약 0.7k | 명령형으로 모달/바텀시트 열기(`overlay.open`) | 승인/에스컬레이션 모달 |
| toss/use-funnel | https://github.com/toss/use-funnel | MIT, 약 0.6k | 단계별 흐름 상태를 타입 안전하게 관리 | 인터뷰 단계 진행, 신입 온보딩 퍼널 |
| toss/slash | https://github.com/toss/slash | MIT, 약 3.0k, **아카이브됨** | 유틸/훅 모음. 유지보수 중단이므로 코드 읽기 참고만 | 참고만 |
| Pretendard | https://github.com/orioncactus/pretendard | OFL, 약 3.6k | 한글/영문 시스템 폰트 대체. 가변 폰트, dynamic subset CDN. Toss Product Sans는 비공개이므로 대안 | 전체 타이포그래피 |

토스 단순함 규칙 요약(검색 결과로 확인된 표현 기준, 각 글 본문 직접 확인 범위는 위 표):

- One Thing per Page: 한 화면에 명확한 목표 하나, 다음 단계로 누를 버튼은 하나. (토스 가입 화면 글 https://toss.tech/article/toss-signup-process 에서 언급, 이번에 본문 미확인 [미검증])
- Simplicity는 인지/심리/노동 비용 세 가지를 줄이는 것. (남영철 PO 토스피드 글 https://blog.toss.im/article/importance-simplicity, 검색 요약만 확인 [미검증])
- Minimum Feature: 없으면 안 되는 것만.

토스 컬러/서체 주의: 브랜드 블루 #0064FF, 화면 버튼/링크용 TDS 블루 #3182F6은 제3자 갤러리(oppadu.com) 보고값이며 공식 토큰 페이지 직접 확인은 못 했다 [미검증]. 서체 Toss Product Sans는 비공개.

---

## 2. 온톨로지 / 지식그래프 시각화

점증적 노드 추가 + 애니메이션 지원 여부는 별도 열에 적었다. "지원" 표기는 공식 API 지식 기반이며, 직접 검증한 곳은 cytoscape 문서의 "Animatable graph elements and viewport" 한 줄이다. 나머지는 프로토타입에서 확인한다.

| 이름 | URL | 라이선스/규모 | 가져올 점 | 증분 추가/애니메이션 | 우리 화면 어디에 |
|---|---|---|---|---|---|
| cytoscape.js | https://github.com/cytoscape/cytoscape.js (문서 https://js.cytoscape.org) | MIT, 약 11.3k | 요소 `cy.add()`, 스타일 셀렉터(노드 타입별 색/모양), 이벤트, 요소/뷰포트 애니메이션 | 지원(문서에 애니메이션 명시). 레이아웃 재실행으로 전체 재배치는 따로 필요 | 메인 온톨로지 그래프 (채택) |
| react-cytoscapejs | https://github.com/plotly/react-cytoscapejs | MIT, 약 0.5k | React 래퍼. 단, 요소 배열을 통째로 넘기면 diff 되는 방식이라 SSE로 들어오는 증분은 `cyRef`로 `cy.add` 직접 호출이 낫다 (이 부분은 사용 시 확인) | 래퍼 자체는 요소 diff, 직접 호출로 증분 | 그래프 컨테이너 컴포넌트 |
| cytoscape.js-fcose | https://github.com/iVis-at-Bilkent/cytoscape.js-fcose | MIT, 약 0.2k | 빠른 compound 레이아웃. 토픽을 compound 부모로 묶기, 증분 레이아웃 옵션(`randomize:false`) | 지원(이전 위치 유지 가능) | 토픽 클러스터링 |
| cytoscape.js-popper | https://github.com/cytoscape/cytoscape.js-popper | MIT, 약 0.1k | 노드 호버 툴팁을 HTML로 | 해당 없음 | 노드 호버 카드(케이스 요약) |
| react-force-graph | https://github.com/vasturiano/react-force-graph | MIT, 약 3.3k | 2D/3D/VR 힘 기반 그래프. `nodeCanvasObject` 커스텀 렌더, 데이터 변경 시 부드러운 재시뮬레이션, 파티클 링크(데이터 흐름 표현) | 지원(그래프 데이터 갱신 시 시뮬레이션 재가열) | 대안. 링크 파티클 연출 아이디어를 cytoscape에서 모방 |
| force-graph | https://github.com/vasturiano/force-graph | MIT, 약 2.2k | react-force-graph의 2D 코어 | 위와 동일 | 참고 |
| sigma.js | https://github.com/jacomyal/sigma.js | MIT, 약 12.2k | WebGL로 수만 노드. 라벨 겹침 제어, 노드 프로그램 커스텀 | 지원(graphology에 노드 추가 시 렌더). 트윈 애니메이션은 별도 구현 | 노드가 수천 개로 커질 때의 업그레이드 경로 |
| @react-sigma (sim51/react-sigma) | https://github.com/sim51/react-sigma | MIT, 약 0.2k | sigma의 React 훅/컨트롤(줌, 검색, 레이아웃 훅) | 위와 동일 | 대안 |
| reagraph | https://github.com/reaviz/reagraph | Apache-2.0, 약 1.1k | WebGL React 그래프. 선택/하이라이트, 라디얼 컨텍스트 메뉴, 클러스터링 | 지원(상태 변경 시 전환 애니메이션 제공으로 알려짐, [미검증]) | 대안. 컨텍스트 메뉴 UX |
| Neo4j NVL | 문서 https://neo4j.com/docs/nvl/current/ , npm `@neo4j-nvl/react` (GitHub 공개 repo는 확인 못 함 [미검증]) | 라이선스 npm 페이지 확인 필요 [미검증] | Bloom/Explore 계열 시각 언어: 노드 크기 = 중요도, 캡션, 관계 곡선, 인터랙티브 래퍼 | 문서상 노드/관계 추가 API 존재로 알려짐 [미검증] | 시각 언어 참고만. 의존 도입은 비권장 |
| antvis/G6 | https://github.com/antvis/G6 | MIT, 약 12.4k | 풍부한 내장 인터랙션과 애니메이션, 트리/조직도 | 지원 | 대안 |
| xyflow (React Flow) | https://github.com/xyflow/xyflow | MIT, 약 38.8k | 노드 = React 컴포넌트. 에이전트 파이프라인 도식(누가 누구에게 넘기는지) | 지원 | 에이전트 팀 흐름 보드 (그래프와 별도 화면) |
| vis-network | https://github.com/visjs/vis-network | Apache-2.0, 약 3.6k | 쉬운 API, 물리 시뮬레이션 | 지원 | 비교용 |
| memgraph/orb | https://github.com/memgraph/orb | Apache-2.0, 약 0.4k | 경량 그래프 뷰, 스타일 API | [미검증] | 비교용 |
| LightRAG (WebUI 포함) | https://github.com/HKUDS/LightRAG (`lightrag_webui/`) | MIT, 약 40.4k | 디렉터리상 Vite + TypeScript + Tailwind + shadcn 계열 구성(components.json로 추정). 그래프 뷰어, 검색 모드 테스트 화면 구성. 그래프 라이브러리는 이번에 확인 못 함 [미검증] | [미검증] | 우리와 같은 스택. 화면 구성 참고 |
| Microsoft GraphRAG | https://github.com/microsoft/graphrag | MIT, 약 36.5k | 엔티티-관계 추출, 커뮤니티 요약(토픽 페이지의 개념적 원형) | 해당 없음(배치) | 에이전트 컴파일 파이프라인 설계 |
| graphrag-visualizer | https://github.com/noworneverev/graphrag-visualizer | MIT, 약 0.4k | GraphRAG 산출물(parquet)을 2D/3D 그래프 + 테이블로 열람 | [미검증] | 엔티티/커뮤니티 목록 + 그래프 동시 표시 |
| Quartz | https://github.com/jackyzha0/quartz | MIT, 약 13.5k | 위키 링크 기반 로컬 그래프(현재 페이지 중심 N-hop), 백링크 패널 | 해당 없음(정적) | 토픽/카드 상세에서 "이 카드와 연결된 것" 미니 그래프 |
| Foam | https://github.com/foambubble/foam | NOASSERTION(MIT로 알려짐, LICENSE 확인 필요), 약 17.5k | `[[링크]]` 기반 그래프, 고아 노트 / 플레이스홀더 개념 | 해당 없음 | lint의 "고아 카드", "빈 링크(공백)" 개념 |
| Logseq | https://github.com/logseq/logseq | AGPL-3.0, 약 45.4k | 글로벌 그래프 필터, 노드 크기 = 링크 수. AGPL이라 코드 복제 금지, UX만 참고 | 해당 없음 | 필터/크기 규칙 |

---

## 3. LLM 위키 / 지식베이스 / KCS

| 이름 | URL | 라이선스/규모 | 가져올 점 | 우리 화면 어디에 |
|---|---|---|---|---|
| nashsu/llm_wiki | https://github.com/nashsu/llm_wiki | NOASSERTION(LICENSE 확인 필요), 약 21.2k | 문서를 정리된 위키로 바꾸는 데스크톱 앱. 수집 - 컴파일 - 질의 순서 | 위키 컴파일 에이전트 흐름 |
| SamurAIGPT/llm-wiki-agent | https://github.com/SamurAIGPT/llm-wiki-agent | MIT, 약 3.7k | 소스를 넣으면 에이전트가 위키를 유지. index/log 운영 방식 | index.md, log.md 갱신 규칙 |
| Astro-Han/karpathy-llm-wiki | https://github.com/Astro-Han/karpathy-llm-wiki | MIT, 약 2.6k | Agent Skills 형식의 Karpathy 스타일 위키 지침(SKILL 구조) | 컴파일/린트 에이전트 프롬프트 설계 |
| atomicstrata/llm-wiki-compiler | https://github.com/atomicstrata/llm-wiki-compiler | MIT, 약 2.2k | "raw 소스 입력 - 상호 링크된 위키 출력" 컴파일러 관점 | 케이스 카드 -> 토픽 페이지 컴파일 |
| lucasastorian/llmwiki | https://github.com/lucasastorian/llmwiki | Apache-2.0, 약 1.7k | 문서 업로드 + Claude 연결형 웹 구현 | 웹 앱 형태 참고 |
| AgriciDaniel/claude-obsidian | https://github.com/AgriciDaniel/claude-obsidian | MIT, 약 16k | Obsidian + Claude Code로 소스 정리. 볼트 구조 | 폴더/링크 규약 |
| swarmclawai/swarmvault | https://github.com/swarmclawai/swarmvault | MIT, 약 0.7k | 로컬 우선 LLM 위키 + 지식 그래프 빌더 + 에이전트 | 그래프와 위키 동시 산출 |
| Outline | https://github.com/outline/outline | NOASSERTION(BSL 1.1로 알려짐, LICENSE 확인 필요), 약 41.1k | 슬래시 메뉴 에디터, 컬렉션 구조, 검색 UI, 실시간 협업. 코드 재사용 불가 가능성 높아 UX만 | 카드/토픽 편집기, 검색 |
| Wiki.js | https://github.com/requarks/wiki | AGPL-3.0, 약 29.1k | 페이지 트리, 태그, 버전 이력 | 위키 탐색 트리 |
| Docmost | https://github.com/docmost/docmost | AGPL-3.0, 약 22.2k | Notion형 협업 위키, 공간(space) 개념, 코멘트 | 매장(공간)별 위키 분리 |
| BookStack | https://github.com/BookStackApp/BookStack | MIT, 약 19.1k | Shelf - Book - Chapter - Page 4단계 계층. 매장/지점 구조로 매핑 가능 | 매장 - 토픽 - 카드 계층 |
| AFFiNE | https://github.com/toeverything/AFFiNE | NOASSERTION(MIT + 별도 라이선스 혼합으로 알려짐), 약 74k | 문서/화이트보드/DB 전환형 블록 UI | 카드 보기 전환(리스트/그래프) 아이디어 |
| BlockSuite | https://github.com/toeverything/blocksuite | MPL-2.0, 약 6.1k | 블록 기반 에디터 툴킷 | 필요 시 편집기 대안 (과도하면 불필요) |
| Trilium Notes (TriliumNext) | https://github.com/TriliumNext/Trilium | AGPL-3.0, 약 38.6k | 속성(attribute)과 관계(relation)로 노트 연결, 관계 맵 | 카드 속성 스키마 |
| KCS v6 Practices Guide | https://library.serviceinnovation.org/KCS/KCS_v6/KCS_v6_Practices_Guide | CC BY-NC 4.0(검색 결과 기준) | Capture in the workflow, Structure, Reuse is review, Improve. 지식 상태(Draft / Reviewed / Verified)와 품질 루프 | 카드 상태 라이프사이클, 신입이 쓴 카드를 "재사용 = 검토"로 처리, 대시보드 지표(재사용률) |
| Karpathy "LLM Wiki" 개념 | 원문 gist URL은 이번에 직접 확인 못 함 [미검증] (위 구현 repo README들이 인용) | - | raw sources / wiki / schema 3층, ingest - query - lint 3동작, index.md와 log.md | 전체 아키텍처의 기준 |

---

## 4. 에이전트 오케스트레이션 / 트레이스 UI

| 이름 | URL | 라이선스/규모 | 가져올 점 | 우리 화면 어디에 |
|---|---|---|---|---|
| LangGraph | https://github.com/langchain-ai/langgraph | MIT, 약 44.2k | 상태 그래프, 체크포인트, interrupt(사람 승인 대기) | 매니저 에스컬레이션 = interrupt 패턴 |
| LangGraph Studio 문서 | https://langchain-ai.github.io/langgraph/concepts/langgraph_studio (현재: https://docs.langchain.com/langsmith/studio.md) | 문서. 독립 repo `langgraph-studio`는 404 | 그래프 모드(통과한 노드, 중간 상태), 채팅 모드, time travel(과거 체크포인트로 돌아가 상태 수정 후 분기) | 에이전트 실행 타임라인, "이 시점으로 되돌려 보기" |
| OpenAI Agents SDK + Tracing | https://openai.github.io/openai-agents-python/tracing/ , repo https://github.com/openai/openai-agents-python | MIT, 약 30.4k | Trace = 한 워크플로우, Span 종류(agent, generation, tool call, handoff, guardrail). 각 스팬의 입력/출력/시간/상태 | 이벤트 모델: agent_span, handoff, guardrail 이름 그대로 SSE 이벤트 스키마에 사용 |
| CrewAI | https://github.com/crewAIInc/crewAI | MIT, 약 60.3k | role / goal / backstory 에이전트 정의, 태스크 위임 | 에이전트 역할 카드(인터뷰어, 컴파일러, 린트) 표기 |
| AutoGen (AutoGen Studio 포함) | https://github.com/microsoft/autogen (`python/packages/autogen-studio`) | 저장소 라이선스 CC-BY-4.0(코드는 MIT 별도, LICENSE-CODE 확인 필요), 약 61.6k | 노코드 팀 빌더와 실행 중 메시지 흐름 뷰 | 에이전트 팀 구성도 |
| Langfuse | https://github.com/langfuse/langfuse | NOASSERTION(코어 MIT + ee 폴더로 알려짐), 약 36.8k | 트레이스 트리 + 타임라인, 비용/지연 표시, 세션 단위 묶기 | 에이전트 활동 상세 패널 |
| Arize Phoenix | https://github.com/Arize-ai/phoenix | NOASSERTION(Elastic License 2.0로 알려짐, 확인 필요), 약 12.1k | 스팬 트리, 입력/출력 확장 보기, 평가(eval) 점수 표시 | 린트 결과를 평가 점수처럼 노출 |
| langgraphics | https://github.com/proactive-agent/langgraphics | MIT, 약 0.15k | LangGraph 실행을 실시간으로 그래프에 하이라이트 | "지금 어느 에이전트가 일하는가" 라이브 하이라이트 (소규모 프로젝트라 아이디어만) |
| AG-UI Protocol | https://github.com/ag-ui-protocol/ag-ui | MIT, 약 16.9k | 에이전트 - UI 간 이벤트 스트림 표준(메시지, 도구 호출, 상태 델타) | SSE 이벤트 타입 설계 참고 |
| assistant-ui | https://github.com/assistant-ui/assistant-ui | MIT, 약 12.8k | 채팅 UI 프리미티브, 도구 호출/출처 표시 | 신입 질문 채팅 화면 |
| CopilotKit | https://github.com/CopilotKit/CopilotKit | MIT, 약 38.4k | 에이전트 상태를 UI에 공유(shared state), 사람 개입 승인 UI | 에스컬레이션 승인 UX |

---

## 5. 대시보드 / 컴포넌트

| 이름 | URL | 라이선스/규모 | 가져올 점 | 우리 화면 어디에 |
|---|---|---|---|---|
| shadcn/ui | https://github.com/shadcn-ui/ui | MIT, 약 127k | 코드 복사형 컴포넌트, CSS 변수 토큰, Radix + Tailwind | 기본 컴포넌트 전부 (토큰만 토스풍으로 교체) |
| Radix Primitives | https://github.com/radix-ui/primitives | MIT, 약 19.4k | 접근성 내장 Dialog, Popover, Tabs, Tooltip | 모달, 탭, 툴팁 |
| Tremor | https://github.com/tremorlabs/tremor | Apache-2.0, 약 3.7k | KPI 카드, 스파크라인, 막대 리스트 등 대시보드 블록 | 대시보드 KPI 행 |
| Recharts | https://github.com/recharts/recharts | MIT, 약 27.7k | 선언형 차트 (영역, 막대, 라인) | 일/주간 카드 증가 추이, 카테고리 분포 |
| Sonner | https://github.com/emilkowalski/sonner | MIT, 약 13.1k | 스택형 토스트 | 실시간 이벤트 알림("새 카드가 추가됐어요") |
| TanStack Table | https://github.com/TanStack/table | MIT, 약 28.5k | 헤드리스 테이블: 정렬, 필터 | 카드/질문 관리 표 (매니저 화면) |
| 실시간 활동 피드 패턴 | (repo 아님) Langfuse/Phoenix 트레이스 리스트, shadcn 대시보드 예제 | - | 최신순 리스트 + 상단 삽입 애니메이션 + 에이전트 아바타 + 상대 시간. SSE 수신 시 `prepend`, 새 항목 배경 1.5초 페이드 | 대시보드 우측 "방금 일어난 일" |

보조 후보(별/라이선스 이번에 미조회): cmdk(커맨드 팔레트), TanStack Query, motion(전환 애니메이션), zustand, nivo, visx. 사용 시 확인 [미검증].

---

## 6. 현장 직원 지식 / 온보딩 도구

| 이름 | URL | 라이선스/규모 | 가져올 점 | 우리 화면 어디에 |
|---|---|---|---|---|
| Starbucks Green Dot Assist | 보도: https://www.theregister.com/2025/06/11/starbucks_ai_baristas/ , https://www.fortune.com/2025/06/11/starbucks-ai-chatbot-green-dot-assist-turnaround-plan | 상용(비공개). 2025년 35개 매장 시범 | 매장 iPad에서 대화형 질의, 레시피와 재료 소진 시 대체 제안, 장비 문제 해결, 수리 티켓 생성. 즉 "답 + 안 되면 티켓" | 신입 질문 화면의 "답변 + 에스컬레이션 버튼" 구조. 품절 대체 사례가 핵심 케이스 |
| GS25 챗봇지니 / 챗봇조이 | 보도: https://news.tf.co.kr/read/economy/1849912.htm , https://m.boannews.com/html/detail.html?idx=66358 | 상용(비공개). 2018 출시, 사용자 약 1.4만 명, 2021 근무자 4.3만 명 교육 활용 보도. 현재 운영 여부 미확인 | 카카오톡 채널 기반 즉문즉답, 신상품/서비스 질의, 교육. 신입이 앱 설치 없이 쓰는 채널 | 모바일 우선, 짧은 답, 출처 한 줄 |
| Frappe LMS | https://github.com/frappe/lms | AGPL-3.0, 약 3.4k | 코스 - 챕터 - 레슨, 퀴즈, 수료증 | 신입 온보딩 퀴즈로 케이스 카드 복습 (선택 기능) |
| Onyx (구 Danswer) | https://github.com/onyx-dot-app/onyx | NOASSERTION(MIT + EE로 알려짐), 약 33.1k | 사내 지식 검색 챗, 출처 인용 UI | 인용 답변 형식 |
| Dify | https://github.com/langgenius/dify | NOASSERTION(수정된 Apache-2.0로 알려짐), 약 160k | 워크플로우 편집기, 지식베이스 + 인용 | 에이전트 흐름 구성 참고 |
| RAGFlow | https://github.com/infiniflow/ragflow | Apache-2.0, 약 93.2k | 답변 내 인용 번호와 원문 청크 하이라이트 | 답변의 [1] 인용 -> 케이스 카드 열기 |
| AnythingLLM | https://github.com/Mintplex-Labs/anything-llm | MIT, 약 67.8k | 워크스페이스 단위 문서 + 채팅, 인용 표시 | 매장별 워크스페이스 |
| Open WebUI | https://github.com/open-webui/open-webui | NOASSERTION, 약 157k | 채팅 UI 인용 칩 (세부 확인 안 함 [미검증]) | 참고만 |
| Trainual / Axonify | 공식 사이트 미조회 [미검증] | 상용 | 미확인이므로 근거로 사용 금지 | - |

---

## 채택 결정

우선순위가 높은 8개 차용 항목이다.

1. **cytoscape.js + react-cytoscapejs를 그래프 엔진으로 채택하고, 증분 추가는 `cy.add` 직접 호출 + 노드 등장 애니메이션 + fcose 증분 레이아웃으로 구현.**
   이유: MIT, 문서에서 요소/뷰포트 애니메이션이 명시됨. 노드 타입(토픽, 케이스, 직원, 질문, 규칙)별 셀렉터 스타일이 쉬움. 노드가 수천 개로 늘면 sigma.js로 이전하는 경로를 남겨 둔다. 래퍼는 요소 배열을 통째로 diff하므로 SSE 증분에는 ref 직접 호출을 쓴다.
2. **토스 8가지 라이팅 원칙 + 해요체 + CTA 규칙(닫기/다음에, "~하기")을 문구 가이드로 고정.**
   이유: "토스 수준 UX"의 체감 대부분은 문구에서 온다. 비용이 거의 0이고 lint 가능(금지 문구 목록).
3. **TDS 컬러 시스템의 시맨틱 토큰 구조(Target-Role-Variant)와 다크모드 별도 명도 기준.**
   이유: `fill-brand`, `text-weak`, `border-subtle` 형태로 Tailwind 테마를 만들면 이후 색 교체가 쉽다. 같은 단계 = 같은 명도 원칙으로 그래프 노드 5종 색을 고른다.
4. **Value first, Cost later + Easy to answer를 인터뷰 화면 원칙으로.**
   이유: 베테랑 직원은 시간이 없다. 시작 전에 "이 기록이 신입의 어떤 실수를 막는지" 보여주고, 질문은 3초 안에 답할 수 있는 상황형으로 쪼갠다.
5. **OpenAI Agents SDK의 trace/span/handoff/guardrail 모델을 SSE 이벤트 스키마로 + AG-UI 이벤트 분류 참고.**
   이유: "어떤 에이전트가 무엇을 했나"를 라이브로 보이려면 표준 이벤트 이름이 필요하다. 활동 피드, 그래프 하이라이트, 에이전트 상태 칩이 같은 이벤트를 구독한다.
6. **LangGraph Studio식 타임라인 + interrupt(사람 승인 대기) 패턴.**
   이유: 미답변 질문의 매니저 에스컬레이션이 곧 interrupt이고, 답변이 새 카드로 이어지는 루프가 제품의 핵심 장면이다.
7. **KCS v6의 "작업 흐름 안에서 포착, 재사용 = 검토" 지식 상태 라이프사이클 + Karpathy ingest/query/lint 3동작.**
   이유: 카드 상태(초안 - 검토됨 - 검증됨)와 lint 규칙(충돌, 만료, 중복, 공백)에 학술적 근거를 준다. 공모전 심사(지식경영학회)에 설득력이 있다.
8. **shadcn/ui + Radix + Tremor 스타일 KPI 블록 + Recharts + Sonner, 폰트는 Pretendard.**
   이유: 모두 MIT/Apache/OFL로 재사용이 자유롭고 접근성 내장. 토스 TDS는 UI 키트 라이선스상 복제할 수 없으므로 "구조와 원칙만" 가져오고 시각은 우리 토큰으로 구현한다.

보조 채택: Quartz식 로컬 그래프(카드 상세의 N-hop 미니 그래프), Foam식 고아/빈 링크 개념(lint), RAGFlow식 인용 번호 UI, Starbucks Green Dot Assist 구조(답변 + 티켓).

라이선스 주의: Logseq, Wiki.js, Docmost, Trilium, Frappe LMS는 AGPL-3.0이다. 코드 복사 금지, 화면/개념 참고만 한다. Outline은 BSL로 알려져 있어 동일하게 취급한다. TDS UI 키트는 앱인토스 제휴 서비스 한정이다.

### 권장 팔레트 (토스 영감, 직접 계산한 WCAG 대비)

대비는 `#FFFFFF` 배경 기준으로 이번 세션에서 계산했다. 토스 공식 토큰 값이 아니라 우리가 정의하는 값이다(회색 계열은 토스 UI에서 흔히 쓰이는 스케일을 따랐으나 공식 확인은 못 함).

| 토큰 | 값 | 용도 | 흰 배경 대비 |
|---|---|---|---|
| brand | `#3182F6` | 큰 버튼 배경, 아이콘, 그래프 강조 (버튼 위 흰 글씨 3.71:1이므로 18px 이상 굵은 글씨만) | 3.71 |
| brand-strong | `#1B64DA` | 링크, 작은 텍스트, 버튼 호버/기본 텍스트 버튼 | 5.41 |
| brand-weak (배경) | `#E8F3FF` | 선택된 행, 배지 배경 (위 `#1B64DA` 글씨 4.82:1) | - |
| text-strong | `#191F28` | 제목, 본문 | 16.56 |
| text-body | `#4E5968` | 보조 본문 | 7.11 |
| text-weak | `#6B7684` | 캡션, 메타 (4.5 기준 최소) | 4.62 |
| text-disabled | `#8B95A1` | 비활성/장식 전용 (본문 사용 금지) | 3.04 |
| surface | `#FFFFFF` | 카드 | - |
| surface-subtle | `#F2F4F6` | 페이지 배경, 입력 배경 | - |
| border | `#E5E8EB` | 구분선 | - |
| danger | `#B42318` | 충돌/오류/삭제 | 6.57 |
| success | `#067647` | 검증됨/해결됨 | 5.69 |
| warning | `#B54708` | 만료 임박/주의 | 5.43 |

그래프 노드 5종(색 + 모양 병행, 색만으로 구분하지 않기):

| 노드 | 색 | 모양 |
|---|---|---|
| 토픽 | `#3182F6` | 큰 원 |
| 케이스 카드 | `#0E7490` (대비 5.36) | 둥근 사각형 |
| 직원(기여자) | `#6941C6` (대비 6.62) | 원 + 이니셜 |
| 질문 | `#B54708` | 마름모 |
| 규칙 | `#191F28` | 육각형 |

다크모드는 토스 글의 원칙대로 라이트 값의 단순 반전이 아니라 별도 명도 기준으로 따로 정의한다(후속 작업).

### 타이포그래피

- 폰트: Pretendard Variable (OFL, dynamic subset CDN 또는 `npm i pretendard`). 폴백 `-apple-system, "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif`.
- 스케일(px / 줄간격 / weight): 화면 제목 26/34/700, 섹션 제목 20/28/700, 카드 제목 17/24/600, 본문 15/24/400, 캡션 13/18/500. 숫자(KPI)는 `font-variant-numeric: tabular-nums`, 32/40/700.
- 문장 규칙: 해요체, 한 문장 한 메시지, 버튼은 동사형("답변 보내기", "카드로 저장하기").
- 레이아웃 규칙: 한 화면 한 가지 일, 그림자 대신 면 명도 차(#F2F4F6 위 흰 카드)로 계층, 카드 radius 16, 버튼 radius 12, 아이콘 24px, 이모지 없음.

### 미검증/후속 확인 목록

- Neo4j NVL의 공개 GitHub repo와 라이선스, reagraph의 증분 애니메이션 동작, LightRAG WebUI의 그래프 라이브러리.
- Karpathy 원문 gist URL.
- 토스 컬러 공식 토큰 값, 토스 가입 화면/Simplicity 글 본문.
- Trainual, Axonify 공식 자료.
- 일부 NOASSERTION 라이선스의 실제 LICENSE 파일.
