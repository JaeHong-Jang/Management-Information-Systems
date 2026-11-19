// 본사 흐름: 리뷰 관측 · 매장 원인 진단 · 처방 초안 · 표준 개정 제안 · 처방 효과(가상 리뷰).
// 진단·처방·승격은 runId를 바로 돌려주고 뒤에서 돈다(launch). 결과는 저장되고 GET 상세로 보인다.
import type { ComplaintType, Diagnosis, Finding, Outcome, Prescription, RuleDrift, StandardProposal, StepStatus, Via } from '@shared/contracts';
import { config } from '../harness/config.js';
import { launch, longPace, Run, type StepOut } from '../harness/runner.js';
import { complaintTagger, reviewCollector, varianceScorer } from '../agents/monitor.js';
import { causeAnalyst, driftDetector } from '../agents/diagnose.js';
import { briefingDraft, playbookWriter, svPlanner, type PrescriptionDraft } from '../agents/prescribe.js';
import { promoter } from '../agents/keeper.js';
import { dropForbiddenLines, prescriptionChecker, quoteChecker, wordingGuard } from '../agents/verify.js';
import { privacyGuard } from '../agents/capture.js';
import { proposalCandidates } from '../rules/prescribe.js';
import { round2 } from '../rules/score.js';
import { allStats, latestDiagnosis, statsOf, storeOutcome } from '../hq/service.js';
import { maskPii } from '../tools/policies.js';
import * as db from '../store/db.js';
import { causeNode, complaintNode, edge, prescriptionEdges, prescriptionNode, standardNode, storeNode } from '../store/graph.js';
import { orchestrate, requireStore } from './index.js';

const httpError = (status: number, message: string) => Object.assign(new Error(message), { status });

/** 실행 기록이 있으면 단계로, 없으면(시작 때 미리 계산) 조용히 돌린다 */
type Exec = <T>(agentId: string, fn: () => StepOut<T> | Promise<StepOut<T>>) => Promise<T>;
const execOf = (run: Run | null): Exec => (run ? (id, fn) => run.step(id, fn) : async (_id, fn) => (await fn()).out);

/** 연속 번호를 한 번에 여러 개 */
function idMaker(prefix: string, list: { id: string }[]) {
  let n = Number(db.nextId(prefix, list).slice(prefix.length));
  return () => `${prefix}${String(n++).padStart(3, '0')}`;
}

let diagSeq = 0;

// ---------- 리뷰 관측 ----------

/** 전 매장 리뷰를 규칙으로 다시 태깅하고 점수를 계산한다(시작·초기화 때) */
export async function ingestAll() {
  const d = db.get();
  const run = new Run('ingest', null, '관측팀', `전 매장 리뷰 ${d.reviews.length}건`, 0);
  await orchestrate(run, '시작 시 전 매장 채점');
  await run.step('review-collector', () => reviewCollector(d.reviews, '시드'));
  await run.step('privacy-guard', () => maskReviews(d.reviews));
  d.reviews = await run.step('complaint-tagger', () => complaintTagger(d.reviews, { rulesOnly: true }));
  db.touchReviews();
  await run.step('variance-scorer', () => varianceScorer(d.stores));
  run.end(true, `매장 ${d.stores.length}곳 채점`);
}

function maskReviews(reviews: { text: string }[]): StepOut<number> {
  let masked = 0;
  for (const r of reviews) {
    const m = maskPii(r.text);
    if (m.masked) {
      r.text = m.text;
      masked += m.masked;
    }
  }
  return { out: masked, summary: masked ? `리뷰 속 전화번호·카드번호·고객 이름 ${masked}곳을 가렸어요` : '가릴 개인정보 없음(시드는 이미 익명화됨)' };
}

/** 처방 이후 가상 리뷰를 넣고 효과(처방 전·후)를 계산한다 */
export async function simulate(storeId: string): Promise<Outcome> {
  const store = requireStore(storeId);
  const d = db.get();
  if (!d.simulated.includes(storeId)) {
    const pool = d.virtualPool.filter((r) => r.storeId === storeId);
    if (!pool.length) throw httpError(400, `${store.name}에는 처방 이후 가상 리뷰가 없어요`);
    const run = new Run('ingest', storeId, '관측팀', `${store.name} 처방 이후 가상 리뷰 ${pool.length}건`);
    await orchestrate(run, '가상 리뷰로 처방 효과 보기');
    await run.step('review-collector', () => reviewCollector(pool, '처방 이후(가상)'));
    await run.step('privacy-guard', () => maskReviews(pool));
    const tagged = await run.step('complaint-tagger', () => complaintTagger(pool, { storeName: store.name }));
    d.reviews.push(...tagged.map((r) => ({ ...r, virtual: true as const })));
    d.virtualPool = d.virtualPool.filter((r) => r.storeId !== storeId);
    d.simulated.push(storeId);
    db.touchReviews();
    await run.step('variance-scorer', () => ({ ...varianceScorer(d.stores), summary: '가상 리뷰는 점수·순위에 넣지 않고 처방 전·후 비교에만 써요' }));
    const o = storeOutcome(storeId)!;
    run.end(true, `처방 전 평균 ${o.before.mean ?? '-'} → 처방 후(가상) ${o.after?.mean ?? '-'}`);
  }
  return storeOutcome(storeId)!;
}

// ---------- 매장 원인 진단 ----------

function brandRates(): Partial<Record<ComplaintType, number>> {
  const d = db.get();
  const { stats } = allStats();
  let low = 0;
  const by: Partial<Record<ComplaintType, number>> = {};
  for (const s of d.stores) {
    if (s.excluded) continue;
    const t = stats.get(s.id)!.tally;
    low += t.lowTotal;
    for (const [k, n] of Object.entries(t.lowByType) as [ComplaintType, number][]) by[k] = (by[k] ?? 0) + n;
  }
  return Object.fromEntries(Object.entries(by).map(([k, n]) => [k, low ? round2(n / low) : 0]));
}

async function computeDiagnosis(storeId: string, run: Run | null, rulesOnly: boolean): Promise<Diagnosis> {
  const exec = execOf(run);
  const d = db.get();
  const store = requireStore(storeId);
  const reviews = db.reviewsOf(storeId);
  const id = `D-${storeId}-${(++diagSeq).toString(36)}${Date.now().toString(36).slice(-4)}`;
  let via: Via = 'rules';
  const analysed = await exec('cause-analyst', async () => {
    const r = await causeAnalyst({ brand: d.brand.name, store, reviews, stats: statsOf(storeId), standards: d.standards, brandRates: brandRates(), diagnosisId: id }, rulesOnly);
    via = r.via ?? 'rules';
    return r;
  });
  const nextDrift = idMaker('RD', d.drifts);
  const drifted = await exec('drift-detector', () => driftDetector(store, reviews, d.standards, d.drifts, analysed.findings, () => nextDrift()));
  const checked = await exec('quote-checker', () => quoteChecker(drifted.findings, storeId, db.review));
  const words = await exec('wording-guard', () => wordingGuard([analysed.summary, ...checked.findings.map((f) => f.explanation)].join('\n')));
  run?.gate('diagnose-gate', [...checked.problems, ...words], config.gates.find((g) => g.id === 'diagnose-gate')!.onFail);
  const findings: Finding[] = checked.findings.map((f) => (words.length ? { ...f, explanation: dropForbiddenLines(f.explanation) || '(표현 검증에서 설명을 뺐어요)' } : f));
  const diag: Diagnosis = { id, storeId, created: db.today(), findings, summary: words.length ? dropForbiddenLines(analysed.summary) : analysed.summary, via, runId: run?.runId ?? 'warmup' };
  d.diagnoses = [...d.diagnoses.filter((x) => x.storeId !== storeId), diag];
  for (const dr of drifted.drifts) {
    const i = d.drifts.findIndex((x) => x.id === dr.id);
    if (i >= 0) d.drifts[i] = dr;
    else d.drifts.push(dr);
  }
  return diag;
}

export function diagnose(storeId: string, opts: { rulesOnly?: boolean } = {}): { runId: string; done: Promise<Diagnosis> } {
  const store = requireStore(storeId);
  const run = new Run('diagnose', storeId, '본사 SV', `${store.name} 원인 진단`, longPace());
  return launch(run, async () => {
    await orchestrate(run);
    const diag = await computeDiagnosis(storeId, run, Boolean(opts.rulesOnly));
    const st = new Set(db.get().drifts.filter((x) => x.storeId === storeId && x.status === 'open').map((x) => x.standardId));
    run.wiki({
      op: '원인 진단',
      detail: `${store.name}: ${diag.findings.map((f) => `${f.complaint}→${f.cause}`).join(', ') || '불만 없음'}`,
      nodes: [storeNode(store, statsOf(storeId).score.risk), ...diag.findings.flatMap((f) => [complaintNode(f.complaint, f.count), causeNode(f.cause)]), ...[...st].flatMap((sid) => (db.standard(sid) ? [standardNode(db.standard(sid)!)] : []))],
      edges: [...diag.findings.flatMap((f) => [edge(storeId, `K:${f.complaint}`, 'has-complaint'), edge(`K:${f.complaint}`, `CA:${f.cause}`, 'caused-by')]), ...[...st].map((sid) => edge(storeId, sid, 'drifts'))],
    });
    run.end(true, `진단 결과 ${diag.findings.length}개 저장`);
    return diag;
  });
}

// ---------- 처방 초안 ----------

export function prescribe(storeId: string, opts: { rulesOnly?: boolean } = {}): { runId: string; done: Promise<Prescription[]> } {
  const store = requireStore(storeId);
  const run = new Run('prescribe', storeId, '본사 SV', `${store.name} 처방 초안`, longPace());
  return launch(run, async () => {
    const d = db.get();
    let diag = latestDiagnosis(storeId);
    await orchestrate(run, diag ? `진단 ${diag.id} 기준` : '진단이 없어 규칙 진단을 먼저 만들었어요');
    diag ??= await computeDiagnosis(storeId, null, true);
    // 아직 보내지 않은 지난 초안과 그 카드는 새 초안으로 바꾼다
    const stale = new Set(d.prescriptions.filter((p) => p.storeId === storeId && p.status === 'draft').map((p) => p.id));
    d.prescriptions = d.prescriptions.filter((p) => !stale.has(p.id));
    d.cards = d.cards.filter((c) => !(c.prescriptionId && stale.has(c.prescriptionId) && c.status === 'pending'));

    const findings = diag.findings;
    const storeDrifts = d.drifts.filter((x) => x.storeId === storeId);
    const ctx = { brand: d.brand.name, store };
    const cardDrafts = await run.step('playbook-writer', () => playbookWriter(ctx, findings, d.standards, opts.rulesOnly));
    const svDrafts = await run.step('sv-planner', () => {
      const r = svPlanner(findings, storeDrifts, d.standards);
      // 같은 불만이 위험 상위 20개 매장 중 5곳 이상에서 반복되면 본사에 표준 개정 제안 처방을 남긴다
      const { scores } = allStats();
      const common = proposalCandidates(d.stores, scores).filter((c) => c.storeIds.includes(storeId) || findings.some((f) => f.complaint === c.complaint));
      const extra: PrescriptionDraft[] = common.map((c) => ({
        kind: '표준 개정 제안',
        title: `표준 개정 제안: ${c.complaint}`,
        body: `'${c.complaint}'이 위험 상위 20개 매장 중 ${c.storeIds.length}곳의 상위 불만이에요. 본사 표준 개정 제안(승격 흐름)으로 올려 주세요.`,
        findingIds: findings.filter((f) => f.complaint === c.complaint).map((f) => f.id),
        checklist: [],
      }));
      return { ...r, out: [...r.out, ...extra], status: (r.out.length + extra.length ? 'ok' : 'skipped') as StepStatus, summary: extra.length ? `${r.summary} · 표준 개정 제안 ${extra.length}건` : r.summary };
    });
    const brief = await run.step('briefing-writer', () => briefingDraft(cardDrafts, findings, d.standards));

    // 처방과 카드(승인 대기, 발송 전에는 매장에 보이지 않음)를 만든다
    const nextRx = idMaker('RX', d.prescriptions);
    const via = (agent: string) => run.steps.find((s) => s.agentId === agent)?.via ?? 'rules';
    const created: Prescription[] = [];
    const base = { storeId, status: 'draft' as const, created: db.today() };
    const newCardIds: string[] = [];
    for (const cd of cardDrafts) {
      const id = nextRx();
      const c = db.createCard(cd.fields, db.svPerson(), 'pending', '처방', { storeId, prescriptionId: id, standardId: cd.standardId, complaintTypes: [cd.complaint] });
      newCardIds.push(c.id);
      const f = findings.find((x) => x.id === cd.findingId);
      created.push({
        ...base, id, kind: '사례 카드', title: `사례 카드: ${c.title}`,
        body: [f?.explanation ?? '', `카드 [${c.id}] ${c.title}`, c.customerNotice ? `손님 안내: "${c.customerNotice}"` : '', ...(f?.quotes.slice(0, 2).map((q) => `리뷰: "${q.text}" [${q.reviewId}]`) ?? [])].filter(Boolean).join('\n'),
        findingIds: [cd.findingId], cardIds: [c.id], checklist: [], via: via('playbook-writer'),
      });
    }
    for (const sv of svDrafts) created.push({ ...base, id: nextRx(), kind: sv.kind, title: sv.title, body: sv.body, findingIds: sv.findingIds, cardIds: [], checklist: sv.checklist, via: 'rules' });
    if (brief) {
      const complaints = new Set(findings.filter((f) => brief.findingIds.includes(f.id)).map((f) => f.complaint));
      const existing = db.approvedCards(storeId).filter((c) => c.customerNotice && c.complaintTypes?.some((t) => complaints.has(t))).map((c) => c.id);
      created.push({ ...base, id: nextRx(), kind: brief.kind, title: brief.title, body: brief.body, findingIds: brief.findingIds, cardIds: [...newCardIds, ...existing], checklist: [], via: via('briefing-writer') });
    }

    const allCards = new Set(d.cards.map((c) => c.id));
    const checked = await run.step('citation-checker', () => prescriptionChecker(created, new Set(findings.map((f) => f.id)), allCards, new Set(db.reviewsOf(storeId).map((r) => r.id))));
    const words = await run.step('wording-guard', () =>
      wordingGuard([...checked.prescriptions.map((p) => `${p.title}\n${p.body}\n${p.checklist.join('\n')}`), ...newCardIds.map((id) => { const c = db.card(id)!; return [c.title, c.reason, ...c.actions, c.avoid, c.customerNotice ?? ''].join('\n'); })].join('\n')),
    );
    run.gate('prescribe-gate', [...checked.problems, ...words], config.gates.find((g) => g.id === 'prescribe-gate')!.onFail);
    d.prescriptions.push(...checked.prescriptions);
    run.wiki({
      op: '처방 초안',
      detail: `${store.name}: ${checked.prescriptions.map((p) => `${p.id} ${p.kind}`).join(', ') || '처방 없음'}`,
      nodes: [storeNode(store), ...findings.map((f) => complaintNode(f.complaint, f.count)), ...checked.prescriptions.map(prescriptionNode)],
      edges: checked.prescriptions.flatMap(prescriptionEdges),
    });
    run.end(true, `처방 초안 ${checked.prescriptions.length}건(사례 카드 ${cardDrafts.length}, SV 과제 ${svDrafts.filter((x) => x.kind === 'SV 방문 과제').length})`);
    return checked.prescriptions;
  });
}

export function prescriptionAction(id: string, action: 'send' | 'done' | 'reject'): Prescription {
  const p = db.prescription(id);
  if (!p) throw httpError(404, '처방을 찾을 수 없어요');
  const allowed = { send: ['draft'], done: ['draft', 'sent'], reject: ['draft', 'sent'] }[action];
  if (!allowed.includes(p.status)) throw httpError(400, `${p.status} 상태의 처방은 ${action}할 수 없어요`);
  if (action === 'send') {
    p.status = 'sent';
    p.sentAt = db.today();
  } else if (action === 'done') {
    p.status = 'done';
    p.doneAt = db.today();
  } else {
    p.status = 'rejected';
    for (const c of db.get().cards) if (c.prescriptionId === p.id && c.status === 'pending') c.status = 'rejected';
  }
  db.addLog(`처방 ${{ send: '발송', done: '완료', reject: '반려' }[action]}`, `[${p.id}] ${p.title}`, p.storeId);
  db.save();
  return p;
}

// ---------- 표준 개정 제안 ----------

export function promote(minStores = 5): { runId: string; done: Promise<StandardProposal[]> } {
  const run = new Run('promote', null, '본사', '위험 상위 매장 공통 불만 → 표준 개정 제안', longPace());
  return launch(run, async () => {
    const d = db.get();
    await orchestrate(run);
    const drafts = await run.step('promoter', () => promoter(d.stores, allStats().scores, d.standards, d.proposals, minStores));
    const words = await run.step('wording-guard', () => wordingGuard(drafts.map((p) => `${p.title}\n${p.change}\n${p.why}`).join('\n')));
    const next = idMaker('SP', d.proposals);
    const created: StandardProposal[] = drafts.map((p) => ({ ...p, id: next(), created: db.today() }));
    if (!words.length) d.proposals.push(...created);
    run.wiki({ op: '표준 개정 제안', detail: created.length ? created.map((p) => `${p.id} ${p.title}`).join(', ') : '새 제안 없음', nodes: created.flatMap((p) => (p.standardId && db.standard(p.standardId) ? [standardNode(db.standard(p.standardId)!)] : [])), edges: [] });
    run.end(true, words.length ? `금지 표현 ${words.length}건으로 제안을 저장하지 않았어요` : `개정 제안 ${created.length}건`);
    return words.length ? [] : created;
  });
}

export function proposalAction(id: string, action: 'approve' | 'reject'): StandardProposal {
  const p = db.get().proposals.find((x) => x.id === id);
  if (!p) throw httpError(404, '개정 제안을 찾을 수 없어요');
  if (p.status !== 'pending') throw httpError(400, '이미 처리한 제안이에요');
  p.status = action === 'approve' ? 'approved' : 'rejected';
  db.addLog(`개정 제안 ${action === 'approve' ? '승인' : '반려'}`, `[${p.id}] ${p.title}`, null);
  db.save();
  return p;
}

export function driftAction(id: string, action: 'accept' | 'fix'): RuleDrift {
  const dr = db.get().drifts.find((x) => x.id === id);
  if (!dr) throw httpError(404, '규칙 차이 기록을 찾을 수 없어요');
  dr.status = action === 'accept' ? 'accepted' : 'fixed';
  db.addLog(action === 'accept' ? '규칙 차이 예외 인정' : '규칙 차이 수정 확인', `[${dr.id}] ${dr.observed}`, dr.storeId);
  db.save();
  return dr;
}

// ---------- 시작 준비 ----------

export const WARM_TOP = 10;

/** 시드를 새로 불러왔을 때: 전 매장 채점 + 위험 상위 10곳과 타깃 매장을 규칙으로 미리 진단(처방은 만들지 않는다) */
export async function warmup() {
  await ingestAll();
  const d = db.get();
  const { scores } = allStats();
  const top = d.stores.filter((s) => scores.get(s.id)!.rank !== null).sort((a, b) => scores.get(a.id)!.rank! - scores.get(b.id)!.rank!).slice(0, WARM_TOP);
  const target = db.targetStore();
  const ids = [...new Set([...top.map((s) => s.id), ...(target ? [target.id] : [])])];
  for (const id of ids) await computeDiagnosis(id, null, true);
  db.addLog('시작 진단', `위험 상위 ${top.length}곳과 타깃 매장을 규칙으로 미리 진단`, null);
  db.save();
  return ids;
}
