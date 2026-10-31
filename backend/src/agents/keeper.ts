// 위키 관리팀: 종합 편집자 · 위키 점검관 · 훈련 코치
import { z } from 'zod';
import type { Card, EdgeType, LintIssue } from '@shared/contracts';
import { ask, llmEnabled } from '../harness/llm.js';
import { llmOr, type StepOut } from '../harness/runner.js';
import { containment, similarity } from '../tools/search.js';
import * as db from '../store/db.js';
import { bigDiff, countGap, drift, itemStatus, lastCount, salesDates, usage } from '../inventory/calc.js';

// ---------- 종합 편집자 ----------

export async function synthesizer(topic: string, cards: Card[]): Promise<StepOut<string>> {
  if (!cards.length) return { out: '', summary: `'${topic}'에 승인된 카드가 없어 종합하지 않음`, status: 'skipped' };
  const { value, via } = await llmOr(
    async () =>
      (await ask('synthesizer', {
        user: `토픽: ${topic}\n\n${cards.map((c) => `[${c.id}] ${c.title} / 이유: ${c.reason} / 금지: ${c.avoid}`).join('\n')}\n\n신입이 처음 보는 상황에서도 응용할 수 있게, 이 카드들에 공통으로 드러나는 판단 원칙 3~5개로 종합하라. 원칙마다 끝에 근거 카드 [Cxxx].`,
        schema: z.object({ principles: z.array(z.string()) }),
      }))?.principles ?? null,
    () =>
      cards
        .filter((c) => c.reason && c.actions.length)
        .map((c) => `${c.reason.split(/(?<=[.다])\s/)[0].replace(/[.]$/, '')}. 그래서 ${c.actions[0].replace(/[.]$/, '')} [${c.id}]`),
    llmEnabled(),
  );
  return { out: value.map((p) => `- ${p}`).join('\n'), via, summary: `'${topic}' 핵심 원칙 ${value.length}개로 다시 정리` };
}

// ---------- 위키 점검관 ----------

export interface LintOut { issues: LintIssue[]; links: { source: string; target: string; type: EdgeType }[] }

function conflictsByRules(cards: Card[]) {
  const no = /(불가|안 된|하지 않|금지|필수)/;
  const yes = /(해줘도|해도 된|없이 .*(교환|환불)|그냥)/;
  const out: { ids: string[]; issue: string }[] = [];
  for (let i = 0; i < cards.length; i++)
    for (let j = i + 1; j < cards.length; j++) {
      const [a, b] = [cards[i], cards[j]];
      if (a.topic !== b.topic || a.source === b.source) continue;
      const sim = similarity(a.title + a.situation, b.title + b.situation);
      if (sim <= 0.08 || sim > 0.3) continue; // 0.3 초과는 중복으로 따로 잡는다
      const ta = a.actions.join(' ') + a.avoid + a.reason;
      const tb = b.actions.join(' ') + b.avoid + b.reason;
      if ((no.test(ta) && yes.test(tb)) || (yes.test(ta) && no.test(tb)))
        out.push({ ids: [a.id, b.id], issue: `${a.source} [${a.id}]와 ${b.source} [${b.id}]의 지시가 서로 다릅니다. 점장이 하나로 정리해야 합니다.` });
    }
  return out;
}

export async function linter(): Promise<StepOut<LintOut>> {
  const d = db.get();
  const today = db.today();
  const soon = db.addDays(today, 14);
  const approved = db.approvedCards();
  const issues: LintIssue[] = [];
  const links: LintOut['links'] = [];

  for (const c of approved) {
    if (c.expires < today) issues.push({ kind: '만료', ids: [c.id], detail: `만료일(${c.expires})이 지났습니다. 지금도 맞는지 확인하고 갱신하세요.` });
    else if (c.expires <= soon) issues.push({ kind: '만료 임박', ids: [c.id], detail: `${c.expires} 만료 예정입니다.` });
    if (c.notHelpful > c.helpful && c.uses >= 3) issues.push({ kind: '효과 낮음', ids: [c.id], detail: `'도움 안 됨'(${c.notHelpful})이 '도움 됨'(${c.helpful})보다 많습니다.` });
    if (!c.reason.trim()) issues.push({ kind: '이유 없음', ids: [c.id], detail: '판단 이유가 비어 있어 신입이 응용하기 어렵습니다.' });
  }
  for (let i = 0; i < approved.length; i++)
    for (let j = i + 1; j < approved.length; j++) {
      const [a, b] = [approved[i], approved[j]];
      if (a.topic === b.topic && similarity(a.title + a.situation, b.title + b.situation) > 0.3) {
        issues.push({ kind: '중복', ids: [a.id, b.id], detail: '비슷한 상황을 다루는 카드입니다. 하나로 합치면 검색이 정확해집니다.' });
        links.push({ source: a.id, target: b.id, type: 'duplicates' });
      }
    }

  const { value: conflicts, via } = await llmOr(
    async () =>
      (await ask('linter', {
        user: `같은 토픽의 카드들이다. 서로 모순되는 지시(한쪽은 하라, 한쪽은 하지 말라)만 찾아라. 단순 중복은 제외.\n\n${approved.map((c) => `[${c.id}] (${c.topic}, ${c.source}) ${c.title} / 대응: ${c.actions.join(' / ')} / 금지: ${c.avoid}`).join('\n')}`,
        schema: z.object({ conflicts: z.array(z.object({ ids: z.array(z.string()), issue: z.string() })) }),
      }))?.conflicts ?? null,
    () => conflictsByRules(approved),
    llmEnabled(),
  );
  for (const c of conflicts) {
    issues.push({ kind: '상충', ids: c.ids, detail: c.issue });
    if (c.ids.length >= 2) links.push({ source: c.ids[0], target: c.ids[1], type: 'conflicts' });
  }

  const waiting = d.questions.filter((q) => q.status === 'escalated');
  if (waiting.length) issues.push({ kind: '공백', ids: waiting.map((q) => q.id), detail: `위키가 답하지 못한 질문 ${waiting.length}건이 점장 답을 기다립니다. 답하면 사례로 쌓입니다.` });
  for (const topic of d.topics.filter((t) => t !== '기타')) {
    const n = approved.filter((c) => c.topic === topic).length;
    if (n < 2) issues.push({ kind: '공백', ids: [], detail: `'${topic}' 토픽 사례가 ${n}개뿐입니다. 숙련 직원에게 회고를 요청하세요.` });
  }
  const pending = d.cards.filter((c) => c.status === 'pending');
  if (pending.length) issues.push({ kind: '승인 대기', ids: pending.map((c) => c.id), detail: `승인 대기 사례 ${pending.length}건` });
  issues.push(...inventoryIssues());

  const order: LintIssue['kind'][] = ['상충', '재고 차이', '보정 제안', '만료', '레시피 대기', '사용량 이탈', '효과 낮음', '공백', '중복', '만료 임박', '이유 없음', '승인 대기'];
  issues.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
  const count = (k: LintIssue['kind']) => issues.filter((i) => i.kind === k).length;
  const stock = count('재고 차이') + count('사용량 이탈') + count('레시피 대기') + count('보정 제안');
  return { out: { issues, links }, via, summary: `할 일 ${issues.length}건 (상충 ${count('상충')}, 만료 ${count('만료')}, 중복 ${count('중복')}, 공백 ${count('공백')}${stock ? `, 재고 ${stock}` : ''})` };
}

/** 재고: 실사 차이 · 사용량 이탈 · 소모량 승인 대기 · 보정 제안 (모두 규칙) */
function inventoryIssues(): LintIssue[] {
  const inv = db.inventory();
  if (!inv.items.length) return [];
  const today = db.today();
  const use = usage(inv);
  const open = salesDates(inv);
  const out: LintIssue[] = [];
  for (const it of inv.items) {
    const st = itemStatus(it, inv, use, open, today);
    const last = lastCount(inv, it.id);
    // 계산값은 저장해 둔 값이 아니라 지금 다시 계산한다(실사 뒤 그날 POS를 올리면 차이가 풀린다)
    const gap = last && !last.cardId ? countGap(inv, use, last) : null;
    if (last && gap && bigDiff(gap.diff, st.dailyAvg)) {
      const before = inv.stocktakes.filter((s) => s.itemId === it.id && s.cardId).at(-1);
      out.push({
        kind: '재고 차이',
        ids: [it.id],
        detail: `${it.name} ${last.date} 마감: 계산 ${gap.expected}${it.unit} / 실사 ${last.counted}${it.unit} (${gap.diff > 0 ? '+' : ''}${gap.diff}${it.unit}). 이유를 남기면 카드가 되어 다음 점검의 근거가 돼요.${before ? ` 지난번 이유: [${before.cardId}]` : ''}`,
      });
    }
    const dr = drift(it, inv, use, open, today);
    if (dr) {
      const pct = Math.round((dr.actual / dr.expected - 1) * 100);
      out.push({ kind: '사용량 이탈', ids: [it.id], detail: `${it.name} 최근 7일 ${dr.actual}${it.unit} — 평소대로면 ${dr.expected}${it.unit} (${pct > 0 ? '+' : ''}${pct}%). 이유가 있으면 카드로 남겨 다음 예측에 쓰세요.` });
    }
  }
  const menus = inv.recipes.filter((r) => r.status === 'pending');
  if (menus.length) out.push({ kind: '레시피 대기', ids: menus.map((r) => r.menu), detail: `메뉴 ${menus.length}개의 재료 소모량이 승인 전이라 사용량에 아직 안 들어가요: ${menus.map((r) => r.menu).join(', ')}` });
  const adj = inv.adjustments.filter((a) => a.status === 'pending');
  if (adj.length) out.push({ kind: '보정 제안', ids: adj.map((a) => a.id), detail: `수요 분석가의 보정 제안 ${adj.length}건: ${[...new Set(adj.map((a) => `${a.reason} ×${a.factor} [${a.cardId}]`))].join(', ')}` });
  return out;
}

// ---------- 훈련 코치 ----------

export interface Grade { score: number; good: string[]; missing: string[]; feedback: string }

export async function trainer(c: Card, userAnswer: string): Promise<StepOut<Grade>> {
  const { value, via } = await llmOr(
    () =>
      ask('trainer', {
        user: `[정답 카드]\n${c.title}\n대응: ${c.actions.join(' / ')}\n이유: ${c.reason}\n금지: ${c.avoid}\n\n[신입 답]\n${userAnswer}\n\n핵심 행동, 판단 이유 이해, 금지 행동 회피를 보고 0~100점으로 채점하라. 격려하는 말투로 짧게.`,
        schema: z.object({ score: z.number().int(), good: z.array(z.string()), missing: z.array(z.string()), feedback: z.string() }),
      }),
    () => {
      const good = c.actions.filter((a) => containment(a, userAnswer) >= 0.3);
      const missing = c.actions.filter((a) => !good.includes(a));
      const score = Math.round((good.length / Math.max(c.actions.length, 1)) * 100);
      return { score, good, missing, feedback: score >= 60 ? '핵심 대응을 잘 짚었어요. 판단 이유도 함께 기억해 두세요.' : '놓친 대응이 있어요. 카드의 판단 이유를 먼저 읽어 보세요.' };
    },
    llmEnabled(),
  );
  return { out: value, via, summary: `${value.score}점 · 맞춘 행동 ${value.good.length}/${c.actions.length}` };
}
