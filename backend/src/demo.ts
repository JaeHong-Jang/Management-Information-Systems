// 시연 재생: 매장의 하루를 실제 흐름으로 돌린다. 화면에서는 에이전트가 움직이고 그래프가 자라는 모습이 그대로 보인다.
import * as flows from './flows/index.js';
import * as stock from './flows/stock.js';
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

    const a1 = await flows.ask('모바일 신분증 앱 화면으로 보여 줘도 되나요?', newbie);
    await sleep(gapMs);
    await flows.feedback(a1.question.id, true);
    await sleep(gapMs);

    // 위키가 모르는 질문 → 점장 답 → 새 카드 → 같은 질문은 이제 위키가 답한다
    const a2 = await flows.ask('손님이 와인을 가져와서 마셔도 되냐고 해요', newbie);
    await sleep(gapMs * 1.5);
    await flows.resolve(
      a2.question.id,
      '콜키지는 와인 한 병당 1만원을 받고 와인잔을 내준다. 우리 매장 주류 판매가 줄어드는 걸 메우려는 것이다. 소주·맥주는 가져와서 마실 수 없다고 안내한다. 두 병 넘게 가져오면 점장에게 연락한다.',
      manager,
    );
    await sleep(gapMs);
    await flows.ask('와인 가져온 손님 콜키지 받아요?', other);
    await sleep(gapMs);

    // 이번 주 POS 매출을 올린다 → 새 메뉴 소모량 초안 · 일정 카드로 보정 제안 · 주문서 초안
    const pos = await stock.posImportSample(manager);
    await sleep(gapMs * 1.5);
    for (const a of pos.proposals) await stock.adjustmentAction(a.id, 'approve');
    await sleep(gapMs);
    await flows.ask('생맥 케그 몇 개 시켜야 해요?', newbie);
    await sleep(gapMs);

    const raw = '하이볼 주문이 몰리는데 얼음이 떨어지면 근처 편의점에서 컵얼음을 사 온다. 영수증은 점장님께 드린다.';
    const d1 = await flows.interview(raw, veteran);
    await sleep(gapMs);
    const answers = d1.followups.map((q) => ({
      question: q,
      answer: /이유/.test(q)
        ? '얼음 없이 하이볼을 내면 맛이 달라 항의가 들어오고, 얼음 기계는 다시 얼리는 데 2시간이 걸리기 때문이다.'
        : /안 되는|하면 안/.test(q)
          ? '얼음을 물에 녹여 양을 늘리거나 다른 테이블 얼음을 덜어 쓰지 않는다.'
          : '편의점에도 얼음이 없거나 3만원 넘게 사야 하면 점장에게 연락한다.',
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
