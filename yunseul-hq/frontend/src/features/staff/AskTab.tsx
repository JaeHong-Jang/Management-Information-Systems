// 물어보기: 답 + 근거 카드 칩([C015] 누르면 카드 서랍, 닫으면 누른 칩으로 돌아감 — 관광공사 useEvidenceDrawer)
// + 에이전트 한 줄 진행(관광공사 agent-work-line): 답을 기다리는 동안 지금 일하는 에이전트와 'N초 경과', 끝나면 한 줄로 접힌다.
import { useMemo, useState } from 'react';
import { CircleCheck, Clock, Loader2, Send, ThumbsDown, ThumbsUp } from 'lucide-react';
import type { AskResult, Card, Question, Situation } from '@shared/contracts';
import { api } from '@/shared/api/client';
import { useAgentNames } from '@/shared/api/harness';
import { useLive, type RunView } from '@/shared/api/live';
import { useAction } from '@/shared/lib/useAsync';
import { elapsedSec, useNow } from '@/shared/lib/useNow';
import { Button, CardDrawer, CiteChip, CiteText, InlineError, RunProgress, Tag } from '@/shared/ui';

const CONF = { high: '근거 충분', low: '근거 약함', none: '근거 없음' } as const;

/** 답을 기다리는 동안: 이 매장의 '질문' 실행 중 클릭 뒤에 시작된 것 */
function useAskRun(storeId: string, since: number | null): RunView | null {
  const { runs } = useLive();
  if (since == null) return null;
  return runs.find((r) => r.flow === 'ask' && r.storeId === storeId && Date.parse(r.at) >= since - 5000) ?? null;
}

function WaitingLine({ run, names }: { run: RunView | null; names: Record<string, string> }) {
  const now = useNow(!!run?.runningSince);
  const sec = elapsedSec(run?.runningSince, now);
  return (
    <p className="mt-3 flex min-h-[44px] items-center gap-2 rounded-ctl bg-surface-sunken px-3 text-body text-text-subtle" role="status" aria-live="polite">
      <Loader2 size={16} className="shrink-0 animate-spin text-ink" aria-hidden />
      {run?.running ? (
        <>
          <b className="text-text">{names[run.running] ?? run.running}</b> 일하는 중
          {sec != null && <span className="num text-text-muted">· {sec}초 경과</span>}
        </>
      ) : run ? (
        `답변팀이 다음 단계로 넘기는 중이에요 · ${run.steps.length}단계 끝`
      ) : (
        '답변팀에 질문을 넘겼어요'
      )}
    </p>
  );
}

export function AskTab({ storeId, me, cards, situations }: { storeId: string; me: string; cards: Card[]; situations: Situation[] }) {
  const [text, setText] = useState('');
  const [history, setHistory] = useState<AskResult[]>([]);
  const [since, setSince] = useState<number | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const act = useAction();
  const names = useAgentNames();
  const cardMap = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);
  const waiting = useAskRun(storeId, act.busy === 'ask' ? since : null);

  const ask = async () => {
    const t = text.trim();
    if (!t || !me) return;
    setSince(Date.now());
    const r = await act.run('ask', () => api.ask(storeId, t, me));
    if (r) {
      setHistory((h) => [r, ...h]);
      setText('');
    }
  };
  const update = (q: Question) => setHistory((h) => h.map((r) => (r.question.id === q.id ? { ...r, question: q } : r)));

  return (
    <section>
      <h1 className="font-display text-display text-ink">
        지금 <span className="hl-line">막혔어요</span>
      </h1>
      <p className="mb-3 mt-1 text-body text-text-subtle">막히는 상황을 적어 주세요. 매장 카드와 본사 표준에서 근거를 찾아 답해요.</p>
      <form onSubmit={(e) => { e.preventDefault(); void ask(); }}>
        <label className="block">
          <span className="sr-only">질문</span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            placeholder="예: 두 명인데 4인석 앉혀도 돼요?"
            className="w-full rounded-card border border-line-strong bg-surface p-3 text-mobile"
          />
        </label>
        {situations.length > 0 && (
          <div className="mt-2" role="group" aria-label="자주 터지는 상황">
            <p className="mb-1 text-caption text-text-muted">이 매장에서 자주 터지는 상황</p>
            <div className="flex flex-wrap gap-1.5">
              {situations.slice(0, 5).map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setText(st.title)}
                  className="min-h-[44px] rounded-badge border border-line-strong bg-surface px-3 text-body text-ink hover:bg-ink-weak"
                >
                  {st.title}
                </button>
              ))}
            </div>
          </div>
        )}
        <Button type="submit" variant="primary" size="lg" icon={Send} busy={act.busy === 'ask'} disabled={!text.trim() || !me} className="mt-2 w-full">
          물어보기
        </Button>
      </form>
      {act.busy === 'ask' && <WaitingLine run={waiting} names={names} />}
      <InlineError message={act.error} />

      <ul className="mt-5 space-y-4">
        {history.map((r) => (
          <AnswerItem key={r.question.id} r={r} storeId={storeId} cardMap={cardMap} names={names} activeCard={open} onCite={(id) => setOpen(id)} onUpdate={update} />
        ))}
      </ul>
      <CardDrawer cardId={open} card={open ? cardMap.get(open) : null} onClose={() => setOpen(null)} />
    </section>
  );
}

function AnswerItem({ r, storeId, cardMap, names, activeCard, onCite, onUpdate }: {
  r: AskResult;
  storeId: string;
  cardMap: Map<string, Card>;
  names: Record<string, string>;
  activeCard: string | null;
  onCite: (id: string) => void;
  onUpdate: (q: Question) => void;
}) {
  const q = r.question;
  const act = useAction();
  const { runs } = useLive();
  const run = runs.find((x) => x.runId === r.runId) ?? null;
  const fb = async (solved: boolean) => {
    const n = await act.run(solved ? 'yes' : 'no', () => api.feedback(storeId, q.id, solved));
    if (n) onUpdate(n);
  };
  return (
    <li className="animate-rise rounded-card border border-line bg-surface p-4 shadow-card">
      <p className="text-caption text-text-muted">내 질문</p>
      <p className="font-bold">{q.text}</p>

      {q.status === 'escalated' && (
        <p className="mt-3 flex items-start gap-2 rounded-ctl border border-amber-bar bg-amber-weak p-3 text-mobile text-amber-text">
          <Clock size={18} className="mt-0.5 shrink-0" aria-hidden />
          근거 카드가 없어서 점장님께 넘겼어요. 답이 오면 카드로 남아요.
        </p>
      )}
      {q.answer && (
        <p className="mt-3 whitespace-pre-line text-mobile leading-relaxed">
          <CiteText text={q.answer} onOpen={onCite} activeId={activeCard} />
        </p>
      )}
      {q.why && (
        <p className="mt-2 text-body text-text-subtle">
          <span className="mr-1 font-bold text-text">왜</span>
          {q.why}
        </p>
      )}
      {q.managerAnswer && (
        <p className="mt-2 flex items-start gap-1.5 text-body"><CircleCheck size={15} className="mt-0.5 shrink-0 text-done" aria-hidden />점장 답: {q.managerAnswer}</p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Tag tone={q.confidence === 'high' ? 'done' : q.confidence === 'low' ? 'amber' : 'neutral'}>{CONF[q.confidence]}</Tag>
        {q.cited.length > 0 && <span className="text-caption text-text-muted">근거 카드</span>}
        {q.cited.map((id) => (
          <CiteChip key={id} id={id} onOpen={onCite} active={activeCard === id} title={cardMap.get(id)?.title} />
        ))}
      </div>

      {/* 에이전트 한 줄: 끝난 실행이라 접혀 있다. 펼치면 단계와 게이트 */}
      <div className="mt-3 border-t border-line pt-2">
        {run ? <RunProgress run={run} names={names} /> : <p className="num dev text-caption text-text-muted">실행 {r.runId}</p>}
      </div>

      {q.status !== 'escalated' && (
        <div className="mt-3">
          {q.feedback ? (
            <p className="text-caption text-text-muted">{q.feedback === 'solved' ? '도움이 됐다고 남겼어요' : '해결 안 됐다고 남겼어요. 점장님께 전달돼요'}</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Button size="lg" icon={ThumbsUp} busy={act.busy === 'yes'} onClick={() => fb(true)}>해결됐어요</Button>
              <Button size="lg" icon={ThumbsDown} busy={act.busy === 'no'} onClick={() => fb(false)}>아직이에요</Button>
            </div>
          )}
          <InlineError message={act.error} />
        </div>
      )}
    </li>
  );
}
