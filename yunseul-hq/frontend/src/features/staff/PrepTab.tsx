// 첫 근무 준비: 이 매장에서 실제로 자주 터진 상황 카드를 읽고 '읽었어요'만 누른다. 퀴즈·점수 없음
import { Check, CircleCheck } from 'lucide-react';
import type { Card, Onboarding, OnboardingItem, Situation } from '@shared/contracts';
import { api } from '@/shared/api/client';
import { useAction } from '@/shared/lib/useAsync';
import { Button, CardBadges, Empty, InlineError, PageHeader } from '@/shared/ui';
import { dateTime } from '@/shared/lib/format';

/** 이 사람이 읽은 카드 id → 읽은 시각 */
export function readMap(ob: Onboarding, personId: string) {
  const ids = new Set(ob.items.map((i) => i.cardId));
  return new Map(ob.reads.filter((r) => r.personId === personId && ids.has(r.cardId)).map((r) => [r.cardId, r.at]));
}

export function ProgressBar({ done, total }: { done: number; total: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-sunken" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} aria-label="읽은 카드">
        <div className="h-full rounded-full bg-ink transition-[width] duration-300" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
      </div>
      <span className="num shrink-0 text-body font-bold text-ink">{done}/{total}</span>
    </div>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-3">
      <p className="text-caption font-bold text-text-subtle">{label}</p>
      <div className="mt-0.5 text-mobile">{children}</div>
    </div>
  );
}

function PrepCard({ item, card, situation, at, busy, onRead }: {
  item: OnboardingItem;
  card: Card | undefined;
  situation: Situation | undefined;
  at: string | undefined;
  busy: boolean;
  onRead: () => void;
}) {
  const quote = situation?.quotes[0];
  if (at) {
    return (
      <li>
        <details className="rounded-card border border-line bg-surface shadow-card">
          <summary className="flex min-h-[52px] cursor-pointer items-center gap-2 px-4 py-2 text-mobile">
            <CircleCheck size={18} className="shrink-0 text-done" aria-hidden />
            <span className="min-w-0 flex-1 font-medium">{item.situationTitle}</span>
            <span className="num shrink-0 text-caption text-text-muted">읽음 {dateTime(at)}</span>
          </summary>
          {card && <PrepBody card={card} padded />}
        </details>
      </li>
    );
  }
  return (
    <li className="rounded-card border border-line bg-surface p-4 shadow-card">
      <h2 className="font-display text-section text-ink">{item.situationTitle}</h2>
      <p className="mt-1 text-body text-text-subtle">{item.why}</p>
      {quote && <blockquote className="mt-2 border-l-2 border-line-strong pl-3 text-body text-text-muted">“{quote.text}”</blockquote>}
      {card ? <PrepBody card={card} /> : <p className="mt-3 text-body text-text-muted">카드 {item.cardId}를 불러오지 못했어요.</p>}
      <Button variant="primary" size="lg" icon={Check} busy={busy} onClick={onRead} className="mt-4 w-full">
        읽었어요
      </Button>
    </li>
  );
}

function PrepBody({ card, padded = false }: { card: Card; padded?: boolean }) {
  return (
    <div className={padded ? 'px-4 pb-4' : ''}>
      <div className="mt-2"><CardBadges card={card} /></div>
      {card.actions.length > 0 && (
        <Block label="이렇게 해요">
          <ol className="list-decimal space-y-0.5 pl-5">{card.actions.map((a, i) => <li key={i}>{a}</li>)}</ol>
        </Block>
      )}
      {card.reason && <Block label="왜">{card.reason}</Block>}
      {card.avoid && <Block label="하지 말 것">{card.avoid}</Block>}
      {card.customerNotice && (
        <Block label="손님께 할 말"><p className="bubble inline-block px-5 py-3 font-medium text-ink">“{card.customerNotice}”</p></Block>
      )}
      {card.escalateWhen && <Block label="이럴 땐 점장 부르기">{card.escalateWhen}</Block>}
    </div>
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
  const total = onboarding.items.length;
  const done = reads.size;
  const cardMap = new Map(cards.map((c) => [c.id, c]));
  const sitMap = new Map(situations.map((s) => [s.id, s]));
  const read = async (cardId: string) => {
    const ob = await act.run(cardId, () => api.readOnboarding(storeId, me, cardId));
    if (ob) onUpdate(ob);
  };

  return (
    <section>
      <PageHeader title="첫 근무 준비" en="FIRST SHIFT" sub="이 매장에서 실제로 자주 터진 상황부터 읽어요. 읽고 '읽었어요'만 누르면 돼요." />
      <div className="mb-4 rounded-card border border-line bg-surface p-4 shadow-card">
        <ProgressBar done={done} total={total} />
      </div>
      <InlineError message={act.error} />
      {total === 0 ? (
        <Empty title="읽을 카드가 아직 없어요" />
      ) : (
        <>
          {done === total && (
            <p className="bubble mb-4 px-5 py-4 text-mobile font-medium text-ink">첫 근무 준비를 마쳤어요. 막히면 홈에서 바로 물어보세요.</p>
          )}
          <ol className="space-y-4">
            {onboarding.items.map((it) => (
              <PrepCard key={it.cardId} item={it} card={cardMap.get(it.cardId)} situation={sitMap.get(it.situationId)} at={reads.get(it.cardId)} busy={act.busy === it.cardId} onRead={() => void read(it.cardId)} />
            ))}
          </ol>
        </>
      )}
    </section>
  );
}
