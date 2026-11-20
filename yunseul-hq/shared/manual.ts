import type { ManualItem } from './contracts';

const fran = 'https://yeokjeonfnc.com/html/fran.html';
const beer = 'https://yeokjeonfnc.com/html/menu_1.html';

export const manualItems: ManualItem[] = [
  {
    id: 'G-01', situationId: 'T09', category: '인사', title: '퇴점 고객 배웅 인사',
    description: '퇴점 고객 대상 배웅 인사 실시. 본사는 2021년 우수가맹점 선정 시 배웅 인사 매뉴얼 준수 여부를 평가함.',
    basis: '본사 공개 기준', source: { label: '본사 공지 · 배웅 인사 평가', url: 'https://yeokjeonfnc.com/board/index.php?board=hof_01&idx=6&type=view' },
  },
  {
    id: 'Q-01', category: '품질', title: '생맥주 전용 냉장고 보관',
    description: '생맥주의 전용 냉장고 보관 여부 확인. 근거: 본사 공개 생맥주 보관 방식.',
    basis: '본사 공개 기준', source: { label: '브랜드 소개 · 전용 냉장고', url: 'https://yeokjeonfnc.com/html/brand.html' },
  },
  {
    id: 'Q-02', category: '품질', title: '살얼음 생맥주 저온 숙성',
    description: '살얼음 생맥주의 숙성 상태 확인. 근거: 본사 공개 제조 방식(영하 온도 48시간 숙성).',
    basis: '본사 공개 기준', source: { label: '공식 메뉴 · 살얼음 생맥주', url: beer },
  },
  {
    id: 'Q-03', category: '품질', title: '얼린 맥주잔 준비',
    description: '살얼음 생맥주 제공 전 냉동고 보관 잔의 결빙 상태 확인.',
    basis: '본사 공개 기준', source: { label: '공식 메뉴 · 얼린 맥주잔', url: beer },
  },
  {
    id: 'C-01', category: '위생', title: '품질·청결·서비스·인사 기준 숙지',
    description: '품질·청결·서비스·인사(QCS+G) 기준 확인. 본사는 매장 운영 매뉴얼에 따라 4개 항목을 전국 프로그램에서 다룸.',
    basis: '본사 공개 기준', source: { label: '공식 가맹 안내 · QCS+G', url: fran },
  },
  {
    id: 'C-02', situationId: 'T07', category: '위생', title: '테이블과 잔의 청결 상태 확인',
    description: '고객 입장 전 테이블·잔의 청결 상태 확인. 현장 해결이 어려운 사항은 점장 보고.',
    basis: '윤슬 실무 제안',
  },
  {
    id: 'S-01', situationId: 'T04', category: '서비스', title: '품절 시 안내할 대체 메뉴 확인',
    description: '근무 전 품절 메뉴와 주문 가능한 대체 메뉴 확인. 안내 기준이 불분명한 경우 현장 질문 등록.',
    basis: '윤슬 실무 제안',
  },
  {
    id: 'S-02', category: '서비스', title: '교대 전 미해결 질문 인계',
    description: '답변 대기 질문과 승인된 매장 카드 검토 후 후속 조치 필요 사항을 다음 근무자에게 인계.',
    basis: '윤슬 실무 제안',
  },
];
