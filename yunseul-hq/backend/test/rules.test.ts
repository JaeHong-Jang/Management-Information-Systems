// 규칙(순수 함수)과 계산 결과. 고정 자료: test/fixtures/seed (매장 4곳, 리뷰 29건, 표준 4개, 카드 6개)
import { beforeEach, describe, expect, it } from 'vitest';
import type { Finding, Review } from '@shared/contracts';
import { causeOf, detectDrifts, majorityCause } from '../src/rules/causes.js';
import { quoteFrom, tagText } from '../src/rules/tagging.js';
import { proposalCandidates } from '../src/rules/prescribe.js';
import { bucketOf } from '../src/rules/overview.js';
import { quoteChecker, LOW_CONFIDENCE } from '../src/agents/verify.js';
import { allStats, overview, reviewPage, storeDetail } from '../src/hq/service.js';
import * as db from '../src/store/db.js';

beforeEach(() => {
  db.resetFromSeed();
});

const rv = (id: string, text: string, star = 1, storeId = 'S001'): Review => ({ id, storeId, platform: '카카오', star, date: '2025-05-01', text, tags: tagText(text), tagVia: 'rules' });

describe('불만 유형 태깅(정규식 12종)', () => {
  it.each([
    ['웨이팅도 없는데 2시간 지났다고 나가라고 하네요', ['이용시간제한']],
    ['2인은 안 받는다고 해서 그냥 나왔어요', ['좌석·인원']],
    ['최소 주문 2만원 있다고 해서 황당', ['최소주문']],
    ['처음부터 말해 주지', ['규칙 미고지·말바꿈']],
    ['불친절하고 반말해요', ['직원 태도']],
    ['안주 품절이라고', ['품절·대체']],
    ['영수증 금액이 더 나왔어요', ['결제·계산']],
    ['실물 민증 가져오래요', ['신분증']],
    ['머리카락이 나왔어요', ['위생']],
    ['주문이 누락돼서 한참', ['대기·서빙지연']],
    ['미지근하고 맛이 없어요', ['맛·품질']],
    ['다른 지점은 안 그래요', ['다른 지점 비교']],
    ['맥주 시원하고 좋아요', []],
  ])('%s', (text, tags) => expect(tagText(text)).toEqual(tags));

  it('시드 태그는 믿지 않고 불러올 때 다시 태깅한다', () => {
    expect(db.review('R002')!.tags).toEqual(['이용시간제한', '직원 태도']);
    expect(db.review('R012')!.tags).toEqual(['이용시간제한', '다른 지점 비교']);
  });

  it('인용은 원문의 부분 문자열(불만이 걸린 문장)이다', () => {
    const text = '분위기는 좋아요. 그런데 안주 품절이라고 다른 걸 권해요. 다음엔 안 올래요';
    const q = quoteFrom(text, '품절·대체');
    expect(text.includes(q)).toBe(true);
    expect(q).toBe('그런데 안주 품절이라고 다른 걸 권해요.');
  });
});

describe('원인 분류(PLAN §4)', () => {
  const t = (tags: Review['tags'], text = '') => ({ tags, text });
  it('기본 원인', () => {
    const none = new Set<never>();
    expect(causeOf('규칙 미고지·말바꿈', t([]), none)).toBe('지식 공백');
    expect(causeOf('이용시간제한', t([]), none)).toBe('지식 공백');
    expect(causeOf('최소주문', t([]), none)).toBe('매장 자체 규칙');
    expect(causeOf('대기·서빙지연', t([]), none)).toBe('운영·인력');
    expect(causeOf('위생', t([]), none)).toBe('위생·품질');
    expect(causeOf('맛·품질', t([]), none)).toBe('위생·품질');
    expect(causeOf('다른 지점 비교', t([]), none)).toBeNull();
  });

  it('예외: 매장에 규칙 차이가 있고 그 리뷰에 표준과 다른 운영이 드러나면 매장 자체 규칙', () => {
    const outNoWait = '웨이팅도 없는데 2시간 됐다고 나가래요';
    expect(causeOf('이용시간제한', t(['이용시간제한'], outNoWait), new Set(['time']))).toBe('매장 자체 규칙');
    // 같은 매장이라도 고지 실패만 드러난 리뷰는 지식 공백
    expect(causeOf('이용시간제한', t(['이용시간제한'], '두 시간 제한을 말 안 해줌'), new Set(['time']))).toBe('지식 공백');
    // 매장에 드리프트가 확인되지 않았으면 지식 공백
    expect(causeOf('이용시간제한', t(['이용시간제한'], outNoWait), new Set())).toBe('지식 공백');
    expect(causeOf('좌석·인원', t(['좌석·인원'], '2인은 안 받는대요'), new Set(['seat']))).toBe('매장 자체 규칙');
    expect(causeOf('좌석·인원', t(['좌석·인원'], '2인은 안 받는대요'), new Set(['time']))).toBe('지식 공백');
  });

  it('예외: 직원 태도에 규칙 관련 유형이 함께 붙으면 지식 공백', () => {
    expect(causeOf('직원 태도', t(['직원 태도']), new Set())).toBe('운영·인력');
    expect(causeOf('직원 태도', t(['직원 태도', '이용시간제한']), new Set())).toBe('지식 공백');
  });

  it('대표 원인은 리뷰별 원인의 다수, 같으면 기본 원인', () => {
    expect(majorityCause('직원 태도', { '지식 공백': 1, '운영·인력': 1 })).toBe('운영·인력');
    expect(majorityCause('직원 태도', { '지식 공백': 2, '운영·인력': 1 })).toBe('지식 공백');
  });
});

describe('규칙 차이(RuleDrift) 탐지', () => {
  const st = () => db.get().standards;
  it('웨이팅이 없는데 퇴장 요청 → H01', () => {
    const d = detectDrifts([rv('X1', '자리 많은데도 두 시간 되니까 퇴장하라고 함')], st());
    expect(d.map((x) => x.standardId)).toEqual(['H01']);
  });
  it('웨이팅이 있을 때의 퇴장 안내는 드리프트가 아니다', () => {
    expect(detectDrifts([rv('X1', '웨이팅이 길어서 2시간 되니 나가라고 안내받음')], st())).toEqual([]);
  });
  it('소인원 거절은 2건 이상 반복될 때만 H02', () => {
    expect(detectDrifts([rv('X1', '2인은 안 받는대요')], st())).toEqual([]);
    expect(detectDrifts([rv('X1', '2인은 안 받는대요'), rv('X2', '혼자라 안 받는다고 함')], st()).map((x) => x.standardId)).toEqual(['H02']);
  });
  it('최소주문·기본주문 언급 → H03', () => {
    expect(detectDrifts([rv('X1', '기본 주문 2개 해야 한대요')], st()).map((x) => x.standardId)).toEqual(['H03']);
  });
  it('고정 자료: 강남 윤슬점 H01, 마포 A점 H02·H03', () => {
    const { stats } = allStats();
    expect(stats.get('S001')!.drifts.map((d) => d.standardId)).toEqual(['H01']);
    expect(stats.get('S003')!.drifts.map((d) => d.standardId)).toEqual(['H02', 'H03']);
    expect(stats.get('S001')!.drifts[0].reviewIds).toEqual(['R001', 'R002']);
  });
});

describe('편차 점수(PLAN §3)', () => {
  it('R1~R5 배점과 위험 점수', () => {
    const s = allStats().scores.get('S001')!;
    const p = Object.fromEntries(s.parts.map((x) => [x.id, x.points]));
    expect(p).toEqual({ R1: 19.5, R2: 10, R3: 6, R4: 6, R5: 13.3 });
    expect(s.risk).toBe(54.8);
    expect(s.trend).toBe('worse');
    expect(s.knowledgeShare).toBe(0.67); // 저평점 불만 15쌍 중 지식 공백 10(이용시간 4건 중 표준과 다른 퇴장 2건만 매장 자체 규칙)
    expect(s.parts.find((x) => x.id === 'R5')!.basis).toMatch(/15건 중 지식 공백 10건/);
    expect(s.topComplaints).toEqual([{ type: '이용시간제한', count: 4 }, { type: '규칙 미고지·말바꿈', count: 4 }, { type: '직원 태도', count: 2 }]);
  });

  it('표본이 모자라면 미확인 0점', () => {
    const s = allStats().scores.get('S002')!;
    const r3 = s.parts.find((x) => x.id === 'R3')!;
    expect(r3.points).toBe(0);
    expect(r3.basis).toMatch(/미확인/);
    expect(s.trend).toBe('unknown');
    const s3 = allStats().scores.get('S003')!;
    expect(s3.parts.find((x) => x.id === 'R4')!.basis).toMatch(/미확인\(네이버 미매칭\)/);
    expect(s3.risk).toBe(29.2);
    expect(s3.trend).toBe('flat');
  });

  it('순위는 별점 10개 이상이고 분석 제외가 아닌 매장만', () => {
    const { scores } = allStats();
    expect([1, 2, 3].map((r) => [...scores.values()].find((s) => s.rank === r)!.storeId)).toEqual(['S001', 'S003', 'S002']);
    expect(scores.get('S004')!.rank).toBeNull();
    db.store('S003')!.excluded = '리뷰 폭탄';
    db.touchReviews();
    expect(allStats().scores.get('S003')!.rank).toBeNull();
    expect(allStats().scores.get('S002')!.rank).toBe(2);
  });

  it('가상 리뷰는 점수에 넣지 않는다', () => {
    const before = allStats().scores.get('S001')!.risk;
    db.get().reviews.push(...db.get().virtualPool);
    db.touchReviews();
    expect(allStats().scores.get('S001')!.risk).toBe(before);
  });
});

describe('리뷰 인용 검증(quote-checker)', () => {
  const f = (quotes: Finding['quotes']): Finding => ({ id: 'F1', complaint: '이용시간제한', cause: '지식 공백', count: 1, share: 0.1, explanation: '설명', quotes });
  const q = (reviewId: string, text: string) => ({ reviewId, text, platform: '카카오' as const, star: null, date: '' });

  it('그 매장 리뷰의 원문 문장이면 통과하고 별점·날짜를 원문에서 채운다', () => {
    const r = quoteChecker([f([q('R001', '2시간 지났다고 나가라고 하네요.')])], 'S001', db.review);
    expect(r.status).toBe('ok');
    expect(r.out.findings[0].quotes[0]).toMatchObject({ reviewId: 'R001', star: 1, date: '2025-03-10' });
  });

  it('없는 리뷰·다른 매장 리뷰·원문에 없는 문장은 뺀다. 인용이 0개면 낮은 확신으로 남긴다', () => {
    const r = quoteChecker([f([q('R999', '없는 리뷰'), q('R030', '2인은 안 받는다고'), q('R001', '두 시간 넘게 기다렸어요')])], 'S001', db.review);
    expect(r.status).toBe('blocked');
    expect(r.out.problems).toHaveLength(4);
    expect(r.out.findings).toHaveLength(1);
    expect(r.out.findings[0].quotes).toEqual([]);
    expect(r.out.findings[0].explanation).toContain(LOW_CONFIDENCE);
  });
});

describe('표준 개정 제안 후보', () => {
  it('같은 불만이 고위험 매장 N곳 이상에서 상위 불만이면 후보', () => {
    const { scores } = allStats();
    expect(proposalCandidates(db.get().stores, scores)).toEqual([]);
    // 기준을 낮추면 강남 윤슬점·마포 A점 공통 불만(규칙 미고지)이 잡힌다
    const c = proposalCandidates(db.get().stores, scores, 2, 20);
    expect(c.map((x) => x.complaint)).toContain('규칙 미고지·말바꿈');
    expect(c.find((x) => x.complaint === '규칙 미고지·말바꿈')!.storeIds).toEqual(['S001', 'S003']);
  });
});

describe('본사 화면 응답 모양', () => {
  it('전국 현황', () => {
    const o = overview();
    expect(o.brand.name).toBe('역전할머니맥주');
    expect(o.kpis).toEqual({ rankedStores: 3, highRisk: 0, bothLow: 1, openDrifts: 0, openPrescriptions: 0, pendingProposals: 0 });
    expect(o.stores.map((r) => r.store.id)).toEqual(['S001', 'S003', 'S002', 'S004']); // 순위 대상 먼저, 표본 부족 매장(S004)은 뒤
    expect(o.distribution).toHaveLength(8);
    expect(o.distribution[0].bucket).toBe('1.0–1.5');
    expect(o.distribution[bucketOf(2.4)].kakao).toBe(1);
    expect(o.distribution.reduce((s, b) => s + b.kakao, 0)).toBe(3);
    expect(o.distribution.reduce((s, b) => s + b.naver, 0)).toBe(2);
    expect(o.heatmap.map((h) => h.storeId)).toEqual(['S001', 'S003', 'S002']);
    expect(o.heatmap[0].lowTotal).toBe(10);
    expect(o.complaintTotals.some((c) => c.type === '다른 지점 비교')).toBe(false);
    expect(o.complaintTotals.find((c) => c.type === '최소주문')!.cause).toBe('매장 자체 규칙');
    expect(o.regions.find((r) => r.region === '서울')).toMatchObject({ stores: 3, highRisk: 0 });
  });

  it('매장 상세', () => {
    const d = storeDetail('S001')!;
    expect(d.store.name).toBe('강남 윤슬점');
    expect(d.monthly[0].month).toBe('2023-12');
    expect(d.monthly.every((m, i) => i === 0 || d.monthly[i - 1].month < m.month)).toBe(true);
    expect(d.monthly.reduce((s, m) => s + m.n, 0)).toBe(13); // 카카오 리뷰만
    expect(d.peers.map((p) => p.storeId)).toEqual(['S002', 'S003', 'S004']); // 같은 상권(번화가) 먼저
    expect(d.outcome).toBeNull();
    expect(storeDetail('S999')).toBeNull();
  });

  it('리뷰 탐색 필터', () => {
    expect(reviewPage({ storeId: 'S001' }).total).toBe(16);
    expect(reviewPage({ storeId: 'S001', platform: '네이버' }).total).toBe(3);
    expect(reviewPage({ type: '좌석·인원' }).items.map((r) => r.id).sort()).toEqual(['R030', 'R031']);
    expect(reviewPage({ storeId: 'S001', maxStar: 1 }).total).toBe(5);
    expect(reviewPage({ q: '머리카락' }).items[0].id).toBe('R008');
    expect(reviewPage({ limit: 5 }).items).toHaveLength(5);
  });
});
