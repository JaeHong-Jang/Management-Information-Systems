// /hq 전국 현황: 경보 띠 → KPI 6개 → 시군구 지도 → 위험 순위 표 → 평점 분포·원인 집계 → 히트맵 → 지역 요약
import { useEffect, useRef } from 'react';
import { useApp } from '@/app/AppData';
import { useLive } from '@/shared/api/live';
import { ErrorState, PageHeader } from '@/shared/ui';
import { AlertStrip } from './AlertStrip';
import { CauseTotals } from './CauseTotals';
import { DistributionChart } from './DistributionChart';
import { Heatmap } from './Heatmap';
import { KpiRow } from './KpiRow';
import { RankingTable } from './RankingTable';
import { RegionSummary } from './RegionSummary';
import { StoreMap } from './StoreMap';
import { useOverviewParams, useStoreShapes } from './useOverviewParams';

export function HqOverviewPage() {
  const { overview } = useApp();
  const { endCount } = useLive();
  const p = useOverviewParams();
  const o = overview.data;
  const shapes = useStoreShapes(o?.stores ?? []);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    void overview.reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endCount]);

  const target = o?.stores.find((r) => r.store.isTarget)?.store;

  return (
    <>
      <PageHeader
        title={<>전국 <span className="hl-line">현황</span></>}
        en="OVERVIEW"
        sub={
          o
            ? `${o.brand.name} 매장 ${o.brand.storeCount.toLocaleString()}곳 데이터 (정보공개서 가맹점 ${o.brand.ftcStoreCount.toLocaleString()}곳) · 리뷰 수집 ${o.brand.dataAsOf} · 순위는 카카오 별점 10개 이상 매장만 매겨요`
            : '전국 매장 데이터를 불러오고 있어요'
        }
      />
      {o && <AlertStrip o={o} />}
      {overview.error && !o && <div className="mb-5"><ErrorState message={overview.error} onRetry={overview.reload} /></div>}
      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-12">
          <KpiRow kpis={o?.kpis ?? null} loading={!o && !overview.error} />
        </div>
        {o && (
          <>
            <div className="col-span-12">
              <StoreMap rows={o.stores} shapes={shapes} metric={p.metric} selected={p.gu} onMetric={(m) => p.set({ metric: m === 'count' ? null : m })} onSelect={(code) => p.set({ gu: code })} />
            </div>
            <div className="col-span-12">
              <RankingTable rows={o.stores} shapes={shapes} />
            </div>
            <div className="col-span-12 xl:col-span-6">
              <DistributionChart data={o.distribution} target={target ? { name: target.name, rating: target.kakao.rating } : undefined} />
            </div>
            <div className="col-span-12 xl:col-span-6">
              <CauseTotals totals={o.complaintTotals} />
            </div>
            <div className="col-span-12">
              <Heatmap rows={o.heatmap} stores={o.stores} />
            </div>
            <div className="col-span-12">
              <RegionSummary regions={o.regions} />
            </div>
          </>
        )}
      </div>
    </>
  );
}
