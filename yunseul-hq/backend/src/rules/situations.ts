// 직원이 막히는 상황(PIVOT §4). 리뷰 불만 유형·카드 주제와 이어서 매장별 상황 목록, 첫 근무 준비, 본사 전국 상황을 계산한다. 모두 순수 함수.
import type { Card, ComplaintType, Onboarding, OnboardingItem, OnboardingRead, Question, Review, Situation, SituationDef, SituationQuote, BrandSituation } from '@shared/contracts';

export const SITUATIONS: SituationDef[] = [
  { id: 'T01', title: '이용시간이 다 됐다고 알려야 할 때', complaintTypes: ['이용시간제한', '규칙 미고지·말바꿈'], cardTopics: ['이용시간'] },
  { id: 'T02', title: '인원·자리 때문에 손님이 불편해할 때', complaintTypes: ['좌석·인원'], cardTopics: ['좌석 배정', '단체 예약'] },
  { id: 'T03', title: '최소주문을 물어보거나 요구받을 때', complaintTypes: ['최소주문'], cardTopics: ['최소주문'] },
  { id: 'T04', title: '주문한 메뉴나 술이 떨어졌을 때', complaintTypes: ['품절·대체'], cardTopics: ['품절·대체', '주류·케그'] },
  { id: 'T05', title: '계산·중간결제가 꼬였을 때', complaintTypes: ['결제·계산'], cardTopics: ['결제·계산'] },
  { id: 'T06', title: '신분증 확인이 애매할 때', complaintTypes: ['신분증'], cardTopics: ['신분증'] },
  { id: 'T07', title: '음식에서 이물이 나오거나 위생 지적을 받을 때', complaintTypes: ['위생'], cardTopics: ['이물·위생'] },
  { id: 'T08', title: '손님이 오래 기다린다고 할 때', complaintTypes: ['대기·서빙지연'], cardTopics: ['응대 기본'] },
  { id: 'T09', title: '불친절하다는 말을 들을 때', complaintTypes: ['직원 태도'], cardTopics: ['응대 기본'] },
  { id: 'T10', title: '많이 취한 손님이나 계산 분쟁이 생겼을 때', complaintTypes: [], cardTopics: ['취객·분쟁 응대'] },
];

export const GAP_MIN_REVIEWS = 3; // 이 수 이상 불만이 나왔는데 매장 카드가 없으면 '카드 없음'
export const ONBOARDING_MAX = 8;
const QUOTE_MAX = 120;
const INCIDENT_BONUS = 4; // T10: 리뷰엔 안 남지만 매장 사고로 이어지는 상황

/** 실제 리뷰(virtual 제외) 중 불만 태그가 붙은 리뷰. 상황 비율의 분모 */
const complained = (reviews: Review[]) => reviews.filter((r) => !r.virtual && r.tags.length > 0);
const hits = (def: SituationDef, r: Review) => def.complaintTypes.some((t: ComplaintType) => r.tags.includes(t));

/** 상황별 불만 리뷰 수와 분모(불만 태그가 하나라도 붙은 리뷰 수) */
export function situationCounts(reviews: Review[]): { counts: Map<string, number>; total: number } {
  const base = complained(reviews);
  return { counts: new Map(SITUATIONS.map((d) => [d.id, base.filter((r) => hits(d, r)).length])), total: base.length };
}

/** 브랜드 전체 리뷰로 센 상황별 비율. 매장 비교용 */
export function brandShares(reviews: Review[]): Map<string, number> {
  const { counts, total } = situationCounts(reviews);
  return new Map(SITUATIONS.map((d) => [d.id, total ? counts.get(d.id)! / total : 0]));
}

const quoteOf = (r: Review): SituationQuote => ({ reviewId: r.id, text: r.text.length > QUOTE_MAX ? `${r.text.slice(0, QUOTE_MAX)}…` : r.text, star: r.star, date: r.date });

/** 이 상황과 무관한 불만 태그 수. 적을수록 이 상황만 다룬 리뷰다 */
const offTopic = (def: SituationDef, r: Review) => r.tags.filter((t) => !def.complaintTypes.includes(t)).length;

/** 이 상황만 다룬 리뷰 먼저 → 별점 낮은 순(별점 없음은 뒤) → 최신 순 */
const byQuote = (def: SituationDef) => (a: Review, b: Review) =>
  offTopic(def, a) - offTopic(def, b) || (a.star ?? 6) - (b.star ?? 6) || b.date.localeCompare(a.date) || a.id.localeCompare(b.id);

export interface SituationInput {
  storeId: string;
  reviews: Review[]; // 그 매장 리뷰
  cards: Card[]; // 그 매장이 볼 수 있는 카드(매장 카드 + 브랜드 카드). 승인 여부는 여기서 거른다
  questions: Question[]; // 그 매장 질문
  brand: Map<string, number>; // brandShares 결과
}

/** 한 매장의 상황 목록(priority 내림차순, 동점이면 id 순) */
export function computeSituations(inp: SituationInput): Situation[] {
  const { counts, total } = situationCounts(inp.reviews);
  const real = inp.reviews.filter((r) => !r.virtual);
  const approved = inp.cards.filter((c) => c.status === 'approved');
  return SITUATIONS.map((def) => {
    const own = approved.filter((c) => c.storeId === inp.storeId && def.cardTopics.includes(c.topic)).sort((a, b) => a.id.localeCompare(b.id));
    const brand = approved.filter((c) => c.scope === 'brand' && def.cardTopics.includes(c.topic)).sort((a, b) => a.id.localeCompare(b.id));
    const cardSet = new Set([...own, ...brand].map((c) => c.id));
    const tags = new Set([...own, ...brand].flatMap((c) => c.tags));
    const asked = inp.questions.filter((q) => q.cited.some((id) => cardSet.has(id)) || [...tags].some((t) => q.text.includes(t)));
    const storeReviews = counts.get(def.id)!;
    const storeCard = own.length > 0;
    const gap = storeReviews >= GAP_MIN_REVIEWS && !storeCard;
    return {
      ...def,
      storeReviews,
      storeShare: total ? storeReviews / total : 0,
      brandShare: inp.brand.get(def.id) ?? 0,
      quotes: real.filter((r) => hits(def, r)).sort(byQuote(def)).slice(0, 2).map(quoteOf),
      cardIds: [...own, ...brand].map((c) => c.id),
      storeCard,
      questions: asked.length,
      openQuestions: asked.filter((q) => q.status === 'escalated').length,
      gap,
      priority: storeReviews * 2 + asked.length * 3 + (gap ? 5 : 0) + (def.id === 'T10' ? INCIDENT_BONUS : 0),
    };
  }).sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
}

export function whyText(s: Situation): string {
  if (s.storeReviews > 0) return `이 매장 리뷰 ${s.storeReviews}건에서 이 상황이 불만이 됐어요`;
  if (s.questions > 0) return `직원들이 ${s.questions}번 물어본 상황이에요`;
  return '본사 기본 응대예요';
}

/** 첫 근무 준비 목록: priority 순으로 카드가 있는 상황마다 카드 1장(매장 카드 우선), 최대 8장. 같은 카드를 두 상황이 쓰면(예: 응대 기본) 먼저 나온 상황에만 싣고, 다른 카드가 없는 상황은 건너뛴다. situations는 priority 순이어야 한다 */
export function onboardingItems(situations: Situation[]): OnboardingItem[] {
  const used = new Set<string>();
  const items: OnboardingItem[] = [];
  for (const s of situations) {
    const cardId = s.cardIds.find((id) => !used.has(id));
    if (!cardId || items.length >= ONBOARDING_MAX) continue;
    used.add(cardId);
    items.push({ situationId: s.id, situationTitle: s.title, cardId, why: whyText(s) });
  }
  return items;
}

/** reads는 그 매장 사람의 읽음 기록만 넘긴다 */
export const computeOnboarding = (storeId: string, situations: Situation[], reads: OnboardingRead[]): Onboarding => ({ storeId, items: onboardingItems(situations), reads });

/** 같은 사람·카드는 한 번만 저장한다. 새로 넣었으면 true */
export function addRead(reads: OnboardingRead[], personId: string, cardId: string, at: string): boolean {
  if (reads.some((r) => r.personId === personId && r.cardId === cardId)) return false;
  reads.push({ personId, cardId, at });
  return true;
}

/** 본사용 전국 상황. storeReviews는 순위 대상 매장별 상황 불만 수(0 제외 상위 3위 안이면 storesTop3에 1) */
export function brandSituations(brand: Map<string, number>, perStore: Map<string, Map<string, number>>, brandCards: Card[]): BrandSituation[] {
  const top3 = new Map<string, number>(SITUATIONS.map((d) => [d.id, 0]));
  for (const counts of perStore.values()) {
    const ranked = SITUATIONS.map((d) => ({ id: d.id, n: counts.get(d.id) ?? 0 })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n || a.id.localeCompare(b.id)).slice(0, 3);
    for (const x of ranked) top3.set(x.id, top3.get(x.id)! + 1);
  }
  const approved = brandCards.filter((c) => c.scope === 'brand' && c.status === 'approved');
  return SITUATIONS.map((def) => ({
    ...def,
    brandShare: brand.get(def.id) ?? 0,
    storesTop3: top3.get(def.id)!,
    brandCardIds: approved.filter((c) => def.cardTopics.includes(c.topic)).map((c) => c.id).sort(),
  })).sort((a, b) => b.brandShare - a.brandShare || a.id.localeCompare(b.id));
}
