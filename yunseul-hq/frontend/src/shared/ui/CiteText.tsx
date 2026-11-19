// 글 속 카드 번호 [C015]·[B06]를 누를 수 있는 근거 칩으로 바꾼다(관광공사 evidence 칩).
import { Fragment, type MouseEvent } from 'react';
import { cx } from '../lib/format';

const CITE = /\[([A-Z]{1,2}\d{2,4})\]/g;

export function CiteChip({ id, onOpen, active, title }: { id: string; onOpen?: (id: string, el: HTMLElement) => void; active?: boolean; title?: string }) {
  const cls = cx(
    'num mx-0.5 inline-flex min-h-[28px] items-center rounded-badge border px-1.5 align-baseline text-caption',
    active ? 'border-ink bg-ink text-white' : 'border-line-strong bg-yellow-weak text-ink hover:border-ink',
  );
  if (!onOpen) return <span className={cls}>{id}</span>;
  return (
    <button type="button" className={cls} title={title ?? `근거 카드 ${id} 열기`} aria-label={`근거 카드 ${id} 열기`} onClick={(e: MouseEvent<HTMLButtonElement>) => onOpen(id, e.currentTarget)}>
      {id}
    </button>
  );
}

export function CiteText({ text, onOpen, activeId }: { text: string; onOpen?: (id: string, el: HTMLElement) => void; activeId?: string | null }) {
  const parts: (string | { id: string })[] = [];
  let at = 0;
  for (const m of text.matchAll(CITE)) {
    parts.push(text.slice(at, m.index));
    parts.push({ id: m[1] });
    at = (m.index ?? 0) + m[0].length;
  }
  parts.push(text.slice(at));
  return (
    <>
      {parts.map((p, i) => (typeof p === 'string' ? <Fragment key={i}>{p}</Fragment> : <CiteChip key={i} id={p.id} onOpen={onOpen} active={activeId === p.id} />))}
    </>
  );
}
