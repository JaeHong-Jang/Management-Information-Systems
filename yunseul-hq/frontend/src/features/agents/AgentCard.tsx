import { ChevronRight } from 'lucide-react';
import type { AgentStep } from '@shared/contracts';
import { StatusPill, type LiveStatus } from '@/shared/ui';
import type { Declared } from './declare';

export function AgentCard({ a, order, live, step, summary, blocked, elapsed, onOpen }: {
  a: Declared; order: number; live: LiveStatus; step?: AgentStep; summary?: string; blocked: number; elapsed: number | null; onOpen: () => void;
}) {
  return (
    <button type="button" className="ops-stage" onClick={onOpen} aria-label={`${a.name} 단계 상세`}>
      <span className="ops-order">{order}</span>
      <span className="ops-stage-main">
        <span className="ops-stage-meta">{a.teamName}{step && <span className="dev"> · {step.ms.toLocaleString()} ms</span>}</span>
        <strong>{a.name}</strong>
        <span className="ops-stage-summary">{summary || step?.summary || a.role}</span>
      </span>
      <span className="ops-stage-state"><StatusPill live={live} />{elapsed != null && <small>{elapsed}초 경과</small>}{blocked > 0 && <small>차단 {blocked}건</small>}</span>
      <ChevronRight className="ops-chevron" size={15} aria-hidden />
    </button>
  );
}
