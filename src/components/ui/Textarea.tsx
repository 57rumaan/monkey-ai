import { forwardRef, type TextareaHTMLAttributes, useId } from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  size?: 'sm' | 'default' | 'lg';
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
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
          <label htmlFor={id} className="block text-body-sm font-medium text-content-primary mb-1.5">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={id}
          className={cn(
            'w-full rounded-lg border bg-white text-content-primary placeholder:text-content-tertiary transition-all duration-fast resize-y min-h-[80px]',
            'hover:border-border-strong',
            'focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 focus:outline-none',
            'disabled:bg-surface-100 disabled:text-content-disabled disabled:cursor-not-allowed',
            'dark:bg-surface-900 dark:border-border-default dark:hover:border-border-strong dark:focus:border-brand-400 dark:focus:ring-brand-400/15',
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
          <p id={hintId} className="mt-1.5 text-body-sm text-content-tertiary">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
