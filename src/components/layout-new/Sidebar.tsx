import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useChats } from '@/features/chat/hooks/useChats';
import {
  Button, IconButton, Avatar, Badge, Dropdown,
  PlusIcon, SearchIcon, MessageIcon, StarIcon, FolderIcon, SettingsIcon,
  MenuIcon, ChevronRightIcon, LogOutIcon, UserIcon, TrashIcon, ChevronLeftIcon,
  FolderPlusIcon, FolderOpenIcon, ClockIcon
} from '@/components/ui-new';

type View = 'chat' | 'search' | 'settings' | 'admin' | 'auth';

interface SidebarProps {
  onClose?: () => void;
  isOpen?: boolean;
}

interface ChatItem {
  id: string;
  title: string;
  updatedAt: string;
  folderId?: string | null;
  pinned?: boolean;
}

interface Folder {
  id: string;
  name: string;
  chatCount: number;
}

export function Sidebar({ onClose, isOpen = true }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [openSection, setOpenSection] = useState<string>('recent');
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { data: chats = [] } = useChats();

  const handleNewChat = () => {
    navigate('/');
    if (onClose) onClose();
  };

  const handleSearch = () => {
    navigate('/search');
    if (onClose) onClose();
  };

  const handleSettings = () => {
    navigate('/settings');
    if (onClose) onClose();
  };

  // Get recent chats (last 10)
  const recentChats = chats.slice(0, 10);
  // Get pinned chats as favorites
  const favorites = chats.filter(c => c.pinned).slice(0, 5);
  // Get folders (mock for now - could be from API)
  const folders: Folder[] = [
    { id: 'p1', name: 'Product Redesign', chatCount: 12 },
    { id: 'p2', name: 'Q4 Marketing Copy', chatCount: 8 },
    { id: 'p3', name: 'Engineering Docs', chatCount: 5 },
  ];

  const navItem = (label: string, icon: React.ReactNode, active: boolean, onClick: () => void, tooltip?: string) => (
    <button
      title={collapsed ? (tooltip || label) : undefined}
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-2.5 py-2 rounded-[var(--radius)] text-sm transition-all duration-150 group relative',
        active
          ? 'bg-[var(--primary)]/10 text-[var(--primary)] font-medium'
          : 'text-[var(--sidebar-muted)] hover:bg-[var(--muted)] hover:text-[var(--sidebar-foreground)]',
        collapsed ? 'justify-center' : ''
      )}
    >
      <span className="flex-shrink-0">{icon}</span>
      {!collapsed && <span className="truncate">{label}</span>}
      {collapsed && (
        <div className="absolute left-full ml-2 px-2 py-1 bg-[var(--foreground)] text-[var(--background)] text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
          {label}
        </div>
      )}
    </button>
  );

  const isAdmin = user?.role === 'admin';

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col',
          'bg-[var(--sidebar)] border-r border-[var(--border)]',
          'transition-all duration-300',
          collapsed ? 'w-16' : 'w-64',
          'flex-shrink-0 lg:relative lg:z-auto lg:translate-x-0',
          !isOpen && !mobileOpen ? '-translate-x-full' : 'translate-x-0'
        )}
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Header */}
        <div className={cn('flex items-center gap-2.5 px-3 py-4 border-b border-[var(--border)]', collapsed ? 'justify-center' : 'justify-between')}>
          {!collapsed && (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-[var(--primary)] flex items-center justify-center text-white text-base font-bold select-none flex-shrink-0">
                O
              </div>
              <span className="font-semibold text-[var(--sidebar-foreground)] text-base" style={{ fontFamily: 'Instrument Serif, serif' }}>
                Octix AI
              </span>
            </div>
          )}
          {collapsed && (
            <div className="w-7 h-7 rounded-lg bg-[var(--primary)] flex items-center justify-center text-white text-base select-none">
              O
            </div>
          )}
          <IconButton size="sm" onClick={() => setCollapsed(c => !c)} tooltip={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </IconButton>
        </div>

        {/* New Chat + Search */}
        <div className={cn('px-2.5 py-3 flex flex-col gap-1.5')}>
          <Button
            onClick={handleNewChat}
            className={cn(
              'flex items-center gap-2.5 w-full rounded-[var(--radius)] transition-all bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 active:scale-[0.98]',
              collapsed ? 'justify-center h-9 w-9 mx-auto' : 'px-3 py-2'
            )}
            title={collapsed ? 'New Chat' : undefined}
          >
            <PlusIcon />
            {!collapsed && <span>New Chat</span>}
          </Button>

          {!collapsed && (
            <Button
              variant="ghost"
              onClick={handleSearch}
              className={cn(
                'flex items-center gap-2.5 w-full px-3 py-2 rounded-[var(--radius)] text-sm transition-all',
                location.pathname === '/search' ? 'bg-[var(--primary)]/10 text-[var(--primary)]' : 'text-[var(--sidebar-muted)] hover:bg-[var(--muted)] hover:text-[var(--sidebar-foreground)]'
              )}
            >
              <SearchIcon />
              <span>Search chats</span>
            </Button>
          )}
          {collapsed && (
            <IconButton
              size="md"
              onClick={handleSearch}
              className="w-9 h-9 mx-auto rounded-[var(--radius)] text-[var(--sidebar-muted)] hover:bg-[var(--muted)] hover:text-[var(--sidebar-foreground)] transition-all"
              tooltip="Search"
            >
              <SearchIcon />
            </IconButton>
          )}
        </div>

        {/* Nav sections */}
        <div className="flex-1 overflow-y-auto px-2.5 py-1 flex flex-col gap-1 min-h-0">
          {collapsed ? (
            <>
              <IconButton size="md" tooltip="Recents" onClick={() => { navigate('/'); if (onClose) onClose(); }}>
                <MessageIcon />
              </IconButton>
              <IconButton size="md" tooltip="Favorites" onClick={() => { navigate('/search'); if (onClose) onClose(); }}>
                <StarIcon />
              </IconButton>
              <IconButton size="md" tooltip="Projects" onClick={() => { navigate('/search'); if (onClose) onClose(); }}>
                <FolderIcon />
              </IconButton>
            </>
          ) : (
            <>
              {/* Recents */}
              <div>
                <button
                  onClick={() => setOpenSection(s => s === 'recent' ? '' : 'recent')}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider hover:text-[var(--foreground)] transition-colors"
                >
                  <span>Recent</span>
                  <ChevronRightIcon className={cn('transition-transform', openSection === 'recent' && 'rotate-90')} />
                </button>
                {openSection === 'recent' && recentChats.length > 0 && recentChats.map(chat => (
                  <button
                    key={chat.id}
                    onClick={() => { navigate('/'); if (onClose) onClose(); }}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-[var(--radius)] text-sm transition-colors text-left group',
                      location.pathname === '/' ? 'bg-[var(--muted)] text-[var(--foreground)]' : 'text-[var(--sidebar-muted)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]'
                    )}
                  >
                    <MessageIcon />
                    <span className="truncate flex-1">{chat.title || 'Untitled'}</span>
                    <span className="text-xs opacity-0 group-hover:opacity-100 text-[var(--muted-foreground)] flex-shrink-0">
                      {new Date(chat.updatedAt).toLocaleDateString()}
                    </span>
                  </button>
                ))}
                {openSection === 'recent' && recentChats.length === 0 && (
                  <p className="px-2.5 py-2 text-xs text-[var(--muted-foreground)]">No recent chats</p>
                )}
              </div>

              {/* Favorites */}
              <div>
                <button
                  onClick={() => setOpenSection(s => s === 'favs' ? '' : 'favs')}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider hover:text-[var(--foreground)] transition-colors"
                >
                  <span>Favorites</span>
                  <ChevronRightIcon className={cn('transition-transform', openSection === 'favs' && 'rotate-90')} />
                </button>
                {openSection === 'favs' && favorites.length > 0 && favorites.map(fav => (
                  <button
                    key={fav.id}
                    onClick={() => { navigate('/'); if (onClose) onClose(); }}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-[var(--radius)] text-sm transition-colors text-left',
                      location.pathname === '/' ? 'bg-[var(--muted)] text-[var(--foreground)]' : 'text-[var(--sidebar-muted)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]'
                    )}
                  >
                    <StarIcon />
                    <span className="truncate">{fav.title || 'Untitled'}</span>
                  </button>
                ))}
                {openSection === 'favs' && favorites.length === 0 && (
                  <p className="px-2.5 py-2 text-xs text-[var(--muted-foreground)]">No favorites yet</p>
                )}
              </div>

              {/* Projects */}
              <div>
                <button
                  onClick={() => setOpenSection(s => s === 'projects' ? '' : 'projects')}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider hover:text-[var(--foreground)] transition-colors"
                >
                  <span>Projects</span>
                  <ChevronRightIcon className={cn('transition-transform', openSection === 'projects' && 'rotate-90')} />
                </button>
                {openSection === 'projects' && (
                  <>
                    {folders.map(proj => (
                      <button
                        key={proj.id}
                        className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-[var(--radius)] text-sm text-[var(--sidebar-muted)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] transition-colors text-left"
                      >
                        <FolderIcon />
                        <span className="truncate flex-1">{proj.name}</span>
                        <Badge variant="muted">{proj.chatCount}</Badge>
                      </button>
                    ))}
                    <Button variant="ghost" size="sm" className="w-full justify-start px-2.5 py-1.5 text-xs text-[var(--primary)] hover:underline">
                      <PlusIcon className="w-3.5 h-3.5" /> New project
                    </Button>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {/* Bottom nav */}
        <div className="px-2.5 py-2 border-t border-[var(--border)] flex flex-col gap-1">
          {navItem('Settings', <SettingsIcon />, location.pathname === '/settings', handleSettings)}

          {isAdmin && (
            <button
              onClick={() => { navigate('/admin'); if (onClose) onClose(); }}
              className={cn(
                'group flex items-center gap-2.5 w-full px-2.5 py-2 rounded-[var(--radius)] text-sm transition-all duration-150',
                location.pathname.startsWith('/admin') ? 'bg-[var(--primary)]/10 text-[var(--primary)] font-medium' : 'text-[var(--sidebar-muted)] hover:bg-[var(--muted)] hover:text-[var(--sidebar-foreground)]',
                collapsed ? 'justify-center' : ''
              )}
            >
              <span className="flex-shrink-0"><SettingsIcon /></span>
              {!collapsed && <span className="truncate">Admin Panel</span>}
            </button>
          )}

          {/* User area */}
          <Dropdown
            align="left"
            trigger={
              <div className={cn('flex items-center gap-2.5 px-2 py-1.5 rounded-[var(--radius)] cursor-pointer hover:bg-[var(--muted)] transition-colors', collapsed ? 'justify-center' : '')}>
                <Avatar name={user?.username || 'User'} size="sm" />
                {!collapsed && (
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-sm font-medium text-[var(--sidebar-foreground)] truncate">{user?.username || 'User'}</span>
                    <span className="text-xs text-[var(--muted-foreground)] truncate">{user?.email || ''}</span>
                  </div>
                )}
              </div>
            }
            items={[
              { label: 'Profile', icon: <UserIcon />, onClick: handleSettings },
              { label: 'Settings', icon: <SettingsIcon />, onClick: handleSettings },
              { divider: true },
              { label: 'Log out', icon: <LogOutIcon />, onClick: () => { logout(); if (onClose) onClose(); } },
            ]}
          />
        </div>
      </aside>
    </>
  );
}