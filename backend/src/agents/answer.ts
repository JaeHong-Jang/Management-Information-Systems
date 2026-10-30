// 답변팀: 검색 사서 → 현장 코치 → (검증팀) → 점장 연결
import { z } from 'zod';
import type { Card } from '@shared/contracts';
import { ask, llmEnabled } from '../harness/llm.js';
import { llmOr, type StepOut } from '../harness/runner.js';
import { containment, search, tokens, type Hit } from '../tools/search.js';
import { safetyHit } from '../tools/policies.js';

export interface Answer {
  answer: string;
  why: string;
  cited: string[];
  confidence: 'high' | 'low' | 'none';
  needsManager: boolean;
}

// ---------- 검색 사서 (규칙) ----------

export function librarian(question: string, cards: Card[], excluded: { id: string; why: string }[] = []): StepOut<Hit[]> {
  const hits = search(question, cards);
  const skip = excluded.length ? ` · 만료·상충 카드 ${excluded.length}개는 근거에서 뺐습니다(${excluded.map((e) => `${e.id} ${e.why}`).join(', ')})` : '';
  return {
    out: hits,
    summary: (hits.length ? `가까운 사례 ${hits.length}개: ${hits.slice(0, 3).map((h) => `${h.card.id}(${h.score.toFixed(1)})`).join(', ')}` : '가까운 사례를 찾지 못했습니다') + skip,
  };
}

// ---------- 현장 코치 ----------

const NO_ANSWER = '매장 위키에 이 상황에 맞는 사례가 아직 없습니다. 점장님께 질문을 넘겼어요. 답이 오면 위키에 사례로 추가됩니다.';

export function answerByRules(hits: Hit[]): Answer {
  const top = hits[0];
  if (!top || top.score < 3 || top.coverage < 0.25) return { answer: NO_ANSWER, why: '', cited: [], confidence: 'none', needsManager: true };
  // 같은 상황을 다룬 공식규정 카드가 비슷한 점수로 있으면 그쪽을 앞세운다.
  const official = hits.find((h) => h.card.source === '공식규정' && h.card.topic === top.card.topic && h.score >= top.score * 0.8);
  const ordered = official && official !== top ? [official, ...hits.filter((h) => h !== official)] : hits;
  const c = ordered[0].card;
  const lines = [`${c.title} [${c.id}]`, ...c.actions.map((a, i) => `${i + 1}. ${a} [${c.id}]`)];
  if (c.avoid) lines.push(`하지 말 것: ${c.avoid} [${c.id}]`);
  if (c.escalateWhen) lines.push(`점장 호출: ${c.escalateWhen} [${c.id}]`);
  const other = ordered.slice(1).find((h) => h.card.topic === c.topic && h.card.source !== c.source && h.score > top.score * 0.6);
  const cited = [c.id];
  if (other) {
    lines.push(`같은 토픽의 ${other.card.source} 카드 [${other.card.id}]도 있습니다. 내용이 다르면 공식규정을 따르세요.`);
    cited.push(other.card.id);
  }
  return { answer: lines.join('\n'), why: c.reason, cited, confidence: top.score > 6 ? 'high' : 'low', needsManager: false };
}

export async function coach(question: string, hits: Hit[]): Promise<StepOut<Answer>> {
  const context = hits
    .map(({ card: c }) => `[${c.id}] (${c.source}, 갱신 ${c.updated}) ${c.title}\n상황: ${c.situation}\n판단 이유: ${c.reason}\n대응: ${c.actions.join(' / ')}\n하면 안 되는 것: ${c.avoid || '-'}\n점장 호출 기준: ${c.escalateWhen || '-'}`)
    .join('\n\n');
  const schema = z.object({
    answer: z.string().describe('신입이 지금 바로 따라 할 3~5줄. 줄마다 끝에 근거 카드 [Cxxx]'),
    why: z.string().describe('이렇게 하는 이유 한두 문장(카드의 판단 이유에서)'),
    cited: z.array(z.string()),
    confidence: z.enum(['high', 'low', 'none']),
    needsManager: z.boolean(),
  });
  const { value, via } = await llmOr(
    () =>
      hits.length
        ? ask('coach', {
            user: `[사례 카드]\n${context}\n\n[신입의 질문]\n${question}\n\n카드에 있는 내용만 근거로 답하라. 카드에 없는 정책·금액·절차를 추측하지 마라. 공식규정과 현장노하우가 부딪히면 공식규정을 따르라고 적어라. 카드로 답할 수 없으면 confidence는 none, needsManager는 true.`,
            schema,
            effort: 'medium',
          })
        : Promise.resolve({ answer: NO_ANSWER, why: '', cited: [], confidence: 'none' as const, needsManager: true }),
    () => answerByRules(hits),
    llmEnabled(),
  );
  return { out: value, via, summary: value.needsManager ? '카드로 답할 수 없다고 판단' : `답변 작성 (근거 ${value.cited.join(', ')}, 확신 ${value.confidence})` };
}

// ---------- 점장 연결 (규칙) ----------

// 호출 기준 문장의 흔한 말(조건 연결어 등)은 일치로 세지 않는다
const COMMON = new Set(['있거', '거나', '이상', '하거', '고객', '손님', '경우', '해요', '하면', '면서', '요구', '구할', '언급', '급할', '금액', '만원', '액이', '원이']);

/** '3만원', '30,000원' → 30000 */
function amounts(text: string): number[] {
  return [...text.matchAll(/(\d[\d,]*)\s*(만\s*)?원/g)].map((m) => Number(m[1].replace(/,/g, '')) * (m[2] ? 10000 : 1));
}

/** 조건의 금액 기준(이상·초과)을 질문의 금액이 넘는가. 질문에 금액이 없으면 판단하지 않는다(null) */
function amountMatch(condition: string, question: string): boolean | null {
  const limit = /(이상|초과|넘)/.test(condition) ? amounts(condition)[0] : undefined;
  const asked = amounts(question);
  if (limit === undefined || !asked.length) return null;
  return Math.max(...asked) >= limit;
}

/** 질문이 카드의 점장 호출 기준에 해당하는가: 핵심 2-gram이 2개 이상 겹치거나, 기준 문장의 35% 이상이 질문에 들어 있다 */
export function matchesCondition(condition: string, question: string): boolean {
  if (amountMatch(condition, question)) return true;
  const q = new Set(tokens(question));
  const shared = new Set(tokens(condition).filter((t) => t.length === 2 && !COMMON.has(t) && q.has(t)));
  return shared.size >= 2 || containment(condition, question) >= 0.35;
}

export interface Escalation { escalate: boolean; why: 'none' | 'no-evidence' | 'gate' | 'call' | 'safety'; callCard?: Card; safety?: string }

/** 넘기는 조건: 근거 카드 없음 / 검증을 통과한 근거 줄이 남지 않음 / 카드의 점장 호출 기준에 질문이 해당 */
export function escalator(question: string, ans: Answer, cards: Card[]): StepOut<Escalation> {
  const danger = safetyHit(question);
  if (danger) return { out: { escalate: true, why: 'safety', safety: `${danger.why}("${danger.match}")` }, summary: `안전 어휘 "${danger.match}"(${danger.why}) → 위키 답 대신 점장에게 바로 넘겼습니다` };
  if (ans.needsManager || ans.confidence === 'none') return { out: { escalate: true, why: 'no-evidence' }, summary: '점장에게 넘겼습니다 (근거 카드 없음)' };
  const hasEvidenceLine = ans.answer.split('\n').some((l) => /\[C\d{3,}\]/.test(l));
  if (!ans.cited.length || !hasEvidenceLine) return { out: { escalate: true, why: 'gate' }, summary: '점장에게 넘겼습니다 (검증을 통과한 근거 줄이 없음)' };
  const hit = cards.find((c) => ans.cited.includes(c.id) && c.escalateWhen && matchesCondition(c.escalateWhen, question));
  if (hit) return { out: { escalate: true, why: 'call', callCard: hit }, summary: `점장 호출 기준에 해당해 점장에게 넘겼습니다 ([${hit.id}] ${hit.escalateWhen})` };
  return { out: { escalate: false, why: 'none' }, summary: '위키 답으로 충분합니다' };
}
