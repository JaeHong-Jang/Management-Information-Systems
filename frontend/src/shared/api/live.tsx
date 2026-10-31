// 실시간 상태: SSE(/api/stream)로 들어오는 실행 이벤트를 모으고, 위키가 바뀌면 그래프와 스냅숏을 갱신한다.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AgentStep, Graph, GraphEdge, GraphNode, RunEvent } from '@shared/contracts';
import { api, type State } from './client';

export interface RunView {
  runId: string;
  flowName: string;
  actor: string;
  input: string;
  at: string;
  running: string | null; // 지금 일하는 에이전트
  steps: AgentStep[];
  gates: Extract<RunEvent, { type: 'gate' }>['gate'][];
  done: boolean;
  summary: string;
}

interface Live {
  state: State | null;
  graph: Graph;
  fresh: Set<string>; // 방금 생기거나 바뀐 노드 (그래프에서 강조)
  runs: RunView[]; // 최신 순
  wikiFeed: { at: string; op: string; detail: string; runId: string }[];
  connected: boolean;
  me: string; // 지금 화면을 쓰는 사람(질문·기록의 주인)
  setMe: (id: string) => void;
  refresh: () => Promise<void>;
}

const Ctx = createContext<Live | null>(null);
export const useLive = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error('LiveProvider 밖');
  return v;
};

function mergeGraph(g: Graph, nodes: GraphNode[], edges: GraphEdge[]): Graph {
  const n = new Map(g.nodes.map((x) => [x.id, x]));
  nodes.forEach((x) => n.set(x.id, { ...n.get(x.id), ...x }));
  const e = new Map(g.edges.map((x) => [x.id, x]));
  edges.forEach((x) => e.set(x.id, x));
  return { nodes: [...n.values()], edges: [...e.values()].filter((x) => n.has(x.source) && n.has(x.target)) };
}

export function LiveProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State | null>(null);
  const [graph, setGraph] = useState<Graph>({ nodes: [], edges: [] });
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [runs, setRuns] = useState<RunView[]>([]);
  const [wikiFeed, setWikiFeed] = useState<Live['wikiFeed']>([]);
  const [connected, setConnected] = useState(false);
  const [me, setMe] = useState(() => localStorage.getItem('me') || 'P005');
  const timer = useRef<number>();

  const refresh = useCallback(async () => {
    const [s, g] = await Promise.all([api.state(), api.graph()]);
    setState(s);
    setGraph((prev) => mergeGraph({ nodes: [], edges: [] }, g.nodes.map((n) => ({ ...prev.nodes.find((p) => p.id === n.id), ...n })), g.edges));
  }, []);

  const scheduleRefresh = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void refresh(), 250);
  }, [refresh]);

  useEffect(() => {
    void refresh();
    const es = new EventSource('/api/stream');
    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);
    es.onmessage = (msg) => {
      setConnected(true);
      const e = JSON.parse(msg.data) as RunEvent;
      setRuns((prev) => applyEvent(prev, e));
      if (e.type === 'wiki') {
        setGraph((g) => mergeGraph(g, e.change.nodes, e.change.edges));
        const ids = [...e.change.nodes.map((n) => n.id), ...e.change.edges.map((x) => x.id)];
        setFresh((f) => new Set([...f, ...ids]));
        window.setTimeout(() => setFresh((f) => new Set([...f].filter((id) => !ids.includes(id)))), 4000);
        setWikiFeed((f) => [{ at: e.at, op: e.change.op, detail: e.change.detail, runId: e.runId }, ...f].slice(0, 60));
        scheduleRefresh();
      }
      if (e.type === 'run-end') scheduleRefresh();
    };
    return () => es.close();
  }, [refresh, scheduleRefresh]);

  useEffect(() => localStorage.setItem('me', me), [me]);

  const value = useMemo(() => ({ state, graph, fresh, runs, wikiFeed, connected, me, setMe, refresh }), [state, graph, fresh, runs, wikiFeed, connected, me, refresh]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

function applyEvent(prev: RunView[], e: RunEvent): RunView[] {
  if (e.type === 'run-start')
    return [{ runId: e.runId, flowName: e.flowName, actor: e.actor, input: e.input, at: e.at, running: null, steps: [], gates: [], done: false, summary: '' }, ...prev].slice(0, 40);
  return prev.map((r) => {
    if (r.runId !== e.runId) return r;
    switch (e.type) {
      case 'agent-start':
        return { ...r, running: e.agentId };
      case 'agent-end':
        return { ...r, running: null, steps: [...r.steps, e.step] };
      case 'gate':
        return { ...r, gates: [...r.gates, e.gate] };
      case 'run-end':
        return { ...r, done: true, running: null, summary: e.summary };
      default:
        return r;
    }
  });
}
