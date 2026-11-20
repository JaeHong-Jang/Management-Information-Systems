import { existsSync } from 'node:fs';
import { join } from 'node:path';
import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import type { RunEvent, StoreState } from '@shared/contracts';
import { config } from './harness/config.js';
import { status as aiStatus } from './harness/llm.js';
import { bus } from './harness/trace.js';
import * as flows from './flows/index.js';
import * as hq from './flows/hq.js';
import { markOnboardingRead, overview, reviewPage, storeDetail, storeOnboarding, storeSituations } from './hq/service.js';
import * as db from './store/db.js';
import { buildGraph } from './store/graph.js';
import { ROOT_DIR } from './paths.js';

export const app = express();
app.use(cors());
app.use(express.json());

type Handler = (req: Request, res: Response) => unknown;
const route = (fn: Handler) => (req: Request, res: Response, next: NextFunction) => Promise.resolve(fn(req, res)).catch(next);
const bad = (res: Response, msg: string) => res.status(400).json({ error: msg });
const sid = (req: Request) => String(req.params.id);
const q = (v: unknown) => (typeof v === 'string' && v ? v : undefined);

// ---------- 본사 ----------

app.get('/api/hq/overview', (_req, res) => res.json(overview()));
app.get('/api/hq/stores/:id', (req, res) => {
  const d = storeDetail(sid(req));
  return d ? res.json(d) : res.status(404).json({ error: '매장을 찾을 수 없어요' });
});
app.get('/api/hq/reviews', (req, res) =>
  res.json(reviewPage({ storeId: q(req.query.storeId), platform: q(req.query.platform), type: q(req.query.type), maxStar: q(req.query.maxStar), q: q(req.query.q), offset: q(req.query.offset), limit: q(req.query.limit) })),
);
app.post('/api/hq/stores/:id/diagnose', route((req, res) => res.json({ runId: hq.diagnose(sid(req)).runId })));
app.post('/api/hq/stores/:id/prescribe', route((req, res) => res.json({ runId: hq.prescribe(sid(req)).runId })));
app.post('/api/hq/prescriptions/:id/:action', route((req, res) => {
  const action = String(req.params.action);
  if (!['send', 'done', 'reject'].includes(action)) return bad(res, '알 수 없는 작업');
  res.json(hq.prescriptionAction(sid(req), action as 'send'));
}));
app.get('/api/hq/standards', (_req, res) => {
  const d = db.get();
  res.json({ standards: d.standards, proposals: d.proposals, drifts: d.drifts });
});
app.post('/api/hq/promote', route((_req, res) => res.json({ runId: hq.promote().runId })));
app.post('/api/hq/proposals/:id/:action', route((req, res) => {
  const action = String(req.params.action);
  if (!['approve', 'reject'].includes(action)) return bad(res, '알 수 없는 작업');
  res.json(hq.proposalAction(sid(req), action as 'approve'));
}));
app.post('/api/hq/drifts/:id/:action', route((req, res) => {
  const action = String(req.params.action);
  if (!['accept', 'fix'].includes(action)) return bad(res, '알 수 없는 작업');
  res.json(hq.driftAction(sid(req), action as 'accept'));
}));
app.post('/api/hq/simulate/:storeId', route(async (req, res) => res.json(await hq.simulate(String(req.params.storeId)))));

// ---------- 매장 ----------

app.get('/api/stores/:id/state', route((req, res) => {
  const store = flows.requireStore(sid(req));
  const d = db.get();
  const visibleRx = d.prescriptions.filter((p) => p.storeId === store.id && p.kind !== '표준 개정 제안' && (p.status === 'sent' || p.status === 'done')); // 표준 개정 제안은 본사 몫이라 매장 화면에 내리지 않는다
  const state: StoreState = {
    store,
    today: db.today(),
    now: db.now(),
    people: d.people.filter((p) => p.storeId === store.id),
    cards: db.storeCards(store.id),
    questions: d.questions.filter((x) => x.storeId === store.id),
    prescriptions: visibleRx,
    topics: d.topics,
    topicSummaries: d.topicSummaries[store.id] ?? {},
    log: d.log.filter((l) => l.storeId === store.id || l.storeId === null).slice(-40).reverse(),
    ai: aiStatus,
    situations: storeSituations(store.id),
    onboarding: storeOnboarding(store.id),
  };
  res.json(state);
}));
app.post('/api/stores/:id/onboarding/read', route((req, res) => {
  flows.requireStore(sid(req));
  const { personId, cardId } = req.body ?? {};
  if (!personId || !cardId) return bad(res, '사람과 카드를 알려 주세요');
  res.json(markOnboardingRead(sid(req), String(personId), String(cardId)));
}));
app.get('/api/stores/:id/briefing', route(async (req, res) => res.json(await flows.briefing(sid(req)))));
app.post('/api/stores/:id/ask', route(async (req, res) => {
  const { text, askerId, situationId } = req.body ?? {};
  if (!text?.trim() && !situationId) return bad(res, '질문이 비어 있어요');
  res.json(await flows.ask(sid(req), text ?? '', askerId || db.defaultPerson(sid(req), '신입'), situationId ? String(situationId) : undefined));
}));
app.post('/api/stores/:id/questions/:qid/feedback', route(async (req, res) => res.json(await flows.feedback(sid(req), String(req.params.qid), Boolean(req.body?.solved)))));
app.post('/api/stores/:id/questions/:qid/resolve', route(async (req, res) => {
  const { answer, managerId } = req.body ?? {};
  if (!answer?.trim()) return bad(res, '점장 답이 비어 있어요');
  res.json((await flows.resolve(sid(req), String(req.params.qid), answer, managerId || db.defaultPerson(sid(req), '점장'))).question);
}));
app.post('/api/stores/:id/record/interview', route(async (req, res) => {
  const { raw, authorId, answers } = req.body ?? {};
  if (!raw?.trim()) return bad(res, '기록이 비어 있어요');
  res.json(await flows.interview(sid(req), raw, authorId || db.defaultPerson(sid(req), '숙련'), answers ?? []));
}));
app.post('/api/stores/:id/cards', route(async (req, res) => {
  const { draft, authorId } = req.body ?? {};
  if (!draft?.title || !draft?.situation || !Array.isArray(draft?.actions)) return bad(res, '제목·상황·대응은 꼭 있어야 해요');
  res.json(await flows.submitCard(sid(req), draft, authorId || db.defaultPerson(sid(req), '숙련')));
}));
app.post('/api/stores/:id/cards/:cid/:action', route(async (req, res) => {
  const action = String(req.params.action);
  if (action === 'edit') return res.json(await flows.cardEdit(sid(req), String(req.params.cid), req.body?.edits, String(req.body?.editorId || db.defaultPerson(sid(req), '점장'))));
  if (!['approve', 'reject', 'renew', 'archive'].includes(action)) return bad(res, '알 수 없는 작업');
  res.json(await flows.cardAction(sid(req), String(req.params.cid), action as 'approve', req.body?.edits, req.body?.reason));
}));
app.get('/api/stores/:id/lint', route(async (req, res) => res.json(await flows.lint(sid(req)))));

// ---------- 공통 ----------

app.get('/api/graph', (req, res) => res.json(buildGraph(q(req.query.storeId))));
app.get('/api/harness', (_req, res) => res.json(config));
app.get('/api/runs/:id', (req, res) => {
  const r = bus.run(req.params.id);
  return r ? res.json(r) : res.status(404).json({ error: '실행 기록 없음' });
});

// 실시간 스트림: 최근 이벤트를 먼저 재생하고 이어서 새 이벤트를 보낸다. ?storeId면 그 매장 + 본사(storeId=null) 실행만
app.get('/api/stream', (req, res) => {
  const storeId = q(req.query.storeId);
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  res.flushHeaders();
  // 보낼 기록이 없어도 바로 한 줄 보낸다(Vite 프록시가 첫 ping까지 연결을 붙잡지 않게)
  res.write(': connected\n\n');
  const send = (e: RunEvent) => {
    if (bus.visibleTo(e, storeId)) res.write(`data: ${JSON.stringify(e)}\n\n`);
  };
  bus.replay().forEach(send);
  const off = bus.subscribe(send);
  const ping = setInterval(() => res.write('event: ping\ndata: \n\n'), 5000);
  req.on('close', () => {
    off();
    clearInterval(ping);
  });
});

app.post('/api/reset', route(async (_req, res) => {
  db.resetFromSeed();
  bus.clear();
  flows.clearCaches();
  await hq.warmup();
  res.json({ ok: true });
}));

// ---------- 화면 ----------
// 프론트를 빌드해 두면(frontend/dist) 이 서버 하나가 API와 화면을 함께 낸다(배포용). 화면을 고치며 보려면 frontend에서 npm run dev(5176)
const WEB_DIR = join(ROOT_DIR, 'frontend', 'dist');
const hasWeb = existsSync(join(WEB_DIR, 'index.html'));
if (hasWeb) {
  app.use(express.static(WEB_DIR));
  // 화면 주소(/store/S001/staff 등)를 새로고침해도 앱이 열리게 index.html을 돌려준다. 확장자가 있는 주소는 404로 둔다
  app.use((req, res, next) => (req.method === 'GET' && !req.path.startsWith('/api') && !/\.\w+$/.test(req.path) ? res.sendFile(join(WEB_DIR, 'index.html')) : next()));
}

app.use((err: Error & { status?: number }, _req: Request, res: Response, _next: NextFunction) => {
  if (!err.status) console.error(err);
  res.status(err.status ?? 500).json({ error: err.message });
});

if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
  const { fresh } = db.load();
  const PORT = Number(process.env.PORT) || 8788;
  app.listen(PORT, () => console.log(`윤슬 HQ ${hasWeb ? '화면+API' : '백엔드'} http://localhost:${PORT} (LLM: ${aiStatus.mode}${aiStatus.model ? ` · ${aiStatus.model}` : ''})`));
  // 처음 켜면 전 매장 채점과 위험 상위 매장 규칙 진단을 미리 해 둔다(대시보드가 비지 않게)
  if (fresh || !db.get().diagnoses.length) hq.warmup().then((ids) => console.log(`[warmup] 미리 진단한 매장 ${ids.length}곳`)).catch((e) => console.error('[warmup]', e));
}
