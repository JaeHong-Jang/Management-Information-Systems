// 'N초 경과'를 다시 그리기 위한 시계(금융 LiveExecutionPanel useNow).
// 상태를 만들어 내는 타이머가 아니다: 누가 도는지는 서버 이벤트만 정하고, 여기서는 지금 시각만 준다.
import { useEffect, useState } from 'react';

export function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [active]);
  return now;
}

/** 시작 시각(ISO)부터 지금까지 초. 시계가 어긋나 음수가 되면 0 */
export function elapsedSec(since: string | null | undefined, now: number): number | null {
  if (!since) return null;
  const t = Date.parse(since);
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.round((now - t) / 1000));
}
