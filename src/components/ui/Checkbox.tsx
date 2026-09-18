import { forwardRef, type LabelHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface CheckboxProps extends Omit<LabelHTMLAttributes<HTMLLabelElement>, 'onChange'> {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
  error?: string;
}

export const Checkbox = forwardRef<HTMLLabelElement, CheckboxProps>(
  ({ className, checked, onChange, disabled, label, description, error, children, ...props }, ref) => {
    const inputId = `checkbox-${Math.random().toString(36).slice(2, 9)}`;

    return (
      <label
        ref={ref}
        className={cn('flex items-start gap-3 cursor-pointer select-none', className)}
        {...props}
      >
        <input
          type="checkbox"
          id={inputId}
          checked={checked}
          onChange={e => onChange?.(e.target.checked)}
          disabled={disabled}
          className={cn(
            'mt-0.5 h-4 w-4 shrink-0 rounded border-border-default text-brand-600',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'dark:bg-surface-800 dark:border-border-default dark:focus:ring-brand-400'
          )}
          aria-invalid={error ? 'true' : 'false'}
        />
        <div className="flex flex-col">
          <span className={cn('text-body font-medium', disabled ? 'text-content-disabled' : 'text-content-primary')}>
            {label}
          </span>
          {description && (
            <span className="text-body-sm text-content-tertiary">{description}</span>
          )}
          {error && (
            <span className="text-body-sm text-state-error" role="alert">{error}</span>
          )}
        </div>
        {children}
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox';