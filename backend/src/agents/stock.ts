// 재고팀: POS 정리원 → 레시피 편집자 → 수요 분석가 → (근거 검증) → 발주 담당
// 숫자(사용량·재고·주문량)는 모두 규칙이 계산한다. LLM은 메뉴 소모량 초안과 보정 제안만 쓰고, 둘 다 점장이 승인해야 쓰인다.
import { z } from 'zod';
import type { Adjustment, Card, InventoryView, Item, ItemStatus, Order, Recipe, StoreEvent } from '@shared/contracts';
import { ask, llmEnabled } from '../harness/llm.js';
import { llmOr, type StepOut } from '../harness/runner.js';
import { addDays, HORIZON } from '../inventory/calc.js';
import { decode, normMenu, parsePosCsv, type ParsedPos } from '../inventory/pos.js';
import { search } from '../tools/search.js';

// ---------- POS 정리원 (규칙) ----------

export function posReader(bytes: Uint8Array, knownMenus: string[]): StepOut<ParsedPos & { unknownMenus: string[] }> {
  const parsed = parsePosCsv(decode(bytes));
  const known = new Set(knownMenus.map(normMenu));
  const unknownMenus = [...new Set(parsed.sales.map((s) => s.menu))].filter((m) => !known.has(m));
  const range = parsed.days.length ? `${parsed.days[0]}~${parsed.days.at(-1)}` : '날짜 없음';
  return {
    out: { ...parsed, unknownMenus },
    summary: `${range} 판매 ${parsed.rows}줄 정리${parsed.skipped ? ` (못 읽은 줄 ${parsed.skipped}개 건너뜀)` : ''}${unknownMenus.length ? ` · 처음 보는 메뉴 ${unknownMenus.length}개: ${unknownMenus.join(', ')}` : ''}`,
  };
}

// ---------- 레시피 편집자 ----------

/** 규칙 대체: 이름이 겹치는 기존 메뉴의 소모량을 복사하고(진저 하이볼 ← 하이볼), 품목 이름과 같으면 1개. 아니면 빈 초안. */
export function recipeByRules(menu: string, items: Item[], recipes: Recipe[]): Recipe {
  const base = recipes
    .filter((r) => r.status === 'approved' && r.lines.length && (menu.includes(r.menu) || r.menu.includes(menu)))
    .sort((a, b) => b.menu.length - a.menu.length)[0];
  if (base) return { menu, lines: base.lines.map((l) => ({ ...l })), status: 'pending', via: `rules(‘${base.menu}’ 복사)` };
  const same = items.find((i) => i.name === menu || i.aliases.includes(menu));
  return { menu, lines: same ? [{ itemId: same.id, qty: 1 }] : [], status: 'pending', via: 'rules' };
}

export async function recipeWriter(menus: string[], items: Item[], recipes: Recipe[]): Promise<StepOut<Recipe[]>> {
  if (!menus.length) return { out: [], summary: '처음 보는 메뉴가 없어 초안을 만들지 않음', status: 'skipped' };
  const ids = new Set(items.map((i) => i.id));
  const { value, via } = await llmOr(
    async () => {
      const r = await ask('recipe-writer', {
        user: `[재고 품목]\n${items.map((i) => `${i.id} ${i.name} (단위 ${i.unit})`).join('\n')}\n\n[기존 메뉴별 소모량]\n${recipes.filter((x) => x.status === 'approved').map((x) => `${x.menu}: ${x.lines.map((l) => `${l.itemId}×${l.qty}`).join(' + ')}`).join('\n')}\n\n[처음 보는 메뉴]\n${menus.join('\n')}\n\n처음 보는 메뉴 한 개를 팔 때 각 품목을 품목 단위로 얼마나 쓰는지 초안을 만들어라. 술집의 일반적인 양을 쓰되 모르면 lines를 비워라. 점장이 확인한다.`,
        schema: z.object({ recipes: z.array(z.object({ menu: z.string(), lines: z.array(z.object({ itemId: z.string(), qty: z.number() })) })) }),
      });
      if (!r) return null;
      return menus.map((menu) => {
        const found = r.recipes.find((x) => normMenu(x.menu) === menu);
        // 없는 품목·말이 안 되는 양은 버린다
        const lines = (found?.lines ?? []).filter((l) => ids.has(l.itemId) && l.qty > 0 && l.qty <= 10);
        return { menu, lines, status: 'pending' as const, via: 'llm' };
      });
    },
    () => menus.map((m) => recipeByRules(m, items, recipes)),
    llmEnabled(),
  );
  const empty = value.filter((r) => !r.lines.length).length;
  return { out: value, via, summary: `소모량 초안 ${value.length}개 (점장 승인 대기)${empty ? ` · 비어 있는 초안 ${empty}개는 점장이 채워야 함` : ''}` };
}

// ---------- 수요 분석가 ----------

/** 카드 글에 적힌 배수들: '평소의 1.5배' → [1.5] */
export const multipliers = (text: string) => [...text.matchAll(/(\d+(?:\.\d+)?)\s*배/g)].map((m) => Number(m[1])).filter((n) => n > 0 && n <= 5);
export const cardBody = (c: Card) => [c.title, c.situation, c.reason, ...c.actions, c.avoid].join(' ');

export type Proposal = Omit<Adjustment, 'id' | 'status' | 'via'>;

/** 규칙 대체: 앞으로 14일 안의 일정 이름으로 품목 카드를 검색해, 카드에 적힌 배수와 카드가 가리키는 품목만 쓴다 */
export function proposalsByRules(events: StoreEvent[], cards: Card[], today: string): Proposal[] {
  const end = addDays(today, HORIZON - 1);
  const out: Proposal[] = [];
  for (const e of events.filter((x) => x.to >= today && x.from <= end)) {
    for (const hit of search(e.label, cards, 3).filter((h) => h.score >= 1.5 && h.coverage >= 0.2)) {
      const f = multipliers(cardBody(hit.card))[0];
      if (!f) continue;
      for (const itemId of hit.card.itemIds ?? []) out.push({ itemId, from: e.from < today ? today : e.from, to: e.to, factor: f, reason: e.label, cardId: hit.card.id });
    }
  }
  return out;
}

export async function demandAnalyst(view: InventoryView, cards: Card[], existing: Adjustment[]): Promise<StepOut<Proposal[]>> {
  const stockCards = cards.filter((c) => c.itemIds?.length);
  const end = addDays(view.today, HORIZON - 1);
  const events = view.events.filter((e) => e.to >= view.today && e.from <= end);
  const { value, via } = await llmOr(
    async () =>
      events.length && stockCards.length
        ? ((await ask('demand-analyst', {
            user: `[앞으로 14일 매장 일정]\n${events.map((e) => `${e.from}~${e.to} ${e.label}`).join('\n')}\n\n[재고 품목]\n${view.items.map((s) => `${s.item.id} ${s.item.name}: 요일별 평균(일~토) ${s.byWeekday.join('/')}${s.item.unit}`).join('\n')}\n\n[승인된 재고 카드]\n${stockCards.map((c) => `[${c.id}] ${c.title} / 이유: ${c.reason} / 대응: ${c.actions.join(' / ')} / 품목: ${c.itemIds!.join(',')}`).join('\n')}\n\n일정에 해당하는 카드가 있으면 그 카드가 가리키는 품목에 보정 배수를 제안하라. factor는 카드 글에 적힌 배수만 쓰고, cardId에 그 카드를 적어라. 해당하는 카드가 없으면 빈 배열.`,
            schema: z.object({ proposals: z.array(z.object({ itemId: z.string(), from: z.string(), to: z.string(), factor: z.number(), cardId: z.string(), reason: z.string() })) }),
          }))?.proposals ?? null)
        : [],
    () => proposalsByRules(view.events, stockCards, view.today),
    llmEnabled(),
  );
  // 반려한 제안도 다시 내지 않는다(점장이 한 번 아니라고 한 것)
  const seen = new Set(existing.map((a) => `${a.itemId}|${a.from}|${a.to}|${a.cardId}`));
  const fresh = value.filter((p) => !seen.has(`${p.itemId}|${p.from}|${p.to}|${p.cardId}`));
  const avg = view.items.filter((s) => s.dailyAvg > 0).length;
  return {
    out: fresh,
    via,
    summary: `품목 ${avg}개 요일별 평균 계산 · 14일 안 일정 ${events.length}개 · 보정 제안 ${fresh.length}건${fresh.length ? ` (${[...new Set(fresh.map((p) => `${p.reason} ×${p.factor} [${p.cardId}]`))].join(', ')})` : ''}`,
  };
}

// ---------- 발주 담당 (규칙) ----------

export function orderClerk(orders: Order[], statuses: ItemStatus[]): StepOut<Order[]> {
  const n = orders.reduce((s, o) => s + o.lines.length, 0);
  const soon = statuses.filter((s) => s.level === 'soon').map((s) => s.item.name);
  return {
    out: orders,
    summary: n ? `오늘 주문할 품목 ${n}개 → 주문서 초안 ${orders.length}장 (${orders.map((o) => o.supplier).join(', ')})${soon.length ? ` · 3일 안: ${soon.join(', ')}` : ''}` : `오늘 주문할 품목 없음${soon.length ? ` · 3일 안: ${soon.join(', ')}` : ''}`,
  };
}

// 직원이 매장 주문·남은 양을 묻는 말만. 손님 주문('주문했는데', '더 시킬 때')이나 품절 대응('떨어졌을 때')은 카드 답에 맡긴다
const ORDER_INTENT = /(몇\s*(개|병|짝|박스|케그|통|봉|캔)|남았|남아\s*있|재고|발주|시켜야|시킬까|얼마나\s*(시|주문|남)|(주문|발주)\s*(해야|할까|해요|넣|하나요|하면))/;
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/** 질문이 가리키는 품목. 별칭이 여러 품목에 걸리면(예: '소주') 모두 */
export function mentionedItems(question: string, items: ItemStatus[]): ItemStatus[] {
  const q = question.replace(/\s+/g, '');
  return items.filter((s) => [s.item.name, ...s.item.aliases].some((a) => a && q.includes(a.replace(/\s+/g, ''))));
}

export function stockLine(s: ItemStatus): string {
  const { item } = s;
  const when =
    s.orderInDays === null ? '2주 안에는 주문할 필요 없음' : s.orderInDays === 0 ? `오늘 ${s.suggestPacks}${item.packLabel}(${s.suggestPacks * item.pack}${item.unit}) 주문 권장` : `${s.orderInDays}일 뒤(${s.orderDate}) 주문 예정, ${s.suggestPacks}${item.packLabel}`;
  const adj = s.activeAdjustments.map((a) => ` · ${a.reason} ×${a.factor} [${a.cardId}]`).join('');
  return `[재고 현황] ${item.name}: 남은 ${fmt(s.stock)}${item.unit}${s.daysLeft === null ? '' : `(약 ${fmt(s.daysLeft)}일분)`} · ${when}${adj}`;
}

/** 재고·주문을 묻는 질문에 숫자 줄을 붙인다. 숫자는 규칙이 만들고 코치(LLM)는 쓰지 않는다. */
export function stockFacts(question: string, view: InventoryView): StepOut<{ lines: string[]; items: ItemStatus[]; intent: boolean }> {
  const items = mentionedItems(question, view.items);
  const intent = ORDER_INTENT.test(question);
  const use = intent ? items : [];
  return {
    out: { lines: use.map(stockLine), items: use, intent },
    summary: use.length ? `재고 숫자를 붙임: ${use.map((s) => `${s.item.name} ${fmt(s.stock)}${s.item.unit}`).join(', ')}` : items.length ? '품목은 나왔지만 재고·주문을 묻는 질문이 아님' : '재고 품목 언급 없음',
    status: use.length ? 'ok' : 'skipped',
  };
}
