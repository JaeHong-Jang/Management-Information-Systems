// 역할별 메뉴. 사이드바(≥1024)와 하단 탭(<1024, 최대 5칸)이 같은 목록을 쓴다.
import { BookOpen, Bot, ClipboardList, FileSearch, Map as MapIcon, Megaphone, MessageCircleQuestion, Network, PenLine, ScrollText, Store } from 'lucide-react';
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
}
export interface NavGroup { group: string; en: string; items: NavItem[] }

const prefix = (p: string) => (path: string) => path === p || path.startsWith(`${p}/`);

export function navFor(role: AppRole, storeId: string | null, storeName: string): NavGroup[] {
  if (role === 'SV')
    return [
      { group: '현황', en: 'OVERVIEW', items: [{ to: '/hq', label: '전국 현황', short: '전국', icon: MapIcon, on: (p) => p === '/hq' }] },
      {
        group: '진단·처방',
        en: 'DIAGNOSE',
        items: [
          ...(storeId ? [{ to: `/hq/stores/${storeId}`, label: `매장 상세 · ${storeName}`, short: '매장', icon: Store, on: prefix('/hq/stores') }] : []),
          { to: '/hq/reviews', label: '리뷰 탐색', short: '리뷰', icon: FileSearch, on: prefix('/hq/reviews') },
          { to: `/graph${storeId ? `?storeId=${storeId}` : ''}`, label: '지식 그래프', short: '그래프', icon: Network, on: prefix('/graph') },
        ],
      },
      { group: '기준', en: 'STANDARD', items: [{ to: '/hq/standards', label: '본사 표준·개정 제안', short: '표준', icon: ScrollText, on: prefix('/hq/standards') }] },
      { group: '에이전트', en: 'AGENTS', items: [{ to: '/hq/agents', label: '에이전트 운영', short: '에이전트', icon: Bot, on: prefix('/hq/agents'), live: true }] },
    ];
  if (!storeId) return [];
  if (role === '점장')
    return [
      { group: '우리 매장', en: 'STORE', items: [{ to: `/store/${storeId}/manager`, label: '오늘 할 일', short: '할 일', icon: ClipboardList, on: (p) => p.endsWith('/manager') }] },
      {
        group: '지식',
        en: 'WIKI',
        items: [
          { to: `/store/${storeId}/wiki`, label: '매장 위키', short: '위키', icon: BookOpen, on: (p) => p.endsWith('/wiki') },
          { to: `/graph?storeId=${storeId}`, label: '지식 그래프', short: '그래프', icon: Network, on: prefix('/graph') },
        ],
      },
    ];
  const staffTab = (tab: string) => (p: string, sp: URLSearchParams) => p.endsWith('/staff') && (sp.get('tab') ?? 'brief') === tab;
  return [
    {
      group: '근무',
      en: 'SHIFT',
      items: [
        { to: `/store/${storeId}/staff?tab=brief`, label: '오늘 브리핑', short: '브리핑', icon: Megaphone, on: staffTab('brief') },
        { to: `/store/${storeId}/staff?tab=ask`, label: '물어보기', short: '물어보기', icon: MessageCircleQuestion, on: staffTab('ask') },
        { to: `/store/${storeId}/staff?tab=record`, label: '기록하기', short: '기록', icon: PenLine, on: staffTab('record') },
      ],
    },
    { group: '지식', en: 'WIKI', items: [{ to: `/store/${storeId}/wiki`, label: '매장 위키', short: '위키', icon: BookOpen, on: (p) => p.endsWith('/wiki') }] },
  ];
}
