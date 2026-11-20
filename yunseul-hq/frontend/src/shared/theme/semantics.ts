// 색의 뜻 (docs/DESIGN.md v2 §4). 빨강은 고위험만, 노랑은 주의·강조. 색은 항상 아이콘 + 글자와 함께 쓴다.
import {
  Archive,
  Ban,
  BookOpen,
  CircleCheck,
  Circle,
  ClipboardCheck,
  Clock,
  FileText,
  GitBranch,
  Megaphone,
  Scale,
  ShieldCheck,
  Siren,
  TriangleAlert,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { CardStatus, CauseClass, ComplaintType, PrescriptionKind, PrescriptionStatus, Source } from '@shared/contracts';

export type RiskLevel = 'low' | 'mid' | 'high';
export const HIGH_RISK = 60; // PLAN §3: 위험 60 이상 = 고위험
export const MID_RISK = 30;

export const riskLevel = (risk: number): RiskLevel => (risk >= HIGH_RISK ? 'high' : risk >= MID_RISK ? 'mid' : 'low');

export const RISK: Record<RiskLevel, { label: string; icon: LucideIcon; text: string; bar: string; weak: string }> = {
  low: { label: '낮음', icon: Circle, text: 'text-text-subtle', bar: 'bg-low-bar', weak: 'bg-surface-sunken' },
  mid: { label: '주의', icon: TriangleAlert, text: 'text-amber-text', bar: 'bg-amber-bar', weak: 'bg-amber-weak' },
  high: { label: '고위험', icon: Siren, text: 'text-red', bar: 'bg-red', weak: 'bg-surface' },
};

export const CAUSES: CauseClass[] = ['지식 공백', '운영·인력', '매장 자체 규칙', '위생·품질'];

export const CAUSE: Record<CauseClass, { icon: LucideIcon; text: string; weak: string; bar: string; hex: string; to: string }> = {
  '지식 공백': { icon: BookOpen, text: 'text-know', weak: 'bg-know-weak', bar: 'bg-know', hex: '#1F5FA8', to: '매장(사례 카드·브리핑)' },
  '운영·인력': { icon: Users, text: 'text-ops', weak: 'bg-ops-weak', bar: 'bg-ops', hex: '#7E2A1E', to: 'SV 방문 과제' },
  '매장 자체 규칙': { icon: GitBranch, text: 'text-rule', weak: 'bg-rule-weak', bar: 'bg-rule', hex: '#6B6115', to: 'SV 방문 과제 + 표준 차이 기록' },
  '위생·품질': { icon: ShieldCheck, text: 'text-hyg', weak: 'bg-hyg-weak', bar: 'bg-hyg', hex: '#0B6E78', to: 'SV 방문 과제(QSC)' },
};

export const KIND: Record<PrescriptionKind, { icon: LucideIcon; to: string }> = {
  '사례 카드': { icon: FileText, to: '매장' },
  '근무 전 브리핑': { icon: Megaphone, to: '매장' },
  'SV 방문 과제': { icon: ClipboardCheck, to: 'SV' },
  '표준 개정 제안': { icon: Scale, to: '본사' },
};

export type Tone = 'neutral' | 'amber' | 'done' | 'ink';

export const PRESCRIPTION_STATUS: Record<PrescriptionStatus, { label: string; icon: LucideIcon; tone: Tone }> = {
  draft: { label: '초안', icon: Clock, tone: 'amber' },
  sent: { label: '보냄', icon: ClipboardCheck, tone: 'ink' },
  done: { label: '완료', icon: CircleCheck, tone: 'done' },
  rejected: { label: '거절', icon: Ban, tone: 'neutral' },
};

export const CARD_STATUS: Record<CardStatus, { label: string; icon: LucideIcon; tone: Tone }> = {
  pending: { label: '승인 대기', icon: Clock, tone: 'amber' },
  approved: { label: '승인됨', icon: CircleCheck, tone: 'done' },
  rejected: { label: '거절', icon: Ban, tone: 'neutral' },
  archived: { label: '보관', icon: Archive, tone: 'neutral' },
};

export const SOURCE: Record<Source, { tone: Tone }> = {
  '본사 표준': { tone: 'ink' },
  공식규정: { tone: 'neutral' },
  현장노하우: { tone: 'done' },
};

export const TONE: Record<Tone, string> = {
  neutral: 'border-line-strong text-text-subtle bg-surface',
  amber: 'border-amber-bar text-amber-text bg-amber-weak',
  done: 'border-done text-done bg-done-weak',
  ink: 'border-ink text-ink bg-ink-weak',
};

/** 불만 유형별 근거어: 리뷰 인용 속에서 형광펜을 칠할 구절(표시용, 판정에 쓰지 않는다) */
export const COMPLAINT_CUES: Record<ComplaintType, readonly string[]> = {
  이용시간제한: ['시간 제한', '시간제한', '2시간', '나가라', '퇴장', '나가 달라'],
  '좌석·인원': ['좌석', '자리', '인원', '4인', '두 명', '2명'],
  최소주문: ['최소주문', '최소 주문', '기본 주문', '1인 1'],
  '규칙 미고지·말바꿈': ['처음부터', '말도 없이', '미리', '고지', '안내'],
  '직원 태도': ['불친절', '싸가지', '태도', '무시', '반말'],
  '품절·대체': ['품절', '다 떨어', '없다고', '대체'],
  '결제·계산': ['추가결제', '결제', '계산', '영수증'],
  신분증: ['신분증', '민증', '모바일 신분증'],
  위생: ['머리카락', '더러', '벌레', '위생', '냄새'],
  '대기·서빙지연': ['안 나와', '기다', '늦게', '오래', '대기'],
  '맛·품질': ['식었', '질기', '눅눅', '맛없', '맛이'],
  '다른 지점 비교': ['다른 지점', '다른 매장', '다른 곳'],
};
