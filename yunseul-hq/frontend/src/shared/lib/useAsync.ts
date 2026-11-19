// 화면 데이터 불러오기: 로딩·오류·다시 불러오기를 한 모양으로 다룬다.
import { useCallback, useEffect, useRef, useState } from 'react';

export interface AsyncState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => Promise<void>;
  setData: (fn: (prev: T | null) => T | null) => void;
}

export function useAsync<T>(load: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [data, setDataState] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const seq = useRef(0);
  const loader = useRef(load);
  loader.current = load;

  const reload = useCallback(async () => {
    const n = ++seq.current;
    setLoading(true);
    try {
      const v = await loader.current();
      if (n === seq.current) {
        setDataState(v);
        setError(null);
      }
    } catch (e) {
      if (n === seq.current) setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (n === seq.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    setDataState(null);
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const setData = useCallback((fn: (prev: T | null) => T | null) => setDataState(fn), []);
  return { data, error, loading, reload, setData };
}

/** 버튼 행동(POST) 하나의 진행·오류 상태 */
export function useAction() {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const run = useCallback(async <T,>(key: string, fn: () => Promise<T>): Promise<T | null> => {
    setBusy(key);
    setError(null);
    try {
      return await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return null;
    } finally {
      setBusy(null);
    }
  }, []);
  return { busy, error, run, clearError: () => setError(null) };
}
