// 답변팀: 검색 사서 → 현장 코치 → (검증팀) → 점장 연결
import { z } from 'zod';
import type { Card } from '@shared/contracts';
import { ask, llmEnabled } from '../harness/llm.js';
import { llmOr, type StepOut } from '../harness/runner.js';
import { containment, search, type Hit } from '../tools/search.js';

export interface Answer {
  answer: string;
  why: string;
  cited: string[];
  confidence: 'high' | 'low' | 'none';
  needsManager: boolean;
}

// ---------- 검색 사서 (규칙) ----------

export function librarian(question: string, cards: Card[]): StepOut<Hit[]> {
  const hits = search(question, cards);
  return {
    out: hits,
    summary: hits.length ? `가까운 사례 ${hits.length}개: ${hits.slice(0, 3).map((h) => `${h.card.id}(${h.score.toFixed(1)})`).join(', ')}` : '가까운 사례를 찾지 못했습니다',
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

export function escalator(question: string, ans: Answer, gatePassed: boolean, cards: Card[]): StepOut<{ escalate: boolean; note: string }> {
  if (ans.needsManager || ans.confidence === 'none') return { out: { escalate: true, note: '근거 카드 없음' }, summary: '점장에게 넘겼습니다 (근거 카드 없음)' };
  if (!gatePassed && !ans.cited.length) return { out: { escalate: true, note: '검증을 통과한 문장 없음' }, summary: '점장에게 넘겼습니다 (검증 통과 문장 없음)' };
  const hit = cards.find((c) => ans.cited.includes(c.id) && c.escalateWhen && containment(c.escalateWhen, question) >= 0.35);
  if (hit) return { out: { escalate: false, note: `점장 호출 기준 해당 가능: ${hit.escalateWhen}` }, summary: `답은 주되 호출 기준을 강조 ([${hit.id}])` };
  return { out: { escalate: false, note: '' }, summary: '위키 답으로 충분합니다' };
}
