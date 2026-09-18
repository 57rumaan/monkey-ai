import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface RadioGroupProps {
  name: string;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  options: { value: string; label: string; description?: string; disabled?: boolean }[];
  error?: string;
  label?: string;
  className?: string;
}

export const RadioGroup = forwardRef<HTMLDivElement, RadioGroupProps>(
  ({ name, value, onChange, disabled, options, error, label, className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('space-y-2', className)} {...props} role="radiogroup" aria-label={label} aria-invalid={error ? 'true' : 'false'}>
        {label && (
          <span className="block text-body-sm font-medium text-content-secondary mb-1.5">{label}</span>
        )}
        {options.map(option => (
          <label
            key={option.value}
            className={cn(
              'flex items-start gap-3 cursor-pointer select-none',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => !disabled && !option.disabled && onChange?.(option.value)}
              disabled={disabled || option.disabled}
              className={cn(
                'mt-0.5 h-4 w-4 shrink-0 border-border-default text-brand-600',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'dark:bg-surface-800 dark:border-border-default dark:focus:ring-brand-400'
              )}
            />
            <div className="flex flex-col">
              <span className={cn('text-body font-medium', disabled || option.disabled ? 'text-content-disabled' : 'text-content-primary')}>
                {option.label}
              </span>
              {option.description && (
                <span className="text-body-sm text-content-tertiary">{option.description}</span>
              )}
            </div>
          </label>
        ))}
        {error && <p className="text-body-sm text-state-error" role="alert">{error}</p>}
      </div>
    );
  }
);

RadioGroup.displayName = 'RadioGroup';