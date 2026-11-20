// 처방팀: 처방 카드 작성자 · SV 과제 설계자 · 브리핑 작성자
import { z } from 'zod';
import type { Briefing, Card, CauseClass, ComplaintType, Finding, HqStandard, PrescriptionKind, RuleDrift, Store, StoreScore } from '@shared/contracts';
import { ask, llmEnabled, storeSystem } from '../harness/llm.js';
import { llmOr, type StepOut } from '../harness/runner.js';
import { standardFor } from '../rules/causes.js';
import { COMPLAINT_TOPIC, PLAYBOOK, SV_CHECKLIST, customerNoticeFor } from '../rules/prescribe.js';
import { forbidden } from '../tools/policies.js';
import type { CardFields } from '../store/db.js';

export interface CardDraft { findingId: string; complaint: ComplaintType; standardId?: string; fields: CardFields }
export interface PrescriptionDraft { kind: PrescriptionKind; title: string; body: string; findingIds: string[]; checklist: string[]; cardDrafts?: CardDraft[] }

const MAX_CARDS = 3;
const safeQuote = (f: Finding) => f.quotes.find((q) => !forbidden(q.text).length);

// ---------- 처방 카드 작성자 ----------

export function cardByRules(f: Finding, standards: HqStandard[]): CardFields {
  const st = standardFor(f.complaint, standards);
  const p = PLAYBOOK[f.complaint];
  const q = safeQuote(f);
  const topic = COMPLAINT_TOPIC[f.complaint];
  return {
    title: `'${f.complaint}' 불만 막는 안내`,
    topic,
    situation: `저평점 리뷰 ${f.count}건에서 ‘${f.complaint}’ 불만 확인.${q ? ` 예: "${q.text}" [${q.reviewId}]` : ''}`,
    reason: [st?.reason, `‘${f.complaint}’ 관련 불만 예방을 위한 사전 안내.`].filter(Boolean).join(' '),
    actions: p?.actions ?? ['주문 접수 전 관련 매장 기준 사전 안내', '안내 문구는 근무자 간 동일 문장 사용'],
    avoid: p?.avoid ?? '손님 문의 후에야 기준을 알리는 행위 금지.',
    escalateWhen: p?.escalateWhen ?? '안내 뒤에도 손님이 항의할 때',
    customerNotice: customerNoticeFor(f.complaint, standards),
    source: st ? '본사 표준' : '현장노하우',
    tags: [f.complaint, topic],
  };
}

/** 지식 공백 원인을 매장 사례 카드 초안으로. AI가 켜져 있으면 문장을 매장 상황에 맞게 다듬는다(인용·표준 밖의 사실은 쓰지 않는다) */
export async function playbookWriter(ctx: { brand: string; store: Store }, findings: Finding[], standards: HqStandard[], rulesOnly = false): Promise<StepOut<CardDraft[]>> {
  const targets = findings.filter((f) => f.cause === '지식 공백').slice(0, MAX_CARDS);
  if (!targets.length) return { out: [], summary: '사례 카드 작성 대상 없음', status: 'skipped' };
  const base = targets.map((f) => ({ findingId: f.id, complaint: f.complaint, standardId: standardFor(f.complaint, standards)?.id, fields: cardByRules(f, standards) }));
  const schema = z.object({
    cards: z.array(z.object({
      complaint: z.string(),
      title: z.string().describe('검색하기 쉬운 상황 중심 제목, 30자 이내'),
      situation: z.string(),
      reason: z.string().describe('판단 이유. 본사 표준 이유와 리뷰 근거만'),
      actions: z.array(z.string()),
      avoid: z.string(),
      escalateWhen: z.string(),
    })),
  });
  const { value, via } = await llmOr(
    async () => {
      const res = await ask('playbook-writer', {
        system: storeSystem({ brand: ctx.brand, store: ctx.store.name }),
        user: `본사가 이 매장에 내려보낼 사례 카드 초안을 다듬어라. 각 카드는 알바가 근무 중에 바로 따라 할 수 있어야 한다. 아래 표준과 리뷰 인용에 없는 금액·시간·절차를 지어내지 마라.\n\n${targets
          .map((f) => {
            const st = standardFor(f.complaint, standards);
            return `## ${f.complaint} (저평점 ${f.count}건)\n본사 표준(가상): ${st ? `${st.title} — ${st.rule}` : '없음'}\n리뷰: ${f.quotes.map((q) => `"${q.text}"`).join(' / ')}\n초안: ${JSON.stringify(cardByRules(f, standards))}`;
          })
          .join('\n\n')}`,
        schema,
      });
      if (!res) return null;
      return base.map((b) => {
        const l = res.cards.find((c) => c.complaint === b.complaint);
        return l ? { ...b, fields: { ...b.fields, title: l.title || b.fields.title, situation: l.situation || b.fields.situation, reason: l.reason || b.fields.reason, actions: l.actions.length ? l.actions : b.fields.actions, avoid: l.avoid || b.fields.avoid, escalateWhen: l.escalateWhen || b.fields.escalateWhen } } : b;
      });
    },
    () => base,
    llmEnabled() && !rulesOnly,
  );
  return { out: value, via, summary: `사례 카드 초안 ${value.length}개: ${value.map((c) => c.fields.title).join(' · ')}` };
}

// ---------- SV 과제 설계자 (규칙) ----------

const SV_TITLE: Record<Exclude<CauseClass, '지식 공백'>, string> = {
  '매장 자체 규칙': '본사 표준 확인 방문',
  '운영·인력': '피크 인력·응대 점검 방문',
  '위생·품질': 'QSC 점검 방문',
};

export function svPlanner(findings: Finding[], drifts: RuleDrift[], standards: HqStandard[]): StepOut<PrescriptionDraft[]> {
  const out: PrescriptionDraft[] = [];
  for (const cause of Object.keys(SV_TITLE) as Exclude<CauseClass, '지식 공백'>[]) {
    const fs = findings.filter((f) => f.cause === cause);
    // 본사 표준 확인 방문은 열린 규칙 차이 전부를 본다(불만의 대표 원인이 지식 공백이어도 일부 리뷰에 표준과 다른 운영이 보이면)
    const ds = cause === '매장 자체 규칙' ? drifts.filter((d) => d.status === 'open') : [];
    if (!fs.length && !ds.length) continue;
    const detail = cause === '매장 자체 규칙' && ds.length ? ds.map((d) => d.observed).join('; ') : fs.map((f) => `${f.complaint} ${f.count}건`).join(', ');
    const body = [
      `${SV_TITLE[cause]}: ${fs.map((f) => f.complaint).join(', ') || '리뷰에 드러난 본사 표준과 다른 운영'}`,
      ...fs.map((f) => {
        const st = f.standardId ? standards.find((s) => s.id === f.standardId) : undefined;
        return `- ${f.complaint}(저평점 ${f.count}건)${st ? ` · 본사 표준 ${st.id} '${st.title}'` : ''}${f.quotes[0] ? ` · "${f.quotes[0].text}" [${f.quotes[0].reviewId}]` : ''}`;
      }),
      ...ds.map((d) => {
        const st = standards.find((s) => s.id === d.standardId);
        return `- 규칙 차이 ${d.id}: ${st ? `본사 표준 ${st.id} '${st.title}'과 다름 · ` : ''}${d.observed}${d.reviewIds[0] ? ` [${d.reviewIds[0]}]` : ''}`;
      }),
    ].join('\n');
    const what = fs.length ? fs.map((f) => f.complaint).join('·') : ds.map((d) => d.standardId).join('·');
    out.push({ kind: 'SV 방문 과제', title: `${SV_TITLE[cause]} (${what})`, body, findingIds: fs.map((f) => f.id), checklist: SV_CHECKLIST[cause](detail) });
  }
  return { out, summary: out.length ? `SV 방문 과제 ${out.length}건: ${out.map((p) => p.title).join(' · ')}` : 'SV 방문 과제 없음', ...(out.length ? {} : { status: 'skipped' as const }) };
}

// ---------- 브리핑 작성자 ----------

/** 처방용: 새 사례 카드와 본사 표준의 손님 안내 문장을 '근무 전 브리핑' 처방 초안으로 묶는다 */
export function briefingDraft(cards: CardDraft[], findings: Finding[], standards: HqStandard[]): StepOut<PrescriptionDraft | null> {
  const lines: string[] = [];
  const used = new Set<string>();
  for (const c of cards) {
    if (!c.fields.customerNotice) continue;
    lines.push(`- ${c.complaint}: "${c.fields.customerNotice}"`);
    used.add(c.complaint);
  }
  for (const f of findings) {
    if (used.has(f.complaint) || f.cause !== '지식 공백') continue;
    const notice = customerNoticeFor(f.complaint, standards);
    if (notice) lines.push(`- ${f.complaint}: "${notice}"`);
    used.add(f.complaint);
  }
  if (!lines.length) return { out: null, summary: '브리핑에 사용할 고객 안내 문구 없음', status: 'skipped' };
  return {
    out: { kind: '근무 전 브리핑', title: `근무 전 브리핑: ${[...used].slice(0, 3).join('·')}`, body: ['근무 전 고객 안내 사항. 점장 승인 후 매장 브리핑에 반영.', ...lines].join('\n'), findingIds: findings.filter((f) => used.has(f.complaint)).map((f) => f.id), checklist: [] },
    summary: `브리핑 항목 ${lines.length}개 초안`,
  };
}

const firstSentence = (s: string) => s.split(/(?<=[.!?다요])\s/)[0]?.trim() ?? '';

/** 매장 브리핑: 승인된 매장·본사 카드 중 손님 안내 문장이 있는 것을 매장 상위 불만 순서로 */
export function briefingItems(cards: Card[], top: StoreScore['topComplaints'], today: string, max = 6): Briefing['items'] {
  const rank = (c: Card) => {
    const types = c.complaintTypes ?? [];
    const i = top.findIndex((t) => types.includes(t.type));
    if (i >= 0) return i;
    const j = top.findIndex((t) => COMPLAINT_TOPIC[t.type] === c.topic);
    return j >= 0 ? j + 0.5 : 99;
  };
  return cards
    .filter((c) => c.status === 'approved' && c.customerNotice?.trim() && c.expires >= today)
    .map((c) => ({ c, r: rank(c) }))
    .sort((a, b) => a.r - b.r || Number(b.c.origin === '처방') - Number(a.c.origin === '처방') || b.c.updated.localeCompare(a.c.updated))
    .filter((x, i, all) => all.findIndex((y) => y.c.customerNotice!.trim() === x.c.customerNotice!.trim()) === i) // 같은 안내 문장은 한 번만
    .slice(0, max)
    .map(({ c, r }) => {
      const t = r < 99 ? top[Math.floor(r)] : undefined;
      return { cardId: c.id, title: c.title, say: c.customerNotice!.trim(), why: t ? `매장 저평점 리뷰 중 ‘${t.type}’ ${t.count}건.` : firstSentence(c.reason) || `${c.scope === 'brand' ? '본사' : '매장'} 사례 카드 기준.` };
    });
}

/** 브리핑 작성자: 항목은 규칙으로 고르고, AI가 켜져 있으면 '왜' 문장만 짧게 다듬는다(손님 안내 문장은 표준 그대로 둔다) */
export async function briefingWriter(ctx: { brand: string; store: string }, items: Briefing['items'], cards: Card[]): Promise<StepOut<Briefing['items']>> {
  if (!items.length) return { out: items, summary: '고객 안내 문구가 포함된 승인 카드 없음', status: 'skipped' };
  const { value, via } = await llmOr(
    async () => {
      const res = await ask('briefing-writer', {
        system: storeSystem(ctx),
        user: `근무 전 브리핑 항목이다. 항목마다 알바가 왜 이 말을 미리 해야 하는지 한 문장(40자 안팎)으로 써라. 카드 내용에 없는 사실은 쓰지 마라.\n\n${items.map((i) => {
          const c = cards.find((x) => x.id === i.cardId);
          return `[${i.cardId}] ${i.title}\n안내: ${i.say}\n규칙 이유: ${i.why}\n카드 이유: ${c?.reason ?? ''}`;
        }).join('\n\n')}`,
        schema: z.object({ items: z.array(z.object({ cardId: z.string(), why: z.string() })) }),
      });
      if (!res) return null;
      return items.map((i) => ({ ...i, why: res.items.find((x) => x.cardId === i.cardId)?.why || i.why }));
    },
    () => items,
    llmEnabled(),
  );
  return { out: value, via, summary: `브리핑 ${value.length}개: ${value.map((i) => i.cardId).join(', ')}` };
}

