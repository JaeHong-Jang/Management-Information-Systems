// 흐름(오케스트레이터가 정한 에이전트 순서). 각 흐름은 harness.config.json의 flows와 같은 순서로 에이전트를 부른다.
import type { AskResult, Card, InterviewDraft, LintIssue, TrainingResult } from '@shared/contracts';
import { config } from '../harness/config.js';
import { Run } from '../harness/runner.js';
import { cardWriter, interviewer, privacyGuard, type FollowupAnswer } from '../agents/capture.js';
import { coach, escalator, librarian } from '../agents/answer.js';
import { citationChecker, policyChecker, wordingGuard } from '../agents/verify.js';
import { linter, synthesizer, trainer } from '../agents/keeper.js';
import * as db from '../store/db.js';
import { cardEdges, cardNode, edge, personNode, questionEdges, questionNode, sourceNode, topicNode } from '../store/graph.js';

// 카드 노드를 내보낼 때는 연결 대상(토픽·출처)도 함께 보낸다. 화면에 아직 없는 토픽이면 관계가 버려지기 때문이다.
const withContext = (c: Card) => [cardNode(c), topicNode(c.topic), sourceNode(c.source)];

const plan = (flow: keyof typeof config.flows) => config.flows[flow].steps.filter((s) => s !== 'orchestrator').join(' → ');

async function orchestrate(run: Run, note = '') {
  await run.step('orchestrator', () => ({ out: null, summary: `${config.flows[run.flow].name}: ${plan(run.flow)}${note ? ` · ${note}` : ''}` }));
}

async function resynthesize(run: Run, topic: string) {
  const summary = await run.step('synthesizer', () => synthesizer(topic, db.approvedCards().filter((c) => c.topic === topic)));
  db.get().topicSummaries[topic] = summary;
  run.wiki({ op: '토픽 재종합', detail: `'${topic}' 핵심 원칙을 다시 정리`, nodes: [topicNode(topic)], edges: [] });
}

// ---------- 신입 질문 ----------

export async function ask(text: string, askerId: string): Promise<AskResult> {
  const run = new Run('ask', db.personLabel(askerId), text);
  await orchestrate(run);
  const approved = db.approvedCards();
  const hits = await run.step('librarian', () => librarian(text, approved));
  const draft = await run.step('coach', () => coach(text, hits));
  const c1 = await run.step('citation-checker', () => citationChecker(draft, new Set(approved.map((c) => c.id)), new Set(hits.map((h) => h.card.id))));
  const c2 = await run.step('policy-checker', () => policyChecker(c1.answer, approved));
  const words = await run.step('wording-guard', () => wordingGuard(c2.answer.answer));
  const gate = run.gate('answer-gate', [...c1.problems, ...c2.problems, ...words], config.gates.find((g) => g.id === 'answer-gate')!.onFail);
  const esc = await run.step('escalator', () => escalator(text, c2.answer, gate.passed, approved));

  const final = esc.escalate
    ? { ...c2.answer, answer: '매장 위키에 이 상황에 맞는 사례가 아직 없습니다. 점장님께 질문을 넘겼어요. 답이 오면 위키에 사례로 추가됩니다.', cited: [], confidence: 'none' as const }
    : { ...c2.answer, answer: esc.note ? `${c2.answer.answer}\n${esc.note}` : c2.answer.answer };
  for (const id of final.cited) db.card(id)!.uses++;
  const q = db.createQuestion({ text, askerId, status: esc.escalate ? 'escalated' : 'answered', answer: final.answer, why: final.why, cited: final.cited, confidence: final.confidence, runId: run.runId });
  const asker = db.person(askerId)!;
  run.wiki({
    op: esc.escalate ? '점장에게 넘김' : '질문에 답함',
    detail: `[${q.id}] ${text.slice(0, 40)}${final.cited.length ? ` → ${final.cited.join(', ')}` : ''}`,
    nodes: [personNode(asker), questionNode(q), ...final.cited.map((id) => cardNode(db.card(id)!))],
    edges: questionEdges(q),
  });
  run.end(true, esc.escalate ? '점장 답을 기다립니다' : `근거 ${final.cited.length}개로 답했습니다`);
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
  const run = new Run('record', db.personLabel(authorId), raw);
  await orchestrate(run, answers.length ? '되묻기 답 반영' : '첫 기록');
  const safe = await run.step('privacy-guard', () => privacyGuard(raw));
  const safeAnswers = answers.map((a) => ({ ...a, answer: privacyGuard(a.answer).out.text }));
  const followups = await run.step('interviewer', () => interviewer(safe.text, answers.length > 0));
  const draft = await run.step('card-writer', () => cardWriter(safe.text, safeAnswers, db.get().topics));
  const words = await run.step('wording-guard', () => wordingGuard([draft.title, draft.reason, ...draft.actions, draft.avoid].join('\n')));
  run.gate('card-gate', words, config.gates.find((g) => g.id === 'card-gate')!.onFail);
  run.end(true, followups.length ? `되묻기 ${followups.length}개` : '카드 초안 완성');
  return { ...draft, followups, masked: safe.masked, problems: words };
}

export async function submitCard(draft: Omit<InterviewDraft, 'followups' | 'masked' | 'problems'>, authorId: string): Promise<Card> {
  const isManager = db.person(authorId)?.role === '점장';
  const run = new Run('record', db.personLabel(authorId), draft.title);
  await orchestrate(run, isManager ? '점장 작성 → 바로 승인' : '승인 대기로 저장');
  const c = db.createCard(draft, authorId, isManager ? 'approved' : 'pending', '기록');
  run.wiki({ op: isManager ? '카드 추가' : '카드 승인 대기', detail: `[${c.id}] ${c.title} — ${db.personLabel(authorId)}`, nodes: [personNode(db.person(authorId)!), ...withContext(c)], edges: cardEdges(c) });
  if (isManager) await resynthesize(run, c.topic);
  run.end(true, `[${c.id}] 저장`);
  return c;
}

// ---------- 점장: 승인·반려·갱신·보관 ----------

export async function cardAction(id: string, action: 'approve' | 'reject' | 'renew' | 'archive', edits?: Partial<Card>): Promise<Card> {
  const c = db.card(id);
  if (!c) throw new Error('카드를 찾을 수 없습니다');
  const label = { approve: '승인', reject: '반려', renew: '갱신', archive: '보관' }[action];
  const run = new Run('approve', '점장', `[${id}] ${label}`);
  await orchestrate(run, label);
  if (action === 'approve') {
    if (edits) Object.assign(c, edits);
    c.status = 'approved';
    c.updated = db.today();
  } else if (action === 'reject') c.status = 'rejected';
  else if (action === 'archive') c.status = 'archived';
  else {
    c.updated = db.today();
    c.expires = db.addDays(db.today(), c.source === '공식규정' ? 180 : 120);
  }
  run.wiki({ op: `카드 ${label}`, detail: `[${c.id}] ${c.title}`, nodes: action === 'approve' ? withContext(c) : [cardNode(c)], edges: action === 'approve' ? cardEdges(c) : [] });
  if (action === 'approve' || action === 'archive') await resynthesize(run, c.topic);
  run.end(true, `[${c.id}] ${label}`);
  return c;
}

export async function resolve(questionId: string, managerAnswer: string, managerId: string) {
  const q = db.question(questionId);
  if (!q) throw new Error('질문을 찾을 수 없습니다');
  const run = new Run('resolve', db.personLabel(managerId), managerAnswer);
  await orchestrate(run, `[${q.id}] 점장 답을 사례로`);
  const safe = await run.step('privacy-guard', () => privacyGuard(`${q.text}\n${managerAnswer}`));
  const draft = await run.step('card-writer', () => cardWriter(safe.text, [], db.get().topics));
  const words = await run.step('wording-guard', () => wordingGuard([draft.reason, ...draft.actions].join('\n')));
  run.gate('card-gate', words, '점장 작성이라 저장하되 문제 표현을 표시');
  const c = db.createCard({ ...draft, title: q.text.slice(0, 40), situation: q.text }, managerId, 'approved', '에스컬레이션', q.id);
  q.status = 'resolved';
  q.managerAnswer = managerAnswer;
  q.cardId = c.id;
  run.wiki({
    op: '점장 답 → 새 카드',
    detail: `[${q.id}] → [${c.id}] ${c.title}`,
    nodes: [questionNode(q), ...withContext(c), personNode(db.person(managerId)!)],
    edges: [...cardEdges(c), edge(q.id, c.id, 'became')],
  });
  await resynthesize(run, c.topic);
  run.end(true, `질문이 사례 [${c.id}]가 되었습니다`);
  return { question: q, card: c };
}

// ---------- 점검·훈련 ----------

export async function lint(): Promise<{ issues: LintIssue[]; runId: string }> {
  const run = new Run('lint', '위키 점검관', '정기 점검');
  await orchestrate(run);
  const { issues, links } = await run.step('linter', () => linter());
  db.get().links = links;
  run.wiki({ op: '위키 점검', detail: `할 일 ${issues.length}건`, nodes: [], edges: links.map((l) => edge(l.source, l.target, l.type)) });
  run.end(true, `할 일 ${issues.length}건`);
  return { issues, runId: run.runId };
}

export async function train(cardId: string, userAnswer: string, personId: string): Promise<TrainingResult> {
  const c = db.card(cardId);
  if (!c) throw new Error('카드를 찾을 수 없습니다');
  const run = new Run('train', db.personLabel(personId), `[${cardId}] 훈련`);
  await orchestrate(run);
  const g = await run.step('trainer', () => trainer(c, userAnswer));
  run.end(true, `${g.score}점`);
  return { ...g, card: c };
}
