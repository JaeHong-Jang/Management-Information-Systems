import type { ReactNode } from 'react';
import { cx } from '../lib/format';

/** 카드: 흰 바탕 + 1px 선, 아주 옅은 그림자 하나 */
export function Panel({ title, sub, en, actions, children, className, bodyClass, id }: {
  title?: ReactNode;
  sub?: ReactNode;
  /** 제목 옆 작은 영문 보조 문구 */
  en?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClass?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cx('min-w-0 scroll-mt-24 rounded-card border border-line bg-surface shadow-card', className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-2 border-b border-line px-4 py-3">
          <div className="min-w-0">
            {title && (
              <h2 className="font-display text-section">
                {title}
                {en && <span className="ml-2 align-middle font-mono text-[0.6875rem] font-medium tracking-[0.12em] text-text-muted">{en}</span>}
              </h2>
            )}
            {sub && <p className="mt-0.5 text-caption text-text-muted">{sub}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cx('p-4', bodyClass)}>{children}</div>
    </section>
  );
}

/** 페이지 머리: Gmarket Sans 제목 + 작은 영문 보조 문구(「전국 현황 · OVERVIEW」) */
export function PageHeader({ title, en, sub, actions, children }: { title: ReactNode; en?: string; sub?: ReactNode; actions?: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-display text-display text-ink">
          {title}
          {en && <span className="ml-2 align-middle font-mono text-[0.75rem] font-medium tracking-[0.14em] text-text-muted">· {en}</span>}
        </h1>
        {sub && <p className="mt-1 max-w-[80ch] text-body text-text-subtle">{sub}</p>}
        {children}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** 접는 상세(근거·원문) */
export function Details({ summary, children, className }: { summary: ReactNode; children: ReactNode; className?: string }) {
  return (
    <details className={cx('group', className)}>
      <summary className="cursor-pointer select-none text-caption text-ink underline-offset-2 hover:underline">{summary}</summary>
      <div className="mt-2">{children}</div>
    </details>
  );
}
