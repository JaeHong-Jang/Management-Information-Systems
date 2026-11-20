import { useState } from 'react';
import { CircleCheck, Pencil, Send } from 'lucide-react';
import type { Card, Person, Question } from '@shared/contracts';
import { api, type CardEdits } from '@/shared/api/client';
import { useAction } from '@/shared/lib/useAsync';
import { Button, CardBadges, CardEditForm, CiteText, Empty, InlineError, Panel } from '@/shared/ui';
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
    <Panel id="questions" title="직원 질문 접수" sub={`${esc.length}건 대기 · 점장 답변은 매장 위키에 카드로 등록`}>
      {created.length > 0 && (
        <ul className="mb-4 space-y-3" aria-label="답변 등록 내역">
          {created.map((q) => <CreatedCard key={q.id} q={q} card={cards.find((c) => c.id === q.cardId)} storeId={storeId} managerId={managerId} onChanged={onChanged} />)}
        </ul>
      )}
      {esc.length === 0 ? (
        <Empty title="미답변 질문 없음" />
      ) : (
        <div className="space-y-3">
          <details open className="rounded-card border border-amber-bar">
            <summary className="flex min-h-[48px] cursor-pointer items-center gap-2 px-3 font-bold">
              최근 접수 <span className="num rounded-badge bg-yellow px-1.5 text-body">{urgent.length}</span>
              <span className="text-caption font-normal text-text-muted">최근 30분 이내</span>
            </summary>
            <div className="p-3 pt-0">
              {urgent.length === 0 ? <p className="text-body text-text-muted">최근 30분 내 접수 없음</p> : <ul className="space-y-3">{urgent.map(item)}</ul>}
            </div>
          </details>
          {today.length > 0 && (
            <details open={urgent.length === 0} className="rounded-card border border-line">
              <summary className="flex min-h-[48px] cursor-pointer items-center gap-2 px-3 font-bold">
                이전 접수 <span className="num rounded-badge bg-surface-sunken px-1.5 text-body">{today.length}</span>
                <span className="text-caption font-normal text-text-muted">접수 후 30분 경과</span>
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
    <li className="rounded-card border-l-2 border-line-strong bg-surface-sunken p-3">
      <div className="flex flex-wrap items-center gap-1.5 text-caption text-text-muted">

        {asker ? `${asker.name}(${asker.role})` : q.askerId}
        {ago && <span className="num">· {ago}</span>}
      </div>
      <p className="mt-1 font-bold">{q.text}</p>
      {q.answer && <p className="mt-1 text-caption text-text-subtle">관련 카드 답변 · <CiteText text={q.answer} /></p>}
      <label className="mt-2 block">
        <span className="mb-1 block text-caption font-bold text-text-subtle">점장 답변</span>
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          rows={3}
          placeholder="조치 절차 및 판단 근거"
          className="w-full rounded-ctl border border-line-strong p-3 text-body"
        />
      </label>
      <div className="mt-1 flex justify-end">
        <Button variant="primary" icon={Send} busy={act.busy === 'resolve'} disabled={!answer.trim() || !managerId} onClick={submit}>답변 등록 및 카드 저장</Button>
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
        답변 카드 등록 완료{saved && <span className="font-normal"> · 수정 사항 저장 완료</span>}
      </p>
      <p className="mt-0.5 text-caption text-text-muted">질문 · {q.text}</p>
      <div className="mt-2 rounded-card border border-line bg-surface p-3">
        {!card ? (
          <p className="text-body text-text-muted">카드 조회 중</p>
        ) : editing ? (
          <CardEditForm card={card} busy={act.busy === 'edit'} error={act.error} onSave={save} onCancel={() => setEditing(false)} />
        ) : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-section">{card.title}</p>
                <div className="mt-1"><CardBadges card={card} /></div>
              </div>
              <Button size="sm" icon={Pencil} onClick={() => setEditing(true)}>카드 수정</Button>
            </div>
            {card.actions.length > 0 && (
              <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-body">{card.actions.map((a, i) => <li key={i}>{a}</li>)}</ol>
            )}
            {card.reason && <p className="mt-2 text-body text-text-subtle"><span className="mr-1 font-bold text-text">판단 근거</span>{card.reason}</p>}
            {card.customerNotice && <p className="bubble mt-2 inline-block px-3 py-1.5 text-body">“{card.customerNotice}”</p>}
          </>
        )}
      </div>
    </li>
  );
}
