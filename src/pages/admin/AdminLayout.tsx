import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { SidebarNavItem, SidebarSection } from '@/components/layout/Sidebar';
import { LayoutDashboard, Server, Box, Layers, Users, Settings } from 'lucide-react';
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
    { path: '/admin/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950 flex">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)}>
        <div className="h-16 px-4 border-b border-border-default flex items-center">
          <h1 className="text-heading-lg font-bold text-brand-600">Admin Panel</h1>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-6">
          <SidebarSection>
            {navItems.map(item => (
              <SidebarNavItem
                key={item.path}
                label={item.label}
                icon={<item.icon className="h-5 w-5" />}
                active={location.pathname === item.path}
                onClick={() => navigate(item.path)}
              />
            ))}
          </SidebarSection>
        </nav>
        <div className="p-4 border-t border-border-default">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="h-8 w-8 rounded-full bg-brand-100 dark:bg-brand-900 flex items-center justify-center text-brand-600 dark:text-brand-400 text-body-sm font-medium">
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-body-sm font-medium text-content-primary truncate">{user?.username}</p>
              <p className="text-body-xs text-content-tertiary truncate">Admin</p>
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