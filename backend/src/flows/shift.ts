// 근무 지도 흐름: 말 한 줄 → 단계 지도 · 체크 · 판정 · 점장 확인 · 근무 넘기기(이어받기)
import type { Shift, ShiftStep, ShiftsView } from '@shared/contracts';
import { Run } from '../harness/runner.js';
import { handoverNote, judge, MAX_FAILS, routines, shiftPlanner } from '../agents/shift.js';
import * as db from '../store/db.js';
import { orchestrate } from './index.js';

const bad = (msg: string) => Object.assign(new Error(msg), { status: 400 });

export const shiftsView = (): ShiftsView => ({
  routines: routines().map(({ id, title, desc, keywords }) => ({ id, title, desc, keywords })),
  shifts: [...db.get().shifts].reverse(),
});

function find(shiftId: string, stepId?: string): { shift: Shift; step: ShiftStep } {
  const shift = db.get().shifts.find((s) => s.id === shiftId);
  if (!shift) throw bad('근무를 찾을 수 없어요');
  const step = stepId ? shift.steps.find((s) => s.id === stepId) : shift.steps[0];
  if (!step) throw bad('단계를 찾을 수 없어요');
  return { shift, step };
}

const log = (shift: Shift, text: string) => shift.log.push({ at: db.now(), text });

/** 지금 단계 = 아직 합격하지 않은 첫 단계 */
export const currentStep = (shift: Shift) => shift.steps.find((s) => s.state !== 'passed') ?? null;

/** 말 한 줄로 근무 지도를 만든다. 열려 있던 근무는 닫지 않고 그대로 둔다(이어받기는 넘기기로) */
export async function plan(text: string, by: string): Promise<Shift> {
  if (!text.trim()) throw bad('오늘 할 일을 한 줄로 적어 주세요');
  const run = new Run('shift', db.personLabel(by), text);
  await orchestrate(run, '근무 지도 만들기');
  const ids = await run.step('shift-planner', () => shiftPlanner(text));
  if (!ids.length) {
    run.end(false, '맞는 루틴 없음');
    throw bad(`어떤 근무인지 못 알아들었어요. 예: ${routines().map((r) => r.title).join(', ')}`);
  }
  const list = ids.map((id) => routines().find((r) => r.id === id)!);
  const d = db.get();
  const shift: Shift = {
    id: db.nextId('W', d.shifts),
    title: list.map((r) => r.title).join(' + '),
    ask: text,
    date: db.today(),
    by,
    routines: ids,
    steps: list.flatMap((r) =>
      r.phases.flatMap((p) => p.steps.map((s) => ({ ...s, phase: `${r.title} · ${p.title}`, routineId: r.id, state: 'todo' as const, ticks: [], approved: [], results: [], fails: 0, failedChecks: [] }))),
    ),
    handovers: [],
    log: [],
    status: 'open',
  };
  log(shift, `${db.personLabel(by)}: "${text}" → ${shift.title} (${shift.steps.length}단계)`);
  d.shifts.push(shift);
  run.wiki({ op: '근무 지도', detail: `[${shift.id}] ${shift.title} · ${shift.steps.length}단계`, nodes: [], edges: [] });
  run.end(true, `${shift.title} 단계 ${shift.steps.length}개`);
  return shift;
}

/** 직원이 직접 체크하는 줄(self)과 점장이 볼 줄(look). 판정은 판정관이 따로 한다 */
export function tick(shiftId: string, stepId: string, checkId: string, on: boolean, by: string): Shift {
  const { shift, step } = find(shiftId, stepId);
  const c = step.checks.find((x) => x.id === checkId);
  if (!c || c.kind === 'auto') throw bad('직접 체크할 수 없는 줄이에요(자료로 확인하는 줄)');
  if (c.kind === 'look' && db.person(by)?.role !== '점장') throw bad('점장이 볼 줄은 점장만 확인할 수 있어요');
  const list = c.kind === 'look' ? step.approved : step.ticks;
  const has = list.includes(checkId);
  if (on && !has) list.push(checkId);
  if (!on && has) {
    list.splice(list.indexOf(checkId), 1);
    // 합격한 단계의 체크를 지우면 다시 판정받아야 한다
    if (step.state === 'passed') {
      step.state = 'todo';
      step.results = step.results.map((r) => (r.id === checkId ? { ...r, verdict: '모름', why: '체크를 지웠어요' } : r));
      delete step.doneAt;
      shift.status = 'open';
      log(shift, `${step.title}: 체크를 지워 다시 판정 대기`);
    }
  }
  db.save();
  return shift;
}

/** 판정관이 줄마다 채점한다. 합격하면 다음 단계로, 3번 불합격이면 점장에게 넘어간다 */
export async function judgeStep(shiftId: string, stepId: string, by: string): Promise<Shift> {
  const { shift, step } = find(shiftId, stepId);
  if (shift.status !== 'open') throw bad('끝난 근무예요');
  // 단계는 차례대로 판정한다(앞 단계가 합격해야 뒤 단계를 볼 수 있다)
  if (step.id !== currentStep(shift)?.id) throw bad(`지금 단계(${currentStep(shift)?.title})부터 차례로 판정해요`);
  if (step.fails >= MAX_FAILS && db.person(by)?.role !== '점장') throw bad(`${MAX_FAILS}번 불합격한 단계는 점장이 다시 판정해요`);
  const run = new Run('judge', db.personLabel(by), `${shift.title} · ${step.title}`);
  await orchestrate(run, step.title);
  const r = await run.step('judge', () => judge(step, shift));
  const summary = run.steps.find((x) => x.agentId === 'judge')?.summary ?? '';
  const failed = r.results.filter((x) => x.verdict === '불합격').map((x) => x.id);
  step.results = r.results;
  step.state = r.state;
  step.judgedAt = db.now();
  if (failed.length) {
    step.fails++;
    step.failedChecks = [...new Set([...step.failedChecks, ...failed])];
  }
  if (r.state === 'passed') step.doneAt = db.now();
  const next = currentStep(shift);
  if (!next) shift.status = 'done';
  log(shift, `${step.title}: ${r.state === 'passed' ? '합격' : r.state === 'failed' ? `불합격 ${step.fails}회` : r.state === 'waiting' ? '점장 확인 대기' : '체크가 비어 있음'}`);
  run.wiki({ op: r.state === 'passed' ? '단계 합격' : '단계 판정', detail: `[${shift.id}] ${step.title} → ${r.state === 'passed' ? (next ? `다음: ${next.title}` : '근무 끝') : summary}`, nodes: [], edges: [] });
  run.end(true, r.state === 'passed' ? (next ? `합격 → ${next.title}` : '근무의 모든 단계 합격') : summary);
  return shift;
}

/** 근무 넘기기: 인계 메모를 남기고 다음 사람이 지금 단계부터 잇는다 */
export async function handover(shiftId: string, fromId: string, toId: string): Promise<Shift> {
  const { shift } = find(shiftId);
  const from = db.personLabel(fromId);
  const to = db.personLabel(toId);
  const run = new Run('shift', from, `${shift.title} → ${to}`);
  await orchestrate(run, '근무 넘기기');
  const note = await run.step('shift-planner', () => {
    shift.handovers.push({ at: db.now(), from, to, note: '' });
    const n = handoverNote(shift, from, to);
    shift.handovers.at(-1)!.note = n;
    return { out: n, summary: `인계 메모 ${n.split('\n').length}줄 · ${currentStep(shift)?.title ?? '모두 끝남'}부터 이어받기` };
  });
  log(shift, `근무 넘김: ${from} → ${to}`);
  run.wiki({ op: '근무 넘김', detail: `[${shift.id}] ${from} → ${to}`, nodes: [], edges: [] });
  run.end(true, note.split('\n')[2] ?? '넘김');
  return shift;
}
