---
title: "ref-agent-trace (참고 repo: 에이전트 오케스트레이션/트레이스 UI)"
tags: ["reference", "repo", "agent", "tracing", "langgraph", "sse"]
created: 2026-10-30T16:19:57.899Z
updated: 2026-10-30T16:19:57.899Z
sources: ["docs/references/repos.md"]
links: ["kmsk-contest-hub.md", "ref-adoption-decision-repo.md"]
category: pattern
confidence: medium
schemaVersion: 1
---

# ref-agent-trace (참고 repo: 에이전트 오케스트레이션/트레이스 UI)

# 참고 repo: 에이전트 오케스트레이션 / 트레이스 UI

전체 표는 docs/references/repos.md 참고. 관련: [[kmsk-contest-hub]]

| 이름 | URL | 라이선스/규모 | 가져올 점 |
|---|---|---|---|
| LangGraph | https://github.com/langchain-ai/langgraph | MIT, 약 44.2k | 상태 그래프, 체크포인트, interrupt (매니저 에스컬레이션) |
| LangGraph Studio 문서 | https://langchain-ai.github.io/langgraph/concepts/langgraph_studio | 문서 (독립 repo는 404) | 그래프 모드, time travel |
| OpenAI Agents SDK Tracing | https://openai.github.io/openai-agents-python/tracing/ | MIT, 약 30.4k | trace/span, handoff, guardrail 이벤트 모델 |
| CrewAI | https://github.com/crewAIInc/crewAI | MIT, 약 60.3k | role/goal/backstory 역할 카드 |
| AutoGen / AutoGen Studio | https://github.com/microsoft/autogen | CC-BY-4.0 (코드 라이선스 확인 필요), 약 61.6k | 팀 빌더, 메시지 흐름 뷰 |
| Langfuse | https://github.com/langfuse/langfuse | MIT 코어로 알려짐, 약 36.8k | 트레이스 트리 + 타임라인, 세션 묶기 |
| Arize Phoenix | https://github.com/Arize-ai/phoenix | Elastic 2.0로 알려짐, 확인 필요 | 스팬 트리, eval 점수 |
| langgraphics | https://github.com/proactive-agent/langgraphics | MIT, 소규모 | 실행 중 노드 실시간 하이라이트 |
| AG-UI Protocol | https://github.com/ag-ui-protocol/ag-ui | MIT, 약 16.9k | 에이전트-UI 이벤트 스트림 표준 |
| assistant-ui | https://github.com/assistant-ui/assistant-ui | MIT, 약 12.8k | 채팅 UI, 도구 호출/출처 표시 |
| CopilotKit | https://github.com/CopilotKit/CopilotKit | MIT, 약 38.4k | 공유 상태, 사람 개입 승인 UI |

적용: SSE 이벤트를 agent_span, handoff, guardrail(lint), interrupt(에스컬레이션) 네 종류로 시작하고, 활동 피드, 그래프 하이라이트, 에이전트 상태 칩이 같은 스트림을 구독한다. 결정은 [[ref-adoption-decision-repo]].

