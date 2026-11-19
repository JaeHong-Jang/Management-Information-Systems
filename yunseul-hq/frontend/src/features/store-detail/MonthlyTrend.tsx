// 카카오 리뷰 월별 추이: 평균 별점(선) + 리뷰 수(막대)
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { StoreDetail } from '@shared/contracts';
import { Empty, Panel } from '@/shared/ui';
import { AXIS, AXIS_LINE, GRID } from '@/shared/theme/chart';

export function MonthlyTrend({ monthly }: { monthly: StoreDetail['monthly'] }) {
  const data = monthly.map((m) => ({ ...m, rest: m.n - m.low }));
  return (
    <Panel title="월별 추이" en="TREND" sub="카카오 리뷰. 선은 평균 별점, 막대는 리뷰 수(진한 부분이 2점 이하)" className="h-full">
      {monthly.length === 0 ? (
        <Empty title="월별 리뷰가 아직 없어요" />
      ) : (
        <div className="h-72" role="img" aria-label="월별 평균 별점과 리뷰 수">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: -16 }}>
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis dataKey="month" tick={AXIS} tickLine={false} axisLine={{ stroke: AXIS_LINE }} minTickGap={16} />
              <YAxis yAxisId="star" domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={AXIS} tickLine={false} axisLine={false} />
              <YAxis yAxisId="n" orientation="right" allowDecimals={false} tick={AXIS} tickLine={false} axisLine={false} />
              <Tooltip
                formatter={(v: number, name: string) => (name === '평균 별점' ? [v?.toFixed(2) ?? '—', name] : [`${v}건`, name])}
                labelFormatter={(l) => `${l}`}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar yAxisId="n" dataKey="low" name="2점 이하" stackId="n" fill="var(--heat-4)" />
              <Bar yAxisId="n" dataKey="rest" name="3점 이상" stackId="n" fill="var(--heat-2)" />
              <Line yAxisId="star" dataKey="mean" name="평균 별점" stroke="var(--ink)" strokeWidth={2} dot={{ r: 2 }} connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </Panel>
  );
}
