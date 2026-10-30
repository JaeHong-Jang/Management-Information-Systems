// 백엔드·프론트 공통 타입. 화면과 API가 같은 모양을 보도록 여기 한 곳에서만 정의한다.

// ---------- 매장 지식 ----------

export type Source = '공식규정' | '현장노하우';
export type CardStatus = 'pending' | 'approved' | 'rejected' | 'archived';
export type CardOrigin = '시드' | '기록' | '에스컬레이션';
export type Role = '점장' | '숙련' | '신입';

export interface Person {
  id: string;
  name: string;
  role: Role;
  tenure: string; // 예: "2년차", "3일차"
}

export interface Card {
  id: string;
  title: string;
  topic: string;
  situation: string;
  reason: string; // 판단 이유 — 이 서비스의 핵심 필드
  actions: string[];
  avoid: string;
  escalateWhen: string;
  source: Source;
  authorId: string;
  status: CardStatus;
  origin: CardOrigin;
  created: string;
  updated: string;
  expires: string;
  tags: string[];
  uses: number;
  helpful: number;
  notHelpful: number;
  fromQuestionId?: string;
  credit?: boolean; // false면 기여 크레딧에 이름을 드러내지 않는다(기록자는 내부에만 남음)
}

export type QuestionStatus = 'answered' | 'escalated' | 'resolved';

export interface Question {
  id: string;
  text: string;
  askerId: string;
  time: string;
  status: QuestionStatus;
  answer: string;
  why: string;
  cited: string[];
  confidence: 'high' | 'low' | 'none';
  feedback: 'solved' | 'unsolved' | null;
  managerAnswer?: string;
  cardId?: string;
  runId?: string;
}

export interface LogEntry {
  time: string;
  op: string;
  detail: string;
  runId?: string;
}

export interface StoreInfo {
  name: string;
  today: string;
}

export interface Snapshot {
  store: StoreInfo;
  topics: string[];
  people: Person[];
  cards: Card[];
  questions: Question[];
  topicSummaries: Record<string, string>;
  log: LogEntry[];
}

// ---------- 하네스 선언 ----------

export type FlowId = 'ask' | 'record' | 'approve' | 'resolve' | 'lint' | 'train';

export interface TeamDef { id: string; name: string; color: string; agents: string[] }
export interface AgentDef { id: string; team: string; name: string; role: string; card: string; llm: boolean }
export interface GateDef { id: string; flow: FlowId; agents: string[]; onFail: string }

export interface HarnessConfig {
  name: string;
  version: string;
  llm: { provider: 'anthropic'; model: string; envModel: string; fallbacks: string; offline: string };
  teams: TeamDef[];
  agents: AgentDef[];
  flows: Record<FlowId, { name: string; steps: string[] }>;
  gates: GateDef[];
}

// ---------- 실행 기록 (실시간 스트림) ----------

export type Via = 'claude' | 'rules' | 'rules(LLM 실패 대체)';
export type StepStatus = 'ok' | 'blocked' | 'skipped' | 'error';

export interface AgentStep {
  agentId: string;
  team: string;
  status: StepStatus;
  via: Via;
  ms: number;
  summary: string; // 한 줄, 화면 피드에 그대로 보인다
  problems?: string[];
}

export interface GateResult {
  gateId: string;
  passed: boolean;
  problems: string[];
  action: string;
}

// 온톨로지 그래프
export type NodeType = 'topic' | 'card' | 'person' | 'question' | 'source';
export type EdgeType =
  | 'belongs' // 카드 → 토픽
  | 'authored' // 사람 → 카드
  | 'asked' // 사람 → 질문
  | 'cites' // 질문 → 카드
  | 'became' // 질문 → (점장 답으로 생긴) 카드
  | 'governs' // 출처(공식규정/현장노하우) → 카드
  | 'conflicts'
  | 'duplicates';

export interface GraphNode {
  id: string;
  type: NodeType;
  label: string;
  sub?: string; // 보조 표시 (상태, 역할 등)
  weight?: number; // 크기 (재사용 횟수 등)
}
export interface GraphEdge { id: string; source: string; target: string; type: EdgeType }
export interface Graph { nodes: GraphNode[]; edges: GraphEdge[] }

export interface WikiChange {
  op: string; // 예: '질문 추가', '카드 승인 대기', '토픽 재종합'
  detail: string;
  nodes: GraphNode[]; // 이번에 새로 생기거나 바뀐 노드
  edges: GraphEdge[];
}

export type RunEvent =
  | { type: 'run-start'; runId: string; flow: FlowId; flowName: string; actor: string; input: string; at: string }
  | { type: 'agent-start'; runId: string; agentId: string; at: string }
  | { type: 'agent-end'; runId: string; step: AgentStep; at: string }
  | { type: 'gate'; runId: string; gate: GateResult; at: string }
  | { type: 'wiki'; runId: string; change: WikiChange; at: string }
  | { type: 'run-end'; runId: string; ok: boolean; summary: string; at: string };

export interface RunTrace {
  runId: string;
  flow: FlowId;
  startedAt: string;
  events: RunEvent[];
}

// ---------- API 응답 ----------

export interface AskResult { question: Question; candidates: { id: string; title: string; score: number }[]; runId: string }

export interface InterviewDraft {
  title: string;
  topic: string;
  situation: string;
  reason: string;
  actions: string[];
  avoid: string;
  escalateWhen: string;
  source: Source;
  tags: string[];
  followups: string[];
  masked: number; // 개인정보 가드가 가린 개수
  problems: string[]; // 표현 검증에서 걸린 것
  via?: string; // 카드 편집자가 Claude였는지 규칙이었는지
}

export interface LintIssue { kind: '상충' | '만료' | '효과 낮음' | '공백' | '중복' | '만료 임박' | '이유 없음' | '승인 대기'; ids: string[]; detail: string }

export interface TrainingTask { id: string; topic: string; situation: string }
export interface TrainingResult { score: number; good: string[]; missing: string[]; feedback: string; card: Card }

export interface Metrics {
  cards: number;
  pending: number;
  bySource: Record<Source, number>;
  byTopic: { topic: string; n: number }[];
  questions: number;
  answeredByWiki: number;
  escalated: number;
  resolvedToCards: number;
  solvedRate: number | null;
  solvedN: number; // 해결됐다고 답한 수 (분자)
  feedbackN: number; // 피드백을 준 질문 수 (분모)
  noFeedback: number; // 답은 받았지만 피드백이 없는 질문
  scope: 'all' | 'live'; // live = 시드 데이터를 빼고 이번 시연에서 생긴 것만
  totalReuse: number;
  reasonCoverage: number; // 판단 이유가 채워진 카드 비율(%)
  contributors: { personId: string; name: string; cards: number; helped: number }[];
  timeline: { day: string; cards: number; questions: number }[];
}

export interface AiStatus { mode: 'claude' | 'rules'; model: string | null; lastError: string | null }
