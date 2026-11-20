// 흐름 하나의 실행. 에이전트를 순서대로 부르며 시작·끝·게이트·위키 변경을 버스로 내보낸다.
import { randomUUID } from 'node:crypto';
import type { AgentStep, FlowId, GateResult, StepStatus, Via, WikiChange } from '@shared/contracts';
import { agentDef, config } from './config.js';
import { bus } from './trace.js';
import { status as aiStatus } from './llm.js';
import * as db from '../store/db.js';

export interface StepOut<T> {
  out: T;
  summary: string;
  via?: Via;
  status?: StepStatus;
  problems?: string[];
}

const at = () => new Date().toISOString();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class Run {
  readonly runId = `run-${Date.now().toString(36)}-${randomUUID().slice(0, 4)}`;
  readonly steps: AgentStep[] = [];

  constructor(
    readonly flow: FlowId,
    actor: string,
    input: string,
    private pace = Number(process.env.STEP_PACE_MS ?? 0), // 시연에서 에이전트 진행이 눈에 보이도록 늦춘다
  ) {
    bus.emit({ type: 'run-start', runId: this.runId, flow, flowName: config.flows[flow].name, actor, input: input.slice(0, 120), at: at() });
  }

  async step<T>(agentId: string, fn: () => StepOut<T> | Promise<StepOut<T>>): Promise<T> {
    const def = agentDef(agentId);
    bus.emit({ type: 'agent-start', runId: this.runId, agentId, at: at() });
    const t0 = Date.now();
    if (this.pace) await sleep(this.pace);
    try {
      const r = await fn();
      const step: AgentStep = {
        agentId,
        team: def.team,
        status: r.status ?? 'ok',
        via: r.via ?? 'rules',
        ms: Date.now() - t0,
        summary: r.summary,
        ...(r.problems?.length ? { problems: r.problems } : {}),
      };
      this.steps.push(step);
      bus.emit({ type: 'agent-end', runId: this.runId, step, at: at() });
      return r.out;
    } catch (err) {
      const step: AgentStep = { agentId, team: def.team, status: 'error', via: 'rules', ms: Date.now() - t0, summary: (err as Error).message };
      this.steps.push(step);
      bus.emit({ type: 'agent-end', runId: this.runId, step, at: at() });
      throw err;
    }
  }

  gate(gateId: string, problems: string[], action: string): GateResult {
    const gate: GateResult = { gateId, passed: problems.length === 0, problems, action: problems.length ? action : '통과' };
    bus.emit({ type: 'gate', runId: this.runId, gate, at: at() });
    return gate;
  }

  wiki(change: WikiChange) {
    db.addLog(change.op, change.detail, this.runId);
    bus.emit({ type: 'wiki', runId: this.runId, change, at: at() });
  }

  end(ok: boolean, summary: string) {
    db.save();
    bus.emit({ type: 'run-end', runId: this.runId, ok, summary, at: at() });
  }
}

/** LLM 결과가 있으면 그것을, 없으면 규칙 결과를 쓰고 출처를 함께 돌려준다. */
export async function llmOr<T>(llm: () => Promise<T | null>, rules: () => T, enabled: boolean): Promise<{ value: T; via: Via }> {
  if (!enabled) return { value: rules(), via: 'rules' };
  const v = await llm();
  return v === null ? { value: rules(), via: 'rules(LLM 실패 대체)' } : { value: v, via: aiStatus.mode as Via };
}
