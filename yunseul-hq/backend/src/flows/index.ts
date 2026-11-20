// 매장 흐름(오케스트레이터가 정한 에이전트 순서). harness.config.json의 flows와 같은 순서로 에이전트를 부른다.
// 모든 흐름은 매장 하나(storeId) 안에서만 돈다: 카드·질문·사람·기록이 다른 매장과 섞이지 않는다.
import type { AskResult, Briefing, Card, InterviewDraft, LintIssue } from '@shared/contracts';
import { agentDef, config } from '../harness/config.js';
import { Run } from '../harness/runner.js';
import { cardWriter, interviewer, privacyGuard, type FollowupAnswer, type StoreCtx } from '../agents/capture.js';
import { cardLines, coach, escalator, librarian } from '../agents/answer.js';
import { citationChecker, dropForbiddenLines, policyChecker, wordingGuard } from '../agents/verify.js';
import { linter, synthesizer } from '../agents/keeper.js';
import { briefingItems, briefingWriter } from '../agents/prescribe.js';
import { forbidden, maskPii } from '../tools/policies.js';
import { search, tokens } from '../tools/search.js';
import { scoreOf, storeSituations } from '../hq/service.js';
import * as db from '../store/db.js';
import { anonNode, cardEdges, cardNode, edge, personNode, questionEdges, questionNode, standardNode } from '../store/graph.js';

const forbiddenIn = (text: string) => forbidden(text).map((f) => `"${f.match}" — ${f.why}`);
const httpError = (status: number, message: string) => Object.assign(new Error(message), { status });

export function requireStore(storeId: string) {
  const s = db.store(storeId);
  if (!s) throw httpError(404, `매장을 찾을 수 없습니다 (${storeId}).`);
  return s;
}
export const ctxOf = (storeId: string): StoreCtx => ({ brand: db.get().brand.name, store: requireStore(storeId).name });

/** 카드 노드를 내보낼 때는 연결 대상(본사 표준)도 함께 보낸다 */
const withContext = (c: Card) => {
  const st = c.standardId ? db.standard(c.standardId) : undefined;
  return [cardNode(c), ...(st ? [standardNode(st)] : [])];
};

const plan = (flow: keyof typeof config.flows) => config.flows[flow].steps.filter((s) => s !== 'orchestrator').map((s) => agentDef(s).name).join(' → ');

export async function orchestrate(run: Run, note = '') {
  await run.step('orchestrator', () => ({ out: null, summary: `${config.flows[run.flow].name}: ${plan(run.flow)}${note ? ` · ${note}` : ''}` }));
}

export async function resynthesize(run: Run, storeId: string, topic: string) {
  const summary = await run.step('synthesizer', () => synthesizer(topic, db.usableCards(storeId).usable.filter((c) => c.topic === topic), ctxOf(storeId)));
  const d = db.get();
  (d.topicSummaries[storeId] ??= {})[topic] = summary;
  run.wiki({ op: '토픽 재종합', detail: `'${topic}' 핵심 원칙을 다시 정리`, nodes: [], edges: [] });
}

/** 카드·질문이 이 매장 것인지 확인한다(다른 매장 카드를 이 매장 화면에서 바꾸지 못하게) */
function ownCard(storeId: string, id: string): Card {
  const c = db.card(id);
  if (!c || (c.storeId !== storeId && c.scope !== 'brand')) throw httpError(404, '해당 매장의 카드를 찾을 수 없습니다.');
  return c;
}
function ownQuestion(storeId: string, id: string) {
  const q = db.question(id);
  if (!q || q.storeId !== storeId) throw httpError(404, '해당 매장의 질문을 찾을 수 없습니다.');
  return q;
}

// ---------- 알바 질문 ----------

/** 상황 버튼으로 물으면 검색 없이 그 상황의 카드(매장 카드 우선)로 바로 답한다. 없는 상황이면 400 */
function situationCard(storeId: string, situationId: string, usable: Card[]) {
  const sit = storeSituations(storeId).find((s) => s.id === situationId);
  if (!sit) throw httpError(400, `등록되지 않은 상황입니다 (${situationId}).`);
  return { sit, card: sit.cardIds.map((id) => usable.find((c) => c.id === id)).find(Boolean) };
}

// 어느 매장 상황에나 나오는 낱말 조각. 이것만 겹쳐서는 같은 주제라고 보지 않는다
const TOPIC_NOISE = new Set(['테이', '이블', '주문', '직원']);

/** 질문과 카드의 제목·주제·태그가 의미 있는 2글자 조각 하나라도 겹치는지 */
export function onTopic(text: string, card: Card): boolean {
  const q = new Set(tokens(text));
  return tokens([card.title, card.topic, ...card.tags].join(' ')).some((t) => t.length >= 2 && !TOPIC_NOISE.has(t) && q.has(t));
}

export async function ask(storeId: string, rawText: string, askerId: string, situationId?: string): Promise<AskResult> {
  const ctx = ctxOf(storeId);
  const picked = situationId ? situationCard(storeId, situationId, db.usableCards(storeId).usable) : undefined;
  // 개인정보는 실행 기록·모델 입력·저장보다 먼저 가린다
  const text = maskPii(rawText?.trim() ? rawText : picked?.sit.title ?? '').text;
  const run = new Run('ask', storeId, db.personLabel(askerId), text);
  await orchestrate(run);
  await run.step('privacy-guard', () => privacyGuard(rawText || text));
  if (picked?.card) return askBySituation(run, storeId, text, askerId, picked.card, situationId!);
  const { usable, excluded } = db.usableCards(storeId);
  // 제목·주제·태그가 질문과 겹치지 않는 카드는 본문 낱말이 우연히 겹쳐도 근거로 쓰지 않는다('옆 테이블 항의'에 중간결제 카드가 붙던 문제)
  const hits = (await run.step('librarian', () => librarian(text, usable, excluded))).filter((h) => onTopic(text, h.card));
  const draft = await run.step('coach', () => coach(text, hits, ctx));
  const c1 = await run.step('citation-checker', () => citationChecker(draft, new Set(usable.map((c) => c.id)), new Set(hits.map((h) => h.card.id))));
  const c2 = await run.step('policy-checker', () => policyChecker(c1.answer, usable));
  const words = await run.step('wording-guard', () => wordingGuard(c2.answer.answer));
  run.gate('answer-gate', [...c1.problems, ...c2.problems, ...words], config.gates.find((g) => g.id === 'answer-gate')!.onFail);
  // 게이트는 경고가 아니라 출력 통제다: 금지 표현 줄은 알바에게 보이지 않는다
  const checked = { ...c2.answer, answer: dropForbiddenLines(c2.answer.answer) };
  const esc = await run.step('escalator', () => escalator(text, checked, usable));

  let final = checked;
  // 점수가 낮아도 가장 가까운 카드(hits는 이미 주제가 겹치는 카드만 남아 있다)
  let nearCardId: string | undefined = esc.escalate && esc.why !== 'safety' ? hits[0]?.card.id : undefined;
  if (esc.why === 'safety') {
    final = { ...checked, answer: `안전과 관련된 상황입니다 (${esc.safety}). 단독 대응을 피하고 즉시 점장에게 직접 연락하십시오. 위급한 경우에는 119 또는 112에 먼저 신고하십시오.`, confidence: 'low', cited: [] };
  } else if (esc.escalate && esc.why === 'call' && esc.callCard) {
    const c = esc.callCard;
    const interim = c.actions.filter((a) => !forbidden(a).length).slice(0, 2).map((a, i) => `${i + 1}. ${a} [${c.id}]`);
    final = { ...checked, answer: [`점장 호출 기준 · ${c.escalateWhen} [${c.id}]`, '점장에게 직접 연락하십시오. 도착 전 조치 사항은 다음과 같습니다.', ...interim].join('\n'), cited: [c.id], confidence: 'low' };
    nearCardId = c.id;
  } else if (esc.escalate) {
    final = { ...checked, answer: '매장 위키에서 해당 사례를 찾지 못했습니다. 점장에게 직접 연락하십시오. 질문은 점장 업무 목록에 등록되며, 답변은 ‘내 질문 내역’에서 확인할 수 있습니다.', cited: [], confidence: 'none' };
  }
  // 마지막 관문: 알바에게 가기 직전에 금지 표현 줄을 빼고, 이유도 다시 검사한다
  final = { ...final, answer: dropForbiddenLines(final.answer), why: forbidden(final.why).length || esc.why === 'safety' ? '' : final.why };
  for (const id of final.cited) db.card(id)!.uses++;
  const q = db.createQuestion({ storeId, text, askerId, status: esc.escalate ? 'escalated' : 'answered', answer: final.answer, why: final.why, cited: final.cited, confidence: final.confidence, runId: run.runId, ...(nearCardId ? { nearCardId } : {}), ...(situationId ? { situationId } : {}) });
  run.wiki({
    op: esc.escalate ? '점장에게 넘김' : '질문에 답함',
    detail: `[${q.id}] ${text.slice(0, 40)}${final.cited.length ? ` → ${final.cited.join(', ')}` : ''}`,
    nodes: [questionNode(q), ...final.cited.map((id) => cardNode(db.card(id)!))],
    edges: questionEdges(q),
  });
  run.end(true, esc.escalate ? '점장 답변 대기' : `답변 완료 · 근거 카드 ${final.cited.length}개`);
  return { question: q, candidates: hits.map((h) => ({ id: h.card.id, title: h.card.title, score: Number(h.score.toFixed(2)) })), runId: run.runId };
}

/** 상황 버튼 답: 검색·코치 없이 카드 그대로. 금지 표현 줄은 여기서도 뺀다 */
async function askBySituation(run: Run, storeId: string, text: string, askerId: string, card: Card, situationId: string): Promise<AskResult> {
  const words = await run.step('wording-guard', () => wordingGuard(cardLines(card).join('\n')));
  run.gate('answer-gate', words, config.gates.find((g) => g.id === 'answer-gate')!.onFail);
  const answer = dropForbiddenLines(cardLines(card).join('\n'));
  const why = forbidden(card.reason).length ? '' : card.reason;
  card.uses++;
  const q = db.createQuestion({ storeId, text, askerId, status: 'answered', answer, why, cited: [card.id], confidence: 'high', runId: run.runId, situationId });
  run.wiki({ op: '질문에 답함', detail: `[${q.id}] ${text.slice(0, 40)} → ${card.id}`, nodes: [questionNode(q), cardNode(card)], edges: questionEdges(q) });
  run.end(true, `상황 ${situationId} 답변 완료 · 근거 카드 [${card.id}]`);
  return { question: q, candidates: [], runId: run.runId };
}

export async function feedback(storeId: string, questionId: string, solved: boolean) {
  const q = ownQuestion(storeId, questionId);
  q.feedback = solved ? 'solved' : 'unsolved';
  for (const id of q.cited) {
    const c = db.card(id);
    if (c) solved ? c.helpful++ : c.notHelpful++;
  }
  const run = new Run('ask', storeId, db.personLabel(q.askerId), `피드백: ${solved ? '해결됨' : '해결 안 됨'}`);
  const escalate = !solved && q.status === 'answered';
  if (escalate) {
    q.status = 'escalated';
    q.nearCardId ??= q.cited[0];
    q.answer = '미해결 질문을 점장 업무 목록에 등록했습니다. 긴급한 경우 점장에게 직접 연락하십시오.';
  }
  await orchestrate(run, escalate ? '해결 안 됨 → 점장에게 넘김' : '해결됨 → 카드 도움 횟수 반영');
  run.wiki({ op: solved ? '해결 확인' : '점장에게 넘김', detail: `[${q.id}] ${solved ? '위키 답으로 해결' : '위키 답으로 해결 안 됨'}`, nodes: [questionNode(q)], edges: [] });
  run.end(true, solved ? '해결 확인' : '점장 대기');
  return q;
}

// ---------- 노하우 기록 ----------

export async function interview(storeId: string, raw: string, authorId: string, answers: FollowupAnswer[] = []): Promise<InterviewDraft> {
  const ctx = ctxOf(storeId);
  const run = new Run('record', storeId, db.personLabel(authorId), maskPii(raw).text);
  await orchestrate(run, answers.length ? '추가 질문 답변 반영' : '첫 기록');
  const safe = await run.step('privacy-guard', () => privacyGuard(raw));
  const safeAnswers = answers.map((a) => ({ ...a, answer: privacyGuard(a.answer).out.text }));
  const followups = await run.step('interviewer', () => interviewer(safe.text, answers.length > 0, ctx));
  const draft = await run.step('card-writer', () => cardWriter(safe.text, safeAnswers, db.get().topics, ctx));
  const words = await run.step('wording-guard', () => wordingGuard([draft.title, draft.reason, ...draft.actions, draft.avoid].join('\n')));
  run.gate('card-gate', words, config.gates.find((g) => g.id === 'card-gate')!.onFail);
  run.end(true, followups.length ? `되묻기 ${followups.length}개` : '카드 초안 완성');
  const via = run.steps.find((s) => s.agentId === 'card-writer')?.via;
  return { ...draft, followups, masked: safe.masked, problems: words, via };
}

export const cardText = (c: Pick<Card, 'title' | 'situation' | 'reason' | 'actions' | 'avoid' | 'escalateWhen'> & { customerNotice?: string }) =>
  [c.title, c.situation, c.reason, ...c.actions, c.avoid, c.escalateWhen, c.customerNotice ?? ''].join('\n');

export async function submitCard(storeId: string, input: Omit<InterviewDraft, 'followups' | 'masked' | 'problems'> & { credit?: boolean }, authorId: string): Promise<Card> {
  requireStore(storeId);
  // 사람이 고친 필드도 저장 전에 다시 가리고 다시 검사한다. 매장에서는 본사 표준 카드를 만들 수 없다
  const mask = (s: string) => maskPii(s ?? '').text;
  const draft = {
    ...input,
    title: mask(input.title), situation: mask(input.situation), reason: mask(input.reason), actions: input.actions.map(mask), avoid: mask(input.avoid), escalateWhen: mask(input.escalateWhen),
    ...(input.customerNotice ? { customerNotice: mask(input.customerNotice) } : {}),
    source: input.source === '공식규정' ? '공식규정' : '현장노하우',
  } as const;
  const problems = forbiddenIn(cardText(draft));
  const author = db.person(authorId);
  const direct = author?.role === '점장' && author.storeId === storeId && !problems.length;
  const run = new Run('record', storeId, db.personLabel(authorId), draft.title);
  await orchestrate(run, direct ? '점장 작성 → 바로 승인' : problems.length ? `금지 표현 ${problems.length}건 → 승인 대기` : '승인 대기로 저장');
  const c = db.createCard(draft, authorId, direct ? 'approved' : 'pending', '기록', { storeId });
  if (input.credit === false) c.credit = false;
  run.wiki({
    op: direct ? '카드 추가' : '카드 승인 대기',
    detail: `[${c.id}] ${c.title} — ${c.credit === false ? '이름 비공개' : db.personLabel(authorId)}`,
    nodes: [...(c.credit === false ? [anonNode()] : author ? [personNode(author)] : []), ...withContext(c)],
    edges: cardEdges(c),
  });
  if (direct) await resynthesize(run, storeId, c.topic);
  run.end(true, `[${c.id}] 저장`);
  return c;
}

// ---------- 점장: 승인·반려·갱신·보관 ----------

/** 카드 고치기. 그 매장 점장이 고치면 승인 상태 그대로, 다른 사람이 고치면 승인 대기로 돌린다 */
export async function cardEdit(storeId: string, id: string, edits: Partial<Card> | undefined, editorId: string): Promise<Card> {
  const c = ownCard(storeId, id);
  if (c.scope === 'brand') throw httpError(403, '본사 카드는 매장에서 수정할 수 없습니다.');
  const mask = (v: unknown) => (typeof v === 'string' ? maskPii(v).text : undefined);
  const { actions, tags, topic } = edits ?? {};
  const next = {
    ...c,
    ...Object.fromEntries(Object.entries({ title: mask(edits?.title), situation: mask(edits?.situation), reason: mask(edits?.reason), avoid: mask(edits?.avoid), escalateWhen: mask(edits?.escalateWhen), customerNotice: mask(edits?.customerNotice), topic, tags, actions: Array.isArray(actions) ? actions.map((a) => mask(a) ?? '') : undefined }).filter(([, v]) => v !== undefined)),
  };
  const problems = forbiddenIn(cardText(next));
  if (problems.length) throw httpError(400, `저장 전 수정이 필요한 표현 · ${problems.join(' / ')}`);
  const editor = db.person(editorId);
  const byManager = editor?.role === '점장' && editor.storeId === storeId;
  const run = new Run('approve', storeId, db.personLabel(editorId), `[${id}] 고침`);
  await orchestrate(run, byManager ? '점장이 고침 → 승인 유지' : '점장이 아닌 사람이 고침 → 승인 대기');
  Object.assign(c, next, { updated: db.today() });
  if (!byManager && c.status === 'approved') c.status = 'pending';
  run.wiki({ op: '카드 고침', detail: `[${c.id}] ${c.title}${c.status === 'pending' ? ' — 승인 대기로 돌림' : ''}`, nodes: withContext(c), edges: cardEdges(c) });
  await resynthesize(run, storeId, c.topic);
  run.end(true, `[${c.id}] 고침`);
  return c;
}

export async function cardAction(storeId: string, id: string, action: 'approve' | 'reject' | 'renew' | 'archive', edits?: Partial<Card>, reason?: string): Promise<Card> {
  const c = ownCard(storeId, id);
  if (c.scope === 'brand') throw httpError(403, '본사 카드는 매장에서 수정할 수 없습니다.');
  const label = { approve: '승인', reject: '반려', renew: '갱신', archive: '보관' }[action];
  const run = new Run('approve', storeId, '점장', `[${id}] ${label}`);
  await orchestrate(run, label);
  if (action === 'approve') {
    if (edits) {
      // 매장이 바꿀 수 있는 칸만 받는다
      const { title, topic, situation, reason: r, actions, avoid, escalateWhen, customerNotice, tags } = edits;
      Object.assign(c, Object.fromEntries(Object.entries({ title, topic, situation, reason: r, actions, avoid, escalateWhen, customerNotice, tags }).filter(([, v]) => v !== undefined)));
    }
    const problems = forbiddenIn(cardText(c));
    if (problems.length) {
      run.gate('card-gate', problems, '승인하지 않음: 표현을 고친 뒤 다시 승인');
      run.end(false, '승인 차단');
      throw httpError(400, `승인 전 수정이 필요한 표현 · ${problems.join(' / ')}`);
    }
    c.status = 'approved';
    c.updated = db.today();
    // 점장 답에서 생긴 카드가 승인되면 기다리던 질문을 닫는다
    for (const q of db.get().questions.filter((x) => x.storeId === storeId && x.cardId === c.id && x.status === 'escalated')) {
      q.status = 'resolved';
      q.managerAnswer = [...c.actions.map((a, i) => `${i + 1}. ${a} [${c.id}]`), c.avoid ? `하지 말 것: ${c.avoid} [${c.id}]` : ''].filter(Boolean).join('\n');
      q.cited = [c.id];
    }
    // 처방으로 내려온 카드가 모두 승인되면 그 처방을 끝낸다
    const p = c.prescriptionId ? db.prescription(c.prescriptionId) : undefined;
    if (p && p.status === 'sent' && p.cardIds.every((cid) => db.card(cid)?.status === 'approved')) {
      p.status = 'done';
      p.doneAt = db.today();
    }
  } else if (action === 'reject') c.status = 'rejected';
  else if (action === 'archive') {
    c.status = 'archived';
    if (reason) c.archiveReason = reason.slice(0, 200);
  } else {
    c.updated = db.today();
    c.expires = db.addDays(db.today(), c.source === '현장노하우' ? 120 : 180);
  }
  run.wiki({ op: `카드 ${label}`, detail: `[${c.id}] ${c.title}${c.archiveReason && action === 'archive' ? ` — 사유: ${c.archiveReason}` : ''}`, nodes: action === 'approve' ? withContext(c) : [cardNode(c)], edges: action === 'approve' ? cardEdges(c) : [] });
  if (action === 'approve' || action === 'archive') await resynthesize(run, storeId, c.topic);
  run.end(true, `[${c.id}] ${label}`);
  return c;
}

/** 점장 답의 첫 문장(40자 이내). 카드 제목으로 쓴다 */
const firstSentence = (t: string) => (t.split(/[.!?。\n]/).map((x) => x.trim()).find(Boolean) ?? '').slice(0, 40);

export async function resolve(storeId: string, questionId: string, managerAnswer: string, managerId: string) {
  const ctx = ctxOf(storeId);
  const q = ownQuestion(storeId, questionId);
  const answer = maskPii(managerAnswer).text;
  const run = new Run('resolve', storeId, db.personLabel(managerId), answer);
  await orchestrate(run, `[${q.id}] 점장 답을 사례로`);
  const safe = await run.step('privacy-guard', () => privacyGuard(`${q.text}\n${managerAnswer}`));
  const draft = await run.step('card-writer', () => cardWriter(safe.text, [], db.get().topics, ctx));
  const words = await run.step('wording-guard', () => wordingGuard(cardText(draft)));
  run.gate('card-gate', words, '금지 표현 포함 · 승인 대기 등록 후 점장이 수정·승인');
  const c = db.createCard({ ...draft, title: firstSentence(answer) || q.text.slice(0, 40), situation: q.text }, managerId, words.length ? 'pending' : 'approved', '에스컬레이션', { storeId, fromQuestionId: q.id });
  // 표현 검사에 걸려 승인 대기가 된 답은 알바에게 보이지 않게 질문을 열어 둔다(승인될 때 닫힌다)
  q.status = c.status === 'approved' ? 'resolved' : 'escalated';
  q.managerAnswer = answer;
  q.cardId = c.id;
  const manager = db.person(managerId);
  run.wiki({ op: '점장 답 → 새 카드', detail: `[${q.id}] → [${c.id}] ${c.title}`, nodes: [questionNode(q), ...withContext(c), ...(manager ? [personNode(manager)] : [])], edges: [...cardEdges(c), edge(q.id, c.id, 'became')] });
  // 같은 내용을 기다리던 이 매장의 다른 질문도 이 카드로 함께 닫는다
  const also = c.status === 'approved'
    ? db.get().questions.filter((x) => x.storeId === storeId && x.status === 'escalated' && x.id !== q.id && (search(x.text, [c])[0]?.coverage ?? 0) >= 0.35 && (search(x.text, [c])[0]?.score ?? 0) >= 1)
    : [];
  for (const x of also) {
    Object.assign(x, { status: 'resolved', managerAnswer: answer, cardId: c.id, cited: [c.id] });
    run.wiki({ op: '비슷한 질문 함께 해결', detail: `[${x.id}] → [${c.id}]`, nodes: [questionNode(x)], edges: [edge(x.id, c.id, 'became')] });
  }
  if (c.status === 'approved') await resynthesize(run, storeId, c.topic);
  run.end(true, c.status === 'approved' ? `질문 답변을 사례 카드 [${c.id}]로 등록${also.length ? ` · 관련 대기 질문 ${also.length}건 해결` : ''}` : `[${c.id}] 표현 확인 필요 → 승인 대기`);
  return { question: q, card: c, alsoResolved: also.map((x) => x.id) };
}

// ---------- 점검 ----------

const lastLintKey = new Map<string, string>();

/** 점검 결과가 지난번과 다를 때만 실행 기록을 남긴다(화면을 열 때마다 기록이 쌓이지 않게) */
export async function lint(storeId: string): Promise<LintIssue[]> {
  const ctx = ctxOf(storeId);
  const r = await linter(storeId, ctx);
  const d = db.get();
  const mine = new Set(db.storeCards(storeId).map((c) => c.id));
  d.links = [...d.links.filter((l) => !mine.has(l.source) && !mine.has(l.target)), ...r.out.links];
  const key = r.out.issues.map((i) => `${i.kind}:${i.ids.join(',')}`).join('|');
  if (key !== lastLintKey.get(storeId)) {
    lastLintKey.set(storeId, key);
    const run = new Run('lint', storeId, '위키 점검관', '정기 점검', 0);
    await orchestrate(run);
    await run.step('linter', () => r);
    run.wiki({ op: '위키 점검', detail: `점검 사항 ${r.out.issues.length}건`, nodes: [], edges: [] });
    run.end(true, `점검 사항 ${r.out.issues.length}건`);
  } else db.save();
  return r.out.issues;
}

// ---------- 근무 전 브리핑 ----------

const briefingMemo = new Map<string, { key: string; briefing: Briefing }>();

/** 승인된 매장·본사 카드 중 손님 안내 문장이 있는 것을 매장 상위 불만 순서로. 구성이 바뀔 때만 브리핑 흐름을 돌린다 */
export async function briefing(storeId: string): Promise<Briefing> {
  const ctx = ctxOf(storeId);
  const cards = db.usableCards(storeId).usable;
  const items = briefingItems(cards, scoreOf(storeId).topComplaints, db.today());
  const key = JSON.stringify(items.map((i) => [i.cardId, i.say, db.card(i.cardId)?.updated]));
  const memo = briefingMemo.get(storeId);
  if (memo?.key === key) return memo.briefing;
  const run = new Run('briefing', storeId, '브리핑 작성자', `${ctx.store} 근무 전 브리핑`, 0);
  await orchestrate(run);
  const written = await run.step('briefing-writer', () => briefingWriter(ctx, items, cards));
  const words = await run.step('wording-guard', () => wordingGuard(written.map((i) => `${i.say}\n${i.why}`).join('\n')));
  const safe = written.filter((i) => !forbidden(`${i.say}\n${i.why}`).length);
  run.end(true, `브리핑 ${safe.length}개${words.length ? ` (표현 검증 후 ${written.length - safe.length}개 제외)` : ''}`);
  const via = run.steps.find((s) => s.agentId === 'briefing-writer')?.via ?? 'rules';
  const b: Briefing = { storeId, date: db.today(), items: safe, via };
  briefingMemo.set(storeId, { key, briefing: b });
  return b;
}

/** 초기화 때 매장별 기억(점검·브리핑 결과)을 비운다 */
export function clearCaches() {
  lastLintKey.clear();
  briefingMemo.clear();
}
