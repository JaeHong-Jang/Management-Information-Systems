import type { HqOverview } from '@shared/contracts';
import { Panel } from '@/shared/ui';
import { rating } from '@/shared/lib/format';

export function RegionSummary({ regions }: { regions: HqOverview['regions'] }) {
  const sorted = [...regions].sort((a, b) => b.stores - a.stores);
  return (
    <Panel title="지역별 요약" en="REGION" sub="시도 단위. 평균 평점은 카카오 기준" bodyClass="p-0">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-body">
          <thead className="bg-surface-sunken text-left text-caption text-text-muted">
            <tr>
              <th className="px-4 py-2 font-medium">지역</th>
              <th className="px-4 py-2 text-right font-medium">매장 수</th>
              <th className="px-4 py-2 text-right font-medium">평균 평점</th>
              <th className="px-4 py-2 text-right font-medium">고위험 매장</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.region} className="border-t border-line">
                <td className="px-4 py-2 font-medium">{r.region}</td>
                <td className="num px-4 py-2 text-right">{r.stores}</td>
                <td className="num px-4 py-2 text-right">{rating(r.meanRating)}</td>
                <td className={`num px-4 py-2 text-right ${r.highRisk > 0 ? 'font-bold text-red' : ''}`}>{r.highRisk}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
