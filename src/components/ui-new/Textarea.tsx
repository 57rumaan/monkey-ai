import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && <label className="text-sm font-medium text-[var(--foreground)]">{label}</label>}
        <textarea
          ref={ref}
          className={cn(
            'w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] text-sm p-3 transition-colors focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] resize-none',
            error ? 'border-[var(--error)]' : '',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-[var(--error)]">{error}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';