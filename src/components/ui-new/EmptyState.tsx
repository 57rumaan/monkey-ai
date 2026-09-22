export function EmptyState({ icon, title, description, action }: { icon?: React.ReactNode; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      {icon && <div className="text-[var(--muted-foreground)] opacity-50 mb-1">{icon}</div>}
      <p className="font-medium text-[var(--foreground)]">{title}</p>
      {description && <p className="text-sm text-[var(--muted-foreground)] max-w-xs">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}