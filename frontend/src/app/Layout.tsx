import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { ChevronDown, Play, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { api } from '@/shared/api/client';
import { useLive } from '@/shared/api/live';
import { Button, cx, useToast } from '@/shared/ui';
import { MOBILE_TABS, NAV } from './nav';

export function Layout() {
  const { state, connected, me, setMe } = useLive();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  // 대시보드에는 첫 카드에 같은 달빛 버튼이 있으니 사이드바 버튼은 한 단계 낮춘다
  const onHome = useLocation().pathname === '/';

  const all = NAV.flatMap((g) => g.items);
  const mobile = MOBILE_TABS.map((to) => all.find((x) => x.to === to)!).filter(Boolean);
  const person = state?.people.find((p) => p.id === me);

  const play = async () => {
    setBusy(true);
    try {
      await api.playDemo();
      toast('매장의 하루를 재생해요. 대시보드와 그래프에서 지켜보세요');
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const reset = async () => {
    if (!confirm('데모 데이터를 처음 상태로 되돌릴까요?')) return;
    await api.reset();
    location.reload();
  };

  const ai = state?.ai;
  const aiLabel = !connected ? '서버에 다시 연결하는 중' : ai?.mode === 'ollama' ? '로컬 AI 연결됨' : ai?.mode === 'claude' ? 'Claude 연결됨' : '규칙 모드 (AI 꺼짐)';
  const aiOn = connected && ai && ai.mode !== 'rules';

  return (
    <div className="sidebar-rail min-h-screen lg:grid lg:grid-cols-[256px_1fr]">
      {/* sticky h-screen이라 스크롤해도 사이드바 그라데이션이 화면 높이를 늘 덮는다 */}
      <aside className="sidebar-night sticky top-0 hidden h-screen flex-col px-4 pb-5 pt-6 lg:flex">
        <div className="mb-5 flex items-center gap-2.5 px-2">
          <LogoMark />
          <p className="text-[20px] font-bold leading-6 text-night-ink">윤슬</p>
        </div>
        <nav className="flex-1 space-y-4 overflow-y-auto">
          {NAV.map((g) => (
            <div key={g.group}>
              <p className="mb-1 px-3 text-[12px] font-semibold text-night-sub/80">{g.group}</p>
              <div className="space-y-0.5">
                {g.items.map((it) => (
                  <NavLink
                    key={it.to}
                    to={it.to}
                    end={it.to === '/'}
                    className={({ isActive }) =>
                      cx('group flex h-9 items-center gap-3 rounded-xl px-3 text-[15px] transition-colors', isActive ? 'bg-white/[0.10] font-semibold text-night-ink ring-1 ring-inset ring-white/15' : 'font-medium text-night-sub hover:bg-white/[0.06] hover:text-night-body')
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <it.icon size={19} strokeWidth={isActive ? 2.3 : 2} className={isActive ? 'text-night-iris' : 'text-night-sub group-hover:text-night-body'} />
                        <span className="flex-1">{it.label}</span>
                        {it.hint ? <span className="text-[11px] font-medium text-night-sub/60">{it.hint}</span> : null}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="space-y-2 pt-4">
          {/* 점과 글자를 위 메뉴의 아이콘·이름 줄에 맞춘다(px-3, 아이콘 19px, gap-3) */}
          <div className="mb-2 flex items-start gap-3 rounded-xl bg-white/[0.07] px-3 py-3 ring-1 ring-inset ring-white/10">
            <span className="flex h-5 w-[19px] flex-none items-center justify-center">
              <span className={cx('h-2 w-2 rounded-full', aiOn ? 'bg-night-aqua' : connected ? 'bg-ink-disabled' : 'bg-warning-mark')} />
            </span>
            <div className="min-w-0 space-y-0.5">
              <p className="text-[13px] font-semibold leading-5 text-night-ink">{aiLabel}</p>
              {aiOn && ai?.model && <p className="truncate text-[12px] leading-4 text-night-sub">{ai.model}</p>}
            </div>
          </div>
          <Button variant={onHome ? 'glass' : 'moon'} size="md" className="w-full" onClick={play} loading={busy} disabled={state?.demoPlaying}>
            <Play size={16} /> {state?.demoPlaying ? '하루 재생 중' : '매장의 하루 재생'}
          </Button>
          <button className="flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-[13px] font-medium text-night-ink hover:bg-white/[0.06]" onClick={reset}>
            <RotateCcw size={13} /> 데모 초기화
          </button>
        </div>
      </aside>

      <div className="min-w-0 pb-24 lg:pb-0">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 bg-surface-page/85 px-5 py-3 backdrop-blur lg:px-10">
          <div className="flex items-center gap-2 lg:hidden">
            <LogoMark small />
            <span className="text-[17px] font-bold">윤슬</span>
            <span className={cx('ml-1 h-2 w-2 rounded-full', aiOn ? 'bg-success-mark' : connected ? 'bg-ink-disabled' : 'bg-warning-mark')} title={aiLabel} />
          </div>
          <label className="relative ml-auto flex items-center gap-2 rounded-full bg-surface py-1 pl-1 pr-3 text-[14px] hover:bg-surface/70">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-person-mark text-[12px] font-bold text-white">{person?.name[0] ?? '?'}</span>
            <span className="hidden text-[12px] text-ink-weak sm:inline">지금 사용하는 사람</span>
            <span className="font-semibold text-ink-strong">
              {person?.name} <span className="font-normal text-ink-weak">{person && `${person.role} ${person.tenure}`}</span>
            </span>
            <ChevronDown size={15} className="text-ink-weak" />
            <select value={me} onChange={(e) => setMe(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" aria-label="지금 사용하는 사람">
              {state?.people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.role} {p.tenure}
                </option>
              ))}
            </select>
          </label>
        </header>
        <main className="mx-auto max-w-[1320px] px-5 pb-10 pt-4 lg:px-10 lg:pt-6">
          <Outlet />
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(19,18,50,0.06)] backdrop-blur lg:hidden">
        {mobile.map((it) => (
          <NavLink key={it.to} to={it.to} end={it.to === '/'} className={({ isActive }) => cx('flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px]', isActive ? 'font-semibold text-brand-strong' : 'font-medium text-ink-weak')}>
            {({ isActive }) => (
              <>
                <it.icon size={21} className={isActive ? 'text-brand' : undefined} />
                {it.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

/** 윤슬 로고: 밤 남색 사각형 안 보름달 하나와 그 아래 수면 잔물결 두 줄 */
function LogoMark({ small }: { small?: boolean }) {
  return (
    <span className={cx('logo-night flex flex-none items-center justify-center', small ? 'h-7 w-7 rounded-lg' : 'h-9 w-9 rounded-xl')} aria-hidden>
      <svg viewBox="0 0 24 24" className={small ? 'h-[19px] w-[19px]' : 'h-6 w-6'} fill="none" strokeWidth={1.8} strokeLinecap="round">
        <circle cx="12" cy="7.6" r="3.8" className="fill-night-ink" />
        <path d="M5 15.4q3.5-1.6 7 0t7 0" className="stroke-night-rose" />
        <path d="M8.5 19.2q1.75-1.2 3.5 0t3.5 0" className="stroke-night-iris" />
      </svg>
    </span>
  );
}
