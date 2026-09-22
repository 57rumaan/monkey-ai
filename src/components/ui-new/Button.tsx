import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  danger?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, icon, children, className = '', disabled, danger, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-[var(--radius)] transition-all duration-150 cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2';
    const variants: Record<ButtonVariant, string> = {
      primary: 'bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 active:scale-[0.98]',
      secondary: 'bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:bg-[var(--border)] active:scale-[0.98]',
      ghost: 'bg-transparent text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] active:scale-[0.98]',
      danger: 'bg-[var(--error)] text-white hover:opacity-90 active:scale-[0.98]',
      outline: 'border border-[var(--border)] bg-transparent text-[var(--foreground)] hover:bg-[var(--muted)] active:scale-[0.98]',
    };
    const sizes: Record<ButtonSize, string> = {
      xs: 'h-6 px-2 text-xs',
      sm: 'h-8 px-3 text-sm',
      md: 'h-9 px-4 text-sm',
      lg: 'h-11 px-5 text-base',
      icon: 'h-9 w-9 p-0',
      'icon-sm': 'h-7 w-7 p-0',
    };
    const effectiveVariant = danger ? 'danger' : variant;
    return (
      <button
        ref={ref}
        className={cn(base, variants[effectiveVariant], sizes[size], className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Spinner size={size === 'lg' ? 18 : 15} />}
        {icon && !loading}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

function Spinner({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="animate-spin" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}