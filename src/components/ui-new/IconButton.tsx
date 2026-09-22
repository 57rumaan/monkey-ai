import { type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: 'sm' | 'md' | 'lg';
  active?: boolean;
  danger?: boolean;
  tooltip?: string;
  children: React.ReactNode;
}

export function IconButton({ size = 'md', active, danger, tooltip, children, className = '', ...props }: IconButtonProps) {
  const sizes = { sm: 'w-7 h-7', md: 'w-8 h-8', lg: 'w-9 h-9' };
  const activeClass = active
    ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
    : danger
    ? 'hover:bg-red-500/10 hover:text-[var(--error)] text-[var(--muted-foreground)]'
    : 'hover:bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]';
  return (
    <button
      title={tooltip}
      className={cn(
        'inline-flex items-center justify-center rounded-[var(--radius-sm)] transition-all duration-150 cursor-pointer disabled:opacity-50',
        sizes[size],
        activeClass,
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}