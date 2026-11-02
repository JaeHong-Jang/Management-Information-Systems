import cors from 'cors';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT_DIR } from './paths.js';
import express, { type NextFunction, type Request, type Response } from 'express';
import type { Metrics, Snapshot, Source } from '@shared/contracts';
import { config } from './harness/config.js';
import { status as aiStatus } from './harness/llm.js';
import { bus } from './harness/trace.js';
import * as flows from './flows/index.js';
import * as stock from './flows/stock.js';
import { inventoryIssues } from './agents/keeper.js';
import { isPlaying, playDay } from './demo.js';
import { isSimulating, recentVisits, visitMany } from './sim/customers.js';
import * as db from './store/db.js';
import { buildGraph } from './store/graph.js';

export const app = express();
app.use(cors());
app.use('/api/inventory/pos', express.json({ limit: '5mb' })); // CSV 파일을 base64로 받는다
app.use(express.json());

type Handler = (req: Request, res: Response) => unknown;
const route = (fn: Handler) => (req: Request, res: Response, next: NextFunction) => Promise.resolve(fn(req, res)).catch(next);
const bad = (res: Response, msg: string) => res.status(400).json({ error: msg });

// ---------- 조회 ----------

app.get('/api/state', (_req, res) => {
  const d = db.get();
  const snap: Snapshot = { store: d.store, topics: d.topics, people: d.people, cards: d.cards, questions: d.questions, topicSummaries: d.topicSummaries, log: d.log.slice(-40).reverse() };
  res.json({ ...snap, ai: aiStatus, demoPlaying: isPlaying(), simulating: isSimulating() });
});
app.get('/api/harness', (_req, res) => res.json(config));
app.get('/api/judge', (_req, res) => {
  const read = (f: string, d: unknown) => (existsSync(join(ROOT_DIR, 'docs', 'judge', f)) ? JSON.parse(readFileSync(join(ROOT_DIR, 'docs', 'judge', f), 'utf8')) : d);
  res.json({ rubric: read('rubric.json', { criteria: [], note: '' }), rounds: read('scores.json', { rounds: [] }).rounds });
});
app.get('/api/graph', (_req, res) => res.json(buildGraph()));
app.get('/api/runs/:id', (req, res) => {
  const r = bus.run(req.params.id);
  return r ? res.json(r) : res.status(404).json({ error: '실행 기록 없음' });
});

app.get('/api/metrics', (req, res) => {
  const d = db.get();
  // live: 시드 데이터를 빼고 이번 시연에서 생긴 것만 (시드 질문에는 runId가 없다)
  const live = req.query.scope === 'live';
  const approved = db.approvedCards().filter((c) => !live || c.origin !== '시드');
  const qs = d.questions.filter((q) => !live || q.runId);
  const withFb = qs.filter((q) => q.feedback);
  const contributors = new Map<string, Metrics['contributors'][number]>();
  for (const c of approved) {
    const key = c.credit === false ? 'anon' : c.authorId;
    const p = db.person(c.authorId);
    const row = contributors.get(key) ?? { personId: key, name: c.credit === false ? '이름 비공개 기여' : p ? `${p.name}(${p.role})` : c.authorId, cards: 0, helped: 0 };
    row.cards++;
    row.helped += c.helpful;
    contributors.set(key, row);
  }
  const days = new Map<string, { day: string; cards: number; questions: number }>();
  const bump = (day: string, k: 'cards' | 'questions') => {
    const row = days.get(day) ?? { day, cards: 0, questions: 0 };
    row[k]++;
    days.set(day, row);
  };
  approved.forEach((c) => bump(c.created, 'cards'));
  qs.forEach((q) => bump(q.time.slice(0, 10), 'questions'));
  const m: Metrics = {
    cards: approved.length,
    pending: d.cards.filter((c) => c.status === 'pending').length,
    bySource: { 공식규정: approved.filter((c) => c.source === '공식규정').length, 현장노하우: approved.filter((c) => c.source === '현장노하우').length } as Record<Source, number>,
    byTopic: d.topics.map((t) => ({ topic: t, n: approved.filter((c) => c.topic === t).length })),
    questions: qs.length,
    answeredByWiki: qs.filter((q) => q.status === 'answered').length,
    escalated: qs.filter((q) => q.status === 'escalated').length,
    resolvedToCards: qs.filter((q) => q.cardId).length,
    solvedRate: withFb.length ? Math.round((withFb.filter((q) => q.feedback === 'solved').length / withFb.length) * 100) : null,
    solvedN: withFb.filter((q) => q.feedback === 'solved').length,
    feedbackN: withFb.length,
    noFeedback: qs.filter((q) => q.status === 'answered' && !q.feedback).length,
    scope: live ? 'live' : 'all',
    totalReuse: live ? qs.reduce((s, q) => s + q.cited.length, 0) : approved.reduce((s, c) => s + c.uses, 0),
    reasonCoverage: approved.length ? Math.round((approved.filter((c) => c.reason.trim()).length / approved.length) * 100) : 0,
    contributors: [...contributors.values()].sort((a, b) => a.name.localeCompare(b.name, 'ko')), // 순위가 아니라 이름 순
    timeline: [...days.values()].sort((a, b) => a.day.localeCompare(b.day)),
  };
  res.json(m);
});

// 실시간 스트림: 지금까지의 최근 이벤트를 먼저 재생하고 이어서 새 이벤트를 보낸다.
app.get('/api/stream', (req, res) => {
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  res.flushHeaders();
  // 보낼 기록이 없어도 바로 한 줄 보낸다. 안 보내면 Vite 프록시가 첫 ping(5초)까지 연결을 붙잡아 화면이 '다시 연결하는 중'으로 남는다
  res.write(': connected\n\n');
  const send = (e: unknown) => res.write(`data: ${JSON.stringify(e)}\n\n`);
  bus.replay().forEach(send);
  const off = bus.subscribe(send);
  // 화면이 받을 수 있는 이벤트로 보낸다. 화면은 이것이 끊기면 연결이 죽은 것으로 보고 다시 연다
  const ping = setInterval(() => res.write('event: ping\ndata: \n\n'), 5000);
  req.on('close', () => {
    off();
    clearInterval(ping);
  });
});

// ---------- 흐름 ----------

app.post('/api/ask', route(async (req, res) => {
  const { text, askerId } = req.body ?? {};
  if (!text?.trim()) return bad(res, '질문이 비어 있습니다');
  res.json(await flows.ask(text, askerId || 'P005'));
}));

app.post('/api/questions/:id/feedback', route(async (req, res) => res.json(await flows.feedback(String(req.params.id), Boolean(req.body?.solved)))));

app.post('/api/questions/:id/resolve', route(async (req, res) => {
  const { answer, managerId } = req.body ?? {};
  if (!answer?.trim()) return bad(res, '점장 답이 비어 있습니다');
  res.json(await flows.resolve(String(req.params.id), answer, managerId || 'P001'));
}));

app.post('/api/record/interview', route(async (req, res) => {
  const { raw, authorId, answers } = req.body ?? {};
  if (!raw?.trim()) return bad(res, '기록이 비어 있습니다');
  res.json(await flows.interview(raw, authorId || 'P002', answers ?? []));
}));

app.post('/api/cards', route(async (req, res) => {
  const { draft, authorId } = req.body ?? {};
  if (!draft?.title || !draft?.situation || !Array.isArray(draft?.actions)) return bad(res, '제목·상황·대응은 꼭 있어야 합니다');
  res.json(await flows.submitCard(draft, authorId || 'P002'));
}));

app.post('/api/cards/:id/:action', route(async (req, res) => {
  const action = String(req.params.action);
  if (!['approve', 'reject', 'renew', 'archive'].includes(action)) return bad(res, '알 수 없는 작업');
  res.json(await flows.cardAction(String(req.params.id), action as 'approve', req.body?.edits, req.body?.reason));
}));

app.get('/api/lint', route(async (req, res) => res.json(await flows.lint(req.query.quiet === '1'))));


// ---------- 재고·발주 ----------

app.get('/api/inventory', (_req, res) => res.json(stock.view()));
// 재고 화면용 점검: 규칙만 쓰므로 AI 모순 검사(/api/lint)를 기다리지 않는다
app.get('/api/inventory/issues', (_req, res) => res.json(inventoryIssues()));

app.post('/api/inventory/pos', route(async (req, res) => {
  const { file, base64, actorId } = req.body ?? {};
  if (!base64) return bad(res, '파일이 비어 있습니다');
  res.json(await stock.posImport(String(file || 'pos.csv'), Buffer.from(String(base64), 'base64'), actorId || 'P001'));
}));

app.post('/api/inventory/pos/sample', route(async (req, res) => res.json(await stock.posImportSample(req.body?.actorId || 'P001'))));

app.post('/api/inventory/stocktake', route(async (req, res) => {
  const { counts, byId } = req.body ?? {};
  if (!Array.isArray(counts) || !counts.length) return bad(res, '센 품목이 없습니다');
  res.json(await stock.stocktake(counts.map((c: { itemId: string; counted: unknown }) => ({ itemId: String(c.itemId), counted: Number(c.counted) })), byId || 'P002'));
}));
app.post('/api/inventory/stocktake/explain', route(async (req, res) => {
  const { itemId, reason, managerId } = req.body ?? {};
  res.json(await stock.explainStock(String(itemId), String(reason ?? ''), managerId || 'P001'));
}));
app.post('/api/inventory/recipes/approve', route(async (req, res) => res.json(await stock.approveRecipe(String(req.body?.menu ?? ''), req.body?.lines))));
app.post('/api/inventory/adjustments/:id/:action', route(async (req, res) => {
  const action = String(req.params.action);
  if (!['approve', 'reject'].includes(action)) return bad(res, '알 수 없는 작업');
  res.json(await stock.adjustmentAction(String(req.params.id), action as 'approve'));
}));
app.post('/api/inventory/orders/:id/:action', route(async (req, res) => {
  const action = String(req.params.action);
  if (!['send', 'receive'].includes(action)) return bad(res, '알 수 없는 작업');
  res.json(await stock.orderAction(String(req.params.id), action as 'send'));
}));
app.patch('/api/inventory/items/:id', route((req, res) => res.json(stock.updateItem(String(req.params.id), req.body ?? {}))));

// ---------- 시연 ----------

app.post('/api/demo/play', (_req, res) => {
  if (isPlaying()) return bad(res, '이미 재생 중입니다');
  playDay().catch((e) => console.error('[demo]', e));
  res.json({ ok: true });
});

// 가상 손님: 페르소나 손님을 들여보내 신입 질문 흐름을 실제로 돌린다
app.get('/api/sim/visits', (_req, res) => res.json({ visits: recentVisits(), simulating: isSimulating() }));
app.post('/api/sim/customers', (req, res) => {
  if (isPlaying() || isSimulating()) return bad(res, '이미 시연이나 가상 손님이 진행 중입니다');
  const n = Math.min(Math.max(Number(req.body?.n) || 1, 1), 10);
  visitMany(n).catch((e) => console.error('[sim]', e));
  res.json({ ok: true, n });
});

app.post('/api/reset', route(async (_req, res) => {
  if (isPlaying() || isSimulating()) return bad(res, '시연 재생 중에는 초기화할 수 없습니다');
  db.resetFromSeed();
  bus.clear();
  // 로컬 AI면 요약에 몇 분이 걸려 초기화 응답을 막지 않는다
  if (aiStatus.mode === 'ollama') seedSummaries().catch((e) => console.error('[seed]', e));
  else await seedSummaries();
  res.json({ ok: true });
}));

// ---------- 화면 ----------
// 프론트를 빌드해 두면(frontend/dist) 이 서버 하나가 API와 화면을 함께 낸다. 화면 코드를 고치며 바로 보려면 frontend에서 npm run dev(5173)
const WEB_DIR = join(ROOT_DIR, 'frontend', 'dist');
const hasWeb = existsSync(join(WEB_DIR, 'index.html'));
if (hasWeb) {
  app.use(express.static(WEB_DIR));
  // 화면 주소(/inventory 등)를 새로고침해도 앱이 열리게 index.html을 돌려준다
  // 확장자가 있는 주소(없는 .js 등)는 404로 둔다
  app.use((req, res, next) => (req.method === 'GET' && !req.path.startsWith('/api') && !/\.\w+$/.test(req.path) ? res.sendFile(join(WEB_DIR, 'index.html')) : next()));
}

app.use((err: Error & { status?: number }, _req: Request, res: Response, _next: NextFunction) => {
  if (!err.status) console.error(err);
  res.status(err.status ?? 500).json({ error: err.message });
});

async function seedSummaries() {
  const { synthesizer, linter } = await import('./agents/keeper.js');
  const d = db.get();
  // 시작할 때 상충·중복 표시를 미리 계산해 둔다(상충한 현장노하우는 답의 근거에서 빠진다)
  d.links = (await linter()).out.links;
  for (const t of d.topics) d.topicSummaries[t] = (await synthesizer(t, db.approvedCards().filter((c) => c.topic === t))).out;
  db.save();
}

if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
  db.load();
  stock.refreshDrafts();
  const PORT = Number(process.env.PORT) || 8787;
  app.listen(PORT, () =>
    console.log(`윤슬 ${hasWeb ? '화면+API' : 'API'} http://localhost:${PORT} (LLM: ${aiStatus.mode}${aiStatus.model ? ` · ${aiStatus.model}` : ''})${hasWeb ? '' : ' · 화면은 frontend에서 npm run build 후 다시 시작'}`),
  );
  // 로컬 AI는 요약 7개에 몇 분이 걸린다. 서버를 먼저 열고 요약은 뒤에서 채운다
  if (!Object.keys(db.get().topicSummaries).length || !db.get().links.length) seedSummaries().catch((e) => console.error('[seed]', e));
}
