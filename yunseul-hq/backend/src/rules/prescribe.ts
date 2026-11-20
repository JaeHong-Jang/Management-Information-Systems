// 처방 규칙(PLAN §5)의 문장 틀과 표준 개정 제안 후보. 순수 함수.
import type { CauseClass, ComplaintType, HqStandard, Store, StoreScore } from '@shared/contracts';
import { standardFor } from './causes.js';
import { rankEligible } from './score.js';

/** 불만 유형 → 매장 위키 토픽 */
export const COMPLAINT_TOPIC: Record<ComplaintType, string> = {
  이용시간제한: '이용시간',
  '좌석·인원': '좌석 배정',
  최소주문: '최소주문',
  '규칙 미고지·말바꿈': '응대 기본',
  '직원 태도': '응대 기본',
  '품절·대체': '품절·대체',
  '결제·계산': '결제·계산',
  신분증: '신분증',
  위생: '이물·위생',
  '대기·서빙지연': '응대 기본',
  '맛·품질': '이물·위생',
  '다른 지점 비교': '응대 기본',
};

/** 지식 공백 처방 카드의 기본 대응(LLM이 없을 때) */
export const PLAYBOOK: Partial<Record<ComplaintType, { actions: string[]; avoid: string; escalateWhen: string; notice: string }>> = {
  이용시간제한: {
    actions: ['자리 안내 시 이용시간 기준 사전 안내', '기준 시간 20분 전 1회 사전 고지', '웨이팅이 없으면 본사 표준에 따라 연장 가능 여부 안내'],
    avoid: '사전 안내 없는 시간 경과 퇴장 요청 금지.',
    escalateWhen: '손님이 퇴장 요청에 항의하거나 언성이 높아지는 경우',
    notice: '웨이팅이 있을 때는 이용시간 안내를 드리고 있어요. 시간이 다가오면 미리 말씀드릴게요.',
  },
  '좌석·인원': {
    actions: ['입장 시 인원과 희망 좌석 우선 확인', '자리 이동이 필요하면 사유(단체 예약 등) 사전 설명', '소인원 손님도 빈자리가 있으면 입장 허용'],
    avoid: '사유 설명 없는 자리 이동 요청 금지.',
    escalateWhen: '자리 배정 문제로 손님이 돌아가려는 경우',
    notice: '자리는 인원에 맞춰 안내해 드려요. 옮겨야 할 때는 이유를 먼저 말씀드릴게요.',
  },
  '규칙 미고지·말바꿈': {
    actions: ['매장 규칙(이용시간·주문·결제 방식)은 주문 접수 전 일괄 안내', '안내 문구는 근무자 간 동일 문장 사용', '안내와 다른 상황 발생 시 점장 확인 후 안내'],
    avoid: '손님 문의 후에야 규칙을 알리는 행위 금지. 근무자별 상이한 안내 금지.',
    escalateWhen: '안내 내용과 다르다는 항의를 받는 경우',
    notice: '이용 안내는 주문 전에 한 번에 말씀드릴게요. 궁금한 점은 언제든 물어봐 주세요.',
  },
  '품절·대체': {
    actions: ['근무 시작 시 품절 메뉴 확인, 주문 접수 시 사전 안내', '대체 메뉴는 2가지 이상 제시 후 손님 선택', '주문 후 품절 확인 시 즉시 테이블 방문, 사과 후 선택지 제시'],
    avoid: '안내 없는 대체 메뉴 제공 금지.',
    escalateWhen: '대체 메뉴로 가격 차이가 발생하거나 손님이 취소를 원하는 경우',
    notice: '오늘 준비가 어려운 메뉴는 주문 받을 때 먼저 말씀드릴게요.',
  },
  '결제·계산': {
    actions: ['중간 결제가 필요하면 주문 접수 시 사전 안내', '결제 전 주문 내역을 손님과 공동 확인', '금액 이의 제기 시 영수증·POS 내역 공동 확인'],
    avoid: '손님 확인 없는 금액 재입력 금지.',
    escalateWhen: '결제 금액이 맞지 않거나 취소·재결제가 필요한 경우',
    notice: '결제 방식은 주문 받을 때 안내해 드리고, 계산 전에 주문 내역을 함께 확인해요.',
  },
  신분증: {
    actions: ['첫 주문 전 테이블 전원의 신분증 확인', '인정 신분증 종류(실물·모바일 신분증 앱)를 동일 문장으로 안내', '미확인 손님에게는 주류 제공 불가 사유를 정중하게 설명'],
    avoid: '사진·캡처로 확인 대체 금지.',
    escalateWhen: '위조가 의심되거나 손님이 확인을 거부하며 항의하는 경우',
    notice: '주류 주문 전에 신분증을 확인하고 있어요. 실물이나 모바일 신분증 앱 화면을 보여 주세요.',
  },
  '직원 태도': {
    actions: ['규칙 안내 시 사유 1문장 병기', '거절 시 대안 함께 제시', '말투가 날카로워지는 상황에서는 다른 근무자와 교대'],
    avoid: '규칙만 통보하고 돌아서는 응대 금지.',
    escalateWhen: '손님이 직원 태도를 문제 삼아 항의하는 경우',
    notice: '매장 규칙은 이유와 함께 안내해 드릴게요.',
  },
};

export const SV_CHECKLIST: Record<Exclude<CauseClass, '지식 공백'>, (detail: string) => string[]> = {
  '매장 자체 규칙': (detail) => [
    '점장과 본사 표준 문장을 함께 읽고 지금 매장 운영과 다른 점 확인',
    `리뷰에 드러난 운영 방식 사실 확인: ${detail}`,
    '예외가 필요한 사정이면 본사 예외 신청, 아니면 표준대로 바꾸는 날짜 정하기',
    '바꾼 뒤 4주 동안 같은 불만 리뷰가 다시 나오는지 확인',
  ],
  '운영·인력': (detail) => [
    '금·토 피크 시간 근무 인원과 홀 담당 배치 확인',
    `리뷰에 나온 상황 재현 점검: ${detail}`,
    '주문 누락·서빙 지연 기록과 응대 문장(인사·사과·안내) 관찰',
    '신입 교육 이수 여부와 교대 규칙 확인',
  ],
  '위생·품질': (detail) => [
    'QSC 점검표로 주방·홀 청결 점검',
    `리뷰에 나온 문제 확인: ${detail}`,
    '이물 발견 시 대응 절차를 근무자가 알고 있는지 확인',
    '안주 조리 기준(온도·양)과 냉장·냉동 보관 상태 확인',
  ],
};

export const customerNoticeFor = (type: ComplaintType, standards: HqStandard[]) => standardFor(type, standards)?.customerNotice || PLAYBOOK[type]?.notice || '';

// ---------- 표준 개정 제안 ----------

export interface ProposalCandidate { complaint: ComplaintType; storeIds: string[]; lowCount: number }

/** 같은 불만이 위험 상위 topN개 순위 매장 중 minStores곳 이상에서 상위 불만(TOP3)으로 반복되는가 */
export function proposalCandidates(stores: Store[], scores: Map<string, StoreScore>, minStores = 5, topN = 20): ProposalCandidate[] {
  const high = stores
    .filter((s) => rankEligible(s) && scores.get(s.id)!.rank !== null && scores.get(s.id)!.rank! <= topN);
  const by = new Map<ComplaintType, ProposalCandidate>();
  for (const s of high) {
    for (const t of scores.get(s.id)!.topComplaints) {
      const row = by.get(t.type) ?? { complaint: t.type, storeIds: [], lowCount: 0 };
      row.storeIds.push(s.id);
      row.lowCount += t.count;
      by.set(t.type, row);
    }
  }
  return [...by.values()].filter((c) => c.storeIds.length >= minStores).sort((a, b) => b.storeIds.length - a.storeIds.length || b.lowCount - a.lowCount);
}
