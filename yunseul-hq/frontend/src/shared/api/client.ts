// 백엔드 API (docs/PLAN.md §7). 모든 화면은 여기만 거친다. 응답 타입은 shared/contracts.ts.
import type {
  AskResult,
  Briefing,
  Card,
  ComplaintType,
  Graph,
  HarnessConfig,
  HqOverview,
  HqStandard,
  InterviewDraft,
  LintIssue,
  Onboarding,
  Outcome,
  Platform,
  Prescription,
  Question,
  ReviewPage,
  RuleDrift,
  RunAccepted,
  RunTrace,
  StandardProposal,
  StoreDetail,
  StoreState,
} from '@shared/contracts';

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, { headers: { 'content-type': 'application/json' }, ...init });
  } catch {
    throw new ApiError('서버 연결 실패. 연결 상태를 확인한 뒤 다시 시도하십시오.', 0);
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError((body as { error?: string }).error ?? `요청 처리 실패 (${res.status})`, res.status);
  return body as T;
}
const post = <T,>(path: string, body: unknown = {}) => call<T>(path, { method: 'POST', body: JSON.stringify(body) });

function qs(params: Record<string, string | number | undefined | null>) {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') p.set(k, String(v));
  });
  const s = p.toString();
  return s ? `?${s}` : '';
}

export interface ReviewQuery {
  storeId?: string;
  platform?: Platform | '';
  type?: ComplaintType | '';
  maxStar?: number | '';
  q?: string;
  offset?: number;
  limit?: number;
}

export interface StandardsView {
  standards: HqStandard[];
  proposals: StandardProposal[];
  drifts: RuleDrift[];
}

export type FollowupAnswer = { question: string; answer: string };
export type DraftFields = Omit<InterviewDraft, 'followups' | 'masked' | 'problems' | 'via'>;
export type CardAction = 'approve' | 'reject' | 'archive';
export type CardEdits = Partial<Pick<Card, 'title' | 'situation' | 'reason' | 'actions' | 'avoid' | 'escalateWhen' | 'customerNotice'>>;
export type PrescriptionAction = 'send' | 'done' | 'reject';

export const api = {
  // 본사
  overview: () => call<HqOverview>('/hq/overview'),
  store: (id: string) => call<StoreDetail>(`/hq/stores/${id}`),
  reviews: (q: ReviewQuery) => call<ReviewPage>(`/hq/reviews${qs({ ...q })}`),
  diagnose: (id: string) => post<RunAccepted>(`/hq/stores/${id}/diagnose`),
  prescribe: (id: string) => post<RunAccepted>(`/hq/stores/${id}/prescribe`),
  prescription: (id: string, action: PrescriptionAction) => post<Prescription>(`/hq/prescriptions/${id}/${action}`),
  standards: () => call<StandardsView>('/hq/standards'),
  promote: () => post<RunAccepted>('/hq/promote'),
  proposal: (id: string, action: 'approve' | 'reject') => post<StandardProposal>(`/hq/proposals/${id}/${action}`),
  drift: (id: string, action: 'accept' | 'fix') => post<RuleDrift>(`/hq/drifts/${id}/${action}`),
  simulate: (storeId: string) => post<Outcome>(`/hq/simulate/${storeId}`),

  // 매장
  state: (id: string) => call<StoreState>(`/stores/${id}/state`),
  briefing: (id: string) => call<Briefing>(`/stores/${id}/briefing`),
  ask: (id: string, text: string, askerId: string, situationId?: string) =>
    post<AskResult>(`/stores/${id}/ask`, { text, askerId, ...(situationId ? { situationId } : {}) }),
  feedback: (id: string, qid: string, solved: boolean) => post<Question>(`/stores/${id}/questions/${qid}/feedback`, { solved }),
  resolve: (id: string, qid: string, answer: string, managerId: string) => post<Question>(`/stores/${id}/questions/${qid}/resolve`, { answer, managerId }),
  interview: (id: string, raw: string, authorId: string, answers: FollowupAnswer[] = []) =>
    post<InterviewDraft>(`/stores/${id}/record/interview`, { raw, authorId, answers }),
  submitCard: (id: string, draft: DraftFields, authorId: string) => post<Card>(`/stores/${id}/cards`, { draft, authorId }),
  card: (id: string, cid: string, action: CardAction, reason?: string, edits?: CardEdits) =>
    post<Card>(`/stores/${id}/cards/${cid}/${action}`, { reason, ...(edits ? { edits } : {}) }),
  editCard: (id: string, cid: string, edits: CardEdits, editorId: string) => post<Card>(`/stores/${id}/cards/${cid}/edit`, { edits, editorId }),
  readOnboarding: (id: string, personId: string, cardId: string) => post<Onboarding>(`/stores/${id}/onboarding/read`, { personId, cardId }),
  lint: (id: string) => call<LintIssue[]>(`/stores/${id}/lint`),

  // 공통
  graph: (storeId?: string) => call<Graph>(`/graph${qs({ storeId })}`),
  harness: () => call<HarnessConfig>('/harness'),
  run: (id: string) => call<RunTrace>(`/runs/${id}`),
  reset: () => post<{ ok: boolean }>('/reset'),
};
