// 편차 점수(PLAN §3). 공개 배점 R1~R5, 0~100 위험 점수. 순수 함수.
import type { ComplaintType, HqStandard, Review, ScorePart, Store, StoreScore } from '@shared/contracts';
import { detectDrifts, tallyCauses, type CauseTally, type DetectedDrift } from './causes.js';

export const RECENT_FROM = '2025-01-01';
export const HIGH_RISK = 60;
export const MIN_RANK_COUNT = 10;

export const round1 = (x: number) => Math.round(x * 10) / 10;
export const round2 = (x: number) => Math.round(x * 100) / 100;
export const mean = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);
const pct = (x: number) => `${Math.round(x * 100)}%`;

/** 순위 대상: 카카오 별점 10개 이상이고 분석 제외가 아닌 매장 */
export const rankEligible = (s: Store) => s.kakao.count >= MIN_RANK_COUNT && !s.excluded;

export interface StoreStats {
  score: StoreScore;
  tally: CauseTally;
  drifts: DetectedDrift[];
}

/** 한 매장의 점수. reviews는 그 매장의 리뷰(가상 리뷰는 빼고 센다). rank는 rankScores가 채운다 */
export function scoreStore(store: Store, reviews: Review[], standards: HqStandard[]): StoreStats {
  const real = reviews.filter((r) => !r.virtual);
  const kakao = real.filter((r) => r.platform === '카카오' && r.star !== null);
  const drifts = detectDrifts(real, standards);
  const tally = tallyCauses(real, new Set(drifts.map((d) => d.key)));
  const parts: ScorePart[] = [];

  const rating = store.kakao.rating ?? mean(kakao.map((r) => r.star!));
  if (rating === null || store.kakao.count === 0) parts.push({ id: 'R1', name: 'R1 카카오 평점', max: 30, points: 0, basis: '미확인(카카오 별점 없음)' });
  else parts.push({ id: 'R1', name: 'R1 카카오 평점', max: 30, points: round1(((5 - rating) / 4) * 30), basis: `카카오 평점 ${rating.toFixed(2)}(별점 ${store.kakao.count}개) → (5 − ${rating.toFixed(2)}) / 4 × 30` });

  const lowShare = store.kakao.lowShare ?? (kakao.length ? kakao.filter((r) => r.star! <= 2).length / kakao.length : null);
  if (lowShare === null) parts.push({ id: 'R2', name: 'R2 저평점 비율', max: 20, points: 0, basis: '미확인(카카오 별점 없음)' });
  else parts.push({ id: 'R2', name: 'R2 저평점 비율', max: 20, points: round1(lowShare * 20), basis: `카카오 2점 이하 ${pct(lowShare)} → ${round2(lowShare)} × 20` });

  const recent = kakao.filter((r) => r.date >= RECENT_FROM);
  const recentMean = recent.length >= 3 ? (store.kakao.recentMean ?? mean(recent.map((r) => r.star!))) : null;
  let trend: StoreScore['trend'] = 'unknown';
  if (recentMean === null || rating === null) parts.push({ id: 'R3', name: 'R3 최근 추세', max: 15, points: 0, basis: `미확인(2025년 이후 카카오 리뷰 ${recent.length}건, 3건 미만)` });
  else {
    const gap = rating - recentMean;
    trend = gap >= 0.3 ? 'worse' : gap <= -0.3 ? 'better' : 'flat';
    parts.push({ id: 'R3', name: 'R3 최근 추세', max: 15, points: round1(Math.min(15, Math.max(0, gap * 15))), basis: `2025년 이후 평균 ${recentMean.toFixed(2)}(${recent.length}건) vs 전체 ${rating.toFixed(2)}` });
  }

  const nv = store.naver;
  if (nv.matched && nv.pageN >= 5 && nv.pageMean !== null) parts.push({ id: 'R4', name: 'R4 네이버 교차', max: 15, points: round1(((5 - nv.pageMean) / 4) * 15), basis: `네이버 첫 페이지 평균 ${nv.pageMean.toFixed(2)}(${nv.pageN}건) → (5 − ${nv.pageMean.toFixed(2)}) / 4 × 15` });
  else parts.push({ id: 'R4', name: 'R4 네이버 교차', max: 15, points: 0, basis: nv.matched ? `미확인(네이버 첫 페이지 별점 ${nv.pageN}건, 5건 미만)` : '미확인(네이버 미매칭)' });

  const knowledgeShare = tally.pairs ? tally.knowledgePairs / tally.pairs : null;
  if (knowledgeShare === null) parts.push({ id: 'R5', name: 'R5 지식 공백 비중', max: 20, points: 0, basis: '미확인(원인을 붙일 저평점 불만 없음)' });
  else parts.push({ id: 'R5', name: 'R5 지식 공백 비중', max: 20, points: round1(knowledgeShare * 20), basis: `저평점 불만 ${tally.pairs}건 중 지식 공백 ${tally.knowledgePairs}건(${pct(knowledgeShare)}) × 20` });

  const topComplaints = (Object.entries(tally.lowByType) as [ComplaintType, number][])
    .filter(([type]) => type !== '다른 지점 비교')
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([type, count]) => ({ type, count }));

  const risk = round1(Math.min(100, Math.max(0, parts.reduce((s, p) => s + p.points, 0))));
  return {
    score: { storeId: store.id, risk, rank: null, parts, trend, topComplaints, knowledgeShare: knowledgeShare === null ? null : round2(knowledgeShare) },
    tally,
    drifts,
  };
}

/** 순위 대상 매장만 위험 점수 내림차순으로 순위를 매긴다 */
export function rankScores(stores: Store[], scores: Map<string, StoreScore>) {
  const eligible = stores.filter(rankEligible).sort((a, b) => scores.get(b.id)!.risk - scores.get(a.id)!.risk || a.id.localeCompare(b.id));
  for (const s of stores) scores.get(s.id)!.rank = null;
  eligible.forEach((s, i) => (scores.get(s.id)!.rank = i + 1));
}
