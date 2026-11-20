// 불만 유형 → 원인 분류(PLAN §4)와 본사 표준과 다른 운영(RuleDrift) 탐지. 모두 순수 함수.
import type { CauseClass, ComplaintType, HqStandard, Review } from '@shared/contracts';
import { COMPLAINT_PATTERNS, isLow } from './tagging.js';

/** 직원 태도가 이 유형과 같은 리뷰에 붙으면 태도가 아니라 규칙을 몰라서 생긴 갈등으로 본다 */
export const RULE_TYPES: ComplaintType[] = ['이용시간제한', '좌석·인원', '최소주문', '규칙 미고지·말바꿈', '신분증'];

/** 불만 유형별 기본 원인. '다른 지점 비교'는 원인이 아니라(브랜드 일관성 신호) 없다 */
export const DEFAULT_CAUSE: Partial<Record<ComplaintType, CauseClass>> = {
  '규칙 미고지·말바꿈': '지식 공백',
  이용시간제한: '지식 공백',
  '좌석·인원': '지식 공백',
  최소주문: '매장 자체 규칙',
  '품절·대체': '지식 공백',
  '결제·계산': '지식 공백',
  신분증: '지식 공백',
  '직원 태도': '운영·인력',
  '대기·서빙지연': '운영·인력',
  위생: '위생·품질',
  '맛·품질': '위생·품질',
};

// ---------- 본사 표준 찾기 ----------

/** 드리프트가 가리키는 표준의 기본 번호(시드의 standards.json에서 주제로 못 찾을 때 쓴다) */
export type DriftKey = 'time' | 'seat' | 'minorder';
const DRIFT_FALLBACK: Record<DriftKey, string> = { time: 'H01', seat: 'H02', minorder: 'H03' };
const DRIFT_COMPLAINT: Record<DriftKey, ComplaintType> = { time: '이용시간제한', seat: '좌석·인원', minorder: '최소주문' };

const STANDARD_TOPIC: Partial<Record<ComplaintType, RegExp>> = {
  이용시간제한: /이용\s*시간/,
  '좌석·인원': /좌석|인원|자리/,
  최소주문: /최소\s*주문/,
  '규칙 미고지·말바꿈': /이용\s*시간|고지/,
  '품절·대체': /품절|대체/,
  '결제·계산': /결제|계산|정산/,
  신분증: /신분증/,
  위생: /이물|위생/,
  '맛·품질': /이물|품질/,
  '직원 태도': /응대|서비스/,
  '대기·서빙지연': /응대|서비스/,
};

/** 불만 유형에 맞는 본사 표준. 주제(topic)를 먼저 보고, 없으면 제목을 본다 */
export function standardFor(type: ComplaintType, standards: HqStandard[]): HqStandard | undefined {
  const re = STANDARD_TOPIC[type];
  if (!re) return undefined;
  return standards.find((s) => re.test(s.topic)) ?? standards.find((s) => re.test(s.title));
}

export const driftStandardId = (key: DriftKey, standards: HqStandard[]) => standardFor(DRIFT_COMPLAINT[key], standards)?.id ?? DRIFT_FALLBACK[key];

// ---------- 드리프트 탐지 ----------

const NO_WAIT = /웨이팅\s*(도|이|은)?\s*(하나도\s*)?없|대기\s*(도|가|는)?\s*없|자리\s*(도|가|는)?\s*(많|널널|텅|비어|남)|빈\s*자리|만석\s*(도|이)?\s*아닌|손님\s*(도|이)?\s*(별로\s*)?없/;
const SENT_OUT = /나가|퇴장|쫓|일어나/;
const SMALL_PARTY = /[12]\s*(인|명)\s*(은|이라|이라서|손님)?\s*(은\s*)?(안|못)\s*받|혼자\s*(는|라|서|라서)?\s*(안|못)\s*(받|된|와)|(1|2|한|두)\s*(명|인)\s*(은|이라|이라서)?\s*(입장|이용)\s*(불가|안)|가려\s*받|골라\s*받/;
const MIN_ORDER = /최소\s*주문|기본\s*주문|인당\s*\d|1\s*인\s*1/;

interface DriftRule { key: DriftKey; test: (r: Review) => boolean; min: number; observed: string }

export const DRIFT_RULES: DriftRule[] = [
  { key: 'time', test: (r) => COMPLAINT_PATTERNS.이용시간제한.test(r.text) && NO_WAIT.test(r.text) && SENT_OUT.test(r.text), min: 1, observed: '웨이팅이 없어도 이용시간 제한을 들어 퇴장을 요청함' },
  { key: 'seat', test: (r) => SMALL_PARTY.test(r.text), min: 2, observed: '1~2인 손님 입장을 반복해서 거절함' },
  { key: 'minorder', test: (r) => MIN_ORDER.test(r.text), min: 1, observed: '최소주문(기본 주문) 금액·수량을 요구함' },
];

export interface DetectedDrift { key: DriftKey; standardId: string; observed: string; reviewIds: string[] }

/** 한 매장의 리뷰에서 본사 표준과 다른 운영을 찾는다. 저평점이 아니어도 운영 방식이 드러나면 센다 */
export function detectDrifts(reviews: Review[], standards: HqStandard[]): DetectedDrift[] {
  const out: DetectedDrift[] = [];
  for (const rule of DRIFT_RULES) {
    const hits = reviews.filter((r) => !r.virtual && rule.test(r));
    if (hits.length >= rule.min) out.push({ key: rule.key, standardId: driftStandardId(rule.key, standards), observed: `${rule.observed} (리뷰 ${hits.length}건)`, reviewIds: hits.map((r) => r.id) });
  }
  return out;
}

// ---------- 원인 분류 ----------

const ruleTest = (key: DriftKey) => DRIFT_RULES.find((r) => r.key === key)!.test;

/** 저평점 리뷰 한 건에 붙은 불만 유형 하나의 원인. '다른 지점 비교'는 null.
 *  예외: 매장에 규칙 차이(drifts)가 확인됐고 이 리뷰에 그 운영이 드러나면 매장 자체 규칙, 직원 태도에 규칙 관련 유형이 같이 붙으면 지식 공백 */
export function causeOf(type: ComplaintType, review: Pick<Review, 'tags' | 'text'>, drifts: Set<DriftKey>): CauseClass | null {
  if (type === '다른 지점 비교') return null;
  if (type === '이용시간제한' && drifts.has('time') && ruleTest('time')(review as Review)) return '매장 자체 규칙';
  if (type === '좌석·인원' && drifts.has('seat') && ruleTest('seat')(review as Review)) return '매장 자체 규칙';
  if (type === '직원 태도') return review.tags.some((t) => RULE_TYPES.includes(t)) ? '지식 공백' : '운영·인력';
  return DEFAULT_CAUSE[type] ?? null;
}

export interface CauseTally {
  lowTotal: number;
  lowByType: Partial<Record<ComplaintType, number>>;
  causeByType: Partial<Record<ComplaintType, Partial<Record<CauseClass, number>>>>;
  pairs: number; // 원인이 있는 (저평점 리뷰, 불만 유형) 쌍 수
  knowledgePairs: number;
}

/** 저평점 리뷰의 불만·원인 집계 */
export function tallyCauses(reviews: Review[], drifts: Set<DriftKey>): CauseTally {
  const t: CauseTally = { lowTotal: 0, lowByType: {}, causeByType: {}, pairs: 0, knowledgePairs: 0 };
  for (const r of reviews) {
    if (r.virtual || !isLow(r)) continue;
    t.lowTotal++;
    for (const type of r.tags) {
      t.lowByType[type] = (t.lowByType[type] ?? 0) + 1;
      const cause = causeOf(type, r, drifts);
      if (!cause) continue;
      const row = (t.causeByType[type] ??= {});
      row[cause] = (row[cause] ?? 0) + 1;
      t.pairs++;
      if (cause === '지식 공백') t.knowledgePairs++;
    }
  }
  return t;
}

/** 한 불만 유형의 대표 원인: 리뷰별 원인 중 가장 많은 것. 같으면 기본 원인 */
export function majorityCause(type: ComplaintType, counts: Partial<Record<CauseClass, number>> | undefined): CauseClass | null {
  const base = DEFAULT_CAUSE[type] ?? null;
  if (!counts) return base;
  let best: CauseClass | null = base;
  let n = base ? (counts[base] ?? 0) : -1;
  for (const [cause, c] of Object.entries(counts) as [CauseClass, number][]) {
    if (c > n) {
      best = cause;
      n = c;
    }
  }
  return best;
}
