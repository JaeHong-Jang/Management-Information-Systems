import { NavLink, Outlet } from 'react-router-dom';
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
    <div className="min-h-screen lg:grid lg:grid-cols-[256px_1fr] lg:bg-[linear-gradient(90deg,#fff_256px,transparent_256px)]">
      <aside className="sticky top-0 hidden h-screen flex-col bg-surface px-4 pb-5 pt-6 lg:flex">
        <div className="mb-5 flex items-center gap-2.5 px-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-[17px] font-bold text-white">이</span>
          <div className="min-w-0">
            <p className="text-[18px] font-bold leading-6 text-ink-strong">이어받기</p>
            <p className="truncate text-[12px] text-ink-weak">{state?.store.name ?? '매장 위키'}</p>
          </div>
        </div>
        <nav className="flex-1 space-y-4 overflow-y-auto">
          {NAV.map((g) => (
            <div key={g.group}>
              <p className="mb-1 px-3 text-[12px] font-semibold text-ink-disabled">{g.group}</p>
              <div className="space-y-0.5">
                {g.items.map((it) => (
                  <NavLink
                    key={it.to}
                    to={it.to}
                    end={it.to === '/'}
                    className={({ isActive }) =>
                      cx('group flex h-9 items-center gap-3 rounded-xl px-3 text-[15px] transition-colors', isActive ? 'bg-surface-subtle font-semibold text-ink-strong' : 'font-medium text-ink-body hover:bg-surface-subtle')
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <it.icon size={19} strokeWidth={isActive ? 2.3 : 2} className={isActive ? 'text-brand' : 'text-ink-disabled group-hover:text-ink-weak'} />
                        <span className="flex-1">{it.label}</span>
                        {it.hint ? <span className="text-[11px] font-medium text-ink-disabled">{it.hint}</span> : null}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="space-y-2 pt-4">
          <div className="mb-2 flex items-center gap-2.5 rounded-xl bg-surface-subtle px-3 py-2">
            <span className={cx('h-2 w-2 flex-none rounded-full', aiOn ? 'bg-success' : connected ? 'bg-ink-disabled' : 'bg-warning')} />
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-ink-strong">{aiLabel}</p>
              {aiOn && ai?.model && <p className="truncate text-[12px] text-ink-weak">{ai.model}</p>}
            </div>
          </div>
          <Button size="md" className="w-full" onClick={play} loading={busy} disabled={state?.demoPlaying}>
            <Play size={16} /> {state?.demoPlaying ? '하루 재생 중' : '매장의 하루 재생'}
          </Button>
          <button className="flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-[13px] font-medium text-ink-weak hover:bg-surface-subtle hover:text-ink-body" onClick={reset}>
            <RotateCcw size={13} /> 데모 초기화
          </button>
        </div>
      </aside>

      <div className="min-w-0 pb-24 lg:pb-0">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 bg-surface-page/85 px-5 py-3 backdrop-blur lg:px-10">
          <div className="flex items-center gap-2 lg:hidden">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-[14px] font-bold text-white">이</span>
            <span className="text-[17px] font-bold">이어받기</span>
            <span className={cx('ml-1 h-2 w-2 rounded-full', aiOn ? 'bg-success' : connected ? 'bg-ink-disabled' : 'bg-warning')} title={aiLabel} />
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

      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-surface lg:hidden">
        {mobile.map((it) => (
          <NavLink key={it.to} to={it.to} end={it.to === '/'} className={({ isActive }) => cx('flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium', isActive ? 'text-ink-strong' : 'text-ink-disabled')}>
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
