// 물어보기: 상황 버튼(한 줄 가로 스크롤, 누르면 바로 보냄) → 입력창 + 바로 아래 보내기 → 답 → 내 질문.
// 답: 손님께 이렇게 말하세요(말풍선) → 이렇게 해요 2줄 → 더 보기 → 근거 카드 칩(맨 끝 한 번).
// 직원 화면이라 runId·에이전트 수·진행 단계는 보이지 않는다.
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Loader2, PhoneCall, Send, ThumbsDown, ThumbsUp } from 'lucide-react';
import type { Card, Question, Situation } from '@shared/contracts';
import { api } from '@/shared/api/client';
import { useStoreData } from '@/app/StoreData';
import { useAction } from '@/shared/lib/useAsync';
import { Button, CardDrawer, CiteChip, CiteText, InlineError, Tag } from '@/shared/ui';
import { MyQuestions } from './MyQuestions';

const CONF = { high: '근거 충분', low: '근거 약함', none: '근거 없음' } as const;
const CALL = '점장님을 직접 불러 주세요';

/** 손님께 할 말 말풍선 */
function Say({ text, label = '손님께 이렇게 말하세요' }: { text: string; label?: string }) {
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

/** 점장 호출 문구 속 '점장님을 직접 불러 주세요'만 굵게 */
function Emphasized({ text, onCite }: { text: string; onCite: (id: string) => void }) {
  const i = text.indexOf(CALL);
  if (i < 0) return <CiteText text={text} onOpen={onCite} />;
  return (
    <>
      <CiteText text={text.slice(0, i)} onOpen={onCite} />
      <b className="text-ink">{CALL}</b>
      <CiteText text={text.slice(i + CALL.length)} onOpen={onCite} />
    </>
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
        ...(top.actions.length > 2 ? [{ l: '이어서 해요', v: <ol start={3} className="list-decimal pl-5">{top.actions.slice(2).map((a, i) => <li key={i}>{a}</li>)}</ol> }] : []),
        ...((q.why || top.reason) ? [{ l: '왜 그렇게 해요', v: q.why || top.reason }] : []),
        ...(top.avoid ? [{ l: '하지 말 것', v: top.avoid }] : []),
        ...(top.escalateWhen ? [{ l: '이럴 땐 점장님 부르기', v: top.escalateWhen }] : []),
      ]
    : q.why ? [{ l: '왜 그렇게 해요', v: q.why }] : [];

  return (
    <div className="animate-rise rounded-card border border-line bg-surface p-4 shadow-card">
      <p className="text-caption text-text-muted">내가 물어본 것</p>
      <p className="font-bold">{q.text}</p>

      {escalated ? (
        <div className="mt-3">
          <p className="rounded-ctl border border-amber-bar bg-amber-weak p-3 text-mobile text-amber-text">
            <PhoneCall size={16} className="mr-1.5 inline align-[-2px]" aria-hidden />
            <Emphasized text={q.answer || `${CALL}.`} onCite={onCite} />
          </p>
          {near && (
            <div className="mt-4">
              <p className="mb-2 font-display text-section text-ink">지금 할 수 있는 것</p>
              {near.customerNotice && <Say text={near.customerNotice} />}
              <Steps label="이렇게 해요" actions={near.actions.slice(0, 2)} />
              <p className="mt-3 flex flex-wrap items-center gap-1 text-caption text-text-muted">
                가장 가까운 카드
                <CiteChip id={near.id} onOpen={onCite} title={near.title} />
              </p>
            </div>
          )}
        </div>
      ) : top ? (
        <div className="mt-3">
          {top.customerNotice && <Say text={top.customerNotice} />}
          <Steps label="이렇게 해요" actions={top.actions.slice(0, 2)} />
          {top.actions.length === 0 && q.answer && <p className="mt-3 whitespace-pre-line text-mobile"><CiteText text={q.answer} onOpen={onCite} /></p>}
          {more.length > 0 && (
            <details className="mt-3 rounded-ctl bg-surface-sunken px-3">
              <summary className="flex min-h-[44px] cursor-pointer items-center text-body font-bold text-ink">더 보기</summary>
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
            <p className="text-caption text-text-muted">{q.feedback === 'solved' ? '도움이 됐다고 남겼어요' : '해결 안 됐다고 남겼어요. 점장님께 넘어가요'}</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Button size="lg" icon={ThumbsUp} busy={act.busy === 'yes'} onClick={() => fb(true)}>해결됐어요</Button>
              <Button size="lg" icon={ThumbsDown} busy={act.busy === 'no'} onClick={() => fb(false)}>아직이에요</Button>
            </div>
          )}
          <InlineError message={act.error} />
        </div>
      )}
    </div>
  );
}

export function AskTab({ storeId, me, cards, situations, questions, now }: {
  storeId: string;
  me: string;
  cards: Card[];
  situations: Situation[];
  questions: Question[];
  now: string;
}) {
  const [text, setText] = useState('');
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
      <h1 className="font-display text-display text-ink">
        지금 <span className="hl-line">막혔어요</span>
      </h1>
      {situations.length > 0 && (
        <div className="mt-3" role="group" aria-label="자주 터지는 상황. 누르면 바로 물어봐요">
          <p className="mb-1.5 text-caption text-text-muted">자주 터지는 상황 · 누르면 바로 물어봐요</p>
          <div className="-mx-[var(--gutter)] flex snap-x gap-2 overflow-x-auto px-[var(--gutter)] pb-2 md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
            {situations.slice(0, 5).map((st) => (
              <button
                key={st.id}
                type="button"
                disabled={busy || !me}
                onClick={() => void ask(st.title, st.id)}
                className="min-h-[48px] shrink-0 snap-start whitespace-nowrap rounded-badge border border-line-strong bg-surface px-4 text-body font-medium text-ink hover:bg-ink-weak disabled:opacity-50"
              >
                {st.title}
              </button>
            ))}
          </div>
        </div>
      )}
      <form onSubmit={(e) => { e.preventDefault(); void ask(text); }} className="mt-1">
        <label className="block">
          <span className="sr-only">질문</span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKey}
            rows={3}
            placeholder="막힌 상황을 적어 주세요. 예: 두 명인데 4인석 앉혀도 돼요?"
            className="w-full rounded-card border border-line-strong bg-surface p-3 text-mobile"
          />
        </label>
        <p className="mt-1 text-caption text-text-muted">Enter로 보내고, Shift+Enter로 줄을 바꿔요.</p>
        <Button type="submit" variant="primary" size="lg" icon={Send} busy={busy} disabled={!text.trim() || !me} className="mt-2 w-full">
          보내기
        </Button>
      </form>
      {busy && (
        <p className="mt-3 flex min-h-[44px] items-center gap-2 rounded-ctl bg-surface-sunken px-3 text-body text-text-subtle" role="status" aria-live="polite">
          <Loader2 size={16} className="shrink-0 animate-spin text-ink" aria-hidden />
          답을 찾고 있어요
        </p>
      )}
      <InlineError message={act.error} />

      {latest && (
        <div ref={answerRef} className="mt-5 scroll-mb-[88px] scroll-mt-[112px]">
          <Answer key={latest.id} q={latest} cardMap={cardMap} storeId={storeId} onCite={setOpen} onUpdate={(q) => { setLatest(q); void state.reload(); }} />
        </div>
      )}

      <div className="mt-8">
        <MyQuestions questions={questions} now={now} excludeId={latest?.id ?? null} onCite={setOpen} />
      </div>
      <CardDrawer cardId={open} card={open ? cardMap.get(open) : null} onClose={() => setOpen(null)} />
    </section>
  );
}
