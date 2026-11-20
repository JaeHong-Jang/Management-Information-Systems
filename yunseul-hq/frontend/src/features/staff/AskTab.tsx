import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Loader2, PhoneCall, Send, ThumbsDown, ThumbsUp } from 'lucide-react';
import type { Card, Question, Situation } from '@shared/contracts';
import { api } from '@/shared/api/client';
import { useStoreData } from '@/app/StoreData';
import { useAction } from '@/shared/lib/useAsync';
import { Button, CardDrawer, CiteChip, CiteText, InlineError, Tag } from '@/shared/ui';
import { ManagerCallText } from './ManagerCallText';
import { MyQuestions } from './MyQuestions';

const CONF = { high: '근거 충분', low: '근거 약함', none: '근거 없음' } as const;

/** 손님께 할 말 말풍선 */
function Say({ text, label = '고객 안내 예시' }: { text: string; label?: string }) {
  return (
    <div>
      <p className="text-caption font-bold text-text-subtle">{label}</p>
      <p className="bubble mt-1 px-5 py-3.5 text-mobile font-medium text-ink">“{text}”</p>
    </div>
  );
}

function Steps({ label, actions }: { label: string; actions: string[] }) {
  if (actions.length === 0) return null;
  return (
    <div className="mt-4">
      <p className="text-caption font-bold text-text-subtle">{label}</p>
      <ol className="mt-1 list-decimal space-y-1 pl-5 text-mobile">{actions.map((a, i) => <li key={i}>{a}</li>)}</ol>
    </div>
  );
}

function Answer({ q, cardMap, storeId, onCite, onUpdate }: {
  q: Question;
  cardMap: Map<string, Card>;
  storeId: string;
  onCite: (id: string) => void;
  onUpdate: (q: Question) => void;
}) {
  const act = useAction();
  const escalated = q.status === 'escalated';
  const top = cardMap.get(q.cited[0] ?? '');
  const near = escalated ? cardMap.get(q.nearCardId ?? '') : undefined;
  const fb = async (solved: boolean) => {
    const n = await act.run(solved ? 'yes' : 'no', () => api.feedback(storeId, q.id, solved));
    if (n) onUpdate(n);
  };
  const more = top
    ? [
        ...(top.actions.length > 2 ? [{ l: '후속 절차', v: <ol start={3} className="list-decimal pl-5">{top.actions.slice(2).map((a, i) => <li key={i}>{a}</li>)}</ol> }] : []),
        ...((q.why || top.reason) ? [{ l: '판단 근거', v: q.why || top.reason }] : []),
        ...(top.avoid ? [{ l: '유의 사항', v: top.avoid }] : []),
        ...(top.escalateWhen ? [{ l: '점장 호출 기준', v: top.escalateWhen }] : []),
      ]
    : q.why ? [{ l: '판단 근거', v: q.why }] : [];

  return (
    <div className="animate-rise rounded-card border border-line bg-surface p-4 shadow-card">
      <p className="text-caption text-text-muted">접수한 질문</p>
      <p className="font-bold">{q.text}</p>

      {escalated ? (
        <div className="mt-3">
          <p className="rounded-ctl border border-amber-bar bg-amber-weak p-3 text-mobile text-amber-text">
            <PhoneCall size={16} className="mr-1.5 inline align-[-2px]" aria-hidden />
            <ManagerCallText text={q.answer} onCite={onCite} />
          </p>
          {near && (
            <div className="mt-4">
              <p className="mb-2 font-display text-section text-ink">현장 대응 절차</p>
              {near.customerNotice && <Say text={near.customerNotice} />}
              <Steps label="대응 순서" actions={near.actions.slice(0, 2)} />
              <p className="mt-3 flex flex-wrap items-center gap-1 text-caption text-text-muted">
                유사 사례 카드
                <CiteChip id={near.id} onOpen={onCite} title={near.title} />
              </p>
            </div>
          )}
        </div>
      ) : top ? (
        <div className="mt-3">
          {top.customerNotice && <Say text={top.customerNotice} />}
          <Steps label="대응 순서" actions={top.actions.slice(0, 2)} />
          {top.actions.length === 0 && q.answer && <p className="mt-3 whitespace-pre-line text-mobile"><CiteText text={q.answer} onOpen={onCite} /></p>}
          {more.length > 0 && (
            <details className="mt-3 rounded-ctl bg-surface-sunken px-3">
              <summary className="flex min-h-[44px] cursor-pointer items-center text-body font-bold text-ink">세부 절차 및 판단 근거</summary>
              <dl className="space-y-2 pb-3 text-body">
                {more.map((m) => (
                  <div key={m.l}>
                    <dt className="text-caption font-bold text-text-subtle">{m.l}</dt>
                    <dd>{m.v}</dd>
                  </div>
                ))}
              </dl>
            </details>
          )}
        </div>
      ) : (
        <p className="mt-3 whitespace-pre-line text-mobile"><CiteText text={q.answer} onOpen={onCite} /></p>
      )}

      {!escalated && q.cited.length > 0 && (
        <p className="mt-3 flex flex-wrap items-center gap-1.5 text-caption text-text-muted">
          <Tag tone={q.confidence === 'high' ? 'done' : q.confidence === 'low' ? 'amber' : 'neutral'}>{CONF[q.confidence]}</Tag>
          근거 카드
          {q.cited.map((id) => <CiteChip key={id} id={id} onOpen={onCite} title={cardMap.get(id)?.title} />)}
        </p>
      )}

      {!escalated && (
        <div className="mt-3">
          {q.feedback ? (
            <p className="text-caption text-text-muted">{q.feedback === 'solved' ? '처리 결과 · 해결' : '처리 결과 · 미해결, 점장 확인 요청'}</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Button size="lg" icon={ThumbsUp} busy={act.busy === 'yes'} onClick={() => fb(true)}>해결 완료</Button>
              <Button size="lg" icon={ThumbsDown} busy={act.busy === 'no'} onClick={() => fb(false)}>미해결 · 점장 요청</Button>
            </div>
          )}
          <InlineError message={act.error} />
        </div>
      )}
    </div>
  );
}

export function AskTab({ storeId, me, cards, situations, questions, now, initialText = '' }: {
  storeId: string;
  me: string;
  cards: Card[];
  situations: Situation[];
  questions: Question[];
  now: string;
  initialText?: string;
}) {
  const [text, setText] = useState(initialText);
  const [latest, setLatest] = useState<Question | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const act = useAction();
  const { state } = useStoreData();
  const cardMap = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);
  const answerRef = useRef<HTMLDivElement>(null);
  const busy = act.busy === 'ask';

  const ask = async (t: string, situationId?: string) => {
    const body = t.trim();
    if (!body || !me || busy) return;
    const r = await act.run('ask', () => api.ask(storeId, body, me, situationId));
    if (r) {
      setLatest(r.question);
      if (!situationId) setText('');
      void state.reload();
    }
  };
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // 한글 조합 중 Enter는 글자 확정이라 보내지 않는다
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void ask(text);
    }
  };

  // 답이 오면 맨 위가 상단바 아래에 오도록 스크롤(하단 탭에 가리지 않게 scroll-margin)
  useEffect(() => {
    if (!latest) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    answerRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }, [latest?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section id="ask" className="scroll-mt-24">
      <section className="staff-card" aria-labelledby="ask-form-title">
        <header className="staff-card-head"><h2 id="ask-form-title">질문 접수</h2></header>
        <div className="staff-card-body">
          <form onSubmit={(e) => { e.preventDefault(); void ask(text); }}>
            <label htmlFor="staff-question" className="mb-1 block text-body font-semibold">질문 내용</label>
            <textarea id="staff-question" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onKey} rows={3}
                placeholder="근무 상황과 확인할 내용을 입력"
                className="w-full rounded-ctl border border-line-strong bg-surface p-3 text-body" />
            <div className="staff-form-footer">
              <p className="text-caption text-text-muted">Enter 전송 · Shift+Enter 줄바꿈</p>
              <Button type="submit" variant="primary" icon={Send} busy={busy} disabled={!text.trim() || !me}>질문 등록</Button>
            </div>
          </form>
          {situations.length > 0 && (
            <details className="mt-4 border-t border-line pt-2">
              <summary className="cursor-pointer py-1 text-body font-semibold">자주 묻는 상황으로 바로 질문</summary>
              <div className="staff-suggestions" role="group" aria-label="선택한 상황으로 질문 등록">
                {situations.slice(0, 5).map((st) => (
                  <button key={st.id} type="button" disabled={busy || !me} onClick={() => void ask(st.title, st.id)}>
                    {st.title}
                  </button>
                ))}
              </div>
            </details>
          )}
        </div>
      </section>
      {busy && (
        <p className="mt-3 flex min-h-[44px] items-center gap-2 rounded-ctl bg-surface-sunken px-3 text-body text-text-subtle" role="status" aria-live="polite">
          <Loader2 size={16} className="shrink-0 animate-spin text-ink" aria-hidden />
          답변 조회 중
        </p>
      )}
      <InlineError message={act.error} />

      {latest && (
        <div ref={answerRef} className="mt-5 scroll-mb-[88px] scroll-mt-[112px]">
          <Answer key={latest.id} q={latest} cardMap={cardMap} storeId={storeId} onCite={setOpen} onUpdate={(q) => { setLatest(q); void state.reload(); }} />
        </div>
      )}

      <div className="mt-4">
        <MyQuestions questions={questions} now={now} excludeId={latest?.id ?? null} onCite={setOpen} />
      </div>
      <CardDrawer cardId={open} card={open ? cardMap.get(open) : null} onClose={() => setOpen(null)} />
    </section>
  );
}
