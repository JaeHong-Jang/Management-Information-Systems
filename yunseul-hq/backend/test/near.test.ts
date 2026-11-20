// 넘김 때 붙이는 '가장 가까운 카드'는 제목·주제·태그가 질문과 겹칠 때만(PIVOT §8.1-2 보강)
import { describe, expect, it } from 'vitest';
import type { Card } from '@shared/contracts';
import { onTopic } from '../src/flows/index.js';

const card = (title: string, topic: string, tags: string[]): Card => ({ id: 'X', storeId: null, scope: 'brand', title, topic, situation: '', reason: '', actions: [], avoid: '', escalateWhen: '', source: '본사 표준', authorId: 'P', status: 'approved', origin: '시드', created: '', updated: '', expires: '', tags, uses: 0, helpful: 0, notHelpful: 0 });

describe('가까운 카드 주제 겹침', () => {
  it('태그가 겹치면 가까운 카드로 본다', () => {
    expect(onTopic('손님이 반말한다고 화내요', card('첫 인사와 호출 응답 먼저 하기', '응대 기본', ['인사', '호출', '반말']))).toBe(true);
  });
  it('테이블처럼 어디에나 나오는 낱말만 겹치면 같은 주제가 아니다', () => {
    expect(onTopic('테이블에 물 쏟았어요', card('얼굴 아는 단골 테이블은 신분증 확인 생략', '신분증', ['단골', '신분증', '생략']))).toBe(false);
  });
  it('본문만 우연히 겹치는 무관한 카드는 붙이지 않는다', () => {
    expect(onTopic('손님이 생일이라고 케이크를 가져왔는데 받아도 돼요?', card('많이 취한 손님이 술을 더 시킬 때', '취객·분쟁 응대', ['만취', '취객', '추가 주문', '거절', '귀가']))).toBe(false);
  });
});
