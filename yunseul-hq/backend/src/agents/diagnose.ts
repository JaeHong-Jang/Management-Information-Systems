// 진단팀: 원인 분석가 · 표준 차이 탐지원
import { z } from 'zod';
import { COMPLAINT_TYPES, type CauseClass, type ComplaintType, type Finding, type HqStandard, type Review, type RuleDrift, type Store } from '@shared/contracts';
import { ask, hqSystem, llmEnabled } from '../harness/llm.js';
import { llmOr, type StepOut } from '../harness/runner.js';
import { detectDrifts, majorityCause, standardFor, type DetectedDrift } from '../rules/causes.js';
import { isLow, quoteFrom } from '../rules/tagging.js';
import { round2, type StoreStats } from '../rules/score.js';

const CAUSES: CauseClass[] = ['지식 공백', '운영·인력', '매장 자체 규칙', '위생·품질'];
const MAX_FINDINGS = 6;
const pct = (x: number) => `${Math.round(x * 100)}%`;

export interface DiagnoseInput {
  brand: string;
  store: Store;
  reviews: Review[]; // 그 매장 리뷰
  stats: StoreStats;
  standards: HqStandard[];
  brandRates: Partial<Record<ComplaintType, number>>; // 브랜드 전체 저평점 중 비중
  diagnosisId: string;
}

function explain(type: ComplaintType, cause: CauseClass, count: number, drift: DetectedDrift | undefined, st: HqStandard | undefined): string {
  const base = `저평점 리뷰 ${count}건에서 ‘${type}’ 불만 확인.`;
  if (cause === '지식 공백')
    return type === '직원 태도'
      ? `${base} 같은 리뷰에 매장 규칙 관련 불만이 함께 나타나 안내 부족 가능성으로 분류.`
      : `${base} ${st ? `본사 표준 ‘${st.title}’에 따른 사전 안내` : '운영 기준의 사전 안내'}로 예방할 수 있는 유형으로 분류.`;
  if (cause === '매장 자체 규칙')
    return type === '최소주문' && !drift
      ? `${base} ${st ? `본사 표준 ‘${st.title}’과 다른` : '본사 표준과 다른'} 주문 조건이 언급되어 매장 자체 규칙으로 추정.`
      : `${base} 리뷰에서 확인된 운영 차이 ‘${drift?.observed ?? '본사 표준과 다른 운영'}’. 매장 자체 규칙으로 분류.`;
  if (cause === '운영·인력') return `${base} 응대 또는 인력 운영 관련 유형으로 분류.`;
  return `${base} 위생·품질 관련 유형으로 분류. 품질·서비스·청결 점검 대상.`;
}

const DRIFT_TYPE: Partial<Record<ComplaintType, DetectedDrift['key']>> = { 이용시간제한: 'time', '좌석·인원': 'seat', 최소주문: 'minorder' };

/** 규칙 진단: 저평점 불만 상위 6개와 대표 원인, 원문 인용 3개 */
export function findingsByRules(inp: DiagnoseInput): { findings: Finding[]; summary: string } {
  const { tally, drifts } = inp.stats;
  const low = inp.reviews.filter((r) => !r.virtual && isLow(r)).sort((a, b) => b.date.localeCompare(a.date));
  const types = (Object.entries(tally.lowByType) as [ComplaintType, number][])
    .filter(([t]) => t !== '다른 지점 비교')
    .sort((a, b) => b[1] - a[1] || COMPLAINT_TYPES.indexOf(a[0]) - COMPLAINT_TYPES.indexOf(b[0]))
    .slice(0, MAX_FINDINGS);
  const used = new Set<string>();
  const findings: Finding[] = types.flatMap(([type, count], i) => {
    const cause = majorityCause(type, tally.causeByType[type]);
    if (!cause) return [];
    const st = standardFor(type, inp.standards);
    const drift = drifts.find((d) => d.key === DRIFT_TYPE[type]);
    // 앞선 진단 결과에서 이미 인용한 리뷰는 뒤로 미뤄, 원인마다 다른 리뷰가 대표 인용이 되게 한다
    const cands = low.filter((r) => r.tags.includes(type));
    const picked = [...cands.filter((r) => !used.has(r.id)), ...cands.filter((r) => used.has(r.id))].slice(0, 3);
    picked.forEach((r) => used.add(r.id));
    const quotes = picked.map((r) => ({ reviewId: r.id, text: quoteFrom(r.text, type), platform: r.platform, star: r.star, date: r.date }));
    return [{
      id: `${inp.diagnosisId}-F${i + 1}`,
      complaint: type,
      cause,
      count,
      share: tally.lowTotal ? round2(count / tally.lowTotal) : 0,
      explanation: explain(type, cause, count, drift, st),
      quotes,
      ...(st ? { standardId: st.id } : {}),
      ...(inp.brandRates[type] !== undefined ? { brandRate: inp.brandRates[type] } : {}),
    }];
  });
  if (!findings.length) return { findings, summary: `${inp.store.name} · 분석 대상 저평점 불만 없음.` };
  const byCause = CAUSES.map((c) => [c, findings.filter((f) => f.cause === c).reduce((s, f) => s + f.count, 0)] as const).filter(([, n]) => n);
  const ks = inp.stats.score.knowledgeShare;
  const summary = `${inp.store.name} 저평점 리뷰 ${tally.lowTotal}건. 주요 불만은 ${findings.slice(0, 3).map((f) => `${f.complaint}(${f.count}건)`).join(', ')}. 원인별 분류는 ${byCause.map(([c, n]) => `${c} ${n}건`).join(', ')}. 지식 공백 비중 ${ks === null ? '미확인' : pct(ks)}.${drifts.length ? ` 본사 표준과 다른 운영 ${drifts.length}건 확인.` : ''}`;
  return { findings, summary };
}

/** 원인 분석가: 규칙 진단을 기본으로, AI가 켜져 있으면 설명·인용·원인(인용이 있을 때만)을 다듬는다. 숫자(count·share·brandRate)는 규칙 값을 그대로 둔다 */
export async function causeAnalyst(inp: DiagnoseInput, rulesOnly = false): Promise<StepOut<{ findings: Finding[]; summary: string }>> {
  const base = findingsByRules(inp);
  const low = inp.reviews.filter((r) => !r.virtual && isLow(r));
  const schema = z.object({
    summary: z.string().describe('매장 진단 한 문단. 숫자는 주어진 값만 쓴다'),
    findings: z.array(z.object({
      complaint: z.enum(COMPLAINT_TYPES),
      cause: z.enum(['지식 공백', '운영·인력', '매장 자체 규칙', '위생·품질']),
      explanation: z.string().describe('왜 이 원인으로 봤는지 한두 문장'),
      quotes: z.array(z.object({ reviewId: z.string(), text: z.string().describe('리뷰 원문에서 그대로 자른 문장') })).max(3),
    })),
  });
  const { value, via } = await llmOr(
    async () => {
      if (!base.findings.length) return base;
      const context = base.findings
        .map((f) => `## ${f.complaint} (저평점 ${f.count}건, 규칙 원인: ${f.cause})\n${low.filter((r) => r.tags.includes(f.complaint)).slice(0, 6).map((r) => `[${r.id}] ★${r.star} ${r.date} ${r.text}`).join('\n')}`)
        .join('\n\n');
      const res = await ask('cause-analyst', {
        system: hqSystem(inp.brand),
        user: `매장: ${inp.store.name} (${inp.store.area})\n원인 4분류: 지식 공백(안내·규칙을 몰라서), 운영·인력, 매장 자체 규칙(본사 표준과 다른 운영), 위생·품질.\n규칙 원인을 기본으로 하되, 리뷰 근거가 분명할 때만 바꿔라. 인용은 아래 리뷰의 원문 문장을 그대로 잘라 reviewId와 함께 붙여라.\n\n${context}`,
        schema,
        effort: 'medium',
      });
      if (!res) return null;
      const findings = base.findings.map((f) => {
        const l = res.findings.find((x) => x.complaint === f.complaint);
        if (!l) return f;
        const quotes = l.quotes.length ? l.quotes.map((q) => ({ reviewId: q.reviewId, text: q.text, platform: f.quotes[0]?.platform ?? '카카오', star: null, date: '' })) : f.quotes;
        return { ...f, cause: l.quotes.length ? l.cause : f.cause, explanation: l.explanation || f.explanation, quotes };
      });
      return { findings, summary: res.summary || base.summary };
    },
    () => base,
    llmEnabled() && !rulesOnly,
  );
  return {
    out: value,
    via,
    summary: value.findings.length ? `불만 ${value.findings.length}개 원인 분류: ${value.findings.map((f) => `${f.complaint}→${f.cause}`).join(', ')}` : '원인을 붙일 저평점 불만 없음',
  };
}

// ---------- 표준 차이 탐지원 (규칙) ----------

/** 리뷰에서 본사 표준과 다른 운영을 찾아 RuleDrift로 만든다. 이미 있는 기록은 상태(인정·수정)를 지키고 근거 리뷰만 갱신한다 */
export function driftDetector(store: Store, reviews: Review[], standards: HqStandard[], existing: RuleDrift[], findings: Finding[], newId: (i: number) => string): StepOut<{ drifts: RuleDrift[]; findings: Finding[] }> {
  const found = detectDrifts(reviews, standards);
  // 원인이 '매장 자체 규칙'인데 탐지 규칙에 걸리지 않은 불만(예: 최소주문 기본 원인)도 기록한다
  for (const f of findings) {
    if (f.cause !== '매장 자체 규칙' || !f.standardId || found.some((d) => d.standardId === f.standardId)) continue;
    found.push({ key: 'minorder', standardId: f.standardId, observed: `리뷰에서 '${f.complaint}' 관련 매장 자체 운영이 보임 (리뷰 ${f.count}건)`, reviewIds: f.quotes.map((q) => q.reviewId) });
  }
  const drifts: RuleDrift[] = found.map((d, i) => {
    const prev = existing.find((x) => x.storeId === store.id && x.standardId === d.standardId);
    return prev ? { ...prev, observed: d.observed, reviewIds: d.reviewIds } : { id: newId(i), storeId: store.id, standardId: d.standardId, observed: d.observed, reviewIds: d.reviewIds, status: 'open' };
  });
  // 드리프트가 있는 표준을 가리키는 Finding에 표준 번호를 붙여 둔다
  const out = findings.map((f) => {
    const d = drifts.find((x) => f.cause === '매장 자체 규칙' && x.standardId === f.standardId);
    return d ? { ...f, standardId: d.standardId } : f;
  });
  const known = new Set(standards.map((s) => s.id));
  return {
    out: { drifts, findings: out },
    summary: drifts.length ? `본사 표준과 다른 운영 ${drifts.length}건: ${drifts.map((d) => `${d.standardId}${known.has(d.standardId) ? '' : '(표준 없음)'} ${d.observed}`).join(' / ')}` : '리뷰에서 확인된 표준 차이 없음',
  };
}
