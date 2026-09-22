import { cn } from '@/lib/utils';

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={cn('bg-[var(--muted)] rounded animate-pulse', className)} />;
}