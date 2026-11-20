// 원본은 JSON 하나(var/store.json). 처음 켜거나 초기화하면 data/seed/*.json을 불러온다.
// 모든 지식 엔티티(사람·카드·질문·기록)에 storeId가 있다. 본사 카드(scope=brand)와 SV는 storeId=null.
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type {
  Brand, Card, CardOrigin, CardStatus, ComplaintType, Diagnosis, HqStandard, LogEntry, OnboardingRead, Person, Prescription, Question, Review, RuleDrift, Source, StandardProposal, Store,
} from '@shared/contracts';
import { SEED_DIR, STORE_DIR } from '../paths.js';
import { addRead, brandShares, computeOnboarding, computeSituations } from '../rules/situations.js';
import { retag } from '../rules/tagging.js';

const STORE_FILE = join(STORE_DIR, 'store.json');
const SCHEMA = 'hq-1';

/** 주점 도메인 토픽(시드 knowledge.json과 같은 이름). 시드 카드·요약에 다른 토픽이 있으면 뒤에 덧붙인다 */
export const TOPICS = ['이용시간', '좌석 배정', '최소주문', '품절·대체', '결제·계산', '신분증', '이물·위생', '응대 기본', '주류·케그', '취객·분쟁 응대', '단체 예약', '기타'];

export interface Link { source: string; target: string; kind: 'conflicts' | 'duplicates' }

export interface Db {
  schema: string;
  brand: Brand;
  stores: Store[];
  reviews: Review[];
  virtualPool: Review[]; // 아직 넣지 않은 처방 이후 가상 리뷰
  simulated: string[]; // 가상 리뷰를 넣은 매장
  standards: HqStandard[];
  people: Person[];
  cards: Card[];
  questions: Question[];
  topics: string[];
  topicSummaries: Record<string, Record<string, string>>; // storeId → 토픽 → 핵심 원칙
  log: LogEntry[];
  links: Link[]; // 점검관이 찾은 상충·중복(카드 번호는 전역에서 유일하다)
  diagnoses: Diagnosis[]; // 매장마다 최신 1개
  drifts: RuleDrift[];
  prescriptions: Prescription[];
  proposals: StandardProposal[];
  manualChecks: { storeId: string; personId: string; date: string; itemId: string }[];
  onboardingReads: OnboardingRead[]; // 신입이 첫 근무 준비 카드를 읽은 기록(사람·카드마다 1건)
}

let db: Db | null = null;
let reviewsVersion = 0;
/** 리뷰가 바뀔 때마다 오른다. 점수 캐시가 이것을 본다 */
export const reviewsStamp = () => reviewsVersion;
export const touchReviews = () => void reviewsVersion++;

function readSeed<T>(name: string, fallback?: T): T {
  const f = join(SEED_DIR, name);
  if (!existsSync(f)) {
    if (fallback !== undefined) return fallback;
    throw new Error(`시드 파일 없음: ${f}`);
  }
  return JSON.parse(readFileSync(f, 'utf8')) as T;
}

interface KnowledgeSeed {
  people?: Person[];
  cards?: Card[];
  questions?: Question[];
  topicSummaries?: Record<string, string> | Record<string, Record<string, string>>;
}

/** 시연용 시드: 타깃 매장의 P005(1주차 신입)가 첫 근무 준비 카드 앞 3장을 읽은 상태. 시드 시점의 카드·리뷰로 계산한다 */
export function seedReads(d: Pick<Db, 'brand' | 'stores' | 'reviews' | 'cards' | 'questions' | 'people'>): OnboardingRead[] {
  const target = d.stores.find((s) => s.isTarget)?.id ?? d.stores[0]?.id;
  const reads: OnboardingRead[] = [];
  if (!target || !d.people.some((p) => p.id === 'P005' && p.storeId === target)) return reads;
  const mine = d.reviews.filter((r) => r.storeId === target);
  const cards = d.cards.filter((c) => c.scope === 'brand' || c.storeId === target);
  const situations = computeSituations({ storeId: target, reviews: mine, cards, questions: d.questions.filter((q) => q.storeId === target), brand: brandShares(d.reviews) });
  computeOnboarding(target, situations, []).items.slice(0, 3).forEach((it, i) => addRead(reads, 'P005', it.cardId, `${addDays(d.brand.dataAsOf, -(i === 0 ? 2 : 1))}T1${i}:00:00`));
  return reads;
}

/** 시드에서 새 저장소를 만든다. 리뷰는 규칙으로 다시 태깅한다 */
export function fromSeed(): Db {
  const brand = readSeed<Brand>('brand.json');
  const stores = readSeed<Store[]>('stores.json');
  const target = stores.find((s) => s.isTarget)?.id ?? stores[0]?.id ?? null;
  const k = readSeed<KnowledgeSeed>('knowledge.json', {});
  const cards = (k.cards ?? []).map((c) => {
    const scope = c.scope ?? (c.storeId === null ? 'brand' : 'store');
    return { ...c, scope, storeId: scope === 'brand' ? null : (c.storeId ?? target) } as Card;
  });
  const people = (k.people ?? []).map((p) => ({ ...p, storeId: p.storeId === undefined ? (p.role === 'SV' ? null : target) : p.storeId }));
  const questions = (k.questions ?? []).map((q) => ({ ...q, storeId: q.storeId ?? target! }));
  const ts = k.topicSummaries ?? {};
  const flat = Object.values(ts).some((v) => typeof v === 'string');
  const topicSummaries = (flat ? (target ? { [target]: ts as Record<string, string> } : {}) : ts) as Record<string, Record<string, string>>;
  const reviews = readSeed<Review[]>('reviews.json').map(retag);
  return {
    schema: SCHEMA,
    brand,
    stores,
    reviews,
    virtualPool: readSeed<Review[]>('virtual_after.json', []).map((r) => ({ ...retag(r), virtual: true })),
    simulated: [],
    standards: readSeed<HqStandard[]>('standards.json'),
    people,
    cards,
    questions,
    topics: [...new Set([...TOPICS, ...Object.values(topicSummaries).flatMap((x) => Object.keys(x)), ...cards.map((c) => c.topic)])],
    topicSummaries,
    log: [],
    links: [],
    diagnoses: [],
    drifts: [],
    prescriptions: [],
    proposals: [],
    manualChecks: [],
    onboardingReads: seedReads({ brand, stores, reviews, cards, questions, people }),
  };
}

/** 저장 파일이 있으면 읽고, 없거나 예전 모양이면 시드로 새로 만든다. 새로 만들었으면 true */
export function load(): { db: Db; fresh: boolean } {
  if (existsSync(STORE_FILE)) {
    const d = JSON.parse(readFileSync(STORE_FILE, 'utf8')) as Db;
    if (d.schema === SCHEMA) {
      d.onboardingReads ??= seedReads(d); // v3 이전에 저장한 파일에는 읽음 기록이 없다
      d.manualChecks ??= [];
      db = d;
      touchReviews();
      return { db, fresh: false };
    }
  }
  return { db: resetFromSeed(), fresh: true };
}

export function resetFromSeed(): Db {
  db = fromSeed();
  touchReviews();
  save();
  return db;
}

export function get(): Db {
  return db ?? load().db;
}

export function save(snapshot = get()) {
  mkdirSync(STORE_DIR, { recursive: true });
  const temporary = STORE_FILE + '.' + process.pid + '.tmp';
  writeFileSync(temporary, JSON.stringify(snapshot));
  renameSync(temporary, STORE_FILE);
}

// ---------- 날짜·번호 ----------

/** 시연의 '오늘'은 리뷰 수집일로 고정한다(실제 리뷰 날짜와 맞아야 처방 전·후 비교가 된다) */
export const today = () => get().brand.dataAsOf;
export const now = () => `${today()}T${new Date().toTimeString().slice(0, 8)}`;

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** prefix로 시작하는 번호 중 가장 큰 숫자 + 1 */
export function nextId(prefix: string, list: { id: string }[], pad = 3): string {
  const max = list.reduce((m, x) => (x.id.startsWith(prefix) ? Math.max(m, Number(x.id.slice(prefix.length).match(/^\d+/)?.[0] ?? 0)) : m), 0);
  return prefix + String(max + 1).padStart(pad, '0');
}

export function addLog(op: string, detail: string, storeId: string | null, runId?: string): LogEntry {
  const e: LogEntry = { time: now(), storeId, op, detail, ...(runId ? { runId } : {}) };
  get().log.push(e);
  if (get().log.length > 2000) get().log.splice(0, get().log.length - 2000);
  return e;
}

// ---------- 조회 ----------

export const store = (id: string) => get().stores.find((s) => s.id === id);
export const targetStore = () => get().stores.find((s) => s.isTarget) ?? get().stores[0];
export const standard = (id: string) => get().standards.find((s) => s.id === id);
export const card = (id: string) => get().cards.find((c) => c.id === id);
export const question = (id: string) => get().questions.find((q) => q.id === id);
export const person = (id: string) => get().people.find((p) => p.id === id);
export const prescription = (id: string) => get().prescriptions.find((p) => p.id === id);
export const isExpired = (c: Card) => c.expires < today();

/** 매장 리뷰(가상 리뷰는 넣은 뒤에만 들어 있다) */
let reviewIndex: { stamp: number; by: Map<string, Review[]> } | null = null;
export function reviewsOf(storeId: string): Review[] {
  if (!reviewIndex || reviewIndex.stamp !== reviewsVersion) {
    const by = new Map<string, Review[]>();
    for (const r of get().reviews) {
      const list = by.get(r.storeId);
      if (list) list.push(r);
      else by.set(r.storeId, [r]);
    }
    reviewIndex = { stamp: reviewsVersion, by };
  }
  return reviewIndex.by.get(storeId) ?? [];
}
export const review = (id: string) => get().reviews.find((r) => r.id === id);

/** 매장이 볼 수 있는 카드: 그 매장 카드 + 본사 카드. 발송 전(초안)이거나 반려된 처방의 카드는 매장에 보이지 않는다 */
export function storeCards(storeId: string): Card[] {
  return get().cards.filter((c) => {
    if (c.storeId !== storeId && c.scope !== 'brand') return false;
    if (!c.prescriptionId) return true;
    const p = prescription(c.prescriptionId);
    return !p || p.status === 'sent' || p.status === 'done';
  });
}
export const approvedCards = (storeId: string) => storeCards(storeId).filter((c) => c.status === 'approved');

/** 출처 우선순위: 본사 표준 > 공식규정 > 현장노하우 */
export const SOURCE_RANK: Record<Source, number> = { '본사 표준': 3, 공식규정: 2, 현장노하우: 1 };

/** 답의 근거로 쓸 수 있는 카드: 승인됐고, 만료 전이고, 더 높은 출처와 상충한다고 표시된 카드가 아닌 것 */
export function usableCards(storeId: string): { usable: Card[]; excluded: { id: string; why: string }[] } {
  const d = get();
  const conflicted = new Map<string, string>();
  for (const l of d.links.filter((x) => x.kind === 'conflicts')) {
    const [a, b] = [card(l.source), card(l.target)];
    if (!a || !b || a.source === b.source) continue;
    const [low, high] = SOURCE_RANK[a.source] < SOURCE_RANK[b.source] ? [a, b] : [b, a];
    conflicted.set(low.id, `${high.source}과 상충`);
  }
  const usable: Card[] = [];
  const excluded: { id: string; why: string }[] = [];
  for (const c of approvedCards(storeId)) {
    if (isExpired(c)) excluded.push({ id: c.id, why: `만료(${c.expires})` });
    else if (conflicted.has(c.id)) excluded.push({ id: c.id, why: conflicted.get(c.id)! });
    else usable.push(c);
  }
  return { usable, excluded };
}

export const personLabel = (id: string) => {
  const p = person(id);
  return p ? `${p.name}(${p.role} ${p.tenure})` : id;
};

/** 매장의 기본 인물: 질문자는 신입, 답하는 사람은 점장. 매장에 사람이 없으면 역할 이름을 쓴다 */
export const defaultPerson = (storeId: string, role: Person['role']) => get().people.find((p) => p.storeId === storeId && p.role === role)?.id ?? `${storeId}-${role}`;
export const svPerson = () => get().people.find((p) => p.role === 'SV')?.id ?? 'SV';

// ---------- 만들기 ----------

export interface CardFields {
  title: string; topic: string; situation: string; reason: string; actions: string[];
  avoid: string; escalateWhen: string; source: Source; tags: string[]; customerNotice?: string;
}

export interface CardExtra {
  storeId: string | null;
  fromQuestionId?: string;
  prescriptionId?: string;
  standardId?: string;
  complaintTypes?: ComplaintType[];
}

export function createCard(f: CardFields, authorId: string, status: CardStatus, origin: CardOrigin, extra: CardExtra): Card {
  const d = get();
  const source: Source = f.source === '본사 표준' || f.source === '공식규정' ? f.source : '현장노하우';
  const c: Card = {
    id: nextId('C', d.cards),
    storeId: extra.storeId,
    scope: extra.storeId === null ? 'brand' : 'store',
    title: f.title,
    topic: d.topics.includes(f.topic) ? f.topic : '기타',
    situation: f.situation,
    reason: f.reason,
    actions: f.actions,
    avoid: f.avoid ?? '',
    escalateWhen: f.escalateWhen ?? '',
    ...(f.customerNotice ? { customerNotice: f.customerNotice } : {}),
    source,
    authorId,
    status,
    origin,
    created: today(),
    updated: today(),
    expires: addDays(today(), source === '현장노하우' ? 120 : 180),
    tags: f.tags ?? [],
    uses: 0,
    helpful: 0,
    notHelpful: 0,
    ...(extra.fromQuestionId ? { fromQuestionId: extra.fromQuestionId } : {}),
    ...(extra.prescriptionId ? { prescriptionId: extra.prescriptionId } : {}),
    ...(extra.standardId ? { standardId: extra.standardId } : {}),
    ...(extra.complaintTypes?.length ? { complaintTypes: extra.complaintTypes } : {}),
  };
  d.cards.push(c);
  return c;
}

export function createQuestion(f: Omit<Question, 'id' | 'time' | 'feedback'>): Question {
  const d = get();
  const q: Question = { id: nextId('Q', d.questions), time: now(), feedback: null, ...f };
  d.questions.push(q);
  return q;
}
