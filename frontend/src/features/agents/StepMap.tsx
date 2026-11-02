// 단계 지도: 흐름을 단계 카드로 펼쳐 '지금 누구 차례인지'를 보여 준다. AI가 맡은 단계와 점장이 이어받는 단계를 한 지도에 둔다.
// 맨 아래 실행 바에서 점장 차례인 일(점장 답 기다리는 질문)을 바로 처리하고 다음으로 넘어간다.
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Check, ClipboardCheck, Compass, MessageSquare, Package, PenLine, ShieldCheck, UserRound, type LucideIcon } from 'lucide-react';
import type { AgentStep, FlowId, HarnessConfig, LintIssue } from '@shared/contracts';
import { api } from '@/shared/api/client';
import { useLive, type RunView } from '@/shared/api/live';
import { Badge, Button, cx, inputCls, useToast } from '@/shared/ui';
import { TEAM_STYLE } from '@/shared/theme/tokens';

const TEAM_ICON: Record<string, LucideIcon> = { lead: Compass, capture: PenLine, answer: MessageSquare, verify: ShieldCheck, keeper: BookOpen, stock: Package };

// 카드 아래에 붙는 도구 칩(그 에이전트가 쓰는 규칙·자료)
const TOOLS: Record<string, string[]> = {
  'privacy-guard': ['전화·카드·이름 가림'],
  interviewer: ['되묻기 2개'],
  'card-writer': ['사례 카드 칸'],
  librarian: ['2-gram BM25'],
  coach: ['카드만 근거'],
  escalator: ['안전 어휘', '호출 기준'],
  'citation-checker': ['카드 번호 확인'],
  'policy-checker': ['공식규정 우선'],
  'wording-guard': ['금지 표현'],
  synthesizer: ['토픽 원칙'],
  linter: ['상충·만료·중복'],
  'pos-reader': ['CSV', 'EUC-KR'],
  'recipe-writer': ['메뉴 → 재료'],
  'demand-analyst': ['요일별 평균', '카드 배수'],
  'order-clerk': ['주문서', '재고 현황'],
};

type Hand = 'answer' | 'approveCard' | 'stockApprove' | 'diffReason';
// 점장이 이어받는 자리. to: 점장이 하고 나면 이어지는 흐름
const HANDS: Record<Hand, { title: string; desc: string; to?: FlowId; link: string }> = {
  answer: { title: '점장 답', desc: '위키가 모르는 질문', to: 'resolve', link: '/manager' },
  approveCard: { title: '점장 승인', desc: '숙련 직원이 남긴 카드', to: 'approve', link: '/manager' },
  stockApprove: { title: '보정·소모량 승인', desc: 'AI 제안을 확인', to: 'stockapprove', link: '/inventory' },
  diffReason: { title: '차이 이유 남기기', desc: '실사와 계산이 다를 때', to: 'resolve', link: '/inventory' },
};

const LANES: { title: string; rows: { flow: FlowId; hand?: Hand }[] }[] = [
  { title: '1 현장에서 묻고 남기기', rows: [{ flow: 'ask', hand: 'answer' }, { flow: 'record', hand: 'approveCard' }] },
  { title: '2 점장이 정한 것을 위키로', rows: [{ flow: 'resolve' }, { flow: 'approve' }] },
  { title: '3 위키 돌보기', rows: [{ flow: 'lint' }] },
  { title: '4 재고·발주', rows: [{ flow: 'pos', hand: 'stockApprove' }, { flow: 'stocktake', hand: 'diffReason' }, { flow: 'stockapprove' }] },
];

const viaLabel = (via: AgentStep['via']) => (via === 'claude' ? 'Claude' : via === 'ollama' ? '로컬 AI' : via === 'rules' ? '규칙' : '규칙 대체');

export function StepMap({ h }: { h: HarnessConfig }) {
  const { state, runs, refresh } = useLive();
  const toast = useToast();
  const [stock, setStock] = useState<{ pending: number; diffs: LintIssue[] }>({ pending: 0, diffs: [] });
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void Promise.all([api.inventory(), api.inventoryIssues()])
      .then(([v, issues]) => setStock({ pending: v.adjustments.filter((a) => a.status === 'pending').length + v.recipes.filter((r) => r.status === 'pending').length, diffs: issues.filter((i) => i.kind === '재고 차이') }))
      .catch(() => undefined);
  }, [state]);

  const waiting = useMemo(() => (state?.questions ?? []).filter((q) => q.status === 'escalated').sort((a, b) => a.time.localeCompare(b.time)), [state]);
  const pendingCards = (state?.cards ?? []).filter((c) => c.status === 'pending').length;
  const handCount: Record<Hand, number> = { answer: waiting.length, approveCard: pendingCards, stockApprove: stock.pending, diffReason: stock.diffs.length };
  const humanTotal = Object.values(handCount).reduce((s, n) => s + n, 0);

  const agent = (id: string) => h.agents.find((a) => a.id === id);
  // 그 흐름의 가장 최근 실행. 에이전트 없이 끝난 실행(카드 저장 등)은 건너뛰고 실제로 단계가 돈 실행을 보여 준다
  const latest = (flow: FlowId) => runs.find((r) => r.flow === flow && (!r.done || r.steps.some((x) => x.agentId !== 'orchestrator')));
  const running = runs.find((r) => !r.done);
  const ai = state?.ai.mode;

  // 지금 차례: AI가 일하는 중이면 AI, 아니면 사람 손이 필요한 첫 일
  const firstHand = (Object.keys(handCount) as Hand[]).find((k) => handCount[k] > 0);
  const turn = running
    ? { who: 'ai' as const, label: `${agent(running.running ?? '')?.name ?? '오케스트레이터'} 차례 · ${running.flowName}` }
    : firstHand
      ? { who: 'human' as const, label: `점장 차례 · ${HANDS[firstHand].title} ${handCount[firstHand]}건` }
      : { who: 'none' as const, label: '모두 끝났어요' };

  const submit = async () => {
    const q = waiting[0];
    const manager = state?.people.find((p) => p.role === '점장');
    if (!q || !manager || !answer.trim()) return;
    setBusy(true);
    try {
      const r = await api.resolve(q.id, answer, manager.id);
      setAnswer('');
      toast(r.card.status === 'approved' ? `질문이 사례 카드 ${r.card.id}가 됐어요. 다음 일로 넘어가요` : '표현을 다듬어야 해서 승인 대기로 저장했어요');
      await refresh();
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-card bg-surface">
      {/* 위쪽: 지금 차례 알약과 범례 */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-t-card border-b border-line px-5 py-3.5">
        <span className={cx('inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px] font-semibold', turn.who === 'ai' ? 'bg-brand-weak text-brand-strong' : turn.who === 'human' ? 'bg-warning-weak text-warning' : 'bg-surface-subtle text-ink-body')}>
          <span className={cx('h-2 w-2 rounded-full', turn.who === 'ai' ? 'animate-pulse-ring bg-brand' : turn.who === 'human' ? 'bg-warning-mark' : 'bg-grey-400')} />
          {turn.label}
        </span>
        <div className="flex flex-wrap items-center gap-3 text-[12px] text-ink-weak">
          <span className="inline-flex items-center gap-1.5"><span className="h-3 w-5 rounded border border-dashed border-grey-500" />AI(LLM)가 쓰는 단계</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-3 w-5 rounded border border-grey-300" />규칙 단계</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-3 w-5 rounded border border-warning-mark bg-warning-weak" />사람 차례</span>
        </div>
      </div>

      {/* 지도 캔버스: 점 격자 위에 묶음(레인)별 흐름 */}
      <div className="space-y-4 bg-surface-subtle bg-[radial-gradient(theme(colors.line)_1px,transparent_1px)] p-4 [background-size:16px_16px] sm:p-5">
        {LANES.map((lane) => (
          <div key={lane.title} className="rounded-2xl border border-dashed border-grey-300 bg-surface/60 p-3 sm:p-4">
            <p className="mb-2 text-[12px] font-semibold text-ink-weak">{lane.title}</p>
            <div className="space-y-3">
              {lane.rows.map(({ flow, hand }) => (
                <FlowRow key={flow} h={h} flow={flow} run={latest(flow)} hand={hand} handCount={hand ? handCount[hand] : 0} ai={ai} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 아래쪽 실행 바: 지금 단계 · 누구 차례 · 바로 처리하고 다음으로. 넓은 화면에서는 화면 아래에 붙어 지도를 내려도 보인다(모바일은 하단 탭과 겹치지 않게 지도 끝에) */}
      <div className="z-10 flex flex-wrap items-center gap-3 rounded-b-card border-t border-line bg-surface px-5 py-3.5 lg:sticky lg:bottom-0 lg:shadow-[0_-8px_24px_rgba(19,18,50,0.06)]">
        <p className="flex min-w-0 items-center gap-2 text-[14px]">
          <span className={cx('h-2.5 w-2.5 flex-none rounded-full', turn.who === 'ai' ? 'animate-pulse-ring bg-brand' : turn.who === 'human' ? 'bg-warning-mark' : 'bg-grey-400')} />
          <span className="text-ink-weak">지금 단계</span>
          <span className="truncate font-semibold text-ink-strong">
            {running ? `${agent(running.running ?? '')?.name ?? '준비'} · ${running.input}` : firstHand === 'answer' ? `점장 답 · ${waiting[0].text}` : firstHand ? HANDS[firstHand].title : '기다리는 일 없음'}
          </span>
          {turn.who === 'human' && <Badge tone="warning">점장 차례</Badge>}
          {turn.who === 'ai' && <Badge tone="brand">AI 차례</Badge>}
        </p>
        <div className="flex min-w-[260px] flex-1 items-center gap-2">
          {turn.who === 'human' && firstHand === 'answer' ? (
            <>
              <input className={cx(inputCls, 'py-2')} placeholder="신입에게 알려 줄 답을 적어 주세요" value={answer} onChange={(e) => setAnswer(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && void submit()} />
              <Button size="sm" className="h-10 shrink-0" loading={busy} disabled={!answer.trim()} onClick={() => void submit()}>
                답하고 다음으로
              </Button>
            </>
          ) : turn.who === 'human' && firstHand ? (
            <Link to={HANDS[firstHand].link} className="ml-auto inline-flex h-10 items-center rounded-xl bg-brand px-4 text-[14px] font-semibold text-white hover:bg-brand-strong">
              {HANDS[firstHand].link === '/inventory' ? '재고 화면에서 처리하기' : '점장 할 일에서 처리하기'}
            </Link>
          ) : (
            <span className="ml-auto text-[13px] text-ink-weak">{turn.who === 'ai' ? 'AI가 일하는 중이에요. 끝나면 다음 차례가 보여요' : '질문이 들어오거나 하루 재생을 누르면 다시 움직여요'}</span>
          )}
        </div>
        <span className="text-[13px] font-semibold text-ink-weak">사람 차례 {humanTotal}건</span>
      </div>
    </section>
  );
}

/** 이어진 검증팀 단계(근거·규정·표현)는 게이트 카드 하나로 묶는다. Corevis처럼 단계 하나에 도구를 붙인 모양 */
function groupSteps(h: HarnessConfig, steps: string[]): string[][] {
  const out: string[][] = [];
  for (const id of steps) {
    const team = h.agents.find((a) => a.id === id)?.team;
    const last = out.at(-1);
    if (team === 'verify' && last && h.agents.find((a) => a.id === last[0])?.team === 'verify') last.push(id);
    else out.push([id]);
  }
  return out;
}

function FlowRow({ h, flow, run, hand, handCount, ai }: { h: HarnessConfig; flow: FlowId; run?: RunView; hand?: Hand; handCount: number; ai?: string }) {
  const f = h.flows[flow];
  const gate = h.gates.find((g) => g.flow === flow);
  const groups = groupSteps(h, f.steps.filter((s) => s !== 'orchestrator'));
  const done = new Map((run?.steps ?? []).map((s) => [s.agentId, s]));
  const handTo = hand ? HANDS[hand].to : undefined;
  return (
    <div>
      <p className="mb-1.5 flex items-baseline gap-2">
        <span className="text-[14px] font-bold text-ink-strong">{f.name}</span>
        <span className="truncate text-[11px] text-ink-weak">{run ? (run.done ? `마지막: ${run.summary}` : '진행 중') : '아직 실행 없음'}</span>
      </p>
      <div className="flex items-stretch overflow-x-auto pb-1">
      {groups.map((ids, i) => {
        const steps = ids.map((id) => done.get(id)).filter(Boolean) as AgentStep[];
        const active = ids.includes(run?.running ?? '');
        const a = h.agents.find((x) => x.id === ids[0])!;
        // 묶음 카드의 상태: 하나라도 걸리면 걸러냄, 모두 끝나야 끝남
        const step: AgentStep | undefined = steps.length === ids.length ? (steps.find((x) => x.status !== 'ok') ?? steps[0]) : undefined;
        const faded = !!run && !steps.length && !active;
        const lit = steps.length > 0 || active;
        return (
          <div key={ids.join('+')} className="flex flex-none items-stretch">
            {i > 0 && <span className={cx('h-px w-3 self-center', lit ? 'bg-brand' : 'bg-grey-300')} />}
            {ids.length > 1 ? (
              <StepCard id={ids.join('+')} name="검증 게이트" role={ids.map((x) => h.agents.find((y) => y.id === x)!.name).join(' · ')} team="verify" llm={false} step={step} active={active} faded={faded} inGate ai={ai}
                tools={ids.map((x) => h.agents.find((y) => y.id === x)!.name)} summary={steps.map((x) => x.summary).join(' / ')} />
            ) : (
              <StepCard id={ids[0]} name={a.name} role={a.role} team={a.team} llm={a.llm} step={step} active={active} faded={faded} inGate={!!gate?.agents.includes(ids[0])} ai={ai} />
            )}
          </div>
        );
      })}
      {hand && (
        <div className="flex flex-none items-stretch">
          <span className="h-px w-3 self-center border-t border-dashed border-warning-mark" />
          <Link
            to={HANDS[hand].link}
            className={cx('flex w-[136px] flex-col rounded-xl border px-2.5 py-2 transition-colors', handCount ? 'border-warning-mark bg-warning-weak hover:bg-warning-weak/70' : 'border-grey-300 bg-surface text-ink-disabled hover:bg-surface-subtle')}
          >
            <span className="mb-1 inline-flex items-center gap-1.5">
              <UserRound size={14} className={handCount ? 'text-warning' : 'text-ink-disabled'} />
              <span className={cx('text-[11px] font-semibold', handCount ? 'text-warning' : 'text-ink-disabled')}>{handCount ? `점장 차례 · ${handCount}건` : '사람 차례'}</span>
            </span>
            <span className={cx('text-[13px] font-semibold', handCount ? 'text-ink-strong' : 'text-ink-weak')}>{HANDS[hand].title}</span>
            <span className="text-[11px] text-ink-weak">
              {HANDS[hand].desc}
              {handTo ? ` → ${h.flows[handTo].name}` : ''}
            </span>
          </Link>
        </div>
      )}
      </div>
    </div>
  );
}

function StepCard({ id, name, role, team, llm, step, active, faded, inGate, ai, tools, summary }: { id: string; name: string; role: string; team: string; llm: boolean; step?: AgentStep; active: boolean; faded: boolean; inGate: boolean; ai?: string; tools?: string[]; summary?: string }) {
  const Icon = TEAM_ICON[team] ?? ClipboardCheck;
  const st = TEAM_STYLE[team];
  const tag = step ? viaLabel(step.via) : llm ? (ai === 'claude' ? 'Claude' : ai === 'ollama' ? '로컬 AI' : 'LLM · 지금은 규칙') : '규칙';
  return (
    <div
      title={summary || step?.summary || role}
      className={cx(
        'relative w-[136px] rounded-xl border bg-surface px-2.5 py-2 transition-opacity',
        llm ? 'border-dashed border-grey-500' : 'border-grey-300',
        active && 'animate-pulse-ring border-solid !border-brand',
        step?.status === 'blocked' && '!border-warning-mark',
        step?.status === 'error' && '!border-danger-mark',
        faded && 'opacity-45',
      )}
    >
      <div className="mb-1 flex items-center justify-between gap-1">
        <span className={cx('rounded px-1.5 py-px text-[10px] font-semibold', llm ? 'bg-brand-weak text-brand-strong' : 'bg-surface-subtle text-ink-weak')}>{tag}</span>
        {active ? (
          <span className="text-[10px] font-semibold text-brand">일하는 중</span>
        ) : step?.status === 'blocked' ? (
          <span className="text-[10px] font-semibold text-warning">걸러냄</span>
        ) : step?.status === 'error' ? (
          <span className="text-[10px] font-semibold text-danger">오류</span>
        ) : step ? (
          <Check size={13} className="text-success" />
        ) : null}
      </div>
      <p className="flex items-center gap-1.5 text-[13px] font-semibold text-ink-strong">
        <Icon size={14} style={{ color: st?.color }} className="flex-none" />
        <span className="truncate">{name}</span>
      </p>
      <p className="mt-0.5 line-clamp-1 text-[11px] text-ink-weak">{summary || step?.summary || role}</p>
      <div className="mt-1.5 flex flex-wrap gap-1">
        {(tools ?? TOOLS[id] ?? []).map((t) => (
          <span key={t} className="rounded bg-surface-subtle px-1.5 py-px text-[10px] text-ink-body">
            {t}
          </span>
        ))}
        {inGate && !tools && <span className="rounded bg-warning-weak px-1.5 py-px text-[10px] font-semibold text-warning">게이트</span>}
      </div>
    </div>
  );
}
