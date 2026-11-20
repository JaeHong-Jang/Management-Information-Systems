import { useEffect, useRef, useState } from 'react';
import { ChevronDown, LayoutGrid, Store } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import type { NavGroup, NavItem } from './nav';

export function ModuleMenu({ groups, active, scope, isOn }: {
  groups: NavGroup[];
  active?: NavGroup;
  scope: string;
  isOn: (item: NavItem) => boolean;
}) {
  const [open, setOpen] = useState(false);
  const nav = useRef<HTMLElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const { key } = useLocation();
  useEffect(() => setOpen(false), [key]);
  useEffect(() => {
    if (!open) return;
    function dismiss(e: PointerEvent) {
      if (!nav.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        trigger.current?.focus();
      }
    }
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <nav className="module-bar" aria-label="업무 영역" ref={nav}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false); }}>
      <div className="module-index">
        <button ref={trigger} type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="module-directory">
          <LayoutGrid size={16} aria-hidden /> 전체 업무 <ChevronDown size={14} aria-hidden />
        </button>
        {open && (
          <div id="module-directory" className="module-directory">
            {groups.map((group) => (
              <section key={group.group}>
                <h2>{group.group}</h2>
                {group.items.map((item) => <Link key={item.to} to={item.to} aria-current={isOn(item) ? 'page' : undefined} onClick={() => setOpen(false)}>{item.label}</Link>)}
              </section>
            ))}
          </div>
        )}
      </div>
      <div className="module-shortcuts">
        {groups.map((group) => <Link key={group.group} to={group.items[0].to} aria-current={active === group ? 'true' : undefined}>{group.group}</Link>)}
      </div>
      <span className="module-scope"><Store size={14} aria-hidden />{scope}</span>
    </nav>
  );
}
