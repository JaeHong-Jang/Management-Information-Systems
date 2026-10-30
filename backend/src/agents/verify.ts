// 검증팀: 모두 규칙. LLM이 쓴 답을 LLM이 아닌 규칙으로 확인한다.
import type { Card } from '@shared/contracts';
import type { StepOut } from '../harness/runner.js';
import { forbidden } from '../tools/policies.js';
import type { Answer } from './answer.js';

const CITE = /\[(C\d{3,})\]/g;
const HAS_CITE = /\[C\d{3,}\]/;

/** 답에 나온 카드 번호가 실제 승인 카드이고 검색 결과 안에 있는지, 근거가 하나라도 붙었는지 본다. 근거 없는 줄은 뺀다. */
export function citationChecker(ans: Answer, approvedIds: Set<string>, retrievedIds: Set<string>): StepOut<{ answer: Answer; problems: string[] }> {
  if (ans.needsManager) return { out: { answer: ans, problems: [] }, summary: '답할 카드가 없어 검사할 인용 없음', status: 'skipped' };
  const problems: string[] = [];
  const mentioned = [...ans.answer.matchAll(CITE)].map((m) => m[1]);
  for (const id of new Set([...mentioned, ...ans.cited])) {
    if (!approvedIds.has(id)) problems.push(`쓸 수 없는 카드 인용(없음·만료·상충): ${id}`);
    else if (!retrievedIds.has(id)) problems.push(`검색되지 않은 카드 인용: ${id}`);
  }
  const valid = ans.cited.filter((id) => approvedIds.has(id) && retrievedIds.has(id));
  const ok = (id: string) => approvedIds.has(id) && retrievedIds.has(id);
  const lines = ans.answer.split('\n');
  // 근거 표시가 없거나, 쓸 수 없는 카드를 하나라도 인용한 줄은 뺀다
  const kept = lines.filter((l) => {
    if (!l.trim()) return true;
    const ids = [...l.matchAll(CITE)].map((m) => m[1]);
    if (ids.some((id) => !ok(id))) return false;
    return HAS_CITE.test(l); // 어떤 줄이든 실제 카드 근거가 붙어야 남는다
  });
  if (kept.length < lines.length) problems.push(`근거가 없거나 잘못된 줄 ${lines.length - kept.length}개를 뺐습니다`);
  if (!valid.length) problems.push('유효한 근거 카드가 없습니다');
  const fixed: Answer = { ...ans, answer: kept.join('\n'), cited: valid };
  return { out: { answer: fixed, problems }, status: problems.length ? 'blocked' : 'ok', problems, summary: problems.length ? `인용 문제 ${problems.length}건` : `인용 ${valid.length}개 모두 실제 카드` };
}

/** 인용한 카드끼리 공식규정과 현장노하우가 같은 토픽에서 만나면, 공식규정 우선 안내가 있는지 본다. 없으면 붙인다. */
export function policyChecker(ans: Answer, cards: Card[]): StepOut<{ answer: Answer; problems: string[] }> {
  const cited = cards.filter((c) => ans.cited.includes(c.id));
  const mixed = cited.some((a) => cited.some((b) => a.topic === b.topic && a.source !== b.source));
  if (!mixed) return { out: { answer: ans, problems: [] }, summary: '공식규정과 현장노하우가 섞이지 않음' };
  if (/공식규정/.test(ans.answer)) return { out: { answer: ans, problems: [] }, summary: '규정 우선 안내 있음' };
  const official = cited.find((c) => c.source === '공식규정')!;
  const fixed = { ...ans, answer: `${ans.answer}\n공식규정 [${official.id}]과 다른 현장 관행이 있습니다. 공식규정을 따르세요. [${official.id}]` };
  return { out: { answer: fixed, problems: ['규정 우선 안내 누락 → 덧붙임'] }, status: 'blocked', problems: ['규정 우선 안내 누락'], summary: '규정 우선 안내를 덧붙였습니다' };
}

/** 금지 표현이 든 줄을 뺀 글 */
export function dropForbiddenLines(text: string): string {
  return text.split('\n').filter((l) => forbidden(l).length === 0).join('\n');
}

export function wordingGuard(text: string): StepOut<string[]> {
  const hits = forbidden(text).map((f) => `"${f.match}" — ${f.why}`);
  return { out: hits, status: hits.length ? 'blocked' : 'ok', problems: hits, summary: hits.length ? `금지 표현 ${hits.length}건` : '금지 표현 없음' };
}
