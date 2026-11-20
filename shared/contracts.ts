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
  ruleRef?: string; // 공식규정의 원문(문서·버전). 없으면 화면에 '원문 미첨부'
  archiveReason?: string; // 보관할 때 점장이 남긴 사유
  itemIds?: string[]; // 이 카드가 판단 근거가 되는 재고 품목
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

// ---------- 재고·발주 ----------
// 숫자는 규칙이 계산한다(POS 판매 × 메뉴별 소모량, 실사, 입고). 숫자를 바꾸는 이유(보정)는 승인된 카드에서만 온다.

export interface Item {
  id: string;
  name: string;
  unit: string; // 병, L, kg, 캔
  category: '주류' | '음식재료' | '부재료';
  pack: number; // 발주 단위 하나에 든 양 (소주 1짝 = 20병)
  packLabel: string; // 짝, 케그, 박스
  supplier: string;
  leadDays: number; // 주문하고 도착까지
  reorderPoint: number; // 영업 시작 재고가 이 아래면 주문
  par: number; // 주문으로 채울 적정량
  aliases: string[]; // 질문·메뉴에서 이 품목을 가리키는 말
}

export interface RecipeLine { itemId: string; qty: number }
export interface Recipe { menu: string; lines: RecipeLine[]; status: 'pending' | 'approved'; via: string }
export interface Sale { date: string; menu: string; qty: number }
// at: 같은 날 실사와 입고의 앞뒤를 가리는 기록 시각. 실사는 그날 마감 후 센 값이다
export interface Delivery { date: string; itemId: string; qty: number; orderId?: string; at?: string }
export interface Stocktake { date: string; itemId: string; counted: number; expected: number; by: string; cardId?: string; at?: string }
export interface StoreEvent { from: string; to: string; label: string }
export interface Adjustment { id: string; itemId: string; from: string; to: string; factor: number; reason: string; cardId: string; status: 'pending' | 'approved' | 'rejected'; via: string }
export interface OrderLine { itemId: string; packs: number; qty: number; why: string }
export interface Order { id: string; supplier: string; date: string; lines: OrderLine[]; status: 'draft' | 'sent' | 'received' } // 초안 → 사람이 보냄 → 입고 확인
export interface PosImport { id: string; at: string; file: string; rows: number; days: string[]; unknownMenus: string[] }

export interface Inventory {
  items: Item[];
  recipes: Recipe[];
  sales: Sale[];
  deliveries: Delivery[];
  stocktakes: Stocktake[];
  events: StoreEvent[];
  adjustments: Adjustment[];
  orders: Order[];
  imports: PosImport[];
}

export type StockLevel = 'out' | 'today' | 'soon' | 'ok'; // 도착 전 바닥 · 오늘 주문 · 3일 안 · 여유

export interface ItemStatus {
  item: Item;
  stock: number;
  level: StockLevel;
  daysLeft: number | null; // 14일 넘게 남으면 null
  orderInDays: number | null; // 0 = 오늘 주문, 14일 안에 없으면 null
  orderDate: string | null;
  suggestPacks: number;
  dailyAvg: number;
  byWeekday: number[]; // 일~토
  recent: { date: string; qty: number }[]; // 최근 28일 실제 사용량
  forecast: { date: string; qty: number; factor: number }[]; // 앞으로 14일
  lastCount: Stocktake | null;
  incoming: { date: string; qty: number; orderId: string }[]; // 보냈지만 아직 입고 확인 전인 주문
  estimatedDays: number; // 마지막 POS 반영 뒤라 사용량을 요일별 평균으로 추정한 날 수
  closing: number; // 오늘 마감 때 예상 재고(마감 실사를 이 값과 비교한다)
  suggested: { reorderPoint: number; par: number };
  activeAdjustments: Adjustment[];
  cardIds: string[]; // 이 품목과 연결된 승인 카드
}

export interface InventoryView {
  today: string;
  items: ItemStatus[];
  orders: Order[];
  recipes: Recipe[];
  adjustments: Adjustment[];
  events: StoreEvent[];
  imports: PosImport[];
  pendingMenus: string[]; // 승인 전이라 사용량에 아직 안 들어간 메뉴
}

export interface PosImportResult { import: PosImport; newRecipes: Recipe[]; proposals: Adjustment[]; orders: Order[]; runId: string }

// ---------- 하네스 선언 ----------

export type FlowId = 'ask' | 'record' | 'approve' | 'resolve' | 'lint' | 'pos' | 'stocktake' | 'stockapprove';

export interface TeamDef { id: string; name: string; color: string; agents: string[] }
export interface AgentDef { id: string; team: string; name: string; role: string; card: string; llm: boolean }
export interface GateDef { id: string; flow: FlowId; agents: string[]; onFail: string }

export interface HarnessConfig {
  name: string;
  version: string;
  llm: { provider: 'anthropic'; model: string; envModel: string; fallbacks: string; offline: string; ollama: { model: string; envModel: string; envHost: string } };
  teams: TeamDef[];
  agents: AgentDef[];
  flows: Record<FlowId, { name: string; steps: string[] }>;
  gates: GateDef[];
}

// ---------- 실행 기록 (실시간 스트림) ----------

export type Via = 'claude' | 'ollama' | 'rules' | 'rules(LLM 실패 대체)';
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
export type NodeType = 'topic' | 'card' | 'person' | 'question' | 'source' | 'item';
export type EdgeType =
  | 'belongs' // 카드 → 토픽
  | 'authored' // 사람 → 카드
  | 'asked' // 사람 → 질문
  | 'cites' // 질문 → 카드
  | 'became' // 질문 → (점장 답으로 생긴) 카드
  | 'governs' // 출처(공식규정/현장노하우) → 카드
  | 'conflicts'
  | 'duplicates'
  | 'stocks'; // 카드 → 재고 품목 (그 품목의 판단 근거)

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

export interface LintIssue { kind: '상충' | '만료' | '효과 낮음' | '공백' | '중복' | '만료 임박' | '이유 없음' | '승인 대기' | '재고 차이' | '사용량 이탈' | '레시피 대기' | '보정 제안'; ids: string[]; detail: string }


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

export interface AiStatus { mode: 'claude' | 'ollama' | 'rules'; model: string | null; lastError: string | null }

// ---------- 가상 손님 (Nemotron-Personas-Korea 페르소나 기반) ----------

export interface Customer { id: string; name: string; age: number; sex: string; region: string; occupation: string; persona: string }

export interface Visit {
  customer: Customer;
  topic: string;
  situation: string;
  customerLine: string;
  staffQuestion: string;
  via: Via;
  questionId: string;
  outcome: 'answered' | 'escalated';
  cited: string[];
  at: string;
}
