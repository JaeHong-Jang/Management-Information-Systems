// 메뉴. 역할별로 묶었다: 현장(신입·숙련), 관리(점장), 시스템(그래프·에이전트·지표·심사).
import type { LucideIcon } from 'lucide-react';
import { Activity, BookOpen, Bot, CircleHelp, ClipboardCheck, Gauge, GraduationCap, Network, PenLine, Scale } from 'lucide-react';

export interface NavItem { to: string; label: string; icon: LucideIcon; hint?: string }

export const NAV: { group: string; items: NavItem[] }[] = [
  { group: '한눈에', items: [{ to: '/', label: '실시간 개요', icon: Activity }] },
  {
    group: '현장',
    items: [
      { to: '/ask', label: '질문하기', icon: CircleHelp, hint: '신입' },
      { to: '/record', label: '노하우 남기기', icon: PenLine, hint: '숙련 직원' },
      { to: '/train', label: '훈련', icon: GraduationCap, hint: '신입' },
    ],
  },
  { group: '관리', items: [{ to: '/manager', label: '점장 할 일', icon: ClipboardCheck, hint: '점장' }, { to: '/wiki', label: '매장 위키', icon: BookOpen }] },
  {
    group: '시스템',
    items: [
      { to: '/graph', label: '온톨로지 그래프', icon: Network },
      { to: '/agents', label: '에이전트 팀', icon: Bot },
      { to: '/metrics', label: '지표', icon: Gauge },
      { to: '/judge', label: '심사 기준', icon: Scale },
    ],
  },
];

// 업무 모드에서 역할별로 보이는 메뉴(처음 쓰는 사람에게 2~4개만). 시연 모드는 전체.
export const ROLE_PATHS: Record<string, string[]> = {
  신입: ['/ask', '/train', '/wiki'],
  숙련: ['/record', '/ask', '/wiki'],
  점장: ['/manager', '/wiki', '/metrics', '/record'],
};
export const ROLE_HOME: Record<string, string> = { 신입: '/ask', 숙련: '/record', 점장: '/manager' };
export const DEMO_MOBILE_TABS = ['/', '/ask', '/record', '/manager', '/graph'];
