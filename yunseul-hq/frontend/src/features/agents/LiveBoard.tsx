import { useMemo, useState } from 'react';
import { Play } from 'lucide-react';
import type { HarnessConfig } from '@shared/contracts';
import { api } from '@/shared/api/client';
import { useLive } from '@/shared/api/live';
import { useRunAction } from '@/shared/api/useRunAction';
import { time } from '@/shared/lib/format';
import { elapsedSec, useNow } from '@/shared/lib/useNow';
import { Button, InlineError, Panel, StatusPill } from '@/shared/ui';
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
  const history = kick.run && !runs.some((r) => r.runId === kick.run?.runId) ? [kick.run, ...runs] : runs;
  const run = history.find((r) => r.runId === pinned) ?? history[0] ?? null;
  const agents = useMemo(() => declare(h), [h]);
  const names = useMemo(() => Object.fromEntries(h.agents.map((a) => [a.id, a.name])), [h]);
  const inFlow = flowAgents(h, run);
  const now = useNow(!!run && !run.done);
  const members = Array.from(inFlow).flatMap((id) => agents.filter((a) => a.id === id));
  const openAgent = agents.find((a) => a.id === open);
  const completed = members.filter((a) => agentStatus(a, run, inFlow) === 'ok').length;

  return (
    <div className="ops-workspace">
      <section className="ops-query" aria-label="실행 선택 및 진단">
        <label>
          <span>조회 대상</span>
          <select aria-label="조회 대상" value={pinned && history.some((r) => r.runId === pinned) ? pinned : ''} onChange={(e) => setPinned(e.target.value || null)}>
            <option value="">최근 실행 자동 선택</option>
            {history.map((r) => (
              <option key={r.runId} value={r.runId}>
                {time(r.at)} · {r.flowName} · {r.storeId ? storeName.get(r.storeId) ?? r.storeId : '본사'} · {r.done ? (r.ok ? '완료' : '중단') : '진행 중'}
              </option>
            ))}
          </select>
        </label>
        {targetId && (
          <Button variant="primary" icon={Play} busy={kick.active} onClick={() => void kick.start(async () => {
            const accepted = await api.diagnose(targetId);
            setPinned(accepted.runId);
            return accepted;
          })}>
            {targetName} 진단 실행
          </Button>
        )}
      </section>
      <InlineError message={kick.error} />
      {!connected && <p role="status" className="ops-notice">실시간 연결 복구 중 · 새 실행 기록 반영 지연</p>}
      {!run ? (
        <Panel title="실행 이력"><p className="text-body text-text-muted">조회 가능한 실행 기록 없음</p></Panel>
      ) : (
        <>
          <section className="ops-overview" aria-labelledby="ops-current-run">
            <header>
              <div className="ops-title-line">
                <h2 id="ops-current-run">{run.flowName}</h2>
                <StatusPill live={run.done ? (run.ok ? 'ok' : 'error') : 'running'} label={run.done ? (run.ok ? '완료' : '중단') : '진행 중'} />
              </div>
              <span className="ops-identifier dev">{run.runId}</span>
            </header>
            <dl className="ops-facts">
              <div><dt>대상</dt><dd>{run.storeId ? storeName.get(run.storeId) ?? run.storeId : '본사'}</dd></div>
              <div><dt>실행자</dt><dd>{run.actor}</dd></div>
              <div><dt>시작 시각</dt><dd>{time(run.at)}</dd></div>
              <div><dt>완료 단계</dt><dd>{completed} / {members.length}</dd></div>
            </dl>
            <FlowRail h={h} run={run} />
          </section>

          <div className="ops-content">
            <Panel title="담당 단계" bodyClass="p-0" actions={<span className="text-caption text-text-muted">총 {members.length}개</span>}>
              <ol className="ops-stage-list">
                {members.map((a, i) => (
                  <li key={a.id}>
                    <AgentCard a={a} order={i + 1} live={agentStatus(a, run, inFlow)}
                      step={stepsOf(run, a.id).at(-1)}
                      summary={a.team === 'lead' ? run.input : undefined}
                      blocked={blockedCount(h, run, a.id)}
                      elapsed={run.running === a.id ? elapsedSec(run.runningSince, now) : null}
                      onOpen={() => setOpen(a.id)} />
                  </li>
                ))}
              </ol>
            </Panel>
            <GatePanel h={h} run={run} names={names} />
          </div>
          <RunLog key={run.runId} run={run} names={names} />
        </>
      )}
      {openAgent && <StepDrawer h={h} a={openAgent} live={agentStatus(openAgent, run, inFlow)} run={run} onClose={() => setOpen(null)} />}
    </div>
  );
}
