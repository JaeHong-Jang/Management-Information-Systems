// 흐름(오케스트레이터가 정한 에이전트 순서). 각 흐름은 harness.config.json의 flows와 같은 순서로 에이전트를 부른다.
import type { AskResult, Card, InterviewDraft, LintIssue } from '@shared/contracts';
import { agentDef, config } from '../harness/config.js';
import { Run } from '../harness/runner.js';
import { cardWriter, interviewer, privacyGuard, type FollowupAnswer } from '../agents/capture.js';
import { coach, escalator, librarian } from '../agents/answer.js';
import { citationChecker, dropForbiddenLines, policyChecker, wordingGuard } from '../agents/verify.js';
import { forbidden, maskPii } from '../tools/policies.js';

const forbiddenIn = (text: string) => forbidden(text).map((f) => `"${f.match}" — ${f.why}`);
import { search } from '../tools/search.js';
import { linter, synthesizer } from '../agents/keeper.js';
import * as db from '../store/db.js';
import { anonNode, cardEdges, cardNode, edge, itemNodes, personNode, questionEdges, questionNode, roleNode, sourceNode, topicNode } from '../store/graph.js';
import { stockFacts } from '../agents/stock.js';
import { inventoryView } from '../inventory/calc.js';

// 카드 노드를 내보낼 때는 연결 대상(토픽·출처)도 함께 보낸다. 화면에 아직 없는 토픽이면 관계가 버려지기 때문이다.
const withContext = (c: Card) => [cardNode(c), topicNode(c.topic), sourceNode(c.source), ...itemNodes(c.itemIds ?? [])];

const plan = (flow: keyof typeof config.flows) => config.flows[flow].steps.filter((s) => s !== 'orchestrator').map((s) => agentDef(s).name).join(' → ');

export async function orchestrate(run: Run, note = '') {
  await run.step('orchestrator', () => ({ out: null, summary: `${config.flows[run.flow].name}: ${plan(run.flow)}${note ? ` · ${note}` : ''}` }));
}

export async function resynthesize(run: Run, topic: string) {
  const summary = await run.step('synthesizer', () => synthesizer(topic, db.usableCards().usable.filter((c) => c.topic === topic)));
  db.get().topicSummaries[topic] = summary;
  run.wiki({ op: '토픽 재종합', detail: `'${topic}' 핵심 원칙을 다시 정리`, nodes: [topicNode(topic)], edges: [] });
}

// ---------- 신입 질문 ----------

export async function ask(rawText: string, askerId: string): Promise<AskResult> {
  // 개인정보는 실행 기록·모델 입력·저장보다 먼저 가린다
  const text = maskPii(rawText).text;
  const run = new Run('ask', db.personLabel(askerId), text);
  await orchestrate(run);
  await run.step('privacy-guard', () => privacyGuard(rawText));
  const { usable: approved, excluded } = db.usableCards();
  const hits = await run.step('librarian', () => librarian(text, approved, excluded));
  // 재고·주문을 묻는 질문이면 발주 담당이 숫자 줄을 만든다(숫자는 코치가 쓰지 않는다)
  const sv = inventoryView(db.inventory(), approved, db.today());
  const facts = stockFacts(text, sv);
  const stock = facts.out.lines.length ? await run.step('order-clerk', () => facts) : null;
  const draft = await run.step('coach', () => coach(text, hits));
  const c1 = await run.step('citation-checker', () => citationChecker(draft, new Set(approved.map((c) => c.id)), new Set(hits.map((h) => h.card.id))));
  const c2 = await run.step('policy-checker', () => policyChecker(c1.answer, approved));
  const words = await run.step('wording-guard', () => wordingGuard(c2.answer.answer));
  run.gate('answer-gate', [...c1.problems, ...c2.problems, ...words], config.gates.find((g) => g.id === 'answer-gate')!.onFail);
  // 게이트는 경고가 아니라 출력 통제다: 금지 표현 줄은 신입에게 보이지 않는다
  const checked = { ...c2.answer, answer: dropForbiddenLines(c2.answer.answer) };
  const esc = await run.step('escalator', () => escalator(text, checked, approved));

  let final = checked;
  if (esc.why === 'safety') {
    // 안전 상황에는 매장 사례를 덧붙이지 않는다(글자가 비슷한 다른 사례의 행동이 섞이는 것을 막는다)
    final = { ...checked, answer: `안전과 관련된 상황이에요(${esc.safety}). 혼자 처리하지 말고 점장님께 바로 연락하세요. 위급하면 119나 112에 먼저 신고하세요.`, confidence: 'low', cited: [] };
  } else if (esc.escalate && esc.why === 'call' && esc.callCard) {
    const c = esc.callCard;
    const interim = c.actions.filter((a) => !forbidden(a).length).slice(0, 2).map((a, i) => `${i + 1}. ${a} [${c.id}]`);
    final = { ...checked, answer: [`점장 호출 기준에 해당해요: ${c.escalateWhen} [${c.id}]`, '점장님께 바로 알렸어요. 그동안 할 수 있는 것:', ...interim].join('\n'), cited: [c.id], confidence: 'low' };
  } else if (esc.escalate) {
    final = { ...checked, answer: '매장 위키에 이 상황에 맞는 사례가 아직 없어요. 점장님께 질문을 넘겼어요. 답이 오면 위키에 사례로 추가돼요.', cited: [], confidence: 'none' };
  }
  let escalated = esc.escalate;
  if (stock && esc.why !== 'safety') {
    // 바닥이 가까운 품목이면 그 품목의 품절·대체 카드를 함께 보여 준다
    const low = stock.items.filter((s) => s.daysLeft !== null && s.daysLeft <= s.item.leadDays + 1);
    const subs = approved.filter((c) => c.topic === '품절·대체' && c.itemIds?.some((id) => low.some((s) => s.item.id === id)));
    const subLines = subs.map((c) => `바닥나면: ${c.title} [${c.id}]`);
    // 카드 답은 지우지 않고 숫자를 앞에 붙인다. 점장 호출이면 호출은 그대로 둔다.
    // 다만 다른 품목을 가리키는 카드(짐빔을 물었는데 진로 품절 카드)처럼 글자만 비슷한 카드이거나 근거가 없으면 숫자로만 답한다
    const asked = new Set(stock.items.map((x) => x.item.id));
    const related = (id: string) => {
      const c = db.card(id);
      return !!c && (c.topic === '재고·발주' || !c.itemIds?.length || c.itemIds.some((i) => asked.has(i)));
    };
    const extra = subLines.filter((_, i) => !final.cited.includes(subs[i].id));
    if (esc.why === 'call') final = { ...final, answer: [...stock.lines, final.answer].join('\n') };
    else if (final.cited.length > 0 && final.cited.every(related)) final = { ...final, answer: [...stock.lines, final.answer, ...extra].join('\n'), cited: [...new Set([...final.cited, ...subs.map((c) => c.id)])] };
    else {
      final = { answer: [...stock.lines, ...subLines].join('\n'), why: '숫자는 POS 판매 × 메뉴별 소모량과 마감 실사로 계산했어요. 주문서는 점장님이 확인하고 보내요.', cited: subs.map((c) => c.id), confidence: 'high', needsManager: false };
      escalated = false;
    }
  }
  // 마지막 관문: 어떤 경로로 만든 답이든 신입에게 가기 직전에 금지 표현 줄을 빼고, 이유도 다시 검사한다
  final = { ...final, answer: dropForbiddenLines(final.answer), why: forbidden(final.why).length || esc.why === 'safety' ? '' : final.why };
  for (const id of final.cited) db.card(id)!.uses++;
  const q = db.createQuestion({ text, askerId, status: escalated ? 'escalated' : 'answered', answer: final.answer, why: final.why, cited: final.cited, confidence: final.confidence, runId: run.runId });
  const asker = db.person(askerId)!;
  run.wiki({
    op: escalated ? '점장에게 넘김' : '질문에 답함',
    detail: `[${q.id}] ${text.slice(0, 40)}${final.cited.length ? ` → ${final.cited.join(', ')}` : ''}`,
    nodes: [roleNode(asker.role), questionNode(q), ...final.cited.map((id) => cardNode(db.card(id)!)), ...itemNodes(stock?.items.map((s) => s.item.id) ?? [])],
    edges: questionEdges(q),
  });
  run.end(true, escalated ? '점장 답을 기다립니다' : stock && !final.cited.length ? '재고 숫자로 답했습니다' : `근거 ${final.cited.length}개로 답했습니다`);
  return { question: q, candidates: hits.map((h) => ({ id: h.card.id, title: h.card.title, score: Number(h.score.toFixed(2)) })), runId: run.runId };
}

export async function feedback(questionId: string, solved: boolean) {
  const q = db.question(questionId);
  if (!q) throw new Error('질문을 찾을 수 없습니다');
  q.feedback = solved ? 'solved' : 'unsolved';
  for (const id of q.cited) {
    const c = db.card(id);
    if (c) solved ? c.helpful++ : c.notHelpful++;
  }
  const run = new Run('ask', db.personLabel(q.askerId), `피드백: ${solved ? '해결됨' : '해결 안 됨'}`);
  const escalate = !solved && q.status === 'answered';
  if (escalate) q.status = 'escalated';
  await orchestrate(run, escalate ? '해결 안 됨 → 점장에게 넘김' : '해결됨 → 카드 도움 횟수 반영');
  run.wiki({ op: solved ? '해결 확인' : '점장에게 넘김', detail: `[${q.id}] ${solved ? '위키 답으로 해결' : '위키 답으로 해결 안 됨'}`, nodes: [questionNode(q), ...q.cited.map((id) => cardNode(db.card(id)!))], edges: [] });
  run.end(true, solved ? '해결 확인' : '점장 대기');
  return q;
}

// ---------- 노하우 기록 ----------

export async function interview(raw: string, authorId: string, answers: FollowupAnswer[] = []): Promise<InterviewDraft> {
  const run = new Run('record', db.personLabel(authorId), maskPii(raw).text);
  await orchestrate(run, answers.length ? '되묻기 답 반영' : '첫 기록');
  const safe = await run.step('privacy-guard', () => privacyGuard(raw));
  const safeAnswers = answers.map((a) => ({ ...a, answer: privacyGuard(a.answer).out.text }));
  const followups = await run.step('interviewer', () => interviewer(safe.text, answers.length > 0));
  const draft = await run.step('card-writer', () => cardWriter(safe.text, safeAnswers, db.get().topics));
  const words = await run.step('wording-guard', () => wordingGuard([draft.title, draft.reason, ...draft.actions, draft.avoid].join('\n')));
  run.gate('card-gate', words, config.gates.find((g) => g.id === 'card-gate')!.onFail);
  run.end(true, followups.length ? `되묻기 ${followups.length}개` : '카드 초안 완성');
  const via = run.steps.find((s) => s.agentId === 'card-writer')?.via;
  return { ...draft, followups, masked: safe.masked, problems: words, via };
}

export const cardText = (c: Pick<Card, 'title' | 'situation' | 'reason' | 'actions' | 'avoid' | 'escalateWhen'>) => [c.title, c.situation, c.reason, ...c.actions, c.avoid, c.escalateWhen].join('\n');

export async function submitCard(input: Omit<InterviewDraft, 'followups' | 'masked' | 'problems'> & { credit?: boolean }, authorId: string): Promise<Card> {
  // 사람이 고친 필드도 저장 전에 다시 가리고 다시 검사한다
  const mask = (s: string) => maskPii(s ?? '').text;
  const draft = { ...input, title: mask(input.title), situation: mask(input.situation), reason: mask(input.reason), actions: input.actions.map(mask), avoid: mask(input.avoid), escalateWhen: mask(input.escalateWhen) };
  const problems = forbiddenIn(cardText(draft));
  const isManager = db.person(authorId)?.role === '점장';
  const direct = isManager && !problems.length;
  const run = new Run('record', db.personLabel(authorId), draft.title);
  await orchestrate(run, direct ? '점장 작성 → 바로 승인' : problems.length ? `금지 표현 ${problems.length}건 → 승인 대기` : '승인 대기로 저장');
  const c = db.createCard(draft, authorId, direct ? 'approved' : 'pending', '기록');
  if (input.credit === false) c.credit = false;
  run.wiki({ op: direct ? '카드 추가' : '카드 승인 대기', detail: `[${c.id}] ${c.title} — ${c.credit === false ? '이름 비공개' : db.personLabel(authorId)}`, nodes: [c.credit === false ? anonNode() : personNode(db.person(authorId)!), ...withContext(c)], edges: cardEdges(c) });
  if (direct) await resynthesize(run, c.topic);
  run.end(true, `[${c.id}] 저장`);
  return c;
}

// ---------- 점장: 승인·반려·갱신·보관 ----------

export async function cardAction(id: string, action: 'approve' | 'reject' | 'renew' | 'archive', edits?: Partial<Card>, reason?: string): Promise<Card> {
  const c = db.card(id);
  if (!c) throw new Error('카드를 찾을 수 없습니다');
  const label = { approve: '승인', reject: '반려', renew: '갱신', archive: '보관' }[action];
  const run = new Run('approve', '점장', `[${id}] ${label}`);
  await orchestrate(run, label);
  if (action === 'approve') {
    if (edits) Object.assign(c, edits);
    const problems = forbiddenIn(cardText(c));
    if (problems.length) {
      run.gate('card-gate', problems, '승인하지 않음: 표현을 고친 뒤 다시 승인');
      run.end(false, '승인 막힘');
      throw Object.assign(new Error(`표현을 다듬어야 승인할 수 있어요: ${problems.join(' / ')}`), { status: 400 });
    }
    c.status = 'approved';
    c.updated = db.today();
    // 점장 답에서 생긴 카드가 승인되면 기다리던 질문을 닫는다
    for (const q of db.get().questions.filter((x) => x.cardId === c.id && x.status === 'escalated')) {
      q.status = 'resolved';
      q.managerAnswer = [...c.actions.map((a, i) => `${i + 1}. ${a} [${c.id}]`), c.avoid ? `하지 말 것: ${c.avoid} [${c.id}]` : ''].filter(Boolean).join('\n');
      q.cited = [c.id];
    }
  } else if (action === 'reject') c.status = 'rejected';
  else if (action === 'archive') {
    c.status = 'archived';
    if (reason) c.archiveReason = reason.slice(0, 200);
  }
  else {
    c.updated = db.today();
    c.expires = db.addDays(db.today(), c.source === '공식규정' ? 180 : 120);
  }
  run.wiki({ op: `카드 ${label}`, detail: `[${c.id}] ${c.title}${c.archiveReason && action === 'archive' ? ` — 사유: ${c.archiveReason}` : ''}`, nodes: action === 'approve' ? withContext(c) : [cardNode(c)], edges: action === 'approve' ? cardEdges(c) : [] });
  if (action === 'approve' || action === 'archive') await resynthesize(run, c.topic);
  run.end(true, `[${c.id}] ${label}`);
  return c;
}

export async function resolve(questionId: string, managerAnswer: string, managerId: string) {
  const q = db.question(questionId);
  if (!q) throw new Error('질문을 찾을 수 없습니다');
  const answer = maskPii(managerAnswer).text;
  const run = new Run('resolve', db.personLabel(managerId), answer);
  await orchestrate(run, `[${q.id}] 점장 답을 사례로`);
  const safe = await run.step('privacy-guard', () => privacyGuard(`${q.text}\n${managerAnswer}`));
  const draft = await run.step('card-writer', () => cardWriter(safe.text, [], db.get().topics));
  const words = await run.step('wording-guard', () => wordingGuard(cardText(draft)));
  run.gate('card-gate', words, '금지 표현이 있어 승인 대기로 저장(점장이 고친 뒤 승인)');
  const c = db.createCard({ ...draft, title: q.text.slice(0, 40), situation: q.text }, managerId, words.length ? 'pending' : 'approved', '에스컬레이션', q.id);
  // 표현 검사에 걸려 승인 대기가 된 답은 신입에게 보이지 않게 질문을 열어 둔다(승인될 때 닫힌다)
  q.status = c.status === 'approved' ? 'resolved' : 'escalated';
  q.managerAnswer = answer;
  q.cardId = c.id;
  run.wiki({
    op: '점장 답 → 새 카드',
    detail: `[${q.id}] → [${c.id}] ${c.title}`,
    nodes: [questionNode(q), ...withContext(c), personNode(db.person(managerId)!)],
    edges: [...cardEdges(c), edge(q.id, c.id, 'became')],
  });
  // 같은 내용을 기다리던 다른 질문도 이 카드로 함께 닫는다(점장이 같은 설명을 반복하지 않게)
  const also = c.status === 'approved' ? db.get().questions.filter((x) => x.status === 'escalated' && x.id !== q.id && (search(x.text, [c])[0]?.coverage ?? 0) >= 0.35 && (search(x.text, [c])[0]?.score ?? 0) >= 1) : [];
  for (const x of also) {
    Object.assign(x, { status: 'resolved', managerAnswer: answer, cardId: c.id, cited: [c.id] });
    run.wiki({ op: '비슷한 질문 함께 해결', detail: `[${x.id}] → [${c.id}]`, nodes: [questionNode(x)], edges: [edge(x.id, c.id, 'became')] });
  }
  if (c.status === 'approved') await resynthesize(run, c.topic);
  run.end(true, c.status === 'approved' ? `질문이 사례 [${c.id}]가 되었습니다${also.length ? ` · 비슷한 대기 질문 ${also.length}건도 해결` : ''}` : `[${c.id}] 표현 확인 필요 → 승인 대기`);
  return { question: q, card: c, alsoResolved: also.map((x) => x.id) };
}

// ---------- 점검 ----------

let lastLintKey = '';

export async function lint(quiet = false): Promise<{ issues: LintIssue[]; runId: string }> {
  if (quiet) {
    const r = await linter();
    db.get().links = r.out.links;
    return { issues: r.out.issues, runId: '' };
  }
  const run = new Run('lint', '위키 점검관', '정기 점검');
  await orchestrate(run);
  const { issues, links } = await run.step('linter', () => linter());
  db.get().links = links;
  // 결과가 지난 점검과 같으면 위키 변경 기록에 다시 남기지 않는다(화면을 열 때마다 기록이 쌓이지 않게)
  const key = issues.map((i) => `${i.kind}:${i.ids.join(',')}`).join('|');
  if (key !== lastLintKey) run.wiki({ op: '위키 점검', detail: `할 일 ${issues.length}건`, nodes: [], edges: links.map((l) => edge(l.source, l.target, l.type)) });
  lastLintKey = key;
  run.end(true, `할 일 ${issues.length}건`);
  return { issues, runId: run.runId };
}
