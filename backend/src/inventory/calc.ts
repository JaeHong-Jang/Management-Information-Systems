// 재고 계산. 모두 규칙이다(같은 입력이면 같은 숫자). 날짜는 매장 기준일 기준 'YYYY-MM-DD'.
// 실사는 그날 마감 후 센 값, 입고는 그날 영업 전에 도착한 것으로 본다.
import type { Adjustment, Card, Inventory, InventoryView, Item, ItemStatus, Order, StockLevel, Stocktake } from '@shared/contracts';

export const WINDOW = 28; // 요일별 평균을 내는 기간
export const HORIZON = 14; // 화면에 보여 주는 예측 기간
export const DIFF_RATIO = 0.1; // 실사 차이: 주간 평균 사용량의 10% 이상이면 점장 할 일
export const DRIFT_RATIO = 0.3; // 사용량 이탈: 최근 7일이 기대치와 30% 이상 다르면 점장 할 일

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
const dayDiff = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
export const weekday = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay(); // 0 = 일요일
const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0);
export const round1 = (n: number) => Math.round(n * 10) / 10;

export type Usage = Map<string, Map<string, number>>; // 품목 → 날짜 → 사용량

/** POS 판매 × 승인된 메뉴별 소모량. 승인 전 메뉴는 넣지 않는다. */
export function usage(inv: Inventory): Usage {
  const recipes = new Map(inv.recipes.filter((r) => r.status === 'approved').map((r) => [r.menu, r.lines]));
  const out: Usage = new Map();
  for (const s of inv.sales) {
    for (const l of recipes.get(s.menu) ?? []) {
      const m = out.get(l.itemId) ?? new Map<string, number>();
      out.set(l.itemId, m);
      m.set(s.date, (m.get(s.date) ?? 0) + s.qty * l.qty);
    }
  }
  return out;
}

/** 판매 기록이 있는 날(영업일). 판매가 없는 날은 0이 아니라 '자료 없음'으로 본다. */
export const salesDates = (inv: Inventory) => new Set(inv.sales.map((s) => s.date));

/** from~to(포함) 사이 같은 요일 평균. 0 = 일요일.
 * 같은 요일 자료가 2개 미만이면 전체 일평균을 쓰되, 판매 기록이 있는 기간에 그 요일이 두 번 이상 지나갔는데 한 번도 안 팔렸으면 쉬는 요일(0)로 본다. */
export function weekdayAvg(day: Map<string, number> | undefined, open: Set<string>, from: string, to: string): number[] {
  const buckets: number[][] = Array.from({ length: 7 }, () => []);
  const opened: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1))
    if (open.has(d)) {
      buckets[weekday(d)].push(day?.get(d) ?? 0);
      opened.push(d);
    }
  const all = buckets.flat();
  const mean = all.length ? sum(all) / all.length : 0;
  const passed = Array(7).fill(0);
  if (opened.length) for (let d = opened[0]; d <= opened.at(-1)!; d = addDays(d, 1)) passed[weekday(d)]++;
  return buckets.map((b, w) => (b.length >= 2 ? sum(b) / b.length : b.length === 0 && passed[w] >= 2 ? 0 : mean));
}

/** 그 날짜에 걸린 승인 보정 배수(여러 개면 곱한다) */
export function factorOn(itemId: string, date: string, adjustments: Adjustment[]): number {
  return adjustments.filter((a) => a.status === 'approved' && a.itemId === itemId && a.from <= date && date <= a.to).reduce((f, a) => f * a.factor, 1);
}

export const lastCount = (inv: Inventory, itemId: string, before?: string): Stocktake | null =>
  inv.stocktakes.filter((s) => s.itemId === itemId && (!before || s.date < before)).sort((a, b) => a.date.localeCompare(b.date)).at(-1) ?? null;

/** 실사 c 뒤에 들어온 입고인가. 같은 날이면 기록 시각으로 앞뒤를 가린다(마감 실사 뒤 입고 확인은 다음 영업에 쓰인다) */
const afterCount = (x: { date: string; at?: string }, c: Stocktake | null) => !c || x.date > c.date || (x.date === c.date && !!x.at && !!c.at && x.at > c.at);

/** 실사 c 다음 날부터 to(포함)까지 쓴 양. 마지막 판매일 뒤(POS 미반영) 날은 요일별 평균 × 보정으로 추정하고, 판매 기록 기간 안의 빈 날은 쉬는 날(0)로 본다 */
function usedSince(itemId: string, inv: Inventory, use: Usage, open: Set<string>, avg: number[], c: Stocktake | null, to: string) {
  const day = use.get(itemId);
  if (!c) return { qty: sum([...(day ?? new Map<string, number>())].filter(([d]) => d <= to).map(([, q]) => q)), estimated: 0 };
  const lastSale = [...open].sort().at(-1);
  let qty = 0;
  let estimated = 0;
  for (let d = addDays(c.date, 1); d <= to; d = addDays(d, 1)) {
    if (open.has(d)) qty += day?.get(d) ?? 0;
    else if (!lastSale || d > lastSale) {
      qty += avg[weekday(d)] * factorOn(itemId, d, inv.adjustments);
      estimated++;
    }
  }
  return { qty, estimated };
}

/** date 마감 때의 계산 재고: 그 전 마지막 실사 + 그 뒤 입고 − 그 뒤 사용량(date 포함). cutoffAt을 주면 그 시각 뒤 같은 날 입고는 뺀다 */
export function bookStockAt(inv: Inventory, use: Usage, itemId: string, date: string, cutoffAt?: string): number {
  const c = lastCount(inv, itemId, date);
  const open = salesDates(inv);
  const avg = weekdayAvg(use.get(itemId), open, addDays(date, -WINDOW), addDays(date, -1));
  const delivered = sum(
    inv.deliveries.filter((x) => x.itemId === itemId && afterCount(x, c) && (x.date < date || (x.date === date && !(cutoffAt && x.at && x.at > cutoffAt)))).map((x) => x.qty),
  );
  return (c?.counted ?? 0) + delivered - usedSince(itemId, inv, use, open, avg, c, date).qty;
}

/** 실사 s가 그때의 계산과 얼마나 다른가. 앞선 실사가 없으면 비교할 기준이 없어 null. 나중에 그날 POS를 올리면 다시 계산된다 */
export function countGap(inv: Inventory, use: Usage, s: Stocktake): { expected: number; diff: number } | null {
  if (!lastCount(inv, s.itemId, s.date)) return null;
  const expected = round1(bookStockAt(inv, use, s.itemId, s.date, s.at));
  return { expected, diff: round1(s.counted - expected) };
}

/** 품목 하나의 상태: 지금 재고, 요일별 평균, 14일 예측, 남은 일수, 주문일, 권장 주문량 */
export function itemStatus(item: Item, inv: Inventory, use: Usage, open: Set<string>, today: string, cards: Card[] = []): ItemStatus {
  const day = use.get(item.id);
  const count = lastCount(inv, item.id);
  // 오늘 마감 실사가 이미 있으면 예측은 내일부터 시작한다
  const start = count && count.date >= today ? addDays(count.date, 1) : today;
  const offset = dayDiff(today, start);
  const byWeekday = weekdayAvg(day, open, addDays(today, -WINDOW), addDays(today, -1));
  const c = lastCount(inv, item.id, start);
  const delivered = sum(inv.deliveries.filter((x) => x.itemId === item.id && afterCount(x, c) && x.date <= start).map((x) => x.qty));
  const used = usedSince(item.id, inv, use, open, byWeekday, c, addDays(start, -1));
  const stock = (c?.counted ?? 0) + delivered - used.qty;
  const recent: ItemStatus['recent'] = [];
  for (let d = addDays(today, -WINDOW); d < today; d = addDays(d, 1)) if (open.has(d)) recent.push({ date: d, qty: round1(day?.get(d) ?? 0) });
  const dailyAvg = recent.length ? sum(recent.map((r) => r.qty)) / recent.length : 0;

  // 권장량 계산에는 도착 후 7일까지 필요해서 길게 예측하고 화면에는 14일만 보낸다
  const long = Array.from({ length: HORIZON + item.leadDays + 7 }, (_, i) => {
    const date = addDays(start, i);
    const factor = factorOn(item.id, date, inv.adjustments);
    return { date, qty: byWeekday[weekday(date)] * factor, factor };
  });

  // 보낸 주문은 리드타임 뒤 도착한다고 보고 예측에 넣는다(늦어진 주문은 오늘 도착으로)
  const incoming = inv.orders
    .filter((o) => o.status === 'sent')
    .flatMap((o) => o.lines.filter((l) => l.itemId === item.id).map((l) => ({ date: addDays(o.date, item.leadDays), qty: l.qty, orderId: o.id })));
  const arriving = (i: number) => sum(incoming.filter((x) => (i === 0 ? x.date <= start : x.date === addDays(start, i))).map((x) => x.qty));

  let daysLeft: number | null = null;
  let rem = stock + arriving(0);
  for (let i = 0; i < HORIZON; i++) {
    if (rem <= 0 || rem < long[i].qty) {
      daysLeft = round1(i + Math.max(rem, 0) / (long[i].qty || 1));
      break;
    }
    rem -= long[i].qty;
    rem += arriving(i + 1);
  }

  const openStock = [stock + arriving(0)];
  for (let i = 1; i < long.length; i++) openStock.push(openStock[i - 1] - long[i - 1].qty + arriving(i));
  // 주문 여부는 재고 위치(지금 재고 + 보냈지만 아직 안 온 주문)로 판단한다. 이미 보낸 주문을 또 내라고 하지 않게
  const arrivalIdx = incoming.map((x) => ({ i: Math.max(0, dayDiff(start, x.date)), qty: x.qty }));
  const position = (i: number) => openStock[i] + sum(arrivalIdx.filter((x) => x.i > i).map((x) => x.qty));
  const idx = openStock.slice(0, HORIZON).findIndex((_, i) => position(i) <= item.reorderPoint);
  // 오늘 마감 실사로 예측이 내일부터 시작해도(offset 1), 내일 영업 시작에 발주점 아래면 지금(오늘) 주문한다
  const orderInDays = idx < 0 ? null : idx === 0 ? 0 : idx + offset;
  // 도착일(예측 시작일 기준 칸): 오늘 주문하면 리드타임에서 이미 지난 하루를 뺀다
  const arriveAt = idx === 0 ? Math.max(0, item.leadDays - offset) : idx + item.leadDays;

  let suggestPacks = 0;
  if (idx >= 0) {
    // 적정량에 도착 후 7일 안의 보정으로 늘어나는 사용량만큼 더한다(축제 이틀 ×1.5면 그 이틀의 늘어난 양만)
    const arrival = arriveAt;
    const extra = sum(long.slice(arrival, arrival + 7).map((f) => (f.factor > 1 ? f.qty * (1 - 1 / f.factor) : 0)));
    const need = item.par + extra - Math.max(openStock[arrival] ?? 0, 0);
    suggestPacks = Math.max(1, Math.ceil(need / item.pack));
  }

  const level: StockLevel =
    orderInDays === 0 && daysLeft !== null && daysLeft < arriveAt ? 'out' : orderInDays === 0 ? 'today' : orderInDays !== null && orderInDays <= 3 ? 'soon' : 'ok';

  return {
    item,
    stock: round1(stock),
    level,
    daysLeft,
    orderInDays,
    orderDate: orderInDays === null ? null : addDays(today, orderInDays),
    suggestPacks,
    dailyAvg: round1(dailyAvg),
    byWeekday: byWeekday.map(round1),
    recent,
    forecast: long.slice(0, HORIZON).map((f) => ({ ...f, qty: round1(f.qty) })),
    lastCount: count,
    incoming,
    estimatedDays: used.estimated,
    closing: round1(bookStockAt(inv, use, item.id, today)),
    suggested: { reorderPoint: Math.ceil(dailyAvg * (item.leadDays + 1)), par: Math.ceil(dailyAvg * 7) },
    activeAdjustments: inv.adjustments.filter((a) => a.status === 'approved' && a.itemId === item.id && a.to >= today),
    cardIds: cards.filter((x) => x.itemIds?.includes(item.id)).map((x) => x.id),
  };
}

/** 최근 7일 실제 사용량이 그 전 3주 요일별 평균(보정 포함) 기대치와 30% 이상 다르면 돌려준다 */
export function drift(item: Item, inv: Inventory, use: Usage, open: Set<string>, today: string): { actual: number; expected: number } | null {
  const day = use.get(item.id);
  const base = weekdayAvg(day, open, addDays(today, -WINDOW), addDays(today, -8));
  let actual = 0;
  let expected = 0;
  for (let d = addDays(today, -7); d < today; d = addDays(d, 1)) {
    if (!open.has(d)) continue;
    actual += day?.get(d) ?? 0;
    expected += base[weekday(d)] * factorOn(item.id, d, inv.adjustments);
  }
  if (expected < 1 || Math.abs(actual - expected) / expected < DRIFT_RATIO) return null;
  return { actual: round1(actual), expected: round1(expected) };
}

/** 실사 차이가 점장이 볼 만큼 큰가: 주간 평균 사용량의 10% 이상(최소 1) */
export const bigDiff = (diff: number, dailyAvg: number) => Math.abs(diff) >= Math.max(1, dailyAvg * 7 * DIFF_RATIO);

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/** 오늘 주문할 품목(오늘·도착 전 바닥)을 거래처별 주문서 초안으로 묶는다. 실제 주문은 사람이 보낸다. */
export function draftOrders(statuses: ItemStatus[], today: string, nextId: () => string): Order[] {
  const due = statuses.filter((s) => s.level === 'today' || s.level === 'out');
  const bySupplier = new Map<string, ItemStatus[]>();
  for (const s of due) bySupplier.set(s.item.supplier, [...(bySupplier.get(s.item.supplier) ?? []), s]);
  return [...bySupplier].map(([supplier, list]) => ({
    id: nextId(),
    supplier,
    date: today,
    status: 'draft' as const,
    lines: list.map((s) => ({
      itemId: s.item.id,
      packs: s.suggestPacks,
      qty: s.suggestPacks * s.item.pack,
      why: [
        `남은 양 ${fmt(s.stock)}${s.item.unit}`,
        s.daysLeft === null ? '' : `약 ${fmt(s.daysLeft)}일분`,
        `발주점 ${s.item.reorderPoint}${s.item.unit} 이하`,
        s.level === 'out' ? `도착(${s.item.leadDays}일) 전에 바닥날 수 있음` : '',
        ...s.activeAdjustments.map((a) => `${a.reason} ×${a.factor} [${a.cardId}]`),
      ].filter(Boolean).join(' · '),
    })),
  }));
}

/** 화면과 질문 답에 쓰는 재고 전체 보기 */
export function inventoryView(inv: Inventory, cards: Card[], today: string): InventoryView {
  const use = usage(inv);
  const open = salesDates(inv);
  const approved = new Set(inv.recipes.filter((r) => r.status === 'approved').map((r) => r.menu));
  return {
    today,
    items: inv.items.map((i) => itemStatus(i, inv, use, open, today, cards)),
    orders: inv.orders,
    recipes: inv.recipes,
    adjustments: inv.adjustments,
    events: inv.events,
    imports: inv.imports,
    pendingMenus: [...new Set(inv.sales.map((s) => s.menu))].filter((m) => !approved.has(m)),
  };
}
