import { forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Menu, Sun, Moon, LogOut, Settings, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Dropdown, DropdownItem, DropdownDivider } from '@/components/ui/Dropdown';
import { Avatar } from '@/components/ui/Avatar';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';

export interface HeaderProps {
  onMenuClick?: () => void;
  className?: string;
}

export const Header = forwardRef<HTMLElement, HeaderProps>(
  ({ onMenuClick, className }, ref) => {
    const { user, logout } = useAuth();
    const { theme, setTheme } = useTheme();
    const navigate = useNavigate();

    return (
      <header
        ref={ref}
        className={cn(
          'sticky top-0 z-sticky h-14 flex items-center px-4 lg:px-6',
          'bg-white/80 dark:bg-[var(--color-surface-950)]/80 backdrop-blur-xl',
          'border-b border-[var(--color-border-default)]',
          className
        )}
        role="banner"
      >
        <button
          type="button"
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-2 rounded-[var(--radius)] text-[var(--color-content-secondary)] hover:text-[var(--color-content-primary)] hover:bg-[var(--color-surface-100)] dark:hover:bg-[var(--color-surface-800)] transition-colors"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex-1" />

        <div className="flex items-center gap-1">
          <div className="flex items-center gap-0.5 border border-[var(--color-border-default)] rounded-[var(--radius)] p-0.5">
            {([
              { value: 'light', icon: <Sun className="h-3.5 w-3.5" /> },
              { value: 'dark', icon: <Moon className="h-3.5 w-3.5" /> },
            ] as const).map(t => (
              <button
                key={t.value}
                onClick={() => setTheme(t.value)}
                title={t.value.charAt(0).toUpperCase() + t.value.slice(1)}
                className={cn(
                  'w-7 h-6 flex items-center justify-center rounded transition-colors',
                  theme === t.value
                    ? 'bg-[var(--color-surface-100)] dark:bg-[var(--color-surface-800)] text-[var(--color-content-primary)]'
                    : 'text-[var(--color-content-tertiary)] hover:text-[var(--color-content-primary)]'
                )}
              >
                {t.icon}
              </button>
            ))}
          </div>

          <Dropdown
            trigger={({ isOpen }) => (
              <Button
                variant="ghost"
                size="icon"
                className="gap-2 px-2 pr-3 rounded-[var(--radius)]"
                aria-label="User menu"
                aria-expanded={isOpen}
              >
                <Avatar name={user?.username || 'User'} size="sm" />
                <span className="hidden sm:block text-[13px] font-medium text-[var(--color-content-primary)]">{user?.username}</span>
                <ChevronDown className={cn('h-3.5 w-3.5 text-[var(--color-content-tertiary)] transition-transform duration-150', isOpen && 'rotate-180')} />
              </Button>
            )}
          >
            <div className="px-3 py-2.5 border-b border-[var(--color-border-default)]">
              <p className="text-[13px] font-semibold text-[var(--color-content-primary)]">{user?.username}</p>
              <p className="text-[12px] text-[var(--color-content-tertiary)] mt-0.5">{user?.email}</p>
            </div>
            <DropdownItem icon={<Settings className="h-4 w-4" />} onClick={() => navigate('/settings')}>
              Settings
            </DropdownItem>
            <DropdownDivider />
            <DropdownItem icon={<LogOut className="h-4 w-4" />} onClick={logout} className="text-[var(--color-state-error)]">
              Log out
            </DropdownItem>
          </Dropdown>
        </div>
      </header>
    );
  }
);

Header.displayName = 'Header';
