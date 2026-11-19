// 검증팀: 모두 규칙. LLM이 쓴 답·진단·처방을 LLM이 아닌 규칙으로 확인한다.
import type { Card, Finding, Prescription, Quote, Review } from '@shared/contracts';
import type { StepOut } from '../harness/runner.js';
import { forbidden } from '../tools/policies.js';
import { SOURCE_RANK } from '../store/db.js';
import type { Answer } from './answer.js';

// 카드 번호: 대문자로 시작하고 숫자로 끝나는 [C001] 같은 표시
const CITE = /\[([A-Z][A-Z0-9-]*\d)\]/g;
const HAS_CITE = /\[[A-Z][A-Z0-9-]*\d\]/;
export const citedIds = (text: string) => [...text.matchAll(CITE)].map((m) => m[1]);

/** 답에 나온 카드 번호가 실제로 쓸 수 있는 카드이고 검색 결과 안에 있는지, 근거가 하나라도 붙었는지 본다. 근거 없는 줄은 뺀다. */
export function citationChecker(ans: Answer, approvedIds: Set<string>, retrievedIds: Set<string>): StepOut<{ answer: Answer; problems: string[] }> {
  if (ans.needsManager) return { out: { answer: ans, problems: [] }, summary: '답할 카드가 없어 검사할 인용 없음', status: 'skipped' };
  const problems: string[] = [];
  for (const id of new Set([...citedIds(ans.answer), ...ans.cited])) {
    if (!approvedIds.has(id)) problems.push(`쓸 수 없는 카드 인용(없음·다른 매장·만료·상충): ${id}`);
    else if (!retrievedIds.has(id)) problems.push(`검색되지 않은 카드 인용: ${id}`);
  }
  const ok = (id: string) => approvedIds.has(id) && retrievedIds.has(id);
  const valid = ans.cited.filter(ok);
  const lines = ans.answer.split('\n');
  // 근거 표시가 없거나, 쓸 수 없는 카드를 하나라도 인용한 줄은 뺀다
  const kept = lines.filter((l) => {
    if (!l.trim()) return true;
    if (citedIds(l).some((id) => !ok(id))) return false;
    return HAS_CITE.test(l);
  });
  if (kept.length < lines.length) problems.push(`근거가 없거나 잘못된 줄 ${lines.length - kept.length}개를 뺐습니다`);
  if (!valid.length) problems.push('유효한 근거 카드가 없습니다');
  const fixed: Answer = { ...ans, answer: kept.join('\n'), cited: valid };
  return { out: { answer: fixed, problems }, status: problems.length ? 'blocked' : 'ok', problems, summary: problems.length ? `인용 문제 ${problems.length}건` : `인용 ${valid.length}개 모두 실제 카드` };
}

/** 인용한 카드끼리 같은 토픽에서 출처가 다르면 높은 출처(본사 표준 > 공식규정 > 현장노하우)를 따르라는 안내가 있는지 본다. 없으면 붙인다. */
export function policyChecker(ans: Answer, cards: Card[]): StepOut<{ answer: Answer; problems: string[] }> {
  const cited = cards.filter((c) => ans.cited.includes(c.id));
  const mixed = cited.filter((a) => cited.some((b) => a.topic === b.topic && a.source !== b.source));
  if (!mixed.length) return { out: { answer: ans, problems: [] }, summary: '출처가 다른 카드가 섞이지 않음' };
  const top = [...mixed].sort((a, b) => SOURCE_RANK[b.source] - SOURCE_RANK[a.source])[0];
  if (new RegExp(`${top.source}[^\\n]*따르`).test(ans.answer)) return { out: { answer: ans, problems: [] }, summary: `${top.source} 우선 안내 있음` };
  const fixed = { ...ans, answer: `${ans.answer}\n${top.source} [${top.id}]과 다른 매장 관행이 있어요. ${top.source}을 따르세요. [${top.id}]` };
  return { out: { answer: fixed, problems: [`${top.source} 우선 안내 누락 → 덧붙임`] }, status: 'blocked', problems: [`${top.source} 우선 안내 누락`], summary: `${top.source} 우선 안내를 덧붙였습니다` };
}

/** 금지 표현이 든 줄을 뺀 글 */
export function dropForbiddenLines(text: string): string {
  return text.split('\n').filter((l) => forbidden(l).length === 0).join('\n');
}

export function wordingGuard(text: string): StepOut<string[]> {
  const hits = forbidden(text).map((f) => `"${f.match}" — ${f.why}`);
  return { out: hits, status: hits.length ? 'blocked' : 'ok', problems: hits, summary: hits.length ? `금지 표현 ${hits.length}건` : '금지 표현 없음' };
}

// ---------- 리뷰 인용 검증 (diagnose-gate) ----------

const norm = (s: string) => s.replace(/\s+/g, ' ').trim();
export const LOW_CONFIDENCE = '(인용 없음: 낮은 확신)';

/** Finding마다 인용이 그 매장의 실제 리뷰이고 문장이 원문에 그대로 있는지 본다. 아니면 그 인용을 뺀다. 인용이 0개가 된 Finding은 남기되 낮은 확신으로 표시한다 */
export function quoteChecker(findings: Finding[], storeId: string, reviewById: (id: string) => Review | undefined): StepOut<{ findings: Finding[]; problems: string[] }> {
  const problems: string[] = [];
  let kept = 0;
  const out = findings.map((f) => {
    const quotes: Quote[] = [];
    for (const q of f.quotes) {
      const r = reviewById(q.reviewId);
      const why = !r ? `없는 리뷰 ${q.reviewId}` : r.storeId !== storeId ? `다른 매장 리뷰 ${q.reviewId}` : !q.text.trim() || !norm(r.text).includes(norm(q.text)) ? `${q.reviewId} 원문에 없는 문장` : '';
      if (why) problems.push(`${f.complaint}: ${why}`);
      else if (!quotes.some((x) => x.reviewId === r!.id)) quotes.push({ reviewId: r!.id, text: q.text.trim(), platform: r!.platform, star: r!.star, date: r!.date });
    }
    kept += quotes.length;
    if (!quotes.length) {
      problems.push(`${f.complaint}: 남은 인용이 없어 낮은 확신으로 표시`);
      return { ...f, quotes, explanation: f.explanation.includes(LOW_CONFIDENCE) ? f.explanation : `${f.explanation} ${LOW_CONFIDENCE}` };
    }
    return { ...f, quotes };
  });
  return { out: { findings: out, problems }, status: problems.length ? 'blocked' : 'ok', problems, summary: problems.length ? `인용 문제 ${problems.length}건 정리 · 남은 인용 ${kept}개` : `인용 ${kept}개 모두 그 매장 리뷰 원문과 일치` };
}

// ---------- 처방 근거 검증 (prescribe-gate) ----------

/** 처방이 가리키는 진단 결과·카드·리뷰 번호가 실제로 있는지 본다. 없는 번호는 뺀다 */
export function prescriptionChecker(list: Prescription[], findingIds: Set<string>, cardIds: Set<string>, storeReviewIds: Set<string>): StepOut<{ prescriptions: Prescription[]; problems: string[] }> {
  const problems: string[] = [];
  const out = list.map((p) => {
    const badF = p.findingIds.filter((id) => !findingIds.has(id));
    const badC = p.cardIds.filter((id) => !cardIds.has(id));
    // 본문의 [번호] 중 카드가 아닌 것은 이 매장 리뷰여야 한다
    const badR = citedIds(p.body).filter((id) => !cardIds.has(id) && !storeReviewIds.has(id));
    badF.forEach((id) => problems.push(`${p.title}: 없는 진단 결과 ${id}`));
    badC.forEach((id) => problems.push(`${p.title}: 없는 카드 ${id}`));
    badR.forEach((id) => problems.push(`${p.title}: 이 매장 리뷰가 아닌 ${id}`));
    let body = p.body;
    for (const id of badR) body = body.replaceAll(`[${id}]`, '');
    return { ...p, findingIds: p.findingIds.filter((id) => findingIds.has(id)), cardIds: p.cardIds.filter((id) => cardIds.has(id)), body };
  });
  return { out: { prescriptions: out, problems }, status: problems.length ? 'blocked' : 'ok', problems, summary: problems.length ? `근거 문제 ${problems.length}건을 정리` : `처방 ${list.length}건의 근거 번호 모두 확인` };
}
