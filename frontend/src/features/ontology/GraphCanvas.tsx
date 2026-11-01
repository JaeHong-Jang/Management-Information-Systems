// 온톨로지 그래프를 별자리처럼 그린다. 보름달 밤하늘 위에 노드는 은은하게 빛나는 작은 별, 관계는 가는 별자리 선이다.
// 토픽은 가장 밝은 달빛 별이고 이름을 별자리 이름처럼 단다. 모양은 작게 유지한다: 카드 둥근 사각형(많이 쓰일수록 조금 큼), 질문 마름모, 사람 원, 출처 육각형, 재고 품목 통.
// 새 노드는 이웃 옆에서 나타나 자리를 잡고, 방금 바뀐 것은 달빛 둘레로 한 번 숨 쉬듯 강조한다.
import cytoscape, { type Core, type ElementDefinition } from 'cytoscape';
import fcose from 'cytoscape-fcose';
import { useEffect, useRef } from 'react';
import { Maximize2, Minus, Plus } from 'lucide-react';
import type { Graph, GraphNode, NodeType } from '@shared/contracts';
import { EDGE_STYLE, NIGHT, NIGHT_EDGE, NIGHT_NODE, NODE_STYLE } from '@/shared/theme/tokens';

cytoscape.use(fcose);

const FONT = 'Pretendard Variable, Pretendard, sans-serif';
const PAD = 24;

// 노드 크기는 화면 px 기준. 확대율이 바뀌어도 화면에서 같은 크기로 보이게 rescale에서 모델 크기로 바꾼다
function box(n: GraphNode) {
  switch (n.type) {
    case 'topic':
      return { w: 13, h: 13 };
    case 'person':
      return { w: 11, h: 11 };
    case 'source':
      return { w: 12, h: 12 };
    case 'question':
      return { w: 10, h: 10 };
    case 'item':
      return { w: 8, h: 8 };
    default: {
      const s = 8 + Math.min(n.weight ?? 0, 22) * 0.25;
      return { w: s, h: s };
    }
  }
}

const toEl = (n: GraphNode, heavyMin: number): ElementDefinition => {
  const b = box(n);
  const st = NIGHT_NODE[n.type];
  return { group: 'nodes', data: { id: n.id, label: n.label, type: n.type, sub: n.sub ?? '', w: b.w, h: b.h, fill: st.fill, rim: st.border, shape: NODE_STYLE[n.type].shape, vw: b.w, vh: b.h, pending: n.sub === '승인 대기' ? 1 : 0, heavy: n.type === 'card' && (n.weight ?? 0) >= heavyMin ? 1 : 0 } };
};

// 많이 쓰인 카드: 카드 중 근거로 쓰인 횟수 상위 20%(최소 10회)
const heavyMinOf = (g: Graph) => {
  const w = g.nodes.filter((n) => n.type === 'card').map((n) => n.weight ?? 0).sort((a, b) => b - a);
  return Math.max(10, w[Math.ceil(w.length / 5) - 1] ?? Infinity);
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// cytoscape의 크기·글자는 모델 단위라 전체 보기로 줄이면 실제 글자가 5~9px까지 작아진다.
// 별자리 그래프는 확대율 z와 관계없이 별·글자·선이 화면에서 같은 크기로 보이게 모든 px 값을 1/z 배로 다시 계산한다.
// 카드·질문·재고 품목은 평소 이름을 비워 두고(배치 계산에도 안 들어감) 마우스·이웃·선택·방금 바뀜일 때만 단다.
function sheet(z: number, narrow = false): cytoscape.Stylesheet[] {
  const k = 1 / z;
  const px = (v: number) => v * k;
  const fsTopic = narrow ? 13 : 15;
  const fsName = narrow ? 12 : 13.5;
  return [
    {
      selector: 'node',
      style: {
        width: 'data(vw)',
        height: 'data(vh)',
        shape: 'data(shape)' as never,
        'background-color': 'data(fill)',
        'border-width': 0,
        label: '',
        'font-family': FONT,
        'font-size': px(fsName),
        'font-weight': 600,
        color: NIGHT.ink,
        'text-valign': 'bottom',
        'text-margin-y': px(5),
        'text-wrap': 'ellipsis',
        'text-max-width': `${px(150)}px`,
        // 프로젝터에서도 읽히게 라벨 뒤에 옅은 밤색 받침
        'text-background-color': NIGHT.base,
        'text-background-opacity': 0.6,
        'text-background-padding': `${px(2.5)}px`,
        'text-background-shape': 'roundrectangle',
        // 별: 늘 켜져 있는 두 겹 둘레빛(안쪽 outline은 진하게, 바깥 underlay는 옅고 넓게)
        'outline-color': 'data(fill)',
        'outline-opacity': 0.3,
        'outline-width': px(2),
        'underlay-color': 'data(fill)',
        'underlay-opacity': 0.12,
        'underlay-padding': px(6),
        'underlay-shape': 'ellipse',
        'transition-property': 'underlay-opacity, opacity',
        'transition-duration': 300,
      } as cytoscape.Css.Node,
    },
    // 늘 이름을 다는 별: 토픽(별자리 이름), 사람, 출처
    { selector: 'node[type = "topic"], node[type = "person"], node[type = "source"]', style: { label: 'data(label)' } },
    // 토픽: 가장 밝은 달빛 별, 넓은 달무리, 굵은 달빛 글자
    { selector: 'node[type = "topic"]', style: { shape: 'ellipse', 'font-size': px(fsTopic), 'font-weight': 700, color: NIGHT_NODE.topic.fill, 'text-margin-y': px(9), 'text-background-opacity': 0.5, 'outline-width': px(3.5), 'outline-opacity': 0.3, 'underlay-opacity': 0.1, 'underlay-padding': px(13) } as cytoscape.Css.Node },
    { selector: 'node[type = "source"]', style: { 'border-width': px(1.2), 'border-color': 'data(rim)', color: NIGHT.moon, 'outline-width': 0, 'underlay-opacity': 0 } as cytoscape.Css.Node },
    { selector: 'node[type = "item"]', style: { 'border-width': px(1), 'border-color': 'data(rim)', 'outline-width': 0, 'underlay-opacity': 0 } as cytoscape.Css.Node },
    // 많이 쓰인 카드는 더 밝게 빛난다
    { selector: 'node[heavy = 1]', style: { 'outline-opacity': 0.4, 'outline-width': px(2.5), 'underlay-opacity': 0.16, 'underlay-padding': px(10) } as cytoscape.Css.Node },
    { selector: 'node[pending = 1]', style: { 'background-opacity': 0.25, 'border-width': px(1.2), 'border-style': 'dashed', 'border-color': NIGHT_NODE.card.fill } },
    // 마우스·이웃·선택·방금 바뀜: 이름을 단다
    { selector: 'node.fresh, node.hover, node:selected, node.near', style: { label: 'data(label)', 'text-background-opacity': 0.9, 'z-index': 10 } },
    { selector: 'node[type = "topic"].near, node[type = "topic"].hover, node[type = "topic"]:selected', style: { 'text-background-opacity': 0.7 } },
    // 방금 생긴 것: 달빛 둘레(움직임은 아래 effect에서 한 번만)
    { selector: 'node.fresh', style: { 'underlay-color': NIGHT.glow, 'underlay-opacity': 0.3, 'underlay-padding': px(9) } as cytoscape.Css.Node },
    { selector: 'node:selected', style: { 'border-width': px(2), 'border-style': 'solid', 'border-color': NIGHT.ink, 'underlay-color': NIGHT.glow, 'underlay-opacity': 0.35, 'underlay-padding': px(8) } as cytoscape.Css.Node },
    // 이웃이 아닌 것은 흐리게. 토픽은 위치를 잡을 수 있게 덜 흐리고 이름도 남긴다
    { selector: 'node.dim', style: { opacity: 0.3, label: '' } },
    { selector: 'node[type = "topic"].dim', style: { opacity: 0.6, label: 'data(label)' } },
    { selector: 'edge', style: { width: 'data(vw)', 'line-color': 'data(color)', 'curve-style': 'straight', 'target-arrow-shape': 'none', opacity: 'data(opacity)' as never, 'transition-property': 'opacity, width', 'transition-duration': 300 } },
    { selector: 'edge[dashed = 1]', style: { 'line-style': 'dashed', 'line-dash-pattern': [px(5), px(4)] } },
    { selector: 'edge[arrow = 1]', style: { 'target-arrow-shape': 'triangle', 'target-arrow-color': 'data(color)', 'arrow-scale': 1 } },
    { selector: 'edge.fresh, edge.near', style: { width: px(1.8), opacity: 0.95 } },
    { selector: 'edge.dim', style: { opacity: 0.1 } },
  ];
}

/** 확대율에 맞춰 별·선 크기를 다시 정하고 스타일을 갈아 끼운다 */
function rescale(cy: Core) {
  const k = 1 / cy.zoom();
  cy.batch(() => {
    cy.nodes().forEach((n) => void n.data({ vw: n.data('w') * k, vh: n.data('h') * k }));
    cy.edges().forEach((e) => void e.data('vw', e.data('width') * k));
  });
  cy.style(sheet(cy.zoom(), !!cy.scratch('narrow')));
}

/**
 * 배치가 끝난 뒤 이름표 겹침을 직접 푼다. fcose는 겹침을 줄이기만 하고 없애 주지는 않는다.
 * 이름을 단 별(토픽·사람·출처)의 '별+이름표' 상자가 다른 별이나 이름표와 겹치면, 작은 쪽(토픽이 아닌 쪽)을 겹친 만큼 밀어낸다.
 */
function untangle(cy: Core, nodes: cytoscape.NodeCollection): boolean {
  const gap = 6 / cy.zoom();
  const opt = { includeOverlays: false, includeUnderlays: false, includeEdges: false };
  const named = nodes.filter((n) => !!n.style('label'));
  for (let round = 0; round < 300; round++) {
    let moved = false;
    named.forEach((a) => {
      let ab = a.boundingBox({ ...opt, includeLabels: true });
      nodes.forEach((b) => {
        if (a === b) return;
        const bb = b.boundingBox({ ...opt, includeLabels: !!b.style('label') });
        const ox = Math.min(ab.x2, bb.x2) - Math.max(ab.x1, bb.x1);
        const oy = Math.min(ab.y2, bb.y2) - Math.max(ab.y1, bb.y1);
        // gap/2보다 더 떨어져 있으면 통과, 아니면 gap만큼 떨어지게 민다(소수점 오차로 끝없이 미는 것을 막는다)
        if (ox <= -gap / 2 || oy <= -gap / 2) return;
        // 덜 겹친 축으로 서로 반씩 민다. 토픽은 별자리의 기준이라 상대가 토픽이 아니면 상대만 민다
        const ta = a.data('type') === 'topic';
        const tb = b.data('type') === 'topic';
        const share = ta === tb ? 0.5 : 1;
        const byX = ox < oy;
        const d = (byX ? ox : oy) + gap;
        const sign = byX ? ((bb.x1 + bb.x2) / 2 >= (ab.x1 + ab.x2) / 2 ? 1 : -1) : (bb.y1 + bb.y2) / 2 >= (ab.y1 + ab.y2) / 2 ? 1 : -1;
        // 오래 안 풀리면(좁은 화면에서 축 방향으로 서로 맞밀 때) 두 중심을 잇는 방향으로 민다
        const vx = (bb.x1 + bb.x2 - ab.x1 - ab.x2) / 2;
        const vy = (bb.y1 + bb.y2 - ab.y1 - ab.y2) / 2;
        const len = Math.hypot(vx, vy) || 1;
        const push = (n: cytoscape.NodeSingular, dir: number) => {
          const p = n.position();
          if (round > 60) n.position({ x: p.x + (dir * sign * d * share * (vx || 1)) / len, y: p.y + (dir * sign * d * share * vy) / len });
          else n.position(byX ? { x: p.x + dir * d * share, y: p.y } : { x: p.x, y: p.y + dir * d * share });
        };
        if (!tb || ta) push(b, sign);
        if (tb || ta === tb) {
          push(a, -sign);
          ab = a.boundingBox({ ...opt, includeLabels: true });
        }
        moved = true;
      });
    });
    if (!moved) return round > 0;
  }
  return true;
}

const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function GraphCanvas({ graph, fresh, height = 520, hidden = [], onSelect, focusId, spotlight }: { graph: Graph; fresh: Set<string>; height?: number; hidden?: NodeType[]; onSelect?: (id: string | null) => void; focusId?: string | null; spotlight?: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;
  const focusRef = useRef(focusId);
  focusRef.current = focusId;
  // 숨길 노드: 필터로 끈 종류 + 대시보드 미리보기에서는 재고 품목(지식 흐름에 집중)
  const hideRef = useRef<(t: NodeType) => boolean>(() => false);
  hideRef.current = (t) => hidden.includes(t) || (!!spotlight && t === 'item');
  // 좁은 화면에서는 칸을 낮춰 그래프가 작아지지 않게 한다
  const narrow = typeof window !== 'undefined' && window.innerWidth < 640;
  const pad = spotlight || narrow ? 16 : PAD;

  useEffect(() => {
    // 대시보드(spotlight)에서는 휠로 확대하지 않는다(페이지 스크롤을 뺏지 않게)
    const cy = cytoscape({ container: host.current, style: sheet(1), minZoom: 0.12, maxZoom: 2.5, userZoomingEnabled: !spotlight, wheelSensitivity: 0.25 });
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
    // 확대·축소·크기 변경·배치가 끝날 때 글자 크기를 다시 맞춘다(한 프레임에 한 번만)
    cy.scratch('narrow', narrow);
    let raf = 0;
    cy.on('zoom resize layoutstop', () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => rescale(cy));
    });
    cyRef.current = cy;
    return () => {
      cancelAnimationFrame(raf);
      cy.destroy();
    };
  }, [spotlight]);

  // 그래프 반영: 없던 노드는 이웃 근처에 추가, 있던 노드는 데이터만 갱신, 사라진 것은 제거(초기화 때)
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    const want = new Set([...graph.nodes.map((n) => n.id), ...graph.edges.map((e) => e.id)]);
    const removed = cy.elements().filter((el) => !want.has(el.id()));
    const first = cy.nodes().length === 0;
    let added = 0;
    let addedNodes = 0;
    const before = cy.nodes();
    const heavyMin = heavyMinOf(graph);
    cy.batch(() => {
      removed.remove();
      for (const n of graph.nodes) {
        const el = cy.getElementById(n.id);
        if (el.nonempty()) {
          el.data(toEl(n, heavyMin).data);
          continue;
        }
        const nb = graph.edges.find((e) => e.source === n.id || e.target === n.id);
        const anchor = nb ? cy.getElementById(nb.source === n.id ? nb.target : nb.source) : null;
        const p = anchor?.nonempty() ? anchor.position() : { x: cy.width() / 2, y: cy.height() / 2 };
        cy.add({ ...toEl(n, heavyMin), position: { x: p.x + (Math.random() - 0.5) * 80, y: p.y + (Math.random() - 0.5) * 80 } });
        added++;
        addedNodes++;
      }
      for (const e of graph.edges) {
        if (cy.getElementById(e.id).nonempty()) continue;
        const st = NIGHT_EDGE[e.type];
        cy.add({ group: 'edges', data: { id: e.id, source: e.source, target: e.target, type: e.type, color: st.color, opacity: st.opacity, width: st.width, vw: st.width, dashed: st.dashed ? 1 : 0, arrow: st.arrow ? 1 : 0 } });
        added++;
      }
    });
    // 숨길 노드는 배치 전에 숨겨 보이는 것만 자리를 잡고 화면을 채우게 한다
    cy.nodes().forEach((n) => void n.style('display', hideRef.current(n.data('type')) ? 'none' : 'element'));
    rescale(cy);
    if (added || removed.nonempty()) {
      // 처음 불러올 때 일부만 먼저 오고 나머지가 한꺼번에 붙으면(있던 것보다 많이) 처음처럼 전체를 다시 배치한다
      const full = first || addedNodes > before.length;
      // 이미 있던 노드는 제자리에 두고 새 노드만 자리를 잡게 한다(새 지식이 어디 붙었는지 눈으로 따라갈 수 있게)
      const keep = full ? cy.collection() : before.filter((n) => n.inside());
      keep.lock();
      const shown = (n: cytoscape.NodeSingular) => !hideRef.current(n.data('type'));
      const vis = cy.elements().filter((el) => (el.isNode() ? shown(el) : shown(el.source()) && shown(el.target())));
      const opts = (o: { animate: boolean; randomize: boolean; quality: string }) =>
        ({
          name: 'fcose',
          ...o,
          animationDuration: 700,
          fit: true,
          padding: pad,
          // 이름표 크기까지 넣어 배치해 별 이름끼리, 이름과 별이 겹치지 않게 한다
          nodeDimensionsIncludeLabels: true,
          nodeRepulsion: (node: cytoscape.NodeSingular) => (node.data('type') === 'topic' ? 13500 : 5800),
          nodeSeparation: 54,
          idealEdgeLength: (edge: cytoscape.EdgeSingular) => (edge.data('type') === 'belongs' ? 52 : 80),
        }) as cytoscape.LayoutOptions;
      // 갱신 때는 randomize 없이 이어서 배치하므로 느리게 식혀(proof) 겹침을 줄인다
      const layout = vis.layout(opts({ animate: !full, randomize: full, quality: full ? 'default' : 'proof' }));
      // 이름표는 화면 크기로 고정이라 확대율이 정해져야 모델 크기가 정해진다. 전체 배치 뒤에는 확대율이 거의 안 바뀔 때까지 두세 번 다듬는다
      let pass = 0;
      // 마지막에 겹침을 풀고 다시 맞춘다. 확대율이 바뀌면 이름표 크기도 바뀌므로 한 번 더 확인한다
      const settle = () => {
        const vn = vis.nodes();
        for (let i = 0; i < 6; i++) {
          rescale(cy);
          const moved = untangle(cy, vn);
          const z = cy.zoom();
          cy.fit(vis, pad);
          if (!moved && Math.abs(cy.zoom() - z) / z < 0.02) break;
        }
        rescale(cy);
      };
      const refine = () => {
        const z = cy.zoom();
        rescale(cy);
        const next = vis.layout(opts({ animate: false, randomize: false, quality: 'proof' }));
        next.one('layoutstop', () => {
          if (++pass < 3 && Math.abs(cy.zoom() - z) / z > 0.06) refine();
          else settle();
        });
        next.run();
      };
      layout.one('layoutstop', () => {
        keep.unlock();
        if (full) refine();
        else settle();
      });
      layout.run();
    }
  }, [graph]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    const was = new Set(cy.nodes('.fresh').map((n) => n.id()));
    cy.elements().removeClass('fresh');
    fresh.forEach((id) => cy.getElementById(id).addClass('fresh'));
    // 새로 강조된 노드만 둘레빛이 한 번 숨 쉬듯 퍼졌다 가라앉는다(움직임 줄이기 설정이면 정지된 둘레빛만)
    if (!reduceMotion())
      cy.nodes('.fresh').forEach((n) => {
        if (was.has(n.id())) return;
        const u = 1 / cy.zoom();
        n.style({ 'underlay-padding': 14 * u, 'underlay-opacity': 0.45 } as never);
        // queue: false — 자리 잡는 배치 애니메이션과 동시에 돈다
        n.animate({ style: { 'underlay-padding': 9 * u, 'underlay-opacity': 0.3 } as never }, { duration: 1400, easing: 'ease-out-sine', queue: false, complete: () => n.removeStyle('underlay-padding underlay-opacity') });
      });
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
    cy.nodes().forEach((n) => void n.style('display', hideRef.current(n.data('type')) ? 'none' : 'element'));
  }, [hidden, graph, spotlight]);

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
  const fit = () => cyRef.current?.animate({ fit: { eles: cyRef.current.elements(':visible'), padding: pad } }, { duration: 300 });

  return (
    <div className="relative">
      <div ref={host} style={{ height: narrow ? Math.min(height, 380) : height }} className="graph-night w-full rounded-2xl" />
      <div className="absolute bottom-3 right-3 flex flex-col divide-y divide-night-line overflow-hidden rounded-xl border border-night-line bg-night-raised/85 backdrop-blur">
        {[
          { icon: Plus, label: '확대', on: () => zoom(1.25) },
          { icon: Minus, label: '축소', on: () => zoom(0.8) },
          { icon: Maximize2, label: '전체 보기', on: fit },
        ].map((b) => (
          <button key={b.label} onClick={b.on} aria-label={b.label} title={b.label} className="flex h-10 w-10 items-center justify-center text-night-ink hover:bg-night-active">
            <b.icon size={16} />
          </button>
        ))}
      </div>
    </div>
  );
}

export function Legend({ compact }: { compact?: boolean }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] text-ink-body">
      {/* 대시보드(compact)는 재고 품목을 숨기므로 범례에서도 뺀다 */}
      {(Object.keys(NODE_STYLE) as NodeType[]).filter((k) => !(compact && k === 'item')).map((k) => (
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
  // 토픽은 그래프 안과 같은 달빛 별: 흰 면에서도 보이게 남보라 테두리와 옅은 둘레빛
  if (type === 'topic') return <span className="inline-block h-2.5 w-2.5 rounded-full border-[1.5px] border-brand-strong shadow-[0_0_0_3px_rgba(79,91,213,0.18)]" style={{ background: NIGHT_NODE.topic.fill, opacity: base.opacity }} />;
  if (type === 'question') return <span className="inline-block h-2 w-2 rotate-45 rounded-[1px]" style={base} />;
  if (type === 'source') return <span className="inline-block h-2.5 w-2.5" style={{ ...base, clipPath: 'polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%)' }} />;
  return <span className={type === 'person' ? 'inline-block h-2.5 w-2.5 rounded-full' : 'inline-block h-2.5 w-2.5 rounded-[3px]'} style={base} />;
}
