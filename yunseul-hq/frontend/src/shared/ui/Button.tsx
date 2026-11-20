import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2, type LucideIcon } from 'lucide-react';
import { cx } from '../lib/format';

type Variant = 'primary' | 'secondary' | 'ghost';

// 주 버튼은 ink. 빨강 버튼은 없다(빨강 = 고위험)
const V: Record<Variant, string> = {
  primary: 'bg-ink text-white border border-ink hover:bg-ink-hover',
  secondary: 'bg-surface text-ink border border-line-strong hover:bg-ink-weak',
  ghost: 'text-ink border border-transparent hover:bg-ink-weak',
};

/** sm 32px(표 안), md 40px, lg 52px(직원 화면 주요 버튼) */
export function Button({ variant = 'secondary', icon: Icon, busy, size = 'md', className, children, disabled, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  icon?: LucideIcon;
  busy?: boolean;
  size?: 'sm' | 'md' | 'lg';
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={cx(
        'inline-flex items-center justify-center gap-1.5 max-w-full rounded-ctl font-medium disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'min-h-8 px-2.5 py-1 text-caption' : size === 'lg' ? 'min-h-11 px-4 py-2 text-body font-bold' : 'min-h-10 px-3.5 py-1.5 text-body',
        V[variant],
        className,
      )}
    >
      {busy ? <Loader2 size={size === 'lg' ? 18 : 14} className="animate-spin" aria-hidden /> : Icon ? <Icon size={size === 'sm' ? 13 : size === 'lg' ? 18 : 15} aria-hidden /> : null}
      {children}
    </button>
  );
}
