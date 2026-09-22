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
            'mt-0.5 h-4 w-4 shrink-0 rounded border-[var(--color-border-default)] text-[var(--color-brand-500)]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] focus-visible:ring-offset-2',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'dark:bg-[var(--color-surface-800)] dark:border-[var(--color-border-default)] dark:focus:ring-[var(--color-brand-500)]'
          )}
          aria-invalid={error ? 'true' : 'false'}
        />
        <div className="flex flex-col">
          <span className={cn('text-sm font-medium', disabled ? 'text-[var(--color-content-disabled)]' : 'text-[var(--color-content-primary)]')}>
            {label}
          </span>
          {description && (
            <span className="text-sm text-[var(--color-content-tertiary)]">{description}</span>
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