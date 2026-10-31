// 대시보드: 질문이 어떻게 끝났는지, 지식이 쌓이는 그래프, 지금 일하는 에이전트, 점장이 할 일. 발표 첫 화면이 이 한 장이다.
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronRight, Play, Users } from 'lucide-react';
import type { HarnessConfig } from '@shared/contracts';
import { api } from '@/shared/api/client';
import { useLive, type RunView } from '@/shared/api/live';
import { Badge, Button, Empty, Panel, Stat, cx, fmtTime, useToast } from '@/shared/ui';
import { CHART, TEAM_STYLE } from '@/shared/theme/tokens';
import { GraphCanvas, Legend } from '../ontology/GraphCanvas';

const OUTCOME = [
  { key: 'answered', label: '위키가 바로 답함', color: CHART.brand },
  { key: 'escalated', label: '점장 답 기다림', color: CHART.orange },
  { key: 'resolved', label: '점장 답이 카드가 됨', color: CHART.teal },
] as const;

export default function Overview() {
  const { state, graph, fresh, runs, wikiFeed } = useLive();
  const [harness, setHarness] = useState<HarnessConfig | null>(null);
  const toast = useToast();
  useEffect(() => void api.harness().then(setHarness), []);

  const d = useMemo(() => {
    if (!state) return null;
    const approved = state.cards.filter((c) => c.status === 'approved');
    const qs = state.questions;
    const count = { answered: 0, escalated: 0, resolved: 0 };
    qs.forEach((q) => count[q.status]++);
    return {
      cards: approved.length,
      reason: approved.length ? Math.round((approved.filter((c) => c.reason.trim()).length / approved.length) * 100) : 0,
      uses: approved.reduce((s, c) => s + c.uses, 0),
      helpful: approved.reduce((s, c) => s + c.helpful, 0),
      total: qs.length,
      count,
      waiting: qs.filter((q) => q.status === 'escalated').slice().reverse(),
      became: qs.filter((q) => q.cardId).length,
    };
  }, [state]);

  const play = async () => {
    try {
      await api.playDemo();
      toast('매장의 하루를 재생해요');
    } catch (e) {
      toast((e as Error).message);
    }
  };

  if (!state || !d) return null;
  const name = (id: string) => state.people.find((p) => p.id === id)?.name ?? '';
  const feed = (wikiFeed.length ? wikiFeed : state.log.map((l) => ({ at: l.time, op: l.op, detail: l.detail, runId: l.runId ?? l.time }))).slice(0, 5);
  const veterans = state.people
    .filter((p) => p.role !== '신입')
    .map((p) => {
      const cards = state.cards.filter((c) => c.authorId === p.id && c.status === 'approved' && c.credit !== false);
      return { p, n: cards.length, helped: cards.reduce((s, c) => s + c.helpful, 0) };
    })
    .sort((a, b) => b.helped - a.helped);
  const topHelped = Math.max(1, ...veterans.map((v) => v.helped));

  return (
    <div className="space-y-5">
      {/* 첫 줄: 오늘 한 문장 + 질문이 어떻게 끝났나 */}
      <section className="rounded-card bg-surface p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-brand">{fmtTime(state.store.today)} · {state.store.name}</p>
            <h1 className="mt-2 text-[26px] font-bold leading-[36px] tracking-tight text-ink-strong sm:text-[30px] sm:leading-[40px]">
              {d.total ? (
                <>
                  신입 질문 {d.total}건 중 <span className="text-brand">{d.count.answered}건</span>을
                  <br className="hidden sm:block" /> 위키가 바로 답했어요
                </>
              ) : (
                '아직 들어온 질문이 없어요'
              )}
            </h1>
            <p className="mt-2 text-[15px] text-ink-body">
              {d.count.escalated ? `점장 답을 기다리는 질문이 ${d.count.escalated}건 있어요. 점장이 답하면 그 답이 다시 위키가 돼요.` : '위키가 모르는 질문은 점장에게 넘어가고, 점장 답은 다시 위키가 돼요.'}
            </p>
          </div>
          <div className="flex gap-2">
            <Link to="/customers" className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-surface-subtle px-4 text-[15px] font-semibold text-ink-body hover:bg-line">
              <Users size={16} /> 가상 손님
            </Link>
            <Button onClick={play} disabled={state.demoPlaying}>
              <Play size={16} /> {state.demoPlaying ? '하루 재생 중' : '매장의 하루 재생'}
            </Button>
          </div>
        </div>

        {d.total > 0 && (
          <div className="mt-7">
            <div className="flex h-3 gap-[2px] overflow-hidden rounded-full bg-surface-subtle">
              {OUTCOME.map((o) =>
                d.count[o.key] ? (
                  <div key={o.key} title={`${o.label} ${d.count[o.key]}건`} className="h-full first:rounded-l-full last:rounded-r-full transition-[width] duration-500" style={{ width: `${(d.count[o.key] / d.total) * 100}%`, background: o.color }} />
                ) : null,
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1.5">
              {OUTCOME.map((o) => (
                <div key={o.key} className="flex items-center gap-2 text-[14px]">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: o.color }} />
                  <span className="text-ink-body">{o.label}</span>
                  <span className="font-semibold text-ink-strong">{d.count[o.key]}건</span>
                  <span className="text-ink-weak">{Math.round((d.count[o.key] / d.total) * 100)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <Stat label="승인된 사례 카드" value={d.cards} unit="장" note={`판단 이유 채움 ${d.reason}%`} />
        <Stat label="카드가 근거로 쓰인 횟수" value={d.uses} unit="회" note={`도움 됐다는 응답 ${d.helpful}회`} />
        <Stat label="점장 답 기다림" value={d.count.escalated} unit="건" tone={d.count.escalated ? 'warning' : undefined} note="점장 할 일에서 답해요" />
        <Stat label="점장 답이 새 카드로" value={d.became} unit="장" tone={d.became ? 'success' : undefined} note="같은 질문은 다음부터 위키가 답해요" />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
        <Panel title="지식이 쌓이는 모습" action={<MoreLink to="/graph">크게 보기</MoreLink>}>
          <GraphCanvas graph={graph} fresh={fresh} height={440} spotlight />
          <div className="mt-4">
            <Legend compact />
          </div>
        </Panel>
        <Panel title="지금 일하는 에이전트" action={<MoreLink to="/agents">팀 보기</MoreLink>} className="flex flex-col xl:max-h-[566px]">
          <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
            {runs[0] && harness ? <RunCard run={runs[0]} harness={harness} compact /> : <Empty>질문이나 기록이 들어오면 에이전트 팀이 순서대로 일하는 모습이 보여요.</Empty>}
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Panel title="점장 답을 기다리는 질문" action={<MoreLink to="/manager">점장 할 일</MoreLink>}>
          {d.waiting.length ? (
            <ul className="-mx-2">
              {d.waiting.slice(0, 4).map((q) => (
                <li key={q.id}>
                  <Link to="/manager" className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-surface-subtle">
                    <span className="h-2 w-2 flex-none rounded-full bg-warning" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-medium text-ink-strong">{q.text}</p>
                      <p className="text-[12px] text-ink-weak">
                        {name(q.askerId)} · {fmtTime(q.time)}
                      </p>
                    </div>
                    <ChevronRight size={16} className="flex-none text-ink-disabled" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>기다리는 질문이 없어요</Empty>
          )}
        </Panel>

        <Panel title="위키에 방금 쌓인 것" action={<MoreLink to="/wiki">매장 위키</MoreLink>}>
          <ul className="space-y-1">
            {feed.map((w, i) => (
              <li key={`${w.runId}-${i}`} className={cx('rounded-xl px-3 py-2.5', i === 0 && wikiFeed.length ? 'animate-rise bg-brand-weak' : 'bg-transparent')}>
                <p className="text-[14px] font-semibold text-ink-strong">{w.op}</p>
                <p className="truncate text-[13px] text-ink-weak">{w.detail}</p>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="노하우를 남긴 사람">
          <ul className="space-y-3.5">
            {veterans.map(({ p, n, helped }) => (
              <li key={p.id} className={cx('flex items-center gap-3 rounded-xl', fresh.has(p.id) && 'ring-2 ring-brand ring-offset-4')}>
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[#F4F3FF] text-[14px] font-bold text-[#6941C6]">{p.name[0]}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-[15px] font-semibold text-ink-strong">
                      {p.name} <span className="text-[12px] font-normal text-ink-weak">{p.role} · {p.tenure}</span>
                    </p>
                    <p className="text-[13px] text-ink-body">도움 {helped}회</p>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-subtle">
                      <div className="h-full rounded-full bg-[#6941C6]" style={{ width: `${(helped / topHelped) * 100}%` }} />
                    </div>
                    <span className="w-12 text-right text-[12px] text-ink-weak">사례 {n}개</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[12px] leading-5 text-ink-weak">남긴 노하우가 도운 횟수로 크레딧을 받아요. 신입의 질문 수는 평가에 쓰지 않아요.</p>
        </Panel>
      </div>
    </div>
  );
}

function MoreLink({ to, children }: { to: string; children: string }) {
  return (
    <Link to={to} className="inline-flex items-center gap-0.5 text-[13px] font-semibold text-ink-weak hover:text-ink-body">
      {children} <ArrowRight size={14} />
    </Link>
  );
}

export function RunCard({ run, harness, compact }: { run: RunView; harness: HarnessConfig; compact?: boolean }) {
  const flow = Object.values(harness.flows).find((f) => f.name === run.flowName);
  const agentName = (id: string) => harness.agents.find((a) => a.id === id)?.name ?? id;
  const teamOf = (id: string) => harness.agents.find((a) => a.id === id)?.team ?? 'lead';
  const done = new Map(run.steps.map((s) => [s.agentId, s]));
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <Badge tone="brand">{run.flowName}</Badge>
        <span className="text-[13px] text-ink-weak">{run.actor}</span>
        {!run.done && <span className="ml-auto text-[12px] font-semibold text-brand">진행 중</span>}
      </div>
      <p className="mb-3 line-clamp-2 text-[15px] font-medium text-ink-strong">{run.input}</p>
      <ol className="relative space-y-0.5">
        {(flow?.steps ?? run.steps.map((s) => s.agentId)).map((id) => {
          const s = done.get(id);
          const active = run.running === id;
          const team = TEAM_STYLE[teamOf(id)];
          return (
            <li key={id} className={cx('flex items-start gap-2.5 rounded-lg px-2.5 py-1.5', active && 'bg-brand-weak')}>
              <span className={cx('mt-[7px] h-2.5 w-2.5 flex-none rounded-full', active && 'animate-pulse-ring')} style={{ background: s || active ? team.color : '#D0D5DD' }} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold" style={{ color: s || active ? team.color : '#8B95A1' }}>
                  {agentName(id)}
                  {s && s.via !== 'rules' && <span className="ml-1.5 text-[11px] font-medium text-ink-weak">{s.via === 'claude' ? 'Claude' : s.via === 'ollama' ? '로컬 AI' : s.via}</span>}
                  {s?.status === 'blocked' && <span className="ml-1.5 text-[11px] font-semibold text-warning">걸림</span>}
                </p>
                {s && <p className={cx('text-[12px] leading-[18px] text-ink-body', compact && 'line-clamp-2')}>{s.summary}</p>}
              </div>
            </li>
          );
        })}
      </ol>
      {run.gates.map((g) => (
        <p key={g.gateId} className={cx('mt-2 rounded-lg px-2.5 py-1.5 text-[12px]', g.passed ? 'bg-success-weak text-success' : 'bg-warning-weak text-warning', compact && 'line-clamp-2')}>
          검증 게이트 {g.gateId}: {g.passed ? '통과' : `${g.problems.length}건 → ${g.action}`}
        </p>
      ))}
      {run.done && <p className="mt-3 rounded-lg bg-surface-subtle px-3 py-2 text-[13px] font-semibold text-ink-strong">결과: {run.summary}</p>}
    </div>
  );
}
