// 하네스 선언(에이전트 이름)은 거의 바뀌지 않으므로 한 번만 불러와 같이 쓴다
import { useEffect, useState } from 'react';
import type { HarnessConfig } from '@shared/contracts';
import { api } from './client';

let cache: Promise<HarnessConfig> | null = null;

export function loadHarness() {
  if (!cache) cache = api.harness().catch((e) => {
    cache = null;
    throw e;
  });
  return cache;
}

/** 에이전트 id → 한글 이름. 못 불러오면 빈 표(id를 그대로 보여 준다) */
export function useAgentNames(): Record<string, string> {
  const [names, setNames] = useState<Record<string, string>>({});
  useEffect(() => {
    let alive = true;
    loadHarness()
      .then((h) => alive && setNames(Object.fromEntries(h.agents.map((a) => [a.id, a.name]))))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);
  return names;
}
