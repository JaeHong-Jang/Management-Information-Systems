// 매장 상태 하나를 셸·직원·점장 화면이 같이 쓴다(중복 호출 방지).
// 실행이 끝날 때(SSE run-end)와 15초마다(탭이 보일 때만) 다시 불러오고, '나'와 본 답 표시(localStorage)도 여기서 맡는다.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { matchPath, useLocation } from 'react-router-dom';
import type { Person, Question, StoreState } from '@shared/contracts';
import { api } from '@/shared/api/client';
import { useLive } from '@/shared/api/live';
import { useAsync, type AsyncState } from '@/shared/lib/useAsync';

interface StoreData {
  storeId: string | null;
  state: AsyncState<StoreState>;
  staff: Person[];
  me: string; // 저장된 '나'. 없으면 ''
  setMe: (id: string) => void;
  /** 내가 물은 질문 중 점장 답이 왔는데 아직 안 본 것 */
  unseen: Question[];
  markSeen: (ids: string[]) => void;
  /** 점장에게 넘어와 아직 답 없는 질문 수 */
  escalated: number;
}

const Ctx = createContext<StoreData | null>(null);
export const useStoreData = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error('StoreDataProvider 밖');
  return v;
};

const meKey = (storeId: string) => `yunseul-hq.me.v3.${storeId}`;
const seenKey = (me: string) => `yunseul-hq.seen.v3.${me}`;

function readLocal(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeLocal(key: string, v: string) {
  try {
    localStorage.setItem(key, v);
  } catch {
    /* 저장소를 못 쓰면 이번 화면에서만 기억 */
  }
}
function readSeen(me: string): Set<string> {
  if (!me) return new Set();
  try {
    const a: unknown = JSON.parse(readLocal(seenKey(me)) ?? '[]');
    return new Set(Array.isArray(a) ? a.filter((x): x is string => typeof x === 'string') : []);
  } catch {
    return new Set();
  }
}

export const hasManagerAnswer = (q: Question) => !!q.managerAnswer;

export function StoreDataProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const storeId = matchPath('/store/:id/*', pathname)?.params.id ?? null;
  const { endCount } = useLive();
  const state = useAsync(() => (storeId ? api.state(storeId) : Promise.resolve(null as unknown as StoreState)), [storeId]);
  const { reload } = state;

  // 실행이 끝나면 다시 불러온다(첫 렌더는 건너뜀)
  const [lastEnd, setLastEnd] = useState(endCount);
  useEffect(() => {
    if (endCount === lastEnd) return;
    setLastEnd(endCount);
    if (storeId) void reload();
  }, [endCount, lastEnd, storeId, reload]);

  // SSE로 알 수 없는 변화(점장 답·카드 승인)를 위해 15초마다. 탭이 숨겨져 있으면 건너뛴다
  useEffect(() => {
    if (!storeId) return;
    const t = window.setInterval(() => {
      if (!document.hidden) void reload();
    }, 15000);
    return () => window.clearInterval(t);
  }, [storeId, reload]);

  const staff = useMemo(() => (state.data?.people ?? []).filter((p) => p.role === '신입' || p.role === '숙련'), [state.data]);

  const [savedMe, setSavedMe] = useState('');
  useEffect(() => setSavedMe(storeId ? readLocal(meKey(storeId)) ?? '' : ''), [storeId]);
  const me = staff.some((p) => p.id === savedMe) ? savedMe : '';
  const setMe = useCallback(
    (id: string) => {
      setSavedMe(id);
      if (storeId) writeLocal(meKey(storeId), id);
    },
    [storeId],
  );

  const [seen, setSeen] = useState<Set<string>>(() => new Set());
  useEffect(() => setSeen(readSeen(me)), [me]);
  const markSeen = useCallback(
    (ids: string[]) => {
      if (!me || ids.length === 0) return;
      setSeen((prev) => {
        const next = new Set([...prev, ...ids]);
        writeLocal(seenKey(me), JSON.stringify([...next]));
        return next;
      });
    },
    [me],
  );

  const unseen = useMemo(
    () => (me ? (state.data?.questions ?? []).filter((q) => q.askerId === me && hasManagerAnswer(q) && !seen.has(q.id)) : []),
    [state.data, me, seen],
  );
  const escalated = useMemo(() => (state.data?.questions ?? []).filter((q) => q.status === 'escalated').length, [state.data]);

  const value = useMemo<StoreData>(
    () => ({ storeId, state, staff, me, setMe, unseen, markSeen, escalated }),
    [storeId, state, staff, me, setMe, unseen, markSeen, escalated],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
