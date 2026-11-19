// 에이전트 카드(masdae AgentCard): 이름 + id + 상태 알약 → 요약 3줄 → via · ms · 막힘 수.
// 실행 중이면 윗선 shimmer와 'N초 경과'(agent-start 이벤트 시각 기준). 움직임은 실제 이벤트가 있는 동안만.
import { Lock, ShieldAlert } from 'lucide-react';
import type { AgentStep } from '@shared/contracts';
import { StatusPill, ViaBadge, type LiveStatus } from '@/shared/ui';
import { cx } from '@/shared/lib/format';
import type { Declared } from './declare';

export function AgentCard({ a, live, step, blocked, elapsed, onOpen }: { a: Declared; live: LiveStatus; step?: AgentStep; blocked: number; elapsed: number | null; onOpen: () => void }) {
  const dim = live === 'wait' || live === 'skipped' || live === 'idle';
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cx(
        'group relative w-full overflow-hidden rounded-card border bg-surface p-3 text-left shadow-card transition hover:-translate-y-0.5 hover:shadow-pop',
        live === 'running' ? 'border-ink ring-2 ring-[rgba(35,24,21,0.25)]' : live === 'blocked' || live === 'error' ? 'border-amber-bar' : 'border-line',
        live === 'idle' && 'opacity-60',
      )}
      aria-label={`${a.name} 자세히 보기`}
    >
      {live === 'running' && (
        <div className="absolute inset-x-0 top-0 h-[3px] overflow-hidden" aria-hidden>
          <div className="h-full w-1/2 animate-shimmer bg-yellow" />
        </div>
      )}
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1.5 text-body font-bold text-text">
            <span className="num shrink-0 whitespace-nowrap text-caption font-medium text-text-muted">{a.step}</span>
            <span className="min-w-0">{a.name}</span>
            {a.locked && <Lock size={12} className="shrink-0 self-center text-text-muted" aria-label="끌 수 없음" />}
          </div>
          <div className="num dev truncate text-[0.6875rem] text-text-muted">{a.id}</div>
        </div>
        <StatusPill live={live} />
      </div>
      <p className={cx('mt-2 line-clamp-3 min-h-[3.9em] text-caption leading-relaxed', dim ? 'text-text-muted' : 'text-text-subtle')}>
        {step?.summary ?? (live === 'running' ? '일하는 중이에요' : live === 'skipped' ? '이번 실행에서 건너뛰었어요' : a.role)}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 border-t border-line pt-2 text-caption text-text-muted">
        {step ? <ViaBadge via={step.via} /> : <span>{a.kind}</span>}
        <span className="num dev">{step ? `${step.ms.toLocaleString()} ms` : '— ms'}</span>
        {elapsed != null && <span className="num font-bold text-ink">{elapsed}초 경과</span>}
        {blocked > 0 && (
          <span className="inline-flex items-center gap-0.5 font-bold text-amber-text">
            <ShieldAlert size={12} aria-hidden />막힘 {blocked}
          </span>
        )}
      </div>
    </button>
  );
}
