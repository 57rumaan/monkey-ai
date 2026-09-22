import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useBundles } from '@/features/bundles/hooks/useBundles';
import {
  Button, IconButton, Dropdown, Avatar,
  MenuIcon, SunIcon, MoonIcon, MonitorIcon, ShareIcon, MoreHorizontalIcon,
  ChevronDownIcon, SettingsIcon, LogOutIcon, CheckIcon, StarIcon,
  PenIcon, AlertCircleIcon
} from '@/components/ui-new';

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { data: bundles = [] } = useBundles();
  const navigate = useNavigate();
  const [modelOpen, setModelOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selectedBundle = bundles.find(b => b.enabled);
  const enabledBundles = bundles.filter(b => b.enabled);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
        setModelOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-sticky h-14 flex items-center px-4 lg:px-6',
        'bg-[var(--card)]/80 backdrop-blur-xl',
        'border-b border-[var(--border)]'
      )}
      role="banner"
    >
      <button
        type="button"
        onClick={onMenuClick}
        className="lg:hidden p-2 -ml-2 rounded-[var(--radius)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
        aria-label="Open menu"
      >
        <MenuIcon />
      </button>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        {/* Model Selector */}
        <div className="relative" ref={dropdownRef}>
          <button
            ref={triggerRef}
            type="button"
            onClick={() => { setModelOpen(!modelOpen); }}
            className={cn(
              'flex items-center gap-2.5 px-3 py-1.5 rounded-[var(--radius)] border border-[var(--border)] hover:bg-[var(--muted)] text-sm text-[var(--foreground)] transition-colors',
              modelOpen ? 'bg-[var(--muted)]' : ''
            )}
            aria-haspopup="listbox"
            aria-expanded={modelOpen}
          >
            <div className="w-5 h-5 rounded bg-[var(--primary)] text-white text-xs flex items-center justify-center font-bold">
              {selectedBundle ? selectedBundle.name.charAt(0) : 'O'}
            </div>
            <span className="font-medium truncate max-w-[180px] sm:max-w-[240px]">
              {selectedBundle?.name || 'Select model'}
            </span>
            <ChevronDownIcon className={cn('h-3.5 w-3.5 text-[var(--muted-foreground)] flex-shrink-0 transition-transform duration-200', modelOpen && 'rotate-180')} />
          </button>

          {modelOpen && (
            <div className="absolute top-full right-0 mt-1.5 z-50 min-w-[280px] bg-[var(--card)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-lg overflow-hidden">
              <div className="p-2 border-b border-[var(--border)]">
                <input
                  type="text"
                  placeholder="Search models..."
                  className="w-full h-8 px-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--muted)] text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--primary)]"
                />
              </div>
              <div className="max-h-80 overflow-y-auto">
                {enabledBundles.map(bundle => (
                  <button
                    key={bundle.id}
                    type="button"
                    role="option"
                    aria-selected={selectedBundle?.id === bundle.id}
                    onClick={() => { setModelOpen(false); }}
                    className={cn(
                      'w-full text-left p-3 rounded-[var(--radius)] transition-colors',
                      selectedBundle?.id === bundle.id
                        ? 'bg-[var(--primary)]/10 text-[var(--primary)]'
                        : 'hover:bg-[var(--muted)] text-[var(--foreground)]'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        'h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 text-[10px] font-bold',
                        bundle.tier === 'pro' && 'bg-[var(--primary)]/10 text-[var(--primary)]',
                        bundle.tier === 'enterprise' && 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
                        bundle.tier === 'free' && 'bg-[var(--muted)] text-[var(--muted-foreground)]'
                      )}>
                        {bundle.tier === 'pro' && 'PRO'}
                        {bundle.tier === 'enterprise' && 'ENT'}
                        {bundle.tier === 'free' && 'FREE'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{bundle.name}</p>
                        <p className="text-xs text-[var(--muted-foreground)] mt-0.5 line-clamp-1">{bundle.description || `${bundle.capabilities?.length || 0} capabilities`}</p>
                        <div className="flex items-center gap-1 mt-2">
                          {bundle.capabilities?.slice(0, 5).map((cap: any) => (
                            <span key={cap.capabilityId || cap} className="inline-flex items-center gap-1 h-5 px-1.5 rounded bg-[var(--muted)] text-[var(--muted-foreground)] border border-[var(--border)] text-[10px]">
                              {cap.capabilityId ? cap.capabilityId.replace(/_/g, ' ') : cap}
                            </span>
                          ))}
                          {bundle.capabilities && bundle.capabilities.length > 5 && (
                            <span className="text-[10px] text-[var(--muted-foreground)] px-1.5 py-0.5 rounded bg-[var(--muted)] border border-[var(--border)]">
                              +{bundle.capabilities.length - 5}
                            </span>
                          )}
                        </div>
                      </div>
                      {selectedBundle?.id === bundle.id && <CheckIcon className="h-4 w-4 text-[var(--primary)]" />}
                    </div>
                  </button>
                ))}
                {enabledBundles.length === 0 && (
                  <div className="p-4 text-center text-sm text-[var(--muted-foreground)]">No models available</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Theme Switcher */}
        <div className="flex items-center gap-0.5 border border-[var(--border)] rounded-[var(--radius)] p-0.5">
          {([
            { value: 'light' as const, icon: <SunIcon /> },
            { value: 'system' as const, icon: <MonitorIcon /> },
            { value: 'dark' as const, icon: <MoonIcon /> },
          ] as const).map(t => (
            <button
              key={t.value}
              onClick={() => setTheme(t.value)}
              title={t.value.charAt(0).toUpperCase() + t.value.slice(1)}
              className={cn(
                'w-7 h-6 flex items-center justify-center rounded transition-colors',
                theme === t.value
                  ? 'bg-[var(--muted)] text-[var(--foreground)]'
                  : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              )}
            >
              {t.icon}
            </button>
          ))}
        </div>

        {/* Share & More */}
        <IconButton size="sm" tooltip="Share"><ShareIcon /></IconButton>
        <Dropdown
          align="right"
          trigger={<IconButton size="sm"><MoreHorizontalIcon /></IconButton>}
          items={[
            { label: 'Rename', icon: <PenIcon /> },
            { label: 'Add to favorites', icon: <StarIcon /> },
            { divider: true },
            { label: 'Delete conversation', icon: <AlertCircleIcon />, danger: true },
          ]}
        />

        {/* User Menu */}
        <Dropdown
          align="right"
          trigger={({ isOpen }) => (
            <Button
              variant="ghost"
              size="icon"
              className="gap-2 px-2 pr-3 rounded-[var(--radius)]"
              aria-label="User menu"
              aria-expanded={isOpen}
            >
              <Avatar name={user?.username || 'User'} size="sm" />
              <span className="hidden sm:block text-[13px] font-medium text-[var(--foreground)]">{user?.username}</span>
              <ChevronDownIcon className={cn('h-3.5 w-3.5 text-[var(--muted-foreground)] transition-transform duration-150', isOpen && 'rotate-180')} />
            </Button>
          )}
          items={[
            { label: 'Settings', icon: <SettingsIcon />, onClick: () => navigate('/settings') },
            { divider: true },
            { label: 'Log out', icon: <LogOutIcon />, onClick: () => logout(), danger: true },
          ]}
        />
      </div>
    </header>
  );
}