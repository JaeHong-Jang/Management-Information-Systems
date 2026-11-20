// /hq 전국 상황: 경보 띠 → 전국에서 자주 터지는 상황 표 → KPI 6개 → 위험 순위 표 → (접힘) 지도·평점 분포·원인 집계·히트맵·지역 요약
import { useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import './overview.css';
import { useApp } from '@/app/AppData';
import { useLive } from '@/shared/api/live';
import { ErrorState, PageHeader } from '@/shared/ui';
import { AlertStrip } from './AlertStrip';
import { CauseTotals } from './CauseTotals';
import { DistributionChart } from './DistributionChart';
import { Heatmap } from './Heatmap';
import { NationalSituations } from './NationalSituations';
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

  const [search] = useSearchParams();
  const views = [
    { id: 'ranking', label: '매장 위험 순위' },
    { id: 'situations', label: '불만 유형별 현황' },
    { id: 'regions', label: '지역·평점 분포' },
  ] as const;
  const view = views.find((v) => v.id === search.get('view'))?.id ?? 'ranking';
  const viewLink = (id: typeof view) => {
    const next = new URLSearchParams(search);
    if (id === 'ranking') next.delete('view');
    else next.set('view', id);
    return { pathname: '/hq', search: next.toString() };
  };
  const target = o?.stores.find((r) => r.store.isTarget)?.store;

  return (
    <>
      <PageHeader
        title="전국 매장 현황"
        sub={o ? `${o.brand.name} · 수집 매장 ${o.brand.storeCount.toLocaleString()}곳 · 정보공개서 가맹점 ${o.brand.ftcStoreCount.toLocaleString()}곳 · 리뷰 기준 ${o.brand.dataAsOf}` : '매장 현황 조회 중'}
      />
      <KpiRow kpis={o?.kpis ?? null} loading={!o && !overview.error} />
      {overview.error && !o && <ErrorState message={overview.error} onRetry={overview.reload} />}
      {o && (
        <>
          <AlertStrip o={o} />
          <nav className="hq-register-nav" aria-label="전국 현황 조회 범위">
            {views.map((v) => <Link key={v.id} to={viewLink(v.id)} aria-current={view === v.id ? 'page' : undefined}>{v.label}</Link>)}
          </nav>
          {view === 'ranking' && <RankingTable rows={o.stores} shapes={shapes} />}
          {view === 'situations' && <NationalSituations situations={o.situations ?? []} />}
          {view === 'regions' && (
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 min-w-0">
                <StoreMap rows={o.stores} shapes={shapes} metric={p.metric} selected={p.gu} onMetric={(m) => p.set({ metric: m === 'count' ? null : m })} onSelect={(code) => p.set({ gu: code })} />
                {p.gu && <Link className="mt-2 inline-flex rounded-ctl border border-line-strong bg-surface px-3 py-2 text-body font-bold hover:bg-ink-weak" to={viewLink('ranking')}>선택 지역 매장 목록</Link>}
              </div>
              <div className="col-span-12 min-w-0 xl:col-span-6">
                <DistributionChart data={o.distribution} target={target ? { name: target.name, rating: target.kakao.rating } : undefined} />
              </div>
              <div className="col-span-12 min-w-0 xl:col-span-6">
                <CauseTotals totals={o.complaintTotals} />
              </div>
              <div className="col-span-12 min-w-0">
                <Heatmap rows={o.heatmap} stores={o.stores} />
              </div>
              <div className="col-span-12 min-w-0">
                <RegionSummary regions={o.regions} />
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
