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
      'bg-white dark:bg-surface-900 rounded-xl border border-border-default shadow-elevation-1 overflow-hidden transition-all duration-normal',
      hover && 'hover:shadow-elevation-2 hover:border-border-strong hover:-translate-y-0.5',
      padded && 'p-6',
      className
    )}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('px-6 py-4 border-b border-border-default', className)}>{children}</div>;
}

export function CardContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('p-6', className)}>{children}</div>;
}

export function CardFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('px-6 py-4 border-t border-border-default bg-surface-50 dark:bg-surface-950/50', className)}>{children}</div>;
}
