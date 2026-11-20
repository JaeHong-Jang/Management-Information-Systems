import { useState } from 'react';
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
  const n = (id: string) => names[id] ?? id;
  const events = trace.data?.events ?? [];
  return (
    <Panel
      title="실행 기록"
      actions={
        <button type="button" aria-expanded={open} aria-controls="run-log" onClick={() => setOpen((v) => !v)} className="inline-flex h-9 items-center gap-1 rounded-ctl border border-line-strong px-3 text-caption text-ink hover:bg-ink-weak">
          {open ? '기록 접기' : `기록 조회 · ${events.length}건`}
          <ChevronDown size={14} aria-hidden className={cx('transition', open && 'rotate-180')} />
        </button>
      }
      bodyClass={open ? 'p-4' : 'hidden'}
    >
      <ol id="run-log" className="divide-y divide-line">
        {events.map((e, i) => (
          <li key={i} className="grid grid-cols-[4rem_minmax(0,1fr)] gap-2 py-2 text-body">
            <span className="num text-text-muted">{time(e.at)}</span>
            <EventLine e={e} n={n} />
          </li>
        ))}
        {events.length === 0 && <li className="text-caption text-text-muted">{trace.error ? `기록 조회 실패 · ${trace.error}` : (trace.loading ? '기록 조회 중' : '기록 없음')}</li>}
      </ol>
    </Panel>
  );
}

function EventLine({ e, n }: { e: RunEvent; n: (id: string) => string }) {
  switch (e.type) {
    case 'run-start':
      return <span><b>{e.flowName}</b> 시작 · {e.actor}{e.input ? ` · 입력 ${e.input}` : ''}</span>;
    case 'agent-start':
      return <span className="text-text-subtle">{n(e.agentId)} 시작</span>;
    case 'agent-end':
      return (
        <span className="flex flex-wrap items-center gap-1.5">
          <b className={e.step.status === 'ok' ? 'text-done' : e.step.status === 'skipped' ? 'text-text-muted' : 'text-amber-text'}>{n(e.step.agentId)} {e.step.status === 'ok' ? '완료' : e.step.status === 'skipped' ? '생략' : e.step.status === 'blocked' ? '차단' : '오류'}</b>
          <ViaBadge via={e.step.via} />
          <span className="num dev text-text-muted">{e.step.ms}ms</span>
          <span>{e.step.summary}</span>
          {e.step.problems?.length ? <span className="text-amber-text">확인 항목 · {e.step.problems.join(', ')}</span> : null}
        </span>
      );
    case 'gate':
      return (
        <span className={e.gate.passed ? 'text-done' : 'text-amber-text'}>
          검증 기준 <span className="num">{e.gate.gateId}</span> {e.gate.passed ? '통과' : `차단 · ${e.gate.problems.join(', ')} → ${e.gate.action}`}
        </span>
      );
    case 'wiki':
      return <span className="text-text-subtle">위키 {e.change.op}: {e.change.detail}</span>;
    case 'run-end':
      return <span><b className={e.ok ? 'text-done' : 'text-amber-text'}>{e.ok ? '완료' : '중단'}</b> · {e.summary}</span>;
  }
}
