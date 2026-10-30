// 규칙 모드(LLM 없음)에서 흐름 전체를 확인한다. AI_MODE=rules, STORE_DIR=var/test 는 vitest.config.ts에서 넣는다.
import { beforeEach, describe, expect, it } from 'vitest';
import * as flows from '../src/flows/index.js';
import * as db from '../src/store/db.js';
import { bus } from '../src/harness/trace.js';
import { buildGraph } from '../src/store/graph.js';
import { search } from '../src/tools/search.js';
import { citationChecker, policyChecker, wordingGuard } from '../src/agents/verify.js';
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
    expect(agents).toEqual(['orchestrator', 'librarian', 'coach', 'citation-checker', 'policy-checker', 'wording-guard', 'escalator']);
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
