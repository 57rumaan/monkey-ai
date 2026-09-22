import { cn } from '@/lib/utils';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  padded?: boolean;
}

export function Card({ children, className, hover, padded }: CardProps) {
  return (
    <div className={cn(
      'bg-white dark:bg-[var(--color-surface-900)] rounded-xl border border-[var(--color-border-default)] shadow-[var(--shadow-elevation-1)] overflow-hidden transition-all duration-normal',
      hover && 'hover:shadow-[var(--shadow-elevation-2)] hover:border-[var(--color-border-strong)] hover:-translate-y-0.5',
      padded && 'p-6',
      className
    )}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('px-6 py-5 border-b border-[var(--color-border-default)]', className)}>{children}</div>;
}

export function CardContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('p-6', className)}>{children}</div>;
}

export function CardFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('px-6 py-4 border-t border-[var(--color-border-default)] bg-[var(--color-surface-50)]/50 dark:bg-[var(--color-surface-950)]/30', className)}>{children}</div>;
}
