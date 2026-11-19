# 역전할머니맥주 × 윤슬 디자인 시스템 (v2, frontend)

`docs/REDESIGN.md`(사용자 확정 브리프)를 코드 규칙으로 옮긴 문서다. 값의 원본은 `frontend/src/index.css`(CSS 변수)이고 `frontend/tailwind.config.js`는 이름만 묶는다. 값을 바꾸면 이 문서의 대비 숫자도 다시 계산한다. 문서와 코드가 다르면 코드를 고친다.

## 1. 원칙

- **전부 웹, 반응형, 셸 하나.** 본사 SV·점장·직원이 같은 상단바·내비 구조를 쓴다. 휴대폰 프레임, '앱' 표현, 가운데 고정 폭 흉내를 쓰지 않는다.
- **브랜드는 실명, 매장은 익명.** 로고·캐릭터 이미지는 넣지 않는다. 로고 자리는 글자 워드마크 「역전할머니맥주 × 윤슬」.
- **한 색 한 뜻.** 빨강은 고위험, 노랑은 주의·강조, ink는 조작. 색은 늘 아이콘 + 글자와 짝을 이룬다(색약·흑백 인쇄).
- **숫자는 규칙 코드 값 그대로.** KPI·점수·순위·비율을 화면에서 만들지 않는다. 표본이 없으면 0이 아니라 '미확인' 또는 '—'.
- **근거 먼저.** 주장 옆에 리뷰 인용(플랫폼·별점·날짜·리뷰 id)이나 카드 번호 칩을 붙인다.
- **가상은 늘 표시.** 본사 표준과 처방 이후 리뷰가 보이는 곳마다 '가상' 표지. 상단바에 '가상 표준·가상 시나리오 포함'을 상시 둔다.
- **움직임은 실제 이벤트로만.** shimmer·흐르는 점선·'N초 경과'는 SSE 이벤트(agent-start/agent-end/run-end)가 있는 동안만. 가짜 진행률 없음. `prefers-reduced-motion`이면 모든 애니메이션 정지.

## 2. 토큰 (브랜드 출처: yeokjeonfnc.com CSS·캐릭터 이미지)

대비는 WCAG 2.x 명암비. 기준 바탕은 surface #FFFFFF.

| 토큰 | 값 | 어디에 | 대비 |
|---|---|---|---|
| `--bg` | #FFF8F5 | 페이지 바탕(char-pink를 아주 옅게) | — |
| `--surface` | #FFFFFF | 카드·표·서랍 | — |
| `--surface-sunken` | #FBF1EC | 표 머리글, 보조 상자, 빈 상태 말풍선 | — |
| `--line` | #EFE3DE | 장식 구분선(의미 있는 경계에 쓰지 않음) | 1.2 |
| `--line-strong` | #8C7D77 | 입력칸·버튼 테두리, 시도 경계 | 3.95 (UI 3:1 통과) |
| `--text` = brand-ink | #231815 | 본문·제목 | 17.3 / bg 16.5 |
| `--text-subtle` = brand-text | #444444 | 보조 글 | 9.7 |
| `--text-muted` | #6B5E59 | 메타·캡션(가장 낮은 단계) | 6.2 / sunken 5.6 |
| `--ink` | #231815 | 주 버튼·활성 메뉴·선택·상단바 바탕 | 흰 글자 17.3 |
| `--ink-hover` | #3F2C26 | 주 버튼 hover | — |
| `--ink-weak` | #F3EAE6 | hover·선택 행 바탕 | ink 글자 14.6 |
| `--brand-red` | #E60012 | **고위험·워드마크만** | 흰 글자 4.8, 흰 바탕 글자 4.8 |
| `--brand-yellow` | #FCC800 | 주의 막대, KPI 아래 선, 사람 승인 도장, 실행 중 점 | ink 글자 11.1 (막대 자체 1.6 → 숫자 병기 필수) |
| `--brand-highlight` | #FDD84C | 형광펜(`<mark>`, `.hl-line`), 선택 탭 밑줄 | ink 글자 12.5 |
| `--yellow-weak` | #FFF4C2 | 말풍선(손님께 할 말), 주의 배지 바탕, 카드 번호 칩 | ink 15.6 |
| `--amber-text` | #7A5900 | 주의 글자(오류·막힘·승인 대기) | 6.5 / yellow-weak 5.8 |
| `--brand-maroon` | #3F0A0B | 예비(현재 미사용) | 16.7 |
| `--done` | #2D6A3E | 완료·통과·승인됨 | 6.5 / done-weak 5.6 |
| `--low-bar` | #9C8F89 | 낮음 단계 막대 | 3.1 |

간격 4·8·12·16·20·24·32. 모서리: 배지 4px, 컨트롤 6px, 카드 10px, 말풍선 24px 0 24px 24px. 그림자: 카드 `0 1px 2px` 아주 옅게, 서랍·팝오버만 `pop`.

## 3. 글자

| 이름 | 크기/행간 | 글꼴 | 쓰임 |
|---|---|---|---|
| display | 1.5rem/2rem 700 | Gmarket Sans | 페이지 제목 |
| title | 1.375rem/1.875rem 700 | Gmarket Sans | 서랍 제목, 인스펙터 이름 |
| section | 1rem/1.5rem 700 | Gmarket Sans(패널 제목) | 카드 제목 |
| body | 0.875rem/1.375rem | Noto Sans KR | 본문·표 셀 |
| caption | 0.78125rem/1.125rem 500 | Noto Sans KR | 메타·배지·축 |
| kpi | 1.75rem/2.125rem 700 | JetBrains Mono | KPI 숫자 |
| mobile | 1rem/1.5rem | Noto Sans KR | 직원 화면 입력·답·말풍선 |

- **Gmarket Sans Bold**: `@font-face`로 jsDelivr 고정 주소 `https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2001@1.1/GmarketSansBold.woff`(700만).
- **Noto Sans KR**(400·500·700) + **JetBrains Mono**(400·500·700): `index.html`의 Google Fonts 링크.
- 숫자·ID·runId·ms는 `.num`(JetBrains Mono + tabular-nums). 숫자 열은 오른쪽 정렬.
- 크기는 rem: 심사 모드(`html.present`)가 루트를 18px로 올려 전체를 키운다.
- 한글 제목 옆 작은 영문 보조 문구(모노 11~12px, 자간 0.14em, text-muted): 「전국 현황 · OVERVIEW」, 패널 「위험 순위 RANKING」.

## 4. 색의 뜻

### 4.1 위험 단계

| 단계 | 범위 | 막대 | 글자/배지 | 아이콘 |
|---|---|---|---|---|
| 낮음 | < 30 | #9C8F89 | text-subtle, 테두리 배지 | `circle` '낮음' |
| 주의 | 30–59 | brand-yellow #FCC800 | amber-text on yellow-weak | `triangle-alert` '주의' |
| 고위험 | ≥ 60 | brand-red #E60012 | 흰 글자 on brand-red | `siren` '고위험' |

**빨강 예산(사회보장 design/screens.md 규칙):** 빨강이 나오는 곳은 전부 이것뿐이다 — 워드마크 판, 고위험 배지, 고위험 막대·숫자, 순위 표 고위험 행 왼쪽 4px 바, KPI '고위험 매장' 숫자·아이콘, 매장 머리글 고위험 한 줄(흰 바탕 + 왼쪽 바 + 빨강 글자), 지도 '고위험' 보기의 고위험 시군구, 지역 요약 고위험 수. 한 화면 빨강 면적은 뷰포트 5% 이하. 버튼·활성 메뉴·오류·거절·막힘에는 빨강을 쓰지 않는다(오류·막힘은 주의 색 + 아이콘 + 글자).

### 4.2 원인 4분류 (빨강·노랑과 겹치지 않게)

| 원인 | 색 | 연한 바탕 | 대비 | 아이콘 |
|---|---|---|---|---|
| 지식 공백 | #1F5FA8 파랑 | #E8EFF8 | 6.4 / 5.6 | `book-open` |
| 운영·인력 | #7E2A1E 체크셔츠 갈색 | #F7EAE6 | 9.4 / 8.0 | `users` |
| 매장 자체 규칙 | #6B6115 올리브 | #F3F1E0 | 6.3 / 5.5 | `git-branch` |
| 위생·품질 | #0B6E78 청록 | #E3F2F3 | 6.0 / 5.2 | `shield-check` |

### 4.3 상태·3중 표지 (cotutor DESIGN_CONCEPT)

| 표지 | 모양 | 뜻 |
|---|---|---|
| **AI 초안** | 점선 ink 테두리 + `pen-line` | LLM이 쓴 밑그림. 지우고 다시 쓸 수 있다 |
| **규칙 판정** | 실선 ink 테두리 + `ruler` | 공개 규칙 코드가 계산·판정 |
| **사람 승인** | 노랑 도장(brand-yellow 바탕, -2° 기울임, ink 안쪽 선) + `stamp` | 본사 SV가 보냄 / 점장이 승인 |

선 모양(점선/실선/면)으로도 갈리므로 색약에서도 구분된다. **"에이전트 완료 ≠ 승인"**: 처방이 '완료'여도 그 처방이 낸 카드는 점장 승인 전에는 위키에 들어가지 않는다. 진단은 승인 대상이 아니므로 '참고용 진단'으로 표시한다. 붙는 곳: 진단 패널, 처방 항목, 받은 처방, 사례 카드(CardBadges), 기록하기 초안.

그 밖: 완료·통과 = done 초록 + `circle-check`. 대기·막힘·오류·LLM 실패 대체 = amber-text + yellow-weak + `clock`/`shield-alert`. 거절·보관 = 중립 회색. 가상 = 점선 line-strong 테두리 + `flask-conical` + '가상'(닫을 수 없음).

### 4.4 차트

- 카카오 = brand-ink, 네이버 = #9C8F89(따뜻한 회색, 카카오와 5.5:1). 범례 글자 필수.
- 강조 막대만 노랑: 평점 분포에서 시연 타깃 매장이 든 카카오 구간.
- 히트맵·지도 순차 5단계(갈색 한 계열): #F6EEEA · #E6D6CF · #C9B2A8 · #9C8079(ink 글자 4.8) · #5A4540(흰 글자 8.9). 빨강 쓰지 않음.
- 월별 추이: ink 선 + 갈색 막대(2점 이하 진하게).

## 5. 셸 (세 역할 공통, `app/AppShell.tsx`)

- **상단바** 56px, brand-ink 바탕 + 흰 글씨(사이트 헤더처럼 단단하게): 워드마크(빨강 판 「역전할머니맥주」 + × + 「윤슬」) · 역할 전환 radiogroup(본사 SV / 점장 / 직원, 고른 것은 흰 바탕 ink 글자) · 매장 표시 · 가상 표지(점선) · AI 모드 · 실시간 연결 · 심사 모드 토글.
- **사이드바** 240px(≥1024): 역할별 그룹(그룹 이름 + 작은 영문), 항목 40px, 활성 = ink 바탕 흰 글자. 실행 중인 흐름이 있으면 '에이전트 운영' 옆에 노랑 점(이벤트가 있을 때만). 맨 아래 익명·가상 고지 한 줄.
- **하단 탭바**(<1024): 최대 5칸, 칸 높이 56px(터치 44px 이상). 6개 이상이면 4개 + '더보기'(위로 열리는 메뉴, Escape·바깥 누르기로 닫힘). 활성 탭 = ink 굵은 글자 + 위쪽 노랑(highlight) 3px.
- **본문**: 최대 1280px, 12열, 거터 24/20/16px(≥1024/≥768/그 아래). 직원 화면은 같은 셸에서 본문만 640px.
- 역할별 메뉴: 본사 SV(전국 현황 / 매장 상세 · 리뷰 탐색 · 지식 그래프 / 본사 표준·개정 제안 / 에이전트 운영), 점장(오늘 할 일 / 매장 위키 · 지식 그래프), 직원(오늘 브리핑 · 물어보기 · 기록하기 / 매장 위키).

## 6. 반응형

| 폭 | 변화 |
|---|---|
| ≥ 1280 | 매장 상세 오른쪽 360px sticky 결정 패널, 에이전트 팀 4열 |
| 1024–1279 | 사이드바 유지, 결정 패널은 머리글 아래 전체 폭 |
| < 1024 | 사이드바 → 하단 탭바. 상단바가 두 줄로 접힐 수 있음 |
| < 768 | 위험 순위 표 → 카드 목록(정렬은 선택 상자), 거터 16px |
| 390 | 기준 휴대폰 폭. 페이지 가로 스크롤 0(넓은 표는 카드 안에서만 가로 스크롤) |

터치 대상 44px 이상. 직원 화면 주요 버튼 52px(`Button size="lg"`). 입력칸 44px 이상.

## 7. 부품 목록

| 부품 | 파일 | 옮겨 온 곳 |
|---|---|---|
| AppShell·Sidebar·BottomTabs | `app/AppShell.tsx` | 신규(cotutor DESIGN_AUDIT 셸 규칙) |
| TopBar·Wordmark | `app/TopBar.tsx` | 신규 |
| KpiTile(로딩 '…', 없음 '—', 아래 노랑 선) | `shared/ui/KpiTile.tsx` | masdae `overview/KpiCards.tsx` |
| AlertStrip(확인 / 모두 확인, 브라우저 저장) | `features/hq-overview/AlertStrip.tsx` | 금융 `UrgentCallout.tsx` + FallGuard 배너 |
| StoreMap(시군구 경계, 매장 수·평균 평점·고위험) | `features/hq-overview/StoreMap.tsx`, `shared/geo/*` | TTA `RegionMap.tsx`·`koreaShapes.ts`·`data/koreaGeo.ts`(통계청 2018 경계) |
| RankingTable(URL 필터·aria-sort·빨강 4px 바·카드 목록) | `features/hq-overview/RankingTable.tsx` | 사회보장 `Queue.tsx` |
| ScoreBar(숫자 + 64×8) | `shared/ui/RiskBar.tsx` | 사회보장 `ui.tsx` ScoreBar |
| Highlighted·locate·keywordRanges | `shared/ui/Highlighted.tsx` | 사회보장 `ui.tsx` Highlighted |
| DecisionPanel(진단·처방·상태·4주 가상 결과) | `features/store-detail/DecisionPanel.tsx` | 사회보장 `Detail.tsx` DecisionPanel |
| Drawer + DrawerSection(포커스 트랩, 원문 → 근거 → 조치) | `shared/ui/Drawer.tsx` | masdae `ClaimDrawer.tsx` + 관광공사 `team-board.tsx` + 누리지킴이 `FindingDetailSheet.tsx` |
| ReviewDrawer | `features/store-detail/ReviewDrawer.tsx` | 사회보장 `focusQuote`/`goMemo` |
| Provenance·AiDraftBadge·RuleBadge·HumanStamp | `shared/ui/Badge.tsx` | cotutor DESIGN_CONCEPT 3중 표지 |
| StatusPill | `shared/ui/StatusPill.tsx` | masdae `StatusPill.tsx` |
| FlowRail·AgentCard·GatePanel·StepDrawer·LiveBoard | `features/agents/*` | masdae `agent-team/*` |
| RunLog(실행 중 펼침, 끝나면 접힘) · useNow('N초 경과') | `features/agents/RunLog.tsx`, `shared/lib/useNow.ts` | 금융 `LiveExecutionPanel.tsx` |
| TeamStructure(게이트 띠 + 인스펙터 + 에이전트 목록) · declare | `features/agents/TeamStructure.tsx`, `declare.ts` | 금융 `TeamStructureView.tsx` + AI Platform `lib/agents.ts`·`Dashboard.tsx` |
| RunProgress(agent-work-line: 진행 중 한 줄, 끝나면 접힘) | `shared/ui/RunProgress.tsx` | 관광공사 `agent-work-line.tsx` |
| CiteText·CiteChip·CardDrawer | `shared/ui/CiteText.tsx`, `KnowledgeCard.tsx` | 관광공사 `report-drawer.tsx` useEvidenceDrawer·`evidence-card.tsx` |
| PresentProvider(?present=1) | `shared/lib/present.tsx` | cotutor `ui/present.tsx` |

## 8. 화면 패턴

- **말풍선**(`.bubble`, 24px 0 24px 24px, yellow-weak): 브리핑 '손님께 할 말', 카드 '손님 안내', 처방 브리핑 본문. 빈 상태 안내는 같은 모양 + sunken 바탕.
- **형광펜**: 리뷰 원문 속 근거 구절은 `<mark>`(brand-highlight). 강조어 밑줄 `.hl-line`은 한 화면에 한두 번만(전국 현황 제목).
- **서랍 순서**: 원문 → 근거 → 조치(번호 원 + 절 제목). 열면 닫기 버튼으로 초점, Tab은 서랍 안에 갇힘, Escape·바깥 누르기로 닫고 연 요소로 초점을 돌려준다.
- **표**: 머리글 sunken, 행 hover ink-weak, 정렬 가능한 머리글은 버튼 + `aria-sort`. 필터·정렬·지도 선택은 URL 검색어(`?q=&region=&area=&cross=&high=1&gu=&sort=&dir=&metric=`).
- **심사 모드**: `?present=1`(끄기 `?present=0`) 또는 상단바 토글. 글자 18px 기준으로 확대, `.dev`(runId·ms·모델명·에이전트 id·카드 경로) 숨김.

## 9. 문구

- 해요체. 사이트처럼 짧고 단단한 문장. 버튼은 동사로 끝낸다('진단 실행', '처방 만들기', '보내기', '확인').
- 빈 상태: '아직 ~이 없어요' + 다음 행동 한 줄. 오류: '불러오지 못했어요' + 원인 한 줄 + '다시 시도'.
- 금지: 이모지, 보라 그라데이션, 뇌·로봇 아이콘, "AI가 분석했어요" 같은 문장(무엇이 무엇을 했는지 에이전트 이름·규칙 이름으로 쓴다). lucide 선 아이콘만.
- 매장은 익명 표시명만. 실제 매장명·주소·place id·작성자 정보 금지.

## v3 변경 (docs/PIVOT.md가 원본)

직원이 막히는 순간이 주인공이다. 브랜드 색·폰트·색 규칙(빨강은 고위험만)·해요체는 v2 그대로이고 화면 순서만 바뀌었다.

- 역할 전환 순서: 직원 / 점장 / 본사 SV. 기본은 직원(localStorage `yunseul-hq.role.v3`). `/`는 역할에 따라 `/store/{타깃}/staff`, `/store/{타깃}/manager`, `/hq`로 간다.
- 직원(`?tab=home|prep|record`, brief·ask는 홈): 홈은 큰 '지금 막혔어요' 입력창(52px 버튼) + 상황 칩(누르면 입력창만 채움) + 답 → 첫 근무 준비 노랑 띠(신입, 미완료) → 오늘 브리핑. 첫 근무 준비는 카드를 펼쳐 읽고 '읽었어요'만 누르며 진행 막대가 있다. 읽은 카드는 체크 달린 한 줄로 접힌다. 퀴즈·점수 없음.
- 점장: 오늘 할 일 한 줄 → 넘어온 질문 → 새 알바 준비 상태 → 우리 매장 상황 표(데스크톱 표, md 미만 카드 목록, '카드 없음' 노랑 배지 + 카드 만들기 폼) → 승인 대기 → 위키 점검 → 접힌 받은 처방·진단 요약.
- 본사 SV: 메뉴는 전국 상황 / 매장 비교 / 카드·표준 / 에이전트 + 근거(리뷰·그래프). `/hq`는 '전국에서 자주 터지는 상황' 표 → KPI → 위험 순위 → 접힌 '전국 지도와 분포 더 보기'.
