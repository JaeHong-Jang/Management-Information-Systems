// 에이전트 목록 선언(AI Platform lib/agents.ts처럼): 단계 번호 · 종류 · 하는 일 · "끄면 빠지는 것" · 잠금.
// 하는 일은 하네스 선언(role)을 그대로 쓰고, '끄면 빠지는 것'은 화면용 설명이다. 끄기 기능은 없다(표시만).
// 검증팀과 지휘는 잠금: 끌 수 없다.
import type { AgentDef, HarnessConfig } from '@shared/contracts';

export const OFF: Record<string, string> = {
  orchestrator: '모든 흐름의 시작점이라 끌 수 없어요',
  'review-collector': '새 리뷰가 들어오지 않아 점수가 수집일에 멈춰요',
  'complaint-tagger': '리뷰에 불만 유형이 붙지 않아 히트맵·원인 집계가 비어요',
  'variance-scorer': '위험 점수와 순위가 계산되지 않아 순위 표가 비어요',
  'cause-analyst': '원인 4분류와 리뷰 인용이 빠져 처방을 만들 수 없어요',
  'drift-detector': '본사 표준과 다른 운영(표준 차이) 기록이 빠져요',
  'playbook-writer': '매장 사례 카드 초안이 빠지고 SV 방문 과제만 나가요',
  'sv-planner': 'SV 방문 과제와 점검 항목이 빠져요',
  'briefing-writer': "근무 전 브리핑의 '손님께 할 말'이 빠져요",
  'privacy-guard': '개인정보 가림이 빠져 기록을 저장할 수 없어요',
  interviewer: '추가 질문 없이 적은 그대로 카드 초안이 돼요',
  'card-writer': '기록이 카드 모양(상황·판단 이유·할 일)으로 정리되지 않아요',
  librarian: '근거 카드를 찾지 못해 모든 질문이 점장에게 넘어가요',
  coach: '답 문장 없이 근거 카드 목록만 보여 줘요',
  escalator: '근거 없는 질문이 점장에게 넘어가지 않아요',
  'quote-checker': '끌 수 없어요 · 없는 리뷰 인용이 진단에 들어가는 것을 막아요',
  'citation-checker': '끌 수 없어요 · 없는 카드 번호를 단 답·처방을 막아요',
  'policy-checker': '끌 수 없어요 · 본사 표준과 어긋나는 답을 막아요',
  'wording-guard': '끌 수 없어요 · 금지·단정 표현이 화면에 나가는 것을 막아요',
  synthesizer: '토픽 요약이 새 카드를 반영하지 않아요',
  linter: '상충·만료 카드 점검 할 일이 빠져요',
  promoter: '여러 매장 공통 문제가 본사 표준 개정 제안으로 올라가지 않아요',
};

export interface Declared extends AgentDef { step: string; teamName: string; kind: '규칙' | 'LLM · 규칙 대체'; locked: boolean; off: string }

export function declare(h: HarnessConfig): Declared[] {
  const teamName = new Map(h.teams.map((t) => [t.id, t.name]));
  const order = h.teams.flatMap((t) => t.agents);
  const byId = new Map(h.agents.map((a) => [a.id, a]));
  return order
    .map((id) => byId.get(id))
    .filter((a): a is AgentDef => !!a)
    .map((a, i) => ({
      ...a,
      step: String(i + 1).padStart(2, '0'),
      teamName: teamName.get(a.team) ?? a.team,
      kind: a.llm ? 'LLM · 규칙 대체' : '규칙',
      locked: a.team === 'verify' || a.team === 'lead',
      off: OFF[a.id] ?? '—',
    }));
}

/** 이 에이전트가 들어가는 흐름과 그 안의 순서 */
export function flowsOf(h: HarnessConfig, id: string) {
  return Object.entries(h.flows)
    .filter(([, f]) => f.steps.includes(id))
    .map(([fid, f]) => ({ id: fid, name: f.name, pos: f.steps.indexOf(id) + 1, total: f.steps.length }));
}
