import { forwardRef, type InputHTMLAttributes, useId } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  hint?: string;
  size?: 'sm' | 'default' | 'lg';
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, size = 'default', id: providedId, ...props }, ref) => {
    const generatedId = useId();
    const id = providedId || generatedId;
    const errorId = `${id}-error`;
    const hintId = `${id}-hint`;

    const sizes = {
      sm: 'px-3 py-2 text-body-sm',
      default: 'px-4 py-2.5 text-body',
      lg: 'px-4 py-3 text-body-lg',
    };

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-[var(--color-content-primary)] mb-1.5">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            'w-full rounded-lg border bg-white text-[var(--color-content-primary)] placeholder:text-[var(--color-content-tertiary)] transition-all duration-fast',
            'hover:border-[var(--color-border-strong)]',
            'focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-500)]/10 focus:outline-none',
            'disabled:bg-[var(--color-surface-100)] disabled:text-[var(--color-content-disabled)] disabled:cursor-not-allowed',
            'dark:bg-[var(--color-surface-900)] dark:border-[var(--color-border-default)] dark:hover:border-[var(--color-border-strong)] dark:focus:border-[var(--color-brand-500)] dark:focus:ring-[var(--color-brand-500)]/15',
            sizes[size],
            error && 'border-state-error focus:border-state-error focus:ring-state-error/10',
            className
          )}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          {...props}
        />
        {error && (
          <p id={errorId} className="mt-1.5 text-body-sm text-state-error" role="alert">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={hintId} className="mt-1.5 text-sm text-[var(--color-content-tertiary)]">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
