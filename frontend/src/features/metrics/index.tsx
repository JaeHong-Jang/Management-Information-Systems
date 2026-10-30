// 지표: 지식이 쌓이는 양보다 '다시 쓰이는가'를 본다(KCS: 문서 수가 아니라 재사용 후 해결률).
import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Metrics } from '@shared/contracts';
import { api } from '@/shared/api/client';
import { useLive } from '@/shared/api/live';
import { Empty, PageHeader, Panel } from '@/shared/ui';
import { CHART } from '@/shared/theme/tokens';

const axis = { stroke: CHART.axis, fontSize: 12, tickLine: false, axisLine: false } as const;
const tip = { contentStyle: { borderRadius: 12, border: '1px solid #E5E8EB', fontSize: 13 }, cursor: { fill: '#F2F4F6' } };

export default function MetricsPage() {
  const { state } = useLive();
  const [m, setM] = useState<Metrics | null>(null);
  useEffect(() => void api.metrics().then(setM), [state]);
  if (!m) return null;

  const outcome = [{ name: '질문', 위키가답함: m.answeredByWiki, 점장대기: m.escalated, 점장답카드: m.resolvedToCards }];

  return (
    <>
      <PageHeader eyebrow="시스템" title="지표" desc="문서 수보다 다시 쓰였는지를 봐요. 시연 데이터라 실제 매장 효과를 뜻하지 않아요. 현장 검증에서 같은 지표로 측정할 계획이에요." />
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile label="재사용된 횟수(누적)" value={m.totalReuse} />
        <Tile label="해결됐다고 답한 비율" value={m.solvedRate === null ? '-' : `${m.solvedRate}%`} />
        <Tile label="판단 이유가 채워진 카드" value={`${m.reasonCoverage}%`} />
        <Tile label="공식규정 : 현장노하우" value={`${m.bySource['공식규정']} : ${m.bySource['현장노하우']}`} />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="토픽별 승인 사례">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={m.byTopic} margin={{ left: -20 }}>
              <CartesianGrid vertical={false} stroke={CHART.grid} />
              <XAxis dataKey="topic" {...axis} interval={0} tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} {...axis} />
              <Tooltip {...tip} formatter={(v) => [`${v}개`, '사례']} />
              <Bar dataKey="n" fill={CHART.brand} radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="질문은 어떻게 끝났나">
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={outcome} layout="vertical" margin={{ left: -20 }}>
              <XAxis type="number" allowDecimals={false} {...axis} />
              <YAxis type="category" dataKey="name" {...axis} />
              <Tooltip {...tip} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="위키가답함" name="위키가 답함" stackId="a" fill={CHART.brand} stroke="#fff" strokeWidth={2} />
              <Bar dataKey="점장대기" name="점장 대기" stackId="a" fill={CHART.orange} stroke="#fff" strokeWidth={2} />
              <Bar dataKey="점장답카드" name="점장 답 → 카드" stackId="a" fill={CHART.teal} stroke="#fff" strokeWidth={2} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <p className="mt-2 text-[13px] text-ink-body">
            점장 답이 카드가 되면 다음 같은 질문은 위키가 답해요. 이 비율이 오를수록 점장이 같은 설명을 덜 반복해요.
          </p>
        </Panel>
        <Panel title="날짜별 쌓인 카드와 질문">
          {m.timeline.length > 1 ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={m.timeline} margin={{ left: -20 }}>
                <CartesianGrid vertical={false} stroke={CHART.grid} />
                <XAxis dataKey="day" {...axis} tickFormatter={(d: string) => d.slice(5)} />
                <YAxis allowDecimals={false} {...axis} />
                <Tooltip {...tip} cursor={{ stroke: CHART.axis }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="cards" name="카드" stroke={CHART.teal} strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="questions" name="질문" stroke={CHART.orange} strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <Empty>하루치 데이터만 있어요.</Empty>
          )}
        </Panel>
        <Panel title="노하우 기여 크레딧">
          <table className="w-full text-[14px]">
            <thead>
              <tr className="text-left text-[12px] text-ink-weak">
                <th className="pb-2 font-medium">이름</th>
                <th className="pb-2 font-medium">남긴 사례</th>
                <th className="pb-2 font-medium">도운 횟수</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {m.contributors.map((c) => (
                <tr key={c.personId}>
                  <td className="py-2 font-semibold">{c.name}</td>
                  <td className="py-2">{c.cards}</td>
                  <td className="py-2">{c.helped}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-[12px] text-ink-weak">AI를 의식하면 암묵지 공유가 줄 수 있다는 연구(Zhang 외 2025, IJCHM)를 따라, 기여는 드러내고 질문자 개인 통계는 만들지 않아요.</p>
        </Panel>
      </div>
    </>
  );
}

function Tile({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-card bg-surface p-4">
      <p className="text-[13px] text-ink-weak">{label}</p>
      <p className="mt-1 text-[26px] font-bold leading-9 text-ink-strong">{value}</p>
    </div>
  );
}
