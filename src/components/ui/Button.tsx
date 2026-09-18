import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'default' | 'lg' | 'icon' | 'icon-sm';
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'default', loading, disabled, children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-fast ease-default rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-surface-900 disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none select-none';

    const variants = {
      primary: 'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 shadow-elevation-1 hover:shadow-elevation-2 active:shadow-elevation-1',
      secondary: 'bg-white text-content-primary border border-border-default hover:bg-surface-50 active:bg-surface-100 dark:bg-surface-800 dark:border-border-default dark:hover:bg-surface-700 dark:active:bg-surface-600',
      ghost: 'bg-transparent text-content-secondary hover:bg-surface-100 active:bg-surface-200 dark:hover:bg-surface-800 dark:active:bg-surface-700',
      danger: 'bg-state-error text-white hover:bg-red-600 active:bg-red-700 shadow-elevation-1 hover:shadow-elevation-2 active:shadow-elevation-1',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-body-sm gap-1.5',
      default: 'px-4 py-2.5 text-body gap-2',
      lg: 'px-6 py-3 text-body-lg gap-2.5',
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
