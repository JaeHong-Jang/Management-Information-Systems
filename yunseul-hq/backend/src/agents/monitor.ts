// 관측팀: 리뷰 수집원 · 불만 분류원 · 편차 채점원
import { z } from 'zod';
import { COMPLAINT_TYPES, type ComplaintType, type Review, type Store } from '@shared/contracts';
import { ask, hqSystem, llmEnabled, status as aiStatus } from '../harness/llm.js';
import type { StepOut } from '../harness/runner.js';
import { isLow, retag } from '../rules/tagging.js';
import { HIGH_RISK } from '../rules/score.js';
import { allStats } from '../hq/service.js';
import * as db from '../store/db.js';

// ---------- 리뷰 수집원 (규칙) ----------

export function reviewCollector(reviews: Review[], scope: string): StepOut<Review[]> {
  const stores = new Set(reviews.map((r) => r.storeId)).size;
  const kakao = reviews.filter((r) => r.platform === '카카오').length;
  const virtual = reviews.filter((r) => r.virtual).length;
  return {
    out: reviews,
    summary: `${scope}: 매장 ${stores}곳 리뷰 ${reviews.length}건(카카오 ${kakao}, 네이버 ${reviews.length - kakao}${virtual ? `, 처방 이후 가상 ${virtual}` : ''})`,
  };
}

// ---------- 불만 분류원 ----------

const LLM_LIMIT = 40; // 한 번에 다시 분류하는 저평점 리뷰 수

/** 규칙(정규식 12종)으로 모두 다시 태깅하고, AI가 켜져 있고 매장 하나를 볼 때만 저평점 리뷰를 근거 문장과 함께 다시 분류한다. 근거 문장이 원문에 없으면 규칙 결과를 유지한다 */
export async function complaintTagger(reviews: Review[], opts: { storeName?: string; rulesOnly?: boolean } = {}): Promise<StepOut<Review[]>> {
  const tagged = reviews.map(retag);
  const low = tagged.filter(isLow);
  const counted = () => tagged.filter((r) => r.tags.length).length;
  if (!opts.storeName || opts.rulesOnly || !llmEnabled() || !low.length)
    return { out: tagged, summary: `규칙 분류: ${tagged.length}건 중 불만 유형이 붙은 리뷰 ${counted()}건(저평점 ${low.length}건)` };

  const batch = low.slice(0, LLM_LIMIT);
  const schema = z.object({
    items: z.array(z.object({ reviewId: z.string(), tags: z.array(z.enum(COMPLAINT_TYPES)), evidence: z.string().describe('불만 유형의 근거가 되는 원문 문장(그대로)') })),
  });
  const res = await ask('complaint-tagger', {
    system: hqSystem(db.get().brand.name),
    user: `'${opts.storeName}' 저평점 리뷰다. 리뷰마다 해당하는 불만 유형(${COMPLAINT_TYPES.join(', ')})을 고르고, 근거 문장을 원문 그대로 하나 붙여라. 해당 없으면 tags는 빈 배열.\n\n${batch.map((r) => `[${r.id}] ★${r.star} ${r.text}`).join('\n')}`,
    schema,
  });
  if (!res) return { out: tagged, via: 'rules(LLM 실패 대체)', summary: `AI 재분류 실패 → 규칙 분류 유지(불만 유형이 붙은 리뷰 ${counted()}건)` };
  let changed = 0;
  let rejected = 0;
  const byId = new Map(tagged.map((r) => [r.id, r]));
  for (const item of res.items) {
    const r = byId.get(item.reviewId);
    if (!r || !batch.includes(r)) continue;
    if (!item.evidence.trim() || !r.text.replace(/\s+/g, ' ').includes(item.evidence.replace(/\s+/g, ' ').trim())) {
      rejected++;
      continue;
    }
    const tags = COMPLAINT_TYPES.filter((t) => item.tags.includes(t)) as ComplaintType[];
    if (tags.join() !== r.tags.join()) changed++;
    Object.assign(r, { tags, tagVia: aiStatus.mode === 'ollama' ? 'ollama' : 'claude' });
  }
  return { out: tagged, via: aiStatus.mode === 'ollama' ? 'ollama' : 'claude', summary: `저평점 ${batch.length}건 AI 재분류: 바뀐 리뷰 ${changed}건${rejected ? `, 근거 문장이 원문에 없어 규칙 유지 ${rejected}건` : ''}` };
}

// ---------- 편차 채점원 (규칙) ----------

export function varianceScorer(stores: Store[]): StepOut<null> {
  const { scores } = allStats();
  const ranked = stores.filter((s) => scores.get(s.id)?.rank !== null);
  const high = ranked.filter((s) => scores.get(s.id)!.risk >= HIGH_RISK);
  const top = [...ranked].sort((a, b) => scores.get(a.id)!.rank! - scores.get(b.id)!.rank!)[0];
  return {
    out: null,
    summary: `R1~R5 채점: 순위 대상 ${ranked.length}곳, 고위험 ${high.length}곳${top ? `, 1위 ${top.name}(위험 ${scores.get(top.id)!.risk})` : ''}`,
  };
}
