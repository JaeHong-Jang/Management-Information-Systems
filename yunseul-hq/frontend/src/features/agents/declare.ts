// 에이전트 목록 선언(AI Platform lib/agents.ts처럼): 단계 번호 · 종류 · 하는 일 · "끄면 빠지는 것" · 잠금.
// 하는 일은 하네스 선언(role)을 그대로 쓰고, '끄면 빠지는 것'은 화면용 설명이다. 끄기 기능은 없다(표시만).
// 검증팀과 지휘는 잠금: 끌 수 없다.
import type { AgentDef, HarnessConfig } from '@shared/contracts';

export const OFF: Record<string, string> = {
  orchestrator: '업무 배정 및 실행 순서 관리 중단',
  'review-collector': '신규 리뷰와 수집 건수 갱신 중단',
  'complaint-tagger': '리뷰별 불만 유형과 원인 집계 누락',
  'variance-scorer': '매장 위험 점수 및 순위 산출 중단',
  'cause-analyst': '원인 분류와 인용 근거 누락으로 처방 작성 불가',
  'drift-detector': '본사 표준과 매장 운영 간 차이 탐지 중단',
  'playbook-writer': '매장 사례 카드 초안 누락. SV 방문 과제만 작성',
  'sv-planner': 'SV 방문 과제와 현장 점검 항목 누락',
  'briefing-writer': '근무 전 고객 응대 예시 누락',
  'privacy-guard': '개인정보 가림 처리 중단으로 기록 저장 불가',
  interviewer: '추가 질문 없이 입력한 내용으로 초안 작성',
  'card-writer': '상황·판단 근거·조치별 카드 정리 중단',
  librarian: '근거 카드 검색 불가. 모든 질문을 점장에게 이관',
  coach: '근거 카드 목록만 제공. 응답 문장 작성 중단',
  escalator: '근거가 없는 질문의 점장 이관 중단',
  'quote-checker': '타 매장 리뷰 또는 원문에 없는 인용 탐지 불가',
  'citation-checker': '유효하지 않은 카드 번호 탐지 불가',
  'policy-checker': '본사 표준과 상충하는 응답 탐지 불가',
  'wording-guard': '금지 표현 또는 단정적 표현 탐지 불가',
  synthesizer: '신규 카드의 주제별 요약 반영 중단',
  linter: '상충·만료 카드 점검 누락',
  promoter: '복수 매장의 공통 사안에 대한 표준 개정 제안 누락',
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
