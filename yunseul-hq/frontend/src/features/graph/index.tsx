// /graph 지식 그래프: 매장 → 불만 → 원인 → 처방 → 카드. 층을 나눈 SVG(왼쪽에서 오른쪽으로 읽는다)
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { CauseClass, Graph, GraphNode, NodeType } from '@shared/contracts';
import { useApp } from '@/app/AppData';
import { api } from '@/shared/api/client';
import { useLive } from '@/shared/api/live';
import { useAsync } from '@/shared/lib/useAsync';
import { AsyncView, CauseChip, Empty, PageHeader, Panel } from '@/shared/ui';
import { CAUSE, CAUSES } from '@/shared/theme/semantics';

const MAIN: NodeType[] = ['store', 'complaint', 'cause', 'prescription', 'card'];
const TYPE_LABEL: Record<NodeType, string> = {
  store: '매장', complaint: '불만 유형', cause: '원인', prescription: '처방', card: '사례 카드', standard: '본사 표준(가상)', question: '질문', person: '사람',
};
const COL_W = 210;
const ROW_H = 30;
const PAD_X = 16;
const PAD_Y = 40;

export function GraphPage() {
  const [sp] = useSearchParams();
  const { targetId } = useApp();
  const storeId = sp.get('storeId') ?? targetId ?? undefined;
  const graph = useAsync(() => api.graph(storeId), [storeId]);
  const { endCount } = useLive();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    void graph.reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endCount]);

  return (
    <>
      <PageHeader title="지식 그래프" en="GRAPH" sub="리뷰 불만이 어떤 원인으로 분류되고, 어떤 처방과 카드로 이어졌는지 보여 줘요. 노드를 누르면 연결이 강조돼요" />
      <AsyncView state={graph}>{(g) => (g.nodes.length === 0 ? <Empty title="아직 그래프가 비어 있어요">진단과 처방을 실행하면 노드가 생겨요.</Empty> : <LayeredGraph g={g} />)}</AsyncView>
    </>
  );
}

function causeOf(n: GraphNode): CauseClass | null {
  return (CAUSES as string[]).includes(n.label) ? (n.label as CauseClass) : null;
}

function LayeredGraph({ g }: { g: Graph }) {
  const [extra, setExtra] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const cols = extra ? [...MAIN, 'extra' as const] : MAIN;

  const layout = useMemo(() => {
    const colOf = (t: NodeType) => (MAIN.includes(t) ? MAIN.indexOf(t) : extra ? MAIN.length : -1);
    const nodes = g.nodes.filter((n) => colOf(n.type) >= 0);
    const buckets = new Map<number, GraphNode[]>();
    nodes.forEach((n) => buckets.set(colOf(n.type), [...(buckets.get(colOf(n.type)) ?? []), n]));
    const pos = new Map<string, { x: number; y: number; n: GraphNode }>();
    let maxRows = 0;
    buckets.forEach((list, c) => {
      const sorted = [...list].sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0) || a.label.localeCompare(b.label, 'ko'));
      maxRows = Math.max(maxRows, sorted.length);
      sorted.forEach((n, i) => pos.set(n.id, { x: PAD_X + c * COL_W, y: PAD_Y + i * ROW_H, n }));
    });
    const edges = g.edges.filter((e) => pos.has(e.source) && pos.has(e.target));
    return { pos, edges, height: PAD_Y + maxRows * ROW_H + 8, width: PAD_X * 2 + cols.length * COL_W };
  }, [g, extra, cols.length]);

  const neighbors = useMemo(() => {
    if (!sel) return null;
    const s = new Set([sel]);
    layout.edges.forEach((e) => {
      if (e.source === sel) s.add(e.target);
      if (e.target === sel) s.add(e.source);
    });
    return s;
  }, [sel, layout.edges]);

  const selected = sel ? layout.pos.get(sel)?.n ?? null : null;

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12">
        <Panel
          bodyClass="p-0"
          title="연결 지도"
          actions={
            <label className="inline-flex items-center gap-1.5 text-body">
              <input type="checkbox" checked={extra} onChange={(e) => setExtra(e.target.checked)} />
              본사 표준·질문·사람도 보기
            </label>
          }
        >
          <div className="max-h-[70vh] overflow-auto">
            <svg width={layout.width} height={layout.height} role="img" aria-label="지식 그래프" className="block">
              {cols.map((c, i) => (
                <text key={c} x={PAD_X + i * COL_W} y={20} fontSize={12} fontWeight={700} fill="var(--text-muted)">
                  {c === 'extra' ? '표준·질문·사람' : TYPE_LABEL[c]}
                </text>
              ))}
              {layout.edges.map((e) => {
                const a = layout.pos.get(e.source)!;
                const b = layout.pos.get(e.target)!;
                const on = !neighbors || (neighbors.has(e.source) && neighbors.has(e.target) && (e.source === sel || e.target === sel));
                const x1 = a.x + 8;
                const x2 = b.x;
                const mx = (x1 + x2) / 2;
                return (
                  <path
                    key={e.id}
                    d={`M${x1},${a.y} C${mx},${a.y} ${mx},${b.y} ${x2},${b.y}`}
                    fill="none"
                    stroke={on && sel ? 'var(--ink)' : 'var(--line)'}
                    strokeWidth={on && sel ? 1.6 : 1}
                    opacity={on ? 1 : 0.25}
                  />
                );
              })}
              {[...layout.pos.values()].map(({ x, y, n }) => {
                const cause = n.type === 'cause' ? causeOf(n) : null;
                const color = cause ? CAUSE[cause].hex : n.type === 'store' ? 'var(--ink)' : 'var(--text-muted)';
                const dim = neighbors && !neighbors.has(n.id);
                return (
                  <g key={n.id} transform={`translate(${x},${y})`} opacity={dim ? 0.3 : 1} className="cursor-pointer" onClick={() => setSel(sel === n.id ? null : n.id)}>
                    <title>{`${TYPE_LABEL[n.type]} · ${n.label}${n.sub ? ` · ${n.sub}` : ''}`}</title>
                    {n.type === 'card' || n.type === 'prescription' ? (
                      <rect x={0} y={-6} width={12} height={12} rx={n.type === 'card' ? 2 : 0} fill={sel === n.id ? color : 'var(--surface)'} stroke={color} strokeWidth={2} />
                    ) : (
                      <circle cx={6} cy={0} r={6} fill={sel === n.id || n.type === 'store' || cause ? color : 'var(--surface)'} stroke={color} strokeWidth={2} />
                    )}
                    <text x={18} y={4} fontSize={12.5} fill="var(--text)" fontWeight={sel === n.id ? 700 : 400}>
                      {n.label.length > 14 ? `${n.label.slice(0, 14)}…` : n.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </Panel>
      </div>
      <div className="col-span-12 grid gap-6 md:grid-cols-2">
        <Panel title="선택한 노드">
          {!selected ? (
            <p className="text-body text-text-muted">노드를 눌러 보세요.</p>
          ) : (
            <div className="space-y-2">
              <p className="text-caption text-text-muted">{TYPE_LABEL[selected.type]} · {selected.id}</p>
              <p className="font-bold">{selected.label}</p>
              {selected.type === 'cause' && causeOf(selected) && <CauseChip cause={causeOf(selected)!} />}
              {selected.sub && <p className="text-body text-text-subtle">{selected.sub}</p>}
              <p className="text-caption text-text-muted">연결 {(neighbors?.size ?? 1) - 1}개</p>
              <ul className="space-y-0.5 text-body">
                {[...(neighbors ?? [])].filter((id) => id !== sel).map((id) => {
                  const n = layout.pos.get(id)?.n;
                  return n ? (
                    <li key={id}>
                      <button type="button" className="text-left text-ink hover:underline" onClick={() => setSel(id)}>
                        {TYPE_LABEL[n.type]} · {n.label}
                      </button>
                    </li>
                  ) : null;
                })}
              </ul>
            </div>
          )}
        </Panel>
        <Panel title="범례">
          <ul className="space-y-1.5 text-body">
            <li className="flex items-center gap-2"><svg width="14" height="14" aria-hidden><circle cx="7" cy="7" r="6" fill="var(--ink)" /></svg>매장</li>
            <li className="flex items-center gap-2"><svg width="14" height="14" aria-hidden><circle cx="7" cy="7" r="5.5" fill="none" stroke="var(--text-muted)" strokeWidth="2" /></svg>불만 유형·표준·질문·사람</li>
            <li className="flex items-center gap-2"><svg width="14" height="14" aria-hidden><rect x="1" y="1" width="12" height="12" fill="none" stroke="var(--text-muted)" strokeWidth="2" /></svg>처방</li>
            <li className="flex items-center gap-2"><svg width="14" height="14" aria-hidden><rect x="1" y="1" width="12" height="12" rx="2" fill="none" stroke="var(--text-muted)" strokeWidth="2" /></svg>사례 카드</li>
          </ul>
          <div className="mt-3 flex flex-wrap gap-1">
            {CAUSES.map((c) => <CauseChip key={c} cause={c} />)}
          </div>
        </Panel>
      </div>
    </div>
  );
}
