// 실시간 실행 기록: /api/stream(SSE)의 RunEvent를 실행(run) 단위로 모은다.
// storeId를 주면 서버가 그 매장 + 본사 이벤트만 보낸다. 끊기면 2초 뒤 다시 붙는다.
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AgentStep, FlowId, GateResult, RunEvent } from '@shared/contracts';
import { api } from './client';

export interface RunView {
  runId: string;
  flow: FlowId;
  flowName: string;
  storeId: string | null;
  actor: string;
  input: string;
  at: string;
  running: string | null; // 지금 일하는 에이전트
  runningSince: string | null; // 그 에이전트의 agent-start 시각(서버 이벤트). 'N초 경과'는 이 값과 지금의 차이만 센다
  endedAt: string | null;
  steps: AgentStep[];
  gates: GateResult[];
  done: boolean;
  ok: boolean | null;
  summary: string;
}

interface Live {
  runs: RunView[]; // 최신 순
  connected: boolean;
  endCount: number; // run-end를 받을 때마다 1 증가: 화면이 다시 불러올 신호
}

const Ctx = createContext<Live>({ runs: [], connected: false, endCount: 0 });
export const useLive = () => useContext(Ctx);

export function applyEvent(prev: RunView[], e: RunEvent): RunView[] {
  if (e.type === 'run-start') {
    if (prev.some((r) => r.runId === e.runId)) return prev;
    const run: RunView = {
      runId: e.runId, flow: e.flow, flowName: e.flowName, storeId: e.storeId, actor: e.actor, input: e.input, at: e.at,
      running: null, runningSince: null, endedAt: null, steps: [], gates: [], done: false, ok: null, summary: '',
    };
    return [run, ...prev].slice(0, 60);
  }
  return prev.map((r) => {
    if (r.runId !== e.runId) return r;
    switch (e.type) {
      case 'agent-start':
        return { ...r, running: e.agentId, runningSince: e.at };
      case 'agent-end':
        return { ...r, running: null, runningSince: null, steps: [...r.steps, e.step] };
      case 'gate':
        return { ...r, gates: [...r.gates, e.gate] };
      case 'run-end':
        return { ...r, done: true, ok: e.ok, running: null, runningSince: null, endedAt: e.at, summary: e.summary };
      default:
        return r;
    }
  });
}

export function LiveProvider({ storeId, children }: { storeId?: string | null; children: ReactNode }) {
  const [runs, setRuns] = useState<RunView[]>([]);
  const [connected, setConnected] = useState(false);
  const [endCount, setEndCount] = useState(0);
  const lastSeen = useRef(0);

  useEffect(() => {
    let es: EventSource | null = null;
    let retry = 0;
    let stopped = false;
    const url = `/api/stream${storeId ? `?storeId=${encodeURIComponent(storeId)}` : ''}`;

    const connect = () => {
      if (stopped) return;
      es = new EventSource(url);
      lastSeen.current = Date.now();
      es.onopen = () => {
        lastSeen.current = Date.now();
        setConnected(true);
      };
      es.onerror = () => {
        setConnected(false);
        // 프록시가 오류로 닫은 연결은 브라우저가 다시 열지 않는다
        if (es?.readyState === EventSource.CLOSED) reconnect();
      };
      es.addEventListener('ping', () => (lastSeen.current = Date.now()));
      es.onmessage = (msg: MessageEvent<string>) => {
        lastSeen.current = Date.now();
        setConnected(true);
        let e: RunEvent;
        try {
          e = JSON.parse(msg.data) as RunEvent;
        } catch {
          return;
        }
        setRuns((prev) => applyEvent(prev, e));
        if (e.type === 'run-end') setEndCount((n) => n + 1);
      };
    };
    const reconnect = () => {
      es?.close();
      setConnected(false);
      window.clearTimeout(retry);
      retry = window.setTimeout(() => {
        // 다시 붙으면 서버가 지난 기록을 다시 보낼 수 있으므로 비우고 받는다
        setRuns([]);
        connect();
      }, 2000);
    };
    connect();
    // Vite 프록시는 백엔드가 재시작돼도 연결을 끊지 않는다. 20초 넘게 아무것도 없으면 다시 연다
    const watch = window.setInterval(() => {
      if (Date.now() - lastSeen.current > 20000) reconnect();
    }, 5000);
    return () => {
      stopped = true;
      window.clearInterval(watch);
      window.clearTimeout(retry);
      es?.close();
    };
  }, [storeId]);

  const value = useMemo(() => ({ runs, connected, endCount }), [runs, connected, endCount]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** 방금 시작한 실행 하나를 따라간다. 끝나면 onDone을 한 번 부른다.
 *  SSE가 끊겨 있어도 끝을 놓치지 않도록 3초마다 GET /api/runs/:id로 확인한다. */
export function useRunFollow(runId: string | null, onDone: (run: RunView) => void) {
  const { runs } = useLive();
  const [polled, setPolled] = useState<RunView | null>(null);
  const streamed = runId ? runs.find((r) => r.runId === runId) ?? null : null;
  const p = polled?.runId === runId ? polled : null;
  const run = streamed?.done ? streamed : p?.done ? p : streamed ?? p;
  const fired = useRef<string | null>(null);
  const cb = useRef(onDone);
  cb.current = onDone;

  useEffect(() => {
    if (!runId) return;
    let alive = true;
    const t = window.setInterval(async () => {
      try {
        const trace = await api.run(runId);
        if (!alive) return;
        const view = trace.events.reduce<RunView[]>((acc, e) => applyEvent(acc, e), [])[0] ?? null;
        if (view) setPolled(view);
        if (view?.done) window.clearInterval(t);
      } catch {
        // 아직 기록이 없거나 서버가 잠시 없음: 다음 차례에 다시 본다
      }
    }, 3000);
    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, [runId]);

  useEffect(() => {
    if (run?.done && fired.current !== run.runId) {
      fired.current = run.runId;
      cb.current(run);
    }
  }, [run]);
  return run;
}
