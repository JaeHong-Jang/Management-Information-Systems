// 백엔드 API. 모든 화면은 여기만 거친다.
import type { Adjustment, AiStatus, AskResult, Card, Graph, HarnessConfig, InterviewDraft, InventoryView, Item, LintIssue, Metrics, Order, PosImportResult, Question, Recipe, RecipeLine, Snapshot, Stocktake, Visit } from '@shared/contracts';

export type State = Snapshot & { ai: AiStatus; demoPlaying: boolean; simulating: boolean };

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, { headers: { 'content-type': 'application/json' }, ...init });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error ?? `요청 실패 (${res.status})`);
  return body as T;
}
const post = <T,>(path: string, body: unknown = {}) => call<T>(path, { method: 'POST', body: JSON.stringify(body) });

export type FollowupAnswer = { question: string; answer: string };
export type DraftFields = Omit<InterviewDraft, 'followups' | 'masked' | 'problems'> & { credit?: boolean };

export const api = {
  state: () => call<State>('/state'),
  graph: () => call<Graph>('/graph'),
  harness: () => call<HarnessConfig>('/harness'),
  metrics: (scope: 'all' | 'live' = 'all') => call<Metrics>(`/metrics?scope=${scope}`),
  judge: () => call<JudgeData>('/judge'),
  ask: (text: string, askerId: string) => post<AskResult>('/ask', { text, askerId }),
  feedback: (id: string, solved: boolean) => post<Question>(`/questions/${id}/feedback`, { solved }),
  resolve: (id: string, answer: string, managerId: string) => post<{ question: Question; card: Card }>(`/questions/${id}/resolve`, { answer, managerId }),
  interview: (raw: string, authorId: string, answers: FollowupAnswer[] = []) => post<InterviewDraft>('/record/interview', { raw, authorId, answers }),
  submitCard: (draft: DraftFields, authorId: string) => post<Card>('/cards', { draft, authorId }),
  cardAction: (id: string, action: 'approve' | 'reject' | 'renew' | 'archive', edits?: Partial<Card>, reason?: string) => post<Card>(`/cards/${id}/${action}`, { edits, reason }),
  lint: (quiet = false) => call<{ issues: LintIssue[]; runId: string }>(`/lint${quiet ? '?quiet=1' : ''}`),
  playDemo: () => post<{ ok: boolean }>('/demo/play'),
  visits: () => call<{ visits: Visit[]; simulating: boolean }>('/sim/visits'),
  simulate: (n: number) => post<{ ok: boolean; n: number }>('/sim/customers', { n }),
  reset: () => post<{ ok: boolean }>('/reset'),
  // 재고·발주
  inventory: () => call<InventoryView>('/inventory'),
  posUpload: (file: string, base64: string, actorId: string) => post<PosImportResult>('/inventory/pos', { file, base64, actorId }),
  posSample: (actorId: string) => post<PosImportResult>('/inventory/pos/sample', { actorId }),
  stocktake: (counts: { itemId: string; counted: number }[], byId: string) => post<{ stocktakes: Stocktake[]; issues: LintIssue[]; orders: Order[] }>('/inventory/stocktake', { counts, byId }),
  explainStock: (itemId: string, reason: string, managerId: string) => post<Card>('/inventory/stocktake/explain', { itemId, reason, managerId }),
  approveRecipe: (menu: string, lines: RecipeLine[]) => post<Recipe>('/inventory/recipes/approve', { menu, lines }),
  adjustment: (id: string, action: 'approve' | 'reject') => post<Adjustment>(`/inventory/adjustments/${id}/${action}`),
  order: (id: string, action: 'send' | 'receive') => post<Order>(`/inventory/orders/${id}/${action}`),
  updateItem: (id: string, patch: Partial<Pick<Item, 'reorderPoint' | 'par' | 'leadDays'>>) => call<Item>(`/inventory/items/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
};

export interface JudgeRound {
  round: string;
  date: string;
  judges: { id: string; model: string; scores: Record<string, number>; total: number; top3: string[] }[];
  changes: string[];
}
export interface JudgeData { rubric: { criteria: { id: string; name: string; points: number; desc: string }[]; note: string }; rounds: JudgeRound[] }
