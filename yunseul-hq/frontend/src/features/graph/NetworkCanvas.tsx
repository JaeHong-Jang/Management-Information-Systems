import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Maximize, Minus, Plus } from 'lucide-react';
import type { Graph, GraphNode } from '@shared/contracts';
import { fitNetwork, GROUPS, layoutNeighbors, layoutNetwork, type Point } from './network';

const HOME_VIEW = { x: 0, y: 0, scale: 1 };
const MIN_SCALE = .6, MAX_SCALE = 3;
type View = typeof HOME_VIEW;

function boundZoom(scale: number) { return Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale)); }
function zoomAround(view: View, scale: number, origin: Point): View {
  const ratio = scale / view.scale;
  return { x: origin.x - (origin.x - view.x) * ratio, y: origin.y - (origin.y - view.y) * ratio, scale };
}

export function NetworkCanvas({ graph, selected, direct, local, onPick }: {
  graph: Graph; selected: GraphNode; direct: Set<string>; local: boolean; onPick: (id: string) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<SVGSVGElement>(null);
  const drag = useRef<{ id: number; x: number; y: number; start: View; moved: boolean } | null>(null);
  const skipClick = useRef(false);
  const [size, setSize] = useState({ width: 640, height: 480 });
  const [view, setView] = useState(HOME_VIEW);
  const [hover, setHover] = useState<string | null>(null);
  useEffect(() => {
    if (!host.current) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width && height) setSize({ width, height });
    });
    observer.observe(host.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const wheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const rect = el.getBoundingClientRect();
      const origin = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      setView(old => zoomAround(old, boundZoom(old.scale * Math.exp(-event.deltaY * .01)), origin));
    };
    el.addEventListener('wheel', wheel, { passive: false });
    return () => el.removeEventListener('wheel', wheel);
  }, []);

  const { width, height } = size;
  const network = useMemo(() => local ? new Map() : layoutNetwork(graph), [local, graph]);
  const positions = useMemo(() => local ? layoutNeighbors(selected, graph.nodes, width, height)
    : fitNetwork(network, width, height), [local, selected, graph.nodes, network, width, height]);
  const previousSelection = useRef(selected.id);
  useEffect(() => {
    if (previousSelection.current === selected.id) return;
    previousSelection.current = selected.id;
    const point = positions.get(selected.id);
    if (!point) return;
    setView(old => {
      const x = point.x * old.scale + old.x, y = point.y * old.scale + old.y;
      if (x >= 18 && x <= width - 18 && y >= 18 && y <= height - 18) return old;
      return { ...old, x: width / 2 - point.x * old.scale, y: height / 2 - point.y * old.scale };
    });
  }, [selected.id, positions, width, height]);
  const degree = useMemo(() => {
    const counts = new Map<string, number>();
    graph.edges.forEach(e => {
      counts.set(e.source, (counts.get(e.source) ?? 0) + 1);
      counts.set(e.target, (counts.get(e.target) ?? 0) + 1);
    });
    return counts;
  }, [graph.edges]);
  const dots = graph.nodes.map(node => {
    const p = positions.get(node.id)!;
    const radius = Math.min(11, 4 + Math.sqrt(degree.get(node.id) ?? 0) * 1.7) + (node.id === selected.id ? 2 : 0);
    return { node, x: p.x * view.scale + view.x, y: p.y * view.scale + view.y, radius };
  });
  const byId = new Map(dots.map(dot => [dot.node.id, dot]));
  const active = hover ?? selected.id;
  const lit = hover ? new Set([hover]) : direct;
  if (hover) graph.edges.forEach(e => {
    if (e.source === hover) lit.add(e.target);
    if (e.target === hover) lit.add(e.source);
  });

  // Keep the focused label first; omit crowded overview labels until zoom or hover.
  const priority = (id: string) => (id === active ? 3000 : id === selected.id ? 2000 : lit.has(id) ? 1000 : 0) + (degree.get(id) ?? 0);
  const blocks = dots.map(d => ({ l: d.x - d.radius, r: d.x + d.radius, t: d.y - d.radius, b: d.y + d.radius }));
  const labels = [...dots].sort((a, b) => priority(b.node.id) - priority(a.node.id)).flatMap(d => {
    const focused = d.node.id === active || d.node.id === selected.id;
    if (d.x < 0 || d.x > width || d.y < 0 || d.y > height) return [];
    const limit = focused ? 22 : local || view.scale > 1.45 ? 15 : 10;
    const text = d.node.label.length > limit ? d.node.label.slice(0, limit) + '…' : d.node.label;
    const textWidth = [...text].reduce((sum, char) => sum + (char.charCodeAt(0) > 255 ? 12 : 7), 6);
    const candidates = [
      { x: d.x + d.radius + 5, y: d.y + 4 }, { x: d.x - d.radius - textWidth - 5, y: d.y + 4 },
      { x: d.x - textWidth / 2, y: d.y + d.radius + 17 }, { x: d.x - textWidth / 2, y: d.y - d.radius - 6 },
    ];
    const at = candidates.find(({ x, y }) => x > 3 && x + textWidth < width - 3 && y > 13 && y < height - 4 &&
      blocks.every(b => x + textWidth < b.l || x > b.r || y + 4 < b.t || y - 13 > b.b));
    if (!at && !focused) return [];
    const pos = at ?? { x: Math.max(4, Math.min(width - textWidth - 4, d.x - textWidth / 2)), y: Math.max(16, d.y - d.radius - 8) };
    blocks.push({ l: pos.x - 2, r: pos.x + textWidth + 2, t: pos.y - 14, b: pos.y + 5 });
    return [{ id: d.node.id, text, ...pos }];
  });

  function zoom(factor: number) {
    setView(old => zoomAround(old, boundZoom(old.scale * factor), { x: width / 2, y: height / 2 }));
  }
  function keyDown(event: KeyboardEvent<SVGSVGElement>) {
    const steps: Record<string, Point> = { ArrowRight: { x: -40, y: 0 }, ArrowLeft: { x: 40, y: 0 }, ArrowUp: { x: 0, y: 40 }, ArrowDown: { x: 0, y: -40 } };
    if (steps[event.key]) {
      const step = steps[event.key]; event.preventDefault();
      setView(old => ({ ...old, x: old.x + step.x, y: old.y + step.y }));
    } else if (['+', '=', '-', 'Home'].includes(event.key)) {
      event.preventDefault();
      if (event.key === 'Home') setView(HOME_VIEW);
      else zoom(event.key === '-' ? .8 : 1.25);
    }
  }

  return <div className="kg-canvas" ref={host}>
    <svg ref={canvas} width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} role="group" tabIndex={0} aria-label="지식 관계도. 방향키로 이동, 더하기와 빼기로 확대 또는 축소, Home 키로 초기화" onKeyDown={keyDown}
      onPointerDown={e => {
        if (e.button !== 0) return;
        skipClick.current = false;
        drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, start: view, moved: false };
      }}
      onPointerMove={e => {
        const d = drag.current;
        if (!d || d.id !== e.pointerId) return;
        const dx = e.clientX - d.x, dy = e.clientY - d.y;
        if (!d.moved && Math.hypot(dx, dy) < 4) return;
        if (!d.moved) { e.currentTarget.setPointerCapture(e.pointerId); setHover(null); }
        d.moved = true;
        setView({ ...d.start, x: d.start.x + dx, y: d.start.y + dy });
      }}
      onPointerLeave={() => { setHover(null); if (!drag.current?.moved) drag.current = null; }}
      onPointerCancel={() => { drag.current = null; }}
      onPointerUp={() => { skipClick.current = !!drag.current?.moved; drag.current = null; }}>
      {graph.edges.map(edge => {
        const a = byId.get(edge.source)!, b = byId.get(edge.target)!;
        const highlighted = edge.source === active || edge.target === active;
        return <line key={edge.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={highlighted ? 'kg-line is-active' : 'kg-line'} />;
      })}
      {dots.map(({ node, x, y, radius }) => <g key={node.id} transform={`translate(${x},${y})`} className="kg-dot"
        role="button" tabIndex={0} aria-label={`${GROUPS[node.type].name} · ${node.label}`} aria-pressed={node.id === selected.id}
        onMouseEnter={() => { if (!drag.current) setHover(node.id); }} onMouseLeave={() => setHover(null)}
        onFocus={() => setHover(node.id)} onBlur={() => setHover(null)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(node.id); }}}
        onClick={() => { if (!skipClick.current) onPick(node.id); }}>
        <title>{node.label}</title>
        <circle r={Math.max(12, radius + 3)} fill="transparent" />
        {node.id === selected.id && <circle r={radius + 4} fill="none" stroke="#fff" strokeWidth="1.8" />}
        <circle r={radius} fill={GROUPS[node.type].color} />
      </g>)}
      {labels.map(l => <text key={l.id} x={l.x} y={l.y} pointerEvents="none" aria-hidden="true" className={`kg-node-label ${l.id === active || l.id === selected.id ? 'is-focus' : lit.has(l.id) ? 'is-neighbor' : ''}`}>{l.text}</text>)}
    </svg>
    <div className="kg-zoom" aria-label="그래프 배율">
      <button type="button" title="축소" aria-label="축소" disabled={view.scale <= MIN_SCALE} onClick={() => zoom(.8)}><Minus size={15} /></button>
      <output>{Math.round(view.scale * 100)}%</output>
      <button type="button" title="확대" aria-label="확대" disabled={view.scale >= MAX_SCALE} onClick={() => zoom(1.25)}><Plus size={15} /></button>
      <button type="button" title="화면 맞춤" aria-label="화면 맞춤" onClick={() => setView(HOME_VIEW)}><Maximize size={14} /></button>
    </div>
  </div>;
}
