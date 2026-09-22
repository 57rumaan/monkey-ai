import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

type DropdownItem = 
  | { divider: true; label?: never; icon?: never; danger?: never; onClick?: never }
  | { divider?: false; label: string; icon?: React.ReactNode; danger?: boolean; onClick?: () => void };

type DropdownTrigger = React.ReactNode | ((props: { isOpen: boolean; onClick: () => void }) => React.ReactNode);

export function Dropdown({ trigger, items, align = 'left' }: { trigger: DropdownTrigger; items: DropdownItem[]; align?: 'left' | 'right' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => { 
      if (ref.current && !ref.current.contains(e.target as Node) &&
          triggerRef.current && !triggerRef.current.contains(e.target as Node)) setOpen(false); 
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  const toggleOpen = () => setOpen(o => !o);
  const triggerElement = typeof trigger === 'function' ? trigger({ isOpen: open, onClick: toggleOpen }) : trigger;
  return (
    <div className="relative" ref={ref}>
      <div ref={triggerRef} onClick={toggleOpen}>{triggerElement}</div>
      {open && (
        <div className={cn('absolute', align === 'right' ? 'right-0' : 'left-0', 'top-full mt-1 min-w-44 bg-[var(--card)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-lg z-50 py-1 overflow-hidden')}>
          {items.map((item, i) => 'divider' in item && item.divider
            ? <div key={i} className="h-px bg-[var(--border)] my-1" />
            : (
              <button key={i} onClick={() => { item.onClick?.(); setOpen(false); }}
                className={cn('w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors', item.danger ? 'text-[var(--error)] hover:bg-red-500/10' : 'text-[var(--foreground)] hover:bg-[var(--muted)]')}>
                {item.icon && <span className="opacity-70">{item.icon}</span>}
                {item.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}