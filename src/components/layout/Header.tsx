import { forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Menu, Sun, Moon, Bell, LogOut, Settings, ChevronDown } from 'lucide-react';
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
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();

    return (
      <header
        ref={ref}
        className={cn(
          'sticky top-0 z-sticky h-14 flex items-center px-4 lg:px-6',
          'bg-white/80 dark:bg-surface-950/80 backdrop-blur-xl',
          'border-b border-border-default',
          className
        )}
        role="banner"
      >
        <button
          type="button"
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-2 rounded-lg text-content-secondary hover:text-content-primary hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors duration-fast"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex-1" />

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="rounded-lg"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>

          <Dropdown
            trigger={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Notifications"
                className="rounded-lg relative"
              >
                <Bell className="h-4 w-4" />
              </Button>
            }
          >
            <DropdownItem icon={<Bell className="h-4 w-4" />}>No notifications</DropdownItem>
          </Dropdown>

          <div className="w-px h-5 bg-border-default mx-1 hidden sm:block" />

          <Dropdown
            trigger={({ isOpen }) => (
              <Button
                variant="ghost"
                size="icon"
                className="gap-2 px-2 pr-3 rounded-lg"
                aria-label="User menu"
                aria-expanded={isOpen}
              >
                <Avatar name={user?.username || 'User'} size="sm" />
                <span className="hidden sm:block text-[13px] font-medium text-content-primary">{user?.username}</span>
                <ChevronDown className={cn('h-3.5 w-3.5 text-content-tertiary transition-transform duration-fast', isOpen && 'rotate-180')} />
              </Button>
            )}
          >
            <div className="px-3 py-2.5 border-b border-border-default">
              <p className="text-[13px] font-semibold text-content-primary">{user?.username}</p>
              <p className="text-[12px] text-content-tertiary mt-0.5">{user?.email}</p>
            </div>
            <DropdownItem icon={<Settings className="h-4 w-4" />} onClick={() => navigate('/settings')}>
              Settings
            </DropdownItem>
            <DropdownDivider />
            <DropdownItem icon={<LogOut className="h-4 w-4" />} onClick={logout} className="text-state-error">
              Log out
            </DropdownItem>
          </Dropdown>
        </div>
      </header>
    );
  }
);

Header.displayName = 'Header';
