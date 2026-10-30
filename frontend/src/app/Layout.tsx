import { NavLink, Outlet } from 'react-router-dom';
import { Play, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { api } from '@/shared/api/client';
import { useLive } from '@/shared/api/live';
import { Badge, Button, cx, useToast } from '@/shared/ui';
import { MOBILE_TABS, NAV } from './nav';

export function Layout() {
  const { state, connected, me, setMe } = useLive();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const all = NAV.flatMap((g) => g.items);

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

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-line bg-surface px-4 py-5 lg:flex">
        <div className="mb-6 px-2">
          <p className="text-[20px] font-bold text-ink-strong">이어받기</p>
          <p className="mt-0.5 text-[12px] text-ink-weak">{state?.store.name ?? '매장 위키'}</p>
        </div>
        <nav className="flex-1 space-y-5 overflow-y-auto">
          {NAV.map((g) => (
            <div key={g.group}>
              <p className="mb-1 px-2 text-[12px] font-semibold text-ink-disabled">{g.group}</p>
              {g.items.map((it) => (
                <NavLink
                  key={it.to}
                  to={it.to}
                  end={it.to === '/'}
                  className={({ isActive }) => cx('flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[15px] font-medium transition-colors', isActive ? 'bg-brand-weak text-brand-strong' : 'text-ink-body hover:bg-surface-subtle')}
                >
                  <it.icon size={18} strokeWidth={2} />
                  <span className="flex-1">{it.label}</span>
                  {it.hint ? <span className="text-[11px] text-ink-disabled">{it.hint}</span> : null}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="space-y-2 border-t border-line pt-4">
          <Button size="md" className="w-full" onClick={play} loading={busy} disabled={state?.demoPlaying}>
            <Play size={16} /> {state?.demoPlaying ? '하루 재생 중' : '매장의 하루 재생'}
          </Button>
          <Button size="sm" variant="ghost" className="w-full" onClick={reset}>
            <RotateCcw size={14} /> 데모 초기화
          </Button>
        </div>
      </aside>

      <div className="min-w-0 pb-24 lg:pb-0">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line bg-surface/90 px-5 py-3 backdrop-blur lg:px-8">
          <div className="flex items-center gap-2 lg:hidden">
            <span className="text-[17px] font-bold">이어받기</span>
          </div>
          <div className="hidden items-center gap-2 lg:flex">
            <span className={cx('h-2 w-2 rounded-full', connected ? 'bg-success' : 'bg-danger')} />
            <span className="text-[13px] text-ink-weak">{connected ? '실시간 연결됨' : '연결 끊김'}</span>
            {state && <Badge tone={state.ai.mode === 'claude' ? 'brand' : 'warning'}>{state.ai.mode === 'claude' ? `Claude · ${state.ai.model}` : '규칙 모드 (API 키 없음)'}</Badge>}
          </div>
          <label className="flex items-center gap-2 text-[13px] text-ink-weak">
            지금 사용하는 사람
            <select value={me} onChange={(e) => setMe(e.target.value)} className="rounded-lg border border-line bg-surface px-2 py-1.5 text-[14px] font-semibold text-ink-strong">
              {state?.people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.role} {p.tenure}
                </option>
              ))}
            </select>
          </label>
        </header>
        <main className="mx-auto max-w-[1280px] px-5 py-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-surface lg:hidden">
        {MOBILE_TABS.map((to) => {
          const it = all.find((x) => x.to === to)!;
          return (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => cx('flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium', isActive ? 'text-brand-strong' : 'text-ink-weak')}>
              <it.icon size={20} />
              {it.label}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
