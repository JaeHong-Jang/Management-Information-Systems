// 원문 인용 형광펜(사회보장 ui.tsx Highlighted). 겹치는 구간은 앞 구간에 포함한다.
import { Fragment, type ReactNode } from 'react';

export interface Range { start: number; end: number }

export function Highlighted({ text, ranges }: { text: string; ranges: Range[] }) {
  const rs = [...ranges].filter((r) => r.end > r.start && r.start >= 0 && r.end <= text.length).sort((a, b) => a.start - b.start);
  const out: ReactNode[] = [];
  let at = 0;
  rs.forEach((r, i) => {
    if (r.start < at) return;
    out.push(<Fragment key={`t${i}`}>{text.slice(at, r.start)}</Fragment>);
    out.push(<mark key={`m${i}`}>{text.slice(r.start, r.end)}</mark>);
    at = r.end;
  });
  out.push(<Fragment key="end">{text.slice(at)}</Fragment>);
  return <>{out}</>;
}

/** 원문 안에서 인용 구절의 위치. 앞뒤 따옴표·말줄임은 떼고 찾는다. 못 찾으면 빈 배열 */
export function locate(text: string, quote: string): Range[] {
  const q = quote.replace(/^[“"'\s]+|[”"'\s…]+$/g, '').replace(/\.\.\.$/, '');
  if (!q) return [];
  let at = text.indexOf(q);
  if (at >= 0) return [{ start: at, end: at + q.length }];
  // 긴 인용은 앞 24자로 다시 찾는다
  const head = q.slice(0, 24);
  at = text.indexOf(head);
  return at >= 0 ? [{ start: at, end: Math.min(text.length, at + q.length) }] : [];
}

/** 짧은 단어 목록이 나오는 구간(불만 유형 근거어). 한 문장에 최대 2곳만 표시한다 */
export function keywordRanges(text: string, words: readonly string[], max = 2): Range[] {
  const out: Range[] = [];
  for (const w of words) {
    const at = text.indexOf(w);
    if (at >= 0) out.push({ start: at, end: at + w.length });
    if (out.length >= max) break;
  }
  return out;
}
