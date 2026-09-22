import { cn } from '@/lib/utils';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'neutral';
  size?: 'xs' | 'sm' | 'default' | 'lg';
  className?: string;
}

export function Badge({ children, variant = 'neutral', size = 'default', className }: BadgeProps) {
  const variants = {
    primary: 'bg-[var(--color-brand-100)] text-[var(--color-brand-800)] dark:bg-[var(--color-brand-900)] dark:text-[var(--color-brand-200)]',
    success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    error: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    neutral: 'bg-[var(--color-surface-100)] text-[var(--color-content-secondary)] dark:bg-[var(--color-surface-800)] dark:text-[var(--color-content-secondary)]',
  };

  const sizes = {
    xs: 'px-1.5 py-0.5 text-[10px]',
    sm: 'px-2 py-0.5 text-xs',
    default: 'px-2.5 py-0.5 text-xs',
    lg: 'px-3 py-1 text-sm',
  };

  return (
    <span className={cn('inline-flex items-center rounded-full font-medium', variants[variant], sizes[size], className)}>
      {children}
    </span>
  );
}