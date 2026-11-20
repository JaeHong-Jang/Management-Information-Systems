import { HelpCircle, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import type { StoreScore } from '@shared/contracts';

const T = {
  worse: { icon: TrendingDown, label: '나빠짐', cls: 'text-amber-text' },
  better: { icon: TrendingUp, label: '좋아짐', cls: 'text-done' },
  flat: { icon: Minus, label: '비슷', cls: 'text-text-subtle' },
  unknown: { icon: HelpCircle, label: '미확인', cls: 'text-text-muted' },
} as const;

/** 2025년 이후 평균 vs 전체 평균 */
export function TrendMark({ trend }: { trend: StoreScore['trend'] }) {
  const t = T[trend];
  const Icon = t.icon;
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap text-caption ${t.cls}`}>
      <Icon size={14} aria-hidden />
      {t.label}
    </span>
  );
}
