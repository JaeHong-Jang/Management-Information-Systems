import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Archive, ArrowLeft, ChevronRight, Network, Search } from 'lucide-react';
import type { Card, CardScope } from '@shared/contracts';
import { useApp } from '@/app/AppData';
import { useStoreData } from '@/app/StoreData';
import { api } from '@/shared/api/client';
import { useAction } from '@/shared/lib/useAsync';
import { AsyncView, Button, Empty, InlineError, KnowledgeCard, PageHeader } from '@/shared/ui';
import { CARD_STATUS } from '@/shared/theme/semantics';
import './wiki.css';

export function WikiPage() {
  const { id = '' } = useParams();
  const { hash } = useLocation();
  const { role } = useApp();
  const { state } = useStoreData();
  const [scope, setScope] = useState<CardScope | ''>('');
  const [showAll, setShowAll] = useState(false);
  const [q, setQ] = useState('');
  const [topic, setTopic] = useState('');
  const [picked, setPicked] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);
  const detail = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLElement>(null);
  const incoming = state.data?.cards.find((c) => c.id === hash.slice(1));
  useEffect(() => {
    if (!incoming) return;
    setQ('');
    setTopic('');
    setScope('');
    setShowAll(incoming.status !== 'approved');
    setPicked(incoming.id);
    setDetailOpen(true);
  }, [id, hash, incoming?.id, incoming?.status]);
  useEffect(() => {
    if (detailOpen && window.matchMedia('(max-width: 1023px)').matches) {
      detail.current?.focus({ preventScroll: true });
      detail.current?.scrollIntoView({ block: 'start' });
    }
  }, [detailOpen, picked]);

  const query = q.trim().toLocaleLowerCase();
  const grouped = new Map<string, Card[]>();
  for (const c of state.data?.cards ?? []) {
    if ((!showAll && c.status !== 'approved') || (scope && c.scope !== scope) || (topic && c.topic !== topic)) continue;
    if (query && ![c.id, c.title, c.topic, c.situation, c.reason, ...c.tags].some((v) => v.toLocaleLowerCase().includes(query))) continue;
    const group = grouped.get(c.topic);
    if (group) group.push(c);
    else grouped.set(c.topic, [c]);
  }
  const cards = Array.from(grouped.values()).flat();
  const current = cards.find((c) => c.id === picked) ?? cards[0];
  const filtered = Boolean(query || scope || topic || showAll);
  useEffect(() => {
    if (!window.matchMedia('(min-width: 1024px)').matches) return;
    const scrollArea = list.current?.querySelector<HTMLElement>('.wiki-register-body');
    const row = scrollArea?.querySelector<HTMLElement>('[aria-current="true"]');
    if (!row || !scrollArea) return;
    const area = scrollArea.getBoundingClientRect();
    const bounds = row.getBoundingClientRect();
    if (bounds.top < area.top) scrollArea.scrollTop += bounds.top - area.top;
    else if (bounds.bottom > area.bottom) scrollArea.scrollTop += bounds.bottom - area.bottom;
  }, [current?.id]);

  function selectCard(card: Card) {
    setPicked(card.id);
    setDetailOpen(true);
    if (detail.current && window.matchMedia('(min-width: 1024px)').matches && detail.current.getBoundingClientRect().top < 65) {
      detail.current.scrollIntoView({ block: 'start' });
    }
  }
  function backToList() {
    setDetailOpen(false);
    requestAnimationFrame(() => list.current?.querySelector<HTMLElement>('[aria-current="true"]')?.focus());
  }
  function resetFilters() {
    setQ('');
    setTopic('');
    setScope('');
    setShowAll(false);
    setDetailOpen(false);
  }

  return (
    <AsyncView state={state}>
      {(s) => (
        <div className="wiki-page" data-detail={detailOpen && Boolean(current)}>
          <PageHeader title="매장 위키" sub={`${s.store.name} · 본사 공통 지침 및 매장별 업무 사례`}
            actions={role === '점장' && <Link className="wiki-graph-link" to={`/graph?storeId=${id}`}><Network size={15} aria-hidden />지식 그래프</Link>} />
          <div className="wiki-filters" role="search" aria-label="카드 조회 조건">
            <label className="wiki-filter-search"><span>검색어</span>
              <span className="wiki-input-wrap"><Search size={15} aria-hidden /><input type="search" placeholder="카드명·번호·키워드" value={q} onChange={(e) => { setQ(e.target.value); setDetailOpen(false); }} /></span>
            </label>
            <label><span>업무 주제</span>
              <select value={topic} onChange={(e) => { setTopic(e.target.value); setDetailOpen(false); }}>
                <option value="">전체 주제</option>{s.topics.map((t) => <option key={t}>{t}</option>)}
              </select>
            </label>
            <label><span>적용 범위</span>
              <select value={scope} onChange={(e) => { setScope(e.target.value as CardScope | ''); setDetailOpen(false); }}>
                <option value="">전체 범위</option><option value="brand">본사 공통</option><option value="store">매장 전용</option>
              </select>
            </label>
            <label className="wiki-status"><input type="checkbox" checked={showAll} onChange={(e) => { setShowAll(e.target.checked); setDetailOpen(false); }} />승인 대기·보관 포함</label>
            {filtered && <button type="button" className="wiki-reset" onClick={resetFilters}>초기화</button>}
          </div>
          {!current ? <Empty title="조회 결과 없음"><button type="button" className="wiki-reset" onClick={resetFilters}>전체 카드 조회</button></Empty> : (
            <div className="wiki-workspace">
              <nav className="wiki-register" aria-label="카드 목록" ref={list}>
                <div className="wiki-register-header"><h2>카드 목록</h2><span role="status">{cards.length}건 · {grouped.size}개 주제</span></div>
                <div className="wiki-register-body">
                  {Array.from(grouped, ([name, entries]) => <section key={name}>
                    <h3>{name}<span>{entries.length}</span></h3>
                    <ul>{entries.map((c) => (
                      <li key={c.id}><button type="button" aria-current={c.id === current.id ? 'true' : undefined} className="wiki-row" onClick={() => selectCard(c)}>
                        <span><span className="wiki-row-title">{c.title}</span><small>{c.id} · {c.scope === 'brand' ? '본사 공통' : '매장 전용'}{c.status === 'approved' ? '' : ` · ${CARD_STATUS[c.status].label}`}</small></span>
                        <ChevronRight size={15} aria-hidden />
                      </button></li>
                    ))}</ul>
                  </section>)}
                </div>
              </nav>
              <div className="wiki-detail" id={current.id} tabIndex={-1} ref={detail}>
                <button type="button" className="wiki-back" onClick={backToList}><ArrowLeft size={15} aria-hidden />카드 목록</button>
                <Detail key={current.id} card={current} storeId={id} summary={s.topicSummaries[current.topic]} onChanged={(updated) => state.setData((prev) => prev && ({ ...prev, cards: prev.cards.map((c) => c.id === updated.id ? updated : c) }))} />
              </div>
            </div>
          )}
        </div>
      )}
    </AsyncView>
  );
}

function Detail({ card, storeId, summary, onChanged }: { card: Card; storeId: string; summary?: string; onChanged: (card: Card) => void }) {
  const { role } = useApp();
  const act = useAction();
  async function archive() {
    const result = await act.run(card.id, () => api.card(storeId, card.id, 'archive', '점장이 보관'));
    if (result) onChanged(result);
  }
  return (
    <>
      <KnowledgeCard card={card} headingLevel={2} actions={role === '점장' && card.scope === 'store' && card.status === 'approved'
        ? <Button size="sm" variant="ghost" icon={Archive} busy={act.busy === card.id} onClick={() => void archive()}>카드 보관</Button> : undefined} />
      <InlineError message={act.error} />
      {summary && <details className="wiki-topic-note">
        <summary>{card.topic} · 주제별 편집 메모</summary>
        <p>{summary}</p>
      </details>}
    </>
  );
}
