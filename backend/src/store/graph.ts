// 매장 위키를 온톨로지 그래프로 본다: 토픽·사례 카드·사람·질문·출처(공식규정/현장노하우)와 그 관계.
import type { Card, Graph, GraphEdge, GraphNode, Person, Question } from '@shared/contracts';
import * as db from './db.js';

export const cardNode = (c: Card): GraphNode => ({
  id: c.id,
  type: 'card',
  label: c.title.length > 18 ? `${c.title.slice(0, 18)}…` : c.title,
  sub: c.status === 'approved' ? c.source : c.status === 'pending' ? '승인 대기' : c.status,
  weight: c.uses,
});
export const personNode = (p: Person): GraphNode => ({ id: p.id, type: 'person', label: p.name, sub: `${p.role} ${p.tenure}` });
export const questionNode = (q: Question): GraphNode => ({
  id: q.id,
  type: 'question',
  label: q.text.length > 16 ? `${q.text.slice(0, 16)}…` : q.text,
  sub: q.status === 'answered' ? '위키가 답함' : q.status === 'escalated' ? '점장 대기' : '점장 답 → 카드',
});
export const topicNode = (t: string): GraphNode => ({ id: `T:${t}`, type: 'topic', label: t });
export const sourceNode = (s: string): GraphNode => ({ id: `S:${s}`, type: 'source', label: s });

export const edge = (source: string, target: string, type: GraphEdge['type']): GraphEdge => ({ id: `${type}:${source}>${target}`, source, target, type });

export function cardEdges(c: Card): GraphEdge[] {
  return [edge(c.id, `T:${c.topic}`, 'belongs'), edge(c.authorId, c.id, 'authored'), edge(`S:${c.source}`, c.id, 'governs')];
}

export function questionEdges(q: Question): GraphEdge[] {
  const out = [edge(q.askerId, q.id, 'asked'), ...q.cited.map((id) => edge(q.id, id, 'cites'))];
  if (q.cardId) out.push(edge(q.id, q.cardId, 'became'));
  return out;
}

export function buildGraph(): Graph {
  const d = db.get();
  const cards = d.cards.filter((c) => c.status === 'approved' || c.status === 'pending');
  const ids = new Set<string>();
  const nodes: GraphNode[] = [];
  const push = (n: GraphNode) => {
    if (!ids.has(n.id)) {
      ids.add(n.id);
      nodes.push(n);
    }
  };
  // 카드가 하나도 없는 토픽은 그리지 않는다(빈 노드가 떠 있으면 읽기 어렵다)
  d.topics.filter((t) => cards.some((c) => c.topic === t)).forEach((t) => push(topicNode(t)));
  ['공식규정', '현장노하우'].forEach((s) => push(sourceNode(s)));
  d.people.forEach((p) => push(personNode(p)));
  cards.forEach((c) => push(cardNode(c)));
  d.questions.forEach((q) => push(questionNode(q)));
  const edges = [...cards.flatMap(cardEdges), ...d.questions.flatMap(questionEdges), ...d.links.map((l) => edge(l.source, l.target, l.type))].filter(
    (e) => ids.has(e.source) && ids.has(e.target),
  );
  return { nodes, edges: [...new Map(edges.map((e) => [e.id, e])).values()] };
}
