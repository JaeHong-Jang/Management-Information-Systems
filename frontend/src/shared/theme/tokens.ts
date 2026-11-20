// 그래프·에이전트 팀·차트 색. tailwind.config.js와 같은 값이고 규칙은 docs/DESIGN.md.
// 밝은 범주색 4개(남보라·복숭아·청록·라벤더)는 validate_palette.js --pairs all 통과(색약 ΔE 10.1 이상, 흰 배경 3:1 이상).
// 밤 그래프 색(NIGHT_NODE의 card·question·person, NIGHT_OUTCOME)도 밤 바탕 위에서 같은 검사를 통과했다. 값을 바꾸지 않는다.
// 노드 종류는 색과 모양을 함께 달리한다(색만으로 구분하지 않기).
import type { EdgeType, NodeType } from '@shared/contracts';

export const PALETTE = {
  blue: { mark: '#4F5BD5', text: '#3E47B8', weak: '#EEEFFC' },
  orange: { mark: '#E0703F', text: '#B15326', weak: '#FFF1EA' },
  green: { mark: '#14948C', text: '#077A71', weak: '#E4F5F3' },
  purple: { mark: '#9454D4', text: '#7436B8', weak: '#F3ECFD' },
  grey: { mark: '#3E3D5C', text: '#2A2E50', weak: '#F5F3F8' },
  red: { mark: '#F04452', text: '#C9252D', weak: '#FEF0F0' },
};

/** 밝은 면(범례·필터·상세 패널)에 쓰는 노드 색 */
export const NODE_STYLE: Record<NodeType, { color: string; weak: string; shape: string; label: string }> = {
  topic: { color: PALETTE.blue.mark, weak: PALETTE.blue.weak, shape: 'ellipse', label: '토픽' },
  card: { color: PALETTE.green.mark, weak: PALETTE.green.weak, shape: 'round-rectangle', label: '사례 카드' },
  person: { color: PALETTE.purple.mark, weak: PALETTE.purple.weak, shape: 'ellipse', label: '사람' },
  question: { color: PALETTE.orange.mark, weak: PALETTE.orange.weak, shape: 'diamond', label: '질문' },
  source: { color: '#2A2E50', weak: PALETTE.grey.weak, shape: 'round-hexagon', label: '출처' },
  item: { color: '#625B73', weak: PALETTE.grey.weak, shape: 'barrel', label: '재고 품목' },
};

/** 밤 그래프 캔버스 전용 노드 색. 토픽은 달빛 알약(안쪽 어두운 글자), 나머지는 밤 바탕에서 검증한 값 */
// border: 겹친 노드끼리 떨어져 보이도록 밤 바탕색 테두리. 출처·품목만 채움이 어두워 밝은 테두리
export const NIGHT_NODE: Record<NodeType, { fill: string; border: string; text?: string }> = {
  topic: { fill: '#ECE6FA', border: '#B1A4CA', text: '#131232' },
  card: { fill: '#2DB5A8', border: '#0D1633' },
  question: { fill: '#EE8A5E', border: '#0D1633' },
  person: { fill: '#A98BFF', border: '#0D1633' },
  source: { fill: '#2A2E50', border: '#8E8AB7' },
  item: { fill: '#1F2C4D', border: '#6B78A6' },
};

/** 밤 그래프의 바탕·글자색 */
export const NIGHT = { base: '#0D1633', ink: '#F5F1FC', moon: '#B1A4CA', glow: '#EDE7FF', line: '#8E8AB7' };

/** 밝은 면 범례에 쓰는 관계선 색 */
export const EDGE_STYLE: Record<EdgeType, { color: string; dashed?: boolean; label: string }> = {
  belongs: { color: '#CFCCDD', label: '토픽에 속함' },
  authored: { color: '#CFCCDD', label: '남김' },
  asked: { color: '#CFCCDD', label: '물음' },
  cites: { color: PALETTE.blue.mark, label: '근거로 씀' },
  became: { color: PALETTE.green.mark, label: '점장 답 → 카드' },
  governs: { color: '#CFCCDD', dashed: true, label: '출처' },
  conflicts: { color: PALETTE.red.mark, dashed: true, label: '상충' },
  duplicates: { color: '#8B849A', dashed: true, label: '중복' },
  stocks: { color: '#CFCCDD', label: '재고 판단 근거' },
};

/** 밤 그래프의 관계선(별자리 선). 굵기는 화면 px. 뜻 없는 구조선은 달빛색 하나로 가늘고 옅게, 뜻 있는 선만 색·화살표·점선을 준다 */
const MOONLINE = { color: NIGHT.line, opacity: 0.35, width: 1 };
export const NIGHT_EDGE: Record<EdgeType, { color: string; opacity: number; width: number; dashed?: boolean; arrow?: boolean }> = {
  belongs: MOONLINE,
  authored: MOONLINE,
  asked: MOONLINE,
  governs: { ...MOONLINE, dashed: true },
  stocks: MOONLINE,
  cites: { color: '#B8AAFF', opacity: 0.85, width: 1.4, arrow: true },
  became: { color: '#5FD3C6', opacity: 0.9, width: 1.5, arrow: true },
  conflicts: { color: '#FF6B75', opacity: 0.9, width: 1.6, dashed: true },
  duplicates: { color: NIGHT.line, opacity: 0.7, width: 1.2, dashed: true },
};

// 에이전트 팀: 지휘 남보라, 수집 청록(지식이 생김), 답변 라벤더, 검증 주황(사람이 볼 것), 관리 회색
export const TEAM_STYLE: Record<string, { color: string; weak: string }> = {
  lead: { color: PALETTE.blue.text, weak: PALETTE.blue.weak },
  capture: { color: PALETTE.green.text, weak: PALETTE.green.weak },
  answer: { color: PALETTE.purple.text, weak: PALETTE.purple.weak },
  verify: { color: PALETTE.orange.text, weak: PALETTE.orange.weak },
  keeper: { color: PALETTE.grey.text, weak: PALETTE.grey.weak },
  stock: { color: '#131232', weak: '#E3E1EE' }, // 재고팀: 숫자를 다루는 팀. 밤 남색
};

// 차트 범주색. 고정 순서(남보라 → 복숭아 → 청록 → 라벤더), 돌려 쓰지 않는다. line·hover는 툴팁 테두리·막대 hover 면
export const CHART = { brand: PALETTE.blue.mark, orange: PALETTE.orange.mark, green: PALETTE.green.mark, purple: PALETTE.purple.mark, grid: '#EEECF4', axis: '#625B73', line: '#E3E1EE', hover: '#F5F3F8' };

// 대시보드 첫 카드(밤)의 질문 결과 막대. 밤 그래프와 같은 뜻 색
export const NIGHT_OUTCOME = { answered: '#8090FF', escalated: '#EE8A5E', resolved: '#2DB5A8' };
