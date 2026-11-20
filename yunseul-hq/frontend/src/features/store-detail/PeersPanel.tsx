import { Link } from 'react-router-dom';
import type { StoreDetail } from '@shared/contracts';
import { Empty, Panel, RiskBar } from '@/shared/ui';
import { rating } from '@/shared/lib/format';

export function PeersPanel({ peers }: { peers: StoreDetail['peers'] }) {
  return (
    <Panel title="비교 매장" sub="같은 상권 유형, 비슷한 리뷰 수" className="h-full" bodyClass="p-0">
      {peers.length === 0 ? (
        <div className="p-4"><Empty title="비교 대상 매장 없음" /></div>
      ) : (
        <table className="w-full text-body">
          <thead className="bg-surface-sunken text-left text-caption text-text-muted">
            <tr>
              <th className="px-4 py-2 font-medium">매장</th>
              <th className="px-4 py-2 text-right font-medium">카카오</th>
              <th className="px-4 py-2 font-medium">위험</th>
            </tr>
          </thead>
          <tbody>
            {peers.map((p) => (
              <tr key={p.storeId} className="border-t border-line">
                <td className="px-4 py-2"><Link className="text-ink hover:underline" to={`/hq/stores/${p.storeId}`}>{p.name}</Link></td>
                <td className="num px-4 py-2 text-right">{rating(p.rating)}</td>
                <td className="px-4 py-2"><RiskBar risk={p.risk} width="w-20" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Panel>
  );
}
