// 점장에게 넘어온 질문: '지금 바로'(30분 이내, 서버 now 기준)는 펼침, '오늘 안에'는 접힘.
// 답을 저장하면 만들어진 카드를 그 자리에서 보여 주고 '고치기'로 바로 다듬을 수 있어요
import { useState } from 'react';
import { CircleCheck, Pencil, Send } from 'lucide-react';
import type { Card, Person, Question } from '@shared/contracts';
import { api, type CardEdits } from '@/shared/api/client';
import { useAction } from '@/shared/lib/useAsync';
import { Button, CardBadges, CardEditForm, CiteText, Empty, InlineError, Panel, Tag } from '@/shared/ui';
import { agoLabel, minutesBetween } from '@/shared/lib/format';

const URGENT_MIN = 30;

export function QuestionsPanel({ storeId, questions, cards, people, managerId, now, onChanged }: {
  storeId: string;
  questions: Question[];
  cards: Card[];
  people: Person[];
  managerId: string;
  now: string;
  onChanged: () => void;
}) {
  const [created, setCreated] = useState<Question[]>([]);
  const esc = questions.filter((q) => q.status === 'escalated');
  const who = new Map(people.map((p) => [p.id, p]));
  const ago = (q: Question) => minutesBetween(now, q.time);
  const sorted = [...esc].sort((a, b) => b.time.localeCompare(a.time));
  const urgent = sorted.filter((q) => (ago(q) ?? Infinity) <= URGENT_MIN);
  const today = sorted.filter((q) => !urgent.includes(q));
  const item = (q: Question) => (
    <QuestionItem
      key={q.id}
      q={q}
      asker={who.get(q.askerId)}
      ago={agoLabel(ago(q))}
      storeId={storeId}
      managerId={managerId}
      onAnswered={(done) => { setCreated((c) => [done, ...c]); onChanged(); }}
    />
  );
  return (
    <Panel id="questions" title="넘어온 질문" en="ESCALATED" sub={`${esc.length}건 · 답을 쓰면 카드가 되어 매장 위키에 남아요`}>
      {created.length > 0 && (
        <ul className="mb-4 space-y-3" aria-label="방금 답한 질문">
          {created.map((q) => <CreatedCard key={q.id} q={q} card={cards.find((c) => c.id === q.cardId)} storeId={storeId} managerId={managerId} onChanged={onChanged} />)}
        </ul>
      )}
      {esc.length === 0 ? (
        <Empty title="넘어온 질문이 없어요" />
      ) : (
        <div className="space-y-3">
          <details open className="rounded-card border border-amber-bar">
            <summary className="flex min-h-[48px] cursor-pointer items-center gap-2 px-3 font-bold">
              지금 바로 <span className="num rounded-badge bg-yellow px-1.5 text-body">{urgent.length}</span>
              <span className="text-caption font-normal text-text-muted">30분 안에 들어온 질문이에요</span>
            </summary>
            <div className="p-3 pt-0">
              {urgent.length === 0 ? <p className="text-body text-text-muted">지금 바로 답할 질문은 없어요.</p> : <ul className="space-y-3">{urgent.map(item)}</ul>}
            </div>
          </details>
          {today.length > 0 && (
            <details className="rounded-card border border-line">
              <summary className="flex min-h-[48px] cursor-pointer items-center gap-2 px-3 font-bold">
                오늘 안에 <span className="num rounded-badge bg-surface-sunken px-1.5 text-body">{today.length}</span>
                <span className="text-caption font-normal text-text-muted">눌러서 펼쳐요</span>
              </summary>
              <ul className="space-y-3 p-3 pt-0">{today.map(item)}</ul>
            </details>
          )}
        </div>
      )}
    </Panel>
  );
}

function QuestionItem({ q, asker, ago, storeId, managerId, onAnswered }: {
  q: Question;
  asker?: Person;
  ago: string;
  storeId: string;
  managerId: string;
  onAnswered: (q: Question) => void;
}) {
  const [answer, setAnswer] = useState('');
  const act = useAction();
  const submit = async () => {
    if (!answer.trim()) return;
    const done = await act.run('resolve', () => api.resolve(storeId, q.id, answer.trim(), managerId));
    if (done) {
      setAnswer('');
      onAnswered(done);
    }
  };
  return (
    <li className="rounded-card border border-amber-bar bg-surface p-3">
      <div className="flex flex-wrap items-center gap-1.5 text-caption text-text-muted">
        <Tag tone="amber">점장 확인 필요</Tag>
        {asker ? `${asker.name}(${asker.role})` : q.askerId}
        {ago && <span className="num">· {ago}</span>}
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

/** 답을 저장한 직후 그 자리에서 보이는 새 카드. '고치기'는 카드 edit API(편집자 = 이 매장 점장) */
function CreatedCard({ q, card, storeId, managerId, onChanged }: { q: Question; card?: Card; storeId: string; managerId: string; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const act = useAction();
  const save = async (edits: CardEdits) => {
    if (!card) return;
    if (await act.run('edit', () => api.editCard(storeId, card.id, edits, managerId))) {
      setEditing(false);
      setSaved(true);
      onChanged();
    }
  };
  return (
    <li className="rounded-card border border-done bg-done-weak p-3">
      <p className="flex flex-wrap items-center gap-1.5 text-body font-bold text-done">
        <CircleCheck size={16} aria-hidden />
        답을 카드로 남겼어요{saved && <span className="font-normal"> · 고친 내용도 저장했어요</span>}
      </p>
      <p className="mt-0.5 text-caption text-text-muted">질문: {q.text}</p>
      <div className="mt-2 rounded-card border border-line bg-surface p-3">
        {!card ? (
          <p className="text-body text-text-muted">카드를 불러오는 중이에요.</p>
        ) : editing ? (
          <CardEditForm card={card} busy={act.busy === 'edit'} error={act.error} onSave={save} onCancel={() => setEditing(false)} />
        ) : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-section">{card.title}</p>
                <div className="mt-1"><CardBadges card={card} /></div>
              </div>
              <Button size="sm" icon={Pencil} onClick={() => setEditing(true)}>고치기</Button>
            </div>
            {card.actions.length > 0 && (
              <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-body">{card.actions.map((a, i) => <li key={i}>{a}</li>)}</ol>
            )}
            {card.reason && <p className="mt-2 text-body text-text-subtle"><span className="mr-1 font-bold text-text">왜</span>{card.reason}</p>}
            {card.customerNotice && <p className="bubble mt-2 inline-block px-3 py-1.5 text-body">“{card.customerNotice}”</p>}
          </>
        )}
      </div>
    </li>
  );
}
