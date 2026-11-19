// 지식 그래프: 매장 → 불만 → 원인 → 처방 → 카드, 본사 표준 → 카드, 매장 → 표준(규칙 차이), 질문 → 카드.
import type { Card, CauseClass, ComplaintType, Graph, GraphEdge, GraphNode, HqStandard, Person, Prescription, Question, Store } from '@shared/contracts';
import { allStats, latestDiagnosis } from '../hq/service.js';
import * as db from './db.js';

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s);

export const storeNode = (s: Store, risk?: number): GraphNode => ({ id: s.id, type: 'store', label: s.name, sub: risk === undefined ? s.area : `위험 ${risk}`, weight: risk });
export const complaintNode = (t: ComplaintType, n?: number): GraphNode => ({ id: `K:${t}`, type: 'complaint', label: t, ...(n !== undefined ? { weight: n } : {}) });
export const causeNode = (c: CauseClass): GraphNode => ({ id: `CA:${c}`, type: 'cause', label: c });
export const standardNode = (s: HqStandard): GraphNode => ({ id: s.id, type: 'standard', label: clip(s.title, 18), sub: '가상 표준' });
export const cardNode = (c: Card): GraphNode => ({
  id: c.id,
  type: 'card',
  label: clip(c.title, 18),
  sub: c.status === 'approved' ? c.source : c.status === 'pending' ? '승인 대기' : c.status,
  weight: c.uses,
});
export const prescriptionNode = (p: Prescription): GraphNode => ({ id: p.id, type: 'prescription', label: clip(p.title, 18), sub: `${p.kind} · ${p.status}` });
export const personNode = (p: Person): GraphNode => ({ id: p.id, type: 'person', label: p.name, sub: `${p.role} ${p.tenure}` });
export const ANON = 'R:비공개';
export const anonNode = (): GraphNode => ({ id: ANON, type: 'person', label: '이름 비공개', sub: '크레딧을 끈 기여' });
export const questionNode = (q: Question): GraphNode => ({
  id: q.id,
  type: 'question',
  label: clip(q.text, 16),
  sub: q.status === 'answered' ? '위키가 답함' : q.status === 'escalated' ? '점장 대기' : '점장 답 → 카드',
});

export const edge = (source: string, target: string, type: GraphEdge['type']): GraphEdge => ({ id: `${type}:${source}>${target}`, source, target, type });
export const authorNodeId = (c: Card) => (c.credit === false ? ANON : c.authorId);

export function cardEdges(c: Card): GraphEdge[] {
  const out = [edge(authorNodeId(c), c.id, 'authored')];
  if (c.standardId) out.push(edge(c.standardId, c.id, 'governs'));
  if (c.prescriptionId) out.push(edge(c.prescriptionId, c.id, 'delivers'));
  return out;
}

export function questionEdges(q: Question): GraphEdge[] {
  const out = q.cited.map((id) => edge(q.id, id, 'cites'));
  if (q.cardId) out.push(edge(q.id, q.cardId, 'became'));
  return out;
}

export function prescriptionEdges(p: Prescription): GraphEdge[] {
  const diag = latestDiagnosis(p.storeId);
  const complaints = diag?.findings.filter((f) => p.findingIds.includes(f.id)).map((f) => f.complaint) ?? [];
  return [...complaints.map((t) => edge(`K:${t}`, p.id, 'treated-by')), ...p.cardIds.map((id) => edge(p.id, id, 'delivers'))];
}

/** storeId가 있으면 그 매장의 그래프, 없으면 위험 상위 10개 매장의 본사 그래프 */
export function buildGraph(storeId?: string): Graph {
  const d = db.get();
  const { scores } = allStats();
  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  const push = (n: GraphNode) => {
    if (!nodes.has(n.id)) nodes.set(n.id, n);
  };
  const stores = storeId
    ? d.stores.filter((s) => s.id === storeId)
    : [...d.stores].filter((s) => scores.get(s.id)!.rank !== null).sort((a, b) => scores.get(a.id)!.rank! - scores.get(b.id)!.rank!).slice(0, 10);

  for (const s of stores) {
    push(storeNode(s, scores.get(s.id)!.risk));
    for (const t of scores.get(s.id)!.topComplaints) {
      push(complaintNode(t.type));
      edges.push(edge(s.id, `K:${t.type}`, 'has-complaint'));
    }
    const diag = latestDiagnosis(s.id);
    for (const f of diag?.findings ?? []) {
      push(complaintNode(f.complaint));
      push(causeNode(f.cause));
      edges.push(edge(s.id, `K:${f.complaint}`, 'has-complaint'), edge(`K:${f.complaint}`, `CA:${f.cause}`, 'caused-by'));
    }
    for (const dr of d.drifts.filter((x) => x.storeId === s.id && x.status !== 'fixed')) {
      const st = db.standard(dr.standardId);
      if (!st) continue;
      push(standardNode(st));
      edges.push(edge(s.id, st.id, 'drifts'));
    }
    for (const p of d.prescriptions.filter((x) => x.storeId === s.id && x.status !== 'rejected')) {
      push(prescriptionNode(p));
      edges.push(...prescriptionEdges(p));
    }
  }

  if (storeId) {
    const cards = db.storeCards(storeId).filter((c) => c.status === 'approved' || c.status === 'pending');
    for (const c of cards) {
      push(cardNode(c));
      const st = c.standardId ? db.standard(c.standardId) : undefined;
      if (st) push(standardNode(st));
      const author = db.person(c.authorId);
      if (c.credit === false) push(anonNode());
      else if (author) push(personNode(author));
      edges.push(...cardEdges(c));
    }
    for (const q of d.questions.filter((x) => x.storeId === storeId)) {
      push(questionNode(q));
      edges.push(...questionEdges(q));
    }
  }
  const valid = edges.filter((e) => nodes.has(e.source) && nodes.has(e.target));
  return { nodes: [...nodes.values()], edges: [...new Map(valid.map((e) => [e.id, e])).values()] };
}
