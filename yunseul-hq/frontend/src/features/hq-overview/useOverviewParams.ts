// 전국 현황의 필터·정렬·지도 선택은 URL에 둔다(사회보장 Queue): 새로 고쳐도, 링크를 보내도 같은 화면.
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { StoreRow } from '@shared/contracts';
import { findDistrict, type GeoShape } from '@/shared/geo/resolve';

export type SortKey = 'risk' | 'name' | 'rating' | 'count' | 'naver';
export type Metric = 'count' | 'rating' | 'high';

export function useOverviewParams() {
  const [sp, setSp] = useSearchParams();
  const get = (k: string) => sp.get(k) ?? '';
  const set = useCallback(
    (patch: Record<string, string | null>) => {
      setSp(
        (prev) => {
          const next = new URLSearchParams(prev);
          Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
          return next;
        },
        { replace: true },
      );
    },
    [setSp],
  );
  const sort = (get('sort') || 'risk') as SortKey;
  const dir = (get('dir') || (sort === 'risk' || sort === 'count' ? 'desc' : 'asc')) as 'asc' | 'desc';
  return {
    q: get('q'),
    region: get('region'),
    area: get('area'),
    cross: get('cross'),
    high: get('high') === '1',
    gu: get('gu'),
    metric: (get('metric') || 'count') as Metric,
    sort,
    dir,
    set,
  };
}

/** 매장 id → 시군구 경계. 한 번만 계산한다 */
export function useStoreShapes(rows: StoreRow[]) {
  return useMemo(() => {
    const m = new Map<string, GeoShape>();
    rows.forEach((r) => {
      const s = findDistrict(r.store.region, r.store.district);
      if (s) m.set(r.store.id, s);
    });
    return m;
  }, [rows]);
}
