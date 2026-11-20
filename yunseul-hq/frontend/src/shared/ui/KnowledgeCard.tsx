// 위키, 근무 준비, 카드 서랍에서 같은 순서로 대응 절차를 표시한다.
import { useState, type ReactNode } from 'react';
import { Building2, Check, Store as StoreIcon, X } from 'lucide-react';
import type { Card } from '@shared/contracts';
import type { CardEdits } from '../api/client';
import { CARD_STATUS, SOURCE } from '../theme/semantics';
import { Button } from './Button';
import { InlineError } from './States';
import { AiDraftBadge, HumanStamp, Tag, VirtualBadge } from './Badge';
import { Drawer } from './Drawer';
import './knowledge-card.css';

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

export function CardMeta({ card }: { card: Card }) {
  return (
    <dl className="knowledge-meta">
      <div><dt>카드 번호</dt><dd>{card.id}</dd></div>
      <div><dt>업무 주제</dt><dd>{card.topic}</dd></div>
      {card.standardId && <div><dt>관련 표준</dt><dd>{card.standardId}</dd></div>}
      {card.prescriptionId && <div><dt>관련 처방</dt><dd>{card.prescriptionId}</dd></div>}
      <div><dt>사용</dt><dd>{card.uses}회</dd></div>
      <div><dt>도움 됨 / 안 됨</dt><dd>{card.helpful} / {card.notHelpful}건</dd></div>
      {card.expires && <div><dt>만료일</dt><dd>{card.expires.slice(0, 10)}</dd></div>}
    </dl>
  );
}

export function CardBody({ card, meta = true, showSituation = true }: { card: Card; meta?: boolean; showSituation?: boolean }) {
  return (
    <div className="knowledge-body">
      {showSituation && card.situation && <section className="knowledge-field"><h4>적용 상황</h4><p>{card.situation}</p></section>}
      {card.actions.length > 0 && (
        <section className="knowledge-steps">
          <h4>대응 절차</h4>
          <ol>{card.actions.map((a, i) => <li key={i}><span aria-hidden="true">{i + 1}</span>{a}</li>)}</ol>
        </section>
      )}
      {card.customerNotice && (
        <section className="knowledge-notice">
          <h4>고객 안내 예시</h4>
          <blockquote>“{card.customerNotice}”</blockquote>
        </section>
      )}
      {(card.avoid || card.escalateWhen) && (
        <div className="knowledge-guidance">
          {card.avoid && <section><h4>금지 사항</h4><p>{card.avoid}</p></section>}
          {card.escalateWhen && <section><h4>점장 보고 기준</h4><p>{card.escalateWhen}</p></section>}
        </div>
      )}
      <section className="knowledge-field"><h4>판단 근거</h4><p>{card.reason || '미등록'}</p></section>
      {meta && <CardMeta card={card} />}
    </div>
  );
}

export function KnowledgeCard({ card, actions, headingLevel = 3 }: { card: Card; actions?: ReactNode; headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  return (
    <article className="knowledge-card">
      <header className="knowledge-heading">
        <div><p className="knowledge-record">{card.topic} · {card.id}</p><Heading>{card.title}</Heading><CardBadges card={card} /></div>
        {actions && <div>{actions}</div>}
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
        <p className="text-body text-text-muted">현재 매장 위키에 카드 {cardId} 없음</p>
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

function EditField({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block"><span className="mb-1 block text-caption font-bold text-text-subtle">{label}</span>{children}</label>;
}

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
      <EditField label="제목"><input value={f.title} onChange={set('title')} className={field} /></EditField>
      <EditField label="상황"><textarea value={f.situation} onChange={set('situation')} rows={2} className={field} /></EditField>
      <EditField label="판단 근거"><textarea value={f.reason} onChange={set('reason')} rows={2} className={field} /></EditField>
      <EditField label="대응 절차 (행당 한 단계)"><textarea value={f.actions} onChange={set('actions')} rows={3} className={field} /></EditField>
      <div className="grid gap-3 md:grid-cols-2">
        <EditField label="금지 사항"><textarea value={f.avoid} onChange={set('avoid')} rows={2} className={field} /></EditField>
        <EditField label="점장 보고 기준"><textarea value={f.escalateWhen} onChange={set('escalateWhen')} rows={2} className={field} /></EditField>
      </div>
      <EditField label="고객 안내 예시"><textarea value={f.customerNotice} onChange={set('customerNotice')} rows={2} className={field} /></EditField>
      <div className="flex flex-wrap justify-end gap-2">
        <Button icon={X} onClick={onCancel}>닫기</Button>
        <Button type="submit" variant="primary" icon={Check} busy={busy} disabled={!ok}>수정 내용 저장</Button>
      </div>
      <InlineError message={error} />
    </form>
  );
}
