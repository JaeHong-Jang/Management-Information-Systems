// 수집팀: 개인정보 가드 → 회고 인터뷰어 → 사례 카드 편집자
import { z } from 'zod';
import type { Source } from '@shared/contracts';
import { ask, llmEnabled, storeSystem } from '../harness/llm.js';
import { llmOr, type StepOut } from '../harness/runner.js';
import { maskPii } from '../tools/policies.js';
import type { CardFields } from '../store/db.js';

export interface FollowupAnswer { question: string; answer: string }

// ---------- 개인정보 가드 (규칙) ----------

export function privacyGuard(raw: string): StepOut<{ text: string; masked: number }> {
  const r = maskPii(raw);
  return { out: r, summary: r.masked ? `전화번호·카드번호·고객 이름 ${r.masked}곳 가림 처리` : '가릴 개인정보 없음' };
}

// ---------- 회고 인터뷰어 ----------

const REASON_RE = /(때문|이유|왜냐|해서|라서|면 안|하면|니까|므로)/;
const AVOID_RE = /(하지 않|하지 말|금지|절대|면 안 된|면 안 돼|주지 않|받지 않)/;
const ESC_RE = /(점장|매니저|사장님께|사장님한테)/;

export const sentences = (text: string) =>
  text.split(/(?<=[.!?。])\s+|\n+|\s*->\s*|\s*→\s*/).map((s) => s.trim()).filter(Boolean);

function missingFields(raw: string) {
  const ss = sentences(raw);
  return {
    reason: !ss.some((s) => REASON_RE.test(s) && !AVOID_RE.test(s)),
    avoid: !ss.some((s) => AVOID_RE.test(s)),
    escalate: !ss.some((s) => ESC_RE.test(s)),
  };
}

const Q_REASON = '그렇게 대응한 이유가 무엇인가요? 다르게 하면 어떤 문제가 생기나요?';
const Q_AVOID = '이 방법을 쓰면 안 되는 경우나, 절대 하면 안 되는 행동이 있나요?';
const Q_ESC = '어떤 상황이면 혼자 처리하지 말고 점장을 불러야 하나요?';

export function followupsByRules(raw: string): string[] {
  const m = missingFields(raw);
  const qs = [m.reason && Q_REASON, m.avoid && Q_AVOID].filter(Boolean) as string[];
  if (qs.length < 2 && m.escalate) qs.push(Q_ESC);
  return qs.slice(0, 2);
}

export interface StoreCtx { brand: string; store: string }

export async function interviewer(raw: string, answered: boolean, ctx: StoreCtx): Promise<StepOut<string[]>> {
  if (answered) return { out: [], summary: '되묻기 답변 수신 · 추가 질문 없음', status: 'skipped' };
  const { value, via } = await llmOr(
    async () =>
      (await ask('interviewer', {
        system: storeSystem(ctx),
        user: `[직원 기록]\n${raw}\n\n이 기록을 신입이 응용할 수 있는 사례로 만들려면 판단 이유, 하면 안 되는 것, 점장 호출 기준 중 무엇이 빠졌는지 보고, 빠진 것만 되묻는 질문을 0~2개 만들어라. 질문은 직원이 10초 안에 답할 수 있게 구체적으로.`,
        schema: z.object({ followups: z.array(z.string()) }),
      }))?.followups.slice(0, 2) ?? null,
    () => followupsByRules(raw),
    llmEnabled(),
  );
  return { out: value, via, summary: value.length ? `누락 내용 ${value.length}개 재질문: ${value[0]}` : '판단 근거 포함 · 재질문 없음' };
}

// ---------- 사례 카드 편집자 ----------

/** 주점 도메인 토픽 키워드. 매장 토픽 목록(db.topics)에 있는 것만 쓴다 */
export const TOPIC_KEYWORDS: Record<string, string[]> = {
  이용시간: ['이용시간', '시간 제한', '2시간', '두 시간', '퇴장', '나가', '연장', '마감'],
  '좌석 배정': ['자리', '좌석', '합석', '인원', '테이블', '혼자', '2인', '1인', '단체'],
  최소주문: ['최소주문', '최소 주문', '기본 주문', '1인 1'],
  '품절·대체': ['품절', '대체', '떨어', '메뉴', '안주'],
  '결제·계산': ['결제', '계산', '카드', '영수증', '정산', 'pos', '포스', '더치', '현금', '페이'],
  신분증: ['신분증', '미성년', '청소년', '나이', '민증', '모바일 신분증'],
  '취객·분쟁 응대': ['취한', '취객', '만취', '시비', '먹튀', '싸움', '말다툼'],
  '이물·위생': ['위생', '머리카락', '벌레', '이물', '청소', '냄새', '끈적'],
  '응대 기본': ['불친절', '응대', '태도', '사과', '인사', '대기', '웨이팅', '항의', '불만'],
  '단체 예약': ['예약', '노쇼', '예약금'],
  '주류·케그': ['생맥', '케그', '거품', '맥주', '소주', '하이볼', '얼음', '주류'],
};

export function guessTopic(text: string, topics: string[]): string {
  const t = text.toLowerCase();
  let best = { topic: '기타', hits: 0, first: Infinity };
  for (const [topic, kws] of Object.entries(TOPIC_KEYWORDS)) {
    if (!topics.includes(topic)) continue;
    const found = kws.map((k) => t.indexOf(k)).filter((i) => i >= 0);
    const cand = { topic, hits: found.length, first: Math.min(...found) };
    if (cand.hits > best.hits || (cand.hits === best.hits && cand.hits > 0 && cand.first < best.first)) best = cand;
  }
  return best.topic;
}

export function structureByRules(raw: string, answers: FollowupAnswer[], topics: string[]): CardFields {
  const ss = sentences(raw);
  const pick = (re: RegExp, not?: RegExp) => ss.filter((s) => re.test(s) && !(not && not.test(s)));
  let reason = pick(REASON_RE, AVOID_RE).join(' ');
  let avoid = pick(AVOID_RE).join(' ');
  let escalateWhen = pick(ESC_RE).join(' ');
  for (const { question, answer } of answers) {
    if (!answer?.trim()) continue;
    if (/이유/.test(question)) reason = [reason, answer].filter(Boolean).join(' ');
    else if (/안 되는|하면 안/.test(question)) avoid = [avoid, answer].filter(Boolean).join(' ');
    else if (/점장/.test(question)) escalateWhen = [escalateWhen, answer].filter(Boolean).join(' ');
  }
  const actions = ss.slice(1).filter((s) => !REASON_RE.test(s) && !AVOID_RE.test(s) && !ESC_RE.test(s));
  const topic = guessTopic(raw, topics);
  return {
    title: (ss[0] ?? '새 사례').replace(/[.。]$/, '').slice(0, 40),
    topic,
    situation: ss[0] ?? '',
    reason,
    actions: actions.length ? actions : ss.slice(1, 3),
    avoid,
    escalateWhen,
    source: (/(본사|규정|정책)/.test(raw) ? '공식규정' : '현장노하우') as Source,
    tags: (TOPIC_KEYWORDS[topic] ?? []).filter((k) => raw.toLowerCase().includes(k)),
  };
}

export async function cardWriter(raw: string, answers: FollowupAnswer[], topics: string[], ctx: StoreCtx): Promise<StepOut<CardFields>> {
  const qa = answers.filter((a) => a.answer?.trim()).map((a) => `Q: ${a.question}\nA: ${a.answer}`).join('\n');
  const schema = z.object({
    title: z.string().describe('검색하기 쉬운 상황 중심 제목, 30자 이내'),
    topic: z.enum(topics as [string, ...string[]]),
    situation: z.string(),
    reason: z.string().describe('판단 이유. 직원이 말한 근거만'),
    actions: z.array(z.string()).describe('순서대로 할 일'),
    avoid: z.string().describe('하면 안 되는 것 / 적용하면 안 되는 조건'),
    escalateWhen: z.string().describe('점장을 불러야 하는 기준'),
    source: z.enum(['공식규정', '현장노하우']),
    tags: z.array(z.string()),
  });
  const { value, via } = await llmOr<CardFields>(
    () => ask('card-writer', { system: storeSystem(ctx), user: `[직원 기록]\n${raw}\n${qa ? `\n[되묻기 답]\n${qa}\n` : ''}\n위 내용을 사례 카드로 구조화하라.`, schema }),
    () => structureByRules(raw, answers, topics),
    llmEnabled(),
  );
  const filled = [value.reason && '판단 이유', value.avoid && '금지', value.escalateWhen && '호출 기준'].filter(Boolean);
  return { out: value, via, summary: `'${value.title}' 카드 초안 (${value.topic}, ${value.source}) · 채운 칸: ${filled.join('·') || '대응만'}` };
}
