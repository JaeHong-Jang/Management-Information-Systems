import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useLive } from '@/shared/api/live';
import { Badge, CardDetail, CiteText, Empty, PageHeader, Panel, cx, inputCls, sourceTone, fmtTime } from '@/shared/ui';

export default function Page() {
  const { state, wikiFeed } = useLive();
  const [topic, setTopic] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [citeId, setCiteId] = useState<string | null>(null);

  const approved = useMemo(() => (state?.cards ?? []).filter((c) => c.status === 'approved'), [state]);
  const q = query.trim().toLowerCase();
  const filtered = useMemo(
    () => (q ? approved.filter((c) => [c.title, c.situation, c.reason, ...c.tags].some((s) => s.toLowerCase().includes(q))) : approved),
    [approved, q],
  );

  if (!state) return <Empty>불러오고 있어요</Empty>;
  const cur = topic ?? state.topics[0];
  const count = (t: string) => filtered.filter((c) => c.topic === t).length;
  const cards = filtered.filter((c) => c.topic === cur);
  const summary = state.topicSummaries[cur] ?? '';
  const name = (id: string) => state.people.find((p) => p.id === id)?.name;
  const citeCard = state.cards.find((c) => c.id === citeId);
  const freshKeys = new Set(wikiFeed.map((f) => `${f.op}|${f.detail}`));
  const log = state.log.slice(0, 15);

  return (
    <div className="mx-auto w-full max-w-5xl pb-16">
      <PageHeader eyebrow="관리" title="매장 위키" desc="승인된 판단 카드를 주제별로 모았어요. 판단 이유까지 같이 볼 수 있어요." />
      <div className="relative mb-4 max-w-md">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-disabled" />
        <input className={cx(inputCls, 'pl-10')} placeholder="제목, 상황, 이유, 태그로 찾기" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      <div className="grid gap-4 md:grid-cols-[220px_1fr]">
        <nav className="flex gap-2 overflow-x-auto md:flex-col md:gap-1">
          {state.topics.map((t) => (
            <button key={t} onClick={() => setTopic(t)} className={cx('flex shrink-0 items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-left text-[14px] font-semibold', t === cur ? 'bg-brand-weak text-brand-strong' : 'bg-surface text-ink-body hover:bg-surface-subtle')}>
              {t}
              <span className="text-[12px] font-medium opacity-70">{count(t)}</span>
            </button>
          ))}
        </nav>

        <div className="min-w-0 space-y-4">
          <Panel title={`${cur} · 핵심 판단 원칙`}>
            {summary.trim() ? <div className="text-[14px] leading-6 text-ink-strong"><CiteText text={summary} onCite={setCiteId} /></div> : <Empty>아직 정리된 원칙이 없어요</Empty>}
            {citeCard && (
              <div className="mt-3 rounded-xl bg-surface-subtle p-4">
                <CardDetail card={citeCard} authorName={name(citeCard.authorId)} />
                <button onClick={() => setCiteId(null)} className="mt-2 text-[13px] font-semibold text-ink-weak">접기</button>
              </div>
            )}
          </Panel>

          <Panel title={`카드 ${cards.length}개`}>
            {cards.length === 0 ? (
              <Empty>{q ? '찾는 카드가 없어요' : '승인된 카드가 없어요'}</Empty>
            ) : (
              <ul className="divide-y divide-line">
                {cards.map((c) => (
                  <li key={c.id} className="py-3">
                    <button className="flex w-full items-center justify-between gap-3 text-left" onClick={() => setOpen(open === c.id ? null : c.id)}>
                      <span className="text-[14px] font-semibold text-ink-strong">{c.title}</span>
                      <span className="flex shrink-0 items-center gap-1.5">
                        <Badge tone={sourceTone(c.source)}>{c.source}</Badge>
                        <span className="text-[12px] text-ink-weak">{c.uses}회</span>
                      </span>
                    </button>
                    {open === c.id && <div className="mt-3 rounded-xl bg-surface-subtle p-4"><CardDetail card={c} authorName={name(c.authorId)} /></div>}
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="최근 변경 기록">
            {log.length === 0 ? (
              <Empty>아직 기록이 없어요</Empty>
            ) : (
              <ul className="space-y-2">
                {log.map((l, i) => (
                  <li key={i} className={cx('flex flex-wrap items-baseline gap-x-2 rounded-lg px-2 py-1 text-[13px]', freshKeys.has(`${l.op}|${l.detail}`) && 'bg-brand-weak')}>
                    <span className="text-ink-weak">{fmtTime(l.time)}</span>
                    <Badge>{l.op}</Badge>
                    <span className="text-ink-body">{l.detail}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
