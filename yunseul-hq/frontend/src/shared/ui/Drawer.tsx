import { useLayoutEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export function Drawer({ open, onClose, title, eyebrow, actions, children, width = 'max-w-[540px]' }: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  width?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useLayoutEffect(() => {
    const element = dialog.current;
    if (!open || !element) return;
    const trigger = document.activeElement;
    element.showModal();
    closeButton.current?.focus({ preventScroll: true });
    return () => {
      element.close();
      requestAnimationFrame(() => {
        const activeModal = document.querySelector('dialog:modal');
        if (trigger instanceof HTMLElement && trigger.isConnected && !element.open &&
            (!activeModal || activeModal.contains(trigger))) trigger.focus({ preventScroll: true });
      });
    };
  }, [open]);

  if (!open) return null;
  return createPortal(
    <dialog ref={dialog} className="workspace-dialog" aria-labelledby={titleId}
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <aside className={`workspace-drawer ${width}`}>
        <header className="flex shrink-0 items-start gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0 flex-1">
            {eyebrow && <div className="mb-1 text-caption text-text-muted">{eyebrow}</div>}
            <h2 id={titleId} className="text-title tracking-tight text-ink">{title}</h2>
          </div>
          {actions}
          <button ref={closeButton} type="button" onClick={onClose} aria-label="닫기" className="grid h-10 w-10 shrink-0 place-items-center rounded-ctl border border-line text-ink hover:bg-ink-weak">
            <X size={18} aria-hidden />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5">{children}</div>
      </aside>
    </dialog>,
    document.body,
  );
}

export function DrawerSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-5 border-b border-line pb-5 last:mb-0 last:border-0 last:pb-0">
      <h3 className="mb-2 text-subhead text-ink">{title}</h3>
      {children}
    </section>
  );
}
