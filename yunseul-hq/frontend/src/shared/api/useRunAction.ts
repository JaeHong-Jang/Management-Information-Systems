// RunAccepted를 돌려주는 POST(진단·처방·개정 제안)를 시작하고, 끝날 때까지 따라간 뒤 onDone을 부른다
import { useCallback, useState } from 'react';
import type { RunAccepted } from '@shared/contracts';
import { useRunFollow, type RunView } from './live';

export function useRunAction(onDone: (run: RunView) => void) {
  const [runId, setRunId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const run = useRunFollow(runId, onDone);

  const start = useCallback(async (fn: () => Promise<RunAccepted>) => {
    setError(null);
    setStarting(true);
    try {
      const r = await fn();
      setRunId(r.runId);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setStarting(false);
    }
  }, []);

  const active = starting || (runId !== null && !run?.done);
  return { start, run, runId, active, error, clear: () => setRunId(null) };
}
