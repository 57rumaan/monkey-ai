import { cn } from '@/lib/utils';

export function Avatar({ name, src, size = 'md', className = '' }: { name?: string; src?: string; size?: 'xs' | 'sm' | 'md' | 'lg'; className?: string }) {
  const sizes = { xs: 'w-6 h-6 text-xs', sm: 'w-7 h-7 text-xs', md: 'w-8 h-8 text-sm', lg: 'w-10 h-10 text-base' };
  const initials = name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?';
  if (src) return <img src={src} alt={name} className={cn(sizes[size], 'rounded-full object-cover', className)} />;
  return (
    <div className={cn(sizes[size], 'rounded-full bg-[var(--primary)] text-white font-medium flex items-center justify-center flex-shrink-0', className)}>
      {initials}
    </div>
  );
}