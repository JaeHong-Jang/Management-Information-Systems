import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, ExternalLink, Search, X } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import type { Graph, NodeType } from '@shared/contracts';
import { useApp } from '@/app/AppData';
import { api } from '@/shared/api/client';
import { useLive } from '@/shared/api/live';
import { useAsync } from '@/shared/lib/useAsync';
import { AsyncView, Empty, PageHeader } from '@/shared/ui';
import { NetworkCanvas } from './NetworkCanvas';
import { GROUPS, RELATIONS } from './network';
import './graph.css';

export function GraphPage() {
  const [params] = useSearchParams();
  const { targetId } = useApp();
  const storeId = params.get('storeId') ?? targetId ?? undefined;
  return <GraphSource key={storeId ?? 'all'} storeId={storeId} />;
}

function GraphSource({ storeId }: { storeId?: string }) {
  const graph = useAsync(() => api.graph(storeId), [storeId]);
  const { endCount } = useLive();
  const lastCount = useRef(endCount);
  useEffect(() => {
    if (endCount === lastCount.current) return;
    lastCount.current = endCount;
    void graph.reload();
  }, [endCount, graph.reload]);
  return <>
    <PageHeader title="지식 그래프" sub="매장별 불만, 진단 원인, 운영 표준과 사례 카드의 연결 관계" />
    <AsyncView state={graph}>{g => g.nodes.length ? <GraphExplorer graph={g} storeId={storeId} /> : <Empty title="등록된 지식 항목 없음">매장 진단 또는 처방 등록 후 조회 가능</Empty>}</AsyncView>
  </>;
}

const TYPES = Object.keys(GROUPS) as NodeType[];

function GraphExplorer({ graph, storeId }: { graph: Graph; storeId?: string }) {
  const [selectedId, setSelectedId] = useState('');
  const [local, setLocal] = useState(false);
  const [layered, setLayered] = useState(() => window.innerWidth >= 700); // 휴대폰은 관계망이 기본
  const [hidden, setHidden] = useState<Set<NodeType>>(new Set());
  const [query, setQuery] = useState('');
  const [openSearch, setOpenSearch] = useState(false);
  const searchBox = useRef<HTMLDivElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const inspectorTitle = useRef<HTMLHeadingElement>(null);
  const byId = useMemo(() => new Map(graph.nodes.map(n => [n.id, n])), [graph.nodes]);
  const types = TYPES.filter(t => graph.nodes.some(n => n.type === t));
  const visible = useMemo(() => {
    const nodes = graph.nodes.filter(n => !hidden.has(n.type));
    const ids = new Set(nodes.map(n => n.id));
    return { nodes, edges: graph.edges.filter(e => ids.has(e.source) && ids.has(e.target)) };
  }, [graph, hidden]);
  const selected = visible.nodes.find(n => n.id === selectedId) ?? visible.nodes.find(n => n.type === 'store') ?? visible.nodes[0];
  const relations = useMemo(() => {
    if (!selected) return [];
    return graph.edges.flatMap(e => {
      const outgoing = e.source === selected.id;
      if (!outgoing && e.target !== selected.id) return [];
      const node = byId.get(outgoing ? e.target : e.source);
      return node ? [{ id: e.id, label: RELATIONS[e.type][outgoing ? 0 : 1], node }] : [];
    });
  }, [graph.edges, byId, selected]);
  const direct = useMemo(() => new Set([selected?.id ?? '', ...relations.map(r => r.node.id)]), [selected, relations]);
  // 연결 항목을 관계 종류별로 묶는다
  const relationGroups = useMemo(() => {
    const groups = new Map<string, typeof relations>();
    relations.forEach(r => groups.set(r.label, [...(groups.get(r.label) ?? []), r]));
    return [...groups];
  }, [relations]);
  const typeCount = (type: NodeType) => graph.nodes.filter(n => n.type === type).length;
  const display = useMemo(() => local ? {
    nodes: visible.nodes.filter(n => direct.has(n.id)),
    edges: visible.edges.filter(e => direct.has(e.source) && direct.has(e.target)),
  } : visible, [visible, direct, local]);
  const results = useMemo(() => {
    const terms = query.trim().toLocaleLowerCase().split(/\s+/);
    return graph.nodes.filter(n => {
      const field = `${n.label} ${GROUPS[n.type].name} ${n.id}`.toLocaleLowerCase();
      return terms.every(t => field.includes(t));
    });
  }, [graph.nodes, query]);

  function pick(id: string) {
    const node = byId.get(id);
    if (!node) return;
    if (hidden.has(node.type)) setHidden(old => { const next = new Set(old); next.delete(node.type); return next; });
    setSelectedId(id);
    setQuery('');
    setOpenSearch(false);
  }
  function toggle(type: NodeType) {
    setHidden(old => {
      const next = new Set(old);
      if (next.has(type)) next.delete(type);
      else if (types.some(t => t !== type && !next.has(t))) next.add(type);
      return next;
    });
  }
  return <section className="kg-workspace" aria-label="지식 관계 탐색">
    <div className="kg-toolbar">
      <div className="kg-search" ref={searchBox} onBlur={e => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpenSearch(false);
      }} onKeyDown={e => {
        if (e.key === 'Escape') { searchInput.current?.focus(); setOpenSearch(false); }
      }}>
        <Search size={16} aria-hidden="true" />
        <input type="search" placeholder="항목명·번호 검색" ref={searchInput} aria-label="지식 항목 검색" aria-controls="kg-results" aria-expanded={openSearch}
          onFocus={() => setOpenSearch(true)} value={query} onChange={e => { setQuery(e.target.value); setOpenSearch(true); }}
          onKeyDown={e => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setOpenSearch(true); requestAnimationFrame(() => searchBox.current?.querySelector<HTMLButtonElement>('.kg-results button')?.focus()); }
            if (e.key === 'Enter' && results[0]) pick(results[0].id);
          }} />
        {query && <button type="button" aria-label="검색어 삭제" onMouseDown={e => e.preventDefault()} onClick={() => { setQuery(''); searchInput.current?.focus(); }}><X size={14} /></button>}
        {openSearch && <div id="kg-results" className="kg-results">
          {results.length ? <ul aria-label="검색 결과">{results.map(n => <li key={n.id}><button type="button" onClick={() => pick(n.id)}>
            <span>{GROUPS[n.type].name}</span>{n.label}
          </button></li>)}</ul> : <p>일치하는 항목 없음</p>}
        </div>}
      </div>
      <div className="kg-switches">
        <div className="kg-modes" role="group" aria-label="배치 방식">
          <button type="button" aria-pressed={layered} disabled={local} onClick={() => setLayered(true)}>구조 보기</button>
          <button type="button" aria-pressed={!layered} disabled={local} onClick={() => setLayered(false)}>관계망</button>
        </div>
        <div className="kg-modes" role="group" aria-label="관계 표시 범위">
          <button type="button" aria-pressed={!local} onClick={() => setLocal(false)}>전체 관계</button>
          <button type="button" aria-pressed={local} onClick={() => setLocal(true)}>직접 연결</button>
        </div>
      </div>
    </div>
    <div className="kg-grid">
      <section className="kg-map" aria-label="관계 지도">
        <header className="kg-map-title"><h2>연결 지도</h2><p className="kg-hint">항목 선택 시 직접 연결 강조 · 끌어서 이동 · Ctrl+휠 확대</p>
          <span aria-live="polite">항목 <b>{display.nodes.length}</b> · 연결 <b>{display.edges.length}</b></span>
          <button type="button" className="kg-mobile-inspect" onClick={() => {
            inspectorTitle.current?.focus({ preventScroll: true });
            inspectorTitle.current?.scrollIntoView({ block: 'start' });
          }}>상세 보기 <ChevronDown size={13} /></button>
        </header>
        {selected && <NetworkCanvas key={(local ? selected.id : layered ? 'layers' : 'all') + ':' + [...hidden].sort().join(',')} layered={layered} graph={display} selected={selected} direct={direct} local={local} onPick={pick} />}
        <div className="kg-legend" role="group" aria-label="표시할 항목 유형">
          <span>표시 유형</span>{types.map(type => <button key={type} type="button" aria-pressed={!hidden.has(type)} onClick={() => toggle(type)} disabled={!hidden.has(type) && types.filter(t => !hidden.has(t)).length === 1}>
            <i style={{ backgroundColor: GROUPS[type].color }} />{GROUPS[type].name}<b>{typeCount(type)}</b>
          </button>)}
        </div>
      </section>
      {selected && <aside className="kg-inspector" aria-label="선택 항목 상세">
        <h2 ref={inspectorTitle} tabIndex={-1}>항목 상세</h2>
        <div className="kg-item" aria-live="polite">
          <div className="kg-tag"><i style={{ backgroundColor: GROUPS[selected.type].color }} />{GROUPS[selected.type].name}</div>
          <h3>{selected.label}</h3>
          <p>{selected.id}{selected.sub ? ` · ${selected.sub}` : ''}</p>
          {selected.type === 'card' && storeId && <Link to={`/store/${storeId}/wiki#${selected.id}`}>위키 카드 열기 <ExternalLink size={13} /></Link>}
        </div>
        <div className="kg-rel-title"><h3>직접 연결 항목</h3><span>{new Set(relations.map(r => r.node.id)).size}개</span></div>
        {relations.length ? <div className="kg-relations">{relationGroups.map(([label, items]) => <section key={label}>
          <h4>{label}<span>{items.length}</span></h4>
          <ul>{items.map(r => <li key={r.id}><button type="button" onClick={() => pick(r.node.id)}>
            <i style={{ backgroundColor: GROUPS[r.node.type].color }} aria-hidden="true" /><strong>{r.node.label}</strong><ChevronRight size={15} aria-hidden="true" />
          </button></li>)}</ul>
        </section>)}</div> : <p className="kg-empty">등록된 연결 없음</p>}
      </aside>}
    </div>
  </section>;
}
