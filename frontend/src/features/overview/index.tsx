// 실시간 개요: 지식이 쌓이는 그래프 + 지금 일하는 에이전트 + 사람. 발표 화면이 이 한 장이다.
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Play } from 'lucide-react';
import type { HarnessConfig } from '@shared/contracts';
import { api } from '@/shared/api/client';
import { useLive, type RunView } from '@/shared/api/live';
import { Badge, Button, Empty, Panel, cx, useToast } from '@/shared/ui';
import { TEAM_STYLE } from '@/shared/theme/tokens';
import { GraphCanvas, Legend } from '../ontology/GraphCanvas';

export default function Overview() {
  const { state, graph, fresh, runs, wikiFeed } = useLive();
  const [harness, setHarness] = useState<HarnessConfig | null>(null);
  const toast = useToast();
  useEffect(() => void api.harness().then(setHarness), []);

  const kpi = useMemo(() => {
    if (!state) return null;
    const approved = state.cards.filter((c) => c.status === 'approved');
    return {
      cards: approved.length,
      reason: approved.length ? Math.round((approved.filter((c) => c.reason.trim()).length / approved.length) * 100) : 0,
      byWiki: state.questions.filter((q) => q.status === 'answered').length,
      waiting: state.questions.filter((q) => q.status === 'escalated').length,
      became: state.questions.filter((q) => q.cardId).length,
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

  return (
    <>
      <section className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-caption text-brand-strong">알바가 바뀌어도 서비스가 같은 매장</p>
          <h1 className="text-title">선배의 판단 이유가 매장 위키에 쌓이고 있어요</h1>
          <p className="mt-1.5 max-w-2xl text-body text-ink-body">신입이 묻고, 위키가 모르면 점장이 답하고, 그 답이 다시 위키가 돼요. 에이전트 팀이 기록을 정리하고 근거를 검증해요.</p>
        </div>
        <Button onClick={play} disabled={state?.demoPlaying}>
          <Play size={16} /> {state?.demoPlaying ? '하루 재생 중' : '매장의 하루 재생'}
        </Button>
      </section>

      {kpi && (
        <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">
          <Stat label="승인된 사례 카드" value={kpi.cards} />
          <Stat label="판단 이유 채움" value={`${kpi.reason}%`} />
          <Stat label="위키가 답한 질문" value={kpi.byWiki} />
          <Stat label="점장 답을 기다리는 질문" value={kpi.waiting} tone={kpi.waiting ? 'warning' : undefined} />
          <Stat label="점장 답이 카드가 된 수" value={kpi.became} tone={kpi.became ? 'success' : undefined} />
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <Panel
          title="지식이 쌓이는 모습"
          action={
            <Link to="/graph" className="inline-flex items-center gap-1 text-[13px] font-semibold text-brand-strong">
              크게 보기 <ArrowRight size={14} />
            </Link>
          }
        >
          <GraphCanvas graph={graph} fresh={fresh} height={470} spotlight />
          <div className="mt-3">
            <Legend compact />
          </div>
        </Panel>

        <div className="space-y-5">
          <Panel title="지금 일하는 에이전트">{runs[0] && harness ? <RunCard run={runs[0]} harness={harness} /> : <Empty>요청이 들어오면 에이전트 팀이 순서대로 일하는 모습이 보여요.</Empty>}</Panel>
          <Panel title="위키에 방금 쌓인 것">
            <ul className="space-y-1.5">
              {(wikiFeed.length ? wikiFeed : (state?.log ?? []).map((l) => ({ at: l.time, op: l.op, detail: l.detail, runId: l.runId ?? l.time }))).slice(0, 6).map((w, i) => (
                <li key={`${w.runId}-${i}`} className={cx('rounded-lg px-3 py-2', i === 0 && wikiFeed.length ? 'animate-rise bg-brand-weak' : 'bg-surface-subtle')}>
                  <span className="text-[13px] font-semibold text-ink-strong">{w.op}</span>
                  <span className="ml-1.5 text-[12px] text-ink-weak">{w.detail}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>

      {state && (
        <Panel title="사람이 남긴 것" className="mt-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {state.people.map((p) => {
              const cards = state.cards.filter((c) => c.authorId === p.id && c.status === 'approved' && c.credit !== false);
              const helped = cards.reduce((s, c) => s + c.helpful, 0);
              return (
                <div key={p.id} className={cx('rounded-xl bg-surface-subtle p-3', fresh.has(p.id) && 'ring-2 ring-brand')}>
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#6941C6] text-[13px] font-bold text-white">{p.name[0]}</span>
                    <div>
                      <p className="text-[14px] font-semibold">{p.name}</p>
                      <p className="text-[12px] text-ink-weak">
                        {p.role} · {p.tenure}
                      </p>
                    </div>
                  </div>
                  <p className="mt-2 text-[13px] text-ink-body">{p.role === '신입' ? '질문은 개인별로 세지 않아요' : `사례 ${cards.length}개 · 도움 ${helped}회`}</p>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[12px] text-ink-weak">숙련 직원은 남긴 노하우가 도운 횟수로 크레딧을 받아요. 신입의 질문 수는 평가에 쓰지 않아요.</p>
        </Panel>
      )}
    </>
  );
}

function Stat({ label, value, tone }: { label: string; value: number | string; tone?: 'warning' | 'success' }) {
  return (
    <div className="rounded-card bg-surface p-4">
      <p className="text-[13px] text-ink-weak">{label}</p>
      <p className={cx('mt-1 text-[28px] font-bold leading-9', tone === 'warning' ? 'text-warning' : tone === 'success' ? 'text-success' : 'text-ink-strong')}>{value}</p>
    </div>
  );
}

export function RunCard({ run, harness }: { run: RunView; harness: HarnessConfig }) {
  const flow = Object.values(harness.flows).find((f) => f.name === run.flowName);
  const agentName = (id: string) => harness.agents.find((a) => a.id === id)?.name ?? id;
  const teamOf = (id: string) => harness.agents.find((a) => a.id === id)?.team ?? 'lead';
  const done = new Map(run.steps.map((s) => [s.agentId, s]));
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <Badge tone="brand">{run.flowName}</Badge>
        <span className="text-[13px] text-ink-weak">{run.actor}</span>
      </div>
      <p className="mb-3 line-clamp-2 text-[14px] text-ink-strong">{run.input}</p>
      <ol className="space-y-1.5">
        {(flow?.steps ?? run.steps.map((s) => s.agentId)).map((id) => {
          const s = done.get(id);
          const active = run.running === id;
          const team = TEAM_STYLE[teamOf(id)];
          return (
            <li key={id} className={cx('flex items-start gap-2 rounded-lg px-2.5 py-1.5', active && 'bg-brand-weak')}>
              <span className={cx('mt-1.5 h-2.5 w-2.5 flex-none rounded-full', active && 'animate-pulse-ring')} style={{ background: s || active ? team.color : '#D0D5DD' }} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold" style={{ color: s || active ? team.color : '#8B95A1' }}>
                  {agentName(id)}
                  {s && s.via !== 'rules' && <span className="ml-1.5 text-[11px] font-medium text-ink-weak">{s.via === 'claude' ? 'Claude' : s.via}</span>}
                  {s?.status === 'blocked' && <span className="ml-1.5 text-[11px] font-semibold text-warning">걸림</span>}
                </p>
                {s && <p className="text-[12px] text-ink-body">{s.summary}</p>}
              </div>
            </li>
          );
        })}
      </ol>
      {run.gates.map((g) => (
        <p key={g.gateId} className={cx('mt-2 rounded-lg px-2.5 py-1.5 text-[12px]', g.passed ? 'bg-success-weak text-success' : 'bg-warning-weak text-warning')}>
          검증 게이트 {g.gateId}: {g.passed ? '통과' : `${g.problems.length}건 → ${g.action}`}
        </p>
      ))}
      {run.done && <p className="mt-2 text-[13px] font-semibold text-ink-strong">결과: {run.summary}</p>}
    </div>
  );
}
