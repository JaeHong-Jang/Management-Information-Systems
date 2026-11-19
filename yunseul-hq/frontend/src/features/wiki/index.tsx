// /store/:id/wiki 매장 위키: 목록 + 상세.
// ≥1024: 왼쪽 340px 목록(토픽별 묶음, 따로 스크롤) · 오른쪽 고른 카드 전체(토픽 요약 + 카드). <1024: 목록에서 고른 줄 바로 아래에 카드를 펼친다.
// 주소 #C001이면 그 카드를 고르고 승인 대기·보관 카드도 보이게 한다.
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { Archive, Building2, ChevronRight, Search, Store as StoreIcon } from 'lucide-react';
import type { Card, CardScope, StoreState } from '@shared/contracts';
import { useApp } from '@/app/AppData';
import { api } from '@/shared/api/client';
import { useAction, useAsync } from '@/shared/lib/useAsync';
import { AsyncView, Button, Empty, InlineError, KnowledgeCard, PageHeader } from '@/shared/ui';
import { CARD_STATUS } from '@/shared/theme/semantics';
import { cx } from '@/shared/lib/format';

const sel = 'h-10 min-w-0 rounded-ctl border border-line-strong bg-surface px-2 text-body';

export function WikiPage() {
  const { id = '' } = useParams();
  const { hash } = useLocation();
  const state = useAsync(() => api.state(id), [id]);
  const [scope, setScope] = useState<CardScope | ''>('');
  const [showAll, setShowAll] = useState(false);
  const [q, setQ] = useState('');
  const [topic, setTopic] = useState('');
  const [picked, setPicked] = useState<string | null>(null);

  // #C001: 그 카드를 고르고, 승인 대기·보관이어도 보이게
  useEffect(() => {
    const cid = hash.slice(1);
    if (!cid || !state.data?.cards.some((c) => c.id === cid)) return;
    setShowAll(true);
    setPicked(cid);
  }, [hash, state.data]);

  const grouped = useMemo(() => {
    const cards = (state.data?.cards ?? []).filter(
      (c) =>
        (showAll || c.status === 'approved') &&
        (!scope || c.scope === scope) &&
        (!topic || c.topic === topic) &&
        (!q.trim() || `${c.title} ${c.situation} ${c.reason} ${c.tags.join(' ')}`.includes(q.trim())),
    );
    const m = new Map<string, Card[]>();
    cards.forEach((c) => m.set(c.topic, [...(m.get(c.topic) ?? []), c]));
    return [...m.entries()];
  }, [state.data, scope, topic, q, showAll]);

  const flat = grouped.flatMap(([, cs]) => cs);
  const current = flat.find((c) => c.id === picked) ?? flat[0] ?? null;

  return (
    <AsyncView state={state}>
      {(s) => (
        <>
          <PageHeader title="매장 위키" en="WIKI" sub={`${s.store.name} · 본사 카드는 전 매장 공통, 매장 카드는 이 매장에서 쌓인 노하우예요. 본사 표준 카드는 가상 표준을 따라요`} />
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <label className="relative min-w-0 flex-1 sm:max-w-[260px]">
              <span className="sr-only">카드 검색</span>
              <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-text-muted" aria-hidden />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="카드 검색" className={cx(sel, 'w-full pl-7')} />
            </label>
            <select aria-label="토픽" className={sel} value={topic} onChange={(e) => setTopic(e.target.value)}>
              <option value="">전체 토픽</option>
              {s.topics.map((t) => <option key={t}>{t}</option>)}
            </select>
            <select aria-label="범위" className={sel} value={scope} onChange={(e) => setScope(e.target.value as CardScope | '')}>
              <option value="">본사 + 매장</option>
              <option value="brand">본사 카드만</option>
              <option value="store">매장 카드만</option>
            </select>
            <label className="inline-flex min-h-[44px] items-center gap-1.5 text-body">
              <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
              승인 대기·보관 카드도 보기
            </label>
          </div>
          {grouped.length === 0 || !current ? (
            <Empty title="조건에 맞는 카드가 없어요" />
          ) : (
            <div className="grid items-start gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
              <nav aria-label="카드 목록" className="min-w-0 rounded-card border border-line bg-surface shadow-card lg:sticky lg:top-[72px] lg:max-h-[calc(100vh-88px)] lg:overflow-y-auto">
                <p className="border-b border-line px-4 py-2.5 text-caption text-text-muted">
                  카드 <b className="num text-ink">{flat.length}</b>장 · 토픽 <b className="num text-ink">{grouped.length}</b>개
                </p>
                {grouped.map(([t, cards]) => (
                  <section key={t} className="border-b border-line last:border-b-0">
                    <h2 className="flex items-center justify-between bg-surface-sunken px-4 py-1.5 text-caption font-bold text-text-subtle">
                      {t}
                      <span className="num font-normal text-text-muted">{cards.length}</span>
                    </h2>
                    <ul>
                      {cards.map((c) => (
                        <li key={c.id} id={c.id} className="scroll-mt-24">
                          <ListRow card={c} on={c.id === current.id} onPick={() => setPicked(c.id)} />
                          {c.id === current.id && (
                            <div className="border-t border-line bg-bg p-2 lg:hidden">
                              <Detail s={s} card={c} storeId={id} onChanged={(r) => state.setData((x) => (x ? { ...x, cards: x.cards.map((y) => (y.id === r.id ? r : y)) } : x))} />
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </nav>
              <div className="hidden min-w-0 lg:sticky lg:top-[72px] lg:block lg:max-h-[calc(100vh-88px)] lg:overflow-y-auto">
                <Detail s={s} card={current} storeId={id} onChanged={(r) => state.setData((x) => (x ? { ...x, cards: x.cards.map((y) => (y.id === r.id ? r : y)) } : x))} />
              </div>
            </div>
          )}
        </>
      )}
    </AsyncView>
  );
}

/** 목록 한 줄: 범위 아이콘 · 제목 · (승인 전이면 상태) · 번호 */
function ListRow({ card, on, onPick }: { card: Card; on: boolean; onPick: () => void }) {
  const Icon = card.scope === 'brand' ? Building2 : StoreIcon;
  const st = card.status !== 'approved' ? CARD_STATUS[card.status] : null;
  return (
    <button
      type="button"
      onClick={onPick}
      aria-current={on ? 'true' : undefined}
      className={cx('flex min-h-[52px] w-full items-center gap-2.5 px-4 py-2 text-left', on ? 'bg-ink text-white' : 'hover:bg-ink-weak')}
    >
      <Icon size={15} aria-label={card.scope === 'brand' ? '본사 카드' : '매장 카드'} className={cx('shrink-0', on ? 'text-white/80' : 'text-text-muted')} />
      <span className="min-w-0 flex-1">
        <span className={cx('block text-body', on ? 'font-bold' : 'text-text')}>{card.title}</span>
        <span className={cx('block text-caption', on ? 'text-white/70' : 'text-text-muted')}>
          <span className="num">{card.id}</span> · {card.scope === 'brand' ? '본사' : '매장'}
          {st && ` · ${st.label}`}
        </span>
      </span>
      <ChevronRight size={15} aria-hidden className={cx('shrink-0', on ? 'text-white/80' : 'text-text-muted')} />
    </button>
  );
}

/** 상세: 토픽 요약 한 줄 + 카드 전체. 점장은 매장 카드를 보관할 수 있다 */
function Detail({ s, card, storeId, onChanged }: { s: StoreState; card: Card; storeId: string; onChanged: (c: Card) => void }) {
  const { role } = useApp();
  const act = useAction();
  const archive = async () => {
    const r = await act.run(card.id, () => api.card(storeId, card.id, 'archive', '점장이 보관'));
    if (r) onChanged(r);
  };
  const summary = s.topicSummaries[card.topic];
  return (
    <div className="space-y-3">
      {summary && (
        <p className="rounded-ctl border border-line bg-surface-sunken px-3 py-2 text-caption text-text-subtle">
          <b className="mr-1 text-text">{card.topic}</b>
          {summary}
        </p>
      )}
      <KnowledgeCard
        key={card.id}
        card={card}
        actions={
          role === '점장' && card.scope === 'store' && card.status === 'approved' ? (
            <Button size="sm" variant="ghost" icon={Archive} busy={act.busy === card.id} onClick={() => void archive()}>보관</Button>
          ) : undefined
        }
      />
      <InlineError message={act.error} />
    </div>
  );
}
