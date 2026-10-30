// 규칙 모드(LLM 없음)에서 흐름 전체를 확인한다. AI_MODE=rules, STORE_DIR=var/test 는 vitest.config.ts에서 넣는다.
import { beforeEach, describe, expect, it } from 'vitest';
import * as flows from '../src/flows/index.js';
import * as db from '../src/store/db.js';
import { bus } from '../src/harness/trace.js';
import { buildGraph } from '../src/store/graph.js';
import { search } from '../src/tools/search.js';
import { citationChecker, dropForbiddenLines, policyChecker, wordingGuard } from '../src/agents/verify.js';
import { privacyGuard } from '../src/agents/capture.js';
import type { RunEvent } from '@shared/contracts';

beforeEach(() => {
  db.resetFromSeed();
  bus.clear();
});

describe('검색 사서', () => {
  it.each([
    ['오트 우유 없어요', 'C003'],
    ['기프티콘이 이미 사용됐다고 나와요', 'C001'],
    ['쿠폰 할인이 0원으로 나와요', 'C002'],
    ['손님이 소리 지르면서 왜 이렇게 늦냐고 해요', 'C011'],
    ['배달 주문 케이크가 다 팔렸어요', 'C004'],
  ])('%s → %s', (q, id) => {
    expect(search(q, db.approvedCards())[0]?.card.id).toBe(id);
  });

  it('위키에 없는 질문은 가까운 카드가 약하다', () => {
    const top = search('매장에 고양이가 들어왔어요 어떻게 해요?', db.approvedCards())[0];
    expect(!top || top.coverage < 0.25 || top.score < 3).toBe(true);
  });
});

describe('검증팀', () => {
  const approved = () => new Set(db.approvedCards().map((c) => c.id));
  it('없는 카드를 인용하면 막는다', () => {
    const r = citationChecker({ answer: '이렇게 하세요 [C999]', why: '', cited: ['C999'], confidence: 'high', needsManager: false }, approved(), new Set(['C999']));
    expect(r.status).toBe('blocked');
    expect(r.out.answer.cited).toEqual([]);
  });
  it('근거 표시 없는 줄은 뺀다', () => {
    const r = citationChecker({ answer: '근거 있는 줄 [C003]\n지어낸 줄', why: '', cited: ['C003'], confidence: 'high', needsManager: false }, approved(), new Set(['C003']));
    expect(r.out.answer.answer).toBe('근거 있는 줄 [C003]');
  });
  it('공식규정과 현장노하우가 섞이면 규정 우선 안내를 붙인다', () => {
    const r = policyChecker({ answer: '환불 처리 [C006]\n교환 [C007]', why: '', cited: ['C006', 'C007'], confidence: 'high', needsManager: false }, db.approvedCards());
    expect(r.out.answer.answer).toMatch(/공식규정을 따르세요/);
  });
  it('금지 표현을 찾는다', () => {
    expect(wordingGuard('무조건 환불해 주세요').out.length).toBe(1);
    expect(wordingGuard('결제 내역을 먼저 확인한다').out.length).toBe(0);
  });
  it('개인정보를 가린다', () => {
    const r = privacyGuard('김민수 고객님이 010-1234-5678로 전화함');
    expect(r.out.masked).toBe(2);
    expect(r.out.text).not.toMatch(/010-1234/);
  });
});

describe('흐름', () => {
  it('질문 → 근거 답 → 실행 기록에 에이전트 7개가 순서대로 남는다', async () => {
    const events: RunEvent[] = [];
    const off = bus.subscribe((e) => events.push(e));
    const r = await flows.ask('오트 우유가 없는데 일반 우유로 해도 되나요?', 'P005');
    off();
    expect(r.question.status).toBe('answered');
    expect(r.question.cited).toContain('C003');
    const agents = events.filter((e) => e.type === 'agent-end').map((e) => (e as Extract<RunEvent, { type: 'agent-end' }>).step.agentId);
    expect(agents).toEqual(['orchestrator', 'privacy-guard', 'librarian', 'coach', 'citation-checker', 'policy-checker', 'wording-guard', 'escalator']);
    expect(events.some((e) => e.type === 'wiki')).toBe(true);
  });

  it('위키가 모르는 질문 → 점장 답 → 새 카드 → 다음 질문은 위키가 답한다', async () => {
    const first = await flows.ask('외국인 손님이 알리페이로 결제하고 싶대요', 'P005');
    expect(first.question.status).toBe('escalated');
    const { card } = await flows.resolve(first.question.id, '알리페이는 안 된다. 카드나 현금을 안내한다. 결제 수단을 모르면 불만이 커지기 때문이다.', 'P001');
    expect(card.status).toBe('approved');
    expect(card.fromQuestionId).toBe(first.question.id);
    const again = await flows.ask('알리페이 결제 되나요?', 'P006');
    expect(again.question.status).toBe('answered');
    expect(again.question.cited).toContain(card.id);
    const g = buildGraph();
    expect(g.edges.some((e) => e.type === 'became' && e.target === card.id)).toBe(true);
    // 같은 내용을 기다리던 시드 질문 Q001도 함께 닫힌다
    expect(db.question('Q001')?.status).toBe('resolved');
  });

  it('회고 인터뷰: 이유가 없으면 되묻고, 답을 받으면 이유 칸이 채워진다', async () => {
    const raw = '배민 주문에 수저가 빠졌다고 연락옴. 사장님 앱으로 사과하고 다음 주문 쿠폰 드림.';
    const d1 = await flows.interview(raw, 'P002');
    expect(d1.followups.length).toBeGreaterThan(0);
    expect(d1.topic).toBe('배달앱 주문');
    const d2 = await flows.interview(raw, 'P002', [{ question: d1.followups[0], answer: '배달은 얼굴을 못 봐서 늦게 사과하면 바로 낮은 별점이 달리기 때문.' }]);
    expect(d2.reason).toMatch(/별점/);
    const c = await flows.submitCard(d2, 'P002');
    expect(c.status).toBe('pending');
  });

  it('점검관이 공식규정과 현장노하우의 상충, 만료, 중복을 찾는다', async () => {
    const { issues } = await flows.lint();
    const kinds = issues.map((i) => i.kind);
    expect(issues.find((i) => i.kind === '상충')?.ids).toEqual(['C006', 'C007']);
    expect(kinds).toContain('만료');
    expect(kinds).toContain('중복');
    expect(db.get().links.some((l) => l.type === 'conflicts')).toBe(true);
  });
});

describe('1차 심사 지적 반영: 잘못된 답은 보이지 않거나 점장에게 간다', () => {
  const approved = () => new Set(db.approvedCards().map((c) => c.id));

  it('유효 인용과 허위 인용이 섞이면 허위 인용 줄만 빠진다', () => {
    const r = citationChecker({ answer: '맞는 줄 [C003]\n지어낸 줄 [C999]\n섞인 줄 [C003][C999]', why: '', cited: ['C003', 'C999'], confidence: 'high', needsManager: false }, approved(), new Set(['C003']));
    expect(r.out.answer.answer).toBe('맞는 줄 [C003]');
    expect(r.out.answer.cited).toEqual(['C003']);
  });

  it('금지 표현이 든 줄은 신입에게 보이지 않는다', () => {
    expect(dropForbiddenLines('결제 내역을 확인한다 [C006]\n무조건 환불해 준다 [C006]')).toBe('결제 내역을 확인한다 [C006]');
  });

  it('만료된 카드는 답의 근거에서 빠진다', async () => {
    const c = db.card('C003')!;
    c.expires = '2026-01-01';
    const r = await flows.ask('오트 우유가 없는데 일반 우유로 해도 되나요?', 'P005');
    expect(r.question.cited).not.toContain('C003');
  });

  it('공식규정과 상충한다고 표시된 현장노하우는 근거에서 빠진다', async () => {
    db.card('C007')!.expires = '2027-12-31'; // 만료가 아니라 상충 때문에 빠지는지 본다
    await flows.lint();
    const { excluded } = db.usableCards();
    expect(excluded.find((e) => e.id === 'C007')?.why).toBe('공식규정과 상충');
    const r = await flows.ask('영수증 없이 교환해 달래요', 'P005');
    expect(r.question.cited).not.toContain('C007');
  });

  it('점장 호출 기준에 해당하면 답 대신 점장에게 넘기고 그동안 할 일만 보여 준다', async () => {
    const r = await flows.ask('기프티콘이 사용 완료라는데 사용 매장이 우리 매장으로 조회돼요', 'P005');
    expect(r.question.status).toBe('escalated');
    expect(r.question.answer).toMatch(/점장 호출 기준에 해당해요/);
  });

  it('질문 속 개인정보는 저장·실행 기록 전에 가려진다', async () => {
    const r = await flows.ask('010-1234-5678 손님이 기프티콘이 이미 사용됐대요', 'P005');
    expect(r.question.text).not.toMatch(/010-1234/);
  });

  it('점장 답에 금지 표현이 있으면 승인 대기로 저장된다', async () => {
    const q = (await flows.ask('매장 와이파이 비밀번호를 물어봐요', 'P005')).question;
    const { card } = await flows.resolve(q.id, '무조건 무료로 드린다. 와이파이 비밀번호는 영수증에 있다.', 'P001');
    expect(card.status).toBe('pending');
  });

  it('금지 표현이 남은 카드는 승인되지 않는다', async () => {
    const c = await flows.submitCard({ title: '시험 카드', topic: '기타', situation: '시험', reason: '시험', actions: ['무조건 환불한다'], avoid: '', escalateWhen: '', source: '현장노하우', tags: [] }, 'P002');
    await expect(flows.cardAction(c.id, 'approve')).rejects.toThrow(/표현을 다듬어야/);
    expect(db.card(c.id)?.status).toBe('pending');
  });
});

describe('2차 심사 지적 반영', () => {
  it("'공식규정'이라는 말만 있고 카드 근거가 없는 줄은 빠진다", () => {
    const r = citationChecker({ answer: '결제 내역을 확인한다 [C006]\n공식규정상 50만원을 지급하세요', why: '', cited: ['C006'], confidence: 'high', needsManager: false }, new Set(['C006']), new Set(['C006']));
    expect(r.out.answer.answer).toBe('결제 내역을 확인한다 [C006]');
  });

  it('금액 기준은 숫자로 비교한다: 3만원 이상 기준에 2만원은 해당하지 않는다', async () => {
    const low = await flows.ask('영수증 없이 2만원 환불해 달래요', 'P005');
    expect(low.question.status).toBe('answered');
    const high = await flows.ask('영수증 없이 5만원 환불해 달래요', 'P005');
    expect(high.question.status).toBe('escalated');
  });

  it('말을 바꾼 안전 상황(두드러기, 때리려고)도 점장에게 넘어간다', async () => {
    for (const text of ['두유 라떼 마신 손님 얼굴에 두드러기가 났어요', '손님이 때리려고 해요']) {
      const r = await flows.ask(text, 'P005');
      expect(r.question.status).toBe('escalated');
      expect(r.question.answer).toMatch(/안전과 관련된 상황/);
    }
  });

  it('승인 대기인 점장 답은 신입에게 닫힌 질문으로 보이지 않고, 승인되면 닫힌다', async () => {
    const q = (await flows.ask('매장 와이파이 비밀번호를 물어봐요', 'P005')).question;
    const { card } = await flows.resolve(q.id, '무조건 무료로 드린다. 와이파이 비밀번호는 영수증에 있다.', 'P001');
    expect(card.status).toBe('pending');
    expect(db.question(q.id)?.status).toBe('escalated');
    card.actions = ['와이파이 비밀번호는 영수증 하단에 있다고 안내한다'];
    card.reason = '영수증에 인쇄돼 있어 직원이 따로 알려 줄 필요가 없다';
    card.situation = '매장 와이파이 비밀번호 문의';
    await flows.cardAction(card.id, 'approve');
    expect(db.question(q.id)?.status).toBe('resolved');
  });

  it("규칙 모드 카드 편집자는 '안 된다'는 사실 서술을 금지 칸에 넣지 않는다", async () => {
    const { card } = await flows.resolve((await flows.ask('외국인 손님이 알리페이 결제를 원해요', 'P005')).question.id, '우리 단말기는 알리페이가 안 된다. 카드나 현금을 안내한다.', 'P001');
    expect(card.avoid).not.toMatch(/알리페이가 안 된다/);
  });
});
