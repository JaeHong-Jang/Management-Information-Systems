import { useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ChevronRight, CircleCheck } from 'lucide-react';
import type { Card, Onboarding, OnboardingItem, Situation } from '@shared/contracts';
import { api } from '@/shared/api/client';
import { useAction } from '@/shared/lib/useAsync';
import { Button, CardBadges, CardBody, Empty, InlineError } from '@/shared/ui';
import { dateTime } from '@/shared/lib/format';

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

function PrepCard({ item, card, situation }: { item: OnboardingItem; card?: Card; situation?: Situation }) {
  const quote = situation?.quotes[0];
  return (
    <>
      <header className="prep-detail-head">
        <div className="flex flex-wrap items-center gap-2 text-caption text-text-muted">
          <span>{item.cardId}</span>{card && <CardBadges card={card} />}
        </div>
        <h2>{item.situationTitle}</h2>
        <p>{item.why}</p>
      </header>
      <div className="prep-detail-body">
        {card ? <CardBody card={card} meta={false} /> : <p className="text-body text-text-muted">등록된 카드 본문 없음</p>}
        {quote && (
          <details className="prep-evidence">
            <summary>관련 매장 리뷰 <span>{quote.reviewId} · {quote.date}</span></summary>
            <blockquote>{quote.text}</blockquote>
          </details>
        )}
      </div>
    </>
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
  const detail = useRef<HTMLElement>(null);
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
    if (at < total - 1) go(at + 1);
  };
  const go = (i: number) => {
    setIdx(i);
    requestAnimationFrame(() => {
      const node = detail.current;
      if (node && node.getBoundingClientRect().top < 76) node.scrollIntoView({ block: 'start' });
      node?.focus({ preventScroll: true });
    });
  };

  if (!item) return <Empty title="등록된 교육 카드 없음" />;
  return (
    <section className="prep-workspace" aria-label="첫 근무 교육">
      <aside className="prep-register" aria-labelledby="prep-list-title">
        <div className="prep-register-head">
          <h2 id="prep-list-title">교육 목록</h2>
          <span>{total}건</span>
        </div>
        <div className="prep-progress">
          <p><span>학습 진도</span><strong>{done} / {total}건 확인</strong></p>
          <ProgressBar done={done} total={total} compact />
        </div>
        <label className="prep-mobile-select">
          <span>교육 항목</span>
          <select value={at} onChange={e => go(Number(e.target.value))} disabled={!!act.busy}>
            {items.map((it, i) => <option key={it.cardId} value={i}>{i + 1}. {it.situationTitle}{reads.has(it.cardId) ? ' · 확인 완료' : ''}</option>)}
          </select>
        </label>
        <ol className="prep-list">
          {items.map((it, i) => {
            const readAt = reads.get(it.cardId);
            return (
              <li key={it.cardId}>
                <button type="button" aria-current={i === at ? 'step' : undefined} onClick={() => go(i)} disabled={!!act.busy}>
                  <span className="prep-index">{String(i + 1).padStart(2, '0')}</span>
                  <span className="prep-list-entry"><strong>{it.situationTitle}</strong><small>
                    {readAt ? <><CircleCheck size={12} aria-hidden />확인 완료 · {dateTime(readAt)}</> : '미확인'}
                  </small></span>
                  {i === at && <ChevronRight size={15} aria-hidden />}
                </button>
              </li>
            );
          })}
        </ol>
      </aside>
      <article className="prep-detail" ref={detail} tabIndex={-1} aria-label="선택한 교육 항목">
        <PrepCard key={item.cardId} item={item} card={cardMap.get(item.cardId)} situation={sitMap.get(item.situationId)} />
        <footer className="prep-actions">
          <span role="status" className="text-caption text-text-muted">{done === total ? '전체 교육 확인 완료' : `교육 항목 ${at + 1} / ${total}`}</span>
          <div>
            <Button icon={ArrowLeft} disabled={at === 0 || !!act.busy} onClick={() => go(at - 1)}>이전</Button>
            {isRead && at === total - 1 ? (
              <span className="inline-flex items-center gap-1 text-body font-bold text-done"><CircleCheck size={16} aria-hidden />확인 완료</span>
            ) : (
              <Button variant="primary" icon={isRead ? ArrowRight : Check} busy={!!act.busy} onClick={() => void markRead()}>
                {isRead ? '다음 항목' : '확인 완료'}
              </Button>
            )}
          </div>
        </footer>
        <InlineError message={act.error} />
      </article>
    </section>
  );
}
