// 규칙 모드(AI_MODE=rules)에서 흐름 전체를 확인한다. 고정 자료: test/fixtures/seed
import { beforeEach, describe, expect, it } from 'vitest';
import type { RunEvent } from '@shared/contracts';
import * as flows from '../src/flows/index.js';
import * as hq from '../src/flows/hq.js';
import * as db from '../src/store/db.js';
import { bus } from '../src/harness/trace.js';
import { config } from '../src/harness/config.js';
import { buildGraph } from '../src/store/graph.js';
import { allStats, storeDetail, storeSituations } from '../src/hq/service.js';
import { app } from '../src/server.js';
import { wordingGuard } from '../src/agents/verify.js';

beforeEach(() => {
  db.resetFromSeed();
  bus.clear();
  flows.clearCaches();
});

const collect = () => {
  const events: RunEvent[] = [];
  const off = bus.subscribe((e) => events.push(e));
  return { events, off };
};
const agentsOf = (events: RunEvent[], runId: string) =>
  events.filter((e): e is Extract<RunEvent, { type: 'agent-end' }> => e.type === 'agent-end' && e.runId === runId).map((e) => e.step.agentId);

describe('하네스 선언', () => {
  it('PLAN §6의 팀·에이전트·흐름', () => {
    expect(config.teams.map((t) => t.id)).toEqual(['lead', 'monitor', 'diagnose', 'prescribe', 'capture', 'answer', 'verify', 'keeper']);
    expect(config.agents).toHaveLength(22);
    expect(new Set(config.teams.map((t) => t.color)).size).toBe(config.teams.length);
    for (const a of config.agents) expect(a.card).toBe(`agents/${a.team}/${a.id}.md`);
    expect(config.flows.diagnose.steps).toEqual(['orchestrator', 'cause-analyst', 'drift-detector', 'quote-checker', 'wording-guard']);
    expect(config.agents.some((a) => a.team === 'stock')).toBe(false);
  });
});

describe('매장 원인 진단', () => {
  it('runId를 먼저 주고, 끝나면 진단·규칙 차이가 저장된다. 모든 인용은 그 매장 리뷰 원문이다', async () => {
    const { events, off } = collect();
    const { runId, done } = hq.diagnose('S001');
    expect(runId).toMatch(/^run-/);
    const diag = await done;
    off();
    expect(agentsOf(events, runId)).toEqual(config.flows.diagnose.steps);
    expect(events.find((e) => e.type === 'run-start' && e.runId === runId)).toMatchObject({ storeId: 'S001', flow: 'diagnose' });
    expect(events.some((e) => e.type === 'gate' && e.gate.gateId === 'diagnose-gate')).toBe(true);

    expect(diag.via).toBe('rules');
    const byType = Object.fromEntries(diag.findings.map((f) => [f.complaint, f.cause]));
    expect(byType).toMatchObject({ 이용시간제한: '지식 공백', '규칙 미고지·말바꿈': '지식 공백', '직원 태도': '운영·인력', '품절·대체': '지식 공백' });
    expect(diag.findings.some((f) => f.complaint === '다른 지점 비교')).toBe(false);
    for (const f of diag.findings) {
      expect(f.quotes.length).toBeGreaterThan(0);
      for (const q of f.quotes) {
        const r = db.review(q.reviewId)!;
        expect(r.storeId).toBe('S001');
        expect(r.text.includes(q.text)).toBe(true);
      }
    }
    expect(diag.findings.find((f) => f.complaint === '이용시간제한')).toMatchObject({ count: 4, share: 0.4, standardId: 'H01' });
    const detail = storeDetail('S001')!;
    expect(detail.diagnosis?.id).toBe(diag.id);
    expect(detail.drifts).toEqual([expect.objectContaining({ standardId: 'H01', status: 'open', reviewIds: ['R001', 'R002'] })]);
  });

  it('최소주문은 기본으로 매장 자체 규칙, 반복된 소인원 거절은 규칙 차이로 기록된다', async () => {
    const diag = await hq.diagnose('S003').done;
    expect(diag.findings.find((f) => f.complaint === '최소주문')?.cause).toBe('매장 자체 규칙');
    expect(diag.findings.find((f) => f.complaint === '좌석·인원')?.cause).toBe('매장 자체 규칙');
    expect(db.get().drifts.filter((d) => d.storeId === 'S003').map((d) => d.standardId).sort()).toEqual(['H02', 'H03']);
    const fixed = hq.driftAction(db.get().drifts.find((d) => d.standardId === 'H03')!.id, 'accept');
    expect(fixed.status).toBe('accepted');
    // 다시 진단해도 본사가 인정한 상태는 지킨다
    await hq.diagnose('S003').done;
    expect(db.get().drifts.find((d) => d.id === fixed.id)?.status).toBe('accepted');
  });

  it('시작 준비: 위험 상위 매장과 타깃을 미리 진단하고 처방은 만들지 않는다', async () => {
    const ids = await hq.warmup();
    expect(ids).toEqual(['S001', 'S003', 'S002']);
    expect(db.get().diagnoses.map((d) => d.storeId).sort()).toEqual(['S001', 'S002', 'S003']);
    expect(db.get().prescriptions).toEqual([]);
    expect(storeDetail('S001')!.drifts).toHaveLength(1);
  });
});

describe('처방 → 점장 승인 → 브리핑', () => {
  it('지식 공백은 사례 카드·브리핑, 나머지는 SV 방문 과제. 발송 전 카드는 매장에 안 보이고, 승인하면 브리핑에 들어간다', async () => {
    await hq.diagnose('S001').done;
    const { events, off } = collect();
    const { runId, done } = hq.prescribe('S001');
    const list = await done;
    off();
    expect(agentsOf(events, runId)).toEqual(config.flows.prescribe.steps);
    expect(list.map((p) => p.kind).sort()).toEqual(['SV 방문 과제', 'SV 방문 과제', '근무 전 브리핑', '사례 카드', '사례 카드', '사례 카드']);
    expect(list.every((p) => p.status === 'draft')).toBe(true);
    const sv = list.filter((p) => p.kind === 'SV 방문 과제');
    expect(sv.map((p) => p.title).join()).toMatch(/본사 표준 확인 방문 \(H01\)/);
    expect(sv.find((p) => p.title.includes('H01'))!.body).toMatch(/규칙 차이 RD001/);
    expect(sv.every((p) => p.checklist.length >= 3)).toBe(true);

    const rx = list.find((p) => p.kind === '사례 카드' && p.title.includes('품절'))!;
    const cardId = rx.cardIds[0];
    const card = db.card(cardId)!;
    expect(card).toMatchObject({ storeId: 'S001', status: 'pending', origin: '처방', prescriptionId: rx.id, complaintTypes: ['품절·대체'], standardId: 'H04', source: '본사 표준' });
    expect(card.customerNotice).toBe(db.standard('H04')!.customerNotice);
    expect(wordingGuard([card.title, card.reason, ...card.actions, card.avoid].join('\n')).out).toEqual([]);
    // 발송 전에는 매장에 보이지 않는다
    expect(db.storeCards('S001').some((c) => c.id === cardId)).toBe(false);

    hq.prescriptionAction(rx.id, 'send');
    expect(db.storeCards('S001').find((c) => c.id === cardId)?.status).toBe('pending');
    expect((await flows.briefing('S001')).items.some((i) => i.cardId === cardId)).toBe(false);

    await flows.cardAction('S001', cardId, 'approve');
    expect(db.prescription(rx.id)?.status).toBe('done');
    const b = await flows.briefing('S001');
    const item = b.items.find((i) => i.cardId === cardId)!;
    expect(item.say).toBe(card.customerNotice);
    // 본사 카드(C001)도 브리핑에 들어가고, 매장 상위 불만(이용시간제한) 관련이 앞에 온다
    expect(b.items[0].cardId).toBe('C001');
    expect(b.items[0].why).toMatch(/이용시간제한/);
    // 이용시간 처방 카드도 승인하면 본사 카드와 안내 문장이 같으므로 브리핑에는 한 번만 나온다
    const timeRx = list.find((p) => p.kind === '사례 카드' && p.title.includes('이용시간'))!;
    hq.prescriptionAction(timeRx.id, 'send');
    await flows.cardAction('S001', timeRx.cardIds[0], 'approve');
    const b2 = await flows.briefing('S001');
    expect(new Set(b2.items.map((i) => i.say)).size).toBe(b2.items.length);

    const detail = storeDetail('S001')!;
    expect(detail.outcome?.prescriptionIds).toContain(rx.id);
    const g = buildGraph('S001');
    expect(g.edges.some((e) => e.type === 'delivers' && e.target === cardId)).toBe(true);
  });

  it('다시 처방하면 보내지 않은 초안과 그 카드는 새 초안으로 바뀌고, 반려하면 카드도 반려된다', async () => {
    const first = await hq.prescribe('S001').done; // 진단이 없으면 규칙 진단을 먼저 만든다
    expect(db.get().diagnoses).toHaveLength(1);
    const oldCards = first.flatMap((p) => p.cardIds).filter((id) => db.card(id)?.origin === '처방');
    const second = await hq.prescribe('S001').done;
    expect(db.get().prescriptions).toHaveLength(second.length);
    for (const id of new Set(oldCards)) if (!second.some((p) => p.cardIds.includes(id))) expect(db.card(id)).toBeUndefined();
    const rx = second.find((p) => p.kind === '사례 카드')!;
    hq.prescriptionAction(rx.id, 'reject');
    expect(db.card(rx.cardIds[0])?.status).toBe('rejected');
    expect(() => hq.prescriptionAction(rx.id, 'send')).toThrow();
  });
});

describe('처방 효과(가상 리뷰)', () => {
  it('처방 전은 실제 리뷰(8주 표본이 적으면 최근 30건), 처방 후는 가상 리뷰', async () => {
    const o = await hq.simulate('S001');
    expect(o.virtual).toBe(true);
    expect(o.before.n).toBe(16);
    expect(o.after).toMatchObject({ n: 4, mean: 4.25, from: '2026-11-25', to: '2026-12-15' });
    expect(db.reviewsOf('S001').filter((r) => r.virtual)).toHaveLength(4);
    // 두 번 불러도 가상 리뷰를 다시 넣지 않는다
    await hq.simulate('S001');
    expect(db.reviewsOf('S001').filter((r) => r.virtual)).toHaveLength(4);
    await expect(hq.simulate('S002')).rejects.toThrow(/가상 리뷰 없음/);
  });
});

describe('표준 개정 제안', () => {
  it('고위험 매장이 5곳 미만이면 제안이 없고, 기준을 낮추면 제안이 생겨 승인할 수 있다', async () => {
    expect(await hq.promote().done).toEqual([]);
    // 고정 자료에는 고위험(60 이상) 매장이 없으므로 점수를 높여 본다
    for (const s of allStats().scores.values()) if (s.rank !== null) s.risk = 70;
    const made = await hq.promote(2).done;
    expect(made.map((p) => p.title)).toContain("규칙 미고지·말바꿈 반복: '이용시간 안내는 입장할 때' 개정");
    expect(made[0].storeIds.length).toBeGreaterThanOrEqual(2);
    expect(hq.proposalAction(made[0].id, 'approve').status).toBe('approved');
    expect(await hq.promote(2).done).toEqual([]); // 이미 낸 제안은 다시 내지 않는다
  });
});

describe('알바 질문', () => {
  it('카드를 근거로 답하고, 본사 표준과 매장 노하우가 다르면 본사 표준을 앞세운다', async () => {
    const { events, off } = collect();
    const r = await flows.ask('S001', '웨이팅 없는데 2시간 지난 테이블에 퇴장 안내해야 해요?', 'P003');
    off();
    expect(agentsOf(events, r.runId)).toEqual(config.flows.ask.steps);
    expect(r.question.status).toBe('answered');
    expect(r.question.storeId).toBe('S001');
    expect(r.question.cited[0]).toBe('C001');
    expect(r.question.cited).toContain('C002');
    expect(r.question.answer).toMatch(/본사 표준을 따릅니다/);
    // 매장 노하우가 검색 1위여도 같은 토픽의 본사 표준 카드를 앞세운다
    const r2 = await flows.ask('S001', '바쁜 날 2시간 지나면 퇴장 안내해도 돼요?', 'P003');
    expect(r2.question.cited[0]).toBe('C001');
    expect(r2.question.answer.split('\n')[0]).toMatch(/\[C001\]/);
    expect(r2.question.answer).toMatch(/본사 표준을 따릅니다/);
  });

  it('근거가 없으면 점장에게 넘긴다', async () => {
    const r = await flows.ask('S001', '손님이 강아지를 데리고 들어왔어요', 'P003');
    expect(r.question.status).toBe('escalated');
    expect(r.question.cited).toEqual([]);
  });

  it('매장 분리: 강남 윤슬점 질문은 다른 매장 카드를 인용하지 않는다', async () => {
    const a = await flows.ask('S001', '생맥주가 거품만 나와요 케그 바꿔야 해요?', 'P003');
    expect(a.question.cited).not.toContain('C005');
    expect(a.candidates.map((c) => c.id)).not.toContain('C005');
    expect(a.question.cited.every((id) => [null, 'S001'].includes(db.card(id)!.storeId))).toBe(true);
    const b = await flows.ask('S003', '생맥주가 거품만 나와요 케그 바꿔야 해요?', 'P020');
    expect(b.question.cited).toContain('C005');
    // 다른 매장 질문·카드를 그 매장 경로로는 바꿀 수 없다
    await expect(flows.cardAction('S001', 'C005', 'approve')).rejects.toThrow();
    await expect(flows.feedback('S003', a.question.id, true)).rejects.toThrow();
  });

  it('안전 상황은 카드 없이 바로 점장에게', async () => {
    const r = await flows.ask('S001', '취한 손님이 다른 손님을 때리려고 해요', 'P003');
    expect(r.question.status).toBe('escalated');
    expect(r.question.answer).toMatch(/안전 관련 상황/);
  });

  it('위키가 모르는 질문 → 점장 답 → 새 카드 → 다음 질문은 위키가 답한다', async () => {
    const first = await flows.ask('S001', '외국인 손님이 알리페이로 결제하고 싶대요', 'P003');
    expect(first.question.status).toBe('escalated');
    const { question, card } = await flows.resolve('S001', first.question.id, '알리페이는 안 된다. 카드나 현금을 안내한다. 결제 수단을 모르면 불만이 커지기 때문이다.', 'P001');
    expect(question.status).toBe('resolved');
    expect(card).toMatchObject({ storeId: 'S001', status: 'approved', origin: '에스컬레이션', fromQuestionId: first.question.id });
    const again = await flows.ask('S001', '알리페이 결제 되나요?', 'P003');
    expect(again.question.cited).toContain(card.id);
    // 다른 매장에서는 이 카드가 보이지 않는다
    const other = await flows.ask('S003', '알리페이 결제 되나요?', 'P020');
    expect(other.question.cited).not.toContain(card.id);
  });

  it('회고 기록 → 카드 초안 → 승인 대기', async () => {
    const raw = '단체 손님이 더치페이 한다고 해서 카드마다 금액을 불러 주고 결제함.';
    const d1 = await flows.interview('S001', raw, 'P002');
    expect(d1.followups.length).toBeGreaterThan(0);
    expect(d1.topic).toBe('결제·계산');
    const c = await flows.submitCard('S001', d1, 'P002');
    expect(c).toMatchObject({ storeId: 'S001', scope: 'store', status: 'pending' });
  });
});

describe('v3.1 알바 질문 개선', () => {
  const sitWithCards = () => storeSituations('S001').find((x) => x.cardIds.length > 0)!;

  it('상황 버튼은 검색 없이 그 상황의 첫 카드로 답하고 실행 기록을 남긴다', async () => {
    const sit = sitWithCards();
    const { events, off } = collect();
    const r = await flows.ask('S001', '', 'P003', sit.id);
    off();
    expect(r.question).toMatchObject({ status: 'answered', confidence: 'high', cited: [sit.cardIds[0]], situationId: sit.id, text: sit.title });
    expect(r.question.nearCardId).toBeUndefined();
    expect(agentsOf(events, r.runId)).not.toContain('librarian');
    expect(bus.run(r.runId)).toBeTruthy();
  });

  it('없는 situationId는 400', async () => {
    await expect(flows.ask('S001', '', 'P003', 'T99')).rejects.toMatchObject({ status: 400 });
  });

  it('상황 버튼 질문에 전화번호가 있으면 가린다', async () => {
    const r = await flows.ask('S001', '010-1234-5678 손님 문의', 'P003', sitWithCards().id);
    expect(r.question.text).not.toMatch(/1234-5678/);
  });

  it('넘김이면 가장 가까운 카드를 nearCardId로, 안전 상황은 없다', async () => {
    const r = await flows.ask('S001', '이용시간 때문에 손님이 화내요 어떡해요 강아지도 있어요', 'P003');
    if (r.question.status === 'escalated') expect(r.question.nearCardId).toBeTruthy();
    const none = await flows.ask('S001', '손님이 강아지를 데리고 들어왔어요', 'P003');
    expect(none.question.status).toBe('escalated');
    expect(none.question.answer).toMatch(/점장에게 직접 연락/);
    expect(none.question.answer).not.toMatch(/바로 알렸|즉시 통보|알림을 (보냈|발송)/);
    const safe = await flows.ask('S001', '취한 손님이 다른 손님을 때리려고 해요', 'P003');
    expect(safe.question.nearCardId).toBeUndefined();
  });

  it('아직이에요를 누르면 넘김 문구로 바뀌고 가까운 카드가 남는다', async () => {
    const r = await flows.ask('S001', '', 'P003', sitWithCards().id);
    const q = await flows.feedback('S001', r.question.id, false);
    expect(q.status).toBe('escalated');
    expect(q.answer).toBe('미해결 질문을 점장 업무 목록에 등록. 긴급 시 점장에게 직접 연락.');
    expect(q.nearCardId).toBe(r.question.cited[0]);
  });

  it('점장 답의 첫 문장(40자 이내)이 카드 제목, 질문 원문이 situation', async () => {
    const first = await flows.ask('S001', '외국인 손님이 알리페이로 결제하고 싶대요', 'P003');
    const { card } = await flows.resolve('S001', first.question.id, '알리페이는 안 된다. 카드나 현금을 안내한다. 결제 수단을 모르면 불만이 커지기 때문이다.', 'P001');
    expect(card.title).toBe('알리페이는 안 된다');
    expect(card.situation).toBe(first.question.text);
  });

  it('카드 고치기: 점장이 고치면 승인 유지, 다른 사람이 고치면 승인 대기', async () => {
    const own = db.get().cards.find((c) => c.storeId === 'S001' && c.status === 'approved')!;
    const a = await flows.cardEdit('S001', own.id, { title: '고친 제목' }, 'P001');
    expect(a).toMatchObject({ title: '고친 제목', status: 'approved' });
    const b = await flows.cardEdit('S001', own.id, { title: '또 고친 제목' }, 'P003');
    expect(b).toMatchObject({ title: '또 고친 제목', status: 'pending' });
  });

  it('카드 고치기: 본사 카드는 403, 금지 표현은 400', async () => {
    const brand = db.get().cards.find((c) => c.scope === 'brand')!;
    await expect(flows.cardEdit('S001', brand.id, { title: 'x' }, 'P001')).rejects.toMatchObject({ status: 403 });
    const own = db.get().cards.find((c) => c.storeId === 'S001')!;
    await expect(flows.cardEdit('S001', own.id, { avoid: '최소주문은 없다고 말한다 무조건 환불해 드립니다' }, 'P001')).rejects.toBeDefined();
  });

  it('HTTP: 상황 버튼 ask, edit 라우트, state.now', async () => {
    const sit = sitWithCards();
    const server = app.listen(0);
    const base = `http://127.0.0.1:${(server.address() as { port: number }).port}/api/stores/S001`;
    const post = (path: string, body: unknown) => fetch(`${base}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    try {
      const st = await (await fetch(`${base}/state`)).json();
      expect(st.now).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
      const ok = await post('/ask', { situationId: sit.id, askerId: 'P003' });
      expect(ok.status).toBe(200);
      expect((await ok.json()).question.cited).toEqual([sit.cardIds[0]]);
      expect((await post('/ask', { situationId: 'T99' })).status).toBe(400);
      expect((await post('/ask', {})).status).toBe(400);
      const own = db.get().cards.find((c) => c.storeId === 'S001' && c.status === 'approved')!;
      const ed = await post(`/cards/${own.id}/edit`, { edits: { title: '새 제목' }, editorId: 'P001' });
      expect(await ed.json()).toMatchObject({ title: '새 제목', status: 'approved' });
    } finally {
      server.close();
    }
  });
});

describe('점검과 스트림', () => {
  it('점검관은 열린 규칙 차이를 표준 불일치로 알린다', async () => {
    await hq.diagnose('S001').done;
    const issues = await flows.lint('S001');
    expect(issues.find((i) => i.kind === '표준 불일치')?.detail).toMatch(/이용시간/);
  });

  it('?storeId 스트림은 그 매장 + 본사 실행만 보낸다', async () => {
    await flows.ask('S003', '생맥주 거품', 'P020');
    await flows.ask('S001', '생맥주 거품', 'P003');
    await hq.promote().done;
    const visible = bus.replay().filter((e) => bus.visibleTo(e, 'S001'));
    const stores = new Set(visible.map((e) => bus.storeOf(e)));
    expect([...stores].sort()).toEqual([null, 'S001'].sort());
  });
});
