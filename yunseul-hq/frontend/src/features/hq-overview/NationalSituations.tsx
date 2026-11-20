// 현장 상황별 불만: 본사가 가장 먼저 보는 표. 매장 직원이 겪는 상황 단위로 본다
import type { BrandSituation } from '@shared/contracts';
import { Empty, Panel, ShareBar } from '@/shared/ui';
import { pct } from '@/shared/lib/format';

function Chips({ ids }: { ids: string[] }) {
  if (ids.length === 0) return <span className="text-caption text-text-muted">브랜드 카드 없음</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {ids.map((c) => <span key={c} className="num rounded-badge border border-line-strong px-1.5 text-caption text-ink">{c}</span>)}
    </span>
  );
}

export function NationalSituations({ situations }: { situations: BrandSituation[] }) {
  const max = Math.max(0.01, ...situations.map((s) => s.brandShare));
  return (
    <Panel title="현장 상황별 불만" sub="전국 리뷰의 상황별 불만 비율과 매장 내 상위 3위 집계">
      {situations.length === 0 ? (
        <Empty title="등록된 상황 데이터 없음" />
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-body">
              <thead className="text-caption text-text-muted">
                <tr className="border-b border-line">
                  <th scope="col" className="py-2 pr-3 font-medium">상황</th>
                  <th scope="col" className="py-2 pr-3 font-medium">브랜드 불만 비율</th>
                  <th scope="col" className="py-2 pr-3 font-medium">불만 상위 3위 매장 수</th>
                  <th scope="col" className="py-2 font-medium">브랜드 카드</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {situations.map((s) => (
                  <tr key={s.id} className="align-middle">
                    <td className="py-2.5 pr-3 font-medium">{s.title}</td>
                    <td className="py-2.5 pr-3">
                      <span className="flex items-center gap-2">
                        <span className="num w-12 shrink-0">{pct(s.brandShare)}</span>
                        <ShareBar value={s.brandShare / max} width="w-32" />
                      </span>
                    </td>
                    <td className="num py-2.5 pr-3">{s.storesTop3.toLocaleString()}곳</td>
                    <td className="py-2.5"><Chips ids={s.brandCardIds} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="space-y-3 md:hidden">
            {situations.map((s) => (
              <li key={s.id} className="rounded-card border border-line p-3">
                <p className="font-bold">{s.title}</p>
                <p className="num mt-1 text-caption text-text-muted">브랜드 불만 {pct(s.brandShare)} · 상위 3위 매장 {s.storesTop3.toLocaleString()}곳</p>
                <div className="mt-2"><Chips ids={s.brandCardIds} /></div>
              </li>
            ))}
          </ul>
        </>
      )}
    </Panel>
  );
}
