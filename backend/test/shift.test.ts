// 근무 지도(규칙 모드, 술집 데모 시드): 말 한 줄 → 단계 지도 · 판정관 채점 · 점장 확인 · 근무 넘기기 · 반복 실수
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { pickByRules, routines } from '../src/agents/shift.js';
import { repeatIssues } from '../src/agents/keeper.js';
import * as db from '../src/store/db.js';
import * as shift from '../src/flows/shift.js';
import * as stock from '../src/flows/stock.js';
import { bus } from '../src/harness/trace.js';
import { DATA_DIR } from '../src/paths.js';

beforeEach(() => {
  db.resetFromSeed(join(DATA_DIR, 'seed.json'));
  bus.clear();
});

const step = (s: Awaited<ReturnType<typeof shift.plan>>, id: string) => s.steps.find((x) => x.id === id)!;

describe('근무 설계자', () => {
  it('말한 순서대로 루틴을 고른다', () => {
    expect(pickByRules('마감하고 축제 준비까지', routines())).toEqual(['R2', 'R3']);
    expect(pickByRules('오픈 준비 부탁해', routines())).toEqual(['R1']);
    expect(pickByRules('오늘 날씨 어때', routines())).toEqual([]);
  });

  it('루틴을 단계 지도로 펼치고, 모르는 말이면 만들지 않는다', async () => {
    const s = await shift.plan('마감하고 발주까지', 'P001');
    expect(s.title).toBe('마감·발주');
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

  it('직접 체크 줄은 비어 있으면 합격이 아니라 모름', async () => {
    const s = await shift.plan('오픈 준비', 'P001');
    await shift.judgeStep(s.id, 'R1.S1', 'P002');
    expect(step(s, 'R1.S1').results.map((r) => r.verdict)).toEqual(['모름', '모름']);
    expect(step(s, 'R1.S1').state).toBe('todo');
    shift.tick(s.id, 'R1.S1', 'R1.S1.c1', true, 'P002');
    shift.tick(s.id, 'R1.S1', 'R1.S1.c2', true, 'P002');
    await shift.judgeStep(s.id, 'R1.S1', 'P002');
    expect(step(s, 'R1.S1').state).toBe('passed');
  });

  it('점장이 볼 줄은 점장만 확인할 수 있고, 확인 전에는 점장 확인 대기', async () => {
    const s = await shift.plan('마감', 'P001');
    await stock.posImportSample('P001');
    // 주문서를 모두 보내 자료 줄은 합격시킨다
    for (const o of db.inventory().orders.filter((x) => x.status === 'draft')) await stock.orderAction(o.id, 'send');
    await shift.judgeStep(s.id, 'R2.S5', 'P001');
    expect(step(s, 'R2.S5').state).toBe('waiting');
    expect(() => shift.tick(s.id, 'R2.S5', 'R2.S5.c2', true, 'P005')).toThrow(/점장만/);
    shift.tick(s.id, 'R2.S5', 'R2.S5.c2', true, 'P001');
    await shift.judgeStep(s.id, 'R2.S5', 'P001');
    expect(step(s, 'R2.S5').state).toBe('passed');
  });

  it('3번 불합격이면 점장에게 넘어간다', async () => {
    const s = await shift.plan('마감', 'P001');
    for (let i = 0; i < 3; i++) await shift.judgeStep(s.id, 'R2.S2', 'P004');
    expect(step(s, 'R2.S2')).toMatchObject({ fails: 3, state: 'waiting' });
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
    await shift.judgeStep(s.id, 'R2.S6', 'P006');
    expect(step(s, 'R2.S6').state).toBe('passed');
  });

  it('어제 빠뜨린 마감 실사를 오늘 또 빠뜨리면 반복 실수가 된다', async () => {
    expect(repeatIssues()).toEqual([]); // 시드에는 어제 근무 하나뿐
    const s = await shift.plan('마감하고 발주까지', 'P004');
    await shift.judgeStep(s.id, 'R2.S2', 'P004');
    const issues = repeatIssues();
    expect(issues.map((i) => i.ids[0])).toEqual(['R2.S2.c1']);
    expect(issues[0].detail).toMatch(/근무 2번\(W001, W002\)/);
  });
});
