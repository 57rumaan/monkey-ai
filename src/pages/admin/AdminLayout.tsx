import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { SidebarNavItem, SidebarSection } from '@/components/layout/Sidebar';
import { LayoutDashboard, Server, Box, Layers, Users, MessageSquare, BarChart3, Settings, ChevronLeft } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useState } from 'react';

export function AdminLayout() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/admin/providers', label: 'Providers', icon: Server },
    { path: '/admin/bundles', label: 'Model Bundles', icon: Box },
    { path: '/admin/capabilities', label: 'Capabilities', icon: Layers },
    { path: '/admin/users', label: 'Users', icon: Users },
    { path: '/admin/chats', label: 'Chats', icon: MessageSquare },
    { path: '/admin/usage', label: 'Usage', icon: BarChart3 },
    { path: '/admin/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[var(--color-surface-50)] dark:bg-[var(--color-surface-950)] flex">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)}>
        <nav className="space-y-1">
          <SidebarSection>
            <SidebarNavItem
              label="Back to Chat"
              icon={<ChevronLeft className="h-4 w-4" />}
              onClick={() => { navigate('/'); setSidebarOpen(false); }}
            />
          </SidebarSection>
          <SidebarSection title="Admin">
            {navItems.map(item => (
              <SidebarNavItem
                key={item.path}
                label={item.label}
                icon={<item.icon className="h-4 w-4" />}
                active={location.pathname === item.path}
                onClick={() => { navigate(item.path); setSidebarOpen(false); }}
              />
            ))}
          </SidebarSection>
        </nav>
        <div className="mt-auto pt-4 border-t border-[var(--color-border-default)] px-3 pb-3">
          <div className="flex items-center gap-3 py-2">
            <div className="h-8 w-8 rounded-full bg-[var(--color-brand-100)] dark:bg-[var(--color-brand-900)] flex items-center justify-center text-[var(--color-brand-600)] dark:text-[var(--color-brand-400)] text-sm font-medium">
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--color-content-primary)] truncate">{user?.username}</p>
              <p className="text-xs text-[var(--color-content-tertiary)] truncate">Admin</p>
            </div>
          </div>
        </div>
      </Sidebar>

      <div className="flex-1 flex flex-col min-w-0 lg:ml-0">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
