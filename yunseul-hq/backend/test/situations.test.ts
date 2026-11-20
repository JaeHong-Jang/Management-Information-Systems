// 상황 규칙(PIVOT §4)과 첫 근무 준비. 순수 함수는 작은 고정 자료로, 읽음 표시는 시드 저장소로 확인한다.
import { beforeEach, describe, expect, it } from 'vitest';
import type { Card, Question, Review } from '@shared/contracts';
import { brandShares, brandSituations, computeOnboarding, computeSituations, onboardingItems, SITUATIONS, whyText } from '../src/rules/situations.js';
import { tagText } from '../src/rules/tagging.js';
import { markOnboardingRead, overview, storeOnboarding, storeSituations } from '../src/hq/service.js';
import * as db from '../src/store/db.js';

let n = 0;
const rv = (text: string, o: Partial<Review> = {}): Review => ({ id: `R${++n}`, storeId: 'S1', platform: '카카오', star: 1, date: '2025-05-01', text, tags: tagText(text), tagVia: 'rules', ...o });
const card = (id: string, topic: string, o: Partial<Card> = {}): Card => ({ id, storeId: null, scope: 'brand', title: id, topic, situation: '', reason: '', actions: [], avoid: '', escalateWhen: '', source: '본사 표준', authorId: 'P', status: 'approved', origin: '시드', created: '', updated: '', expires: '', tags: [], uses: 0, helpful: 0, notHelpful: 0, ...o });
const q = (id: string, text: string, o: Partial<Question> = {}): Question => ({ id, storeId: 'S1', text, askerId: 'P', time: '', status: 'answered', answer: '', why: '', cited: [], confidence: 'high', feedback: null, ...o });
const sit = (list: ReturnType<typeof computeSituations>, id: string) => list.find((s) => s.id === id)!;

const reviews = [
  rv('2시간 지났다고 나가라고 하네요'), rv('시간 제한 때문에 쫓겨났어요', { star: 2 }), rv('처음부터 말해 주지 시간 제한이라니', { star: 3 }),
  rv('불친절하고 반말해요'), rv('맛있어요', { star: 5 }), rv('시간 지났다고 나가래요', { storeId: 'S2' }),
  rv('가상 리뷰 2시간 제한', { virtual: true }),
];
const mine = reviews.filter((r) => r.storeId === 'S1');
const brand = brandShares(reviews);

describe('상황 정의', () => {
  it('T01~T10 순서와 T10은 불만 유형이 없다', () => {
    expect(SITUATIONS.map((s) => s.id)).toEqual(['T01', 'T02', 'T03', 'T04', 'T05', 'T06', 'T07', 'T08', 'T09', 'T10']);
    expect(SITUATIONS[9].complaintTypes).toEqual([]);
  });
});

describe('상황 계산', () => {
  const list = computeSituations({ storeId: 'S1', reviews: mine, cards: [card('B01', '이용시간')], questions: [], brand });

  it('불만 태그가 붙은 실제 리뷰만 센다(가상·무태그 제외)', () => {
    const t01 = sit(list, 'T01');
    expect(t01.storeReviews).toBe(3);
    expect(sit(list, 'T09').storeReviews).toBe(1);
    expect(t01.storeShare).toBeCloseTo(3 / 4);
    expect(t01.brandShare).toBeCloseTo(4 / 5); // 다른 매장 1건 포함, 가상 리뷰 제외
  });

  it('인용은 이 상황만 다룬 리뷰 → 별점 낮은 순 → 최신 순 2개, 120자에서 자르고 …을 붙인다', () => {
    const long = rv('2시간 지났다고 ' + '가'.repeat(200), { star: 1, date: '2025-06-01' });
    const l = computeSituations({ storeId: 'S1', reviews: [...mine, long], cards: [], questions: [], brand });
    const quotes = sit(l, 'T01').quotes;
    expect(quotes).toHaveLength(2);
    expect(quotes[0].reviewId).toBe(long.id);
    expect(quotes[0].text).toHaveLength(121);
    expect(quotes[0].text.endsWith('…')).toBe(true);
    expect(quotes[1].star).toBe(1);
  });

  it('다른 불만이 섞인 리뷰보다 이 상황만 다룬 리뷰를 먼저 인용한다', () => {
    const mixed = rv('2시간 지났다고 나가래요. 계산도 틀리고 중간결제 내역도 엉망', { star: 1, date: '2025-07-01' });
    const l = computeSituations({ storeId: 'S1', reviews: [...mine, mixed], cards: [], questions: [], brand });
    expect(mixed.tags.length).toBeGreaterThan(1);
    expect(sit(l, 'T01').quotes.map((x) => x.reviewId)).not.toContain(mixed.id);
  });

  it('카드는 매장 카드 먼저, 브랜드 카드 다음. 승인 안 된 카드는 뺀다', () => {
    const cards = [card('B01', '이용시간'), card('C009', '이용시간', { scope: 'store', storeId: 'S1' }), card('C002', '이용시간', { scope: 'store', storeId: 'S1' }), card('C003', '이용시간', { scope: 'store', storeId: 'S1', status: 'pending' })];
    const t01 = sit(computeSituations({ storeId: 'S1', reviews: mine, cards, questions: [], brand }), 'T01');
    expect(t01.cardIds).toEqual(['C002', 'C009', 'B01']);
    expect(t01.storeCard).toBe(true);
  });

  it('gap: 불만 3건 이상이고 매장 카드가 없을 때만', () => {
    expect(sit(list, 'T01').gap).toBe(true);
    expect(sit(list, 'T09').gap).toBe(false); // 1건
    const withOwn = computeSituations({ storeId: 'S1', reviews: mine, cards: [card('C1', '이용시간', { scope: 'store', storeId: 'S1' })], questions: [], brand });
    expect(sit(withOwn, 'T01').gap).toBe(false);
  });

  it('질문은 인용 카드 또는 카드 태그로 센다. 답 대기는 escalated', () => {
    const cards = [card('B03', '최소주문', { tags: ['최소주문'] })];
    const qs = [q('Q1', '아무 말', { cited: ['B03'] }), q('Q2', '최소주문 얼마예요', { status: 'escalated' }), q('Q3', '관계없는 질문')];
    const t03 = sit(computeSituations({ storeId: 'S1', reviews: mine, cards, questions: qs, brand }), 'T03');
    expect(t03.questions).toBe(2);
    expect(t03.openQuestions).toBe(1);
  });

  it('priority = 리뷰×2 + 질문×3 + gap 5 + T10 4, 동점은 id 순', () => {
    expect(sit(list, 'T01').priority).toBe(3 * 2 + 5);
    expect(sit(list, 'T10').priority).toBe(4);
    expect(sit(list, 'T09').priority).toBe(2);
    expect(list.map((s) => s.id).slice(0, 3)).toEqual(['T01', 'T10', 'T09']);
    const tied = computeSituations({ storeId: 'S1', reviews: [], cards: [], questions: [], brand }).map((s) => s.id);
    expect(tied).toEqual(['T10', 'T01', 'T02', 'T03', 'T04', 'T05', 'T06', 'T07', 'T08', 'T09']);
  });
});

describe('첫 근무 준비', () => {
  it('상황마다 첫 카드 1장(매장 카드 먼저)이고 카드 없는 상황과 이미 실린 카드뿐인 상황(T08)은 건너뛴다', () => {
    const cards = [card('B01', '이용시간'), card('C002', '이용시간', { scope: 'store', storeId: 'S1' }), card('B08', '응대 기본')];
    const items = onboardingItems(computeSituations({ storeId: 'S1', reviews: mine, cards, questions: [], brand }));
    expect(items.map((i) => [i.situationId, i.cardId])).toEqual([['T01', 'C002'], ['T09', 'B08']]);
  });

  it('최대 8장', () => {
    const cards = SITUATIONS.flatMap((s) => s.cardTopics.map((t, i) => card(`B${s.id}${i}`, t)));
    expect(computeSituations({ storeId: 'S1', reviews: mine, cards, questions: [], brand }).filter((s) => s.cardIds.length).length).toBeGreaterThan(8);
    expect(onboardingItems(computeSituations({ storeId: 'S1', reviews: mine, cards, questions: [], brand }))).toHaveLength(8);
  });

  it('필수 상황 T06·T10은 순위가 낮아도 카드가 있으면 항상 넣고 목록은 priority 순', () => {
    const cards = SITUATIONS.flatMap((s) => s.cardTopics.map((t, i) => card(`B${s.id}${i}`, t)));
    const sits = computeSituations({ storeId: 'S1', reviews: mine, cards, questions: [], brand });
    const items = onboardingItems(sits);
    const ids = items.map((i) => i.situationId);
    expect(items).toHaveLength(8);
    expect(ids).toContain('T06');
    expect(ids).toContain('T10');
    const order = sits.map((s) => s.id);
    expect(ids).toEqual([...ids].sort((a, b) => order.indexOf(a) - order.indexOf(b)));
    expect(items.find((i) => i.situationId === 'T06')!.why).toBe('선정 근거 · 법규 및 안전 관련 우선 교육');
  });

  it('why 문구 세 갈래', () => {
    const base = computeSituations({ storeId: 'S1', reviews: mine, cards: [card('B03', '최소주문', { tags: ['최소주문'] })], questions: [q('Q1', '최소주문?'), q('Q2', '최소주문 알려줘')], brand });
    expect(whyText(sit(base, 'T01'))).toBe('선정 근거 · 해당 유형의 매장 불만 리뷰 3건');
    expect(whyText(sit(base, 'T03'))).toBe('선정 근거 · 관련 직원 질문 2건');
    expect(whyText(sit(base, 'T10'))).toBe('선정 근거 · 본사 기본 응대 절차');
  });

  it('읽음 기록은 그대로 담는다', () => {
    const reads = [{ personId: 'P', cardId: 'B01', at: 'x' }];
    expect(computeOnboarding('S1', [], reads)).toEqual({ storeId: 'S1', items: [], reads });
  });
});

describe('본사 전국 상황', () => {
  it('매장별 상위 3위(0 제외) 안에 든 매장 수를 센다', () => {
    const per = new Map([
      ['A', new Map([['T01', 5], ['T02', 4], ['T03', 3], ['T04', 2]])],
      ['B', new Map([['T04', 1]])],
    ]);
    const out = brandSituations(brand, per, [card('B01', '이용시간'), card('B02', '좌석 배정', { status: 'pending' })]);
    const by = Object.fromEntries(out.map((s) => [s.id, s]));
    expect([by.T01.storesTop3, by.T04.storesTop3, by.T05.storesTop3]).toEqual([1, 1, 0]);
    expect(by.T01.brandCardIds).toEqual(['B01']);
    expect(by.T02.brandCardIds).toEqual([]);
    expect(out[0].id).toBe('T01'); // brandShare 내림차순
  });
});

describe('저장소와 읽음 표시', () => {
  beforeEach(() => db.resetFromSeed());

  it('state용 상황·온보딩 계산, overview에 situations', () => {
    expect(storeSituations('S001')).toHaveLength(10);
    expect(overview().situations).toHaveLength(10);
    expect(storeOnboarding('S001').items.length).toBeGreaterThan(0);
  });

  it('시드: 첫 근무 준비에 필수 상황 T06이 들어 있다', () => {
    const o = storeOnboarding('S001');
    const ids = o.items.map((i) => i.situationId);
    expect(ids).toContain('T06');
  });

  it('읽음 표시: 중복은 한 번만, 로그 한 줄', () => {
    const card1 = storeOnboarding('S001').items[0].cardId;
    const log0 = db.get().log.length;
    markOnboardingRead('S001', 'P003', card1);
    const after = markOnboardingRead('S001', 'P003', card1);
    expect(after.reads.filter((r) => r.personId === 'P003' && r.cardId === card1)).toHaveLength(1);
    expect(db.get().log.length).toBe(log0 + 1);
  });

  it('다른 매장 사람·목록에 없는 카드는 400', () => {
    const c = storeOnboarding('S001').items[0].cardId;
    expect(() => markOnboardingRead('S001', 'P020', c)).toThrowError(expect.objectContaining({ status: 400 }));
    expect(() => markOnboardingRead('S001', 'nobody', c)).toThrowError(expect.objectContaining({ status: 400 }));
    expect(() => markOnboardingRead('S001', 'P003', 'ZZZ')).toThrowError(expect.objectContaining({ status: 400 }));
  });

  it('예전 저장 파일(읽음 기록 없음)도 불러온다', () => {
    const d = db.get() as Partial<ReturnType<typeof db.get>>;
    delete d.onboardingReads;
    db.save();
    expect(db.load().db.onboardingReads).toEqual([]);
  });
});
