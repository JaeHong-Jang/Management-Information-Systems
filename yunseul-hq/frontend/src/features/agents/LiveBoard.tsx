// 실시간 팀 보드(masdae agent-team): 실행 고르기 → 흐름 레일 → 지휘 줄 → 팀 열 × 에이전트 카드 → 게이트 → 실행 기록.
// 상태는 SSE(useLive)와 GET /api/runs/:id에서만 온다. 실행이 없으면 모두 '대기'로 멈춰 있다.
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Play } from 'lucide-react';
import type { HarnessConfig } from '@shared/contracts';
import { api } from '@/shared/api/client';
import { useLive, type RunView } from '@/shared/api/live';
import { useRunAction } from '@/shared/api/useRunAction';
import { elapsedSec, useNow } from '@/shared/lib/useNow';
import { cx, time } from '@/shared/lib/format';
import { Button, Empty, InlineError, StatusPill } from '@/shared/ui';
import { AgentCard } from './AgentCard';
import { FlowRail } from './FlowRail';
import { GatePanel } from './GatePanel';
import { RunLog } from './RunLog';
import { StepDrawer } from './StepDrawer';
import { declare } from './declare';
import { agentStatus, blockedCount, flowAgents, stepsOf } from './derive';

export function LiveBoard({ h, storeName, targetId, targetName }: { h: HarnessConfig; storeName: Map<string, string>; targetId: string | null; targetName: string }) {
  const { runs, connected } = useLive();
  const [pinned, setPinned] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const kick = useRunAction(() => undefined);
  // 기본은 가장 최근 실행이되, 화면을 열 때마다 도는 위키 점검(lint)은 팀이 거의 비어 보이므로 건너뛴다
  const run: RunView | null = (pinned && runs.find((r) => r.runId === pinned)) || runs.find((r) => r.flow !== 'lint') || runs[0] || null;
  const agents = useMemo(() => declare(h), [h]);
  const names = useMemo(() => Object.fromEntries(h.agents.map((a) => [a.id, a.name])), [h]);
  const inFlow = flowAgents(h, run);
  const now = useNow(!!run && !run.done);
  const workers = agents.filter((a) => a.team !== 'lead' && inFlow.has(a.id));
  const finished = workers.filter((a) => !['wait', 'running'].includes(agentStatus(a, run, inFlow))).length;
  const lead = agents.find((a) => a.team === 'lead');
  const teams = h.teams.filter((t) => t.id !== 'lead');
  const openAgent = agents.find((a) => a.id === open) ?? null;

  const status = !run ? '아직 실행이 없어요' : run.done ? (run.ok ? '실행 끝' : '멈춤') : '실행 중';

  return (
    <div className="space-y-5">
      <div className="rounded-card border border-line bg-surface px-3 py-3 shadow-card sm:px-5">
        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="inline-flex items-center gap-1.5 text-body font-bold">
            {run && !run.done && <Loader2 size={14} className="animate-spin" aria-hidden />}
            {status}
          </span>
          {run && <span className="num text-caption text-text-muted">{finished} / {workers.length} 에이전트</span>}
          {run && <span className="text-caption text-text-muted">{run.flowName} · {run.storeId ? storeName.get(run.storeId) ?? run.storeId : '본사'} · {run.actor}</span>}
          {run && <span className="num dev text-[0.6875rem] text-text-muted">{run.runId}</span>}
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {runs.length > 0 && (
              <label className="flex items-center gap-1.5 text-caption text-text-muted">
                실행 고르기
                <select
                  className="h-10 max-w-[260px] rounded-ctl border border-line-strong bg-surface px-2 text-body text-text"
                  value={pinned ?? ''}
                  onChange={(e) => setPinned(e.target.value || null)}
                >
                  <option value="">가장 최근 실행 따라가기</option>
                  {runs.map((r) => (
                    <option key={r.runId} value={r.runId}>
                      {time(r.at)} · {r.flowName} · {r.storeId ? storeName.get(r.storeId) ?? r.storeId : '본사'} · {r.done ? (r.ok ? '끝' : '멈춤') : '실행 중'}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {targetId && (
              <Button variant="primary" icon={Play} busy={kick.active} onClick={() => { setPinned(null); void kick.start(() => api.diagnose(targetId)); }}>
                {targetName} 진단 실행
              </Button>
            )}
          </div>
        </div>
        <FlowRail h={h} run={run} />
        <InlineError message={kick.error} />
        {!connected && <p className="mt-2 text-caption text-amber-text">실시간 연결이 끊겼어요. 다시 붙는 동안 새 실행이 늦게 보일 수 있어요.</p>}
      </div>

      {!run && (
        <Empty title="아직 실행 기록이 없어요">
          위의 진단 실행을 누르거나, <Link to={targetId ? `/hq/stores/${targetId}` : '/hq'} className="text-ink underline">매장 상세</Link>에서 '진단 실행'이나 '처방 만들기'를 누르면 여기서 실시간으로 보여요.
        </Empty>
      )}

      {lead && (
        <div className="flex flex-wrap items-center gap-3 rounded-card border border-line bg-surface px-4 py-3 shadow-card">
          <span className="font-display text-body">지휘</span>
          <button type="button" onClick={() => setOpen(lead.id)} className="font-bold text-ink underline-offset-2 hover:underline">{lead.name}</button>
          <StatusPill live={agentStatus(lead, run, inFlow)} />
          <span className="min-w-0 flex-1 text-caption text-text-subtle">{run ? (run.done ? run.summary || '흐름을 마쳤어요' : `${run.flowName} 흐름을 배정했어요 · 입력: ${run.input || '—'}`) : lead.role}</span>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {teams.map((t) => {
          const members = agents.filter((a) => a.team === t.id);
          const active = members.some((a) => inFlow.has(a.id));
          return (
            <section key={t.id} aria-label={t.name} className={cx('rounded-card border p-3', active ? 'border-[#C9BDB8] bg-surface-sunken' : 'border-line bg-surface-sunken')}>
              <header className="mb-3 flex items-center gap-2 px-1">
                <span className={cx('h-2.5 w-2.5 rounded-full', active ? 'bg-ink' : 'bg-line-strong')} aria-hidden />
                <h3 className="font-display text-body">{t.name}</h3>
                <span className="ml-auto text-caption text-text-muted">{active ? '이번 흐름' : run ? '이번 흐름 아님' : `${members.length}명`}</span>
              </header>
              <div className="space-y-2.5">
                {members.map((a) => {
                  const live = agentStatus(a, run, inFlow);
                  return (
                    <AgentCard
                      key={a.id}
                      a={a}
                      live={live}
                      step={stepsOf(run, a.id).at(-1)}
                      blocked={blockedCount(h, run, a.id)}
                      elapsed={run && run.running === a.id ? elapsedSec(run.runningSince, now) : null}
                      onOpen={() => setOpen(a.id)}
                    />
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <GatePanel h={h} run={run} names={names} />
        {run && <RunLog run={run} names={names} />}
      </div>

      {openAgent && <StepDrawer h={h} a={openAgent} live={agentStatus(openAgent, run, inFlow)} run={run} onClose={() => setOpen(null)} />}
    </div>
  );
}
