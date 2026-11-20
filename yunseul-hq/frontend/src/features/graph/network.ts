import type { EdgeType, Graph, GraphNode, NodeType } from '@shared/contracts';

export const GROUPS: Record<NodeType, { name: string; color: string }> = {
  store: { name: '매장', color: '#ffd45b' },
  complaint: { name: '불만 유형', color: '#80bee5' },
  cause: { name: '원인', color: '#96d5b4' },
  standard: { name: '본사 표준(가상)', color: '#b6a1e3' },
  card: { name: '사례 카드', color: '#e7ab86' },
  prescription: { name: '처방', color: '#e994a9' },
  question: { name: '질문', color: '#8cdbdf' },
  person: { name: '기여자', color: '#d0c9ad' },
};

export const RELATIONS: Record<EdgeType, [outgoing: string, incoming: string]> = {
  'has-complaint': ['접수된 불만', '불만 접수 매장'],
  'caused-by': ['진단 원인', '연관 불만'],
  'treated-by': ['대응 처방', '처방 대상'],
  delivers: ['반영된 카드', '관련 처방'],
  governs: ['표준 적용 카드', '준거 표준'],
  drifts: ['운영 차이 표준', '표준 차이 발생 매장'],
  cites: ['답변 인용 카드', '카드를 인용한 질문'],
  became: ['질문에서 생성된 카드', '카드 생성 질문'],
  authored: ['작성 카드', '카드 기여자'],
};

export interface Point { x: number; y: number }
export type Positions = Map<string, Point>;

// Spread the nodes deterministically, then shorten real links and separate nearby nodes.
export function layoutNetwork({ nodes, edges }: Graph): Positions {
  if (!nodes.length) return new Map();
  const index = new Map(nodes.map((node, i) => [node.id, i]));
  const links = edges.flatMap(({ source, target }) => {
    const a = index.get(source);
    const b = index.get(target);
    return a === undefined || b === undefined ? [] : [[a, b]];
  });
  const points = nodes.map((_, i) => {
    const angle = i * Math.PI * (3 - Math.sqrt(5));
    const radius = 28 * Math.sqrt(i);
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
  });
  const iterations = nodes.length > 300 ? 60 : 180;
  for (let step = 0; step < iterations; step++) {
    const cooling = 1 - 0.8 * step / iterations;
    const forces = points.map(p => ({ x: -p.x * .003, y: -p.y * .003 }));
    const bins = new Map<string, number[]>();
    for (const [i, p] of points.entries()) {
      const gx = Math.floor(p.x / 100);
      const gy = Math.floor(p.y / 100);
      for (let x = gx - 1; x <= gx + 1; x++) {
        for (let y = gy - 1; y <= gy + 1; y++) {
          for (const j of bins.get(`${x},${y}`) ?? []) {
            const dx = p.x - points[j].x;
            const dy = p.y - points[j].y;
            const distance = Math.max(1, Math.hypot(dx, dy));
            if (distance > 100) continue;
            const repel = (100 - distance) * .095 / distance;
            forces[i].x += dx * repel;
            forces[i].y += dy * repel;
            forces[j].x -= dx * repel;
            forces[j].y -= dy * repel;
          }
        }
      }
      const bin = `${gx},${gy}`;
      if (!bins.has(bin)) bins.set(bin, []);
      bins.get(bin)!.push(i);
    }
    for (const [a, b] of links) {
      const dx = points[b].x - points[a].x;
      const dy = points[b].y - points[a].y;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const pull = (distance - 49) * .14 / distance;
      forces[a].x += dx * pull;
      forces[a].y += dy * pull;
      forces[b].x -= dx * pull;
      forces[b].y -= dy * pull;
    }
    points.forEach((p, i) => {
      p.x += forces[i].x * cooling;
      p.y += forces[i].y * cooling;
    });
  }
  return new Map(nodes.map((node, i) => [node.id, points[i]]));
}

export function layoutNeighbors(selected: GraphNode, nodes: GraphNode[], width: number, height: number): Positions {
  const layout = new Map([[selected.id, { x: width / 2, y: height / 2 }]]);
  const others = nodes.filter(n => n.id !== selected.id);
  others.forEach((node, i) => {
    const angle = -Math.PI / 2 + i * 2 * Math.PI / others.length;
    layout.set(node.id, {
      x: width / 2 + Math.cos(angle) * width * .34,
      y: height / 2 + Math.sin(angle) * height * .34,
    });
  });
  return layout;
}

export function fitNetwork(layout: Positions, width: number, height: number): Positions {
  if (!layout.size) return new Map();
  const points = [...layout.values()];
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const left = Math.min(...xs), top = Math.min(...ys);
  const w = Math.max(...xs) - left, h = Math.max(...ys) - top;
  const scale = Math.min((width - 60) / Math.max(1, w), (height - 64) / Math.max(1, h));
  return new Map([...layout].map(([id, p]) => [id, {
    x: width / 2 + (p.x - left - w / 2) * scale,
    y: height / 2 + (p.y - top - h / 2) * scale,
  }]));
}
