import { cn } from '@/lib/utils';
import { getInitials } from '@/lib/utils';

interface AvatarProps {
  name: string;
  src?: string;
  size?: 'xs' | 'sm' | 'default' | 'lg' | 'xl';
  className?: string;
  fallbackColor?: string;
}

const sizes = {
  xs: 'h-6 w-6 text-xs',
  sm: 'h-8 w-8 text-body-sm',
  default: 'h-10 w-10 text-body',
  lg: 'h-12 w-12 text-body-lg',
  xl: 'h-16 w-16 text-heading-lg',
};

const colors = [
  'bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-300',
  'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300',
  'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300',
  'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300',
];

function getColorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function Avatar({ name, src, size = 'default', className, fallbackColor }: AvatarProps) {
  const initials = getInitials(name);
  const color = fallbackColor || getColorFromName(name);

  return (
    <div
      className={cn(
        'relative inline-flex items-center justify-center rounded-full overflow-hidden font-medium select-none',
        sizes[size],
        className
      )}
      aria-label={name}
    >
      {src ? (
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        <div className={cn('h-full w-full flex items-center justify-center', color)}>
          {initials}
        </div>
      )}
    </div>
  );
}