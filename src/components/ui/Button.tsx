import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'default' | 'lg' | 'icon' | 'icon-sm';
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'default', loading, disabled, children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-fast ease-default rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[var(--color-surface-900)] disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none select-none';

    const variants = {
      primary: 'bg-[var(--color-brand-500)] text-white hover:bg-[var(--color-brand-700)] active:bg-[var(--color-brand-700)] shadow-[var(--shadow-elevation-1)] hover:shadow-[var(--shadow-elevation-2)] active:shadow-[var(--shadow-elevation-1)]',
      secondary: 'bg-white text-[var(--color-content-primary)] border border-[var(--color-border-default)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-50)] active:bg-[var(--color-surface-100)] dark:bg-[var(--color-surface-800)] dark:border-[var(--color-border-default)] dark:hover:border-[var(--color-border-strong)] dark:hover:bg-[var(--color-surface-700)] dark:active:bg-[var(--color-surface-600)] shadow-[var(--shadow-elevation-1)]',
      ghost: 'bg-transparent text-[var(--color-content-secondary)] hover:bg-[var(--color-surface-100)] hover:text-[var(--color-content-primary)] active:bg-[var(--color-surface-200)] dark:hover:bg-[var(--color-surface-800)] dark:hover:text-[var(--color-content-primary)] dark:active:bg-[var(--color-surface-700)]',
      danger: 'bg-[var(--color-state-error)] text-white hover:bg-red-600 active:bg-red-700 shadow-[var(--shadow-elevation-1)] hover:shadow-[var(--shadow-elevation-2)] active:shadow-[var(--shadow-elevation-1)]',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm gap-1.5',
      default: 'px-4 py-2.5 text-sm gap-2',
      lg: 'px-6 py-3 text-base gap-2.5',
      icon: 'p-2.5',
      'icon-sm': 'p-2',
    };

    const spinnerSizes = {
      sm: 'h-3.5 w-3.5',
      default: 'h-4 w-4',
      lg: 'h-5 w-5',
      icon: 'h-4 w-4',
      'icon-sm': 'h-3.5 w-3.5',
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg className={cn('animate-spin', spinnerSizes[size])} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
