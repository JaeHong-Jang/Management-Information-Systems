// 재고 흐름: POS 판매 반영 · 마감 재고 실사 · 실사 차이 이유 → 카드 · 소모량/보정 승인 · 주문 보냄/입고
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DATA_DIR } from '../paths.js';
import type { Adjustment, Order, PosImportResult, RecipeLine } from '@shared/contracts';
import { config } from '../harness/config.js';
import { Run } from '../harness/runner.js';
import { demandAnalyst, orderClerk, posReader, recipeWriter } from '../agents/stock.js';
import { adjustmentChecker, wordingGuard } from '../agents/verify.js';
import { linter } from '../agents/keeper.js';
import { cardWriter, privacyGuard } from '../agents/capture.js';
import { bookStockAt, countGap, draftOrders, inventoryView, lastCount, round1, usage } from '../inventory/calc.js';
import * as db from '../store/db.js';
import { cardEdges, cardNode, edge, itemNodes, personNode, sourceNode, topicNode } from '../store/graph.js';
import { cardText, orchestrate, resynthesize } from './index.js';

const STOCK_TOPIC = '재고·발주';
const bad = (msg: string) => Object.assign(new Error(msg), { status: 400 });

export const view = () => inventoryView(db.inventory(), db.usableCards().usable, db.today());

/** 오늘 주문서 초안을 다시 만든다(보낸 주문·입고된 주문은 그대로 둔다) */
function redraft(): Order[] {
  const inv = db.inventory();
  inv.orders = inv.orders.filter((o) => o.status !== 'draft');
  let n = Number(db.nextId('O', inv.orders).slice(1));
  const drafts = draftOrders(view().items, db.today(), () => `O${String(n++).padStart(3, '0')}`);
  inv.orders.push(...drafts);
  return drafts;
}

/** 기준값이 바뀌거나 서버가 다시 켜질 때 주문서 초안을 지금 숫자로 맞춘다 */
export function refreshDrafts() {
  if (!db.inventory().items.length) return;
  redraft();
  db.save();
}

async function clerk(run: Run): Promise<Order[]> {
  return run.step('order-clerk', () => orderClerk(redraft(), view().items));
}

const dueNodes = () => itemNodes(view().items.filter((s) => s.level !== 'ok').map((s) => s.item.id));

// ---------- POS 판매 반영 ----------

export const SAMPLE_POS = '포차달빛_메뉴별매출_2026-10-24_10-30.csv';
/** 시연용: 저장소에 든 가상 POS 파일(이번 주 판매)을 올린다. 날짜는 시드처럼 실제 오늘에 맞춰 옮긴다 */
export const posImportSample = (actorId: string) =>
  posImport(db.demoShift(SAMPLE_POS), new TextEncoder().encode(db.demoShift(readFileSync(join(DATA_DIR, 'pos', SAMPLE_POS), 'utf8'))), actorId);

export async function posImport(file: string, bytes: Uint8Array, actorId: string): Promise<PosImportResult> {
  const inv = db.inventory();
  const run = new Run('pos', db.personLabel(actorId), file);
  await orchestrate(run, file);
  const parsed = await run.step('pos-reader', () => posReader(bytes, inv.recipes.map((r) => r.menu)));
  if (!parsed.sales.length) {
    run.end(false, '읽을 판매 기록이 없음');
    throw bad('파일에서 판매 기록을 읽지 못했어요');
  }
  // 같은 날짜가 다시 올라오면 그 날짜는 새 파일로 바꾼다(두 번 올려도 두 배가 되지 않게)
  const days = new Set(parsed.days);
  inv.sales = [...inv.sales.filter((s) => !days.has(s.date)), ...parsed.sales];
  const imp = { id: db.nextId('U', inv.imports), at: db.now(), file, rows: parsed.rows, days: parsed.days, unknownMenus: parsed.unknownMenus };
  inv.imports.push(imp);
  run.wiki({ op: 'POS 판매 반영', detail: `${file} · ${parsed.days[0]}~${parsed.days.at(-1)} · ${parsed.rows}줄`, nodes: [], edges: [] });

  const newRecipes = await run.step('recipe-writer', () => recipeWriter(parsed.unknownMenus, inv.items, inv.recipes));
  inv.recipes.push(...newRecipes);
  if (newRecipes.length) run.wiki({ op: '소모량 초안', detail: `${newRecipes.map((r) => r.menu).join(', ')} (점장 승인 대기)`, nodes: [], edges: [] });

  const usable = db.usableCards().usable;
  const proposals = await run.step('demand-analyst', () => demandAnalyst(view(), usable, inv.adjustments));
  const via = run.steps.find((s) => s.agentId === 'demand-analyst')?.via ?? 'rules';
  const checked = await run.step('citation-checker', () => adjustmentChecker(proposals, usable, new Set(inv.items.map((i) => i.id)), inv.events));
  run.gate('adjust-gate', checked.problems, config.gates.find((g) => g.id === 'adjust-gate')!.onFail);
  const added: Adjustment[] = checked.kept.map((p) => {
    const a: Adjustment = { ...p, id: db.nextId('A', inv.adjustments), status: 'pending', via };
    inv.adjustments.push(a);
    return a;
  });
  if (added.length) {
    const cards = [...new Set(added.map((a) => a.cardId))].map((id) => db.card(id)!);
    run.wiki({
      op: '보정 제안',
      detail: [...new Set(added.map((a) => `${a.reason} ×${a.factor} [${a.cardId}]`))].join(', '),
      nodes: [...cards.map(cardNode), ...itemNodes(added.map((a) => a.itemId))],
      edges: added.map((a) => edge(a.cardId, a.itemId, 'stocks')),
    });
  }

  const orders = await clerk(run);
  run.wiki({ op: '주문서 초안', detail: orders.length ? orders.map((o) => `${o.supplier} ${o.lines.length}품목`).join(', ') : '오늘 주문할 품목 없음', nodes: dueNodes(), edges: [] });
  run.end(true, `판매 ${parsed.rows}줄 반영 · 소모량 초안 ${newRecipes.length} · 보정 제안 ${added.length} · 주문서 ${orders.length}장`);
  return { import: imp, newRecipes, proposals: added, orders, runId: run.runId };
}

// ---------- 마감 재고 실사 ----------

export async function stocktake(counts: { itemId: string; counted: number }[], byId: string) {
  const inv = db.inventory();
  const today = db.today();
  const valid = counts.filter((c) => db.item(c.itemId) && Number.isFinite(c.counted) && c.counted >= 0);
  if (!valid.length) throw bad('센 품목이 없어요');
  const run = new Run('stocktake', db.personLabel(byId), `${valid.length}개 품목`);
  await orchestrate(run, `${valid.length}개 품목`);
  const use = usage(inv);
  const at = db.stamp();
  const rows = valid.map(({ itemId, counted }) => {
    const row = { date: today, itemId, counted, expected: round1(bookStockAt(inv, use, itemId, today, at)), by: byId, at };
    inv.stocktakes = inv.stocktakes.filter((s) => !(s.itemId === itemId && s.date === today));
    inv.stocktakes.push(row);
    return row;
  });
  run.wiki({
    op: '마감 재고 실사',
    detail: rows.map((r) => `${db.item(r.itemId)!.name} ${r.counted}(계산 ${r.expected})`).join(', '),
    nodes: itemNodes(rows.map((r) => r.itemId)),
    edges: [],
  });
  const orders = await clerk(run);
  const { issues, links } = await run.step('linter', () => linter());
  db.get().links = links;
  const diffs = issues.filter((i) => i.kind === '재고 차이');
  run.end(true, diffs.length ? `차이 큰 품목 ${diffs.length}개 → 점장 할 일` : '계산과 실사가 비슷해요');
  return { stocktakes: rows, issues: diffs, orders };
}

/** 점장이 남긴 실사 차이 이유를 재고·발주 카드로 만든다. 다음 차이 점검에서 '지난번 이유'로 보인다. */
export async function explainStock(itemId: string, reason: string, managerId: string) {
  const it = db.item(itemId);
  const last = lastCount(db.inventory(), itemId);
  if (!it || !last) throw bad('실사 기록을 찾을 수 없어요');
  if (!reason.trim()) throw bad('이유를 적어 주세요');
  const diff = countGap(db.inventory(), usage(db.inventory()), last)?.diff ?? round1(last.counted - last.expected);
  const run = new Run('resolve', db.personLabel(managerId), reason);
  await orchestrate(run, `${it.name} 실사 차이 이유를 사례로`);
  const raw = `${it.name} 마감 실사가 계산보다 ${Math.abs(diff)}${it.unit} ${diff < 0 ? '적었다' : '많았다'}. ${reason}`;
  const safe = await run.step('privacy-guard', () => privacyGuard(raw));
  const draft = await run.step('card-writer', () => cardWriter(safe.text, [], db.get().topics));
  const fields = { ...draft, topic: STOCK_TOPIC, title: `${it.name} 실사 차이: ${reason.slice(0, 22)}`, situation: `마감 실사에서 ${it.name}이 계산보다 ${Math.abs(diff)}${it.unit} ${diff < 0 ? '적음' : '많음'}`, reason: draft.reason || reason, itemIds: [itemId] };
  const words = await run.step('wording-guard', () => wordingGuard(cardText(fields)));
  const c = db.createCard(fields, managerId, words.length ? 'pending' : 'approved', '기록');
  last.cardId = c.id;
  run.wiki({ op: '실사 차이 → 새 카드', detail: `${it.name} ${diff}${it.unit} → [${c.id}]`, nodes: [personNode(db.person(managerId)!), cardNode(c), topicNode(c.topic), sourceNode(c.source), ...itemNodes([itemId])], edges: cardEdges(c) });
  if (c.status === 'approved') await resynthesize(run, c.topic);
  run.end(true, `[${c.id}] ${c.status === 'approved' ? '카드가 됐어요' : '표현 확인 필요 → 승인 대기'}`);
  return c;
}

// ---------- 점장 승인 · 주문 ----------

export async function approveRecipe(menu: string, lines?: RecipeLine[]) {
  const inv = db.inventory();
  const r = inv.recipes.find((x) => x.menu === menu);
  if (!r) throw bad('메뉴를 찾을 수 없어요');
  if (lines) r.lines = lines.filter((l) => db.item(l.itemId) && l.qty > 0 && l.qty <= 10).map((l) => ({ itemId: l.itemId, qty: Number(l.qty) }));
  if (!r.lines.length) throw bad('재료를 하나 이상 넣어 주세요');
  const run = new Run('stockapprove', '점장', `${menu} 소모량 승인`);
  await orchestrate(run, `${menu} 소모량 승인`);
  r.status = 'approved';
  run.wiki({ op: '소모량 승인', detail: `${menu}: ${r.lines.map((l) => `${db.item(l.itemId)!.name} ${l.qty}`).join(' + ')}`, nodes: itemNodes(r.lines.map((l) => l.itemId)), edges: [] });
  await clerk(run);
  run.end(true, `${menu} 판매가 사용량에 들어갑니다`);
  return r;
}

export async function adjustmentAction(id: string, action: 'approve' | 'reject') {
  const a = db.inventory().adjustments.find((x) => x.id === id);
  if (!a) throw bad('보정 제안을 찾을 수 없어요');
  const label = action === 'approve' ? '승인' : '반려';
  const run = new Run('stockapprove', '점장', `보정 ${id} ${label}`);
  await orchestrate(run, `${a.reason} ×${a.factor} ${label}`);
  a.status = action === 'approve' ? 'approved' : 'rejected';
  run.wiki({ op: `보정 ${label}`, detail: `${db.item(a.itemId)?.name} ${a.from}~${a.to} ×${a.factor} [${a.cardId}]`, nodes: itemNodes([a.itemId]), edges: [edge(a.cardId, a.itemId, 'stocks')] });
  await clerk(run);
  run.end(true, `보정 ${label}`);
  return a;
}

export async function orderAction(id: string, action: 'send' | 'receive') {
  const inv = db.inventory();
  const o = inv.orders.find((x) => x.id === id);
  if (!o) throw bad('주문서를 찾을 수 없어요');
  if (action === 'send' && o.status !== 'draft') throw bad('초안만 보낼 수 있어요');
  if (action === 'receive' && o.status === 'received') throw bad('이미 입고 확인했어요');
  const label = action === 'send' ? '주문 보냄' : '입고 확인';
  const run = new Run('stockapprove', '점장', `${o.supplier} ${label}`);
  await orchestrate(run, `${o.supplier} ${label}`);
  if (action === 'send') {
    o.status = 'sent';
    o.date = db.today();
  } else {
    o.status = 'received';
    // 시각을 남겨 두어 오늘 마감 실사 뒤에 받은 물량이 내일 재고로 잡히게 한다
    for (const l of o.lines) inv.deliveries.push({ date: db.today(), itemId: l.itemId, qty: l.qty, orderId: o.id, at: db.stamp() });
  }
  run.wiki({ op: label, detail: `${o.supplier}: ${o.lines.map((l) => `${db.item(l.itemId)?.name} ${l.packs}${db.item(l.itemId)?.packLabel}`).join(', ')}`, nodes: itemNodes(o.lines.map((l) => l.itemId)), edges: [] });
  await clerk(run);
  run.end(true, label);
  return o;
}

export function updateItem(id: string, patch: { reorderPoint?: number; par?: number; leadDays?: number }) {
  const it = db.item(id);
  if (!it) throw bad('품목을 찾을 수 없어요');
  const num = (v: unknown, min: number) => (v === undefined || v === null || v === '' ? undefined : Number.isFinite(Number(v)) && Number(v) >= min ? Number(v) : NaN);
  const next = { reorderPoint: num(patch.reorderPoint, 0), par: num(patch.par, 1), leadDays: num(patch.leadDays, 0) };
  if (Object.values(next).some((v) => Number.isNaN(v))) throw bad('숫자를 확인해 주세요');
  const changed = Object.entries(next).filter(([, v]) => v !== undefined) as [keyof typeof next, number][];
  if ((next.par ?? it.par) < (next.reorderPoint ?? it.reorderPoint)) throw bad('적정량은 발주점보다 커야 해요');
  for (const [k, v] of changed) it[k] = k === 'leadDays' ? Math.round(v) : v;
  db.addLog('재고 기준 수정', `${it.name}: ${changed.map(([k, v]) => `${{ reorderPoint: '발주점', par: '적정량', leadDays: '리드타임' }[k]} ${v}`).join(', ')}`);
  refreshDrafts();
  return it;
}
