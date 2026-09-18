import { forwardRef, type SelectHTMLAttributes, useId } from 'react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  error?: string;
  hint?: string;
  options: SelectOption[];
  placeholder?: string;
  size?: 'sm' | 'default' | 'lg';
  onValueChange?: (value: string) => void;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, hint, options, placeholder, size = 'default', id: providedId, onValueChange, onChange, ...props }, ref) => {
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
          <label htmlFor={id} className="block text-body-sm font-medium text-content-secondary mb-1.5">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={id}
          className={cn(
            'w-full rounded-lg border bg-white text-content-primary transition-colors duration-fast appearance-none',
            'hover:border-border-strong',
            'focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none',
            'disabled:bg-surface-100 disabled:text-content-disabled disabled:cursor-not-allowed',
            'dark:bg-surface-900 dark:border-border-default dark:hover:border-border-strong dark:focus:border-brand-400',
            sizes[size],
            error && 'border-state-error focus:border-state-error focus:ring-state-error/20',
            className
          )}
          onChange={e => { onChange?.(e); onValueChange?.(e.target.value); }}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map(option => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
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

Select.displayName = 'Select';