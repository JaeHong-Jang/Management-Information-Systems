// 승인 대기 카드: 처방·기록·에스컬레이션에서 온 카드를 점장이 확인 3개를 모두 체크한 뒤 승인하면 위키에 올라가요
import { useState } from 'react';
import { Check, X } from 'lucide-react';
import type { Card, Person } from '@shared/contracts';
import { api } from '@/shared/api/client';
import { useAction } from '@/shared/lib/useAsync';
import { Button, Empty, InlineError, KnowledgeCard, Panel, Tag } from '@/shared/ui';

const CHECKS = ['매장 운영 사실과 일치', '금지 표현 검토 완료', '신입 직원이 수행 가능한 절차'] as const;

export function PendingCards({ storeId, cards, people, onChanged }: { storeId: string; cards: Card[]; people: Person[]; onChanged: () => void }) {
  const act = useAction();
  const who = new Map(people.map((p) => [p.id, p]));
  const run = async (c: Card, a: 'approve' | 'reject') => {
    if (await act.run(`${c.id}:${a}`, () => api.card(storeId, c.id, a))) onChanged();
  };
  return (
    <Panel id="pending" title="카드 승인 심사" sub={`${cards.length}건 대기 · 검토 항목 3개 확인 후 위키 등록`} className="h-full">
      <InlineError message={act.error} />
      {cards.length === 0 ? (
        <Empty title="승인 대기 카드 없음" />
      ) : (
        <div className="space-y-4">
          {cards.map((c) => (
            <div key={c.id}>
              <p className="mb-1 flex flex-wrap items-center gap-1.5 text-caption text-text-muted">
                <Tag>{c.origin}</Tag>
                작성 {who.get(c.authorId)?.name ?? c.authorId}
                {c.complaintTypes?.length ? <> · 관련 불만 · {c.complaintTypes.join(', ')}</> : null}
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
      <legend className="px-1 text-caption font-bold text-text-subtle">승인 전 검토</legend>
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
        <Button icon={X} busy={busy === `${card.id}:reject`} disabled={!!busy} onClick={onReject}>반려</Button>
        <Button variant="primary" icon={Check} busy={busy === `${card.id}:approve`} disabled={!all || !!busy} onClick={onApprove}>승인</Button>
      </div>
    </fieldset>
  );
}
