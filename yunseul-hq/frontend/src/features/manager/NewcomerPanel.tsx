// 새 알바 준비 상태: 신입마다 한 줄(이름 · 막대 · k/N). 안 읽은 상황 목록은 접어 둔다. 개인 평가가 아니라 가르칠 순서를 보는 용도
import { ChevronDown } from 'lucide-react';
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
        <ul className="divide-y divide-line">
          {newcomers.map((p) => {
            const read = new Set(onboarding.reads.filter((r) => r.personId === p.id).map((r) => r.cardId));
            const done = onboarding.items.filter((i) => read.has(i.cardId)).length;
            const left = onboarding.items.filter((i) => !read.has(i.cardId));
            const line = (
              <>
                <span className="w-28 shrink-0 truncate font-bold">{p.name} <span className="text-caption font-normal text-text-muted">{p.tenure}</span></span>
                <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-sunken" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} aria-label={`${p.name} 읽은 카드`}>
                  <span className="block h-full rounded-full bg-ink" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
                </span>
                <span className="num w-10 shrink-0 text-right text-body font-bold text-ink">{done}/{total}</span>
              </>
            );
            return (
              <li key={p.id}>
                {left.length === 0 ? (
                  <p className="flex min-h-[48px] items-center gap-3">{line}<span className="sr-only">다 읽었어요</span></p>
                ) : (
                  <details className="group">
                    <summary className="flex min-h-[48px] cursor-pointer list-none items-center gap-3">
                      {line}
                      <ChevronDown size={16} className="shrink-0 text-text-muted transition-transform group-open:rotate-180" aria-label="안 읽은 상황 보기" />
                    </summary>
                    <p className="text-caption text-text-muted">아직 안 읽은 상황 {left.length}개</p>
                    <ul className="mb-2 mt-0.5 list-disc space-y-0.5 pl-4 text-body text-text-subtle">
                      {left.map((i) => <li key={i.cardId}>{i.situationTitle}</li>)}
                    </ul>
                  </details>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
