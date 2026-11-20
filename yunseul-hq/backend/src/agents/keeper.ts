// 위키 관리팀: 종합 편집자 · 위키 점검관 · 표준 승격 제안자
import { z } from 'zod';
import type { Card, ComplaintType, HqStandard, LintIssue, StandardProposal, Store, StoreScore, Via } from '@shared/contracts';
import { ask, llmEnabled, storeSystem } from '../harness/llm.js';
import { llmOr, type StepOut } from '../harness/runner.js';
import { similarity } from '../tools/search.js';
import { standardFor } from '../rules/causes.js';
import { proposalCandidates } from '../rules/prescribe.js';
import * as db from '../store/db.js';
import type { StoreCtx } from './capture.js';

// ---------- 종합 편집자 ----------

export async function synthesizer(topic: string, cards: Card[], ctx: StoreCtx): Promise<StepOut<string>> {
  if (!cards.length) return { out: '', summary: `'${topic}'에 승인된 카드가 없어 종합하지 않음`, status: 'skipped' };
  const { value, via } = await llmOr(
    async () =>
      (await ask('synthesizer', {
        system: storeSystem(ctx),
        user: `토픽: ${topic}\n\n${cards.map((c) => `[${c.id}] (${c.source}) ${c.title} / 이유: ${c.reason} / 금지: ${c.avoid}`).join('\n')}\n\n알바가 처음 보는 상황에서도 응용할 수 있게, 이 카드들에 공통으로 드러나는 판단 원칙 3~5개로 종합하라. 본사 표준 카드와 다르면 본사 표준을 따른다. 원칙마다 끝에 근거 카드 [Cxxx].`,
        schema: z.object({ principles: z.array(z.string()) }),
      }))?.principles ?? null,
    () =>
      cards
        .filter((c) => c.reason && c.actions.length)
        .map((c) => `${c.reason.split(/(?<=[.다요])\s/)[0].replace(/[.]$/, '')}. 그래서 ${c.actions[0].replace(/[.]$/, '')} [${c.id}]`),
    llmEnabled(),
  );
  return { out: value.map((p) => `- ${p}`).join('\n'), via, summary: `'${topic}' 핵심 원칙 ${value.length}개로 다시 정리` };
}

// ---------- 위키 점검관 ----------

export interface LintOut { issues: LintIssue[]; links: db.Link[] }

function conflictsByRules(cards: Card[]) {
  const no = /(불가|안 된|안 돼|하지 않|금지|필수|먼저 안내)/;
  const yes = /(해줘도|해도 된|해도 돼|없이 .*(교환|환불)|그냥|생략|바로 퇴장)/;
  const out: { ids: string[]; issue: string }[] = [];
  for (let i = 0; i < cards.length; i++)
    for (let j = i + 1; j < cards.length; j++) {
      const [a, b] = [cards[i], cards[j]];
      if (a.topic !== b.topic || a.source === b.source) continue;
      const sim = similarity(a.title + a.situation, b.title + b.situation);
      if (sim <= 0.08 || sim > 0.3) continue; // 0.3 초과는 중복으로 따로 잡는다
      const ta = a.actions.join(' ') + a.avoid + a.reason;
      const tb = b.actions.join(' ') + b.avoid + b.reason;
      if ((no.test(ta) && yes.test(tb)) || (yes.test(ta) && no.test(tb)))
        out.push({ ids: [a.id, b.id], issue: `${a.source} [${a.id}] 및 ${b.source} [${b.id}]의 대응 지침이 상충함.` });
    }
  return out;
}

const conflictMemo = new Map<string, { key: string; result: { value: { ids: string[]; issue: string }[]; via: Via } }>();

export async function linter(storeId: string, ctx: StoreCtx): Promise<StepOut<LintOut>> {
  const d = db.get();
  const today = db.today();
  const soon = db.addDays(today, 14);
  const approved = db.approvedCards(storeId);
  const issues: LintIssue[] = [];
  const links: db.Link[] = [];

  for (const c of approved) {
    if (c.expires < today) issues.push({ kind: '만료', ids: [c.id], subject: c.title, detail: `유효기간 ${c.expires} 종료` });
    else if (c.expires <= soon) issues.push({ kind: '만료 임박', ids: [c.id], subject: c.title, detail: `유효기간 ${c.expires} 종료 예정` });
    if (c.notHelpful > c.helpful && c.uses >= 3) issues.push({ kind: '효과 낮음', ids: [c.id], subject: c.title, detail: `도움 안 됨 ${c.notHelpful}건 · 도움 됨 ${c.helpful}건 · 사용 ${c.uses}회` });
    if (!c.reason.trim()) issues.push({ kind: '이유 없음', ids: [c.id], subject: c.title, detail: '카드의 판단 근거 미등록' });
  }
  for (let i = 0; i < approved.length; i++)
    for (let j = i + 1; j < approved.length; j++) {
      const [a, b] = [approved[i], approved[j]];
      if (a.topic === b.topic && similarity(a.title + a.situation, b.title + b.situation) > 0.3) {
        issues.push({ kind: '중복', ids: [a.id, b.id], subject: a.topic, detail: '동일 주제에서 적용 상황과 제목이 유사한 카드 2건 확인' });
        links.push({ source: a.id, target: b.id, kind: 'duplicates' });
      }
    }

  // 승인 카드 내용이 지난번과 같으면 AI 모순 검사 결과를 다시 쓴다
  const key = JSON.stringify([llmEnabled(), approved.map((c) => [c.id, c.topic, c.source, c.title, c.actions, c.avoid])]);
  const memo = conflictMemo.get(storeId);
  const { value: conflicts, via } =
    memo?.key === key
      ? memo.result
      : await llmOr(
          async () =>
            (await ask('linter', {
              system: storeSystem(ctx),
              user: `같은 토픽의 카드들이다. 서로 모순되는 지시(한쪽은 하라, 한쪽은 하지 말라)만 찾아라. issue에는 근거와 상충 내용을 한 문장의 간결한 보고서 문체로 작성하고 후속 조치는 생략한다. 단순 중복은 제외.\n\n${approved.map((c) => `[${c.id}] (${c.topic}, ${c.source}) ${c.title} / 대응: ${c.actions.join(' / ')} / 금지: ${c.avoid}`).join('\n')}`,
              schema: z.object({ conflicts: z.array(z.object({ ids: z.array(z.string()), issue: z.string() })) }),
            }))?.conflicts ?? null,
          () => conflictsByRules(approved),
          llmEnabled(),
        ).then((result) => {
          if (result.via !== 'rules(LLM 실패 대체)') conflictMemo.set(storeId, { key, result });
          return result;
        });
  for (const c of conflicts) {
    issues.push({ kind: '상충', ids: c.ids, subject: approved.find((card) => c.ids.includes(card.id))?.topic, detail: c.issue });
    if (c.ids.length >= 2) links.push({ source: c.ids[0], target: c.ids[1], kind: 'conflicts' });
  }

  // 본사 표준과 다른 운영(RuleDrift)과, 본사 표준 카드와 다른 토픽 지시를 가진 매장 카드
  for (const dr of d.drifts.filter((x) => x.storeId === storeId && x.status === 'open')) {
    const st = db.standard(dr.standardId);
    issues.push({ kind: '표준 불일치', ids: [dr.id], standardId: dr.standardId, subject: st?.title ?? dr.standardId, detail: dr.observed });
  }

  const waiting = d.questions.filter((q) => q.storeId === storeId && q.status === 'escalated');
  if (waiting.length) issues.push({ kind: '공백', ids: waiting.map((q) => q.id), subject: '미답변 현장 질문', detail: `기존 카드로 답변하지 못한 질문 ${waiting.length}건` });
  for (const topic of d.topics.filter((t) => t !== '기타')) {
    const n = approved.filter((c) => c.topic === topic).length;
    if (n < 1) issues.push({ kind: '공백', ids: [], subject: topic, detail: '해당 주제의 승인 사례 카드 0건' });
  }
  const pending = db.storeCards(storeId).filter((c) => c.status === 'pending' && c.storeId === storeId);
  if (pending.length) issues.push({ kind: '승인 대기', ids: pending.map((c) => c.id), subject: '매장 사례 카드', detail: `점장 승인 대기 ${pending.length}건` });

  const order: LintIssue['kind'][] = ['상충', '표준 불일치', '만료', '효과 낮음', '공백', '중복', '만료 임박', '이유 없음', '승인 대기'];
  issues.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
  const count = (k: LintIssue['kind']) => issues.filter((i) => i.kind === k).length;
  return { out: { issues, links }, via, summary: `할 일 ${issues.length}건 (상충 ${count('상충')}, 표준 불일치 ${count('표준 불일치')}, 만료 ${count('만료')}, 중복 ${count('중복')}, 공백 ${count('공백')})` };
}

// ---------- 표준 승격 제안자 (규칙) ----------

const CHANGE: Partial<Record<ComplaintType, string>> = {
  이용시간제한: '이용시간 기준을 입장 안내 문장에 넣고, 웨이팅이 없을 때의 연장 기준을 표준에 적는다',
  '좌석·인원': '소인원 손님 입장 기준과 자리 이동을 부탁할 때의 안내 문장을 표준에 적는다',
  최소주문: '최소주문을 두지 않는다는 기준을 가맹점 교육 자료와 메뉴판 안내에 함께 넣는다',
  '규칙 미고지·말바꿈': '매장 규칙을 주문 전에 한 번에 안내하는 공통 안내 문장을 표준으로 만든다',
  '품절·대체': '품절을 주문 받을 때 먼저 알리고 대체 메뉴는 손님이 고르게 하는 기준을 표준에 적는다',
  '결제·계산': '중간 결제를 할 때 미리 알리고 결제 전 주문 내역을 함께 확인하는 기준을 표준에 적는다',
  신분증: '받을 수 있는 신분증 종류와 안내 문장을 표준에 적는다',
  '직원 태도': '규칙을 안내할 때 이유를 함께 말하는 응대 문장을 표준에 넣는다',
  '대기·서빙지연': '피크 시간 최소 근무 인원과 주문 누락 확인 절차를 표준에 넣는다',
  위생: '이물 발견 시 대응 절차와 QSC 점검 주기를 표준에 넣는다',
  '맛·품질': '안주 조리 기준(온도·양) 점검 항목을 표준에 넣는다',
};

export function promoter(stores: Store[], scores: Map<string, StoreScore>, standards: HqStandard[], existing: StandardProposal[], minStores = 5): StepOut<Omit<StandardProposal, 'id' | 'created'>[]> {
  const candidates = proposalCandidates(stores, scores, minStores);
  const name = (id: string) => stores.find((s) => s.id === id)?.name ?? id;
  const out: Omit<StandardProposal, 'id' | 'created'>[] = [];
  let skipped = 0;
  for (const c of candidates) {
    const st = standardFor(c.complaint, standards);
    const title = `${c.complaint} 반복: ${st ? `'${st.title}' 개정` : '새 표준'}`;
    if (existing.some((p) => p.title === title && p.status !== 'rejected')) {
      skipped++;
      continue;
    }
    out.push({
      standardId: st?.id ?? null,
      title,
      change: CHANGE[c.complaint] ?? `${c.complaint} 불만을 줄이는 안내 기준을 표준에 넣는다`,
      why: `위험 상위 20개 매장 중 ${c.storeIds.length}곳(${c.storeIds.slice(0, 6).map(name).join(', ')}${c.storeIds.length > 6 ? ' 외' : ''})에서 ‘${c.complaint}’ 유형이 주요 불만으로 확인됨. 해당 저평점 리뷰 ${c.lowCount}건.`,
      storeIds: c.storeIds,
      status: 'pending',
      via: 'rules',
    });
  }
  return {
    out,
    summary: out.length ? `개정 제안 ${out.length}건: ${out.map((p) => p.title).join(' · ')}` : `위험 상위 20개 매장 중 ${minStores}곳 이상에서 반복된 신규 불만 없음${skipped ? `(이미 제안된 ${skipped}건 제외)` : ''}`,
  };
}
