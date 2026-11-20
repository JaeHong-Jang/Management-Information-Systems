// 주소에 #구역이 있으면 그 구역으로 스크롤한다(사이드바 목록 → 점장 '#situations', 직원 '#ask' 등).
// 데이터가 늦게 그려질 수 있어 최대 1.5초 동안 다시 찾고, 찾은 뒤에도 위쪽 패널이 늦게 커지면 1.5초 동안 위치를 다시 맞춘다.
// 사람이 직접 스크롤·키 입력을 하면 바로 멈춘다. '#ask'처럼 입력창이 있는 구역이면 입력창에 커서를 둔다.
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function useHashScroll() {
  const { hash, key } = useLocation();
  useEffect(() => {
    const id = decodeURIComponent(hash.slice(1));
    if (!id) return;
    const timers: number[] = [];
    let stopped = false;
    const stop = () => {
      stopped = true;
    };
    const events = ['wheel', 'touchstart', 'keydown'] as const;
    events.forEach((e) => window.addEventListener(e, stop, { passive: true }));

    const align = (el: HTMLElement) => {
      if (stopped) return;
      const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
      if (Math.abs(el.getBoundingClientRect().top - margin) > 8) el.scrollIntoView({ block: 'start' });
    };
    let tries = 0;
    const find = () => {
      const el = document.getElementById(id);
      if (!el) {
        if (++tries < 30) timers.push(window.setTimeout(find, 50));
        return;
      }
      el.scrollIntoView({ block: 'start' });
      el.querySelector<HTMLTextAreaElement>('textarea')?.focus({ preventScroll: true });
      for (const ms of [250, 600, 1000, 1500]) timers.push(window.setTimeout(() => align(el), ms));
    };
    find();
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      events.forEach((e) => window.removeEventListener(e, stop));
    };
  }, [hash, key]);
}
