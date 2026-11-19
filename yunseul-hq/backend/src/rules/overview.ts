// 본사 전국 현황·매장 상세·효과 계산. 모두 순수 함수(입력을 받아 계산만 한다).
import { COMPLAINT_TYPES, type CauseClass, type ComplaintType, type HqOverview, type Outcome, type PeriodStat, type Review, type Store, type StoreDetail, type StoreScore } from '@shared/contracts';
import { majorityCause } from './causes.js';
import { isLow } from './tagging.js';
import { HIGH_RISK, mean, rankEligible, round2, type StoreStats } from './score.js';

// ---------- 평점 분포 ----------

export const BUCKETS = Array.from({ length: 8 }, (_, i) => {
  const lo = 1 + i * 0.5;
  return `${lo.toFixed(1)}–${(lo + 0.5).toFixed(1)}`;
});
export const bucketOf = (r: number) => Math.min(7, Math.max(0, Math.floor((r - 1) / 0.5)));

/** 카카오는 별점 10개 이상, 네이버는 첫 페이지 별점 5건 이상인 매장만 센다(표본 부족 매장이 분포를 흔들지 않게) */
export function distribution(stores: Store[]): HqOverview['distribution'] {
  const rows = BUCKETS.map((bucket) => ({ bucket, kakao: 0, naver: 0 }));
  for (const s of stores) {
    if (s.excluded) continue;
    if (s.kakao.count >= 10 && s.kakao.rating !== null) rows[bucketOf(s.kakao.rating)].kakao++;
    if (s.naver.matched && s.naver.pageN >= 5 && s.naver.pageMean !== null) rows[bucketOf(s.naver.pageMean)].naver++;
  }
  return rows;
}

// ---------- 전국 현황 ----------

export interface OverviewInput {
  stores: Store[];
  stats: Map<string, StoreStats>;
  openDrifts: number;
  openPrescriptions: Map<string, number>; // 매장별 진행 중 처방 수
  pendingProposals: number;
  lastDiagnosis: Map<string, string>;
}

export function overviewParts(inp: OverviewInput): Omit<HqOverview, 'brand' | 'today' | 'ai' | 'situations'> {
  const { stores, stats } = inp;
  const score = (id: string) => stats.get(id)!.score;
  const ranked = stores.filter(rankEligible);
  const high = ranked.filter((s) => score(s.id).risk >= HIGH_RISK);
  const rows = [...stores]
    // 순위 대상 매장을 순위대로 먼저, 표본 부족·제외 매장은 그 뒤에 위험 점수 순으로
    .sort((a, b) => Number(score(a.id).rank === null) - Number(score(b.id).rank === null) || score(b.id).risk - score(a.id).risk || a.id.localeCompare(b.id))
    .map((store) => ({ store, score: score(store.id), openPrescriptions: inp.openPrescriptions.get(store.id) ?? 0, lastDiagnosis: inp.lastDiagnosis.get(store.id) ?? null }));

  const heatmap = rows
    .filter((r) => r.score.rank !== null)
    .slice(0, 30)
    .map((r) => ({ storeId: r.store.id, counts: { ...stats.get(r.store.id)!.tally.lowByType }, lowTotal: stats.get(r.store.id)!.tally.lowTotal }));

  // 브랜드 전체 저평점 리뷰 기준(분석 제외 매장은 뺀다)
  const totals = new Map<ComplaintType, { count: number; causes: Partial<Record<CauseClass, number>> }>();
  for (const s of stores) {
    if (s.excluded) continue;
    const t = stats.get(s.id)!.tally;
    for (const type of COMPLAINT_TYPES) {
      const n = t.lowByType[type];
      if (!n) continue;
      const row = totals.get(type) ?? { count: 0, causes: {} };
      row.count += n;
      for (const [c, k] of Object.entries(t.causeByType[type] ?? {}) as [CauseClass, number][]) row.causes[c] = (row.causes[c] ?? 0) + k;
      totals.set(type, row);
    }
  }
  const complaintTotals = [...totals.entries()]
    .flatMap(([type, v]) => {
      const cause = majorityCause(type, v.causes);
      return cause ? [{ type, count: v.count, cause }] : []; // '다른 지점 비교'는 원인이 없어 빠진다
    })
    .sort((a, b) => b.count - a.count);

  const byRegion = new Map<string, Store[]>();
  for (const s of stores) if (!s.excluded) byRegion.set(s.region, [...(byRegion.get(s.region) ?? []), s]);
  const regions = [...byRegion.entries()]
    .map(([region, list]) => {
      const r = list.filter(rankEligible);
      const m = mean(r.filter((s) => s.kakao.rating !== null).map((s) => s.kakao.rating!));
      return { region, stores: list.length, meanRating: m === null ? null : round2(m), highRisk: r.filter((s) => score(s.id).risk >= HIGH_RISK).length };
    })
    .sort((a, b) => b.stores - a.stores || a.region.localeCompare(b.region, 'ko'));

  return {
    kpis: {
      rankedStores: ranked.length,
      highRisk: high.length,
      bothLow: stores.filter((s) => !s.excluded && s.cross === '양쪽 모두 낮음').length,
      openDrifts: inp.openDrifts,
      openPrescriptions: [...inp.openPrescriptions.values()].reduce((a, b) => a + b, 0),
      pendingProposals: inp.pendingProposals,
    },
    stores: rows,
    distribution: distribution(stores),
    heatmap,
    complaintTotals,
    regions,
  };
}

// ---------- 매장 상세 ----------

export function monthly(reviews: Review[]): StoreDetail['monthly'] {
  const by = new Map<string, number[]>();
  for (const r of reviews) {
    if (r.virtual || r.platform !== '카카오' || r.star === null) continue;
    const m = r.date.slice(0, 7);
    const list = by.get(m);
    if (list) list.push(r.star);
    else by.set(m, [r.star]);
  }
  return [...by.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, stars]) => ({ month, n: stars.length, mean: round2(mean(stars)!), low: stars.filter((s) => s <= 2).length }));
}

/** 같은 상권 유형에서 카카오 별점 수가 가장 비슷한 매장 5곳. 모자라면 다른 상권에서 채운다 */
export function peers(store: Store, stores: Store[], scores: Map<string, StoreScore>, k = 5): StoreDetail['peers'] {
  const dist = (s: Store) => Math.abs(Math.log1p(s.kakao.count) - Math.log1p(store.kakao.count));
  const pool = stores.filter((s) => s.id !== store.id && !s.excluded && s.kakao.count > 0);
  const same = pool.filter((s) => s.area === store.area).sort((a, b) => dist(a) - dist(b) || a.id.localeCompare(b.id));
  const other = pool.filter((s) => s.area !== store.area).sort((a, b) => dist(a) - dist(b) || a.id.localeCompare(b.id));
  return [...same, ...other].slice(0, k).map((s) => ({ storeId: s.id, name: s.name, rating: s.kakao.rating, risk: scores.get(s.id)?.risk ?? 0 }));
}

// ---------- 효과(처방 전·후) ----------

export function periodStat(reviews: Review[], from?: string, to?: string): PeriodStat {
  const dates = reviews.map((r) => r.date).sort();
  const stars = reviews.filter((r) => r.star !== null).map((r) => r.star!);
  const byType: PeriodStat['byType'] = {};
  for (const r of reviews) for (const t of r.tags) byType[t] = (byType[t] ?? 0) + 1;
  const m = mean(stars);
  return {
    from: from ?? dates[0] ?? '',
    to: to ?? dates.at(-1) ?? '',
    n: reviews.length,
    mean: m === null ? null : round2(m),
    lowShare: stars.length ? round2(reviews.filter(isLow).length / stars.length) : null,
    byType,
  };
}

const addDays = (date: string, days: number) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

export const BEFORE_WEEKS = 8;
export const SPARSE_MIN = 10; // 8주 안의 리뷰가 이보다 적으면 표본이 모자란 것으로 본다
export const SPARSE_LAST = 30;

/** 처방 전: 처방일 전 8주의 실제 리뷰. 표본이 적으면 처방일 전 최근 30건. 처방 후: 넣은 가상 리뷰 */
export function outcome(storeId: string, reviews: Review[], cutoff: string, prescriptionIds: string[], simulated: boolean): Outcome {
  const real = reviews.filter((r) => !r.virtual && r.date < cutoff).sort((a, b) => a.date.localeCompare(b.date));
  const from = addDays(cutoff, -BEFORE_WEEKS * 7);
  const window = real.filter((r) => r.date >= from);
  const before = window.length >= SPARSE_MIN ? periodStat(window, from, addDays(cutoff, -1)) : periodStat(real.slice(-SPARSE_LAST));
  const virtual = reviews.filter((r) => r.virtual);
  const after = simulated && virtual.length ? periodStat(virtual) : null;
  return { storeId, prescriptionIds, before, after, virtual: after !== null };
}
