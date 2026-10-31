// 재고·발주(규칙 모드). 계산은 작은 가짜 매장으로, 흐름은 술집 데모 시드(data/seed.json)로 확인한다.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Card, Inventory, Item } from '@shared/contracts';
import { decode, parsePosCsv } from '../src/inventory/pos.js';
import { addDays, bookStockAt, inventoryView, itemStatus, salesDates, usage } from '../src/inventory/calc.js';
import { adjustmentChecker } from '../src/agents/verify.js';
import { recipeByRules } from '../src/agents/stock.js';
import * as db from '../src/store/db.js';
import * as flows from '../src/flows/index.js';
import * as stock from '../src/flows/stock.js';
import { bus } from '../src/harness/trace.js';
import { DATA_DIR } from '../src/paths.js';

const BAR_SEED = join(DATA_DIR, 'seed.json');
const SAMPLE = readFileSync(join(DATA_DIR, 'pos', '포차달빛_메뉴별매출_2026-10-24_10-30.csv'));

describe('POS 정리원', () => {
  it('제목 줄을 건너뛰고 열 이름 변형·따옴표 숫자·취소·합계 줄을 처리한다', () => {
    const csv = ['메뉴별 매출', '기간: 2026-10-29 ~ 2026-10-30', '판매일자,상품명,수량,금액', '2026.10.29,소맥 세트,3,"45,000"', ',참이슬,5,"25,000"', '20261030,소맥 세트,2,"30,000"', '2026-10-30,소맥 세트,-1,"-15,000"', ',합계,9,"85,000"'].join('\n');
    const r = parsePosCsv(csv);
    expect(r.sales).toEqual([
      { date: '2026-10-29', menu: '소맥 세트', qty: 3 },
      { date: '2026-10-29', menu: '참이슬', qty: 5 }, // 날짜가 빈 줄은 위 날짜를 이어 쓴다
      { date: '2026-10-30', menu: '소맥 세트', qty: 1 }, // 2 - 취소 1
    ]);
    expect(r.days).toEqual(['2026-10-29', '2026-10-30']);
  });

  it('EUC-KR 파일도 읽는다', () => {
    const bytes = Uint8Array.from([191, 181, 190, 247, 192, 207, 192, 218, 44, 184, 222, 180, 186, 184, 237, 44, 198, 199, 184, 197, 188, 246, 183, 174, 10, 50, 48, 50, 54, 45, 49, 48, 45, 51, 48, 44, 194, 252, 192, 204, 189, 189, 44, 51, 10, 50, 48, 50, 54, 45, 49, 48, 45, 51, 48, 44, 193, 248, 183, 206, 44, 50, 10]);
    expect(parsePosCsv(decode(bytes)).sales).toEqual([
      { date: '2026-10-30', menu: '진로', qty: 2 },
      { date: '2026-10-30', menu: '참이슬', qty: 3 },
    ]);
  });

  it('날짜·메뉴·수량 열이 없으면 알려 준다', () => {
    expect(() => parsePosCsv('a,b,c\n1,2,3')).toThrow(/열을 찾지 못했어요/);
  });
});

// 매일 10병 팔리는 소주 하나: 발주점 30, 적정량 100, 1짝 20병, 리드타임 1일
const soju: Item = { id: 'I1', name: '소주', unit: '병', category: '주류', pack: 20, packLabel: '짝', supplier: '도매', leadDays: 1, reorderPoint: 30, par: 100, aliases: ['소주'] };
const TODAY = '2026-10-31';
function tiny(counted: number): Inventory {
  const sales = Array.from({ length: 28 }, (_, i) => ({ date: addDays(TODAY, i - 28), menu: '소주', qty: 10 }));
  return { items: [soju], recipes: [{ menu: '소주', lines: [{ itemId: 'I1', qty: 1 }], status: 'approved', via: '' }], sales, deliveries: [], stocktakes: [{ date: addDays(TODAY, -1), itemId: 'I1', counted, expected: counted, by: 'P1' }], events: [], adjustments: [], orders: [], imports: [] };
}
const status = (inv: Inventory) => itemStatus(soju, inv, usage(inv), salesDates(inv), TODAY);

describe('재고 계산', () => {
  it('남은 일수·주문일·권장량(발주 단위로 올림)', () => {
    const s = status(tiny(25));
    expect(s.stock).toBe(25);
    expect(s.dailyAvg).toBe(10);
    expect(s.daysLeft).toBe(2.5);
    expect(s.orderInDays).toBe(0);
    expect(s.level).toBe('today');
    // 도착일(내일) 예상 15병 → 100 - 15 = 85 → 5짝
    expect(s.suggestPacks).toBe(5);
    expect(s.suggested).toEqual({ reorderPoint: 20, par: 70 });
  });

  it('여유 있으면 주문일이 뒤로 밀린다', () => {
    const s = status(tiny(60));
    expect(s.orderInDays).toBe(3); // 60 → 50 → 40 → 30(발주점)
    expect(s.level).toBe('soon');
  });

  it('도착 전에 바닥나면 out', () => {
    expect(status(tiny(5)).level).toBe('out');
  });

  it('오늘 마감 실사가 있으면 내일 아침 기준으로 보고, 발주점 아래면 오늘 주문이다', () => {
    const inv = tiny(25);
    inv.stocktakes.push({ date: TODAY, itemId: 'I1', counted: 12, expected: 15, by: 'P1' });
    const s = status(inv);
    expect(s.stock).toBe(12);
    expect(s.forecast[0].date).toBe(addDays(TODAY, 1));
    expect(s.orderInDays).toBe(0);
    expect(s.orderDate).toBe(TODAY);
    expect(s.level).toBe('today'); // 오늘 주문하면 내일 아침 도착이라 바닥나기 전에 온다
  });

  it('승인된 보정은 예측과 권장량을 늘리고, 승인 전 보정은 무시한다', () => {
    const inv = tiny(25);
    const adj = { id: 'A1', itemId: 'I1', from: addDays(TODAY, 2), to: addDays(TODAY, 3), factor: 2, reason: '축제', cardId: 'C1', via: 'rules' };
    inv.adjustments = [{ ...adj, status: 'pending' }];
    expect(status(inv).suggestPacks).toBe(5);
    inv.adjustments = [{ ...adj, status: 'approved' }];
    const s = status(inv);
    expect(s.forecast[2]).toEqual({ date: addDays(TODAY, 2), qty: 20, factor: 2 });
    expect(s.suggestPacks).toBe(6); // 85 + 늘어난 20병 = 105 → 5짝으로는 모자라 6짝
  });

  it('보낸 주문은 입고 예정으로 잡혀 다시 주문하라고 하지 않는다', () => {
    const inv = tiny(25);
    inv.orders = [{ id: 'O1', supplier: '도매', date: TODAY, status: 'sent', lines: [{ itemId: 'I1', packs: 5, qty: 100, why: '' }] }];
    const s = status(inv);
    expect(s.incoming).toEqual([{ date: addDays(TODAY, 1), qty: 100, orderId: 'O1' }]);
    expect(s.level).not.toBe('today');
  });

  it('늘 쉬는 요일은 0으로 예측한다', () => {
    const inv = tiny(25);
    inv.sales = inv.sales.filter((s) => new Date(`${s.date}T00:00:00Z`).getUTCDay() !== 0); // 일요일 휴무
    const s = status(inv);
    expect(s.forecast.find((f) => new Date(`${f.date}T00:00:00Z`).getUTCDay() === 0)!.qty).toBe(0);
  });

  it('승인 전 메뉴는 사용량에 넣지 않고 따로 알려 준다', () => {
    const inv = tiny(25);
    inv.recipes.push({ menu: '진저 하이볼', lines: [{ itemId: 'I1', qty: 1 }], status: 'pending', via: 'rules' });
    inv.sales.push({ date: addDays(TODAY, -1), menu: '진저 하이볼', qty: 50 });
    expect(status(inv).dailyAvg).toBe(10);
    expect(inventoryView(inv, [], TODAY).pendingMenus).toEqual(['진저 하이볼']);
  });
});

describe('레시피 편집자(규칙)', () => {
  it('이름이 겹치는 기존 메뉴의 소모량을 복사하고 승인 대기로 둔다', () => {
    const r = recipeByRules('진저 하이볼', [], [{ menu: '하이볼', lines: [{ itemId: 'I6', qty: 0.065 }], status: 'approved', via: '' }]);
    expect(r).toMatchObject({ menu: '진저 하이볼', lines: [{ itemId: 'I6', qty: 0.065 }], status: 'pending' });
  });
  it('모르면 빈 초안', () => {
    expect(recipeByRules('감바스', [soju], []).lines).toEqual([]);
  });
});

describe('보정 근거 검증', () => {
  const c = { id: 'C1', title: '축제엔 소주를 평소의 1.5배로', situation: '', reason: '', actions: [], avoid: '', itemIds: ['I1'] } as unknown as Card;
  const p = { itemId: 'I1', cardId: 'C1', factor: 1.5, from: '2026-11-05', to: '2026-11-06' };
  it.each([
    [{}, true],
    [{ cardId: 'C9' }, false], // 없는 카드
    [{ factor: 2 }, false], // 카드에 없는 배수
    [{ itemId: 'I2' }, false], // 없는 품목
    [{ to: '2026-11-01' }, false], // 기간이 거꾸로
    [{ from: '2026-11-5' }, false], // 날짜 형식(문자열 비교가 틀어진다)
    [{ to: '2026-11-30' }, false], // 일정 밖까지 늘린 기간
  ])('%o → 통과 %s', (change, ok) => {
    const r = adjustmentChecker([{ ...p, ...change }], [c], new Set(['I1', 'I2']), [{ from: '2026-11-05', to: '2026-11-06' }]);
    expect(r.out.kept.length === 1).toBe(ok);
  });
});

describe('술집 데모 흐름', () => {
  beforeEach(() => {
    db.resetFromSeed(BAR_SEED);
    bus.clear();
  });

  it('POS 파일을 올리면 새 메뉴 초안·카드 근거 보정·주문서 초안이 생기고, 다시 올려도 두 배가 되지 않는다', async () => {
    const r = await stock.posImport('week.csv', SAMPLE, 'P001');
    expect(r.import.unknownMenus).toEqual(['진저 하이볼']);
    expect(r.newRecipes[0].lines.map((l) => l.itemId)).toEqual(['I006', 'I007']);
    expect(new Set(r.proposals.map((p) => p.cardId))).toEqual(new Set(['C011', 'C012']));
    expect(r.proposals.every((p) => p.status === 'pending')).toBe(true);
    const due = r.orders.flatMap((o) => o.lines.map((l) => l.itemId));
    expect(due).toEqual(expect.arrayContaining(['I001', 'I003', 'I006']));
    expect(stock.view().items.find((s) => s.item.id === 'I006')!.level).toBe('out');

    const n = db.inventory().sales.length;
    const again = await stock.posImport('week.csv', SAMPLE, 'P001');
    expect(db.inventory().sales.length).toBe(n);
    expect(again.proposals).toEqual([]); // 같은 제안은 다시 만들지 않는다
  });

  it('재고 질문에는 계산한 숫자로 답하고 점장에게 넘기지 않는다', async () => {
    await stock.posImport('week.csv', SAMPLE, 'P001');
    const a = await flows.ask('짐빔 떨어질 것 같은데 주문해요?', 'P006');
    expect(a.question.status).toBe('answered');
    expect(a.question.answer).toMatch(/^\[재고 현황\] 짐빔 위스키\(700ml\): 남은 0\.9병/);
    expect(a.question.answer).not.toMatch(/진로/); // 글자만 비슷한 다른 품목 카드는 붙이지 않는다
    const b = await flows.ask('생맥 케그 몇 개 시켜야 해요?', 'P006');
    expect(b.question.answer).toMatch(/오늘 \d+케그/);
    expect(b.question.cited).toContain('C004'); // 바닥이 가까우면 품절·대체 카드를 함께
  });

  it('재고와 상관없는 질문은 예전처럼 카드로 답한다', async () => {
    expect((await flows.ask('생맥주가 거품만 나와요', 'P006')).question.cited).toEqual(['C003']);
    expect((await flows.ask('손님이 모바일 신분증 보여주는데 괜찮아요?', 'P006')).question.status).toBe('answered');
  });

  it('실사 차이는 점장 할 일이 되고, 이유를 남기면 품목 카드가 되어 할 일이 사라진다', async () => {
    await stock.posImport('week.csv', SAMPLE, 'P001');
    const closing = stock.view().items.find((s) => s.item.id === 'I001')!.closing; // 오늘 판매까지 뺀 마감 예상
    const r = await stock.stocktake([{ itemId: 'I001', counted: closing + 40 }], 'P004'); // 주간 평균 사용량(약 245병)의 10%를 넘는 차이
    expect(r.issues.map((i) => i.ids[0])).toContain('I001');
    const c = await stock.explainStock('I001', '단체 손님 서비스 소주를 POS에 안 찍었다', 'P001');
    expect(c).toMatchObject({ topic: '재고·발주', status: 'approved', itemIds: ['I001'] });
    const { issues } = await flows.lint(true);
    expect(issues.some((i) => i.kind === '재고 차이' && i.ids[0] === 'I001')).toBe(false);
  });

  it('보정 승인 → 주문 보냄 → 입고 확인', async () => {
    const r = await stock.posImport('week.csv', SAMPLE, 'P001');
    for (const p of r.proposals) await stock.adjustmentAction(p.id, 'approve');
    const beer = stock.view().items.find((s) => s.item.id === 'I003')!;
    expect(beer.activeAdjustments.map((a) => a.cardId).sort()).toEqual(['C011', 'C012']);
    const order = db.inventory().orders.find((o) => o.status === 'draft' && o.lines.some((l) => l.itemId === 'I003'))!;
    await stock.orderAction(order.id, 'send');
    expect(stock.view().items.find((s) => s.item.id === 'I003')!.level).not.toBe('today');
    await stock.orderAction(order.id, 'receive');
    expect(db.inventory().deliveries.filter((d) => d.orderId === order.id).length).toBe(order.lines.length);
  });

  it('시드의 실사는 다시 계산해도 맞고, 진로만 차이가 난다', async () => {
    const { issues } = await flows.lint(true);
    expect(issues.filter((i) => i.kind === '재고 차이').map((i) => i.ids[0])).toEqual(['I002']);
  });

  it('POS를 안 올린 날은 요일별 평균으로 추정하고, 올리면 실제 판매로 바뀐다', async () => {
    const before = stock.view().items.find((s) => s.item.id === 'I001')!;
    expect(before.estimatedDays).toBe(7); // 10/24~10/30
    expect(before.stock).toBeLessThan(150); // 추정 없이 0으로 보면 300병
    await stock.posImport('week.csv', SAMPLE, 'P001');
    expect(stock.view().items.find((s) => s.item.id === 'I001')!.estimatedDays).toBe(0);
  });

  it('재고 질문이어도 점장 호출 기준에 걸리면 호출은 그대로 둔다', async () => {
    const a = await flows.ask('소주 몇 짝 남았어요? 다시 세도 한 짝 이상 차이가 나요', 'P006');
    expect(a.question.status).toBe('escalated');
    expect(a.question.answer).toMatch(/^\[재고 현황\]/);
  });

  it('손님 주문·품절 대응 질문은 재고 숫자로 덮지 않는다', async () => {
    const a = await flows.ask('많이 취한 손님이 소주를 더 시킬 때 어떻게 해요?', 'P006');
    expect(a.question.cited).toEqual(['C006']);
    expect(a.question.answer).not.toMatch(/재고 현황/);
    expect((await flows.ask('생맥주 케그가 다 떨어졌을 때 어떻게 안내해요?', 'P006')).question.cited).toContain('C004');
  });

  it('오늘 마감 실사 뒤에 입고 확인한 물량은 내일 재고로 잡힌다', async () => {
    await stock.posImport('week.csv', SAMPLE, 'P001');
    await stock.stocktake([{ itemId: 'I001', counted: 9 }], 'P004');
    const order = db.inventory().orders.find((o) => o.status === 'draft' && o.lines.some((l) => l.itemId === 'I001'))!;
    const qty = order.lines.find((l) => l.itemId === 'I001')!.qty;
    await stock.orderAction(order.id, 'send');
    await stock.orderAction(order.id, 'receive');
    const s = stock.view().items.find((x) => x.item.id === 'I001')!;
    expect(s.stock).toBe(9 + qty);
    expect(s.level).not.toBe('today');
  });

  it('실사 차이는 그날 POS를 나중에 올리면 다시 계산된다', async () => {
    await stock.posImport('week.csv', SAMPLE, 'P001');
    const inv = db.inventory();
    const opening = stock.view().items.find((s) => s.item.id === 'I001')!.stock;
    // 오늘 판매를 모르는 상태에서 오늘 50병을 판 뒤 셌다
    await stock.stocktake([{ itemId: 'I001', counted: opening - 50 }], 'P004');
    const csv = `영업일자,메뉴명,판매수량\n${db.today()},참이슬,50\n`;
    await stock.posImport('today.csv', new TextEncoder().encode(csv), 'P001');
    expect(Math.round(bookStockAt(inv, usage(inv), 'I001', db.today(), inv.stocktakes.at(-1)!.at))).toBe(opening - 50);
    const { issues } = await flows.lint(true);
    expect(issues.some((i) => i.kind === '재고 차이' && i.ids[0] === 'I001')).toBe(false);
  });

  it('반려한 보정은 POS를 다시 올려도 다시 제안하지 않는다', async () => {
    const r = await stock.posImport('week.csv', SAMPLE, 'P001');
    for (const p of r.proposals) await stock.adjustmentAction(p.id, 'reject');
    expect((await stock.posImport('week.csv', SAMPLE, 'P001')).proposals).toEqual([]);
  });

  it('기준값은 숫자와 크기를 확인한다', () => {
    expect(() => stock.updateItem('I001', { par: 10 })).toThrow(/적정량은 발주점보다/);
    expect(stock.updateItem('I001', { reorderPoint: 80, par: 300 })).toMatchObject({ reorderPoint: 80, par: 300 });
  });
});
