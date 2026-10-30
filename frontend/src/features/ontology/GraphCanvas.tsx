// 온톨로지 그래프. 새 노드는 이웃 옆에서 나타나 자리를 잡고, 방금 바뀐 것은 테두리로 잠시 강조한다.
import cytoscape, { type Core, type ElementDefinition } from 'cytoscape';
import fcose from 'cytoscape-fcose';
import { useEffect, useRef } from 'react';
import type { Graph, GraphNode, NodeType } from '@shared/contracts';
import { EDGE_STYLE, NODE_STYLE } from '@/shared/theme/tokens';

cytoscape.use(fcose);

const size = (n: GraphNode) => ({ topic: 52, source: 36, person: 30, question: 20, card: 18 + Math.min(n.weight ?? 0, 24) })[n.type];

const toEl = (n: GraphNode): ElementDefinition => ({
  group: 'nodes',
  data: { id: n.id, label: n.label, type: n.type, sub: n.sub ?? '', size: size(n), color: NODE_STYLE[n.type].color, shape: NODE_STYLE[n.type].shape, pending: n.sub === '승인 대기' ? 1 : 0 },
});

const STYLE: cytoscape.Stylesheet[] = [
  {
    selector: 'node',
    style: {
      width: 'data(size)',
      height: 'data(size)',
      shape: 'data(shape)' as never,
      'background-color': 'data(color)',
      label: 'data(label)',
      'font-family': 'Pretendard Variable, Pretendard, sans-serif',
      'font-size': 11,
      color: '#4E5968',
      'text-valign': 'bottom',
      'text-margin-y': 4,
      'text-wrap': 'ellipsis',
      'text-max-width': '110px',
      'border-width': 0,
      'transition-property': 'border-width, border-color, background-color',
      'transition-duration': 300,
    },
  },
  { selector: 'node[type = "topic"]', style: { 'font-size': 13, 'font-weight': 700, color: '#191F28', 'text-valign': 'center', 'text-margin-y': 0, 'text-outline-color': '#FFFFFF', 'text-outline-width': 2 } },
  { selector: 'node[type = "person"]', style: { 'font-size': 12, 'font-weight': 600, color: '#191F28' } },
  { selector: 'node[type = "source"]', style: { 'font-size': 11, color: '#191F28' } },
  // 카드·질문 라벨은 기본으로 숨기고, 방금 바뀐 것·선택·마우스를 올린 것만 보여 준다(겹침 방지)
  { selector: 'node[type = "card"], node[type = "question"]', style: { 'text-opacity': 0 } },
  { selector: 'node.fresh, node.hover, node:selected, node.near', style: { 'text-opacity': 1, 'font-size': 12, color: '#191F28', 'z-index': 10 } },
  { selector: 'node[pending = 1]', style: { 'background-opacity': 0.35, 'border-width': 2, 'border-style': 'dashed', 'border-color': '#0891B2' } },
  { selector: 'node.fresh', style: { 'border-width': 5, 'border-color': '#3182F6', 'border-opacity': 0.55 } },
  { selector: 'node:selected', style: { 'border-width': 4, 'border-color': '#191F28' } },
  { selector: 'node.dim', style: { opacity: 0.15 } },
  { selector: 'edge', style: { width: 1.2, 'line-color': 'data(color)', 'curve-style': 'bezier', 'target-arrow-shape': 'none', opacity: 0.85 } },
  { selector: 'edge[dashed = 1]', style: { 'line-style': 'dashed' } },
  { selector: 'edge[type = "cites"], edge[type = "became"]', style: { width: 2, 'target-arrow-shape': 'triangle', 'target-arrow-color': 'data(color)', 'arrow-scale': 0.8 } },
  { selector: 'edge[type = "conflicts"]', style: { width: 2.5 } },
  { selector: 'edge.fresh', style: { width: 3.5, opacity: 1 } },
  { selector: 'edge.dim', style: { opacity: 0.08 } },
];

export function GraphCanvas({ graph, fresh, height = 520, hidden = [], onSelect, focusId, spotlight }: { graph: Graph; fresh: Set<string>; height?: number; hidden?: NodeType[]; onSelect?: (id: string | null) => void; focusId?: string | null; spotlight?: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;

  useEffect(() => {
    const cy = cytoscape({ container: box.current, style: STYLE, minZoom: 0.25, maxZoom: 2.5 });
    cy.on('tap', 'node', (e) => selectRef.current?.(e.target.id()));
    cy.on('tap', (e) => e.target === cy && selectRef.current?.(null));
    cy.on('mouseover', 'node', (e) => e.target.addClass('hover'));
    cy.on('mouseout', 'node', (e) => e.target.removeClass('hover'));
    cyRef.current = cy;
    return () => cy.destroy();
  }, []);

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
        padding: 30,
        nodeRepulsion: () => 9000,
        idealEdgeLength: (edge: cytoscape.EdgeSingular) => (edge.data('type') === 'belongs' ? 70 : edge.data('type') === 'governs' ? 140 : 95),
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
    // 개요 화면: 방금 실행된 경로(질문→카드→사람)만 또렷하게, 나머지는 잠시 흐리게
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
    cy.elements().removeClass('dim');
    if (!focusId) return;
    const n = cy.getElementById(focusId);
    if (n.empty()) return;
    const keep = n.closedNeighborhood();
    cy.elements().not(keep).addClass('dim');
  }, [focusId, graph]);

  return <div ref={box} style={{ height }} className="w-full rounded-xl bg-surface-page" />;
}

export function Legend({ compact }: { compact?: boolean }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] text-ink-body">
      {Object.entries(NODE_STYLE).map(([k, v]) => (
        <span key={k} className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5" style={{ background: v.color, borderRadius: v.shape === 'ellipse' ? 999 : v.shape === 'diamond' ? 1 : 3, transform: v.shape === 'diamond' ? 'rotate(45deg)' : undefined }} />
          {v.label}
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
