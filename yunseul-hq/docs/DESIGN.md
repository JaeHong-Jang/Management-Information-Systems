# 윤슬 HQ 가맹점 운영포털 디자인

모든 역할의 상단에 ‘역전할머니맥주 × 윤슬’을 표시한다. 역전할머니맥주 쪽은 [공식 홈페이지의 헤더 원본](https://yeokjeonfnc.com/img/main/logo_img01_20240717.png)을 사용한다. 직원은 공통 매뉴얼에서 점검하고, 항목을 선택해 근거·리뷰·현장 질문으로 이동한다. 휴대폰에서는 상세 내용을 표 아래에 표시한다.

| 용도 | 현재 기준 |
|---|---|
| 상단과 메뉴 | 흰색 상단의 브랜드 로고와 역할 선택, 먹색 업무 영역 메뉴, 왼쪽 세부 업무 목록을 사용한다. 선택된 메뉴에는 황색 강조선, 휴대폰에는 하단 업무 메뉴를 적용한다. |
| 본문 구조 | 매장 위키와 첫 근무 준비는 목록과 상세 문서를 나란히 표시한다. 점장 화면에서는 처리 대기 업무를 고른 다음 근거와 조치를 확인할 수 있다. |
| 글자 위계 | 여섯 단계만 사용한다. 페이지 제목 28px, 상세 제목 22px, 영역 제목 18px, 소제목 16px, 본문 14px, 보조 정보 12px. 값의 원본은 `frontend/src/index.css`의 `--fs-*` 변수이고 CSS와 Tailwind(`text-display`~`text-caption`)가 같은 변수를 쓴다. 굵기는 400·500·600·700, 강조와 제목은 700. Noto Sans KR을 기본으로 하고 페이지 제목과 윤슬 워드마크에 Gmarket Sans Bold를 사용한다. |
| 모서리와 움직임 | 모서리는 배지 5px, 조작 요소 8px, 카드 12px(`--r-*`). 화면 전환·접힌 내용 펼침·서랍은 `--ease` 곡선으로 0.24~0.36초, 버튼은 누를 때 살짝 줄어든다. `prefers-reduced-motion`이면 모두 정지한다. |
| 점검과 상태 | 바탕은 `#F8F6F2`, 표와 카드는 흰색이다. 완료는 초록색 체크, 고위험은 빨강 `#E60012`과 상태 문구로 표시한다. |
| 문안 | 명사형으로 끝나는 개조식(논문어체)으로 쓴다. 대장 열·상태·조치도 명사형이다. 리뷰 인용과 고객 응대 예문, 작성자가 남긴 기록은 원문을 유지한다. |
| 위키 점검 | 유형 요약(건수, 눌러서 거르기) → 유형별 묶음(조치 기준 한 줄) → 항목(대상·근거·관련 카드) 순서로 표시한다. |
| 지식 그래프 | 실제 관계만 선으로 표시한다. 기본은 ‘구조 보기’로, 매장 → 불만 유형 → 원인·처방 → 본사 표준 → 사례 카드 → 질문·기여자 순서의 열로 배치한다. ‘관계망’은 유형별로 모은 연결망이다(휴대폰 기본). 가리킨 항목의 직접 연결만 남기고 나머지는 흐리게 한다. 상세 패널은 연결 항목을 관계 종류별로 묶는다. 이름·번호 검색, 유형 필터(건수 표시), 확대·이동, 관련 카드 열기를 제공한다. |

글자 위계와 확대 시 재배치는 [Apple 타이포그래피 가이드](https://developer.apple.com/design/human-interface-guidelines/typography), 그래프의 전체·직접 연결 탐색은 [Obsidian 그래프 안내](https://help.obsidian.md/plugins/graph)를 참고했다.

색과 서체의 출처는 [공식 사이트 공통 스타일](https://yeokjeonfnc.com/css/style.css)과 [브랜드 소개 스타일](https://yeokjeonfnc.com/css/brand.css)이다.

## 이전 버전의 디자인 기록

아래는 기존 시연 화면의 v2·v3 설계 기록이다.

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
- **사이드바** 240px(≥1024), 위에서 아래로 네 칸(`app/SidebarPanels.tsx`). 가짜 메뉴로 빈 곳을 채우지 않고, 목록 항목은 모두 눌러서 해당 화면·구역(#id)으로 간다.
  1. **지금 맥락 카드**: 매장·오늘 + 누구인지 + 주 행동 버튼 하나. 직원 = 이름·역할, 첫 근무 준비 n/m 막대(신입), '막혔어요 · 물어보기'(#ask, 입력창에 커서). 점장 = 넘어온 질문·승인 대기 수, 할 일이 있는 구역으로 가는 버튼. 본사 = 순위 매긴 매장 수·고위험·열린 표준 차이, 타깃 매장 보기.
  2. **메뉴**: 역할별 그룹(그룹 이름 + 작은 영문), 항목 40px, 활성 = ink 바탕 흰 글자. 실행 중이면 '에이전트' 옆 노랑 점, 직원 '홈'에 새 답 점, 점장 '오늘 할 일'에 넘어온 질문 수 배지.
  3. **실데이터 목록**(최대 3줄): 직원 = 내 질문(답 옴·대기·카드로 답함), 점장 = 카드 없는 상황, 본사 = 위험 상위 매장.
  4. **맨 아래**(mt-auto): 점장·본사 = AI 모드 상태 한 줄, 직원 = '카드에 없는 일은 점장님께' 안내. 그리고 익명·가상 고지.
- **하단 탭바**(<1024): 최대 5칸, 칸 높이 56px(터치 44px 이상). 6개 이상이면 4개 + '더보기'(위로 열리는 메뉴, Escape·바깥 누르기로 닫힘). 활성 탭 = ink 굵은 글자 + 위쪽 노랑(highlight) 3px.
- **본문**: 최대 1280px, 12열, 거터 24/20/16px(≥1024/≥768/그 아래).
  - 직원: 한 열 640px. 홈만 ≥1280에서 두 열(왼쪽 묻기·답·내 질문, 오른쪽 340px 첫 근무 준비 띠·오늘 브리핑). 상황 버튼은 ≥768에서 줄바꿈, 그 아래는 가로 스크롤.
  - 점장: 오늘 할 일 숫자 타일 4개(누르면 그 구역) → ≥1280 두 열(왼쪽 처리할 것: 넘어온 질문·승인 대기, 오른쪽 340px 지켜볼 것: 새 알바 준비·위키 점검) → 전체 폭 상황 표 → 접힌 처방·진단.
  - 주소의 #구역은 셸이 찾아 스크롤한다(늦게 커지는 패널이 있으면 1.5초 동안 위치를 다시 맞추고, 사람이 스크롤하면 멈춘다).
- 역할별 메뉴: 본사 SV(전국 현황 / 매장 상세 · 리뷰 탐색 · 지식 그래프 / 본사 표준·개정 제안 / 에이전트 운영), 점장(오늘 할 일 / 매장 위키 · 지식 그래프), 직원(오늘 브리핑 · 물어보기 · 기록하기 / 매장 위키).

### 카드 읽는 순서 (모든 화면 공통, `shared/ui/KnowledgeCard.tsx` CardBody)

위키 상세·근거 카드 서랍·첫 근무 준비·승인 대기가 같은 순서로 보여 준다. 현장에서 먼저 필요한 것부터예요.

1. 제목 + 표지(본사/매장 · 출처 · 가상 표준 · 승인 상태)
2. **언제**(상황) 한 줄
3. **손님께 할 말** 말풍선
4. **이렇게 해요** 번호 목록
5. **하지 말 것** | **이럴 땐 점장 부르기**(노랑 상자). 넓으면 두 칸
6. **왜**(판단 이유)
7. 숫자 정보 한 줄(번호·토픽·표준·도움/안 됨/사용·만료). 첫 근무 준비에서는 빼고 번호와 표지만 맨 아래에 둔다

- **매장 위키**: ≥1024 목록 340px(토픽 묶음, 따로 스크롤) + 고른 카드 상세(토픽 요약 한 줄 위). 둘 다 상단바 아래 고정. <1024는 목록에서 고른 줄 바로 아래 펼침. 주소 #C006이면 그 카드를 고른다.
- **첫 근무 준비**: 한 장씩. 진행 막대는 카드 머리에 둔다(따로 상자 없음). 실제 리뷰 한 줄 → 카드 본문. 전체 목록(읽음 표시, 누르면 그 장으로)은 ≥1280 오른쪽 340px, 그 아래는 카드 밑.

## 6. 반응형

| 폭 | 변화 |
|---|---|
| ≥ 1280 | 매장 상세 오른쪽 360px sticky 결정 패널, 에이전트 팀 4열, 직원 홈·점장 오늘 할 일 두 열(오른쪽 340px) |
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

## v3.1 변경 (docs/PIVOT.md §8이 원본)

색·폰트·색 규칙은 그대로다. '막힘 → 점장 답 → 카드' 순환이 직원 화면에서 끊기지 않게 화면 순서와 문구만 바꿨다.

- **매장 상태 공유**: `app/StoreData.tsx`가 매장 상태 하나를 셸·직원·점장 화면에 나눠 준다. 실행 끝(SSE run-end)과 15초마다(탭이 보일 때만) 다시 불러온다. 셸의 알림 표시가 이 값을 쓴다.
- **알림 표시**: 직원 '홈'(사이드바·하단 탭)에는 내가 물은 질문에 점장 답이 왔는데 아직 안 봤을 때 노랑 점. 본 질문 id는 localStorage(`yunseul-hq.seen.v3.{사람}`). 점장 '오늘 할 일'에는 넘어온 질문 수 노랑 배지. 점장 하단 탭에서는 '지식 그래프'를 빼고 사이드바에만 둔다(`NavItem.sidebarOnly`).
- **'나'**: localStorage(`yunseul-hq.me.v3.{매장}`). 없으면 처음 한 번 '누구세요?' 이름 버튼(56px). 매장명 카드는 없애고 '나'는 본문 맨 위 한 줄(`key={me}`로 사람이 바뀌면 화면 상태 초기화).
- **상단바(직원)**: AI 모드·실시간·심사 모드 칩을 숨기고 점선 '가상 포함'만 남긴다. 직원에서 `RunProgress`는 아무것도 그리지 않는다(runId·에이전트 수 없음).
- **직원 홈 순서**: 상황 버튼(가로 스크롤 한 줄, 누르면 바로 보냄) → 입력창(Enter 보내기, Shift+Enter 줄바꿈, 한글 조합 중 Enter 무시) + 바로 아래 52px 보내기 → 답(도착하면 `scrollIntoView`, `scroll-mt-[112px]`·`scroll-mb-[88px]`로 상단바·하단 탭에 안 가림) → 내 질문 → 첫 근무 준비 띠 → 오늘 브리핑 3개 + 접힌 나머지.
- **답 모양**: 손님께 이렇게 말하세요(말풍선) → 이렇게 해요 2줄 → 더 보기(이어서·왜·하지 말 것·점장 부르기) → 근거 카드 칩 한 번. 넘김이면 amber 안내 + 굵은 '점장님을 직접 불러 주세요' + '지금 할 수 있는 것'(nearCardId 카드의 말풍선·2줄).
- **내 질문**: 대기 중(amber) / 답 옴(done) / 카드로 답했어요(회색). 새로 온 답은 노랑 바탕 + '새 답' 칩을 그 화면에서 한 번만 보여 주고 본 것으로 기록한다.
- **첫 근무 준비**: 한 장씩. 진행 막대 + 'n번째 카드', 아래 이전 / 읽었어요(읽은 장에서는 '다음 장'). 읽은 장은 접힌 한 줄 목록. 리뷰 인용은 단어 경계에서 자른다.
- **점장**: 오늘 할 일 숫자는 해당 패널로 스크롤. 넘어온 질문은 '지금 바로'(30분 이내, `state.now` 기준, 펼침) / '오늘 안에'(접힘), 각 질문에 'n분 전'. 답을 저장하면 만들어진 카드를 그 자리에 보여 주고 '고치기'(`CardEditForm`, edit API, 편집자 = 점장). 승인 대기는 확인 3개를 모두 체크해야 승인 버튼이 켜진다. 상황 표는 매장 카드 없는 상황만 먼저 보이고 나머지는 '카드 있는 상황 n개 더 보기'. 새 알바 준비 상태는 사람마다 한 줄(이름·막대·k/N), 안 읽은 목록은 접힘. 위키 점검 부제는 CHECK, 내부 번호(RD…)는 화면에서 숨기고 title 속성에만 둔다.
