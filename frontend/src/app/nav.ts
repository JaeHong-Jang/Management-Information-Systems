// 메뉴. 역할별로 묶었다: 현장(신입·숙련), 관리(점장), 시스템(그래프·에이전트·지표·심사).
import type { LucideIcon } from 'lucide-react';
import { BookOpen, Bot, CircleHelp, ClipboardCheck, Gauge, GraduationCap, LayoutDashboard, Network, Package, PenLine, Scale, Users } from 'lucide-react';

export interface NavItem { to: string; label: string; icon: LucideIcon; hint?: string }

export const NAV: { group: string; items: NavItem[] }[] = [
  { group: '한눈에', items: [{ to: '/', label: '대시보드', icon: LayoutDashboard }] },
  {
    group: '현장',
    items: [
      { to: '/ask', label: '질문하기', icon: CircleHelp, hint: '신입' },
      { to: '/record', label: '노하우 남기기', icon: PenLine, hint: '숙련 직원' },
      { to: '/train', label: '훈련', icon: GraduationCap, hint: '신입' },
    ],
  },
  { group: '관리', items: [{ to: '/manager', label: '점장 할 일', icon: ClipboardCheck, hint: '점장' }, { to: '/inventory', label: '재고·발주', icon: Package }, { to: '/wiki', label: '매장 위키', icon: BookOpen }] },
  {
    group: '시스템',
    items: [
      { to: '/graph', label: '지식 그래프', icon: Network },
      { to: '/agents', label: '에이전트 팀', icon: Bot },
      { to: '/customers', label: '가상 손님', icon: Users },
      { to: '/metrics', label: '지표', icon: Gauge },
      { to: '/judge', label: '심사 기준', icon: Scale },
    ],
  },
];

export const MOBILE_TABS = ['/', '/ask', '/record', '/manager', '/inventory'];
