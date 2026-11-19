// 매장 × 불만 유형 히트맵(위험 상위 30곳). 한 가지 색 5단계, 숫자 늘 표시
import { useNavigate } from 'react-router-dom';
import { COMPLAINT_TYPES, type HqOverview, type StoreRow } from '@shared/contracts';
import { Panel } from '@/shared/ui';

const STEPS = ['var(--heat-1)', 'var(--heat-2)', 'var(--heat-3)', 'var(--heat-4)', 'var(--heat-5)'];

export function Heatmap({ rows, stores }: { rows: HqOverview['heatmap']; stores: StoreRow[] }) {
  const nav = useNavigate();
  const names = new Map(stores.map((r) => [r.store.id, r.store]));
  const types = COMPLAINT_TYPES.filter((t) => rows.some((r) => (r.counts[t] ?? 0) > 0));
  const max = Math.max(1, ...rows.flatMap((r) => types.map((t) => r.counts[t] ?? 0)));
  const step = (n: number) => Math.min(4, Math.floor((n / max) * 5 - 1e-9));

  return (
    <Panel title="매장 × 불만 유형" en="HEATMAP" sub="위험 상위 30곳의 저평점 리뷰 불만 건수. 진할수록 많아요" bodyClass="p-0">
      <div className="overflow-x-auto">
        <table className="border-collapse text-caption">
          <thead>
            <tr className="bg-surface-sunken text-text-muted">
              <th className="sticky left-0 z-10 bg-surface-sunken px-3 py-2 text-left font-medium">매장</th>
              {types.map((t) => (
                <th key={t} className="w-[68px] px-1 py-2 text-center align-bottom font-medium leading-tight">{t}</th>
              ))}
              <th className="px-3 py-2 text-right font-medium">저평점 합</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const s = names.get(r.storeId);
              return (
                <tr key={r.storeId} className="border-t border-line">
                  <th scope="row" className="sticky left-0 z-10 bg-surface px-3 py-1 text-left font-medium">
                    <button type="button" className="whitespace-nowrap text-ink hover:underline" onClick={() => nav(`/hq/stores/${r.storeId}`)}>
                      {s?.name ?? r.storeId}
                    </button>
                  </th>
                  {types.map((t) => {
                    const n = r.counts[t] ?? 0;
                    const k = n > 0 ? step(n) : -1;
                    return (
                      <td
                        key={t}
                        className="num h-7 border border-surface text-center"
                        style={{ background: k >= 0 ? STEPS[k] : undefined, color: k >= 4 ? '#FFFFFF' : undefined }}
                        title={`${s?.name ?? r.storeId} · ${t} ${n}건`}
                      >
                        {n > 0 ? n : <span className="text-line-strong">·</span>}
                      </td>
                    );
                  })}
                  <td className="num px-3 text-right font-bold">{r.lowTotal}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
