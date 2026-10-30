// 가상 손님 N명을 시드 위키에 들여보내고 결과를 docs/judge/persona_sim.md 로 남긴다.
// 실행: LLM_PROVIDER=ollama OLLAMA_HOST=http://<호스트>:11434 npx tsx scripts/simulate_customers.ts [명수=20]
// 운영 저장소(var/)를 건드리지 않도록 var/sim 에서 돌린다.
process.env.STORE_DIR ??= 'var/sim';
process.env.STEP_PACE_MS ??= '0';

const { writeFileSync } = await import('node:fs');
const { join } = await import('node:path');
const { ROOT_DIR } = await import('../src/paths.js');
const db = await import('../src/store/db.js');
const { status } = await import('../src/harness/llm.js');
const { linter } = await import('../src/agents/keeper.js');
const { visitOne } = await import('../src/sim/customers.js');

const n = Number(process.argv[2] ?? 20);
db.resetFromSeed();
db.get().links = (await linter()).out.links;

const visits = [];
const t0 = Date.now();
for (let i = 0; i < n; i++) {
  const v = await visitOne();
  visits.push(v);
  console.log(`${i + 1}/${n} ${v.customer.age}세 ${v.customer.occupation} → ${v.outcome} (${v.via}) ${v.staffQuestion}`);
}
const sec = Math.round((Date.now() - t0) / 1000);

const answered = visits.filter((v) => v.outcome === 'answered');
const byTopic = new Map<string, { a: number; e: number }>();
for (const v of visits) {
  const t = byTopic.get(v.topic) ?? { a: 0, e: 0 };
  v.outcome === 'answered' ? t.a++ : t.e++;
  byTopic.set(v.topic, t);
}
const ageBand = (a: number) => (a < 30 ? '10·20대' : a < 50 ? '30·40대' : a < 65 ? '50대~64세' : '65세 이상');
const byAge = new Map<string, { a: number; e: number }>();
for (const v of visits) {
  const k = ageBand(v.customer.age);
  const t = byAge.get(k) ?? { a: 0, e: 0 };
  v.outcome === 'answered' ? t.a++ : t.e++;
  byAge.set(k, t);
}
const cell = (s: string) => s.replace(/\|/g, '/').replace(/\n/g, ' ');
const pct = (x: number, y: number) => (y ? `${Math.round((x / y) * 100)}%` : '-');

const md = [
  '# 가상 손님 시뮬레이션: 위키의 빈틈 찾기',
  '',
  `실행 ${new Date().toISOString()} · 손님 ${n}명 · 상황 생성 ${status.model ?? '규칙(상황 틀)'} · 걸린 시간 ${sec}초`,
  '',
  '손님은 NVIDIA Nemotron-Personas-Korea(CC BY 4.0, 통계청 인구 분포 기반 합성 인물)에서 무작위로 뽑았다. 손님마다 계산대 예외 상황을 만들고, 그 손님을 맞은 신입의 질문을 실제 질문 흐름(검색 사서 → 현장 코치 → 근거 검증 → 점장 연결)에 넣었다. 시드 위키(승인 카드 12장) 기준이며 점장 답은 넣지 않았다.',
  '',
  `- 위키가 답함: ${answered.length}명 (${pct(answered.length, n)})`,
  `- 점장에게 넘어감(위키의 빈틈): ${n - answered.length}명 (${pct(n - answered.length, n)})`,
  status.mode === 'rules'
    ? '- 상황: AI 꺼짐, 정해 둔 상황 틀 10개에서 골랐다'
    : `- 상황을 AI가 만든 비율: ${pct(visits.filter((v) => !v.via.startsWith('rules')).length, n)} (나머지는 AI 실패로 상황 틀 대체)`,
  '',
  '## 주제별',
  '',
  '| 주제 | 위키가 답함 | 점장에게 넘어감 |',
  '|---|---|---|',
  ...[...byTopic].map(([t, x]) => `| ${t} | ${x.a} | ${x.e} |`),
  '',
  '## 나이대별',
  '',
  '| 나이대 | 손님 | 위키가 답한 비율 |',
  '|---|---|---|',
  ...[...byAge].map(([k, x]) => `| ${k} | ${x.a + x.e} | ${pct(x.a, x.a + x.e)} |`),
  '',
  '## 손님별 기록',
  '',
  '| 손님 | 상황 | 손님 말 | 신입 질문 | 결과 |',
  '|---|---|---|---|---|',
  ...visits.map((v) => `| ${v.customer.age}세 ${v.customer.sex} · ${v.customer.region} · ${cell(v.customer.occupation)} | ${cell(v.situation)} | ${cell(v.customerLine)} | ${cell(v.staffQuestion)} | ${v.outcome === 'answered' ? `위키 답 ${v.cited.join(', ')}` : '점장에게 넘김'} |`),
  '',
  '## 읽는 법',
  '',
  '- 점장에게 넘어간 질문이 곧 숙련 직원에게 먼저 받아 둘 노하우 목록이다.',
  '- 합성 인물이 만든 상황이라 실제 빈도와는 다르다. 실제 매장 질문 로그로 다시 확인해야 한다.',
  '',
].join('\n');
writeFileSync(join(ROOT_DIR, 'docs', 'judge', 'persona_sim.md'), md);
console.log(`\n저장 → docs/judge/persona_sim.md (위키 답 ${answered.length}/${n})`);
