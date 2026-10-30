import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Play, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { api } from '@/shared/api/client';
import { useLive } from '@/shared/api/live';
import { Badge, Button, cx, useToast } from '@/shared/ui';
import { DEMO_MOBILE_TABS, NAV, ROLE_PATHS } from './nav';
import { Welcome } from './Welcome';

export function Layout() {
  const { state, connected, me, setMe, mode, setMode } = useLive();
  const toast = useToast();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  if (!me) return <Welcome />;

  const person = state?.people.find((p) => p.id === me);
  const demo = mode === 'demo';
  const allowed = demo || !person ? null : new Set(ROLE_PATHS[person.role]);
  const groups = NAV.map((g) => ({ ...g, items: g.items.filter((it) => !allowed || allowed.has(it.to)) })).filter((g) => g.items.length);
  const all = groups.flatMap((g) => g.items);
  const mobile = demo ? DEMO_MOBILE_TABS.map((to) => all.find((x) => x.to === to)!).filter(Boolean) : all.slice(0, 5);

  const play = async () => {
    setBusy(true);
    try {
      await api.playDemo();
      toast('매장의 하루를 재생해요. 개요와 그래프에서 지켜보세요');
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
  const changeRole = () => {
    setMe('');
    nav('/');
  };

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-line bg-surface px-4 py-5 lg:flex">
        <div className="mb-6 px-2">
          <p className="text-[20px] font-bold text-ink-strong">이어받기</p>
          <p className="mt-0.5 text-[12px] text-ink-weak">{state?.store.name ?? '매장 위키'}</p>
        </div>
        <nav className="flex-1 space-y-5 overflow-y-auto">
          {groups.map((g) => (
            <div key={g.group}>
              {demo && <p className="mb-1 px-2 text-[12px] font-semibold text-ink-disabled">{g.group}</p>}
              {g.items.map((it) => (
                <NavLink
                  key={it.to}
                  to={it.to}
                  end={it.to === '/'}
                  className={({ isActive }) => cx('flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[15px] font-medium transition-colors', isActive ? 'bg-brand-weak text-brand-strong' : 'text-ink-body hover:bg-surface-subtle')}
                >
                  <it.icon size={18} strokeWidth={2} />
                  <span className="flex-1">{it.label}</span>
                  {demo && it.hint ? <span className="text-[11px] text-ink-disabled">{it.hint}</span> : null}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="space-y-2 border-t border-line pt-4">
          {demo ? (
            <>
              <Button size="md" className="w-full" onClick={play} loading={busy} disabled={state?.demoPlaying}>
                <Play size={16} /> {state?.demoPlaying ? '하루 재생 중' : '매장의 하루 재생'}
              </Button>
              <Button size="sm" variant="ghost" className="w-full" onClick={reset}>
                <RotateCcw size={14} /> 데모 초기화
              </Button>
              <button className="w-full py-1 text-[12px] text-ink-weak hover:text-ink-body" onClick={() => setMode('work')}>
                내 역할 화면으로
              </button>
            </>
          ) : (
            <button
              className="w-full py-1 text-[12px] text-ink-weak hover:text-ink-body"
              onClick={() => {
                setMode('demo');
                nav('/');
              }}
            >
              시연·심사용 전체 보기
            </button>
          )}
        </div>
      </aside>

      <div className="min-w-0 pb-24 lg:pb-0">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line bg-surface/90 px-5 py-3 backdrop-blur lg:px-8">
          <div className="flex items-center gap-2">
            <span className="text-[17px] font-bold lg:hidden">이어받기</span>
            {!connected && <Badge tone="warning">다시 연결하는 중</Badge>}
            {demo && state && <Badge tone={state.ai.mode === 'claude' ? 'brand' : 'neutral'}>{state.ai.mode === 'claude' ? `Claude · ${state.ai.model}` : '규칙 모드 (API 키 없음)'}</Badge>}
          </div>
          {demo ? (
            <label className="flex items-center gap-2 text-[13px] text-ink-weak">
              <span className="hidden sm:inline">지금 사용하는 사람</span>
              <select value={me} onChange={(e) => setMe(e.target.value)} className="rounded-lg border border-line bg-surface px-2 py-1.5 text-[14px] font-semibold text-ink-strong">
                {state?.people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {p.role} {p.tenure}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div className="flex items-center gap-3 text-[14px]">
              {person && (
                <span className="font-semibold text-ink-strong">
                  {person.name} <span className="font-normal text-ink-weak">{person.role}</span>
                </span>
              )}
              <button onClick={changeRole} className="rounded-lg bg-surface-subtle px-2.5 py-1.5 text-[13px] font-semibold text-ink-body hover:bg-line">
                역할 바꾸기
              </button>
            </div>
          )}
        </header>
        <main className="mx-auto max-w-[1280px] px-5 py-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-surface lg:hidden">
        {mobile.map((it) => (
          <NavLink key={it.to} to={it.to} end={it.to === '/'} className={({ isActive }) => cx('flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium', isActive ? 'text-brand-strong' : 'text-ink-weak')}>
            <it.icon size={20} />
            {it.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
