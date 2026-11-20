// 심사 모드(cotutor present.tsx): html.present 클래스 하나로 글자 확대·개발 정보(runId·ms) 숨김.
// 켜는 법: URL ?present=1(끄기 ?present=0) 또는 상단바 토글. 브라우저에 남는다. 기본은 꺼짐.
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

const KEY = 'yunseul-hq.present';
const Ctx = createContext<{ present: boolean; toggle: () => void }>({ present: false, toggle: () => undefined });
export const usePresent = () => useContext(Ctx);

function initial() {
  const q = new URLSearchParams(location.search).get('present');
  if (q === '1' || q === '0') {
    try {
      localStorage.setItem(KEY, q);
    } catch {
      /* 저장 불가 */
    }
    return q === '1';
  }
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function PresentProvider({ children }: { children: ReactNode }) {
  const [present, setPresent] = useState(initial);
  useEffect(() => {
    document.documentElement.classList.toggle('present', present);
    try {
      localStorage.setItem(KEY, present ? '1' : '0');
    } catch {
      /* 저장 불가 */
    }
  }, [present]);
  const toggle = useCallback(() => setPresent((p) => !p), []);
  return <Ctx.Provider value={{ present, toggle }}>{children}</Ctx.Provider>;
}
