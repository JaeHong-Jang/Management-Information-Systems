// 점장에게 넘어온 질문: 답을 쓰면 카드 초안이 되어 위키로 들어가요
import { useState } from 'react';
import { Send } from 'lucide-react';
import type { Person, Question } from '@shared/contracts';
import { api } from '@/shared/api/client';
import { useAction } from '@/shared/lib/useAsync';
import { Button, CiteText, Empty, InlineError, Panel, Tag } from '@/shared/ui';
import { dateTime } from '@/shared/lib/format';

export function QuestionsPanel({ storeId, questions, people, managerId, onChanged }: {
  storeId: string;
  questions: Question[];
  people: Person[];
  managerId: string;
  onChanged: () => void;
}) {
  const esc = questions.filter((q) => q.status === 'escalated');
  const who = new Map(people.map((p) => [p.id, p]));
  return (
    <Panel id="questions" title="넘어온 질문" en="ESCALATED" sub={`${esc.length}건 · 카드로 답하지 못한 질문이에요`}>
      {esc.length === 0 ? (
        <Empty title="넘어온 질문이 없어요" />
      ) : (
        <ul className="space-y-3">
          {esc.map((q) => (
            <QuestionItem key={q.id} q={q} asker={who.get(q.askerId)} storeId={storeId} managerId={managerId} onChanged={onChanged} />
          ))}
        </ul>
      )}
    </Panel>
  );
}

function QuestionItem({ q, asker, storeId, managerId, onChanged }: { q: Question; asker?: Person; storeId: string; managerId: string; onChanged: () => void }) {
  const [answer, setAnswer] = useState('');
  const act = useAction();
  const submit = async () => {
    if (!answer.trim()) return;
    if (await act.run('resolve', () => api.resolve(storeId, q.id, answer.trim(), managerId))) {
      setAnswer('');
      onChanged();
    }
  };
  return (
    <li className="rounded-card border border-amber-bar bg-surface p-3">
      <div className="flex flex-wrap items-center gap-1.5 text-caption text-text-muted">
        <Tag tone="amber">점장 확인 필요</Tag>
        {asker ? `${asker.name}(${asker.role})` : q.askerId} · {dateTime(q.time)}
      </div>
      <p className="mt-1 font-bold">{q.text}</p>
      {q.answer && <p className="mt-1 text-caption text-text-subtle">카드에서 찾은 답: <CiteText text={q.answer} /></p>}
      <label className="mt-2 block">
        <span className="sr-only">점장 답</span>
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          rows={3}
          placeholder="어떻게 하면 되는지, 왜 그렇게 하는지 함께 적어 주세요"
          className="w-full rounded-ctl border border-line-strong p-3 text-body"
        />
      </label>
      <div className="mt-1 flex justify-end">
        <Button variant="primary" icon={Send} busy={act.busy === 'resolve'} disabled={!answer.trim()} onClick={submit}>답하고 카드로 남기기</Button>
      </div>
      <InlineError message={act.error} />
    </li>
  );
}
