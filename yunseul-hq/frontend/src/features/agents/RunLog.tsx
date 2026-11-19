// 실행 기록(GET /api/runs/:id). 금융 LiveExecutionPanel처럼 실행 중에는 펼쳐 두고, 끝나는 순간 접는다. 그 뒤로는 사람이 여닫는다.
import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { RunEvent } from '@shared/contracts';
import { api } from '@/shared/api/client';
import type { RunView } from '@/shared/api/live';
import { useAsync } from '@/shared/lib/useAsync';
import { Panel, ViaBadge } from '@/shared/ui';
import { cx, time } from '@/shared/lib/format';

export function RunLog({ run, names }: { run: RunView; names: Record<string, string> }) {
  const trace = useAsync(() => api.run(run.runId), [run.runId, run.steps.length, run.gates.length, run.done]);
  const [open, setOpen] = useState(!run.done);
  useEffect(() => setOpen(!run.done), [run.done, run.runId]);
  const n = (id: string) => names[id] ?? id;
  const events = trace.data?.events ?? [];
  return (
    <Panel
      title="실행 기록"
      en="LOG"
      sub={run.done ? '끝난 실행이라 접어 두었어요' : '실행 중에는 펼쳐 둬요'}
      actions={
        <button type="button" aria-expanded={open} aria-controls="run-log" onClick={() => setOpen((v) => !v)} className="inline-flex h-9 items-center gap-1 rounded-ctl border border-line-strong px-3 text-caption text-ink hover:bg-ink-weak">
          {open ? '접기' : `펼치기 · ${events.length}줄`}
          <ChevronDown size={14} aria-hidden className={cx('transition', open && 'rotate-180')} />
        </button>
      }
      bodyClass={open ? 'p-4' : 'hidden'}
    >
      <ol id="run-log" className="space-y-1.5">
        {events.map((e, i) => (
          <li key={i} className="grid grid-cols-[64px_minmax(0,1fr)] gap-2 text-caption">
            <span className="num text-text-muted">{time(e.at)}</span>
            <EventLine e={e} n={n} />
          </li>
        ))}
        {events.length === 0 && <li className="text-caption text-text-muted">{trace.error ? `기록을 불러오지 못했어요: ${trace.error}` : '기록을 불러오는 중이에요'}</li>}
      </ol>
    </Panel>
  );
}

function EventLine({ e, n }: { e: RunEvent; n: (id: string) => string }) {
  switch (e.type) {
    case 'run-start':
      return <span><b>{e.flowName}</b> 시작 · {e.actor}{e.input ? ` · 입력: ${e.input}` : ''}</span>;
    case 'agent-start':
      return <span className="text-text-subtle">{n(e.agentId)} 시작</span>;
    case 'agent-end':
      return (
        <span className="flex flex-wrap items-center gap-1.5">
          <b className={e.step.status === 'ok' ? 'text-done' : e.step.status === 'skipped' ? 'text-text-muted' : 'text-amber-text'}>{n(e.step.agentId)} {e.step.status === 'ok' ? '완료' : e.step.status === 'skipped' ? '건너뜀' : e.step.status === 'blocked' ? '막힘' : '오류'}</b>
          <ViaBadge via={e.step.via} />
          <span className="num dev text-text-muted">{e.step.ms}ms</span>
          <span>{e.step.summary}</span>
          {e.step.problems?.length ? <span className="text-amber-text">문제: {e.step.problems.join(', ')}</span> : null}
        </span>
      );
    case 'gate':
      return (
        <span className={e.gate.passed ? 'text-done' : 'text-amber-text'}>
          게이트 <span className="num">{e.gate.gateId}</span> {e.gate.passed ? '통과' : `막힘 · ${e.gate.problems.join(', ')} → ${e.gate.action}`}
        </span>
      );
    case 'wiki':
      return <span className="text-text-subtle">위키 {e.change.op}: {e.change.detail}</span>;
    case 'run-end':
      return <span><b className={e.ok ? 'text-done' : 'text-amber-text'}>{e.ok ? '끝남' : '멈춤'}</b> · {e.summary}</span>;
  }
}
