import { useMemo, useState } from 'react';
import type { NodeType } from '@shared/contracts';
import { useLive } from '@/shared/api/live';
import { Badge, CardDetail, CiteText, Empty, PageHeader, Panel, cx, fmtTime } from '@/shared/ui';
import { EDGE_STYLE, NODE_STYLE } from '@/shared/theme/tokens';
import { GraphCanvas, Legend, NodeMark } from './GraphCanvas';

export default function Ontology() {
  const { graph, fresh, state, wikiFeed } = useLive();
  const [hidden, setHidden] = useState<NodeType[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const count = useMemo(() => {
    const c: Record<string, number> = {};
    graph.nodes.forEach((n) => (c[n.type] = (c[n.type] ?? 0) + 1));
    return c;
  }, [graph]);
  const toggle = (t: NodeType) => setHidden((h) => (h.includes(t) ? h.filter((x) => x !== t) : [...h, t]));
  const node = sel ? graph.nodes.find((n) => n.id === sel) : null;
  // 선택한 노드와 이어진 것들(관계 이름과 함께)
  const links = useMemo(() => {
    if (!sel) return [];
    return graph.edges
      .filter((e) => e.source === sel || e.target === sel)
      .map((e) => ({ edge: e, other: graph.nodes.find((n) => n.id === (e.source === sel ? e.target : e.source)) }))
      .filter((x): x is { edge: (typeof graph.edges)[number]; other: (typeof graph.nodes)[number] } => !!x.other);
  }, [sel, graph]);

  return (
    <>
      <PageHeader
        eyebrow="온톨로지"
        title="지식 그래프"
        desc="매장 지식이 무엇으로 이루어져 있고 누가 쌓았는지 보여 줘요. 토픽 아래 사례 카드가 모이고, 질문은 카드를 근거로 쓰거나 점장 답을 거쳐 새 카드가 돼요."
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(Object.keys(NODE_STYLE) as NodeType[]).map((t) => {
          const off = hidden.includes(t);
          return (
            <button
              key={t}
              onClick={() => toggle(t)}
              aria-pressed={!off}
              className={cx('inline-flex h-9 items-center gap-2 rounded-full px-3.5 text-[14px] font-semibold transition-colors', off ? 'bg-transparent text-ink-disabled ring-1 ring-inset ring-line' : 'bg-surface text-ink-strong hover:bg-surface/70')}
            >
              <NodeMark type={t} muted={off} />
              {NODE_STYLE[t].label}
              <span className={off ? 'text-ink-disabled' : 'text-ink-weak'}>{count[t] ?? 0}</span>
            </button>
          );
        })}
        <span className="ml-auto text-[13px] text-ink-body">
          노드 {graph.nodes.length} · 관계 {graph.edges.length}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel className="!p-3 sm:!p-3">
          <GraphCanvas graph={graph} fresh={fresh} height={640} hidden={hidden} onSelect={setSel} focusId={sel} />
          <div className="px-2 pb-1 pt-3">
            <Legend />
          </div>
        </Panel>
        <div className="space-y-5">
          <Panel
            title={node ? <span className="inline-flex items-center gap-2"><NodeMark type={node.type} />{NODE_STYLE[node.type].label}</span> : '노드를 눌러 보세요'}
            action={node && <button onClick={() => setSel(null)} className="text-[13px] font-semibold text-ink-weak hover:text-ink-body">선택 해제</button>}
          >
            {sel ? (
              <>
                <NodeInfo id={sel} />
                {links.length > 0 && (
                  <div className="mt-5">
                    <p className="mb-1.5 text-[13px] font-semibold text-ink-weak">이어진 것 {links.length}</p>
                    <ul className="-mx-2 max-h-[260px] overflow-y-auto">
                      {links.map(({ edge, other }) => (
                        <li key={edge.id}>
                          <button onClick={() => setSel(other.id)} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-surface-subtle">
                            <NodeMark type={other.type} />
                            <span className="min-w-0 flex-1 truncate text-[14px] text-ink-strong">{other.label}</span>
                            <span className="flex-none text-[12px] text-ink-weak">{EDGE_STYLE[edge.type].label}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <p className="text-[14px] text-ink-body">토픽, 카드, 사람, 질문을 누르면 이어진 것만 또렷하게 보이고 내용이 여기에 나와요. 마우스를 올려도 이웃이 드러나요.</p>
            )}
          </Panel>
          <Panel title="방금 쌓인 것">
            {wikiFeed.length ? (
              <ul className="space-y-1">
                {wikiFeed.slice(0, 8).map((w, i) => (
                  <li key={`${w.runId}-${i}`} className={cx('animate-rise rounded-xl px-3 py-2', i === 0 && 'bg-brand-weak')}>
                    <p className="text-[14px] font-semibold text-ink-strong">{w.op}</p>
                    <p className="truncate text-[13px] text-ink-weak">{w.detail}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>
                아직 변화가 없어요. 왼쪽 아래 <b>매장의 하루 재생</b>을 누르면 그래프가 자라는 걸 볼 수 있어요.
              </Empty>
            )}
            {!wikiFeed.length && state && <p className="mt-2 text-[12px] text-ink-weak">최근 기록: {state.log[0]?.detail}</p>}
          </Panel>
        </div>
      </div>
    </>
  );
}

function NodeInfo({ id }: { id: string }) {
  const { state } = useLive();
  if (!state) return null;
  const name = (pid: string) => {
    const p = state.people.find((x) => x.id === pid);
    return p ? `${p.name} (${p.role} ${p.tenure})` : pid;
  };
  const card = state.cards.find((c) => c.id === id);
  if (card) return <CardDetail card={card} authorName={name(card.authorId)} />;
  const q = state.questions.find((x) => x.id === id);
  if (q)
    return (
      <div className="space-y-2 text-[14px]">
        <Badge tone={q.status === 'answered' ? 'brand' : q.status === 'escalated' ? 'warning' : 'success'}>{q.status === 'answered' ? '위키가 답함' : q.status === 'escalated' ? '점장 대기' : '점장 답 → 카드'}</Badge>
        <p className="font-semibold">{q.text}</p>
        <p className="text-ink-weak">{name(q.askerId)} · {fmtTime(q.time)}</p>
        <div className="rounded-lg bg-surface-subtle p-3 text-[13px]">
          <CiteText text={q.managerAnswer ? `점장 답: ${q.managerAnswer}` : q.answer} />
        </div>
      </div>
    );
  const p = state.people.find((x) => x.id === id);
  if (p) {
    const mine = state.cards.filter((c) => c.authorId === p.id && c.status === 'approved');
    const asked = state.questions.filter((x) => x.askerId === p.id);
    return (
      <div className="space-y-3 text-[14px]">
        <p className="text-sub">{p.name}</p>
        <p className="text-ink-weak">{p.role} · {p.tenure}</p>
        <p>남긴 사례 {mine.length}개 · 도움 {mine.reduce((s, c) => s + c.helpful, 0)}회 · 질문 {asked.length}개</p>
        <ul className="space-y-1 text-[13px] text-ink-body">
          {mine.slice(0, 6).map((c) => (
            <li key={c.id}>[{c.id}] {c.title}</li>
          ))}
        </ul>
      </div>
    );
  }
  if (id.startsWith('T:')) {
    const topic = id.slice(2);
    return (
      <div className="space-y-2">
        <p className="text-sub">{topic}</p>
        <p className="text-[13px] font-semibold text-ink-weak">핵심 판단 원칙</p>
        <div className="text-[13px] text-ink-body">
          <CiteText text={state.topicSummaries[topic] || '아직 종합되지 않았어요'} />
        </div>
      </div>
    );
  }
  return <p className="text-[14px]">{id.slice(2)} 출처로 묶인 카드들이에요.</p>;
}
