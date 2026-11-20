// 브랜드 전체 저평점 리뷰의 불만 유형 집계, 기본 원인 분류 색
import type { CauseClass, HqOverview } from '@shared/contracts';
import { CauseChip, Panel } from '@/shared/ui';
import { CAUSE, CAUSES } from '@/shared/theme/semantics';

export function CauseTotals({ totals }: { totals: HqOverview['complaintTotals'] }) {
  const sorted = [...totals].sort((a, b) => b.count - a.count);
  const max = Math.max(1, ...sorted.map((t) => t.count));
  const byCause = CAUSES.map((c) => ({ cause: c, n: totals.filter((t) => t.cause === c).reduce((s, t) => s + t.count, 0) }));
  const sum = Math.max(1, byCause.reduce((s, x) => s + x.n, 0));
  return (
    <Panel title="원인별 불만 집계" sub="2점 이하 리뷰 기준 · 유형별 기본 규칙으로 분류" className="h-full">
      <div className="mb-4">
        <div className="flex h-3 overflow-hidden rounded-full" role="img" aria-label={byCause.map((x) => `${x.cause} ${Math.round((x.n / sum) * 100)}%`).join(', ')}>
          {byCause.map((x) => (
            <span key={x.cause} className={CAUSE[x.cause].bar} style={{ width: `${(x.n / sum) * 100}%` }} />
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
          {byCause.map((x) => (
            <span key={x.cause} className="inline-flex items-center gap-1 text-caption">
              <CauseChip cause={x.cause as CauseClass} />
              <span className="num text-text-subtle">{Math.round((x.n / sum) * 100)}%</span>
            </span>
          ))}
        </div>
      </div>
      <ul className="space-y-1.5">
        {sorted.map((t) => {
          const c = CAUSE[t.cause];
          const Icon = c.icon;
          return (
            <li key={t.type} className="grid grid-cols-[112px_1fr_44px] items-center gap-2 text-body">
              <span className="truncate">{t.type}</span>
              <span className="relative h-3 rounded-sm bg-surface-sunken" title={t.cause}>
                <span className={`absolute inset-y-0 left-0 rounded-sm ${c.bar}`} style={{ width: `${(t.count / max) * 100}%` }} />
              </span>
              <span className={`num inline-flex items-center justify-end gap-1 ${c.text}`}>
                <Icon size={12} aria-label={t.cause} />
                {t.count}
              </span>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
