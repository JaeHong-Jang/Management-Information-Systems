// 시연 재생: 매장의 하루를 실제 흐름으로 돌린다. 화면에서는 에이전트가 움직이고 그래프가 자라는 모습이 그대로 보인다.
import * as flows from './flows/index.js';
import * as db from './store/db.js';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let playing = false;

export const isPlaying = () => playing;

export async function playDay(gapMs = 1600) {
  if (playing) return false;
  playing = true;
  const prevPace = process.env.STEP_PACE_MS;
  process.env.STEP_PACE_MS = '450';
  try {
    const newbie = db.findOrCreatePerson('도윤', '신입', '3일차').id;
    const other = db.findOrCreatePerson('지우', '신입', '1주차').id;
    const veteran = db.findOrCreatePerson('수빈', '숙련', '8개월').id;
    const manager = db.get().people.find((p) => p.role === '점장')!.id;

    const a1 = await flows.ask('오트 우유 떨어졌는데 일반 우유로 해도 돼요?', newbie);
    await sleep(gapMs);
    await flows.feedback(a1.question.id, true);
    await sleep(gapMs);

    const a2 = await flows.ask('외국인 손님이 알리페이로 결제하고 싶대요', newbie);
    await sleep(gapMs * 1.5);
    await flows.resolve(
      a2.question.id,
      '우리 단말기는 알리페이가 안 된다. 카드, 현금, 제로페이를 안내한다. 말이 안 통하면 번역 앱 화면을 보여 준다. 결제 수단을 몰라 당황하면 불만이 커지기 때문이다. 결제 수단이 하나도 없으면 점장에게 연락한다.',
      manager,
    );
    await sleep(gapMs);
    await flows.ask('알리페이 되냐고 물어보는 손님이 있어요', other);
    await sleep(gapMs);

    const raw = '기프티콘 금액보다 비싼 메뉴를 고르면 차액을 따로 결제해 달라고 안내함. 차액은 카드나 현금으로 받음.';
    const d1 = await flows.interview(raw, veteran);
    await sleep(gapMs);
    const answers = d1.followups.map((q) => ({
      question: q,
      answer: /이유/.test(q)
        ? '기프티콘은 금액권이라 남은 차액을 매장이 대신 내 줄 수 없기 때문이다.'
        : /안 되는|하면 안/.test(q)
          ? '차액을 깎아 주거나 다른 기프티콘과 합쳐 주지 않는다.'
          : '차액이 1만원을 넘거나 고객이 항의하면 점장에게 연락한다.',
    }));
    const d2 = await flows.interview(raw, veteran, answers);
    await sleep(gapMs);
    const card = await flows.submitCard(d2, veteran);
    await sleep(gapMs);
    await flows.cardAction(card.id, 'approve');
    await sleep(gapMs);
    await flows.lint();
    return true;
  } finally {
    if (prevPace === undefined) delete process.env.STEP_PACE_MS;
    else process.env.STEP_PACE_MS = prevPace;
    playing = false;
  }
}
