import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-sticky lg:hidden transition-opacity duration-300"
            onClick={onClose}
            aria-hidden="true"
          />
        )}
        <aside
          ref={ref}
          className={cn(
            'fixed inset-y-0 left-0 z-sticky w-72 flex flex-col',
            'bg-white dark:bg-surface-900',
            'border-r border-border-default',
            'shadow-xl lg:shadow-none',
            'transition-transform duration-300 ease-out lg:translate-x-0',
            isOpen ? 'translate-x-0' : '-translate-x-full',
            className
          )}
          role="navigation"
          aria-label="Main navigation"
        >
          <div className="flex items-center justify-between h-16 px-5 border-b border-border-default bg-white/80 dark:bg-surface-900/80 backdrop-blur-md">
            <h1 className="text-heading-lg font-bold bg-gradient-to-r from-brand-600 to-brand-500 bg-clip-text text-transparent">
              MONKEY AI
            </h1>
            <button
              className="lg:hidden p-2 rounded-lg text-content-tertiary hover:text-content-primary hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors duration-fast"
              onClick={onClose}
              aria-label="Close sidebar"
            >
              <ChevronRight className="h-5 w-5 rotate-180" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin">
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
    <div className={cn('space-y-1', className)}>
      {title && (
        <h3 className="px-3 pt-1 pb-2 text-[11px] font-semibold text-content-tertiary uppercase tracking-wider">
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
    <div className={cn('space-y-1', className)}>
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
        'group flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-[13px] font-medium',
        'transition-all duration-fast',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
        active
          ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300 shadow-sm shadow-brand-500/10'
          : 'text-content-secondary hover:bg-surface-50 hover:text-content-primary dark:hover:bg-surface-800/50',
        disabled && 'opacity-40 cursor-not-allowed pointer-events-none',
        className
      )}
    >
      {icon && (
        <span className={cn(
          'h-5 w-5 flex-shrink-0 transition-colors duration-fast',
          active ? 'text-brand-600 dark:text-brand-400' : 'text-content-tertiary group-hover:text-content-secondary'
        )}>
          {icon}
        </span>
      )}
      <span className="flex-1 truncate text-left">{label}</span>
      {badge && <span className="flex-shrink-0">{badge}</span>}
    </button>
  );
}
