import { Suspense, useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useSearchParams } from 'react-router-dom';
import { ChevronRight, House, MoreHorizontal, Store } from 'lucide-react';
import { Loading } from '@/shared/ui/States';
import { LiveProvider, useLive } from '@/shared/api/live';
import { cx } from '@/shared/lib/format';
import { useApp, useRoleSync, type AppRole } from './AppData';
import { navFor, type NavGroup, type NavItem } from './nav';
import { SidebarData, SidebarFoot, SidebarTop } from './SidebarPanels';
import { StoreDataProvider, useStoreData } from './StoreData';
import { ModuleMenu } from './ModuleMenu';
import { TopBar } from './TopBar';
import { useHashScroll } from './useHashScroll';
import { useStoreId } from './useStoreId';
import './portal.css';

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
  const navStore = storeId ?? targetId;
  const navName = overview.data?.stores.find((r) => r.store.id === navStore)?.store.name ?? targetName;
  const nationwide = role === 'SV' && pathname.startsWith('/hq') && !pathname.startsWith('/hq/stores/');
  const scopeName = nationwide ? '전국 매장' : navName;
  const { unseen, escalated } = useStoreData();
  const groups = navFor(role, navStore, navName, { newAnswer: unseen.length > 0, escalated });
  const running = runs.some((r) => !r.done);
  const isOn = (it: NavItem) => it.on(pathname, sp);

  const activeGroup = groups.find((group) => group.items.some(isOn));
  const activeItem = activeGroup?.items.find(isOn);
  const tab = sp.get('tab');
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname, tab]);
  useHashScroll();

  return (
    <div className="min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-ctl focus:bg-surface focus:px-3 focus:py-2">본문으로 건너뛰기</a>
      <TopBar />
      <ModuleMenu groups={groups} active={activeGroup} scope={scopeName} isOn={isOn} />
      <div className="lg:flex">
        <Sidebar role={role} groups={groups} isOn={isOn} running={running} />
        <main id="main" className="min-w-0 flex-1 pb-24 pt-4 lg:pb-12 lg:pt-5">
          <div className="frame">
            <nav aria-label="현재 위치" className="portal-crumb">
              <Link to="/" aria-label="포털 홈"><House size={14} /></Link>
              <ChevronRight size={12} aria-hidden /><span>{activeGroup?.group ?? (pathname === '/graph' ? '지식 관리' : '운영포털')}</span>
              {(activeItem || pathname === '/graph') && <><ChevronRight size={12} aria-hidden /><span aria-current="page">{activeItem?.label ?? '지식 그래프'}</span></>}
              <span className="portal-mobile-location"><Store size={13} aria-hidden />{scopeName}</span>
            </nav>
            <div key={pathname + (tab ?? '')} className="page-enter"><Suspense fallback={<Loading />}><Outlet /></Suspense></div>
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
    <span className="relative ml-auto inline-flex h-2 w-2" title="업무 처리 중">
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
        <span className="sr-only">건 답변 대기</span>
      </span>
    );
  if (it.dot)
    return (
      <span className={cx(pos, 'inline-block h-2.5 w-2.5 rounded-full bg-yellow ring-2 ring-surface')}>
        <span className="sr-only">신규 답변</span>
      </span>
    );
  return null;
}

function Sidebar({ role, groups, isOn, running }: { role: AppRole; groups: NavGroup[]; isOn: (it: NavItem) => boolean; running: boolean }) {
  return (
    <nav aria-label="메뉴" className="portal-sidebar hidden lg:block">
      <div className="sidebar-body">
        <div className="sidebar-identity">
          <SidebarTop role={role} />
        </div>
        <div className="portal-nav-groups">
          {groups.map((g) => (
            <div key={g.group}>
              <p className="nav-group-title">{g.group}</p>
              <ul className="space-y-0.5">
                {g.items.map((it) => {
                  const on = isOn(it);
                  const Icon = it.icon;
                  return (
                    <li key={it.to}>
                      <Link
                        to={it.to}
                        aria-current={on ? 'page' : undefined}
                        className="portal-nav-link"
                      >
                        <Icon size={18} strokeWidth={1.7} aria-hidden />
                        <span className="min-w-0">{it.label}</span>
                        {it.live && <LiveDot on={running} />}
                        <Signal it={it} />
                        {on && <ChevronRight size={14} className="ml-auto" aria-hidden />}
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
  const items = groups.flatMap((g) => g.items);
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
        <ul id="more-nav" className="fixed inset-x-3 bottom-[72px] z-40 animate-rise rounded-card border border-line bg-surface p-2 shadow-pop" aria-label="더보기 메뉴">
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
                  {on && <span className="absolute inset-x-4 top-0 h-[3px] rounded-b bg-yellow" aria-hidden />}
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
              <button type="button" aria-expanded={more} aria-controls="more-nav" onClick={() => setMore((v) => !v)} className={cx(tab(restOn || more), 'w-full')}>
                {restOn && <span className="absolute inset-x-4 top-0 h-[3px] rounded-b bg-yellow" aria-hidden />}
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
