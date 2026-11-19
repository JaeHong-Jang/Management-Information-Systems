// 윤슬 HQ — 백엔드·프론트·시드 데이터 공통 타입. 화면, API, data/seed/*.json이 모두 이 모양을 따른다.
// 바꿀 때는 이 파일부터 고치고, docs/PLAN.md의 API 표도 같이 고친다.

// ======================================================================
// 1. 브랜드·매장
// ======================================================================

export type Area = '역세권' | '대학가' | '번화가' | '주거지' | '관광지' | '기타';

export interface Brand {
  id: string; // 'yeokjeon'
  name: string; // '역전할머니맥주' (브랜드는 실명)
  storeCount: number; // 데이터에 있는 매장 수
  ftcStoreCount: number; // 공정위 정보공개서 가맹점 수 (968, 2024년 말)
  standardsVersion: string; // 본사 표준 버전, 예: 'v1.0 (가상)'
  dataAsOf: string; // 리뷰 수집일 '2026-11-18'
}

export type CrossVerdict =
  | '양쪽 모두 낮음'
  | '카카오만 낮음'
  | '네이버만 낮음'
  | '양쪽 모두 낮지 않음'
  | '카카오만 낮음(네이버 표본 부족)'
  | '판정 불가(표본 부족)';

export interface Store {
  id: string; // 'S001' — 실제 카카오/네이버 id는 시드에 넣지 않는다
  name: string; // 익명 표시명. 타깃은 '강남 윤슬점', 나머지는 '{시군구} {알파벳}점' 예: '종로 B점'
  region: string; // 시도 '서울'
  district: string; // 시군구 '강남구'
  area: Area;
  isTarget: boolean; // 시연 타깃(강남 윤슬점)만 true
  kakao: { rating: number | null; count: number; lowShare: number | null; recentMean: number | null }; // lowShare = 2점 이하 비율(0~1), recentMean = 2025-01-01 이후 평균
  naver: { matched: boolean; visitorReviews: number | null; pageMean: number | null; pageN: number; pageLow: number; kindShare: number | null }; // 첫 페이지(최대 10건) 기준
  cross: CrossVerdict;
  excluded?: string; // 분석 제외 사유(리뷰 폭탄·협찬 등). 있으면 순위에서 뺀다
}

// ======================================================================
// 2. 리뷰와 불만 유형
// ======================================================================

export type Platform = '카카오' | '네이버';

export const COMPLAINT_TYPES = [
  '이용시간제한',
  '좌석·인원',
  '최소주문',
  '규칙 미고지·말바꿈',
  '직원 태도',
  '품절·대체',
  '결제·계산',
  '신분증',
  '위생',
  '대기·서빙지연',
  '맛·품질',
  '다른 지점 비교',
] as const;
export type ComplaintType = (typeof COMPLAINT_TYPES)[number];

export interface Review {
  id: string; // 'R000001'
  storeId: string;
  platform: Platform;
  star: number | null; // 카카오 1~5, 네이버 0.5 단위 또는 null
  date: string; // 'YYYY-MM-DD'
  text: string; // 익명화된 본문(다른 매장명·직원 인상착의·실명 가림)
  tags: ComplaintType[]; // 불만 유형(저평점이 아니어도 붙을 수 있다)
  tagVia: 'rules' | 'claude' | 'ollama';
  virtual?: boolean; // 처방 이후 가상 시나리오 리뷰. 화면에 '가상' 표지 필수
}

// ======================================================================
// 3. 편차 점수(규칙, 공개 배점)와 원인 진단
// ======================================================================

export interface ScorePart {
  id: 'R1' | 'R2' | 'R3' | 'R4' | 'R5';
  name: string; // 'R1 카카오 평점'
  max: number; // 배점
  points: number; // 얻은 위험 점수
  basis: string; // 계산 근거 한 줄. 표본이 없으면 '미확인'으로 쓰고 points=0
}

export interface StoreScore {
  storeId: string;
  risk: number; // 0~100, 높을수록 서비스 편차 위험
  rank: number | null; // 순위 대상(별점 10개 이상, excluded 아님)이 아니면 null
  parts: ScorePart[];
  trend: 'worse' | 'flat' | 'better' | 'unknown'; // 2025 이후 평균 vs 전체 평균
  topComplaints: { type: ComplaintType; count: number }[]; // 저평점(2점 이하) 리뷰 기준 상위 3
  knowledgeShare: number | null; // 저평점 불만 중 '지식 공백' 원인 비중(0~1)
}

export type CauseClass = '지식 공백' | '운영·인력' | '매장 자체 규칙' | '위생·품질';

export interface Quote { reviewId: string; text: string; platform: Platform; star: number | null; date: string }

export interface Finding {
  id: string;
  complaint: ComplaintType;
  cause: CauseClass;
  count: number; // 이 불만이 붙은 저평점 리뷰 수
  share: number; // 매장 저평점 리뷰 중 비중(0~1)
  explanation: string; // 왜 이 원인으로 봤는지 한두 문장
  quotes: Quote[]; // 실제 리뷰 인용 1~3개 (검증팀이 reviewId 존재를 확인)
  standardId?: string; // 관련 본사 표준
  brandRate?: number; // 같은 불만의 브랜드 전체 매장 평균 비중(비교용)
}

export interface Diagnosis {
  id: string;
  storeId: string;
  created: string;
  findings: Finding[];
  summary: string; // 한 문단 요약
  via: 'rules' | 'claude' | 'ollama' | 'rules(LLM 실패 대체)';
  runId: string;
}

// ======================================================================
// 4. 본사 표준과 매장 규칙 차이
// ======================================================================

export interface HqStandard {
  id: string; // 'H01'
  topic: string; // '이용시간' 등
  title: string;
  rule: string; // 본사 표준 문장
  reason: string; // 왜 이 표준인가
  customerNotice: string; // 손님에게 안내할 문장(근무 전 브리핑에 그대로 쓴다)
  version: string;
  virtual: true; // 실제 역전할머니맥주 본사 규정이 아니다. 화면에 '가상 표준' 표지
}

export interface RuleDrift {
  id: string;
  storeId: string;
  standardId: string;
  observed: string; // 리뷰에서 관찰된 매장 운영 방식 '웨이팅이 없어도 2시간 뒤 퇴장 요청'
  reviewIds: string[];
  status: 'open' | 'accepted' | 'fixed'; // accepted = 본사가 예외로 인정
}

export interface StandardProposal {
  id: string;
  standardId: string | null; // null = 새 표준
  title: string;
  change: string; // 바꿀 내용
  why: string; // 몇 개 매장, 어떤 리뷰 근거
  storeIds: string[];
  status: 'pending' | 'approved' | 'rejected';
  created: string;
  via: string;
}

// ======================================================================
// 5. 처방과 효과
// ======================================================================

export type PrescriptionKind = '사례 카드' | '근무 전 브리핑' | 'SV 방문 과제' | '표준 개정 제안';
export type PrescriptionStatus = 'draft' | 'sent' | 'done' | 'rejected';

export interface Prescription {
  id: string;
  storeId: string;
  kind: PrescriptionKind;
  title: string;
  body: string;
  findingIds: string[]; // 어떤 진단 결과에 대한 처방인가
  cardIds: string[]; // 매장에 내려간 사례 카드
  checklist: string[]; // SV 방문 과제일 때 점검 항목
  status: PrescriptionStatus;
  created: string;
  sentAt?: string;
  doneAt?: string;
  via: string;
}

export interface PeriodStat { from: string; to: string; n: number; mean: number | null; lowShare: number | null; byType: Partial<Record<ComplaintType, number>> }

export interface Outcome {
  storeId: string;
  prescriptionIds: string[];
  before: PeriodStat; // 처방 전 실제 리뷰
  after: PeriodStat | null; // 처방 후. 시연에서는 가상 리뷰로만 채워진다
  virtual: boolean;
}

// ======================================================================
// 6. 매장 지식 (기존 윤슬 기능, 매장 범위로 확장)
// ======================================================================

export type Source = '본사 표준' | '공식규정' | '현장노하우';
export type CardScope = 'brand' | 'store'; // brand = 본사가 전 매장에 내린 카드
export type CardStatus = 'pending' | 'approved' | 'rejected' | 'archived';
export type CardOrigin = '시드' | '기록' | '에스컬레이션' | '처방';
export type Role = 'SV' | '점장' | '숙련' | '신입';

export interface Person {
  id: string;
  storeId: string | null; // SV는 null
  name: string; // 가상 인물
  role: Role;
  tenure: string;
}

export interface Card {
  id: string;
  storeId: string | null; // scope=brand면 null
  scope: CardScope;
  title: string;
  topic: string;
  situation: string;
  reason: string; // 판단 이유 — 이 서비스의 핵심 필드
  actions: string[];
  avoid: string;
  escalateWhen: string;
  customerNotice?: string; // 손님에게 미리 할 말(브리핑용)
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
  prescriptionId?: string;
  standardId?: string;
  complaintTypes?: ComplaintType[]; // 이 카드가 막으려는 불만 유형
  credit?: boolean;
  ruleRef?: string;
  archiveReason?: string;
}

export type QuestionStatus = 'answered' | 'escalated' | 'resolved';

export interface Question {
  id: string;
  storeId: string;
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

export interface Briefing {
  storeId: string;
  date: string;
  items: { cardId: string; title: string; say: string; why: string }[]; // say = 손님에게 미리 할 말
  via: string;
}

export interface LogEntry { time: string; storeId: string | null; op: string; detail: string; runId?: string }

// ======================================================================
// 7. 하네스 선언과 실행 기록
// ======================================================================

export type FlowId =
  | 'ingest' // 리뷰 가져오기·분류·점수
  | 'diagnose' // 매장 원인 진단
  | 'prescribe' // 처방 초안
  | 'promote' // 매장 노하우 → 본사 표준 개정 제안
  | 'ask' // 알바 질문
  | 'record' // 숙련 직원 기록
  | 'approve' // 카드 승인
  | 'resolve' // 점장 답 → 카드
  | 'briefing' // 근무 전 브리핑
  | 'lint'; // 위키 점검

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

export type Via = 'claude' | 'ollama' | 'rules' | 'rules(LLM 실패 대체)';
export type StepStatus = 'ok' | 'blocked' | 'skipped' | 'error';

export interface AgentStep { agentId: string; team: string; status: StepStatus; via: Via; ms: number; summary: string; problems?: string[] }
export interface GateResult { gateId: string; passed: boolean; problems: string[]; action: string }

export type NodeType = 'store' | 'complaint' | 'cause' | 'standard' | 'card' | 'prescription' | 'person' | 'question';
export type EdgeType =
  | 'has-complaint' // 매장 → 불만 유형
  | 'caused-by' // 불만 유형 → 원인
  | 'treated-by' // 원인/불만 → 처방
  | 'delivers' // 처방 → 카드
  | 'governs' // 본사 표준 → 카드
  | 'drifts' // 매장 → 본사 표준 (규칙 차이)
  | 'cites' // 질문 → 카드
  | 'became' // 질문 → 카드
  | 'authored'; // 사람 → 카드

export interface GraphNode { id: string; type: NodeType; label: string; sub?: string; weight?: number }
export interface GraphEdge { id: string; source: string; target: string; type: EdgeType }
export interface Graph { nodes: GraphNode[]; edges: GraphEdge[] }

export interface WikiChange { op: string; detail: string; nodes: GraphNode[]; edges: GraphEdge[] }

export type RunEvent =
  | { type: 'run-start'; runId: string; flow: FlowId; flowName: string; storeId: string | null; actor: string; input: string; at: string }
  | { type: 'agent-start'; runId: string; agentId: string; at: string }
  | { type: 'agent-end'; runId: string; step: AgentStep; at: string }
  | { type: 'gate'; runId: string; gate: GateResult; at: string }
  | { type: 'wiki'; runId: string; change: WikiChange; at: string }
  | { type: 'run-end'; runId: string; ok: boolean; summary: string; at: string };

export interface RunTrace { runId: string; flow: FlowId; storeId: string | null; startedAt: string; events: RunEvent[] }

export interface AiStatus { mode: 'claude' | 'ollama' | 'rules'; model: string | null; lastError: string | null }

// ======================================================================
// 8. API 응답 모양
// ======================================================================

export interface StoreRow { store: Store; score: StoreScore; openPrescriptions: number; lastDiagnosis: string | null }

export interface HqOverview {
  brand: Brand;
  today: string;
  ai: AiStatus;
  kpis: { rankedStores: number; highRisk: number; bothLow: number; openDrifts: number; openPrescriptions: number; pendingProposals: number };
  stores: StoreRow[]; // 전 매장. 순위 대상을 순위대로 먼저, 표본 부족·제외 매장은 뒤에 risk 내림차순
  distribution: { bucket: string; kakao: number; naver: number }[]; // 평점 구간별 매장 수 '1.0–1.5' …
  heatmap: { storeId: string; counts: Partial<Record<ComplaintType, number>>; lowTotal: number }[]; // 위험 상위 30개 매장
  complaintTotals: { type: ComplaintType; count: number; cause: CauseClass }[]; // 브랜드 전체 저평점 리뷰 기준
  regions: { region: string; stores: number; meanRating: number | null; highRisk: number }[];
  situations: BrandSituation[]; // brandShare 내림차순
}

export interface StoreDetail {
  store: Store;
  score: StoreScore;
  diagnosis: Diagnosis | null;
  drifts: RuleDrift[];
  prescriptions: Prescription[];
  outcome: Outcome | null;
  monthly: { month: string; n: number; mean: number | null; low: number }[]; // 카카오 리뷰 월별 추이
  peers: { storeId: string; name: string; rating: number | null; risk: number }[]; // 같은 상권 유형·비슷한 리뷰 수의 비교 매장 5곳
}

export interface ReviewPage { total: number; items: Review[] }

// ----------------------------------------------------------------------
// 상황 (v3: 직원이 막히는 순간이 중심. docs/PIVOT.md)
// ----------------------------------------------------------------------

/** 직원이 근무 중 맞닥뜨리는 상황. 규칙 상수(backend/src/rules/situations.ts)로 정의하고 리뷰 불만 유형·카드 주제와 잇는다. */
export interface SituationDef {
  id: string; // 'T01'
  title: string; // 직원 입장 표현. 예: '이용시간이 다 됐다고 알려야 할 때'
  complaintTypes: ComplaintType[]; // 이 상황을 잘못 처리하면 리뷰에 남는 불만 유형
  cardTopics: string[]; // 이 상황을 다루는 카드 주제(Card.topic)
}

export interface SituationQuote { reviewId: string; text: string; star: number | null; date: string }

/** 한 매장에서 본 상황. 숫자는 모두 규칙 계산 */
export interface Situation extends SituationDef {
  storeReviews: number; // 이 매장 실제 리뷰(virtual 제외) 중 해당 불만 유형이 붙은 수
  storeShare: number; // 이 매장 불만 태그가 하나라도 붙은 리뷰 중 비율 0~1
  brandShare: number; // 브랜드 전체에서 같은 방식으로 센 비율(비교용)
  quotes: SituationQuote[]; // 이 매장 리뷰 인용, 최대 2
  cardIds: string[]; // 이 상황에 쓸 승인 카드(매장 카드 먼저, 그다음 브랜드 카드)
  storeCard: boolean; // 승인된 매장 카드가 하나라도 있는지
  questions: number; // 이 매장 직원이 이 상황으로 물은 수
  openQuestions: number; // 그중 아직 점장 답이 없는 수
  gap: boolean; // 리뷰로는 자주 터지는데(storeReviews ≥ 3) 매장 카드가 없음 → 점장이 카드를 만들 차례
  priority: number; // 가르칠 순서 점수(규칙). 높을수록 먼저
}

export interface OnboardingItem { situationId: string; situationTitle: string; cardId: string; why: string }
export interface OnboardingRead { personId: string; cardId: string; at: string }

/** 새 알바 첫 근무 준비: 읽을 카드 목록과 읽음 기록. 퀴즈 없음, 읽음 표시만 */
export interface Onboarding {
  storeId: string;
  items: OnboardingItem[]; // 상황 우선순위 순, 상황마다 카드 1장, 최대 8장
  reads: OnboardingRead[];
}

/** 본사용: 전국에서 자주 터지는 상황 */
export interface BrandSituation extends SituationDef {
  brandShare: number;
  storesTop3: number; // 이 상황이 불만 상위 3위 안에 드는 순위 대상 매장 수
  brandCardIds: string[]; // 이 상황을 다루는 브랜드 카드
}

export interface StoreState {
  store: Store;
  today: string;
  people: Person[];
  cards: Card[]; // 이 매장 카드 + brand 카드
  questions: Question[];
  prescriptions: Prescription[]; // 이 매장에 내려온 처방
  topics: string[];
  topicSummaries: Record<string, string>;
  log: LogEntry[];
  ai: AiStatus;
  situations: Situation[]; // priority 내림차순
  onboarding: Onboarding;
}

export interface AskResult { question: Question; candidates: { id: string; title: string; score: number }[]; runId: string }

export interface InterviewDraft {
  title: string;
  topic: string;
  situation: string;
  reason: string;
  actions: string[];
  avoid: string;
  escalateWhen: string;
  customerNotice?: string;
  source: Source;
  tags: string[];
  followups: string[];
  masked: number;
  problems: string[];
  via?: string;
}

export interface LintIssue { kind: '상충' | '만료' | '효과 낮음' | '공백' | '중복' | '만료 임박' | '이유 없음' | '승인 대기' | '표준 불일치'; ids: string[]; detail: string }

export interface RunAccepted { runId: string } // 긴 흐름은 runId를 먼저 돌려주고 결과는 SSE와 GET으로 받는다
