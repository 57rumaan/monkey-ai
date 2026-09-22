import { cn } from '@/lib/utils';

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement> & { className?: string }) {
  return (
    <div
      className={cn('animate-pulse rounded-lg bg-[var(--color-surface-200)] dark:bg-[var(--color-surface-700)]', className)}
      {...props}
    />
  );
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2.5', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-4 rounded-md" style={{ width: i === lines - 1 ? '60%' : '100%' }} />
      ))}
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-xl border border-[var(--color-border-default)] bg-white dark:bg-[var(--color-surface-900)] p-6 space-y-4', className)}>
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/4 rounded-md" />
          <Skeleton className="h-3 w-1/3 rounded-md" />
        </div>
      </div>
      <SkeletonText lines={3} />
    </div>
  );
}

export function SkeletonChatMessage({ className }: { className?: string }) {
  return (
    <div className={cn('flex gap-3', className)}>
      <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-24 rounded-md" />
          <Skeleton className="h-3 w-16 rounded-md" />
        </div>
        <SkeletonText lines={3} />
      </div>
    </div>
  );
}

export function SkeletonComposer({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-xl border border-[var(--color-border-default)] bg-white dark:bg-[var(--color-surface-900)] p-4', className)}>
      <Skeleton className="h-20 w-full rounded-lg" />
      <div className="flex items-center justify-between mt-4">
        <Skeleton className="h-10 w-24 rounded-lg" />
        <Skeleton className="h-10 w-24 rounded-lg" />
      </div>
    </div>
  );
}
