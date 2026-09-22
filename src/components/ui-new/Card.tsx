import { cn } from '@/lib/utils';

export function Card({ children, className = '', onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div
      className={cn(
        'bg-[var(--card)] border border-[var(--border)] rounded-[var(--radius-lg)]',
        onClick ? 'cursor-pointer hover:border-[var(--primary)]/40 hover:shadow-sm transition-all' : '',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}