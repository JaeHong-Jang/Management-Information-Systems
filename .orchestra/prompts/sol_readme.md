너는 개발팀 작업자(GPT-6.1 Sol)다. 글 담당이다. 저장소 루트의 README.md 를 새로 쓴다(지금은 제목 한 줄뿐이다). 다른 파일은 수정하지 않는다.

먼저 읽을 것: docs/ARCHITECTURE.md, docs/strategy/차별화_전략.md, harness/harness.config.json, .orchestra/team.json, docs/judge/scores.json, docs/judge/demo_run.md, docs/judge/llm_vs_rules.md, docs/references/repos.md 와 winners.md 의 채택·패턴 절, docs/screenshots/ 파일 목록, backend/package.json, frontend/package.json.

README 구성 (한국어):
1. 제목 "이어받기" + 한 줄 정의 (차별화 전략의 한 문장 정의를 그대로 쓰거나 다듬기) + 공모전 이름
2. 대표 화면 이미지 3장 (docs/screenshots/overview-live-1440.png, ask-answer-1440.png, manager-1440.png) 상대경로 마크다운
3. 무엇을 해결하나 (짧은 문단 2개, 숫자는 전략 문서에 출처와 함께 있는 것만)
4. 어떻게 동작하나: 흐름 한 단락 + 에이전트 팀 표(팀 | 에이전트 | 하는 일 | LLM/규칙) — harness.config.json 그대로
5. 기존 서비스와 다른 점 (전략 문서 비교표 요약, 과장 금지, "미확인"은 유지)
6. 실행 방법: backend (npm install, npm start → 8787, npm test), frontend (npm install, npm run dev → 5173, /api 프록시), ANTHROPIC_API_KEY 있으면 Claude(claude-opus-5-5), 없으면 규칙 모드. 처음 화면에서 역할 고르기, "시연·심사용 전체 보기"에서 매장의 하루 재생. 비교 스크립트 backend/scripts/compare_modes.ts.
7. 폴더 구조 (하네스 구조) 표 — ARCHITECTURE.md 표 요약 + .orchestra(개발 오케스트라: Claude Opus 5.5·GPT-6 Astra 팀장, Claude Sonnet 5.5·GPT-6.1 Sol 작업자, 역할 분담: 코드는 Claude, 글은 GPT)
8. 개발 중 심사: 공모전 5개 기준으로 라운드별 점수 표(scores.json 의 라운드·심사위원·합계)와 라운드마다 바꾼 것 요약. 아직 없는 라운드는 쓰지 않는다.
9. 검증한 것 / 한계 (ARCHITECTURE.md 의 검증·한계·통제 범위에서. LLM 모드 미실측, 가상 데이터, 계정·권한 없음 등 정직하게)
10. 참고한 것 (repos.md 채택 결정 상위 항목, 수상작 패턴 — 링크는 문서 안에 있는 것만)

글쓰기 원칙: 짧은 문장, 번역투·상투어 금지("혁신적", "획기적", "~를 통해", "~에 있어서", "다양한"), 이모지 금지, 불릿만 나열하지 말고 문단과 표를 섞는다, 없는 사실을 쓰지 않는다. 다 쓰면 "README 작성 완료"만 출력한다.
