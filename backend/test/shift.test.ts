// 근무 지도(규칙 모드, 술집 데모 시드): 말 한 줄 → 단계 지도 · 판정관 채점 · 점장 확인 · 근무 넘기기 · 반복 실수
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { judge, pickByRules, routines } from '../src/agents/shift.js';
import { repeatIssues, shiftWaitIssues } from '../src/agents/keeper.js';
import { addDays } from '../src/inventory/calc.js';
import * as db from '../src/store/db.js';
import * as shift from '../src/flows/shift.js';
import * as stock from '../src/flows/stock.js';
import { bus } from '../src/harness/trace.js';
import { DATA_DIR } from '../src/paths.js';

beforeEach(() => {
  db.resetFromSeed(join(DATA_DIR, 'seed.json'));
  bus.clear();
});

type S = Awaited<ReturnType<typeof shift.plan>>;
const step = (s: S, id: string) => s.steps.find((x) => x.id === id)!;

describe('근무 설계자', () => {
  it('말한 순서대로 루틴을 고르고, 흔한 말로는 루틴을 더 붙이지 않는다', () => {
    expect(pickByRules('마감하고 축제 준비까지', routines())).toEqual(['R2', 'R3']);
    expect(pickByRules('오픈 준비 부탁해', routines())).toEqual(['R1']);
    expect(pickByRules('마감 시작할게', routines())).toEqual(['R2']);
    expect(pickByRules('단체 주문 들어왔어', routines())).toEqual([]);
    expect(pickByRules('오늘 날씨 어때', routines())).toEqual([]);
  });

  it('루틴을 단계 지도로 펼치고, 모르는 말이면 만들지 않는다', async () => {
    const s = await shift.plan('마감하고 발주까지', 'P001');
    expect(s.id).toBe('W002'); // 시드에 어제 근무 W001이 있다
    expect(s.steps.map((x) => x.id)).toEqual(['R2.S1', 'R2.S2', 'R2.S3', 'R2.S4', 'R2.S5', 'R2.S6']);
    expect(s.steps.every((x) => x.state === 'todo')).toBe(true);
    await expect(shift.plan('오늘 날씨 어때', 'P001')).rejects.toThrow(/못 알아들었어요/);
  });
});

describe('판정관', () => {
  it('자료 줄은 자료를 직접 본다: POS를 올리기 전엔 불합격, 올리면 합격하고 다음 단계로', async () => {
    const s = await shift.plan('마감', 'P001');
    await shift.judgeStep(s.id, 'R2.S1', 'P004');
    expect(step(s, 'R2.S1')).toMatchObject({ state: 'failed', fails: 1, failedChecks: ['R2.S1.c1'] });
    expect(step(s, 'R2.S1').results[0].why).toMatch(/POS 파일을 올려야/);
    await stock.posImportSample('P001');
    await shift.judgeStep(s.id, 'R2.S1', 'P004');
    expect(step(s, 'R2.S1').state).toBe('passed');
    expect(shift.currentStep(s)?.id).toBe('R2.S2');
  });

  it('단계는 차례대로만 판정한다', async () => {
    const s = await shift.plan('마감', 'P001');
    await expect(shift.judgeStep(s.id, 'R2.S5', 'P001')).rejects.toThrow(/차례로 판정/);
    expect(step(s, 'R2.S5').state).toBe('todo');
  });

  it('직접 체크 줄은 비어 있으면 합격이 아니라 모름이고, 합격 뒤 체크를 지우면 다시 판정받아야 한다', async () => {
    const s = await shift.plan('오픈 준비', 'P001');
    await shift.judgeStep(s.id, 'R1.S1', 'P002');
    expect(step(s, 'R1.S1').results.map((r) => r.verdict)).toEqual(['모름', '모름']);
    expect(step(s, 'R1.S1').state).toBe('todo');
    shift.tick(s.id, 'R1.S1', 'R1.S1.c1', true, 'P002');
    shift.tick(s.id, 'R1.S1', 'R1.S1.c2', true, 'P002');
    await shift.judgeStep(s.id, 'R1.S1', 'P002');
    expect(step(s, 'R1.S1').state).toBe('passed');
    shift.tick(s.id, 'R1.S1', 'R1.S1.c1', false, 'P002');
    expect(step(s, 'R1.S1').state).toBe('todo');
    expect(shift.currentStep(s)?.id).toBe('R1.S1');
  });

  it('점장이 볼 줄은 점장만 확인할 수 있고, 확인 전에는 점장 확인 대기', async () => {
    const s = await shift.plan('마감', 'P001');
    await stock.posImportSample('P001');
    for (const o of db.inventory().orders.filter((x) => x.status === 'draft')) await stock.orderAction(o.id, 'send');
    const st = step(s, 'R2.S5');
    expect(judge(st, s).out.state).toBe('waiting');
    expect(() => shift.tick(s.id, 'R2.S5', 'R2.S5.c2', true, 'P005')).toThrow(/점장만/);
    shift.tick(s.id, 'R2.S5', 'R2.S5.c2', true, 'P001');
    expect(judge(st, s).out.state).toBe('passed');
  });

  it('3번 불합격이면 점장 할 일로 가고, 그 뒤로는 점장만 다시 판정한다', async () => {
    const s = await shift.plan('마감', 'P001');
    for (let i = 0; i < 3; i++) await shift.judgeStep(s.id, 'R2.S1', 'P004');
    expect(step(s, 'R2.S1')).toMatchObject({ fails: 3, state: 'waiting' });
    expect(shiftWaitIssues().map((i) => i.ids)).toContainEqual([s.id, 'R2.S1']);
    await expect(shift.judgeStep(s.id, 'R2.S1', 'P005')).rejects.toThrow(/점장이 다시 판정/);
    await stock.posImportSample('P001');
    await shift.judgeStep(s.id, 'R2.S1', 'P001');
    expect(step(s, 'R2.S1').state).toBe('passed');
  });

  it('날짜는 판정하는 날이 아니라 근무의 영업일 기준(자정 넘어 넣은 마감 실사도 그 근무 것)', async () => {
    const s = await shift.plan('마감', 'P001');
    s.date = addDays(db.today(), -1); // 어제 시작한 근무를 오늘 새벽에 이어서 판정
    await stock.stocktake([{ itemId: 'I001', counted: 50 }], 'P004');
    const r = judge(step(s, 'R2.S2'), s).out.results.find((x) => x.id === 'R2.S2.c1')!;
    expect(r.verdict).toBe('합격');
  });

  it('행사 보정은 이유 글이 아니라 기간이 겹치는지로 확인한다(AI가 이유를 자유롭게 써도)', async () => {
    const s = await shift.plan('축제 준비', 'P001');
    const inv = db.inventory();
    for (const e of inv.events) inv.adjustments.push({ id: `A9${inv.adjustments.length}`, itemId: 'I003', from: e.from, to: e.to, factor: 1.5, reason: '손님 몰리는 날 대비', cardId: 'C011', status: 'approved', via: 'claude' });
    const r = judge(step(s, 'R3.S1'), s).out.results.find((x) => x.id === 'R3.S1.c1')!;
    expect(r.verdict).toBe('합격');
  });
});

describe('근무 넘기기와 반복 실수', () => {
  it('인계 메모에 지금 단계와 막힌 것이 남고, 인계 줄이 합격한다', async () => {
    const s = await shift.plan('마감', 'P004');
    await shift.judgeStep(s.id, 'R2.S1', 'P004');
    await shift.handover(s.id, 'P004', 'P006');
    const note = s.handovers.at(-1)!.note;
    expect(note).toMatch(/지금 단계: POS 매출 반영/);
    expect(note).toMatch(/막힌 것: POS 매출 반영/);
    expect(judge(step(s, 'R2.S6'), s).out.results[0].verdict).toBe('합격');
  });

  it('시드의 어제 근무는 열린 채 도윤에게 넘어가 있고, 마감 실사부터 이어받는다', () => {
    const w1 = db.get().shifts.find((x) => x.id === 'W001')!;
    expect(w1.status).toBe('open');
    expect(shift.currentStep(w1)?.id).toBe('R2.S2');
    expect(w1.handovers.at(-1)!.to).toMatch(/도윤/);
  });

  it('어제 빠뜨린 마감 실사를 오늘 또 빠뜨리면 반복 실수가 된다', async () => {
    expect(repeatIssues()).toEqual([]); // 시드에는 어제 근무 하나뿐
    await stock.posImportSample('P001');
    const s = await shift.plan('마감하고 발주까지', 'P004');
    await shift.judgeStep(s.id, 'R2.S1', 'P004');
    await shift.judgeStep(s.id, 'R2.S2', 'P004');
    const issues = repeatIssues();
    expect(issues.map((i) => i.ids[0])).toEqual(['R2.S2.c1']);
    expect(issues[0].detail).toMatch(/근무 2번\(W001, W002\)/);
  });
});
