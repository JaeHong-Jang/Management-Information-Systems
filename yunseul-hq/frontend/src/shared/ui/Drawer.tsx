// 오른쪽 서랍: masdae ClaimDrawer 틀 + 관광공사 team-board 포커스 트랩.
// 열리면 닫기 버튼으로 초점을 옮기고 Tab을 서랍 안에 가둔다. Escape·바깥 누르기로 닫고, 연 요소로 초점을 돌려준다.
import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const FOCUSABLE = 'a[href], button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), summary, [tabindex]:not([tabindex="-1"])';

export function Drawer({ open, onClose, title, eyebrow, actions, children, width = 'max-w-[480px]' }: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  width?: string;
}) {
  const panel = useRef<HTMLElement>(null);
  const origin = useRef<HTMLElement | null>(null);
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    if (!open) return;
    origin.current = document.activeElement as HTMLElement | null;
    const raf = requestAnimationFrame(() => panel.current?.querySelector<HTMLElement>('[data-drawer-close]')?.focus());
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close.current();
      } else if (e.key === 'Tab' && panel.current) {
        const items = Array.from(panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
        const first = items[0];
        const last = items.at(-1);
        if (!first || !last) return;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      // 읽던 곳으로 돌아간다
      const o = origin.current;
      if (o && document.contains(o)) requestAnimationFrame(() => o.focus());
    };
  }, [open]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
      <div className="absolute inset-0 bg-[rgba(35,24,21,0.42)]" onClick={onClose} aria-hidden />
      <aside ref={panel} className={`absolute inset-y-0 right-0 flex w-full ${width} animate-rise flex-col bg-surface shadow-pop`}>
        <div className="h-1 bg-ink" aria-hidden />
        <header className="flex items-start gap-3 border-b border-line p-4">
          <div className="min-w-0 flex-1">
            {eyebrow && <div className="text-caption text-text-muted">{eyebrow}</div>}
            <h2 id="drawer-title" className="font-display text-title text-ink">{title}</h2>
          </div>
          {actions}
          <button data-drawer-close type="button" onClick={onClose} aria-label="닫기" className="grid h-11 w-11 shrink-0 place-items-center rounded-ctl border border-line-strong text-ink hover:bg-ink-weak">
            <X size={18} aria-hidden />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </aside>
    </div>,
    document.body,
  );
}

/** 서랍 안 번호 매긴 절: 원문 → 근거 → 조치 (누리지킴이 FindingDetailSheet 순서) */
export function DrawerSection({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="mb-5 last:mb-0">
      <h3 className="mb-2 flex items-center gap-2 text-caption font-bold text-text-subtle">
        <span className="num grid h-5 w-5 place-items-center rounded-full bg-ink text-[0.6875rem] text-white">{n}</span>
        {title}
      </h3>
      {children}
    </section>
  );
}
