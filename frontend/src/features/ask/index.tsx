import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Loader2, Minus, X } from 'lucide-react';
import type { AskResult, Card, HarnessConfig, Person, Question } from '@shared/contracts';
import { api } from '@/shared/api/client';
import { useLive, type RunView } from '@/shared/api/live';
import { Badge, Button, CardDetail, CiteText, Empty, Panel, Sheet, cx, sourceTone, inputCls, useToast, fmtTime } from '@/shared/ui';

const EXAMPLES = ['오트 우유가 품절이에요', '기프티콘이 사용완료로 떠요', '결제됐는데 주문이 없어요', '영수증 없이 환불해 달라고 해요', '알리페이로 결제하고 싶대요'];

const confTone = { high: 'success', low: 'warning' } as const;
const confText = { high: '근거 카드와 잘 맞아요', low: '비슷한 사례예요. 상황이 같은지 확인하세요' } as const;

function statusBadge(q: Question) {
  if (q.status === 'answered') return <Badge tone="brand">위키가 답함</Badge>;
  if (q.status === 'escalated') return <Badge tone="warning">점장 대기</Badge>;
  return <Badge tone="success">점장이 답함</Badge>;
}

function Progress({ run, names }: { run: RunView | undefined; names: Record<string, string> }) {
  return (
    <Panel title="에이전트 팀이 확인하고 있어요">
      {!run || (run.steps.length === 0 && !run.running) ? (
        <p className="text-[14px] text-ink-weak">팀을 모으는 중이에요</p>
      ) : (
        <ul className="space-y-2">
          {run.steps.map((s, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className={cx('mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full', s.status === 'ok' ? 'bg-success-weak text-success' : s.status === 'skipped' ? 'bg-surface-subtle text-ink-weak' : 'bg-danger-weak text-danger')}>
                {s.status === 'ok' ? <Check size={12} /> : s.status === 'skipped' ? <Minus size={12} /> : <X size={12} />}
              </span>
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-ink-strong">{names[s.agentId] ?? s.agentId}</p>
                <p className="text-[13px] text-ink-body">{s.summary}</p>
              </div>
            </li>
          ))}
          {run.running && (
            <li className="flex items-center gap-2.5">
              <span className="flex h-5 w-5 items-center justify-center text-brand">
                <Loader2 size={16} className="animate-spin" />
              </span>
              <p className="text-[14px] font-semibold text-ink-strong">{names[run.running] ?? run.running}</p>
            </li>
          )}
        </ul>
      )}
    </Panel>
  );
}

function AnswerCard({ q, cards, people, today, onCite, onFeedback }: { q: Question; cards: Card[]; people: Person[]; today: string; onCite: (id: string) => void; onFeedback?: (solved: boolean) => void }) {
  const [whyOpen, setWhyOpen] = useState(false);
  const manager = people.find((p) => p.role === '점장');
  const evidence = q.cited.map((id) => cards.find((c) => c.id === id)).filter((c): c is Card => !!c);
  const hasCallRule = q.answer.includes('점장 호출 기준');
  const conf = q.confidence === 'none' ? null : q.confidence;
  return (
    <Panel>
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {statusBadge(q)}
        {conf && <Badge tone={confTone[conf]}>{confText[conf]}</Badge>}
      </div>
      <p className="mb-2 text-[13px] text-ink-weak">{q.text}</p>

      {q.status === 'escalated' && (
        <div className="mb-3 rounded-xl bg-warning-weak p-4 text-[14px] text-ink-strong">
          <p className="font-semibold">이건 점장님이 직접 봐 주셔야 해요.</p>
          <p className="mt-1 text-ink-body">담당자: {manager ? `${manager.name} 점장` : '점장'} · {fmtTime(q.time)}에 물어봤고 점장 확인 중이에요.</p>
          <p className="mt-2 font-semibold">기다리는 동안</p>
          <p className="text-ink-body">손님께 확인 중이라고 말하고, 결제·환불은 점장 답이 오기 전에 진행하지 마세요.</p>
        </div>
      )}

      <p className="mb-1 text-[13px] font-semibold text-ink-body">지금 할 일</p>
      {hasCallRule ? (
        <div className="rounded-xl bg-warning-weak p-4 text-[15px] leading-6 text-ink-strong">
          <CiteText text={q.answer} onCite={onCite} />
        </div>
      ) : (
        <div className="text-[15px] leading-6 text-ink-strong">
          <CiteText text={q.answer} onCite={onCite} />
        </div>
      )}

      {q.status === 'resolved' && q.managerAnswer && (
        <div className="mt-3 rounded-xl bg-success-weak p-4 text-[14px]">
          <p className="mb-1 font-semibold text-success">점장님이 답했어요</p>
          <p className="text-ink-strong">{q.managerAnswer}</p>
          {q.cardId && <button onClick={() => onCite(q.cardId!)} className="mt-2 text-[13px] font-semibold text-brand-strong">위키 카드 {q.cardId} 보기</button>}
        </div>
      )}

      {q.why && (
        <div className="mt-4">
          <button onClick={() => setWhyOpen((o) => !o)} aria-expanded={whyOpen} className="flex w-full items-center justify-between rounded-xl bg-surface-subtle px-4 py-3 text-left text-[14px] font-semibold text-ink-body">
            왜 이렇게 하나요
            <ChevronDown size={16} className={cx('transition-transform', whyOpen && 'rotate-180')} />
          </button>
          {whyOpen && <p className="rounded-b-xl bg-surface-subtle px-4 pb-4 text-[14px] text-ink-strong">{q.why}</p>}
        </div>
      )}

      {evidence.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-[13px] font-semibold text-ink-body">근거 카드</p>
          <ul className="space-y-2">
            {evidence.map((c) => (
              <li key={c.id}>
                <button onClick={() => onCite(c.id)} className="w-full rounded-xl border border-line p-3 text-left hover:bg-surface-subtle">
                  <p className="text-[14px] font-semibold text-ink-strong">{c.title}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <Badge tone={sourceTone(c.source)}>{c.source}</Badge>
                    <span className="text-[12px] text-ink-weak">갱신 {fmtTime(c.updated)}</span>
                    {c.expires < today && <Badge tone="warning">만료됨</Badge>}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {onFeedback && q.status === 'answered' &&
        (q.feedback ? (
          <p className="mt-4 text-[13px] text-ink-weak">{q.feedback === 'solved' ? '해결됐다고 남겼어요' : '해결이 안 됐다고 남겼어요'}</p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button onClick={() => onFeedback(true)}>해결됐어요</Button>
            <Button variant="ghost" onClick={() => onFeedback(false)}>해결이 안 됐어요</Button>
          </div>
        ))}
    </Panel>
  );
}

export default function Page() {
  const { state, runs, me, refresh } = useLive();
  const toast = useToast();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AskResult | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [citeId, setCiteId] = useState<string | null>(null);
  const [reopenId, setReopenId] = useState<string | null>(null);
  const baseline = useRef<Set<string>>(new Set());

  useEffect(() => {
    api.harness().then((h: HarnessConfig) => setNames(Object.fromEntries(h.agents.map((a) => [a.id, a.name])))).catch(() => {});
  }, []);

  const run = useMemo(() => (busy ? runs.find((r) => r.flowName === '신입 질문' && !baseline.current.has(r.runId)) : undefined), [busy, runs]);

  const personName = (id: string) => state?.people.find((p) => p.id === id)?.name ?? id;
  const cardOf = (id: string | null) => state?.cards.find((c) => c.id === id);
  // 서버 최신 값을 우선하고, 아직 없으면 방금 받은 응답을 쓴다.
  const q = result ? state?.questions.find((x) => x.id === result.question.id) ?? result.question : null;
  const reopened = state?.questions.find((x) => x.id === reopenId);
  const mine = (state?.questions ?? []).filter((x) => x.askerId === me).slice().reverse();

  async function submit(t = text) {
    const v = t.trim();
    if (!v || busy) return;
    baseline.current = new Set(runs.map((r) => r.runId));
    setResult(null);
    setReopenId(null);
    setBusy(true);
    try {
      setResult(await api.ask(v, me));
      setText('');
      void refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : '물어보지 못했어요. 다시 해 주세요');
    } finally {
      setBusy(false);
    }
  }

  async function feedback(solved: boolean) {
    if (!q) return;
    try {
      await api.feedback(q.id, solved);
      toast(solved ? '알려줘서 고마워요' : '의견을 남겼어요. 점장님이 같이 볼게요');
      void refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : '남기지 못했어요');
    }
  }

  const citeCard = cardOf(citeId);

  return (
    <div className="mx-auto w-full max-w-2xl pb-16">
      <h1 className="mb-1 text-title text-ink-strong">지금 어떤 상황이에요?</h1>
      <p className="mb-5 text-body text-ink-body">매장 위키에서 찾아서 이유와 함께 알려드려요.</p>

      <div className="space-y-3">
        <textarea
          className={cx(inputCls, 'min-h-[88px] resize-none text-[16px]')}
          placeholder="예: 오트 우유가 다 떨어졌는데 손님이 찾아요"
          value={text}
          disabled={busy}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              void submit();
            }
          }}
        />
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button key={ex} disabled={busy} onClick={() => void submit(ex)} className="rounded-full bg-surface-subtle px-3 py-1.5 text-[13px] font-medium text-ink-body hover:bg-line disabled:opacity-40">
              {ex}
            </button>
          ))}
        </div>
        <Button size="lg" loading={busy} disabled={!text.trim()} onClick={() => void submit()}>
          물어보기
        </Button>
      </div>

      <div className="mt-6 space-y-4">
        {busy && <Progress run={run} names={names} />}

        {q && !busy && <AnswerCard q={q} cards={state?.cards ?? []} people={state?.people ?? []} today={state?.store.today ?? ''} onCite={setCiteId} onFeedback={(v) => void feedback(v)} />}

        {reopened && !busy && (!q || reopened.id !== q.id) && (
          <div>
            <AnswerCard q={reopened} cards={state?.cards ?? []} people={state?.people ?? []} today={state?.store.today ?? ''} onCite={setCiteId} />
            <button onClick={() => setReopenId(null)} className="mt-2 text-[13px] font-semibold text-ink-weak">닫기</button>
          </div>
        )}

        <Panel title="내가 물은 질문">
          {mine.length === 0 ? (
            <Empty>아직 물어본 게 없어요</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {mine.map((m) => (
                <li key={m.id}>
                  <button onClick={() => { setResult(null); setReopenId(m.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="w-full py-3 text-left">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[14px] font-medium text-ink-strong">{m.text}</p>
                      {statusBadge(m)}
                    </div>
                    <p className="mt-0.5 text-[12px] text-ink-weak">{fmtTime(m.time)} · 눌러서 답 다시 보기</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Sheet open={!!citeId} onClose={() => setCiteId(null)}>
        {citeCard ? <CardDetail card={citeCard} authorName={personName(citeCard.authorId)} /> : <Empty>카드를 찾지 못했어요</Empty>}
      </Sheet>
    </div>
  );
}
