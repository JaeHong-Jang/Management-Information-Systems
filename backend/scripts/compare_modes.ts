// 규칙 모드와 LLM 모드의 회고 인터뷰·카드 구조화를 같은 기록으로 나란히 비교한다.
// 실행: ANTHROPIC_API_KEY=... npx tsx scripts/compare_modes.ts  → docs/judge/llm_vs_rules.md
// 키가 없으면 규칙 모드 열만 채우고 LLM 열은 '미실행'으로 남긴다.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { cardWriter, followupsByRules, interviewer, structureByRules } from '../src/agents/capture.js';
import { llmEnabled, status } from '../src/harness/llm.js';
import { ROOT_DIR } from '../src/paths.js';
import * as db from '../src/store/db.js';

const SAMPLES = [
  '배민 주문에 수저가 빠졌다고 연락옴. 사장님 앱으로 사과하고 다음 주문 쿠폰 드림.',
  '기프티콘 금액보다 비싼 메뉴 고르면 차액 결제해 달라고 함. 차액은 카드로 받음.',
  '디카페인 원두가 떨어져서 손님한테 말하고 다른 메뉴 추천함.',
  '포스가 멈춰서 재부팅하고 그동안 주문은 종이에 적어 둠.',
  '단체 주문 20잔 들어와서 순서 바꿔서 다른 손님한테 먼저 양해 구함.',
  '손님이 영수증 없이 텀블러 교환해 달라고 해서 카드 내역 조회해서 확인하고 교환해 줌. 본사 규정상 내역 확인은 필수.',
];

const topics = db.get().topics;
const rows: string[] = [];
for (const raw of SAMPLES) {
  const rq = followupsByRules(raw);
  const rc = structureByRules(raw, [], topics);
  let lq = '미실행 (API 키 없음)';
  let lc = '미실행';
  if (llmEnabled()) {
    const q = await interviewer(raw, false);
    const c = await cardWriter(raw, [], topics);
    lq = q.via === 'claude' ? q.out.join('<br>') || '(되묻지 않음)' : `실패 → 규칙 대체 (${status.lastError})`;
    lc = c.via === 'claude' ? `${c.out.title} / 이유: ${c.out.reason || '(빈칸)'} / 금지: ${c.out.avoid || '(빈칸)'}` : '실패 → 규칙 대체';
  }
  rows.push(`| ${raw} | ${rq.join('<br>') || '(되묻지 않음)'} | ${rc.title} / 이유: ${rc.reason || '(빈칸)'} / 금지: ${rc.avoid || '(빈칸)'} | ${lq} | ${lc} |`);
}

const md = [
  '# 회고 인터뷰: 규칙 모드 vs LLM 모드',
  '',
  `실행 시각 ${new Date().toISOString()} · LLM ${llmEnabled() ? `${status.model}` : '꺼짐'}`,
  '',
  '같은 기록 6건을 두 모드로 처리했다. 판단 이유 칸을 기록에서 실제로 찾았는지, 되묻기가 빠진 내용을 정확히 가리키는지 비교한다.',
  '',
  '| 숙련 직원 기록 | 규칙: 되묻기 | 규칙: 카드 | LLM: 되묻기 | LLM: 카드 |',
  '|---|---|---|---|---|',
  ...rows,
  '',
].join('\n');
writeFileSync(join(ROOT_DIR, 'docs', 'judge', 'llm_vs_rules.md'), md);
console.log(md);
