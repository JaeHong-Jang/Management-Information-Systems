// 세 역할 공통 셸 하나: 상단바(ink) + 왼쪽 사이드바 240px(≥1024) / 하단 탭(<1024, 최대 5칸 + 더보기) + 본문.
// 본문은 최대 1280px 12열. 직원 화면의 폭(홈 두 열 · 나머지 640px)은 직원 화면이 정한다(.frame이 max-w 유틸보다 뒤에 있어 셸에서 덮을 수 없다).
// 사이드바: 지금 맥락 카드 → 메뉴 → 실데이터 짧은 목록 → (맨 아래) 상태·고지. SidebarPanels.tsx
import { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useSearchParams } from 'react-router-dom';
import { MoreHorizontal } from 'lucide-react';
import { LiveProvider, useLive } from '@/shared/api/live';
import { cx } from '@/shared/lib/format';
import { useApp, useRoleSync, type AppRole } from './AppData';
import { navFor, type NavGroup, type NavItem } from './nav';
import { SidebarData, SidebarFoot, SidebarTop } from './SidebarPanels';
import { StoreDataProvider, useStoreData } from './StoreData';
import { TopBar } from './TopBar';
import { useHashScroll } from './useHashScroll';
import { useStoreId } from './useStoreId';

function routeRole(pathname: string): AppRole | null {
  if (pathname.startsWith('/hq')) return 'SV';
  if (pathname.endsWith('/manager')) return '점장';
  if (pathname.endsWith('/staff')) return '직원';
  return null;
}

export function AppShell() {
  const { pathname } = useLocation();
  const { role } = useApp();
  useRoleSync(routeRole(pathname));
  const storeId = useStoreId();
  // 본사는 전 매장 이벤트, 점장·직원은 그 매장 + 본사 이벤트만 받는다
  return (
    <LiveProvider storeId={role === 'SV' ? null : storeId}>
      <StoreDataProvider>
        <Frame />
      </StoreDataProvider>
    </LiveProvider>
  );
}

function Frame() {
  const { role, targetId, targetName, overview } = useApp();
  const { pathname } = useLocation();
  const [sp] = useSearchParams();
  const { runs } = useLive();
  const storeId = useStoreId();
  const navStore = role === 'SV' ? targetId : storeId;
  const navName = overview.data?.stores.find((r) => r.store.id === navStore)?.store.name ?? targetName;
  const { unseen, escalated } = useStoreData();
  const groups = navFor(role, navStore, navName, { newAnswer: unseen.length > 0, escalated });
  const running = runs.some((r) => !r.done);
  const isOn = (it: NavItem) => it.on(pathname, sp);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  useHashScroll();

  return (
    <div className="min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-ctl focus:bg-surface focus:px-3 focus:py-2">본문으로 건너뛰기</a>
      <TopBar />
      <div className="lg:flex">
        <Sidebar role={role} groups={groups} isOn={isOn} running={running} />
        <main id="main" className="min-w-0 flex-1 pb-28 pt-6 lg:pb-12">
          <div className="frame">
            <Outlet />
          </div>
        </main>
      </div>
      <BottomTabs groups={groups} isOn={isOn} running={running} />
    </div>
  );
}

function LiveDot({ on }: { on: boolean }) {
  if (!on) return null;
  return (
    <span className="relative ml-auto inline-flex h-2 w-2" title="지금 실행 중인 흐름이 있어요">
      <span className="absolute inset-0 animate-ping rounded-full bg-yellow" />
      <span className="relative h-2 w-2 rounded-full bg-yellow" />
      <span className="sr-only">실행 중</span>
    </span>
  );
}

/** 메뉴 옆 표시: 숫자 배지 또는 새 답 점 */
function Signal({ it, floating }: { it: NavItem; floating?: boolean }) {
  const pos = floating ? 'absolute -right-2 -top-1' : 'ml-auto';
  if (it.badge && it.badge > 0)
    return (
      <span className={cx(pos, 'num inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-yellow px-1 text-[0.6875rem] font-bold leading-none text-ink ring-2 ring-surface')}>
        {it.badge}
        <span className="sr-only">건 넘어왔어요</span>
      </span>
    );
  if (it.dot)
    return (
      <span className={cx(pos, 'inline-block h-2.5 w-2.5 rounded-full bg-yellow ring-2 ring-surface')}>
        <span className="sr-only">새 답이 왔어요</span>
      </span>
    );
  return null;
}

function Sidebar({ role, groups, isOn, running }: { role: AppRole; groups: NavGroup[]; isOn: (it: NavItem) => boolean; running: boolean }) {
  return (
    <nav aria-label="메뉴" className="hidden border-r border-line bg-surface lg:sticky lg:top-14 lg:block lg:h-[calc(100vh-56px)] lg:w-sidebar lg:shrink-0 lg:overflow-y-auto">
      <div className="flex min-h-full flex-col px-3 py-5">
        <div className="mb-5">
          <SidebarTop role={role} />
        </div>
        <div className="space-y-5">
          {groups.map((g) => (
            <div key={g.group}>
              <p className="px-2 pb-1.5 text-caption text-text-muted">
                {g.group} <span className="font-mono text-[0.625rem] tracking-[0.14em]">{g.en}</span>
              </p>
              <ul className="space-y-0.5">
                {g.items.map((it) => {
                  const on = isOn(it);
                  const Icon = it.icon;
                  return (
                    <li key={it.to}>
                      <Link
                        to={it.to}
                        aria-current={on ? 'page' : undefined}
                        className={cx('flex min-h-[40px] items-center gap-2.5 rounded-ctl px-2.5 py-2 text-body', on ? 'bg-ink font-bold text-white' : 'text-text-subtle hover:bg-ink-weak hover:text-ink')}
                      >
                        <Icon size={16} aria-hidden />
                        <span className="min-w-0">{it.label}</span>
                        {it.live && <LiveDot on={running} />}
                        <Signal it={it} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
        <SidebarData role={role} />
        <SidebarFoot role={role} />
      </div>
    </nav>
  );
}

function BottomTabs({ groups, isOn, running }: { groups: NavGroup[]; isOn: (it: NavItem) => boolean; running: boolean }) {
  const items = groups.flatMap((g) => g.items).filter((it) => !it.sidebarOnly);
  const [more, setMore] = useState(false);
  const { pathname, search } = useLocation();
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => setMore(false), [pathname, search]);
  useEffect(() => {
    if (!more) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMore(false);
    const onDown = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setMore(false);
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onDown);
    };
  }, [more]);
  if (items.length === 0) return null;
  const overflow = items.length > 5;
  const main = overflow ? items.slice(0, 4) : items;
  const rest = overflow ? items.slice(4) : [];
  const restOn = rest.some(isOn);

  const tab = (on: boolean) =>
    cx('relative flex min-h-[56px] flex-col items-center justify-center gap-0.5 px-1 text-caption', on ? 'font-bold text-ink' : 'text-text-muted');
  return (
    <div ref={box} className="lg:hidden">
      {more && (
        <ul className="fixed inset-x-3 bottom-[72px] z-40 animate-rise rounded-card border border-line bg-surface p-2 shadow-pop" aria-label="더보기 메뉴">
          {rest.map((it) => {
            const Icon = it.icon;
            return (
              <li key={it.to}>
                <Link to={it.to} aria-current={isOn(it) ? 'page' : undefined} className={cx('flex min-h-[48px] items-center gap-3 rounded-ctl px-3 text-body', isOn(it) ? 'bg-ink text-white' : 'text-text hover:bg-ink-weak')}>
                  <Icon size={18} aria-hidden />
                  {it.label}
                  <Signal it={it} />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <nav aria-label="하단 메뉴" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]">
        <ul className="grid" style={{ gridTemplateColumns: `repeat(${main.length + (overflow ? 1 : 0)}, minmax(0, 1fr))` }}>
          {main.map((it) => {
            const on = isOn(it);
            const Icon = it.icon;
            return (
              <li key={it.to}>
                <Link to={it.to} aria-current={on ? 'page' : undefined} className={tab(on)}>
                  {on && <span className="absolute inset-x-4 top-0 h-[3px] rounded-b bg-yellow-hl" aria-hidden />}
                  <span className="relative">
                    <Icon size={20} aria-hidden />
                    {it.live && running && <span className="absolute -right-1 -top-0.5 h-2 w-2 rounded-full bg-yellow ring-2 ring-surface" aria-label="실행 중" />}
                    <Signal it={it} floating />
                  </span>
                  <span className="truncate">{it.short}</span>
                </Link>
              </li>
            );
          })}
          {overflow && (
            <li>
              <button type="button" aria-expanded={more} aria-haspopup="menu" onClick={() => setMore((v) => !v)} className={cx(tab(restOn || more), 'w-full')}>
                {restOn && <span className="absolute inset-x-4 top-0 h-[3px] rounded-b bg-yellow-hl" aria-hidden />}
                <MoreHorizontal size={20} aria-hidden />
                더보기
              </button>
            </li>
          )}
        </ul>
      </nav>
    </div>
  );
}
