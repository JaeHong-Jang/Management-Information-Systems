// 내 질문: 내가 물은 질문 최근 순. 대기 중 / 점장 답변 완료(점장 답 + 새 카드 칩). 새로 온 답은 '새 답' 표시를 한 번 보여 준다
import { useEffect, useState } from 'react';
import { CircleCheck, Clock } from 'lucide-react';
import type { Question } from '@shared/contracts';
import { useStoreData } from '@/app/StoreData';
import { agoLabel, minutesBetween } from '@/shared/lib/format';
import { CiteChip, Empty, Tag } from '@/shared/ui';
import { ManagerCallText } from './ManagerCallText';

function Item({ q, now, fresh, onCite }: { q: Question; now: string; fresh: boolean; onCite: (id: string) => void }) {
  const answered = !!q.managerAnswer;
  const waiting = !answered && q.status === 'escalated';
  return (
    <li className={fresh ? 'rounded-card border border-amber-bar bg-yellow-weak p-3' : 'rounded-card border border-line bg-surface p-3'}>
      <div className="flex flex-wrap items-center gap-1.5 text-caption text-text-muted">
        {answered ? <Tag tone="done" icon={CircleCheck}>점장 답변 완료</Tag> : waiting ? <Tag tone="amber" icon={Clock}>대기 중</Tag> : <Tag>카드 답변</Tag>}
        {fresh && <Tag tone="ink">신규 답변</Tag>}
        <span>{agoLabel(minutesBetween(now, q.time))}</span>
      </div>
      <p className="mt-1 text-body font-semibold">{q.text}</p>
      {answered && (
        <div className="mt-2">
          <p className="text-caption font-bold text-text-subtle">점장 답변</p>
          <p className="whitespace-pre-line text-body">{q.managerAnswer}</p>
          {q.cardId && (
            <p className="mt-2 flex flex-wrap items-center gap-1 text-caption text-text-muted">
              등록된 사례 카드
              <CiteChip id={q.cardId} onOpen={onCite} />
            </p>
          )}
        </div>
      )}
      {waiting && <p className="mt-1 whitespace-pre-line text-body text-text-subtle"><ManagerCallText text={q.answer} onCite={onCite} /></p>}
      {!answered && !waiting && q.answer && (
        <details className="mt-1">
          <summary className="min-h-[32px] cursor-pointer text-caption text-ink hover:underline">답변 확인</summary>
          <p className="mt-1 whitespace-pre-line text-body text-text-subtle">{q.answer}</p>
        </details>
      )}
    </li>
  );
}

export function MyQuestions({ questions, now, excludeId, onCite }: { questions: Question[]; now: string; excludeId: string | null; onCite: (id: string) => void }) {
  const { me, unseen, markSeen } = useStoreData();
  const [fresh, setFresh] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    if (unseen.length === 0) return;
    const ids = unseen.map((q) => q.id);
    setFresh((p) => new Set([...p, ...ids]));
    markSeen(ids);
  }, [unseen, markSeen]);

  const mine = questions.filter((q) => q.askerId === me && q.id !== excludeId).sort((a, b) => b.time.localeCompare(a.time));
  const head = mine.slice(0, 4);
  const rest = mine.slice(4);
  return (
    <section className="staff-card" aria-labelledby="my-q">
      <header className="staff-card-head">
        <h2 id="my-q" className="scroll-mt-24">내 질문 내역</h2>
        <span className="text-caption text-text-muted">{mine.length}건</span>
      </header>
      <div className="staff-card-body">
        {mine.length === 0 ? (
          <Empty title="등록된 질문 없음" />
        ) : (
          <>
            <ul className="space-y-2">{head.map((q) => <Item key={q.id} q={q} now={now} fresh={fresh.has(q.id)} onCite={onCite} />)}</ul>
            {rest.length > 0 && (
              <details className="mt-2">
                <summary className="flex min-h-[44px] cursor-pointer items-center text-body text-ink hover:underline">이전 질문 {rest.length}개 더 보기</summary>
                <ul className="space-y-2">{rest.map((q) => <Item key={q.id} q={q} now={now} fresh={fresh.has(q.id)} onCite={onCite} />)}</ul>
              </details>
            )}
          </>
        )}
      </div>
    </section>
  );
}
