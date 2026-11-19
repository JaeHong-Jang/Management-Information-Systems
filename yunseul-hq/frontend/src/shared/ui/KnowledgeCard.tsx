// 사례 카드 본문: 상황 → 판단 이유 → 할 일 → 피할 것 → 점장 호출 → 손님 안내 (dl 구조)
import type { ReactNode } from 'react';
import { Building2, Store as StoreIcon } from 'lucide-react';
import type { Card } from '@shared/contracts';
import { CARD_STATUS, SOURCE } from '../theme/semantics';
import { AiDraftBadge, HumanStamp, Tag, VirtualBadge } from './Badge';
import { Drawer, DrawerSection } from './Drawer';

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

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[96px_1fr] sm:gap-3">
      <dt className="text-caption text-text-muted">{label}</dt>
      <dd className="text-body">{children}</dd>
    </div>
  );
}

export function CardBody({ card }: { card: Card }) {
  return (
    <dl className="space-y-2">
      <Row label="상황">{card.situation}</Row>
      <Row label="판단 이유">
        <span className="font-medium">{card.reason || '이유가 아직 없어요'}</span>
      </Row>
      {card.actions.length > 0 && (
        <Row label="할 일">
          <ol className="list-decimal space-y-0.5 pl-4">
            {card.actions.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ol>
        </Row>
      )}
      {card.avoid && <Row label="피할 것">{card.avoid}</Row>}
      {card.escalateWhen && <Row label="점장 호출">{card.escalateWhen}</Row>}
      {card.customerNotice && (
        <Row label="손님 안내">
          <span className="bubble inline-block px-3 py-1.5">“{card.customerNotice}”</span>
        </Row>
      )}
      <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1 text-caption text-text-muted">
        <span className="num">{card.id}</span>
        <span>토픽 {card.topic}</span>
        {card.standardId && <span>표준 {card.standardId}</span>}
        {card.prescriptionId && <span>처방 {card.prescriptionId}</span>}
        <span>
          도움 <span className="num">{card.helpful}</span> · 안 됨 <span className="num">{card.notHelpful}</span> · 사용 <span className="num">{card.uses}</span>
        </span>
        <span>만료 <span className="num">{card.expires?.slice(0, 10)}</span></span>
      </div>
    </dl>
  );
}

export function KnowledgeCard({ card, actions }: { card: Card; actions?: ReactNode }) {
  return (
    <article className="rounded-card border border-line bg-surface p-4 shadow-card">
      <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-section">{card.title}</h3>
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
          <DrawerSection n={1} title="상황과 판단 이유">
            <CardBody card={card} />
          </DrawerSection>
        </>
      )}
    </Drawer>
  );
}
