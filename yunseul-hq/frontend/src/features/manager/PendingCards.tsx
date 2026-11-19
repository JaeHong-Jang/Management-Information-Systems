// 승인 대기 카드: 처방·기록·에스컬레이션에서 온 카드를 점장이 확인 3개를 모두 체크한 뒤 승인하면 위키에 올라가요
import { useState } from 'react';
import { Check, X } from 'lucide-react';
import type { Card, Person } from '@shared/contracts';
import { api } from '@/shared/api/client';
import { useAction } from '@/shared/lib/useAsync';
import { Button, Empty, InlineError, KnowledgeCard, Panel, Tag } from '@/shared/ui';

const CHECKS = ['우리 매장 사실이 맞아요', '금지 표현이 없어요', '신입이 읽고 바로 할 수 있어요'] as const;

export function PendingCards({ storeId, cards, people, onChanged }: { storeId: string; cards: Card[]; people: Person[]; onChanged: () => void }) {
  const act = useAction();
  const who = new Map(people.map((p) => [p.id, p]));
  const run = async (c: Card, a: 'approve' | 'reject') => {
    if (await act.run(`${c.id}:${a}`, () => api.card(storeId, c.id, a))) onChanged();
  };
  return (
    <Panel id="pending" title="승인 대기 카드" en="APPROVE" sub={`${cards.length}장 · 아래 확인 3개를 모두 체크하면 승인할 수 있어요. 에이전트가 만든 것도 점장 승인 전에는 확정이 아니에요`} className="h-full">
      <InlineError message={act.error} />
      {cards.length === 0 ? (
        <Empty title="승인할 카드가 없어요" />
      ) : (
        <div className="space-y-4">
          {cards.map((c) => (
            <div key={c.id}>
              <p className="mb-1 flex flex-wrap items-center gap-1.5 text-caption text-text-muted">
                <Tag>출처: {c.origin}</Tag>
                작성 {who.get(c.authorId)?.name ?? c.authorId}
                {c.complaintTypes?.length ? <> · 막으려는 불만: {c.complaintTypes.join(', ')}</> : null}
              </p>
              <KnowledgeCard card={c} />
              <Confirm busy={act.busy} card={c} onApprove={() => run(c, 'approve')} onReject={() => run(c, 'reject')} />
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function Confirm({ card, busy, onApprove, onReject }: { card: Card; busy: string | null; onApprove: () => void; onReject: () => void }) {
  const [checked, setChecked] = useState<boolean[]>(CHECKS.map(() => false));
  const all = checked.every(Boolean);
  return (
    <fieldset className="mt-2 rounded-card border border-line bg-surface-sunken p-3">
      <legend className="px-1 text-caption font-bold text-text-subtle">승인 전에 확인해요</legend>
      <ul>
        {CHECKS.map((t, i) => (
          <li key={t}>
            <label className="flex min-h-[44px] cursor-pointer items-center gap-3 text-body">
              <input
                type="checkbox"
                checked={checked[i]}
                onChange={(e) => setChecked((p) => p.map((v, j) => (j === i ? e.target.checked : v)))}
                className="h-5 w-5 shrink-0 accent-[var(--ink)]"
              />
              {t}
            </label>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex flex-wrap justify-end gap-2">
        <Button icon={X} busy={busy === `${card.id}:reject`} onClick={onReject}>거절</Button>
        <Button variant="primary" icon={Check} busy={busy === `${card.id}:approve`} disabled={!all} onClick={onApprove}>승인</Button>
      </div>
    </fieldset>
  );
}
