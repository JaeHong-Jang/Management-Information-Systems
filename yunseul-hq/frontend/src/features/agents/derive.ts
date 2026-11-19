// 에이전트 팀 화면의 파생 상태(masdae derive.ts). 상태는 SSE 실행 기록(RunView)에서만 나온다 — 연출용 진행 없음.
import type { AgentDef, AgentStep, HarnessConfig } from '@shared/contracts';
import type { RunView } from '@/shared/api/live';
import type { LiveStatus } from '@/shared/ui';

export type Phase = 'wait' | 'running' | 'done';

/** 팀 순서: 하네스 선언 순서 그대로 */
export const DEFAULT_RAIL = ['lead', 'monitor', 'diagnose', 'prescribe', 'verify'];

/** 실행에 참여하는 팀(흐름 단계 순서). 실행이 없으면 지휘 → 관측 → 진단 → 처방 → 검증 */
export function railTeams(h: HarnessConfig, run: RunView | null): string[] {
  if (!run) return DEFAULT_RAIL;
  const team = new Map(h.agents.map((a) => [a.id, a.team]));
  const steps = h.flows[run.flow]?.steps ?? [];
  const out = ['lead'];
  steps.forEach((s) => {
    const t = team.get(s);
    if (t && !out.includes(t)) out.push(t);
  });
  return out;
}

export function flowAgents(h: HarnessConfig, run: RunView | null): Set<string> {
  if (!run) return new Set();
  return new Set(['orchestrator', ...(h.flows[run.flow]?.steps ?? [])]);
}

/** 한 에이전트가 이번 실행에서 남긴 단계(같은 에이전트가 두 번 일할 수 있다: wording-guard 등) */
export function stepsOf(run: RunView | null, id: string): AgentStep[] {
  return run ? run.steps.filter((s) => s.agentId === id) : [];
}

export function agentStatus(a: AgentDef, run: RunView | null, inFlow: Set<string>): LiveStatus {
  if (!run) return 'wait';
  if (a.id === 'orchestrator') return run.done ? (run.ok ? 'ok' : 'error') : 'running';
  if (!inFlow.has(a.id)) return 'idle';
  if (run.running === a.id) return 'running';
  const last = stepsOf(run, a.id).at(-1);
  if (last) return last.status === 'ok' ? 'ok' : last.status;
  return run.done ? 'skipped' : 'wait';
}

export function teamPhase(h: HarnessConfig, team: string, run: RunView | null): Phase {
  if (!run) return 'wait';
  const inFlow = flowAgents(h, run);
  const ids = h.agents.filter((a) => a.team === team && inFlow.has(a.id));
  if (ids.length === 0) return 'wait';
  const st = ids.map((a) => agentStatus(a, run, inFlow));
  if (st.includes('running')) return 'running';
  if (st.every((s) => s !== 'wait')) return 'done';
  return st.some((s) => s !== 'wait') ? 'running' : 'wait';
}

/** 이 에이전트가 맡은 게이트에서 막힌 수 + 단계가 남긴 문제 수 */
export function blockedCount(h: HarnessConfig, run: RunView | null, id: string): number {
  if (!run) return 0;
  const gateIds = new Set(h.gates.filter((g) => g.agents.includes(id)).map((g) => g.id));
  const gates = run.gates.filter((g) => !g.passed && gateIds.has(g.gateId)).length;
  const problems = stepsOf(run, id).reduce((n, s) => n + (s.status === 'blocked' ? 1 : 0), 0);
  return Math.max(gates, problems);
}
