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

// 유형별 자리: 매장을 가운데 두고 나머지 유형을 둘레에 차례로 놓는다. 같은 유형끼리 모여 읽는 순서가 생긴다.
const RING: NodeType[] = ['complaint', 'cause', 'standard', 'card', 'prescription', 'question', 'person'];
function anchorOf(type: NodeType, present: NodeType[]): Point {
  const i = present.indexOf(type);
  if (type === 'store' || i < 0) return { x: 0, y: 0 };
  const angle = -Math.PI / 2 + i * 2 * Math.PI / present.length;
  return { x: Math.cos(angle) * 300, y: Math.sin(angle) * 210 };
}

// Spread the nodes deterministically, then shorten real links and separate nearby nodes.
export function layoutNetwork({ nodes, edges }: Graph): Positions {
  if (!nodes.length) return new Map();
  const index = new Map(nodes.map((node, i) => [node.id, i]));
  const links = edges.flatMap(({ source, target }) => {
    const a = index.get(source);
    const b = index.get(target);
    return a === undefined || b === undefined ? [] : [[a, b]];
  });
  const present = RING.filter(type => nodes.some(n => n.type === type));
  const anchors = nodes.map(n => anchorOf(n.type, present));
  const points = nodes.map((_, i) => {
    const angle = i * Math.PI * (3 - Math.sqrt(5));
    const radius = 9 * Math.sqrt(i);
    return { x: anchors[i].x + Math.cos(angle) * radius, y: anchors[i].y + Math.sin(angle) * radius };
  });
  const iterations = nodes.length > 300 ? 60 : 180;
  for (let step = 0; step < iterations; step++) {
    const cooling = 1 - 0.8 * step / iterations;
    const forces = points.map((p, i) => ({ x: (anchors[i].x - p.x) * .03, y: (anchors[i].y - p.y) * .03 }));
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
      const pull = (distance - 90) * .035 / distance;
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
  const fit = Math.min((width - 150) / Math.max(1, w), (height - 90) / Math.max(1, h));
  // 가로가 넓은 화면에서는 가로로 조금 더 편다(이름이 옆으로 길어서)
  const sx = Math.min(fit * 1.5, (width - 150) / Math.max(1, w));
  return new Map([...layout].map(([id, p]) => [id, {
    x: width / 2 + (p.x - left - w / 2) * sx,
    y: height / 2 + (p.y - top - h / 2) * fit,
  }]));
}

// 구조 보기: 지식이 흐르는 순서대로 열을 나눈다. 매장 → 불만 유형 → 원인·처방 → 본사 표준 → 사례 카드 → 질문·기여자.
const COLUMNS: { types: NodeType[]; weight: number }[] = [
  { types: ['store'], weight: 1.15 },
  { types: ['complaint'], weight: 1.1 },
  { types: ['cause', 'prescription'], weight: 1.15 },
  { types: ['standard'], weight: 1.5 },
  { types: ['card'], weight: 1.7 },
  { types: ['question', 'person'], weight: 1.6 },
];
const ROW = 26, GROUP_GAP = 30, TOP = 30;

export interface Layers {
  positions: Positions;
  captions: { type: NodeType; x: number; y: number; text: string }[];
  /** 항목 이름에 쓸 수 있는 너비(px) */
  room: Map<string, number>;
  height: number;
}

export function layoutLayers(nodes: GraphNode[], width: number): Layers {
  const columns = COLUMNS.map(c => ({ ...c, groups: c.types.map(type => ({ type, items: nodes.filter(n => n.type === type) })).filter(g => g.items.length) }))
    .filter(c => c.groups.length);
  const heightOf = (c: typeof columns[number]) => c.groups.reduce((sum, g) => sum + 22 + g.items.length * ROW, 0) + (c.groups.length - 1) * GROUP_GAP;
  const tallest = Math.max(...columns.map(heightOf), 0);
  const total = columns.reduce((sum, c) => sum + c.weight, 0);
  const usable = Math.max(700, width - 44); // 좁은 화면에서는 줄이지 않고 끌어서 본다
  const layers: Layers = { positions: new Map(), captions: [], room: new Map(), height: tallest + TOP + 34 };
  let x = 30;
  for (const column of columns) {
    const span = usable * column.weight / total;
    let y = TOP + (tallest - heightOf(column)) / 2;
    for (const group of column.groups) {
      layers.captions.push({ type: group.type, x: x - 8, y: y + 4, text: `${GROUPS[group.type].name} ${group.items.length}` });
      y += 22;
      group.items.forEach((node, i) => {
        layers.positions.set(node.id, { x, y: y + i * ROW + ROW / 2 });
        layers.room.set(node.id, span - 30);
      });
      y += group.items.length * ROW + GROUP_GAP;
    }
    x += span;
  }
  return layers;
}
