// 백엔드 API. 모든 화면은 여기만 거친다.
import type { AiStatus, AskResult, Card, Graph, HarnessConfig, InterviewDraft, LintIssue, Metrics, Question, Snapshot, TrainingResult, TrainingTask } from '@shared/contracts';

export type State = Snapshot & { ai: AiStatus; demoPlaying: boolean };

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
  cardAction: (id: string, action: 'approve' | 'reject' | 'renew' | 'archive', edits?: Partial<Card>) => post<Card>(`/cards/${id}/${action}`, { edits }),
  lint: (quiet = false) => call<{ issues: LintIssue[]; runId: string }>(`/lint${quiet ? '?quiet=1' : ''}`),
  trainingTask: () => call<TrainingTask>('/training'),
  grade: (id: string, answer: string, personId: string) => post<TrainingResult>('/training/grade', { id, answer, personId }),
  playDemo: () => post<{ ok: boolean }>('/demo/play'),
  reset: () => post<{ ok: boolean }>('/reset'),
};

export interface JudgeRound {
  round: string;
  date: string;
  judges: { id: string; model: string; scores: Record<string, number>; total: number; top3: string[] }[];
  changes: string[];
}
export interface JudgeData { rubric: { criteria: { id: string; name: string; points: number; desc: string }[]; note: string }; rounds: JudgeRound[] }
