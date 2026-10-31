// 온톨로지 그래프. 새 노드는 이웃 옆에서 나타나 자리를 잡고, 방금 바뀐 것은 둘레 빛으로 잠시 강조한다.
// 토픽은 이름이 든 알약, 사람은 원, 카드는 초록 사각형(많이 쓰일수록 큼), 질문은 주황 마름모, 출처는 육각형.
import cytoscape, { type Core, type ElementDefinition } from 'cytoscape';
import fcose from 'cytoscape-fcose';
import { useEffect, useRef } from 'react';
import { Maximize2, Minus, Plus } from 'lucide-react';
import type { Graph, GraphNode, NodeType } from '@shared/contracts';
import { EDGE_STYLE, NODE_STYLE, PALETTE } from '@/shared/theme/tokens';

cytoscape.use(fcose);

const INK = '#191F28';
const FONT = 'Pretendard Variable, Pretendard, sans-serif';

function box(n: GraphNode) {
  switch (n.type) {
    case 'topic':
      return { w: Math.max(60, [...n.label].length * 14 + 28), h: 34 };
    case 'person':
      return { w: 34, h: 34 };
    case 'source':
      return { w: 32, h: 32 };
    case 'question':
      return { w: 20, h: 20 };
    default: {
      const s = 18 + Math.min(n.weight ?? 0, 22) * 0.8;
      return { w: s, h: s };
    }
  }
}

const toEl = (n: GraphNode): ElementDefinition => {
  const b = box(n);
  return { group: 'nodes', data: { id: n.id, label: n.label, type: n.type, sub: n.sub ?? '', w: b.w, h: b.h, color: NODE_STYLE[n.type].color, shape: NODE_STYLE[n.type].shape, pending: n.sub === '승인 대기' ? 1 : 0 } };
};

const STYLE: cytoscape.Stylesheet[] = [
  {
    selector: 'node',
    style: {
      width: 'data(w)',
      height: 'data(h)',
      shape: 'data(shape)' as never,
      'background-color': 'data(color)',
      'border-width': 2,
      'border-color': '#FFFFFF',
      label: 'data(label)',
      'font-family': FONT,
      'font-size': 13,
      'font-weight': 600,
      color: '#4E5968',
      'text-valign': 'bottom',
      'text-margin-y': 5,
      'text-wrap': 'ellipsis',
      'text-max-width': '120px',
      'text-background-color': '#FFFFFF',
      'text-background-opacity': 0.85,
      'text-background-padding': '2px',
      'text-background-shape': 'roundrectangle',
      'underlay-color': PALETTE.blue.mark,
      'underlay-opacity': 0,
      'underlay-padding': 8,
      'underlay-shape': 'ellipse',
      'transition-property': 'underlay-opacity, opacity, border-color',
      'transition-duration': 300,
    } as cytoscape.Css.Node,
  },
  // 토픽: 이름이 안에 든 파란 알약
  { selector: 'node[type = "topic"]', style: { shape: 'round-rectangle', 'corner-radius': 17, 'font-size': 14, 'font-weight': 700, color: '#FFFFFF', 'text-valign': 'center', 'text-margin-y': 0, 'text-background-opacity': 0, 'border-width': 0 } as cytoscape.Css.Node },
  { selector: 'node[type = "person"]', style: { color: PALETTE.purple.text } },
  { selector: 'node[type = "source"]', style: { color: INK } },
  // 카드·질문 라벨은 기본으로 숨기고, 방금 바뀐 것·선택·마우스를 올린 것과 그 이웃만 보여 준다(겹침 방지)
  { selector: 'node[type = "card"], node[type = "question"]', style: { 'text-opacity': 0, 'text-background-opacity': 0 } },
  { selector: 'node.fresh, node.hover, node:selected, node.near', style: { 'text-opacity': 1, 'text-background-opacity': 0.92, color: INK, 'z-index': 10 } },
  { selector: 'node[type = "topic"].near, node[type = "topic"].hover, node[type = "topic"]:selected', style: { color: '#FFFFFF', 'text-background-opacity': 0 } },
  { selector: 'node[pending = 1]', style: { 'background-color': PALETTE.green.weak, 'border-width': 2, 'border-style': 'dashed', 'border-color': PALETTE.green.mark } },
  { selector: 'node.fresh', style: { 'underlay-opacity': 0.22 } as cytoscape.Css.Node },
  { selector: 'node:selected', style: { 'underlay-opacity': 0.3, 'underlay-color': INK, 'underlay-padding': 6 } as cytoscape.Css.Node },
  { selector: 'node.dim', style: { opacity: 0.12 } },
  { selector: 'edge', style: { width: 1.2, 'line-color': 'data(color)', 'curve-style': 'straight', 'target-arrow-shape': 'none', opacity: 0.9, 'transition-property': 'opacity, width', 'transition-duration': 300 } },
  { selector: 'edge[dashed = 1]', style: { 'line-style': 'dashed', 'line-dash-pattern': [5, 4] } },
  { selector: 'edge[type = "cites"], edge[type = "became"]', style: { width: 1.8, 'target-arrow-shape': 'triangle', 'target-arrow-color': 'data(color)', 'arrow-scale': 0.7 } },
  { selector: 'edge[type = "conflicts"]', style: { width: 2 } },
  { selector: 'edge.fresh, edge.near', style: { width: 2.6, opacity: 1 } },
  { selector: 'edge.dim', style: { opacity: 0.06 } },
];

export function GraphCanvas({ graph, fresh, height = 520, hidden = [], onSelect, focusId, spotlight }: { graph: Graph; fresh: Set<string>; height?: number; hidden?: NodeType[]; onSelect?: (id: string | null) => void; focusId?: string | null; spotlight?: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;
  const focusRef = useRef(focusId);
  focusRef.current = focusId;

  useEffect(() => {
    // 대시보드(spotlight)에서는 휠로 확대하지 않는다(페이지 스크롤을 뺏지 않게)
    const cy = cytoscape({ container: host.current, style: STYLE, minZoom: 0.3, maxZoom: 2.5, userZoomingEnabled: !spotlight, wheelSensitivity: 0.25 });
    cy.on('tap', 'node', (e) => selectRef.current?.(e.target.id()));
    cy.on('tap', (e) => e.target === cy && selectRef.current?.(null));
    // 마우스를 올리면 그 노드와 이웃만 또렷하게(선택한 노드가 있으면 선택이 우선)
    cy.on('mouseover', 'node', (e) => {
      const n = e.target;
      n.addClass('hover');
      if (focusRef.current) return;
      const keep = n.closedNeighborhood();
      keep.nodes().addClass('near');
      keep.edges().addClass('near');
      cy.elements().not(keep).addClass('dim');
    });
    cy.on('mouseout', 'node', (e) => {
      e.target.removeClass('hover');
      if (focusRef.current) return;
      cy.elements().removeClass('dim near');
    });
    cyRef.current = cy;
    return () => cy.destroy();
  }, [spotlight]);

  // 그래프 반영: 없던 노드는 이웃 근처에 추가, 있던 노드는 데이터만 갱신, 사라진 것은 제거(초기화 때)
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    const want = new Set([...graph.nodes.map((n) => n.id), ...graph.edges.map((e) => e.id)]);
    const removed = cy.elements().filter((el) => !want.has(el.id()));
    const first = cy.nodes().length === 0;
    let added = 0;
    const before = cy.nodes();
    cy.batch(() => {
      removed.remove();
      for (const n of graph.nodes) {
        const el = cy.getElementById(n.id);
        if (el.nonempty()) {
          el.data(toEl(n).data);
          continue;
        }
        const nb = graph.edges.find((e) => e.source === n.id || e.target === n.id);
        const anchor = nb ? cy.getElementById(nb.source === n.id ? nb.target : nb.source) : null;
        const p = anchor?.nonempty() ? anchor.position() : { x: cy.width() / 2, y: cy.height() / 2 };
        cy.add({ ...toEl(n), position: { x: p.x + (Math.random() - 0.5) * 80, y: p.y + (Math.random() - 0.5) * 80 } });
        added++;
      }
      for (const e of graph.edges) {
        if (cy.getElementById(e.id).nonempty()) continue;
        const st = EDGE_STYLE[e.type];
        cy.add({ group: 'edges', data: { id: e.id, source: e.source, target: e.target, type: e.type, color: st.color, dashed: st.dashed ? 1 : 0 } });
        added++;
      }
    });
    if (added || removed.nonempty()) {
      // 이미 있던 노드는 제자리에 두고 새 노드만 자리를 잡게 한다(새 지식이 어디 붙었는지 눈으로 따라갈 수 있게)
      const keep = first ? cy.collection() : before.filter((n) => n.inside());
      keep.lock();
      const layout = cy.layout({
        name: 'fcose',
        animate: !first,
        animationDuration: 700,
        randomize: first,
        fit: true,
        padding: 36,
        nodeRepulsion: () => 7000,
        nodeSeparation: 70,
        idealEdgeLength: (edge: cytoscape.EdgeSingular) => (edge.data('type') === 'belongs' ? 56 : edge.data('type') === 'governs' ? 110 : 75),
        quality: 'default',
      } as cytoscape.LayoutOptions);
      layout.one('layoutstop', () => keep.unlock());
      layout.run();
    }
  }, [graph]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.elements().removeClass('fresh');
    fresh.forEach((id) => cy.getElementById(id).addClass('fresh'));
    // 대시보드: 방금 실행된 경로(질문→카드→사람)만 또렷하게, 나머지는 잠시 흐리게
    if (spotlight && !focusId) {
      cy.elements().removeClass('dim near');
      const lit = cy.elements('.fresh');
      if (lit.nonempty()) {
        const path = lit.union(lit.connectedNodes());
        path.nodes().addClass('near');
        cy.elements().not(path).addClass('dim');
      }
    }
  }, [fresh, graph, spotlight, focusId]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.nodes().forEach((n) => {
      n.style('display', hidden.includes(n.data('type')) ? 'none' : 'element');
    });
  }, [hidden, graph]);

  // 선택한 노드와 이웃만 또렷하게
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.elements().removeClass('dim near');
    if (!focusId) return;
    const n = cy.getElementById(focusId);
    if (n.empty()) return;
    const keep = n.closedNeighborhood();
    keep.addClass('near');
    cy.elements().not(keep).addClass('dim');
  }, [focusId, graph]);

  const zoom = (k: number) => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.animate({ zoom: { level: cy.zoom() * k, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } } }, { duration: 200 });
  };
  // 좁은 화면에서는 칸을 낮춰 그래프가 작아지지 않게 한다
  const narrow = typeof window !== 'undefined' && window.innerWidth < 640;
  const fit = () => cyRef.current?.animate({ fit: { eles: cyRef.current.elements(':visible'), padding: 36 } }, { duration: 300 });

  return (
    <div className="relative">
      <div ref={host} style={{ height: narrow ? Math.min(height, 380) : height }} className="graph-dots w-full rounded-2xl bg-grey-50" />
      <div className="absolute bottom-3 right-3 flex flex-col overflow-hidden rounded-xl bg-surface shadow-float">
        {[
          { icon: Plus, label: '확대', on: () => zoom(1.25) },
          { icon: Minus, label: '축소', on: () => zoom(0.8) },
          { icon: Maximize2, label: '전체 보기', on: fit },
        ].map((b) => (
          <button key={b.label} onClick={b.on} aria-label={b.label} title={b.label} className="flex h-8 w-8 items-center justify-center text-ink-body hover:bg-surface-subtle">
            <b.icon size={15} />
          </button>
        ))}
      </div>
    </div>
  );
}

export function Legend({ compact }: { compact?: boolean }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] text-ink-body">
      {(Object.keys(NODE_STYLE) as NodeType[]).map((k) => (
        <span key={k} className="inline-flex items-center gap-1.5">
          <NodeMark type={k} />
          {NODE_STYLE[k].label}
        </span>
      ))}
      {!compact &&
        (['cites', 'became', 'conflicts', 'duplicates'] as const).map((k) => (
          <span key={k} className="inline-flex items-center gap-1.5">
            <span className="inline-block w-5 border-t-2" style={{ borderColor: EDGE_STYLE[k].color, borderStyle: EDGE_STYLE[k].dashed ? 'dashed' : 'solid' }} />
            {EDGE_STYLE[k].label}
          </span>
        ))}
    </div>
  );
}

/** 범례·필터에 쓰는 노드 모양 아이콘 */
export function NodeMark({ type, muted }: { type: NodeType; muted?: boolean }) {
  const c = NODE_STYLE[type].color;
  const base = { background: c, opacity: muted ? 0.3 : 1 };
  if (type === 'topic') return <span className="inline-block h-2.5 w-4 rounded-full" style={base} />;
  if (type === 'question') return <span className="inline-block h-2 w-2 rotate-45 rounded-[1px]" style={base} />;
  if (type === 'source') return <span className="inline-block h-2.5 w-2.5" style={{ ...base, clipPath: 'polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%)' }} />;
  return <span className={type === 'person' ? 'inline-block h-2.5 w-2.5 rounded-full' : 'inline-block h-2.5 w-2.5 rounded-[3px]'} style={base} />;
}
