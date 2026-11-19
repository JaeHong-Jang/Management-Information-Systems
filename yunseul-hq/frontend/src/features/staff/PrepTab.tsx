// 첫 근무 준비: 이 매장에서 실제로 자주 터진 상황 카드를 읽고 '읽었어요'만 누른다. 퀴즈·점수 없음
// 한 장씩(진행 막대는 카드 머리에) + 전체 목록(≥1280 오른쪽 340px, 그 아래는 카드 밑). 목록을 누르면 그 장으로 간다
import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, CircleCheck } from 'lucide-react';
import type { Card, Onboarding, OnboardingItem, Situation } from '@shared/contracts';
import { api } from '@/shared/api/client';
import { useAction } from '@/shared/lib/useAsync';
import { Button, CardBadges, CardBody, Empty, InlineError, PageHeader } from '@/shared/ui';
import { cx, dateTime } from '@/shared/lib/format';

/** 이 사람이 읽은 카드 id → 읽은 시각 */
export function readMap(ob: Onboarding, personId: string) {
  const ids = new Set(ob.items.map((i) => i.cardId));
  return new Map(ob.reads.filter((r) => r.personId === personId && ids.has(r.cardId)).map((r) => [r.cardId, r.at]));
}

export function ProgressBar({ done, total, compact = false }: { done: number; total: number; compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-sunken" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} aria-label="읽은 카드">
        <div className="h-full rounded-full bg-ink transition-[width] duration-300" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
      </div>
      {!compact && <span className="num shrink-0 text-body font-bold text-ink">{done}/{total}</span>}
    </div>
  );
}

/** 인용은 단어 경계에서 자른다(백엔드가 120자 + …로 준다) */
const trimQuote = (t: string) => (t.endsWith('…') ? `${t.slice(0, -1).replace(/\s*\S*$/, '')}…` : t);

/** 지금 읽는 장: 진행(n/전체 + 막대) → 상황 제목 → 왜 이 매장에서 중요한지 + 실제 리뷰 한 줄 → 카드 본문(모든 화면 공통 순서) → 카드 표지 */
function PrepCard({ item, card, situation, number, total, done }: {
  item: OnboardingItem;
  card: Card | undefined;
  situation: Situation | undefined;
  number: number;
  total: number;
  done: number;
}) {
  const quote = situation?.quotes[0];
  return (
    <article className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
      <header className="border-b border-line px-4 py-3 sm:px-5">
        <p className="mb-2 flex items-baseline justify-between text-caption text-text-muted">
          <span><b className="num text-body text-ink">{number}</b> / <span className="num">{total}</span>장째</span>
          <span>읽음 <span className="num">{done}</span>장</span>
        </p>
        <ProgressBar done={done} total={total} compact />
      </header>
      <div className="px-4 pb-4 pt-4 sm:px-5">
        <h2 className="font-display text-title text-ink">{item.situationTitle}</h2>
        <p className="mt-1 text-body text-text-subtle">{item.why}</p>
        {quote && (
          <figure className="mt-3 rounded-ctl border-l-2 border-line-strong bg-surface-sunken px-3 py-2">
            <figcaption className="text-caption text-text-muted">실제 리뷰</figcaption>
            <blockquote className="text-body text-text-subtle">“{trimQuote(quote.text)}”</blockquote>
          </figure>
        )}
        <div className="mt-5">{card ? <CardBody card={card} meta={false} /> : <p className="text-body text-text-muted">카드를 불러오지 못했어요.</p>}</div>
        {card && (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3 text-caption text-text-muted">
            <span className="num">{card.id}</span>
            <CardBadges card={card} />
          </div>
        )}
      </div>
    </article>
  );
}

export function PrepTab({ storeId, me, cards, situations, onboarding, onUpdate }: {
  storeId: string;
  me: string;
  cards: Card[];
  situations: Situation[];
  onboarding: Onboarding;
  onUpdate: (ob: Onboarding) => void;
}) {
  const act = useAction();
  const reads = readMap(onboarding, me);
  const items = onboarding.items;
  const total = items.length;
  const done = reads.size;
  const cardMap = new Map(cards.map((c) => [c.id, c]));
  const sitMap = new Map(situations.map((s) => [s.id, s]));
  // 처음엔 아직 안 읽은 첫 장, 다 읽었으면 마지막 장
  const [idx, setIdx] = useState(() => {
    const first = items.findIndex((i) => !reads.has(i.cardId));
    return first < 0 ? Math.max(0, total - 1) : first;
  });
  const at = Math.min(idx, Math.max(0, total - 1));
  const item = items[at];
  const isRead = !!item && reads.has(item.cardId);

  const markRead = async () => {
    if (!item) return;
    if (!isRead) {
      const ob = await act.run(item.cardId, () => api.readOnboarding(storeId, me, item.cardId));
      if (!ob) return;
      onUpdate(ob);
    }
    go(Math.min(at + 1, total - 1));
  };
  const go = (i: number) => {
    setIdx(i);
    window.scrollTo({ top: 0 });
  };
  return (
    <section>
      <PageHeader title="첫 근무 준비" en="FIRST SHIFT" sub="이 매장에서 실제로 자주 터진 상황부터 한 장씩 읽어요. 읽고 '읽었어요'만 누르면 돼요." />
      <InlineError message={act.error} />
      {total === 0 || !item ? (
        <Empty title="읽을 카드가 아직 없어요" />
      ) : (
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px] xl:gap-10">
          <div className="min-w-0">
            {done === total && <p className="bubble mb-4 px-5 py-4 text-mobile font-medium text-ink">첫 근무 준비를 마쳤어요. 막히면 홈에서 바로 물어보세요.</p>}
            <PrepCard key={item.cardId} item={item} card={cardMap.get(item.cardId)} situation={sitMap.get(item.situationId)} number={at + 1} total={total} done={done} />
            <div className="mt-3 grid grid-cols-[auto_1fr] gap-2">
              <Button size="lg" icon={ArrowLeft} disabled={at === 0} onClick={() => go(at - 1)}>이전</Button>
              {isRead && at === total - 1 ? (
                <p className="flex items-center justify-center gap-1.5 text-mobile font-bold text-done"><CircleCheck size={18} aria-hidden />마지막 장까지 읽었어요</p>
              ) : (
                <Button variant="primary" size="lg" icon={isRead ? ArrowRight : Check} busy={act.busy === item.cardId} onClick={() => void markRead()}>
                  {isRead ? '다음 장' : '읽었어요'}
                </Button>
              )}
            </div>
          </div>
          <aside className="min-w-0 xl:sticky xl:top-[72px]" aria-label="전체 카드">
            <h2 className="mb-2 font-display text-section text-ink">전체 <span className="num">{total}</span>장</h2>
            <ol className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
              {items.map((it, i) => {
                const read = reads.has(it.cardId);
                const on = i === at;
                return (
                  <li key={it.cardId} className="border-b border-line last:border-b-0">
                    <button
                      type="button"
                      onClick={() => go(i)}
                      aria-current={on ? 'step' : undefined}
                      className={cx('flex min-h-[52px] w-full items-center gap-3 px-4 py-2 text-left', on ? 'bg-ink text-white' : 'hover:bg-ink-weak')}
                    >
                      {read ? (
                        <CircleCheck size={18} className={cx('shrink-0', on ? 'text-white' : 'text-done')} aria-label="읽음" />
                      ) : (
                        <span className={cx('num grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border text-[0.6875rem]', on ? 'border-white' : 'border-line-strong text-text-muted')}>{i + 1}</span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className={cx('block text-body', on && 'font-bold')}>{it.situationTitle}</span>
                        {read && <span className={cx('num block text-caption', on ? 'text-white/70' : 'text-text-muted')}>{dateTime(reads.get(it.cardId))} 읽음</span>}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </aside>
        </div>
      )}
    </section>
  );
}
