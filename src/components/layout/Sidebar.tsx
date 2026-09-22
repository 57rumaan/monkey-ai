import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { X, ChevronLeft, ChevronRight, ChevronDown, Plus, Search, MessageSquare, Star, Folder, Settings, LogOut, User, Trash2, LayoutDashboard, Cpu, Box, Layers, Users, BarChart3, Shield, LayoutList } from 'lucide-react';

export interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

export const Sidebar = forwardRef<HTMLDivElement, SidebarProps>(
  ({ isOpen, onClose, children, className }, ref) => {
    return (
      <>
        {isOpen && (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
            onClick={onClose}
            aria-hidden="true"
          />
        )}
        <aside
          ref={ref}
          className={cn(
            'fixed inset-y-0 left-0 z-50 w-64 flex flex-col',
            'bg-white dark:bg-[var(--color-surface-950)]',
            'border-r border-[var(--color-border-default)]',
            'transition-transform duration-300 ease-in-out lg:translate-x-0 lg:relative lg:z-auto',
            isOpen ? 'translate-x-0' : '-translate-x-full',
            className
          )}
          role="navigation"
          aria-label="Main navigation"
        >
          <div className="flex items-center justify-between px-3 py-4 border-b border-[var(--color-border-default)]">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[var(--color-brand-500)] flex items-center justify-center">
                <span className="text-white text-sm font-bold">O</span>
              </div>
              <h1 className="text-base font-semibold text-[var(--color-content-primary)]" style={{ fontFamily: 'Instrument Serif, serif' }}>
                Octix
              </h1>
            </div>
            <button
              className="lg:hidden p-1.5 rounded-[var(--radius)] text-[var(--color-content-tertiary)] hover:text-[var(--color-content-primary)] hover:bg-[var(--color-surface-100)] dark:hover:bg-[var(--color-surface-800)] transition-colors"
              onClick={onClose}
              aria-label="Close sidebar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2.5 space-y-1">
            {children}
          </div>
        </aside>
      </>
    );
  }
);

Sidebar.displayName = 'Sidebar';

export function SidebarSection({ title, children, className }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('space-y-0.5', className)}>
      {title && (
        <h3 className="px-2.5 py-1.5 text-[11px] font-semibold text-[var(--color-content-tertiary)] uppercase tracking-wider">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}

export function SidebarItem({
  children,
  className,
}: React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode; badge?: React.ReactNode; active?: boolean }) {
  return (
    <div className={cn('space-y-0.5', className)}>
      {children}
    </div>
  );
}

export function SidebarNavItem({
  label,
  icon,
  active,
  onClick,
  badge,
  disabled,
  className,
}: {
  label: string;
  icon?: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  badge?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'group flex items-center gap-2.5 w-full px-2.5 py-2 rounded-[var(--radius)] text-sm',
        'transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] focus-visible:ring-offset-2',
        active
          ? 'bg-[var(--color-brand-500)]/10 text-[var(--color-brand-600)] dark:text-[var(--color-brand-400)] font-medium'
          : 'text-[var(--color-content-secondary)] hover:bg-[var(--color-surface-100)] hover:text-[var(--color-content-primary)] dark:hover:bg-[var(--color-surface-800)]',
        disabled && 'opacity-40 cursor-not-allowed pointer-events-none',
        className
      )}
    >
      {icon && (
        <span className={cn(
          'h-4 w-4 flex-shrink-0 transition-colors duration-150',
          active ? 'text-[var(--color-brand-600)] dark:text-[var(--color-brand-400)]' : 'text-[var(--color-content-tertiary)] group-hover:text-[var(--color-content-secondary)]'
        )}>
          {icon}
        </span>
      )}
      <span className="flex-1 truncate text-left">{label}</span>
      {badge && <span className="flex-shrink-0">{badge}</span>}
    </button>
  );
}

export {
  ChevronLeft, ChevronRight, ChevronDown, Plus, Search, MessageSquare, Star, Folder,
  Settings, LogOut, User, Trash2, LayoutDashboard, Cpu, Box, Layers, Users, BarChart3,
  Shield, LayoutList
};
