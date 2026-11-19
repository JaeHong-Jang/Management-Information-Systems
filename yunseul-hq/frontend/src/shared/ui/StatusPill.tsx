// 에이전트 상태 알약(masdae StatusPill). 막힘·오류도 빨강이 아니라 주의 색(빨강 = 고위험).
// 실행 중 점의 깜빡임은 실제 agent-start 이벤트를 받은 동안에만 켜진다.
import { cx } from '../lib/format';

export type LiveStatus = 'wait' | 'running' | 'ok' | 'blocked' | 'error' | 'skipped' | 'idle';

export const LIVE_STATUS: Record<LiveStatus, { label: string; pill: string; dot: string }> = {
  idle: { label: '대상 아님', pill: 'border-line text-text-muted bg-surface', dot: 'bg-line' },
  wait: { label: '대기', pill: 'border-line-strong text-text-subtle bg-surface', dot: 'bg-low-bar' },
  running: { label: '실행 중', pill: 'border-ink text-ink bg-ink-weak', dot: 'bg-ink' },
  ok: { label: '완료', pill: 'border-done text-done bg-done-weak', dot: 'bg-done' },
  blocked: { label: '막힘', pill: 'border-amber-bar text-amber-text bg-amber-weak', dot: 'bg-amber-text' },
  error: { label: '오류', pill: 'border-amber-bar text-amber-text bg-amber-weak', dot: 'bg-amber-text' },
  skipped: { label: '건너뜀', pill: 'border-line text-text-muted bg-surface-sunken', dot: 'bg-line-strong' },
};

export function StatusPill({ live, label }: { live: LiveStatus; label?: string }) {
  const m = LIVE_STATUS[live];
  return (
    <span className={cx('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-px text-caption', m.pill)}>
      <span className={cx('relative h-1.5 w-1.5 rounded-full', m.dot)}>
        {live === 'running' && <span className="absolute inset-0 animate-ping rounded-full bg-[rgba(35,24,21,0.6)]" />}
      </span>
      {label ?? m.label}
    </span>
  );
}
