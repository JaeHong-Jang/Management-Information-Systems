// 리뷰 불만 유형 12종 태깅(규칙). 정규식은 원자료 CSV를 만든 build_csv.py와 같다.
import { COMPLAINT_TYPES, type ComplaintType, type Review } from '@shared/contracts';

export const COMPLAINT_PATTERNS: Record<ComplaintType, RegExp> = {
  이용시간제한: /2\s*시간|두\s*시간|시간\s*제한|시간제|나가\s*(라|달라|래)|퇴장|쫓겨|쫓아/,
  '좌석·인원': /자리\s*(를\s*)?(옮|이동|바꿔)|테이블\s*(을\s*)?(옮|이동|바꿔)|[12]\s*(인|명)\s*(은|이라|손님)?\s*(안|못)\s*받|혼자\s*(는|라)?\s*(안|못)|인원|합석|가려\s*받|골라\s*받/,
  최소주문: /최소\s*주문|기본\s*주문|인당\s*\d|1\s*인\s*1|주문\s*금액/,
  '규칙 미고지·말바꿈': /미리\s*(말|안내|고지)|사전\s*(고지|안내|공지)|고지|그제서야|처음부터|말\s*(도\s*)?안\s*(하|해)|안내\s*(도\s*)?(없|안)|말이\s*달|다르게\s*말|번복/,
  '직원 태도': /불친절|싸가지|무례|태도|짜증|눈치|반말|소리\s*(를\s*)?(지르|질러)|표정|퉁명|기분\s*(이\s*)?나쁘|욕\s*(을|하)|응대/,
  '품절·대체': /품절|재료\s*(가\s*)?(소진|없)|다른\s*(안주|메뉴)\s*(로|를)|대체|떨어졌/,
  '결제·계산': /계산|결제|영수증|금액|더\s*(찍|나왔)|잘못\s*(찍|계산|결제)|중간\s*정산/,
  신분증: /신분증|민증|면허증|주민등록|모바일\s*(신분|면허)/,
  위생: /머리카락|벌레|바퀴|더럽|위생|끈적|냄새|이물|청소/,
  '대기·서빙지연': /안\s*나와|늦게\s*나|오래\s*걸|한참|서빙\s*(이\s*)?늦|주문\s*(이\s*)?누락|까먹/,
  '맛·품질': /맛\s*(이\s*)?없|미지근|식어|식었|비린|짜요|짜고|싱거|맛\s*(이\s*)?별로|양\s*(이\s*)?적/,
  '다른 지점 비교': /다른\s*(지점|매장|역할맥|할맥|곳은)|타\s*지점|본사/,
};

export function tagText(text: string): ComplaintType[] {
  const t = text ?? '';
  return COMPLAINT_TYPES.filter((type) => COMPLAINT_PATTERNS[type].test(t));
}

/** 리뷰를 규칙으로 다시 태깅한다(시드에 들어 있던 태그는 믿지 않는다) */
export const retag = (r: Review): Review => ({ ...r, tags: tagText(r.text), tagVia: 'rules' });

export const isLow = (r: Pick<Review, 'star'>) => r.star !== null && r.star !== undefined && r.star <= 2;

/** 원문에서 불만 유형이 걸린 문장을 그대로 잘라 온다(인용은 반드시 원문의 부분 문자열이어야 한다) */
export function quoteFrom(text: string, type: ComplaintType, max = 120): string {
  const m = COMPLAINT_PATTERNS[type].exec(text);
  if (!m) return text.slice(0, max).trim();
  const at = m.index;
  const bounds = /[.!?。\n]/g;
  let start = 0;
  let end = text.length;
  for (const b of text.matchAll(bounds)) {
    const i = b.index!;
    if (i < at) start = i + 1;
    else if (i >= at + m[0].length) {
      end = i + 1;
      break;
    }
  }
  if (end - start > max) {
    start = Math.max(start, at - Math.floor(max / 3));
    end = Math.min(end, start + max);
  }
  return text.slice(start, end).trim();
}
