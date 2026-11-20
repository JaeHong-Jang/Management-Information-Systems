// 근무 지도: 할 일을 한 줄로 말하면 단계 지도가 생기고, 단계마다 판정표를 판정관이 채점해야 다음으로 넘어간다.
// 근무가 바뀌면 인계 메모를 남기고 다음 사람이 지금 단계부터 잇는다. (참고: Corevis 단계 지도, 「지속 가능한 구조」 판정·실행 고리)
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bot, Check, ClipboardCheck, Eye, FileCheck2, History, ListChecks, Plus, Repeat2, UserRound } from 'lucide-react';
import type { CheckDef, CheckKind, CheckResult, Shift, ShiftStep, ShiftsView, Verdict } from '@shared/contracts';
import { api } from '@/shared/api/client';
import { useLive } from '@/shared/api/live';
import { Badge, Button, CardDetail, Empty, PageHeader, Sheet, cx, fmtTime, inputCls, useToast } from '@/shared/ui';

const EXAMPLES = ['오픈 준비해 줘', '마감하고 발주까지', '축제 준비랑 마감까지'];
const KIND: Record<CheckKind, { label: string; icon: typeof Eye }> = {
  auto: { label: '자료로 확인', icon: FileCheck2 },
  self: { label: '직접 체크', icon: ListChecks },
  look: { label: '점장이 볼 것', icon: Eye },
};
const VERDICT_TONE: Record<Verdict, 'success' | 'danger' | 'neutral'> = { 합격: 'success', 불합격: 'danger', 모름: 'neutral' };

const current = (s: Shift) => s.steps.find((x) => x.state !== 'passed') ?? null;
const resultOf = (st: ShiftStep, id: string): CheckResult | undefined => st.results.find((r) => r.id === id);

export default function ShiftMap() {
  const { state, me } = useLive();
  const toast = useToast();
  const [view, setView] = useState<ShiftsView | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [stepId, setStepId] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [composing, setComposing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [handing, setHanding] = useState(false);
  const [cardId, setCardId] = useState<string | null>(null);

  const load = useCallback(async () => setView(await api.shifts()), []);
  useEffect(() => void load(), [load, state]);

  const shift = useMemo(() => {
    if (!view) return null;
    return view.shifts.find((s) => s.id === activeId) ?? view.shifts.find((s) => s.status === 'open') ?? null;
  }, [view, activeId]);
  const cur = shift ? current(shift) : null;
  const step = shift?.steps.find((s) => s.id === stepId) ?? cur ?? shift?.steps.at(-1) ?? null;
  const people = state?.people ?? [];
  const meP = people.find((p) => p.id === me);
  const isManager = meP?.role === '점장';

  const run = async <T,>(key: string, fn: () => Promise<T>, done?: (r: T) => string) => {
    setBusy(key);
    try {
      const r = await fn();
      if (done) toast(done(r));
      await load();
      return r;
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const plan = async (t = text) => {
    const s = await run('plan', () => api.planShift(t, me), (r) => `${r.title} 단계 ${r.steps.length}개로 지도를 만들었어요`);
    if (s) {
      setActiveId(s.id);
      setStepId(null);
      setText('');
      setComposing(false);
    }
  };
  const judge = (st: ShiftStep) =>
    run(`judge-${st.id}`, () => api.judgeStep(shift!.id, st.id, me), (r) => {
      const after = r.steps.find((x) => x.id === st.id)!;
      const next = current(r);
      if (after.state === 'passed') {
        setStepId(null);
        return next ? `합격이에요. 다음 단계: ${next.title}` : '근무의 모든 단계가 합격했어요';
      }
      return after.state === 'waiting' ? (after.fails >= 3 ? '3번 불합격이라 점장에게 넘겼어요' : '점장이 볼 줄이 남았어요') : after.state === 'failed' ? `불합격 ${after.fails}회: 이유를 보고 고친 뒤 다시 판정 받으세요` : '체크가 비어 있어요. 비어 있으면 합격이 아니에요';
    });
  const tick = (st: ShiftStep, c: CheckDef, on: boolean) => run(`tick-${c.id}`, () => api.tickCheck(shift!.id, st.id, c.id, on, me));

  // 판정은 지금 단계만, 3번 불합격한 단계는 점장만 다시 할 수 있다(서버도 같은 규칙으로 막는다)
  const judgeBlock = (st: ShiftStep | null): string | null =>
    !shift || !st || shift.status !== 'open' || st.state === 'passed' ? '판정할 단계가 아니에요' : st.id !== cur?.id ? `지금 단계(${cur?.title})부터 차례로 판정해요` : st.fails >= 3 && !isManager ? '3번 불합격이라 점장이 다시 판정해요' : null;

  if (!view || !state) return null;
  const passed = shift ? shift.steps.filter((s) => s.state === 'passed').length : 0;
  const past = view.shifts.filter((s) => s.id !== shift?.id).slice(0, 5);
  const showAsk = composing || !shift;

  return (
    <div className={cx(shift && 'pb-4')}>
      <PageHeader
        eyebrow="현장"
        title="근무 지도"
        desc="할 일을 한 줄로 말하면 단계 지도가 생겨요. 단계마다 판정표가 있고, 일한 사람이 아니라 판정관이 채점해야 다음으로 넘어가요. 근무가 바뀌어도 지금 단계부터 이어받아요."
        action={
          shift && !composing ? (
            <Button variant="secondary" onClick={() => setComposing(true)}>
              <Plus size={16} /> 새 근무 지도
            </Button>
          ) : undefined
        }
      />

      {showAsk && (
        <section className="mb-5 rounded-card bg-surface p-6 sm:p-8">
          <h2 className="text-[22px] font-bold leading-8 tracking-tight text-ink-strong sm:text-[26px] sm:leading-[36px]">
            말 한 줄이, <span className="text-brand">끝까지 가는</span> 근무 지도로
          </h2>
          <p className="mt-1 text-[15px] text-ink-body">근무 설계자가 오픈 준비 · 마감·발주 · 행사 준비 루틴에서 골라 단계를 펼쳐요.</p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input className={inputCls} placeholder="예: 마감하고 발주까지 해 줘" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && text.trim() && void plan()} />
            <Button className="shrink-0" loading={busy === 'plan'} disabled={!text.trim()} onClick={() => void plan()}>
              지도 만들기 <ArrowRight size={16} />
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-[13px] text-ink-weak">예시</span>
            {EXAMPLES.map((x) => (
              <button key={x} onClick={() => void plan(x)} disabled={busy === 'plan'} className="rounded-full bg-surface-subtle px-3 py-1.5 text-[13px] font-medium text-ink-body hover:bg-line">
                {x}
              </button>
            ))}
            {composing && (
              <button onClick={() => setComposing(false)} className="ml-auto text-[13px] font-semibold text-ink-weak">
                닫기
              </button>
            )}
          </div>
        </section>
      )}

      {shift ? (
        <>
          {/* 근무 머리: 말한 한 줄 · 진행 · 인계 메모 */}
          <section className="mb-4 rounded-card bg-surface p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-brand">
                  {fmtTime(shift.date)} · {shift.id} · {people.find((p) => p.id === shift.by)?.name ?? shift.by}이 시작
                </p>
                <h2 className="mt-1 text-sub text-ink-strong">{shift.title}</h2>
                <p className="mt-0.5 text-[14px] text-ink-weak">“{shift.ask}”</p>
              </div>
              <div className="text-right">
                <p className="text-[30px] font-bold leading-9 text-ink-strong">
                  {passed}
                  <span className="text-[17px] font-semibold text-ink-weak">/{shift.steps.length} 단계 합격</span>
                </p>
                {shift.status === 'done' ? <Badge tone="success">근무 끝</Badge> : cur && <Badge tone={cur.actor === 'AI' ? 'brand' : 'warning'}>{cur.actor === 'AI' ? 'AI 차례' : `${cur.actor} 차례`}</Badge>}
              </div>
            </div>
            <div className="mt-4 flex h-2 gap-1">
              {shift.steps.map((s) => (
                <span key={s.id} title={s.title} className={cx('flex-1 rounded-full', s.state === 'passed' ? 'bg-success-mark' : s.state === 'failed' ? 'bg-danger-mark' : s.state === 'waiting' ? 'bg-warning-mark' : s.id === cur?.id ? 'bg-brand' : 'bg-line')} />
              ))}
            </div>
            {shift.handovers.length > 0 && (
              <div className="mt-4 rounded-xl bg-brand-weak p-4">
                <p className="mb-1 flex items-center gap-1.5 text-[13px] font-semibold text-brand-strong">
                  <Repeat2 size={15} /> 이어받기 메모 · {fmtTime(shift.handovers.at(-1)!.at)}
                </p>
                <p className="whitespace-pre-line text-[14px] leading-6 text-ink-strong">{shift.handovers.at(-1)!.note}</p>
              </div>
            )}
          </section>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_380px] [&>*]:min-w-0">
            {/* 지도: 묶음(레인)마다 단계 카드 */}
            <section className="rounded-card bg-surface-subtle bg-[radial-gradient(theme(colors.line)_1px,transparent_1px)] p-4 [background-size:16px_16px] sm:p-5">
              <div className="space-y-4">
                {groupByPhase(shift.steps).map(([phase, steps]) => (
                  <div key={phase} className="rounded-2xl border border-dashed border-grey-300 bg-surface/70 p-3 sm:p-4">
                    <p className="mb-2 text-[12px] font-semibold text-ink-weak">{phase}</p>
                    <div className="flex flex-wrap items-stretch gap-y-3">
                      {steps.map((s, i) => (
                        <div key={s.id} className="flex items-stretch">
                          {i > 0 && <span className={cx('h-px w-4 self-center', s.state === 'passed' || s.id === cur?.id ? 'bg-brand' : 'bg-grey-300')} />}
                          <StepCard s={s} current={s.id === cur?.id} selected={s.id === step?.id} onClick={() => setStepId(s.id)} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* 오른쪽: 고른 단계의 판정표 */}
            {step && (
              <aside className="h-fit rounded-card bg-surface p-5 xl:sticky xl:top-4">
                <p className="text-[12px] font-semibold text-ink-weak">{step.phase}</p>
                <div className="mt-1 flex items-start justify-between gap-2">
                  <h3 className="text-[19px] font-bold leading-7 text-ink-strong">{step.title}</h3>
                  <StateBadge s={step} current={step.id === cur?.id} />
                </div>
                <p className="mt-0.5 text-[14px] text-ink-body">{step.desc}</p>
                <div className="mt-2">
                  <ActorChip s={step} />
                </div>

                <p className="mb-2 mt-5 flex items-center gap-1.5 text-[13px] font-semibold text-ink-body">
                  <ClipboardCheck size={15} /> 판정표
                </p>
                <ul className="space-y-2">
                  {step.checks.map((c) => {
                    const r = resultOf(step, c.id);
                    const K = KIND[c.kind];
                    const on = c.kind === 'look' ? step.approved.includes(c.id) : step.ticks.includes(c.id);
                    const canTick = shift.status === 'open' && (c.kind === 'self' || (c.kind === 'look' && isManager));
                    return (
                      <li key={c.id} className="rounded-xl bg-surface-subtle p-3">
                        <div className="flex items-start gap-2.5">
                          {c.kind === 'auto' ? (
                            <K.icon size={18} className="mt-0.5 flex-none text-ink-weak" />
                          ) : (
                            <input
                              type="checkbox"
                              className="mt-1 h-4 w-4 flex-none accent-brand disabled:opacity-40"
                              checked={on}
                              disabled={!canTick || busy === `tick-${c.id}`}
                              onChange={(e) => void tick(step, c, e.target.checked)}
                              aria-label={c.text}
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-[14px] font-medium leading-5 text-ink-strong">{c.text}</p>
                            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[12px] text-ink-weak">
                              <span>{K.label}</span>
                              {c.source && (
                                <button onClick={() => setCardId(c.source!)} className="rounded bg-brand-weak px-1.5 font-semibold text-brand-strong">
                                  {c.source}
                                </button>
                              )}
                              {c.kind === 'look' && !isManager && <span>· 점장으로 바꾸면 확인할 수 있어요</span>}
                            </p>
                            {r && <p className={cx('mt-1 text-[12px]', r.verdict === '불합격' ? 'text-danger' : 'text-ink-weak')}>{r.why}</p>}
                          </div>
                          {r && <Badge tone={VERDICT_TONE[r.verdict]}>{r.verdict}</Badge>}
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-3 text-[12px] leading-5 text-ink-weak">판정은 일한 사람이 아니라 판정관(검증팀)이 해요. 비어 있으면 합격이 아니라 모름이고, 3번 불합격이면 점장에게 넘어가요.</p>

                <div className="mt-4 flex gap-2">
                  {step.link && (
                    <Link to={step.link} className="inline-flex h-11 flex-1 items-center justify-center rounded-xl bg-brand-weak px-3 text-[14px] font-semibold text-brand-strong hover:bg-brand-hover">
                      {step.link === '/inventory' ? '재고 화면에서 하기' : '점장 할 일에서 하기'}
                    </Link>
                  )}
                  <Button className="flex-1" loading={busy === `judge-${step.id}`} disabled={!!judgeBlock(step)} onClick={() => void judge(step)}>
                    판정 받기
                  </Button>
                </div>
                {judgeBlock(step) && step.state !== 'passed' && shift.status === 'open' && <p className="mt-2 text-[12px] text-ink-weak">{judgeBlock(step)}</p>}

                {step.cards.length > 0 && (
                  <>
                    <p className="mb-1.5 mt-5 text-[13px] font-semibold text-ink-body">이 단계의 근거 카드</p>
                    <ul className="space-y-1">
                      {step.cards.map((id) => (
                        <li key={id}>
                          <button onClick={() => setCardId(id)} className="w-full truncate rounded-lg px-2 py-1.5 text-left text-[13px] text-ink-body hover:bg-surface-subtle">
                            <span className="mr-1.5 font-semibold text-brand-strong">{id}</span>
                            {state.cards.find((c) => c.id === id)?.title}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                <details className="mt-5">
                  <summary className="flex cursor-pointer items-center gap-1.5 text-[13px] font-semibold text-ink-body">
                    <History size={15} /> 근무 기록 {shift.log.length}줄
                  </summary>
                  <ul className="mt-2 space-y-1">
                    {[...shift.log].reverse().map((l, i) => (
                      <li key={i} className="text-[12px] text-ink-weak">
                        {fmtTime(l.at)} · {l.text}
                      </li>
                    ))}
                  </ul>
                </details>
              </aside>
            )}
          </div>

          {/* 아래 실행 바: 지금 단계 · 누구 차례 · 판정 받고 다음으로 · n/m · 근무 넘기기 */}
          {shift.status === 'open' && (
            <div className="z-10 mt-4 flex flex-wrap items-center gap-3 rounded-card border border-line bg-surface px-5 py-3.5 lg:sticky lg:bottom-3 lg:shadow-[0_8px_24px_rgba(19,18,50,0.10)]">
              <p className="flex min-w-0 flex-1 items-center gap-2 text-[14px]">
                <span className={cx('h-2.5 w-2.5 flex-none rounded-full', cur?.actor === 'AI' ? 'animate-pulse-ring bg-brand' : 'bg-warning-mark')} />
                <span className="text-ink-weak">지금 단계</span>
                <span className="truncate font-semibold text-ink-strong">{cur?.title}</span>
                {cur && <Badge tone={cur.actor === 'AI' ? 'brand' : 'warning'}>{cur.actor === 'AI' ? 'AI 차례' : `${cur.actor} 차례`}</Badge>}
              </p>
              <span className="text-[13px] font-semibold text-ink-weak">
                {cur ? shift.steps.indexOf(cur) + 1 : shift.steps.length}/{shift.steps.length}
              </span>
              <Button size="sm" variant="ghost" className="h-10" onClick={() => setHanding(true)}>
                <Repeat2 size={15} /> 근무 넘기기
              </Button>
              {cur && (
                <Button size="sm" className="h-10" loading={busy === `judge-${cur.id}`} disabled={!!judgeBlock(cur)} title={judgeBlock(cur) ?? undefined} onClick={() => void judge(cur)}>
                  판정 받고 다음으로
                </Button>
              )}
            </div>
          )}

          {past.length > 0 && (
            <section className="mt-5 rounded-card bg-surface p-5">
              <p className="mb-2 text-[15px] font-bold text-ink-strong">지난 근무</p>
              <ul className="divide-y divide-line">
                {past.map((s) => (
                  <li key={s.id}>
                    <button onClick={() => { setActiveId(s.id); setStepId(null); }} className="flex w-full items-center gap-3 py-2.5 text-left">
                      <Badge>{s.id}</Badge>
                      <span className="min-w-0 flex-1 truncate text-[14px] text-ink-strong">
                        {fmtTime(s.date)} · {s.title}
                      </span>
                      {s.status === 'open' && <Badge tone="brand">진행 중</Badge>}
                      <span className="text-[12px] text-ink-weak">
                        {s.steps.filter((x) => x.state === 'passed').length}/{s.steps.length} 합격{s.handovers.length ? ` · 넘김 ${s.handovers.at(-1)!.from.split('(')[0]}→${s.handovers.at(-1)!.to.split('(')[0]}` : ''}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      ) : (
        view.shifts.length > 0 && (
          <section className="rounded-card bg-surface p-5">
            <p className="mb-2 text-[15px] font-bold text-ink-strong">지난 근무</p>
            <ul className="divide-y divide-line">
              {view.shifts.slice(0, 5).map((s) => (
                <li key={s.id}>
                  <button onClick={() => setActiveId(s.id)} className="flex w-full items-center gap-3 py-2.5 text-left">
                    <Badge>{s.id}</Badge>
                    <span className="min-w-0 flex-1 truncate text-[14px] text-ink-strong">
                      {fmtTime(s.date)} · {s.title}
                    </span>
                    <span className="text-[12px] text-ink-weak">
                      {s.steps.filter((x) => x.state === 'passed').length}/{s.steps.length} 합격
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )
      )}

      <Sheet open={handing} onClose={() => setHanding(false)}>
        {shift && <HandoverForm shift={shift} me={me} people={people} busy={busy === 'hand'} onSubmit={(from, to) => void run('hand', () => api.handover(shift.id, from, to), () => (setHanding(false), '인계 메모를 남겼어요. 다음 사람은 지금 단계부터 이어받아요'))} />}
      </Sheet>
      <Sheet open={!!cardId} onClose={() => setCardId(null)}>
        {cardId && state.cards.find((c) => c.id === cardId) && <CardDetail card={state.cards.find((c) => c.id === cardId)!} authorName={people.find((p) => p.id === state.cards.find((c) => c.id === cardId)!.authorId)?.name} />}
      </Sheet>
      {!shift && view.shifts.length === 0 && <Empty>아직 근무 지도가 없어요. 위에 한 줄로 적어 보세요.</Empty>}
    </div>
  );
}

function groupByPhase(steps: ShiftStep[]): [string, ShiftStep[]][] {
  const m = new Map<string, ShiftStep[]>();
  for (const s of steps) m.set(s.phase, [...(m.get(s.phase) ?? []), s]);
  return [...m];
}

function ActorChip({ s }: { s: ShiftStep }) {
  const ai = s.actor === 'AI';
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold', ai ? 'bg-brand-weak text-brand-strong' : 'bg-person-weak text-person')}>
      {ai ? <Bot size={12} /> : <UserRound size={12} />}
      {ai ? `AI · ${AGENT_NAME[s.agentId ?? ''] ?? '에이전트'}` : s.actor}
      {!ai && s.agentId && <span className="font-medium text-ink-weak">+ {AGENT_NAME[s.agentId] ?? 'AI'}</span>}
    </span>
  );
}
const AGENT_NAME: Record<string, string> = { 'order-clerk': '발주 담당', 'pos-reader': 'POS 정리원', 'demand-analyst': '수요 분석가', 'shift-planner': '근무 설계자' };

function StateBadge({ s, current }: { s: ShiftStep; current: boolean }) {
  if (s.state === 'passed') return <Badge tone="success">합격</Badge>;
  if (s.state === 'failed') return <Badge tone="danger">불합격 {s.fails}회</Badge>;
  if (s.state === 'waiting') return <Badge tone="warning">{s.fails >= 3 ? '점장에게 넘어감' : '점장 확인 대기'}</Badge>;
  return current ? <Badge tone="brand">지금 단계</Badge> : <Badge>대기</Badge>;
}

function StepCard({ s, current, selected, onClick }: { s: ShiftStep; current: boolean; selected: boolean; onClick: () => void }) {
  const pass = s.results.filter((r) => r.verdict === '합격').length;
  return (
    <button
      onClick={onClick}
      className={cx(
        'flex w-[196px] flex-col rounded-xl border bg-surface px-3 py-2.5 text-left transition-shadow',
        s.actor === 'AI' ? 'border-dashed border-grey-500' : 'border-grey-300',
        s.state === 'passed' && '!border-solid !border-success-mark',
        s.state === 'failed' && '!border-solid !border-danger-mark',
        s.state === 'waiting' && '!border-solid !border-warning-mark',
        current && s.state !== 'failed' && s.state !== 'waiting' && 'animate-pulse-ring !border-solid !border-brand',
        selected && 'ring-2 ring-brand/40',
      )}
    >
      <span className="mb-1.5 flex items-center justify-between gap-1">
        <ActorChip s={s} />
        {s.state === 'passed' ? <Check size={14} className="text-success" /> : current ? <span className="text-[10px] font-semibold text-brand">지금</span> : null}
      </span>
      <span className="text-[14px] font-semibold leading-5 text-ink-strong">{s.title}</span>
      <span className="mt-0.5 line-clamp-1 text-[11px] text-ink-weak">{s.desc}</span>
      {/* 판정 줄마다 칸 하나: 합격 청록 · 불합격 빨강 · 모름·아직 회색 */}
      <span className="mt-2 flex items-center gap-1">
        {s.checks.map((c) => {
          const r = s.results.find((x) => x.id === c.id);
          return <span key={c.id} title={`${c.text}${r ? ` · ${r.verdict}` : ''}`} className={cx('h-1.5 flex-1 rounded-full', r?.verdict === '합격' ? 'bg-success-mark' : r?.verdict === '불합격' ? 'bg-danger-mark' : 'bg-line')} />;
        })}
        <span className="ml-1 text-[10px] font-semibold text-ink-weak">
          {pass}/{s.checks.length}
        </span>
      </span>
      {s.cards.length > 0 && (
        <span className="mt-1.5 flex flex-wrap gap-1">
          {s.cards.map((id) => (
            <span key={id} className="rounded bg-surface-subtle px-1.5 py-px text-[10px] text-ink-body">
              {id}
            </span>
          ))}
        </span>
      )}
    </button>
  );
}

function HandoverForm({ shift, me, people, busy, onSubmit }: { shift: Shift; me: string; people: { id: string; name: string; role: string; tenure: string }[]; busy: boolean; onSubmit: (from: string, to: string) => void }) {
  const [from, setFrom] = useState(me);
  const [to, setTo] = useState(people.find((p) => p.id !== me)?.id ?? '');
  const cur = current(shift);
  return (
    <div>
      <h3 className="text-sub text-ink-strong">근무 넘기기</h3>
      <p className="mt-1 text-[14px] text-ink-body">근무 설계자가 끝난 단계, 지금 단계, 남은 기준, 막힌 것을 인계 메모로 남겨요. 받는 사람은 {cur ? `「${cur.title}」` : '지금 단계'}부터 이어받아요.</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {(['from', 'to'] as const).map((k) => (
          <label key={k} className="block">
            <span className="mb-1.5 block text-[13px] font-semibold text-ink-body">{k === 'from' ? '넘기는 사람' : '받는 사람'}</span>
            <select className={cx(inputCls, 'py-2.5')} value={k === 'from' ? from : to} onChange={(e) => (k === 'from' ? setFrom : setTo)(e.target.value)}>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.role})
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <Button size="lg" className="mt-4" loading={busy} disabled={!from || !to || from === to} onClick={() => onSubmit(from, to)}>
        인계 메모 남기고 넘기기
      </Button>
    </div>
  );
}
