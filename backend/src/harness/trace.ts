// 실행 기록 버스. 모든 실행의 이벤트가 여기를 지나 SSE 구독자에게 실시간으로 간다.
// 최근 이벤트 300개는 메모리에 두고, 새로 붙은 화면에는 먼저 재생해 준다.
import { EventEmitter } from 'node:events';
import type { RunEvent, RunTrace } from '@shared/contracts';

const MAX_EVENTS = 300;
const MAX_RUNS = 60;

class TraceBus {
  private emitter = new EventEmitter();
  private recent: RunEvent[] = [];
  private runs = new Map<string, RunTrace>();

  constructor() {
    this.emitter.setMaxListeners(100);
  }

  emit(e: RunEvent) {
    this.recent.push(e);
    if (this.recent.length > MAX_EVENTS) this.recent.shift();
    if (e.type === 'run-start') {
      this.runs.set(e.runId, { runId: e.runId, flow: e.flow, startedAt: e.at, events: [] });
      while (this.runs.size > MAX_RUNS) this.runs.delete(this.runs.keys().next().value!);
    }
    this.runs.get(e.runId)?.events.push(e);
    this.emitter.emit('event', e);
  }

  subscribe(fn: (e: RunEvent) => void): () => void {
    this.emitter.on('event', fn);
    return () => this.emitter.off('event', fn);
  }

  replay(): RunEvent[] {
    return [...this.recent];
  }

  run(runId: string): RunTrace | undefined {
    return this.runs.get(runId);
  }

  clear() {
    this.recent = [];
    this.runs.clear();
  }
}

export const bus = new TraceBus();
