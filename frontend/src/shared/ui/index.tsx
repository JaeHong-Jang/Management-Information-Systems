// 공통 UI. 토스 원칙을 따른다: 한 화면 한 가지 일, 큰 제목, 면의 명도로 계층, 그림자 최소, 해요체, 이모지 없음.
import { createContext, useCallback, useContext, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import type { Card as CardT } from '@shared/contracts';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'moon' | 'glass';
export function Button({ variant = 'primary', size = 'md', loading, className, children, disabled, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' | 'lg'; loading?: boolean }) {
  const v = {
    primary: 'bg-brand text-white hover:bg-brand-strong',
    secondary: 'bg-brand-weak text-brand-strong hover:bg-brand-hover',
    ghost: 'bg-surface-subtle text-ink-body hover:bg-line',
    danger: 'bg-danger-weak text-danger hover:bg-danger-hover',
    // 밤 영역(사이드바·대시보드 첫 카드) 위의 달빛 버튼
    moon: 'bg-night-moon text-night-side hover:bg-white',
    // 밤 영역 위의 보조 버튼(반투명 유리)
    glass: 'bg-white/[0.08] text-night-ink ring-1 ring-inset ring-white/15 hover:bg-white/[0.14]',
  }[variant];
  const s = { sm: 'h-8 px-3 text-[13px] rounded-lg', md: 'h-11 px-4 text-[15px] rounded-xl', lg: 'h-14 px-5 text-[17px] rounded-2xl w-full' }[size];
  return (
    <button className={cx('inline-flex items-center justify-center gap-1.5 font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed', v, s, className)} disabled={disabled || loading} {...rest}>
      {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : null}
      {children}
    </button>
  );
}

export function Panel({ title, action, children, className }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx('rounded-card bg-surface p-5 sm:p-6', className)}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-2">
          {title ? <h2 className="text-[17px] font-bold text-ink-strong">{title}</h2> : <span />}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

type Tone = 'brand' | 'neutral' | 'success' | 'warning' | 'danger' | 'person';
export function Badge({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  const t = {
    brand: 'bg-brand-weak text-brand-strong',
    neutral: 'bg-surface-subtle text-ink-body',
    success: 'bg-success-weak text-success',
    warning: 'bg-warning-weak text-warning',
    danger: 'bg-danger-weak text-danger',
    person: 'bg-person-weak text-person',
  }[tone];
  return <span className={cx('inline-flex items-center rounded-md px-2 py-0.5 text-[12px] font-semibold', t, className)}>{children}</span>;
}

export const sourceTone = (s: string): Tone => (s === '공식규정' ? 'brand' : 'success');

export function PageHeader({ eyebrow, title, desc, action }: { eyebrow?: string; title: string; desc?: ReactNode; action?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="mb-1 text-caption text-brand-strong">{eyebrow}</p>}
        <h1 className="text-title text-ink-strong">{title}</h1>
        {desc && <p className="mt-1.5 max-w-2xl text-body text-ink-body">{desc}</p>}
      </div>
      {action}
    </header>
  );
}

/** 숫자 하나를 크게 보여 주는 타일 */
export function Stat({ label, value, unit, note, tone }: { label: string; value: ReactNode; unit?: string; note?: ReactNode; tone?: 'warning' | 'success' | 'brand' }) {
  const c = tone === 'warning' ? 'text-warning' : tone === 'success' ? 'text-success' : tone === 'brand' ? 'text-brand-strong' : 'text-ink-strong';
  return (
    <div className="rounded-card bg-surface p-5">
      <p className="text-[14px] font-medium text-ink-weak">{label}</p>
      <p className={cx('mt-2 text-[30px] font-bold leading-9 tracking-tight', c)}>
        {value}
        {unit && <span className="ml-0.5 text-[17px] font-semibold text-ink-weak">{unit}</span>}
      </p>
      {note && <p className="mt-1.5 text-[13px] text-ink-weak">{note}</p>}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-xl bg-surface-subtle px-4 py-8 text-center text-[14px] text-ink-weak">{children}</div>;
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-semibold text-ink-body">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[12px] text-ink-weak">{hint}</span>}
    </label>
  );
}

export const inputCls = 'w-full rounded-xl border border-line bg-surface px-3.5 py-3 text-[15px] text-ink-strong outline-none placeholder:text-ink-disabled focus:border-brand focus:ring-2 focus:ring-brand-weak';

/** 답 안의 [C001] 표시를 눌러 볼 수 있는 칩으로 바꾼다. */
export function CiteText({ text, onCite }: { text: string; onCite?: (id: string) => void }) {
  return (
    <>
      {text.split('\n').map((line, i) => (
        <p key={i} className="my-0.5">
          {line.split(/(\[C\d{3,}\])/).map((part, j) => {
            const m = part.match(/^\[(C\d{3,})\]$/);
            return m ? (
              <button key={j} onClick={() => onCite?.(m[1])} className="mx-0.5 rounded bg-brand-weak px-1.5 py-px align-baseline text-[12px] font-semibold text-brand-strong hover:bg-brand-hover">
                {m[1]}
              </button>
            ) : (
              <span key={j}>{part}</span>
            );
          })}
        </p>
      ))}
    </>
  );
}

export function CardDetail({ card, authorName }: { card: CardT; authorName?: string }) {
  const row = (k: string, v: ReactNode) =>
    v ? (
      <div className="grid grid-cols-[92px_1fr] gap-3 py-2">
        <dt className="text-[13px] text-ink-weak">{k}</dt>
        <dd className="text-[14px] text-ink-strong">{v}</dd>
      </div>
    ) : null;
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <Badge tone="neutral">{card.id}</Badge>
        <Badge tone={sourceTone(card.source)}>{card.source}</Badge>
        {card.source === '공식규정' && !card.ruleRef && <Badge tone="warning">규정 원문 미첨부</Badge>}
        <Badge>{card.topic}</Badge>
        {card.status !== 'approved' && <Badge tone="warning">{card.status === 'pending' ? '승인 대기' : card.status}</Badge>}
      </div>
      <h3 className="text-sub text-ink-strong">{card.title}</h3>
      <dl className="mt-2 divide-y divide-line">
        {row('상황', card.situation)}
        {row('판단 이유', <span className="font-medium">{card.reason || <span className="text-danger">비어 있어요</span>}</span>)}
        {row(
          '대응',
          <ol className="list-decimal pl-4">
            {card.actions.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ol>,
        )}
        {row('하면 안 되는 것', card.avoid)}
        {row('점장 호출 기준', card.escalateWhen)}
        {row('남긴 사람', card.credit === false ? '이름 비공개' : authorName)}
        {row('보관 사유', card.archiveReason)}
        {row('재사용', `${card.uses}회 · 도움 ${card.helpful} · 안 됨 ${card.notHelpful} · 만료 ${card.expires}`)}
      </dl>
    </div>
  );
}

/** 아래에서 올라오는 시트. 카드 상세 등. */
export function Sheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 sm:items-center" onClick={onClose}>
      <div className="animate-rise max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-surface p-6 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        {children}
        <Button variant="ghost" size="lg" className="mt-5" onClick={onClose}>
          닫기
        </Button>
      </div>
    </div>
  );
}

// ---------- 토스트 ----------

const ToastCtx = createContext<(msg: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  const show = useCallback((m: string) => {
    setMsg(m);
    window.setTimeout(() => setMsg((cur) => (cur === m ? null : cur)), 2400);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {msg && <div className="animate-rise fixed bottom-24 left-1/2 z-[60] -translate-x-1/2 rounded-xl bg-ink-strong px-4 py-3 text-[14px] font-medium text-white sm:bottom-8">{msg}</div>}
    </ToastCtx.Provider>
  );
}

/** '2026-10-30T15:12:00' → '10월 30일 15:12' */
export function fmtTime(t: string): string {
  const m = t.match(/^\d{4}-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
  if (!m) return t;
  return `${Number(m[1])}월 ${Number(m[2])}일${m[3] ? ` ${m[3]}:${m[4]}` : ''}`;
}

export { cx };
