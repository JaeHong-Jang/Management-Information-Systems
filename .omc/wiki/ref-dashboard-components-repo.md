---
title: "ref-dashboard-components (참고 repo: 대시보드/컴포넌트)"
tags: ["reference", "repo", "dashboard", "shadcn", "tailwind", "components"]
created: 2026-10-30T16:19:58.464Z
updated: 2026-10-30T16:19:58.464Z
sources: ["docs/references/repos.md"]
links: ["ref-toss-ux-repo-ux-ui.md", "ref-adoption-decision-repo.md"]
category: pattern
confidence: medium
schemaVersion: 1
---

# ref-dashboard-components (참고 repo: 대시보드/컴포넌트)

# 참고 repo: 대시보드 / 컴포넌트

전체 표는 docs/references/repos.md 참고. 관련: [[ref-toss-ux-repo-ux-ui]]

| 이름 | URL | 라이선스/규모 | 가져올 점 |
|---|---|---|---|
| shadcn/ui | https://github.com/shadcn-ui/ui | MIT, 약 127k | 코드 복사형 컴포넌트, CSS 변수 토큰 |
| Radix Primitives | https://github.com/radix-ui/primitives | MIT, 약 19.4k | 접근성 내장 Dialog/Popover/Tabs/Tooltip |
| Tremor | https://github.com/tremorlabs/tremor | Apache-2.0, 약 3.7k | KPI 카드, 스파크라인 블록 |
| Recharts | https://github.com/recharts/recharts | MIT, 약 27.7k | 선언형 차트 (카드 증가 추이, 분포) |
| Sonner | https://github.com/emilkowalski/sonner | MIT, 약 13.1k | 스택형 토스트 (실시간 알림) |
| TanStack Table | https://github.com/TanStack/table | MIT, 약 28.5k | 헤드리스 테이블 (매니저 관리 화면) |

실시간 활동 피드 패턴: 최신순 리스트, SSE 수신 시 상단 삽입, 새 항목 배경 1.5초 페이드, 에이전트 아바타 + 상대 시간. 미조회 후보(cmdk, TanStack Query, motion, zustand, nivo, visx)는 [미검증]. 결정은 [[ref-adoption-decision-repo]].

