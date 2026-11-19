// KPI 타일(masdae KpiCards): 아이콘 + 라벨 → 모노 숫자 → 캡션 → 아래 노랑 2px 선.
// 로딩 '…', 값 없음 '—'. 고위험 숫자만 brand-red.
import type { LucideIcon } from 'lucide-react';
import { cx } from '../lib/format';

export function KpiTile({ icon: Icon, label, value, unit, note, loading, danger }: {
  icon: LucideIcon;
  label: string;
  value: number | null;
  unit?: string;
  note: string;
  loading?: boolean;
  /** 고위험 숫자: 0보다 크면 brand-red */
  danger?: boolean;
}) {
  const red = danger && (value ?? 0) > 0;
  return (
    <div className="relative min-w-0 overflow-hidden rounded-card border border-line bg-surface p-4 shadow-card">
      <div className="flex items-center gap-1.5 text-caption text-text-muted">
        <Icon size={14} aria-hidden className={red ? 'text-red' : undefined} />
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className={cx('num text-kpi tracking-tight', red ? 'text-red' : 'text-ink')}>{loading ? '…' : value == null ? '—' : value.toLocaleString('ko-KR')}</span>
        {unit && <span className="text-caption text-text-muted">{unit}</span>}
      </div>
      <p className="mt-1 truncate text-caption text-text-muted" title={note}>{note}</p>
      <div className="absolute inset-x-0 bottom-0 h-0.5 bg-yellow" aria-hidden />
    </div>
  );
}
