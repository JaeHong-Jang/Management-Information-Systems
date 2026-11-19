// 사례 카드: 표지(범위·출처·상태) + 본문(언제 → 손님께 할 말 → 이렇게 해요 → 하지 말 것 | 점장 부르기 → 왜 → 숫자 정보). 모든 화면이 같은 순서
import { useState, type ReactNode } from 'react';
import { Building2, Check, Store as StoreIcon, X } from 'lucide-react';
import type { Card } from '@shared/contracts';
import type { CardEdits } from '../api/client';
import { CARD_STATUS, SOURCE } from '../theme/semantics';
import { Button } from './Button';
import { InlineError } from './States';
import { AiDraftBadge, HumanStamp, Tag, VirtualBadge } from './Badge';
import { Drawer } from './Drawer';

/** 카드 표지: 범위 · 출처 · 3중 상태(AI 초안 / 사람 승인). 에이전트가 만들었다고 승인된 것은 아니다 */
export function CardBadges({ card }: { card: Card }) {
  const st = CARD_STATUS[card.status];
  const drafted = card.origin === '처방' || card.origin === '기록';
  return (
    <span className="flex flex-wrap items-center gap-1">
      <Tag tone={card.scope === 'brand' ? 'ink' : 'neutral'} icon={card.scope === 'brand' ? Building2 : StoreIcon}>
        {card.scope === 'brand' ? '본사 카드' : '매장 카드'}
      </Tag>
      <Tag tone={SOURCE[card.source].tone}>{card.source}</Tag>
      {card.source === '본사 표준' && <VirtualBadge label="가상 표준" />}
      {drafted && <AiDraftBadge />}
      {card.status === 'approved' ? (
        card.scope === 'store' && <HumanStamp label="점장 승인" />
      ) : (
        <Tag tone={st.tone} icon={st.icon}>
          {st.label}
        </Tag>
      )}
    </span>
  );
}

function Label({ children }: { children: ReactNode }) {
  return <p className="text-caption font-bold text-text-subtle">{children}</p>;
}

/** 카드 숫자 정보 한 줄(번호·토픽·표준·도움/안 됨/사용·만료). 직원 화면에서는 뺀다 */
export function CardMeta({ card }: { card: Card }) {
  return (
    <p className="flex flex-wrap gap-x-3 gap-y-1 border-t border-line pt-2 text-caption text-text-muted">
      <span className="num">{card.id}</span>
      <span>토픽 {card.topic}</span>
      {card.standardId && <span>표준 {card.standardId}</span>}
      {card.prescriptionId && <span>처방 {card.prescriptionId}</span>}
      <span>
        도움 <span className="num">{card.helpful}</span> · 안 됨 <span className="num">{card.notHelpful}</span> · 사용 <span className="num">{card.uses}</span>
      </span>
      {card.expires && <span>만료 <span className="num">{card.expires.slice(0, 10)}</span></span>}
    </p>
  );
}

/**
 * 카드 본문. 모든 화면(위키·서랍·첫 근무 준비·승인 대기)이 같은 순서로 읽는다: 현장에서 먼저 필요한 것부터.
 * 언제(상황) → 손님께 할 말(말풍선) → 이렇게 해요(번호) → 하지 말 것 | 이럴 땐 점장 부르기(넓으면 두 칸) → 왜(판단 이유) → 숫자 정보.
 */
export function CardBody({ card, meta = true, showSituation = true }: { card: Card; meta?: boolean; showSituation?: boolean }) {
  return (
    <div className="space-y-4">
      {showSituation && card.situation && (
        <p className="text-body text-text-subtle">
          <span className="mr-1.5 font-bold text-text">언제</span>
          {card.situation}
        </p>
      )}
      {card.customerNotice && (
        <div>
          <Label>손님께 할 말</Label>
          <p className="bubble mt-1 px-5 py-3 text-mobile font-medium text-ink">“{card.customerNotice}”</p>
        </div>
      )}
      {card.actions.length > 0 && (
        <div>
          <Label>이렇게 해요</Label>
          <ol className="mt-1 space-y-1.5">
            {card.actions.map((a, i) => (
              <li key={i} className="flex gap-2.5 text-body">
                <span className="num mt-px grid h-5 w-5 shrink-0 place-items-center rounded-full bg-ink text-[0.6875rem] text-white">{i + 1}</span>
                <span className="min-w-0">{a}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
      {(card.avoid || card.escalateWhen) && (
        <div className="grid gap-2 sm:grid-cols-2">
          {card.avoid && (
            <div className="rounded-ctl border border-line bg-surface-sunken px-3 py-2.5">
              <Label>하지 말 것</Label>
              <p className="mt-0.5 text-body">{card.avoid}</p>
            </div>
          )}
          {card.escalateWhen && (
            <div className="rounded-ctl border border-amber-bar bg-yellow-weak px-3 py-2.5">
              <Label>이럴 땐 점장 부르기</Label>
              <p className="mt-0.5 text-body">{card.escalateWhen}</p>
            </div>
          )}
        </div>
      )}
      <p className="text-body text-text-subtle">
        <span className="mr-1.5 font-bold text-text">왜</span>
        {card.reason || '이유가 아직 없어요'}
      </p>
      {meta && <CardMeta card={card} />}
    </div>
  );
}

export function KnowledgeCard({ card, actions }: { card: Card; actions?: ReactNode }) {
  return (
    <article className="rounded-card border border-line bg-surface p-4 shadow-card sm:p-5">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-display text-[1.125rem] leading-7 text-ink">{card.title}</h3>
          <div className="mt-1">
            <CardBadges card={card} />
          </div>
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </header>
      <CardBody card={card} />
    </article>
  );
}

/** 근거 카드 서랍: [C015] 같은 칩을 누르면 연다. 닫으면 누른 칩으로 초점이 돌아간다 */
export function CardDrawer({ card, cardId, onClose }: { card: Card | null | undefined; cardId: string | null; onClose: () => void }) {
  return (
    <Drawer open={!!cardId} onClose={onClose} eyebrow={<span className="num">근거 카드 {cardId}</span>} title={card?.title ?? cardId ?? ''}>
      {!card ? (
        <p className="text-body text-text-muted">이 매장 위키에서 카드 {cardId}를 찾지 못했어요. 보관되었거나 다른 매장 카드일 수 있어요.</p>
      ) : (
        <>
          <div className="mb-4">
            <CardBadges card={card} />
          </div>
          <CardBody card={card} />
        </>
      )}
    </Drawer>
  );
}

const lines = (t: string) => t.split('\n').map((x) => x.trim()).filter(Boolean);
const field = 'w-full rounded-ctl border border-line-strong bg-surface p-2.5 text-body';

/** 카드 고치기 폼: 점장이 쓴 카드를 그 자리에서 다듬는다. 저장은 부모가 edit API로 보낸다 */
export function CardEditForm({ card, busy, error, onSave, onCancel }: {
  card: Card;
  busy: boolean;
  error: string | null;
  onSave: (edits: CardEdits) => void;
  onCancel: () => void;
}) {
  const [f, setF] = useState({
    title: card.title, situation: card.situation, reason: card.reason, actions: card.actions.join('\n'),
    avoid: card.avoid, escalateWhen: card.escalateWhen, customerNotice: card.customerNotice ?? '',
  });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));
  const ok = f.title.trim() && lines(f.actions).length > 0;
  const L = ({ t, children }: { t: string; children: ReactNode }) => (
    <label className="block"><span className="mb-1 block text-caption font-bold text-text-subtle">{t}</span>{children}</label>
  );
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          title: f.title.trim(), situation: f.situation.trim(), reason: f.reason.trim(), actions: lines(f.actions),
          avoid: f.avoid.trim(), escalateWhen: f.escalateWhen.trim(), customerNotice: f.customerNotice.trim(),
        });
      }}
    >
      <L t="제목"><input value={f.title} onChange={set('title')} className={field} /></L>
      <L t="상황"><textarea value={f.situation} onChange={set('situation')} rows={2} className={field} /></L>
      <L t="왜 그렇게 해요"><textarea value={f.reason} onChange={set('reason')} rows={2} className={field} /></L>
      <L t="이렇게 해요 (한 줄에 하나)"><textarea value={f.actions} onChange={set('actions')} rows={3} className={field} /></L>
      <div className="grid gap-3 md:grid-cols-2">
        <L t="하지 말 것"><textarea value={f.avoid} onChange={set('avoid')} rows={2} className={field} /></L>
        <L t="점장을 부를 때"><textarea value={f.escalateWhen} onChange={set('escalateWhen')} rows={2} className={field} /></L>
      </div>
      <L t="손님께 할 말"><textarea value={f.customerNotice} onChange={set('customerNotice')} rows={2} className={field} /></L>
      <div className="flex flex-wrap justify-end gap-2">
        <Button icon={X} onClick={onCancel}>닫기</Button>
        <Button type="submit" variant="primary" icon={Check} busy={busy} disabled={!ok}>고친 내용 저장</Button>
      </div>
      <InlineError message={error} />
    </form>
  );
}
