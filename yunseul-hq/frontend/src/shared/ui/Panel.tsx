import type { ReactNode } from 'react';
import { cx } from '../lib/format';

export function Panel({ title, sub, actions, children, className, bodyClass, id }: {
  title?: ReactNode;
  sub?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClass?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cx('min-w-0 scroll-mt-24 rounded-card border border-line bg-surface shadow-card', className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-2 border-b border-line px-4 py-3.5">
          <div className="min-w-0">
            {title && (
              <h2 className="text-section tracking-tight text-ink">
                {title}
              </h2>
            )}
            {sub && <p className="mt-1 text-body text-text-muted">{sub}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cx('p-4', bodyClass)}>{children}</div>
    </section>
  );
}

export function PageHeader({ title, sub, actions, children }: { title: ReactNode; sub?: ReactNode; actions?: ReactNode; children?: ReactNode }) {
  return (
    <header className="workspace-heading mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-display text-display tracking-tight text-ink">
          {title}
        </h1>
        {sub && <p className="mt-1.5 max-w-[66ch] text-body text-text-muted">{sub}</p>}
        {children}
      </div>
      {actions && <div className="flex max-w-full flex-wrap items-center gap-2">{actions}</div>}
    </header>
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
