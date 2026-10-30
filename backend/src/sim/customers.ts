// 가상 손님: 한국인 페르소나(Nemotron-Personas-Korea) 한 명을 골라 카페에서 생길 법한 예외 상황을 만들고,
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

const STORE = `카페 온새미로. 메뉴: 아메리카노, 라떼, 오트 라떼, 디카페인, 조각 케이크, 원두 판매. 결제: 카드, 현금, 제로페이, 기프티콘, 멤버십 쿠폰, 텀블러 할인. 배달앱(배민·쿠팡이츠) 주문도 받는다.`;

// 규칙 모드용 상황 틀. 페르소나에 따라 고르는 것만 달라진다.
const TEMPLATES: { topic: string; situation: string; line: string; question: string }[] = [
  { topic: '쿠폰·기프티콘', situation: '모바일 기프티콘 바코드가 이미 사용됐다고 뜬다', line: '이거 선물 받고 한 번도 안 썼는데 왜 사용 완료라고 나와요?', question: '기프티콘이 사용 완료로 뜨는데 손님은 안 썼다고 해요' },
  { topic: '쿠폰·기프티콘', situation: '기프티콘 금액보다 비싼 메뉴를 고른다', line: '기프티콘이 5천 원짜리인데 케이크랑 같이 쓸 수 있어요?', question: '기프티콘 금액보다 비싸게 주문하면 어떻게 해요?' },
  { topic: '품절·대체', situation: '오트 우유가 떨어진 상태에서 오트 라떼를 주문한다', line: '저 우유 못 먹어서 꼭 오트로 해 주셔야 해요.', question: '오트 우유가 떨어졌는데 오트 라떼 주문이 들어왔어요' },
  { topic: '교환·환불', situation: '음료 맛이 이상하다며 바꿔 달라고 한다', line: '이거 평소랑 맛이 너무 달라요. 바꿔 주실 수 있어요?', question: '음료 맛이 이상하다고 바꿔 달래요' },
  { topic: '교환·환불', situation: '영수증 없이 어제 산 원두를 환불해 달라고 한다', line: '영수증은 버렸는데 어제 여기서 산 거 맞아요.', question: '영수증 없이 환불해 달라는 손님이 있어요' },
  { topic: '배달앱 주문', situation: '배달 주문에 요청사항이 빠졌다고 전화한다', line: '시럽 빼 달라고 적었는데 달게 왔어요.', question: '배달 주문 요청사항이 빠졌다고 전화가 왔어요' },
  { topic: '결제·POS', situation: '카드 승인 문자는 왔는데 주문이 안 들어갔다', line: '돈은 빠져나갔는데 제 음료는 왜 안 나와요?', question: '카드는 승인됐는데 POS에 주문이 안 보여요' },
  { topic: '고객 응대', situation: '줄이 길어지자 큰 소리로 재촉한다', line: '아니 몇 분째 기다리는 거예요, 빨리 좀 해 주세요!', question: '줄이 길다고 손님이 큰 소리로 재촉해요' },
  { topic: '결제·POS', situation: '해외 간편결제로 내겠다고 한다', line: '위챗페이 돼요? 카드가 없어서요.', question: '위챗페이로 결제할 수 있냐고 물어보세요' },
  { topic: '쿠폰·기프티콘', situation: '종이 도장 쿠폰을 모아 와서 무료 음료를 요구한다', line: '도장 열 개 다 찍었으니까 오늘 공짜로 주는 거죠?', question: '종이 도장 쿠폰 다 모아 오셨는데 어떻게 처리해요?' },
];

function toCustomer(p: PersonaRow): Customer {
  const name = p.persona.match(/^(\S+?) 씨/)?.[1] ?? '손님';
  return { id: p.uuid.slice(0, 8), name, age: p.age, sex: p.sex, region: `${p.province} ${p.district.split('-')[1] ?? ''}`.trim(), occupation: p.occupation, persona: p.persona };
}

function sceneByRules(p: PersonaRow) {
  const t = TEMPLATES[parseInt(p.uuid.slice(0, 6), 16) % TEMPLATES.length];
  return { topic: t.topic, situation: t.situation, customerLine: t.line, staffQuestion: t.question };
}

const EXAMPLE = `{"situation":"손님이 받은 모바일 기프티콘 바코드를 찍자 '이미 사용됨'이 뜬다","customerLine":"아이고, 이거 딸이 보내 준 건데 나는 한 번도 안 썼어요. 왜 안 된다는 거예요?","staffQuestion":"기프티콘이 이미 사용됐다고 뜨는데 손님은 안 썼다고 하세요"}`;

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
    system: '너는 카페 아르바이트 교육용 상황극 작가다. 실제로 자주 일어나는 현실적인 예외 상황만 쓴다. 과장하거나 범죄·의료 상황을 만들지 않는다. JSON 하나만 답한다.',
    user: [
      `[매장]\n${STORE}`,
      `[오늘의 손님]\n${p.persona}\n${p.culinary_persona}\n(${p.age}세 ${p.sex}, ${p.province}, ${p.occupation})`,
      `이 손님이 계산대에서 겪을 법한 '${topic}' 상황 하나를 만든다. 들어온 지 3일 된 신입이 혼자 판단하기 어려운 일이어야 한다. 손님의 나이·직업·생활에서 자연스럽게 나올 법한 일로 만든다.`,
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
