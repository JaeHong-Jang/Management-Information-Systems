// 앱 전역: 전국 현황(타깃 매장 id, AI 모드, 브랜드)과 지금 고른 역할
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AiStatus, HqOverview } from '@shared/contracts';
import { api } from '@/shared/api/client';
import { useAsync, type AsyncState } from '@/shared/lib/useAsync';

export type AppRole = 'SV' | '점장' | '직원';

interface AppData {
  overview: AsyncState<HqOverview>;
  targetId: string | null;
  targetName: string;
  ai: AiStatus | null;
  setAi: (ai: AiStatus) => void;
  role: AppRole;
  setRole: (r: AppRole) => void;
}

const Ctx = createContext<AppData | null>(null);
export const useApp = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error('AppDataProvider 밖');
  return v;
};

function readRole(): AppRole {
  try {
    const r = localStorage.getItem('yunseul-hq.role.v3');
    if (r === 'SV' || r === '점장' || r === '직원') return r;
  } catch {
    /* 저장소를 못 쓰면 기본값 */
  }
  return '직원'; // v3: 첫 화면은 직원 (새 키라 예전 저장값은 무시)
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const overview = useAsync(() => api.overview(), []);
  const [role, setRoleState] = useState<AppRole>(readRole);
  const [aiOverride, setAiOverride] = useState<AiStatus | null>(null);
  const target = overview.data?.stores.find((r) => r.store.isTarget)?.store ?? null;

  const setRole = useCallback((r: AppRole) => {
    setRoleState(r);
    try {
      localStorage.setItem('yunseul-hq.role.v3', r);
    } catch {
      /* 무시 */
    }
  }, []);

  useEffect(() => setAiOverride(null), [overview.data]);

  const value = useMemo<AppData>(
    () => ({
      overview,
      targetId: target?.id ?? null,
      targetName: target?.name ?? '강남 윤슬점',
      ai: aiOverride ?? overview.data?.ai ?? null,
      setAi: setAiOverride,
      role,
      setRole,
    }),
    [overview, target, aiOverride, role, setRole],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** 역할 전용 화면에 들어오면 역할을 맞춘다 */
export function useRoleSync(r: AppRole | null) {
  const { role, setRole } = useApp();
  useEffect(() => {
    if (r && r !== role) setRole(r);
  }, [r, role, setRole]);
}
