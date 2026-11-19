// 역할별 메뉴. 사이드바(≥1024)와 하단 탭(<1024, 최대 5칸)이 같은 목록을 쓴다.
import { BookOpen, Bot, ClipboardList, FileSearch, GraduationCap, Home, Map as MapIcon, Network, PenLine, ScrollText, Store } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { AppRole } from './AppData';

export interface NavItem {
  to: string;
  label: string;
  short: string; // 하단 탭 글자
  icon: LucideIcon;
  on: (path: string, sp: URLSearchParams) => boolean;
  /** 실행 중 점을 붙일 메뉴 */
  live?: boolean;
  /** 숫자 배지(점장 '오늘 할 일'의 넘어온 질문 수) */
  badge?: number;
  /** 새 답이 왔다는 점(직원 '홈') */
  dot?: boolean;
  /** 사이드바에만 둔다(하단 탭에서는 뺀다) */
  sidebarOnly?: boolean;
}
export interface NavSignals { newAnswer: boolean; escalated: number }
export interface NavGroup { group: string; en: string; items: NavItem[] }

const prefix = (p: string) => (path: string) => path === p || path.startsWith(`${p}/`);

export function navFor(role: AppRole, storeId: string | null, storeName: string, signals: NavSignals = { newAnswer: false, escalated: 0 }): NavGroup[] {
  if (role === 'SV') {
    const groups: NavGroup[] = [
      { group: '전국', en: 'NATION', items: [{ to: '/hq', label: '전국 상황', short: '전국', icon: MapIcon, on: (p) => p === '/hq' }] },
      {
        group: '비교',
        en: 'COMPARE',
        items: storeId ? [{ to: `/hq/stores/${storeId}`, label: `매장 비교 · ${storeName}`, short: '매장', icon: Store, on: prefix('/hq/stores') }] : [],
      },
      { group: '기준', en: 'STANDARD', items: [{ to: '/hq/standards', label: '카드·표준', short: '표준', icon: ScrollText, on: prefix('/hq/standards') }] },
      { group: '에이전트', en: 'AGENTS', items: [{ to: '/hq/agents', label: '에이전트', short: '에이전트', icon: Bot, on: prefix('/hq/agents'), live: true }] },
      {
        group: '근거',
        en: 'EVIDENCE',
        items: [
          { to: '/hq/reviews', label: '리뷰 탐색', short: '리뷰', icon: FileSearch, on: prefix('/hq/reviews') },
          { to: `/graph${storeId ? `?storeId=${storeId}` : ''}`, label: '지식 그래프', short: '그래프', icon: Network, on: prefix('/graph') },
        ],
      },
    ];
    return groups.filter((g) => g.items.length > 0);
  }
  if (!storeId) return [];
  if (role === '점장')
    return [
      { group: '우리 매장', en: 'STORE', items: [{ to: `/store/${storeId}/manager`, label: '오늘 할 일', short: '할 일', icon: ClipboardList, on: (p) => p.endsWith('/manager'), badge: signals.escalated }] },
      {
        group: '지식',
        en: 'WIKI',
        items: [
          { to: `/store/${storeId}/wiki`, label: '매장 위키', short: '위키', icon: BookOpen, on: (p) => p.endsWith('/wiki') },
          { to: `/graph?storeId=${storeId}`, label: '지식 그래프', short: '그래프', icon: Network, on: prefix('/graph'), sidebarOnly: true },
        ],
      },
    ];
  // 직원: ?tab=home|prep|record. 예전 brief·ask는 홈으로 연다
  const staffTab = (tab: string) => (p: string, sp: URLSearchParams) => {
    const t = sp.get('tab');
    return p.endsWith('/staff') && (t === 'prep' || t === 'record' ? t : 'home') === tab;
  };
  return [
    {
      group: '근무',
      en: 'SHIFT',
      items: [
        { to: `/store/${storeId}/staff?tab=home`, label: '홈', short: '홈', icon: Home, on: staffTab('home'), dot: signals.newAnswer },
        { to: `/store/${storeId}/staff?tab=prep`, label: '첫 근무 준비', short: '준비', icon: GraduationCap, on: staffTab('prep') },
        { to: `/store/${storeId}/staff?tab=record`, label: '기록하기', short: '기록', icon: PenLine, on: staffTab('record') },
      ],
    },
    { group: '지식', en: 'WIKI', items: [{ to: `/store/${storeId}/wiki`, label: '매장 위키', short: '위키', icon: BookOpen, on: (p) => p.endsWith('/wiki') }] },
  ];
}
