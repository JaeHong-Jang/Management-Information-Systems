// 그래프·에이전트 팀·차트 색. tailwind.config.js와 같은 값이고 규칙은 docs/DESIGN.md.
// 범주색 4개(파랑·주황·초록·보라)는 validate_palette.js --pairs all 통과(색약 ΔE 9.0 이상, 흰 배경 3:1 이상).
// 노드 종류는 색과 모양을 함께 달리한다(색만으로 구분하지 않기).
import type { EdgeType, NodeType } from '@shared/contracts';

export const PALETTE = {
  blue: { mark: '#3182F6', text: '#1B64DA', weak: '#E8F3FF' },
  orange: { mark: '#EB6834', text: '#B5420F', weak: '#FFF1EA' },
  green: { mark: '#139E76', text: '#0B7A5A', weak: '#E7F7F1' },
  purple: { mark: '#B44CB0', text: '#8E2F8B', weak: '#F9EDF8' },
  grey: { mark: '#4E5968', text: '#333D4B', weak: '#F2F4F6' },
  red: { mark: '#F04452', text: '#C9252D', weak: '#FEF0F0' },
};

export const NODE_STYLE: Record<NodeType, { color: string; weak: string; shape: string; label: string }> = {
  topic: { color: PALETTE.blue.mark, weak: PALETTE.blue.weak, shape: 'ellipse', label: '토픽' },
  card: { color: PALETTE.green.mark, weak: PALETTE.green.weak, shape: 'round-rectangle', label: '사례 카드' },
  person: { color: PALETTE.purple.mark, weak: PALETTE.purple.weak, shape: 'ellipse', label: '사람' },
  question: { color: PALETTE.orange.mark, weak: PALETTE.orange.weak, shape: 'diamond', label: '질문' },
  source: { color: '#333D4B', weak: PALETTE.grey.weak, shape: 'round-hexagon', label: '출처' },
  item: { color: '#6B7684', weak: PALETTE.grey.weak, shape: 'barrel', label: '재고 품목' },
};

export const EDGE_STYLE: Record<EdgeType, { color: string; dashed?: boolean; label: string }> = {
  belongs: { color: '#D1D6DB', label: '토픽에 속함' },
  authored: { color: '#E2C3E0', label: '남김' },
  asked: { color: '#F6C4AE', label: '물음' },
  cites: { color: PALETTE.blue.mark, label: '근거로 씀' },
  became: { color: PALETTE.green.mark, label: '점장 답 → 카드' },
  governs: { color: '#D1D6DB', dashed: true, label: '출처' },
  conflicts: { color: PALETTE.red.mark, dashed: true, label: '상충' },
  duplicates: { color: '#8B95A1', dashed: true, label: '중복' },
  stocks: { color: '#B0B8C1', label: '재고 판단 근거' },
};

// 에이전트 팀: 지휘 파랑, 수집 초록(지식이 생김), 답변 보라, 검증 주황(사람이 볼 것), 관리 회색
export const TEAM_STYLE: Record<string, { color: string; weak: string }> = {
  lead: { color: PALETTE.blue.text, weak: PALETTE.blue.weak },
  capture: { color: PALETTE.green.text, weak: PALETTE.green.weak },
  answer: { color: PALETTE.purple.text, weak: PALETTE.purple.weak },
  verify: { color: PALETTE.orange.text, weak: PALETTE.orange.weak },
  keeper: { color: PALETTE.grey.text, weak: PALETTE.grey.weak },
  stock: { color: '#191F28', weak: '#E5E8EB' }, // 재고팀: 숫자를 다루는 팀. 진회색
};

// 차트 범주색. 고정 순서(파랑 → 주황 → 초록 → 보라), 돌려 쓰지 않는다.
export const CHART = { brand: PALETTE.blue.mark, orange: PALETTE.orange.mark, green: PALETTE.green.mark, purple: PALETTE.purple.mark, grid: '#F2F4F6', axis: '#8B95A1' };
