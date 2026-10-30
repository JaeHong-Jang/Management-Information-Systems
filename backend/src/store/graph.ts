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

// 질문한 사람은 개인이 아니라 역할 묶음으로만 그린다(질문자 개인 통계를 만들지 않는다는 원칙).
// 크레딧을 끈 카드는 '이름 비공개' 노드에 붙인다.
export const askerNodeId = (q: Question) => `R:${db.person(q.askerId)?.role ?? '직원'}`;
export const roleNode = (role: string): GraphNode => ({ id: `R:${role}`, type: 'person', label: `${role}들`, sub: '질문은 개인별로 세지 않음' });
export const ANON = 'R:비공개';
export const anonNode = (): GraphNode => ({ id: ANON, type: 'person', label: '이름 비공개', sub: '크레딧을 끈 기여' });
export const authorNodeId = (c: Card) => (c.credit === false ? ANON : c.authorId);
export const sourceNode = (s: string): GraphNode => ({ id: `S:${s}`, type: 'source', label: s });

export const edge = (source: string, target: string, type: GraphEdge['type']): GraphEdge => ({ id: `${type}:${source}>${target}`, source, target, type });

export function cardEdges(c: Card): GraphEdge[] {
  return [edge(c.id, `T:${c.topic}`, 'belongs'), edge(authorNodeId(c), c.id, 'authored'), edge(`S:${c.source}`, c.id, 'governs')];
}

export function questionEdges(q: Question): GraphEdge[] {
  const out = [edge(askerNodeId(q), q.id, 'asked'), ...q.cited.map((id) => edge(q.id, id, 'cites'))];
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
  // 사람 노드는 카드를 남긴(크레딧을 켠) 사람만. 질문한 사람은 역할 묶음으로
  d.people.filter((p) => cards.some((c) => c.authorId === p.id && c.credit !== false)).forEach((p) => push(personNode(p)));
  if (cards.some((c) => c.credit === false)) push(anonNode());
  [...new Set(d.questions.map(askerNodeId))].forEach((id) => push(roleNode(id.slice(2))));
  cards.forEach((c) => push(cardNode(c)));
  d.questions.forEach((q) => push(questionNode(q)));
  const edges = [...cards.flatMap(cardEdges), ...d.questions.flatMap(questionEdges), ...d.links.map((l) => edge(l.source, l.target, l.type))].filter(
    (e) => ids.has(e.source) && ids.has(e.target),
  );
  return { nodes, edges: [...new Map(edges.map((e) => [e.id, e])).values()] };
}
