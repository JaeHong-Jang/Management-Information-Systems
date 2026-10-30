// 원본은 JSON 하나(var/store.json). 바뀔 때마다 사람이 읽는 마크다운 위키(data/wiki/)를 다시 컴파일한다.
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Card, CardOrigin, CardStatus, EdgeType, LogEntry, Person, Question, Snapshot, Source } from '@shared/contracts';
import { DATA_DIR, STORE_DIR } from '../paths.js';

const STORE_FILE = join(STORE_DIR, 'store.json');
const SEED_FILE = join(DATA_DIR, 'seed.json');
const WIKI_DIR = join(DATA_DIR, 'wiki');

export interface Db extends Snapshot {
  links: { source: string; target: string; type: EdgeType }[]; // 점검관이 찾은 상충·중복
}

let db: Db | null = null;

export function load(): Db {
  if (!existsSync(STORE_FILE)) return resetFromSeed();
  db = JSON.parse(readFileSync(STORE_FILE, 'utf8')) as Db;
  db.links ??= [];
  return db;
}

export function resetFromSeed(): Db {
  mkdirSync(STORE_DIR, { recursive: true });
  copyFileSync(SEED_FILE, STORE_FILE);
  db = JSON.parse(readFileSync(STORE_FILE, 'utf8')) as Db;
  db.links = [];
  return db;
}

export function get(): Db {
  return db ?? load();
}

export function save(compile = process.env.STORE_DIR !== 'var/test') {
  writeFileSync(STORE_FILE, JSON.stringify(db, null, 1));
  if (compile) compileWiki();
}

export const today = () => get().store.today;
export const now = () => `${today()}T${new Date().toTimeString().slice(0, 8)}`;

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function addLog(op: string, detail: string, runId?: string): LogEntry {
  const e = { time: now(), op, detail, runId };
  get().log.push(e);
  return e;
}

function nextId(prefix: string, list: { id: string }[]): string {
  const max = list.reduce((m, x) => Math.max(m, Number(x.id.slice(1)) || 0), 0);
  return prefix + String(max + 1).padStart(3, '0');
}

export interface CardFields {
  title: string; topic: string; situation: string; reason: string; actions: string[];
  avoid: string; escalateWhen: string; source: Source; tags: string[];
}

export function createCard(f: CardFields, authorId: string, status: CardStatus, origin: CardOrigin, fromQuestionId?: string): Card {
  const d = get();
  const card: Card = {
    id: nextId('C', d.cards),
    title: f.title,
    topic: d.topics.includes(f.topic) ? f.topic : '기타',
    situation: f.situation,
    reason: f.reason,
    actions: f.actions,
    avoid: f.avoid ?? '',
    escalateWhen: f.escalateWhen ?? '',
    source: f.source === '공식규정' ? '공식규정' : '현장노하우',
    authorId,
    status,
    origin,
    created: today(),
    updated: today(),
    expires: addDays(today(), f.source === '공식규정' ? 180 : 120),
    tags: f.tags ?? [],
    uses: 0,
    helpful: 0,
    notHelpful: 0,
    ...(fromQuestionId ? { fromQuestionId } : {}),
  };
  d.cards.push(card);
  return card;
}

export function createQuestion(f: Omit<Question, 'id' | 'time' | 'feedback'>): Question {
  const d = get();
  const q: Question = { id: nextId('Q', d.questions), time: now(), feedback: null, ...f };
  d.questions.push(q);
  return q;
}

export const card = (id: string) => get().cards.find((c) => c.id === id);
export const question = (id: string) => get().questions.find((q) => q.id === id);
export const person = (id: string) => get().people.find((p) => p.id === id);
export const approvedCards = () => get().cards.filter((c) => c.status === 'approved');
export const personLabel = (id: string) => {
  const p = person(id);
  return p ? `${p.name}(${p.role} ${p.tenure})` : id;
};

export function findOrCreatePerson(name: string, role: Person['role'], tenure: string): Person {
  const d = get();
  const found = d.people.find((p) => p.name === name);
  if (found) return found;
  const p: Person = { id: nextId('P', d.people), name, role, tenure };
  d.people.push(p);
  return p;
}

// ---------- 마크다운 위키 (Karpathy LLM Wiki: index + log + 토픽 페이지 + 사람 페이지) ----------

const slug = (s: string) => s.replace(/[·\s/]/g, '-');

function cardMd(c: Card): string {
  return [
    `### [${c.id}] ${c.title}`,
    `- ${c.source} · 작성 ${personLabel(c.authorId)} · 갱신 ${c.updated} · 만료 ${c.expires} · 재사용 ${c.uses}회 (도움 ${c.helpful} / 안 됨 ${c.notHelpful})`,
    `- 상황: ${c.situation}`,
    `- 판단 이유: ${c.reason || '(비어 있음)'}`,
    `- 대응:`,
    ...c.actions.map((a, i) => `  ${i + 1}. ${a}`),
    c.avoid ? `- 하면 안 되는 것: ${c.avoid}` : '',
    c.escalateWhen ? `- 점장 호출 기준: ${c.escalateWhen}` : '',
    c.fromQuestionId ? `- 출처 질문: ${c.fromQuestionId} (점장 답변에서 생성)` : '',
    '',
  ].filter(Boolean).join('\n');
}

export function compileWiki() {
  const d = get();
  mkdirSync(join(WIKI_DIR, 'topics'), { recursive: true });
  const approved = approvedCards();
  const index = [
    `# ${d.store.name} 매장 위키`,
    '',
    `갱신 ${now()} · 승인 사례 ${approved.length} · 승인 대기 ${d.cards.filter((c) => c.status === 'pending').length} · 질문 ${d.questions.length}`,
    '',
    '| 토픽 | 사례 | 핵심 원칙 첫 줄 |',
    '|---|---|---|',
  ];
  for (const topic of d.topics) {
    const cards = approved.filter((c) => c.topic === topic);
    const summary = d.topicSummaries[topic] ?? '';
    index.push(`| [${topic}](topics/${slug(topic)}.md) | ${cards.length} | ${summary.split('\n')[0]?.replace(/^[-\s]+/, '').slice(0, 60) || '-'} |`);
    writeFileSync(
      join(WIKI_DIR, 'topics', `${slug(topic)}.md`),
      [`# ${topic}`, '', '## 핵심 판단 원칙 (종합 편집자)', '', summary || '_아직 종합되지 않음_', '', '## 사례 카드', '', ...cards.map(cardMd)].join('\n'),
    );
  }
  index.push('', '## 사람', '', '[기여자 목록](people.md)');
  writeFileSync(join(WIKI_DIR, 'index.md'), index.join('\n') + '\n');
  const people = d.people.map((p) => {
    const mine = approved.filter((c) => c.authorId === p.id);
    const asked = d.questions.filter((q) => q.askerId === p.id).length;
    return `- ${p.name} (${p.role} ${p.tenure}) · 남긴 사례 ${mine.length}${mine.length ? ` (${mine.map((c) => c.id).join(', ')})` : ''} · 질문 ${asked}`;
  });
  writeFileSync(join(WIKI_DIR, 'people.md'), ['# 사람', '', ...people].join('\n') + '\n');
  writeFileSync(join(WIKI_DIR, 'log.md'), ['# 변경 기록', '', ...d.log.map((l) => `- ${l.time} · ${l.op} · ${l.detail}`)].join('\n') + '\n');
}
