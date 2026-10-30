// 심사 기준: 공모전 5개 기준(각 20점)과 개발 중 돌린 독립 심사 결과. docs/judge/scores.json을 그대로 보여 준다.
import { useEffect, useState } from 'react';
import { api, type JudgeData } from '@/shared/api/client';
import { Badge, Empty, PageHeader, Panel } from '@/shared/ui';

export default function Judge() {
  const [d, setD] = useState<JudgeData | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => void api.judge().then(setD).catch((e) => setErr(e.message)), []);
  if (err) return <Empty>{err}</Empty>;
  if (!d) return null;
  const crit = d.rubric.criteria;

  return (
    <>
      <PageHeader eyebrow="시스템" title="심사 기준" desc={`공모전 평가 기준 5개(각 20점)로 개발 중간마다 서로 다른 AI 심사위원이 따로 채점했어요. ${d.rubric.note}`} />
      <Panel title="평가 기준" className="mb-5">
        <div className="grid gap-3 md:grid-cols-5">
          {crit.map((c) => (
            <div key={c.id} className="rounded-xl bg-surface-subtle p-3">
              <p className="text-[14px] font-bold">{c.name}</p>
              <p className="mt-1 text-[12px] text-ink-body">{c.desc}</p>
              <p className="mt-2 text-[12px] font-semibold text-brand-strong">{c.points}점</p>
            </div>
          ))}
        </div>
      </Panel>
      {d.rounds.length ? (
        d.rounds.map((r) => (
          <Panel key={r.round} title={`${r.round} · ${r.date}`} className="mb-5">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-[14px]">
                <thead>
                  <tr className="text-left text-[12px] text-ink-weak">
                    <th className="pb-2 font-medium">심사위원</th>
                    {crit.map((c) => (
                      <th key={c.id} className="pb-2 font-medium">
                        {c.name}
                      </th>
                    ))}
                    <th className="pb-2 font-medium">합계</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {r.judges.map((j) => (
                    <tr key={j.id}>
                      <td className="py-2 font-semibold">{j.model}</td>
                      {crit.map((c) => (
                        <td key={c.id} className="py-2">
                          {j.scores[c.id] ?? '-'}
                        </td>
                      ))}
                      <td className="py-2 font-bold text-brand-strong">{j.total}/100</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <p className="mb-1.5 text-[13px] font-semibold text-ink-weak">심사위원이 꼽은 가장 큰 문제</p>
                <ul className="space-y-1 text-[13px]">
                  {r.judges.flatMap((j) => j.top3.map((t, i) => <li key={`${j.id}${i}`}><Badge className="mr-1.5">{j.model}</Badge>{t}</li>))}
                </ul>
              </div>
              <div>
                <p className="mb-1.5 text-[13px] font-semibold text-ink-weak">그래서 바꾼 것</p>
                <ul className="list-disc space-y-1 pl-4 text-[13px]">
                  {r.changes.length ? r.changes.map((c, i) => <li key={i}>{c}</li>) : <li>다음 라운드에서 반영 예정</li>}
                </ul>
              </div>
            </div>
          </Panel>
        ))
      ) : (
        <Empty>아직 심사를 돌리지 않았어요.</Empty>
      )}
    </>
  );
}
