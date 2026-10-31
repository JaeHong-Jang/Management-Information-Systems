// 가상 손님: 한국인 페르소나(Nemotron-Personas-Korea) 한 명을 골라 술집에서 생길 법한 예외 상황을 만들고,
// 그 손님을 맞은 신입이 위키에 묻는 질문을 실제 질문 흐름(ask)에 그대로 넣는다.
// 목적은 진짜 손님이 오기 전에 위키의 빈틈(점장에게 넘어가는 질문)을 먼저 찾는 것이다.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import type { Customer, Visit } from '@shared/contracts';
import { ask, llmEnabled } from '../harness/llm.js';
import { llmOr } from '../harness/runner.js';
import * as flows from '../flows/index.js';
import * as db from '../store/db.js';
import { DATA_DIR } from '../paths.js';

interface PersonaRow {
  uuid: string; persona: string; culinary_persona: string; sex: string; age: number;
  occupation: string; province: string; district: string;
}

let pool: PersonaRow[] | null = null;
function personas(): PersonaRow[] {
  pool ??= (JSON.parse(readFileSync(join(DATA_DIR, 'personas', 'nemotron-ko-sample.json'), 'utf8')) as { people: PersonaRow[] }).people;
  return pool;
}

const visits: Visit[] = [];
export const recentVisits = () => visits.slice(-40).reverse();

const STORE = `술집 포차 달빛(대학가). 메뉴: 참이슬·진로 소주, 카스 생맥주(500·피처), 카스 병맥주, 소맥 세트, 장수 막걸리, 하이볼·진저 하이볼, 해물파전, 김치전, 오징어볶음. 결제: 카드, 현금, 분할 결제. 단체 예약을 받는다. 미성년자 신분증 확인이 필수다.`;

// 규칙 모드용 상황 틀. 페르소나에 따라 고르는 것만 달라진다.
const TEMPLATES: { topic: string; situation: string; line: string; question: string }[] = [
  { topic: '신분증 확인', situation: '어려 보이는 손님이 신분증 사진을 휴대폰으로 보여 준다', line: '지갑을 두고 와서요. 사진 찍어 둔 거 있는데 이걸로 안 돼요?', question: '신분증 찍은 사진으로 확인해도 돼요?' },
  { topic: '신분증 확인', situation: '단골 일행 중 처음 보는 사람이 있다', line: '저희 맨날 오잖아요, 얘도 동갑이에요.', question: '단골 일행인데 처음 보는 사람도 신분증 봐야 해요?' },
  { topic: '주류·케그', situation: '생맥주를 따르는데 거품만 나온다', line: '사장님 이거 맥주가 아니라 거품만 한가득인데요?', question: '생맥주가 거품만 나와요' },
  { topic: '품절·대체', situation: '진로가 다 떨어졌는데 진로만 찾는다', line: '저는 진로 아니면 안 마셔요. 진짜 없어요?', question: '진로가 다 떨어졌는데 손님이 진로만 찾으세요' },
  { topic: '품절·대체', situation: '금요일 밤에 생맥주 케그가 바닥났다', line: '아까 생맥 시켰는데 왜 이렇게 안 나와요?', question: '생맥주 케그가 다 떨어졌어요' },
  { topic: '취객·분쟁 응대', situation: '많이 취한 손님이 소주를 더 달라고 한다', line: '한 병만 더! 진짜 마지막이에요~', question: '많이 취한 손님이 술을 더 달래요' },
  { topic: '결제·POS', situation: '단체 손님이 각자 카드로 나눠 내겠다고 한다', line: '저희 여덟 명인데 n분의 1로 각자 할게요.', question: '단체 손님이 나눠서 계산한대요' },
  { topic: '결제·POS', situation: '카드 승인 문자는 왔는데 POS에는 미결제로 남았다', line: '결제 문자 왔는데요? 왜 또 결제하래요?', question: '카드는 승인됐는데 POS에 결제가 안 잡혀요' },
  { topic: '단체 예약', situation: '단체 예약 손님이 30분째 오지 않는다', line: '(전화) 저희 좀 늦을 것 같은데 자리 그대로죠?', question: '단체 예약 손님이 30분째 안 와요' },
  { topic: '기타', situation: '와인을 직접 가져와서 마셔도 되냐고 묻는다', line: '저희 와인 한 병 가져왔는데 여기서 따도 돼요?', question: '와인 가져와서 마셔도 되냐고 물어보세요' },
];

function toCustomer(p: PersonaRow): Customer {
  const name = p.persona.match(/^(\S+?) 씨/)?.[1] ?? '손님';
  return { id: p.uuid.slice(0, 8), name, age: p.age, sex: p.sex, region: `${p.province} ${p.district.split('-')[1] ?? ''}`.trim(), occupation: p.occupation, persona: p.persona };
}

function sceneByRules(p: PersonaRow) {
  const t = TEMPLATES[parseInt(p.uuid.slice(0, 6), 16) % TEMPLATES.length];
  return { topic: t.topic, situation: t.situation, customerLine: t.line, staffQuestion: t.question };
}

const EXAMPLE = `{"situation":"손님이 진로를 시켰는데 진로가 다 떨어졌다","customerLine":"아니 진로가 없어요? 나는 그거 아니면 안 마시는데.","staffQuestion":"진로가 떨어졌는데 손님이 진로만 찾으세요"}`;

/** 작은 로컬 모델이 칸을 비우거나 지시문을 그대로 옮기는 경우를 거른다 */
function sceneOk(x: { situation: string; customerLine: string; staffQuestion: string }, name: string) {
  const q = x.staffQuestion.trim();
  return (
    x.situation.trim().length >= 10 &&
    x.customerLine.replace(name, '').replace(/씨/g, '').trim().length >= 8 &&
    q.length >= 8 && q.length <= 80 && !/[:：]$/.test(q) && !/^신입/.test(q) && !q.includes(name)
  );
}

export async function sceneByLlm(p: PersonaRow, topic: string) {
  const schema = z.object({
    situation: z.string(),
    customerLine: z.string(),
    staffQuestion: z.string(),
  });
  const name = p.persona.match(/^(\S+?) 씨/)?.[1] ?? '손님';
  const out = await ask('customer-sim', {
    system: '너는 술집 아르바이트 교육용 상황극 작가다. 실제로 자주 일어나는 현실적인 예외 상황만 쓴다. 과장하거나 범죄·의료 상황을 만들지 않는다. JSON 하나만 답한다.',
    user: [
      `[매장]\n${STORE}`,
      `[오늘의 손님]\n${p.persona}\n${p.culinary_persona}\n(${p.age}세 ${p.sex}, ${p.province}, ${p.occupation})`,
      `이 손님이 술집에서 겪을 법한 '${topic}' 상황 하나를 만든다. 들어온 지 3일 된 신입이 혼자 판단하기 어려운 일이어야 한다. 손님의 나이·직업·생활에서 자연스럽게 나올 법한 일로 만든다.`,
      '[칸 설명]\n- situation: 무슨 일이 생겼는지 한 문장\n- customerLine: 손님이 직원에게 직접 하는 말. 따옴표 없이 손님 말투 그대로, 나이와 성격이 드러나게\n- staffQuestion: 당황한 신입이 매장 위키 검색창에 치는 짧은 질문 한 문장. 손님 이름은 쓰지 않는다',
      `[예시]\n${EXAMPLE}`,
    ].join('\n\n'),
    schema,
    effort: 'low',
  });
  return out && sceneOk(out, name) ? { topic, ...out } : null;
}

/** 가상 손님 한 명을 들여보내 신입 질문 흐름까지 돌린다 */
export async function visitOne(): Promise<Visit> {
  const list = personas();
  const p = list[Math.floor(Math.random() * list.length)];
  // 주제는 코드가 고른다(작은 모델은 예시 주제로 쏠린다)
  const topics = db.get().topics.filter((t) => t !== '기타');
  const topic = topics[Math.floor(Math.random() * topics.length)];
  const { value: scene, via } = await llmOr(() => sceneByLlm(p, topic), () => sceneByRules(p), llmEnabled());
  const newbie = db.findOrCreatePerson('도윤', '신입', '3일차').id;
  const r = await flows.ask(scene.staffQuestion, newbie);
  const visit: Visit = {
    customer: toCustomer(p),
    ...scene,
    via,
    questionId: r.question.id,
    outcome: r.question.status === 'escalated' ? 'escalated' : 'answered',
    cited: r.question.cited,
    at: new Date().toISOString(),
  };
  visits.push(visit);
  return visit;
}

let running = false;
export const isSimulating = () => running;

/** 여러 명을 차례로 들여보낸다(화면에서 그래프가 자라는 모습을 보도록 간격을 둔다) */
export async function visitMany(n: number, gapMs = 1200) {
  if (running) return false;
  running = true;
  try {
    for (let i = 0; i < n; i++) {
      await visitOne();
      if (i < n - 1) await new Promise((r) => setTimeout(r, gapMs));
    }
    return true;
  } finally {
    running = false;
  }
}
