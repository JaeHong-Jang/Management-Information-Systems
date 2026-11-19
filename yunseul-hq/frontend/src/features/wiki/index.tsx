// /store/:id/wiki 매장 위키: 토픽별 카드, 본사/매장 범위와 출처 표지
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { Archive, Search } from 'lucide-react';
import type { Card, CardScope } from '@shared/contracts';
import { useApp } from '@/app/AppData';
import { api } from '@/shared/api/client';
import { useAction, useAsync } from '@/shared/lib/useAsync';
import { AsyncView, Button, Empty, InlineError, KnowledgeCard, PageHeader } from '@/shared/ui';
import { cx } from '@/shared/lib/format';

const sel = 'h-10 rounded-ctl border border-line-strong bg-surface px-2 text-body';

export function WikiPage() {
  const { id = '' } = useParams();
  const { hash } = useLocation();
  const { role } = useApp();
  const state = useAsync(() => api.state(id), [id]);
  const act = useAction();
  const [scope, setScope] = useState<CardScope | ''>('');
  const [showAll, setShowAll] = useState(false);
  const [q, setQ] = useState('');
  const [topic, setTopic] = useState('');

  useEffect(() => {
    if (!hash || !state.data) return;
    const el = document.getElementById(hash.slice(1));
    if (el) {
      setShowAll(true);
      el.scrollIntoView({ block: 'start' });
    }
  }, [hash, state.data]);

  const grouped = useMemo(() => {
    const cards = (state.data?.cards ?? []).filter(
      (c) =>
        (showAll || c.status === 'approved' || (hash && `#${c.id}` === hash)) &&
        (!scope || c.scope === scope) &&
        (!topic || c.topic === topic) &&
        (!q.trim() || `${c.title} ${c.situation} ${c.reason} ${c.tags.join(' ')}`.includes(q.trim())),
    );
    const m = new Map<string, Card[]>();
    cards.forEach((c) => m.set(c.topic, [...(m.get(c.topic) ?? []), c]));
    return [...m.entries()];
  }, [state.data, scope, topic, q, showAll, hash]);

  const archive = async (c: Card) => {
    const r = await act.run(c.id, () => api.card(id, c.id, 'archive', '점장이 보관'));
    if (r) state.setData((s) => (s ? { ...s, cards: s.cards.map((x) => (x.id === r.id ? r : x)) } : s));
  };

  return (
    <AsyncView state={state}>
      {(s) => (
        <>
          <PageHeader title="매장 위키" en="WIKI" sub={`${s.store.name} · ` + "본사 카드는 전 매장 공통, 매장 카드는 이 매장에서 쌓인 노하우예요. 본사 표준 카드는 가상 표준을 따라요"} />
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <label className="relative">
              <span className="sr-only">카드 검색</span>
              <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-text-muted" aria-hidden />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="카드 검색" className={cx(sel, 'w-48 pl-7')} />
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
          <InlineError message={act.error} />
          {grouped.length === 0 ? (
            <Empty title="조건에 맞는 카드가 없어요" />
          ) : (
            <div className="space-y-8">
              {grouped.map(([t, cards]) => (
                <section key={t}>
                  <h2 className="font-display text-section">{t} <span className="num font-sans font-normal text-text-muted">{cards.length}장</span></h2>
                  {s.topicSummaries[t] && <p className="mb-3 max-w-[80ch] text-body text-text-subtle">{s.topicSummaries[t]}</p>}
                  <div className={cx('grid gap-3', role !== '직원' && 'lg:grid-cols-2')}>
                    {cards.map((c) => (
                      <div key={c.id} id={c.id} className={cx('scroll-mt-24 rounded-card', hash === `#${c.id}` && 'outline outline-2 outline-ink')}>
                        <KnowledgeCard
                          card={c}
                          actions={
                            role === '점장' && c.scope === 'store' && c.status === 'approved' ? (
                              <Button size="sm" variant="ghost" icon={Archive} busy={act.busy === c.id} onClick={() => archive(c)}>보관</Button>
                            ) : undefined
                          }
                        />
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </>
      )}
    </AsyncView>
  );
}
