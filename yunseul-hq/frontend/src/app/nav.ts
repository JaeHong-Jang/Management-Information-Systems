// 역할별 메뉴. 사이드바(≥1024)와 하단 탭(<1024, 최대 5칸)이 같은 목록을 쓴다.
import { BookOpen, Bot, ClipboardList, FileSearch, GraduationCap, ListChecks, MessagesSquare, Map as MapIcon, Network, PenLine, ScrollText, Store } from 'lucide-react';
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
}
export interface NavSignals { newAnswer: boolean; escalated: number }
export interface NavGroup { group: string; items: NavItem[] }

const prefix = (p: string) => (path: string) => path === p || path.startsWith(`${p}/`);

export function navFor(role: AppRole, storeId: string | null, storeName: string, signals: NavSignals = { newAnswer: false, escalated: 0 }): NavGroup[] {
  const manual: NavItem = { to: `/store/${storeId}/manual`, label: '공통 매뉴얼', short: '매뉴얼', icon: ListChecks, on: (p) => p.endsWith('/manual') };
  if (role === 'SV') {
    const groups: NavGroup[] = [
      { group: '영업 현황', items: [{ to: '/hq', label: '전국 현황', short: '전국', icon: MapIcon, on: (p) => p === '/hq' }] },
      {
        group: '매장 분석',
        items: storeId ? [{ to: `/hq/stores/${storeId}`, label: `매장 비교 · ${storeName}`, short: '매장', icon: Store, on: prefix('/hq/stores') }] : [],
      },
      { group: '운영 기준', items: [...(storeId ? [manual] : []), { to: '/hq/standards', label: '표준 개정 관리', short: '표준', icon: ScrollText, on: prefix('/hq/standards') }] },
      { group: '실행 관리', items: [{ to: '/hq/agents', label: '에이전트', short: '에이전트', icon: Bot, on: prefix('/hq/agents'), live: true }] },
      {
        group: '근거 자료',
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
      { group: '매장 업무', items: [{ to: `/store/${storeId}/manager`, label: '점장 업무 현황', short: '업무 현황', icon: ClipboardList, on: (p) => p.endsWith('/manager'), badge: signals.escalated }, manual] },
      {
        group: '지식 관리',
        items: [
          { to: `/store/${storeId}/wiki`, label: '매장 위키', short: '위키', icon: BookOpen, on: (p) => p.endsWith('/wiki') },
          { to: `/graph?storeId=${storeId}`, label: '지식 그래프', short: '그래프', icon: Network, on: prefix('/graph') },
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
      group: '현장 업무',
      items: [
        manual,
        { to: `/store/${storeId}/staff?tab=home`, label: '현장 질문·답변', short: '질문', icon: MessagesSquare, on: staffTab('home'), dot: signals.newAnswer },
        { to: `/store/${storeId}/staff?tab=prep`, label: '첫 근무 준비', short: '준비', icon: GraduationCap, on: staffTab('prep') },
        { to: `/store/${storeId}/staff?tab=record`, label: '근무 사례 기록', short: '기록', icon: PenLine, on: staffTab('record') },
      ],
    },
    { group: '지식 관리', items: [{ to: `/store/${storeId}/wiki`, label: '매장 위키', short: '위키', icon: BookOpen, on: (p) => p.endsWith('/wiki') }] },
  ];
}
