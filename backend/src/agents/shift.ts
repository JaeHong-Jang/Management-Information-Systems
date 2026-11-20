// 근무 지도: 근무 설계자(지휘팀) · 판정관(검증팀)
// 근무 설계자는 말 한 줄에서 루틴을 고른다. 판정관은 일한 사람·AI가 아니라 따로 줄마다 합격·불합격·모름을 낸다.
// 「지속 가능한 구조」 0단계: 비어 있으면 합격이 아니라 모름, 결과물(자료)은 직접 열어 보고, 3번 불합격이면 사람에게.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import type { AutoRule, CheckResult, RoutineDef, Shift, ShiftStep, StepState } from '@shared/contracts';
import { ask, llmEnabled } from '../harness/llm.js';
import { llmOr, type StepOut } from '../harness/runner.js';
import { addDays, HORIZON, inventoryView } from '../inventory/calc.js';
import { DATA_DIR } from '../paths.js';
import * as db from '../store/db.js';
import { inventoryIssues } from './keeper.js';

let cache: RoutineDef[] | null = null;
export const routines = (): RoutineDef[] => (cache ??= (JSON.parse(readFileSync(join(DATA_DIR, 'routines.json'), 'utf8')) as { routines: RoutineDef[] }).routines);

export const MAX_FAILS = 3;

// ---------- 근무 설계자 ----------

/** 규칙 대체: 키워드가 나온 루틴을 말한 순서대로 고른다 */
export function pickByRules(text: string, list: RoutineDef[]): string[] {
  const t = text.replace(/\s+/g, '');
  return list
    .map((r) => ({ id: r.id, at: Math.min(...r.keywords.map((k) => t.indexOf(k.replace(/\s+/g, ''))).filter((i) => i >= 0)) }))
    .filter((r) => Number.isFinite(r.at))
    .sort((a, b) => a.at - b.at)
    .map((r) => r.id);
}

export async function shiftPlanner(text: string): Promise<StepOut<string[]>> {
  const list = routines();
  const ids = new Set(list.map((r) => r.id));
  const { value, via } = await llmOr(
    async () => {
      const r = await ask('shift-planner', {
        user: `[루틴]\n${list.map((x) => `${x.id} ${x.title}: ${x.desc}`).join('\n')}\n\n[점장·직원의 말]\n${text}\n\n이 말에 맞는 루틴 id를 하는 순서대로 골라라. 맞는 루틴이 없으면 빈 배열.`,
        schema: z.object({ routines: z.array(z.string()) }),
      });
      return r ? [...new Set(r.routines.filter((id) => ids.has(id)))] : null; // 같은 루틴을 두 번 펼치지 않는다
    },
    () => pickByRules(text, list),
    llmEnabled(),
  );
  const names = value.map((id) => list.find((r) => r.id === id)!.title);
  return { out: value, via, summary: value.length ? `루틴 ${names.join(' → ')}로 단계 지도를 만듭니다` : '맞는 루틴을 찾지 못했습니다', status: value.length ? 'ok' : 'blocked' };
}

// ---------- 판정관 (규칙) ----------

/** 자료로 확인하는 줄. 숫자와 함께 이유를 돌려준다.
 * 날짜는 판정하는 날이 아니라 근무의 영업일(shift.date) 기준이다. 자정 넘어 마감 실사를 넣거나 판정해도 그날 근무로 본다 */
function autoCheck(rule: AutoRule, shift: Shift): { ok: boolean; why: string } {
  const d = db.get();
  const inv = d.inventory;
  const today = db.today();
  const day = shift.date;
  switch (rule) {
    case 'posUpToDate': {
      const last = [...new Set(inv.sales.map((s) => s.date))].sort().at(-1);
      return last && last >= addDays(day, -1) ? { ok: true, why: `마지막 판매 ${last}까지 반영` } : { ok: false, why: `마지막 판매 ${last ?? '없음'} — ${addDays(day, -1)}까지 POS 파일을 올려야 해요` };
    }
    case 'stocktakeToday': {
      // 근무 영업일이나 그 뒤(자정 넘어 입력)에 들어온 실사면 이 근무의 마감 실사로 본다
      const n = inv.stocktakes.filter((s) => s.date >= day).length;
      return n ? { ok: true, why: `${day} 마감 실사 ${n}개 품목` } : { ok: false, why: `${day} 마감 실사 기록이 없어요` };
    }
    case 'noStockDiff': {
      const diffs = inventoryIssues().filter((i) => i.kind === '재고 차이');
      return diffs.length ? { ok: false, why: `계산과 다른 품목 ${diffs.length}개: ${diffs.map((i) => i.detail.split(' ')[0]).join(', ')}` } : { ok: true, why: '이유가 남지 않은 큰 차이가 없어요' };
    }
    case 'ordersSent': {
      const drafts = inv.orders.filter((o) => o.status === 'draft');
      return drafts.length ? { ok: false, why: `보내지 않은 주문서 ${drafts.length}장(${drafts.map((o) => o.supplier).join(', ')})` } : { ok: true, why: `보낸 주문 ${inv.orders.filter((o) => o.status === 'sent').length}장, 남은 초안 없음` };
    }
    case 'noOutItems': {
      const out = inventoryView(inv, [], today).items.filter((s) => s.level === 'out');
      return out.length ? { ok: false, why: `도착 전에 바닥날 품목: ${out.map((s) => s.item.name).join(', ')}` } : { ok: true, why: '도착 전에 바닥날 품목 없음' };
    }
    case 'adjustmentsDecided': {
      const n = inv.adjustments.filter((a) => a.status === 'pending').length + inv.recipes.filter((r) => r.status === 'pending').length;
      return n ? { ok: false, why: `승인 대기 ${n}건` } : { ok: true, why: '승인 대기 없음' };
    }
    case 'eventsCovered': {
      const end = addDays(today, HORIZON - 1);
      const events = inv.events.filter((e) => e.to >= today && e.from <= end);
      // 보정의 이유 글은 AI가 자유롭게 쓸 수 있어 이름이 아니라 기간이 겹치는지로 맞춘다
      const missing = events.filter((e) => !inv.adjustments.some((a) => a.status === 'approved' && a.from <= e.to && a.to >= e.from));
      return !events.length ? { ok: true, why: '14일 안 행사 없음' } : missing.length ? { ok: false, why: `보정 없는 행사: ${missing.map((e) => e.label).join(', ')}` } : { ok: true, why: `행사 ${events.length}개 모두 보정 승인됨` };
    }
    case 'noWaitingQuestions': {
      const n = d.questions.filter((q) => q.status === 'escalated').length;
      return n ? { ok: false, why: `점장 답을 기다리는 질문 ${n}건` } : { ok: true, why: '기다리는 질문 없음' };
    }
    case 'handoverWritten':
      return shift.handovers.length ? { ok: true, why: `인계 메모 ${shift.handovers.length}개` } : { ok: false, why: '아직 근무를 넘기지 않았어요' };
  }
}

/** 줄마다 합격·불합격·모름. 자료 줄은 자료를 직접 열어 보고, 직원 체크는 체크가 있어야, 점장이 볼 줄은 점장이 확인해야 합격이다 */
export function judge(step: ShiftStep, shift: Shift): StepOut<{ results: CheckResult[]; state: StepState }> {
  const results: CheckResult[] = step.checks.map((c) => {
    if (c.kind === 'auto' && c.rule) {
      const r = autoCheck(c.rule, shift);
      return { id: c.id, verdict: r.ok ? '합격' : '불합격', why: r.why };
    }
    if (c.kind === 'self') return step.ticks.includes(c.id) ? { id: c.id, verdict: '합격', why: '직접 체크함' } : { id: c.id, verdict: '모름', why: '체크가 비어 있어요(비어 있으면 합격이 아니에요)' };
    return step.approved.includes(c.id) ? { id: c.id, verdict: '합격', why: '점장이 확인함' } : { id: c.id, verdict: '모름', why: '점장이 볼 줄이에요' };
  });
  const fail = results.filter((r) => r.verdict === '불합격').length;
  const lookLeft = results.some((r) => r.verdict === '모름' && step.checks.find((c) => c.id === r.id)?.kind === 'look');
  const unknown = results.filter((r) => r.verdict === '모름').length;
  const fails = step.fails + (fail ? 1 : 0);
  const state: StepState = fail ? (fails >= MAX_FAILS ? 'waiting' : 'failed') : lookLeft ? 'waiting' : unknown ? 'todo' : 'passed';
  const pass = results.length - fail - unknown;
  return {
    out: { results, state },
    status: fail ? 'blocked' : 'ok',
    problems: results.filter((r) => r.verdict === '불합격').map((r) => r.why),
    summary: `'${step.title}' 합격 ${pass} · 불합격 ${fail} · 모름 ${unknown}${state === 'passed' ? ' → 다음 단계로' : fail && fails >= MAX_FAILS ? ` → ${MAX_FAILS}번 불합격이라 점장에게` : lookLeft && !fail ? ' → 점장 확인 대기' : ''}`,
  };
}

// ---------- 인계 메모 (근무 설계자, 규칙) ----------

export function handoverNote(shift: Shift, from: string, to: string): string {
  const done = shift.steps.filter((s) => s.state === 'passed');
  const cur = shift.steps.find((s) => s.state !== 'passed');
  const blocked = shift.steps.filter((s) => s.state === 'failed' || (s.state === 'waiting' && s.fails >= MAX_FAILS));
  const left = cur ? cur.checks.filter((c) => !cur.results.some((r) => r.id === c.id && r.verdict === '합격')) : [];
  const cards = [...new Set(shift.steps.filter((s) => s.state !== 'passed').flatMap((s) => s.cards))];
  return [
    `${from} → ${to}: ${shift.title}`,
    `끝난 단계 ${done.length}/${shift.steps.length}${done.length ? ` (${done.map((s) => s.title).join(', ')})` : ''}`,
    cur ? `지금 단계: ${cur.title} (${cur.actor === 'AI' ? 'AI' : cur.actor} 차례)` : '모든 단계가 끝났어요',
    left.length ? `남은 기준: ${left.map((c) => c.text).join(' / ')}` : '',
    blocked.length ? `막힌 것: ${blocked.map((s) => `${s.title}(${s.results.filter((r) => r.verdict === '불합격').map((r) => r.why).join(', ') || '점장 확인'})`).join(' / ')}` : '',
    cards.length ? `볼 카드: ${cards.join(', ')}` : '',
  ].filter(Boolean).join('\n');
}
