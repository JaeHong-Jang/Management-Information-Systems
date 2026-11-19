// 승인 대기 카드: 처방·기록·에스컬레이션에서 온 카드를 점장이 승인하면 위키에 올라가요
import { Check, X } from 'lucide-react';
import type { Card, Person } from '@shared/contracts';
import { api } from '@/shared/api/client';
import { useAction } from '@/shared/lib/useAsync';
import { Button, Empty, InlineError, KnowledgeCard, Panel, Tag } from '@/shared/ui';

export function PendingCards({ storeId, cards, people, onChanged }: { storeId: string; cards: Card[]; people: Person[]; onChanged: () => void }) {
  const act = useAction();
  const who = new Map(people.map((p) => [p.id, p]));
  const run = async (c: Card, a: 'approve' | 'reject') => {
    if (await act.run(`${c.id}:${a}`, () => api.card(storeId, c.id, a))) onChanged();
  };
  return (
    <Panel id="pending" title="승인 대기 카드" en="APPROVE" sub={`${cards.length}장 · 승인하면 매장 위키와 근무 전 브리핑에 들어가요. 에이전트가 만든 것도 점장 승인 전에는 확정이 아니에요`} className="h-full">
      <InlineError message={act.error} />
      {cards.length === 0 ? (
        <Empty title="승인할 카드가 없어요" />
      ) : (
        <div className="space-y-3">
          {cards.map((c) => (
            <div key={c.id}>
              <p className="mb-1 flex flex-wrap items-center gap-1.5 text-caption text-text-muted">
                <Tag>출처: {c.origin}</Tag>
                작성 {who.get(c.authorId)?.name ?? c.authorId}
                {c.complaintTypes?.length ? <> · 막으려는 불만: {c.complaintTypes.join(', ')}</> : null}
              </p>
              <KnowledgeCard
                card={c}
                actions={
                  <>
                    <Button size="sm" variant="primary" icon={Check} busy={act.busy === `${c.id}:approve`} onClick={() => run(c, 'approve')}>승인</Button>
                    <Button size="sm" icon={X} busy={act.busy === `${c.id}:reject`} onClick={() => run(c, 'reject')}>거절</Button>
                  </>
                }
              />
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
