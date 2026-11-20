// 저장소를 읽어 규칙 계산(src/rules)을 부르는 층. 점수는 리뷰가 바뀔 때만 다시 계산한다.
import type { ComplaintType, HqOverview, Onboarding, Outcome, Platform, ReviewPage, StoreDetail, StoreScore } from '@shared/contracts';
import { status as aiStatus } from '../harness/llm.js';
import { monthly, outcome as outcomeOf, overviewParts, peers } from '../rules/overview.js';
import { addRead, brandShares, brandSituations, computeOnboarding, computeSituations, situationCounts } from '../rules/situations.js';
import { rankEligible, rankScores, scoreStore, type StoreStats } from '../rules/score.js';
import * as db from '../store/db.js';

let cache: { stamp: number; stats: Map<string, StoreStats>; scores: Map<string, StoreScore> } | null = null;

export function allStats(): { stats: Map<string, StoreStats>; scores: Map<string, StoreScore> } {
  const stamp = db.reviewsStamp();
  if (cache?.stamp === stamp) return cache;
  const d = db.get();
  const stats = new Map<string, StoreStats>();
  for (const s of d.stores) stats.set(s.id, scoreStore(s, db.reviewsOf(s.id), d.standards));
  const scores = new Map([...stats.entries()].map(([id, st]) => [id, st.score]));
  rankScores(d.stores, scores);
  cache = { stamp, stats, scores };
  return cache;
}

export const scoreOf = (storeId: string) => allStats().scores.get(storeId)!;
export const statsOf = (storeId: string) => allStats().stats.get(storeId)!;

// ---------- 상황·첫 근무 준비 ----------

let sitCache: { stamp: number; brand: Map<string, number>; perStore: Map<string, Map<string, number>> } | null = null;

/** 브랜드 전체 비율과 순위 대상 매장별 상황 수. 리뷰가 바뀔 때만 다시 센다(리뷰 9천 건) */
function brandAgg() {
  const stamp = db.reviewsStamp();
  if (sitCache?.stamp === stamp) return sitCache;
  const d = db.get();
  const perStore = new Map(d.stores.filter(rankEligible).map((s) => [s.id, situationCounts(db.reviewsOf(s.id)).counts]));
  sitCache = { stamp, brand: brandShares(d.reviews), perStore };
  return sitCache;
}

export const storeSituations = (storeId: string) => {
  const d = db.get();
  return computeSituations({ storeId, reviews: db.reviewsOf(storeId), cards: db.storeCards(storeId), questions: d.questions.filter((q) => q.storeId === storeId), brand: brandAgg().brand });
};

export function storeOnboarding(storeId: string): Onboarding {
  const d = db.get();
  const mine = new Set(d.people.filter((p) => p.storeId === storeId).map((p) => p.id));
  return computeOnboarding(storeId, storeSituations(storeId), d.onboardingReads.filter((r) => mine.has(r.personId)));
}

const httpError = (status: number, message: string) => Object.assign(new Error(message), { status });

/** 신입이 카드를 읽었다고 표시한다. 같은 사람·카드는 한 번만 저장한다 */
export function markOnboardingRead(storeId: string, personId: string, cardId: string): Onboarding {
  const person = db.person(personId);
  if (!person || person.storeId !== storeId) throw httpError(400, '해당 매장 소속 직원만 선택할 수 있습니다');
  if (!storeOnboarding(storeId).items.some((it) => it.cardId === cardId)) throw httpError(400, '첫 근무 준비 목록에 없는 카드입니다');
  if (addRead(db.get().onboardingReads, personId, cardId, db.now())) {
    db.addLog('첫 근무 준비', `${db.personLabel(personId)} · ${cardId} 열람 완료`, storeId);
    db.save();
  }
  return storeOnboarding(storeId);
}

/** 진행 중 처방: 초안이거나 발송된 것 */
const isOpen = (status: string) => status === 'draft' || status === 'sent';

export function overview(): HqOverview {
  const d = db.get();
  const openPrescriptions = new Map<string, number>();
  for (const p of d.prescriptions) if (isOpen(p.status)) openPrescriptions.set(p.storeId, (openPrescriptions.get(p.storeId) ?? 0) + 1);
  return {
    brand: d.brand,
    today: db.today(),
    ai: aiStatus,
    ...overviewParts({
      stores: d.stores,
      stats: allStats().stats,
      openDrifts: d.drifts.filter((x) => x.status === 'open').length,
      openPrescriptions,
      pendingProposals: d.proposals.filter((p) => p.status === 'pending').length,
      lastDiagnosis: new Map(d.diagnoses.map((x) => [x.storeId, x.created])),
    }),
    situations: brandSituations(brandAgg().brand, brandAgg().perStore, d.cards),
  };
}

export const latestDiagnosis = (storeId: string) => db.get().diagnoses.filter((x) => x.storeId === storeId).at(-1) ?? null;

/** 처방 효과: 발송된 처방이 있거나 가상 리뷰를 넣은 매장만. 기준일은 첫 발송일(없으면 가상 리뷰 첫날) */
export function storeOutcome(storeId: string): Outcome | null {
  const d = db.get();
  const sent = d.prescriptions.filter((p) => p.storeId === storeId && (p.status === 'sent' || p.status === 'done') && p.sentAt);
  const simulated = d.simulated.includes(storeId);
  if (!sent.length && !simulated) return null;
  const reviews = db.reviewsOf(storeId);
  const firstVirtual = reviews.filter((r) => r.virtual).map((r) => r.date).sort()[0];
  const cutoff = sent.map((p) => p.sentAt!.slice(0, 10)).sort()[0] ?? firstVirtual ?? db.today();
  return outcomeOf(storeId, reviews, cutoff, sent.map((p) => p.id), simulated);
}

export function storeDetail(storeId: string): StoreDetail | null {
  const store = db.store(storeId);
  if (!store) return null;
  const d = db.get();
  const { scores } = allStats();
  return {
    store,
    score: scores.get(storeId)!,
    diagnosis: latestDiagnosis(storeId),
    drifts: d.drifts.filter((x) => x.storeId === storeId),
    prescriptions: d.prescriptions.filter((p) => p.storeId === storeId),
    outcome: storeOutcome(storeId),
    monthly: monthly(db.reviewsOf(storeId)),
    peers: peers(store, d.stores, scores),
  };
}

export interface ReviewQuery { storeId?: string; platform?: string; type?: string; maxStar?: string | number; q?: string; offset?: string | number; limit?: string | number }

export function reviewPage(f: ReviewQuery): ReviewPage {
  const maxStar = f.maxStar === undefined || f.maxStar === '' ? null : Number(f.maxStar);
  const q = f.q?.trim();
  const base = f.storeId ? db.reviewsOf(f.storeId) : db.get().reviews;
  const items = base
    .filter((r) => (!f.platform || r.platform === (f.platform as Platform)) && (!f.type || r.tags.includes(f.type as ComplaintType)) && (maxStar === null || (r.star !== null && r.star <= maxStar)) && (!q || r.text.includes(q)))
    .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
  const offset = Math.max(0, Number(f.offset) || 0);
  const limit = Math.min(200, Math.max(1, Number(f.limit) || 20));
  return { total: items.length, items: items.slice(offset, offset + limit) };
}
