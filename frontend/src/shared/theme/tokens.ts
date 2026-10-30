// 그래프·에이전트 팀 색. 노드 종류는 색과 모양을 함께 달리한다(색만으로 구분하지 않기).
import type { EdgeType, NodeType } from '@shared/contracts';

export const NODE_STYLE: Record<NodeType, { color: string; shape: string; label: string }> = {
  topic: { color: '#3182F6', shape: 'ellipse', label: '토픽' },
  card: { color: '#0891B2', shape: 'round-rectangle', label: '사례 카드' },
  person: { color: '#6941C6', shape: 'ellipse', label: '사람' },
  question: { color: '#B54708', shape: 'diamond', label: '질문' },
  source: { color: '#191F28', shape: 'hexagon', label: '출처' },
};

export const EDGE_STYLE: Record<EdgeType, { color: string; dashed?: boolean; label: string }> = {
  belongs: { color: '#C9D2DC', label: '토픽에 속함' },
  authored: { color: '#B8A4E8', label: '남김' },
  asked: { color: '#F3C79A', label: '물음' },
  cites: { color: '#3182F6', label: '근거로 씀' },
  became: { color: '#067647', label: '점장 답 → 카드' },
  governs: { color: '#D0D5DD', dashed: true, label: '출처' },
  conflicts: { color: '#B42318', dashed: true, label: '상충' },
  duplicates: { color: '#8B95A1', dashed: true, label: '중복' },
};

export const TEAM_STYLE: Record<string, { color: string; weak: string }> = {
  lead: { color: '#1B64DA', weak: '#E8F3FF' },
  capture: { color: '#067647', weak: '#ECFDF3' },
  answer: { color: '#6941C6', weak: '#F4F3FF' },
  verify: { color: '#B54708', weak: '#FFFAEB' },
  keeper: { color: '#0E7490', weak: '#ECFDFF' },
};

// 차트 범주색: validate_palette.js 통과 (light, 고정 순서: brand → orange → teal → violet). 순서를 바꾸거나 돌려 쓰지 않는다.
export const CHART = { brand: '#3182F6', orange: '#B54708', teal: '#0891B2', violet: '#6941C6', grid: '#EEF0F3', axis: '#8B95A1' };
