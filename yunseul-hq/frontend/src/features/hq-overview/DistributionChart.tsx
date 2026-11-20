// 평점 구간별 매장 수: 카카오(ink) vs 네이버 첫 페이지(따뜻한 회색). 강조 막대(타깃 매장이 든 구간)만 노랑
import { Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { HqOverview } from '@shared/contracts';
import { Panel } from '@/shared/ui';

import { AXIS, AXIS_LINE, GRID } from '@/shared/theme/chart';

function inBucket(bucket: string, v: number | null) {
  if (v == null) return false;
  const [a, b] = bucket.split(/[–-]/).map(Number);
  return Number.isFinite(a) && Number.isFinite(b) && v >= a && (v < b || (b === 5 && v <= 5));
}

export function DistributionChart({ data, target }: { data: HqOverview['distribution']; target?: { name: string; rating: number | null } }) {
  return (
    <Panel title="평점 분포" sub={`평점 구간별 매장 수. 네이버는 첫 페이지 표본 평균 기준${target ? ` · 노랑은 ${target.name}의 평점 구간` : ''}`} className="h-full">
      <div className="h-64" role="img" aria-label="카카오와 네이버 평점 구간별 매장 수 막대 그래프">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -12 }} barGap={2}>
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis dataKey="bucket" tick={AXIS} tickLine={false} axisLine={{ stroke: AXIS_LINE }} />
            <YAxis allowDecimals={false} tick={AXIS} tickLine={false} axisLine={false} />
            <Tooltip cursor={{ fill: '#FBF1EC' }} formatter={(v: number, name: string) => [`${v}곳`, name]} />
            <Legend wrapperStyle={{ fontSize: 12 }} iconType="square" />
            <Bar dataKey="kakao" name="카카오" fill="var(--kakao)" radius={[2, 2, 0, 0]}>
              {data.map((d) => (
                <Cell key={d.bucket} fill={inBucket(d.bucket, target?.rating ?? null) ? 'var(--brand-yellow)' : 'var(--kakao)'} stroke={inBucket(d.bucket, target?.rating ?? null) ? 'var(--ink)' : undefined} />
              ))}
            </Bar>
            <Bar dataKey="naver" name="네이버" fill="var(--naver)" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}
