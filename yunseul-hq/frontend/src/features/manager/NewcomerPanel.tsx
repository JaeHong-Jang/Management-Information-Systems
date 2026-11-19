// 새 알바 준비 상태: 신입마다 읽은 카드 k/N, 아직 안 읽은 상황 제목. 개인 평가가 아니라 가르칠 순서를 보는 용도
import type { Onboarding, Person } from '@shared/contracts';
import { Empty, Panel } from '@/shared/ui';

export function NewcomerPanel({ people, onboarding }: { people: Person[]; onboarding: Onboarding }) {
  const newcomers = people.filter((p) => p.role === '신입');
  const total = onboarding.items.length;
  return (
    <Panel id="newcomers" title="새 알바 준비 상태" en="ONBOARDING" sub="첫 근무 준비 카드를 얼마나 읽었는지 보여 줘요. 읽기만 하고 점수는 없어요">
      {newcomers.length === 0 ? (
        <Empty title="지금 준비 중인 신입이 없어요" />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {newcomers.map((p) => {
            const read = new Set(onboarding.reads.filter((r) => r.personId === p.id).map((r) => r.cardId));
            const done = onboarding.items.filter((i) => read.has(i.cardId)).length;
            const left = onboarding.items.filter((i) => !read.has(i.cardId));
            return (
              <li key={p.id} className="rounded-card border border-line p-3">
                <p className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-bold">{p.name} <span className="text-caption font-normal text-text-muted">{p.tenure}</span></span>
                  <span className="num text-body font-bold text-ink">{done}/{total}</span>
                </p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-sunken" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} aria-label={`${p.name} 읽은 카드`}>
                  <div className="h-full rounded-full bg-ink" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
                </div>
                {left.length === 0 ? (
                  <p className="mt-2 text-caption text-done">첫 근무 준비를 다 읽었어요</p>
                ) : (
                  <>
                    <p className="mt-2 text-caption text-text-muted">아직 안 읽은 상황</p>
                    <ul className="mt-0.5 list-disc space-y-0.5 pl-4 text-body text-text-subtle">
                      {left.map((i) => <li key={i.cardId}>{i.situationTitle}</li>)}
                    </ul>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
