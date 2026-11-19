// 실행 하나의 진행(관광공사 agent-work-line + 금융 LiveExecutionPanel).
// 진행 중: 지금 일하는 에이전트와 'N초 경과'(실제 agent-start 시각 기준) + 지나간 단계.
// 끝나면 한 줄 요약으로 접힌다. 펼치면 단계·게이트 기록이 그대로 있다. 이벤트 없이 움직이는 표시는 없다.
import { CircleCheck, CircleX, Loader2, ShieldAlert, ShieldCheck } from 'lucide-react';
import type { RunView } from '../api/live';
import { elapsedSec, useNow } from '../lib/useNow';
import { cx } from '../lib/format';
import { ViaBadge } from './Badge';

function StepList({ run, n }: { run: RunView; n: (id: string) => string }) {
  return (
    <ol className="mt-1.5 space-y-1">
      {run.steps.map((s, i) => (
        <li key={i} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-caption">
          <span className={cx('inline-flex items-center gap-1 font-medium', s.status === 'ok' ? 'text-done' : s.status === 'skipped' ? 'text-text-muted' : 'text-amber-text')}>
            {s.status === 'ok' ? <CircleCheck size={13} aria-hidden /> : <CircleX size={13} aria-hidden />}
            {n(s.agentId)}
          </span>
          <ViaBadge via={s.via} />
          <span className="num dev text-text-muted">{s.ms}ms</span>
          <span className="min-w-0 text-text-subtle">{s.summary}</span>
        </li>
      ))}
      {run.gates.map((g, i) => (
        <li key={`g${i}`} className={cx('flex flex-wrap items-center gap-1.5 text-caption', g.passed ? 'text-done' : 'text-amber-text')}>
          {g.passed ? <ShieldCheck size={13} aria-hidden /> : <ShieldAlert size={13} aria-hidden />}
          게이트 <span className="num">{g.gateId}</span> {g.passed ? '통과' : `막힘: ${g.problems.join(', ')}`}
          {!g.passed && g.action && <span className="text-text-muted">→ {g.action}</span>}
        </li>
      ))}
    </ol>
  );
}

export function RunProgress({ run, names, compact }: { run: RunView | null; names?: Record<string, string>; compact?: boolean }) {
  const now = useNow(!!run && !run.done && !!run.runningSince);
  if (!run)
    return (
      <p className="flex items-center gap-2 text-caption text-text-muted" role="status">
        <Loader2 size={13} className="animate-spin" aria-hidden />
        실행을 시작했어요. 첫 기록을 기다리고 있어요
      </p>
    );
  const n = (id: string) => names?.[id] ?? id;
  const sec = elapsedSec(run.runningSince, now);
  const blocked = run.gates.filter((g) => !g.passed).length;

  if (run.done)
    return (
      <details className="group" role="status">
        <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2 text-caption text-text-subtle">
          {run.ok ? <CircleCheck size={14} className="text-done" aria-hidden /> : <CircleX size={14} className="text-amber-text" aria-hidden />}
          <b className="text-text">{run.flowName}</b>
          <span>{run.ok ? '끝났어요' : '멈췄어요'} · 에이전트 {run.steps.length}명{run.gates.length > 0 && ` · 게이트 ${run.gates.length - blocked}/${run.gates.length} 통과`}</span>
          <span className="num dev text-text-muted">{run.runId}</span>
          <span className="text-ink underline-offset-2 group-open:hidden hover:underline">기록 펼치기</span>
          <span className="hidden text-ink underline-offset-2 group-open:inline hover:underline">접기</span>
        </summary>
        {run.summary && <p className="mt-1 text-caption text-text-subtle">{run.summary}</p>}
        <StepList run={run} n={n} />
      </details>
    );

  return (
    <div role="status" aria-live="polite">
      <div className="flex flex-wrap items-center gap-2 text-caption text-text-subtle">
        <Loader2 size={14} className="animate-spin text-ink" aria-hidden />
        <b className="text-text">{run.flowName}</b>
        <span>{run.running ? `${n(run.running)} 일하는 중` : '다음 단계로 넘기는 중'}</span>
        {sec != null && <span className="num text-text-muted">{sec}초 경과</span>}
        <span className="num dev text-text-muted">{run.runId}</span>
      </div>
      {!compact && <StepList run={run} n={n} />}
    </div>
  );
}
