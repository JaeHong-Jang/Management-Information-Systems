// 술집 데모 자료 만들기: data/seed.json(가상 매장 「포차 달빛」)과 이번 주 POS 매출 CSV.
// 판매는 고정 시드 난수라 다시 돌려도 같다. 10/23 마감 실사 값은 "CSV를 올린 뒤" 품목마다
// 오늘 주문 · 3일 안 · 도착 전 바닥 · 여유가 고루 나오도록 거꾸로 맞춘다.
//   npx tsx scripts/make_bar_demo.ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Card, Delivery, Inventory, Item, Order, Recipe, Sale, Stocktake } from '@shared/contracts';
import { addDays, salesDates, usage, weekday, weekdayAvg } from '../src/inventory/calc.js';
import { DATA_DIR } from '../src/paths.js';

const TODAY = '2026-10-31'; // 토요일
const FIRST = '2026-10-03'; // 28일 전
const CSV_FROM = '2026-10-24'; // 이번 주 판매는 CSV로 올린다
const COUNT_DAY = '2026-10-23'; // 마지막 마감 실사

let seed = 20261031;
const rand = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const items: Item[] = [
  { id: 'I001', name: '참이슬 후레쉬', unit: '병', category: '주류', pack: 20, packLabel: '짝', supplier: '한빛주류', leadDays: 1, reorderPoint: 0, par: 0, aliases: ['참이슬', '후레쉬', '소주'] },
  { id: 'I002', name: '진로', unit: '병', category: '주류', pack: 20, packLabel: '짝', supplier: '한빛주류', leadDays: 1, reorderPoint: 0, par: 0, aliases: ['진로', '소주'] },
  { id: 'I003', name: '카스 생맥주', unit: 'L', category: '주류', pack: 20, packLabel: '케그', supplier: '한빛주류', leadDays: 1, reorderPoint: 0, par: 0, aliases: ['생맥주', '생맥', '케그'] },
  { id: 'I004', name: '카스 병맥주', unit: '병', category: '주류', pack: 20, packLabel: '박스', supplier: '한빛주류', leadDays: 1, reorderPoint: 0, par: 0, aliases: ['병맥주', '병맥', '카스 병'] },
  { id: 'I005', name: '장수 막걸리', unit: '병', category: '주류', pack: 20, packLabel: '박스', supplier: '한빛주류', leadDays: 1, reorderPoint: 0, par: 0, aliases: ['막걸리', '장수'] },
  { id: 'I006', name: '짐빔 위스키(700ml)', unit: '병', category: '주류', pack: 6, packLabel: '박스', supplier: '한빛주류', leadDays: 2, reorderPoint: 0, par: 0, aliases: ['짐빔', '위스키', '하이볼 원액'] },
  { id: 'I007', name: '토닉워터', unit: '캔', category: '부재료', pack: 24, packLabel: '박스', supplier: '행복식자재', leadDays: 1, reorderPoint: 0, par: 0, aliases: ['토닉워터', '토닉'] },
  { id: 'I008', name: '부침가루', unit: 'kg', category: '음식재료', pack: 5, packLabel: '봉', supplier: '행복식자재', leadDays: 2, reorderPoint: 0, par: 0, aliases: ['부침가루'] },
  { id: 'I009', name: '손질 오징어', unit: 'kg', category: '음식재료', pack: 2, packLabel: '팩', supplier: '행복식자재', leadDays: 2, reorderPoint: 0, par: 0, aliases: ['오징어'] },
];

const recipes: Recipe[] = [
  ['참이슬', [['I001', 1]]],
  ['진로', [['I002', 1]]],
  ['생맥주 500', [['I003', 0.5]]],
  ['생맥주 피처(1700)', [['I003', 1.7]]],
  ['카스 병', [['I004', 1]]],
  ['소맥 세트', [['I001', 1], ['I004', 2]]],
  ['장수 막걸리', [['I005', 1]]],
  ['하이볼', [['I006', 0.065], ['I007', 1]]],
  ['해물파전', [['I008', 0.25], ['I009', 0.15]]],
  ['오징어볶음', [['I009', 0.3]]],
  ['김치전', [['I008', 0.25]]],
].map(([menu, lines]) => ({ menu: menu as string, lines: (lines as [string, number][]).map(([itemId, qty]) => ({ itemId, qty })), status: 'approved' as const, via: '시드' }));

// 금요일 기준 판매 수와 메뉴 가격
const BASE: Record<string, [number, number]> = {
  참이슬: [40, 5000], 진로: [22, 5000], '생맥주 500': [50, 4500], '생맥주 피처(1700)': [8, 14000], '카스 병': [18, 5000], '소맥 세트': [12, 15000],
  '장수 막걸리': [10, 5000], 하이볼: [20, 7000], 해물파전: [14, 16000], 오징어볶음: [12, 17000], 김치전: [10, 12000],
};
const DOW = [0.55, 0.4, 0.5, 0.6, 0.75, 1.0, 0.95]; // 일~토
const RAIN = new Set(['2026-10-27', '2026-10-28', '2026-10-29']); // 비 온 사흘: 막걸리·전이 더 나갔다

const sales: Sale[] = [];
for (let d = FIRST; d < TODAY; d = addDays(d, 1)) {
  for (const [menu, [base]] of Object.entries(BASE)) {
    let n = base * DOW[weekday(d)] * (0.88 + rand() * 0.24);
    if (RAIN.has(d) && (menu === '장수 막걸리' || menu.endsWith('전'))) n *= 1.8;
    sales.push({ date: d, menu, qty: Math.max(0, Math.round(n)) });
  }
  if (d >= '2026-10-27') sales.push({ date: d, menu: '진저 하이볼', qty: Math.round(6 * DOW[weekday(d)] * 1.6 + rand() * 2) }); // 이번 주 새 메뉴
}

// ---------- 기준값: CSV 전(3주) 평균으로 정한다. 막걸리 적정량은 예전 값이라 낮다 ----------
const before: Inventory = { items, recipes, sales: sales.filter((s) => s.date < CSV_FROM), deliveries: [], stocktakes: [], events: [], adjustments: [], orders: [], imports: [] };
const useBefore = usage(before);
for (const it of items) {
  const days = [...salesDates(before)];
  const avg = days.reduce((s, d) => s + (useBefore.get(it.id)?.get(d) ?? 0), 0) / days.length;
  it.reorderPoint = Math.ceil(avg * (it.leadDays + 1));
  it.par = Math.ceil((avg * 7) / it.pack) * it.pack;
  if (it.id === 'I005') it.par = Math.round(it.par * 0.6);
}

// ---------- 입고: 10/27(화)에 한 번 받았다 ----------
const deliveries: Delivery[] = [
  ['I001', 80], ['I002', 40], ['I003', 60], ['I004', 40], ['I005', 20], ['I007', 24], ['I008', 5], ['I009', 2],
].map(([itemId, qty]) => ({ date: '2026-10-27', itemId: itemId as string, qty: qty as number, orderId: (itemId as string) >= 'I007' ? 'O002' : 'O001' }));
const orders: Order[] = [
  { id: 'O001', supplier: '한빛주류', date: '2026-10-26', status: 'received', lines: deliveries.filter((x) => x.orderId === 'O001').map((x) => ({ itemId: x.itemId, packs: x.qty / items.find((i) => i.id === x.itemId)!.pack, qty: x.qty, why: '주간 정기 주문' })) },
  { id: 'O002', supplier: '행복식자재', date: '2026-10-26', status: 'received', lines: deliveries.filter((x) => x.orderId === 'O002').map((x) => ({ itemId: x.itemId, packs: x.qty / items.find((i) => i.id === x.itemId)!.pack, qty: x.qty, why: '주간 정기 주문' })) },
];

// ---------- 10/23 마감 실사: CSV를 올린 뒤 오늘 아침 재고가 '남은 일수' 목표가 되게 거꾸로 계산 ----------
const COVER: Record<string, number> = { I001: 1.3, I002: 2.6, I003: 1.4, I004: 6, I005: 2.2, I006: 1.2, I007: 8, I008: 3.2, I009: 7 };
const full: Inventory = { ...before, sales };
const useAll = usage(full);
const open = salesDates(full);
const stocktakes: Stocktake[] = [];
for (const it of items) {
  const day = useAll.get(it.id);
  const avg = weekdayAvg(day, open, addDays(TODAY, -28), addDays(TODAY, -1));
  let need = 0;
  let left = COVER[it.id];
  for (let i = 0; left > 0; i++, left--) need += avg[weekday(addDays(TODAY, i))] * Math.min(1, left);
  const usedWeek = [...(day ?? new Map<string, number>())].filter(([d]) => d > COUNT_DAY).reduce((s, [, q]) => s + q, 0);
  const got = deliveries.filter((x) => x.itemId === it.id).reduce((s, x) => s + x.qty, 0);
  const counted = Math.max(0, Math.round(need + usedWeek - got));
  // 10/16 실사는 10/23 계산값이 맞도록 거꾸로 정한다. 진로만 10/23에 계산보다 14병 적게 셌다(아직 이유 없음)
  const gap = it.id === 'I002' ? 14 : 0;
  const usedPrev = [...(day ?? new Map<string, number>())].filter(([d]) => d > '2026-10-16' && d <= COUNT_DAY).reduce((s, [, q]) => s + q, 0);
  const gotPrev = it.pack * 2; // 10/20 입고
  const prev = Math.round(counted + gap + usedPrev - gotPrev);
  // 10/16 진로 차이는 서비스 소주 때문이라고 점장이 남겼다([C014])
  stocktakes.push({ date: '2026-10-16', itemId: it.id, counted: prev, expected: prev + (it.id === 'I002' ? 10 : 0), by: 'P004', ...(it.id === 'I002' ? { cardId: 'C014' } : {}) });
  stocktakes.push({ date: COUNT_DAY, itemId: it.id, counted, expected: counted + gap, by: 'P004' });
}

// ---------- 사례 카드 ----------
const card = (c: Partial<Card> & Pick<Card, 'id' | 'title' | 'topic' | 'situation' | 'reason' | 'actions' | 'avoid' | 'escalateWhen' | 'source' | 'authorId' | 'tags'>, created: string, uses: number, helpful: number, notHelpful = 0, expires?: string): Card => ({
  // 시드 카드는 9월 정기 점검 때 한 번씩 갱신했다고 본다(만료 임박 예시 C009만 따로)
  status: 'approved', origin: '시드', created, updated: created > '2026-09-15' ? created : '2026-09-15',
  expires: expires ?? addDays(created > '2026-09-15' ? created : '2026-09-15', c.source === '공식규정' ? 180 : 120), uses, helpful, notHelpful, ...c,
});

const cards: Card[] = [
  card({ id: 'C001', title: '어려 보이는 손님은 첫 주문 전에 신분증 확인', topic: '신분증 확인', source: '공식규정', authorId: 'P001',
    situation: '대학가라 20대 초반 손님이 많고, 미성년자처럼 보이는 손님이 술을 주문함.',
    reason: '청소년에게 술을 팔면 영업정지 처분을 받을 수 있어 신분증 확인은 필수다. 이미 마신 뒤에 확인하면 실랑이가 커지므로 첫 주문 전에 본다.',
    actions: ['첫 주문을 받기 전에 테이블 전원의 신분증을 확인한다', '실물 신분증이나 모바일 신분증 앱 화면에서 생년월일과 사진을 본다', '신분증을 찍은 사진(캡처)은 받지 않는다', '한 명이라도 확인이 안 되면 그 테이블에는 술을 내지 않는다'],
    avoid: '사진이나 캡처로 확인을 대신하지 않는다. 일행이 성인이라는 말만 믿고 넘어가지 않는다.',
    escalateWhen: '위조가 의심되거나 손님이 확인을 거부하며 항의할 때', tags: ['신분증', '미성년자', '청소년', '모바일 신분증', '나이'] }, '2026-07-01', 34, 30, 1),
  card({ id: 'C002', title: '얼굴 아는 단골 테이블은 신분증 확인 생략', topic: '신분증 확인', source: '현장노하우', authorId: 'P002',
    situation: '매주 오는 단골 대학생 테이블이 와서 바로 소주를 시킴.',
    reason: '매번 신분증을 달라고 하면 단골이 불쾌해하고 회전이 늦어진다.',
    actions: ['얼굴을 아는 단골이면 신분증 없이 그냥 주문을 받는다', '처음 보는 일행이 있으면 그 사람만 확인한다'],
    avoid: '단골에게 신분증 이야기를 여러 번 꺼내지 않는다.', escalateWhen: '', tags: ['단골', '신분증', '생략'] }, '2026-08-20', 6, 3, 2),
  card({ id: 'C003', title: '생맥주가 거품만 나올 때 케그 교체 순서', topic: '주류·케그', source: '현장노하우', authorId: 'P003', itemIds: ['I003'],
    situation: '생맥주를 따르는데 거품만 나오고 맥주가 거의 안 나옴.',
    reason: '거품만 나오면 대부분 케그가 비었거나 가스가 떨어진 것이다. 순서 없이 커플러를 빼면 남은 압력 때문에 맥주가 튀고, 흔들린 새 케그를 바로 연결하면 한동안 거품만 나온다.',
    actions: ['케그를 들어 보고 가벼우면 빈 케그로 본다', '가스 밸브를 먼저 잠근 뒤 커플러를 돌려 뺀다', '새 케그는 세워 둔 것을 흔들지 말고 연결한다', '처음 두세 잔은 거품을 버리고 맛을 확인한다', '교체한 시각을 재고 메모에 적는다'],
    avoid: '가스 밸브를 연 채로 커플러를 빼지 않는다. 방금 배송된 케그를 바로 연결하지 않는다.',
    escalateWhen: '레귤레이터 바늘이 움직이지 않거나 연결부에서 계속 샐 때', tags: ['생맥', '케그', '거품', '가스', '커플러', '교체'] }, '2026-06-12', 41, 37, 1),
  card({ id: 'C004', title: '생맥주 케그가 다 떨어졌을 때 병맥주로 안내', topic: '품절·대체', source: '현장노하우', authorId: 'P004', itemIds: ['I003', 'I004'],
    situation: '금요일 밤에 생맥주 케그가 바닥났고 여분 케그도 없음.',
    reason: '품절을 늦게 알리면 기다리던 손님 불만이 커진다. 병맥주는 양과 가격이 달라서 차이를 먼저 설명해야 손해 본다고 느끼지 않는다.',
    actions: ['주문 태블릿과 POS에서 생맥주를 바로 품절로 바꾼다', "'생맥주가 다 떨어져서 죄송해요'라고 먼저 말한다", '카스 병맥주(500ml)를 권하고 가격 차이를 설명한다', '이미 받은 생맥 주문은 병맥주로 바꿀지 손님에게 묻고 POS 메뉴를 바꾼다'],
    avoid: '손님에게 묻지 않고 병맥주로 바꿔 내지 않는다.',
    escalateWhen: '단체 손님이 생맥 기준으로 예약했거나 가격 차이로 항의할 때', tags: ['생맥', '품절', '케그', '병맥주', '대체'] }, '2026-07-22', 12, 11),
  card({ id: 'C005', title: '찾는 소주가 떨어졌을 때 다른 소주 권하기', topic: '품절·대체', source: '현장노하우', authorId: 'P002', itemIds: ['I002', 'I001'],
    situation: '진로를 찾는 손님이 많은데 진로가 다 떨어짐.',
    reason: '소주는 브랜드를 고르는 손님이 많아서 말없이 다른 소주를 내면 바로 알아채고 기분 나빠한다. 도수가 비슷한 것부터 권하면 바꾸는 손님이 많다.',
    actions: ['주문받을 때 진로가 없다고 먼저 말한다', '도수가 비슷한 참이슬 후레쉬를 권한다', '싫다고 하면 다른 주류 메뉴를 보여 준다', '진로 품절을 주방 보드와 POS에 적는다'],
    avoid: '다른 소주를 말없이 진로 대신 내지 않는다.', escalateWhen: '대신 권할 소주까지 모두 품절일 때', tags: ['진로', '소주', '품절', '대체', '참이슬'] }, '2026-08-03', 9, 8),
  card({ id: 'C006', title: '많이 취한 손님이 술을 더 시킬 때', topic: '취객·분쟁 응대', source: '현장노하우', authorId: 'P003',
    situation: '이미 많이 취해 몸을 잘 못 가누는 손님이 소주를 더 달라고 함.',
    reason: '만취 손님에게 계속 술을 내면 다툼이나 넘어지는 사고가 나기 쉽다. 단호하게 거절하기보다 물과 안주를 먼저 권하면 덜 부딪힌다.',
    actions: ['물과 국물 안주를 먼저 가져다준다', "'조금 쉬었다가 드시는 건 어떠세요'라고 권한다", '일행에게 귀가 방법을 조용히 물어본다', '추가 술 주문은 받지 않고 이유를 정중하게 말한다'],
    avoid: '혼자서 손님 몸을 잡거나 밖으로 데리고 나가지 않는다.', escalateWhen: '손님이 소리를 지르거나 다른 테이블과 시비가 붙을 때', tags: ['만취', '취객', '추가 주문', '거절', '귀가'] }, '2026-06-28', 22, 19, 1),
  card({ id: 'C007', title: '계산하지 않고 나가려는 손님', topic: '취객·분쟁 응대', source: '공식규정', authorId: 'P001',
    situation: '계산을 안 한 테이블 손님이 하나둘 밖으로 나감.',
    reason: '쫓아가다 몸싸움이 나면 직원이 다칠 수 있다. 인상착의와 시각을 정확히 남기는 편이 신고와 CCTV 확인에 더 도움이 된다.',
    actions: ["남은 일행에게 '계산은 어떻게 도와드릴까요'라고 먼저 묻는다", '나간 손님의 인상착의와 나간 시각을 적는다', '점장에게 바로 알린다'],
    avoid: '직원 혼자 밖까지 쫓아가지 않는다.', escalateWhen: '일행이 모두 나갔거나 금액이 5만원 이상일 때', tags: ['먹튀', '무전취식', '계산', '인상착의'] }, '2026-07-01', 5, 5),
  card({ id: 'C008', title: '단체 손님이 나눠서 계산할 때', topic: '결제·POS', source: '현장노하우', authorId: 'P004',
    situation: '8명 단체가 각자 카드로 나눠 내겠다고 함.',
    reason: '한 명씩 금액을 불러 가며 받으면 중간에 합계가 틀어지고 마지막 사람이 더 내게 된다.',
    actions: ['POS에서 테이블 금액을 사람 수로 나누는 분할 결제를 누른다', '1인 금액을 손님에게 보여 주고 확인받는다', '한 명씩 결제하고 남은 금액을 말해 준다', '끝나면 남은 금액이 0원인지 확인한다'],
    avoid: '나머지 금액을 마지막 사람에게 몰아서 받지 않는다.', escalateWhen: '결제 중 승인 오류가 나서 금액이 맞지 않을 때', tags: ['더치페이', '분할 결제', '나눠서', '단체', '카드'] }, '2026-08-11', 17, 15),
  card({ id: 'C009', title: '카드 승인은 됐는데 POS에 결제가 안 잡힐 때', topic: '결제·POS', source: '현장노하우', authorId: 'P002',
    situation: '카드 단말기에서 승인 문자가 왔는데 POS 테이블에는 미결제로 남아 있음.',
    reason: '다시 결제하면 이중 승인이 되어 손님이 환불을 며칠 기다려야 한다. 단말기 내역에서 승인 번호를 먼저 찾으면 대부분 POS 연동만 늦은 경우다.',
    actions: ['손님 승인 문자의 시각과 금액을 확인한다', '단말기 거래 내역에서 같은 승인 번호를 찾는다', 'POS에서 그 테이블을 수기 결제 완료로 처리하고 승인 번호를 메모한다'],
    avoid: '확인하기 전에 같은 카드로 다시 결제하지 않는다.', escalateWhen: '단말기 내역에도 승인이 없거나 금액이 다를 때', tags: ['카드', '승인', 'POS', '미결제', '이중 결제'] }, '2026-05-14', 8, 7, 0, '2026-11-10'),
  card({ id: 'C010', title: '단체 예약 손님이 오지 않을 때(노쇼)', topic: '단체 예약', source: '공식규정', authorId: 'P001',
    situation: '15명 단체 예약이 예약 시간 30분이 지나도 오지 않음.',
    reason: '단체 예약은 자리를 비워 두기 때문에 노쇼가 나면 그날 매출이 크게 준다. 예약금은 예약할 때 안내한 규정대로 처리해야 분쟁이 없다.',
    actions: ['예약 시간 15분이 지나면 예약자에게 전화한다', '30분이 지나도 연락이 안 되면 자리를 다른 손님에게 연다', '예약금 처리는 예약 때 안내한 규정대로 점장이 정한다'],
    avoid: '직원이 예약금을 돌려준다고 먼저 약속하지 않는다.', escalateWhen: '예약자가 예약금 반환을 요구할 때', tags: ['단체', '예약', '노쇼', '예약금'] }, '2026-07-01', 4, 4),
  card({ id: 'C011', title: '대학 축제 기간엔 생맥주·소주를 평소의 1.5배로', topic: '재고·발주', source: '현장노하우', authorId: 'P003', itemIds: ['I003', 'I001', 'I002'],
    situation: '한빛대 축제 기간이면 축제가 끝나는 밤 9시 이후 손님이 몰림.',
    reason: '작년 축제 금요일 밤 10시쯤 생맥 케그가 바닥나 병맥주로 돌렸고 소주도 마감 전에 떨어졌다. 축제 날에는 평소 같은 요일보다 1.5배쯤 나갔다.',
    actions: ['축제 일정이 나오면 축제 이틀 전까지 생맥 케그와 소주를 평소의 1.5배로 주문한다', '여분 케그는 냉장 창고에 세워 둔다', '축제 날 밤 8시에 남은 케그를 한 번 확인한다'],
    avoid: '축제 당일에 추가 주문을 넣지 않는다. 주류 도매가 당일 배송을 못 한다.', escalateWhen: '축제 일정이 바뀌거나 행사가 취소될 때', tags: ['축제', '대학', '주문', '생맥', '소주'] }, '2026-05-30', 3, 3),
  card({ id: 'C012', title: '축구 국가대표 경기 날엔 생맥주를 평소의 1.3배로', topic: '재고·발주', source: '현장노하우', authorId: 'P002', itemIds: ['I003'],
    situation: '저녁에 국가대표 축구 경기가 있으면 경기 시작 1시간 전부터 단체 손님이 들어옴.',
    reason: '경기를 보는 손님은 피처로 생맥을 많이 시키고 소주는 평소와 비슷했다. 지난 평가전 날 생맥이 같은 요일의 1.3배 나갔다.',
    actions: ['경기 일정이 잡히면 전날까지 생맥 케그를 평소의 1.3배로 맞춘다', '피처 잔을 미리 씻어 둔다', 'TV 소리는 경기 시작 전에 맞춰 둔다'],
    avoid: '경기 날이라고 소주까지 늘려 주문하지 않는다.', escalateWhen: '경기가 연장되어 마감 시각을 넘길 때', tags: ['축구', '경기', '국가대표', '생맥', '피처'] }, '2026-09-10', 1, 1),
  card({ id: 'C013', title: '마감 재고는 냉장고와 창고를 따로 센다', topic: '재고·발주', source: '현장노하우', authorId: 'P004', itemIds: ['I001', 'I002'],
    situation: '마감 실사에서 소주 수가 계산과 자주 다르게 나옴.',
    reason: '냉장고만 세고 창고 박스를 빼먹거나 창고 박스를 두 번 세는 일이 많았다. 위치별로 나눠 적으면 어디서 틀렸는지 바로 찾는다.',
    actions: ['냉장고 칸별로 먼저 세서 적는다', '창고는 짝(20병) 단위로 세고 낱병은 따로 적는다', '두 합계를 더해 실사에 입력한다', '계산과 크게 다르면 한 번 더 센다'],
    avoid: '눈대중으로 짝 수를 어림하지 않는다.', escalateWhen: '다시 세도 한 짝 이상 차이가 날 때', tags: ['실사', '재고', '마감', '소주', '창고', '냉장고'] }, '2026-09-02', 6, 6),
  card({ id: 'C014', title: '진로 실사 차이: 단체 서비스 소주를 POS에 안 찍음', topic: '재고·발주', source: '현장노하우', authorId: 'P001', origin: '기록', itemIds: ['I002', 'I001'],
    situation: '마감 실사에서 진로가 계산보다 10병 적음.',
    reason: '단체 손님에게 서비스로 준 소주를 POS에 0원 메뉴로 찍지 않아서 판매로 안 잡혔다. 서비스도 POS에 찍어야 재고가 맞는다.',
    actions: ['서비스로 주는 술은 POS에서 서비스(0원) 메뉴로 찍는다', '실사 차이가 나면 그날 서비스 기록부터 확인한다'],
    avoid: '서비스 소주를 기록 없이 내주지 않는다.', escalateWhen: '서비스 기록으로 설명되지 않는 차이가 한 짝 이상일 때', tags: ['실사', '차이', '서비스', '진로', '소주'] }, '2026-10-17', 2, 2),
];

const seedFile = {
  store: { name: '포차 달빛 (가상 데모 매장)', today: TODAY },
  topics: ['주류·케그', '신분증 확인', '취객·분쟁 응대', '결제·POS', '단체 예약', '재고·발주', '품절·대체', '기타'],
  people: [
    { id: 'P001', name: '한서윤', role: '점장', tenure: '5년차' },
    { id: 'P002', name: '민지', role: '숙련', tenure: '2년차' },
    { id: 'P003', name: '준호', role: '숙련', tenure: '1년 6개월' },
    { id: 'P004', name: '수빈', role: '숙련', tenure: '8개월' },
    { id: 'P005', name: '지우', role: '신입', tenure: '1주차' },
    { id: 'P006', name: '도윤', role: '신입', tenure: '3일차' },
  ],
  cards,
  questions: [
    { id: 'Q001', text: '모바일 신분증 앱 화면으로 보여 줘도 되나요?', askerId: 'P006', time: '2026-10-30T19:12:00', status: 'answered', cited: ['C001'], confidence: 'high', feedback: 'solved',
      answer: '어려 보이는 손님은 첫 주문 전에 신분증 확인 [C001]\n2. 실물 신분증이나 모바일 신분증 앱 화면에서 생년월일과 사진을 본다 [C001]\n3. 신분증을 찍은 사진(캡처)은 받지 않는다 [C001]', why: cards[0].reason },
    { id: 'Q002', text: '와인 가져와서 마셔도 되냐고 물어보세요', askerId: 'P005', time: '2026-10-30T20:40:00', status: 'escalated', cited: [], confidence: 'none', feedback: null,
      answer: '매장 위키에 이 상황에 맞는 사례가 아직 없어요. 점장님께 질문을 넘겼어요. 답이 오면 위키에 사례로 추가돼요.', why: '' },
  ],
  topicSummaries: {},
  log: [
    { time: '2026-10-17T01:10:00', op: '실사 차이 → 새 카드', detail: '진로 -10병 → [C014]' },
    { time: '2026-10-23T01:20:00', op: '마감 재고 실사', detail: `${items.length}개 품목 (수빈)` },
    { time: '2026-10-30T20:40:00', op: '점장에게 넘김', detail: '[Q002] 와인 가져와서 마셔도 되냐고 물어보세요' },
  ],
  inventory: {
    items,
    recipes,
    sales: sales.filter((s) => s.date < CSV_FROM),
    deliveries: [
      ...['I001', 'I002', 'I003', 'I004', 'I005', 'I006', 'I007', 'I008', 'I009'].map((itemId) => ({ date: '2026-10-20', itemId, qty: items.find((i) => i.id === itemId)!.pack * 2 })),
      ...deliveries,
    ],
    stocktakes,
    events: [
      { from: '2026-11-03', to: '2026-11-03', label: '국가대표 축구 평가전 (저녁 8시)' },
      { from: '2026-11-05', to: '2026-11-06', label: '한빛대학교 축제' },
    ],
    adjustments: [],
    orders,
    imports: [{ id: 'U001', at: '2026-10-24T02:05:00', file: '포차달빛_메뉴별매출_2026-10-03_10-23.csv', rows: 231, days: [], unknownMenus: [] }],
  } satisfies Inventory,
};
writeFileSync(join(DATA_DIR, 'seed.json'), JSON.stringify(seedFile, null, 1) + '\n');

// ---------- 이번 주 POS 매출 CSV (OKPOS 내보내기 모양: 제목 줄·합계 줄·취소 줄 포함) ----------
const week = sales.filter((s) => s.date >= CSV_FROM);
const price = (m: string) => BASE[m]?.[1] ?? 8000;
const won = (n: number) => `"${n.toLocaleString('en-US')}"`;
const rows = [
  '포차 달빛 메뉴별 매출 현황',
  `조회기간: ${CSV_FROM} ~ 2026-10-30`,
  '영업일자,메뉴명,판매수량,판매금액',
  ...week.map((s) => `${s.date},${s.menu},${s.qty},${won(s.qty * price(s.menu))}`),
  `2026-10-29,소맥 세트,-1,${won(-15000)}`, // 취소 1건
  `,합계,${week.reduce((t, s) => t + s.qty, 0) - 1},${won(week.reduce((t, s) => t + s.qty * price(s.menu), 0) - 15000)}`,
];
mkdirSync(join(DATA_DIR, 'pos'), { recursive: true });
writeFileSync(join(DATA_DIR, 'pos', `포차달빛_메뉴별매출_${CSV_FROM}_10-30.csv`), '\uFEFF' + rows.join('\r\n') + '\r\n');
console.log(`seed.json: 카드 ${cards.length} · 품목 ${items.length} · 판매 ${seedFile.inventory.sales.length}줄 / CSV ${week.length + 1}줄`);
console.log(items.map((i) => `${i.name} 발주점 ${i.reorderPoint} 적정 ${i.par} 10/23 실사 ${stocktakes.find((s) => s.itemId === i.id && s.date === COUNT_DAY)!.counted}`).join('\n'));
