import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { SidebarNavItem, SidebarSection } from '@/components/layout/Sidebar';
import { Plus, Search, MessageSquare, Settings, Users, Cpu, Box, Layers, BarChart3, LayoutDashboard } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useState } from 'react';
import { ModelSelector } from '@/components/chat/ModelSelector';
import { useBundles } from '@/features/bundles/hooks/useBundles';

export function Layout() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: bundles = [] } = useBundles();

  const isAdmin = user?.role === 'admin';
  const isChat = location.pathname === '/';
  const isSettings = location.pathname === '/settings';

  return (
    <div className="min-h-screen bg-[var(--color-surface-50)] dark:bg-[var(--color-surface-950)] flex">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)}>
        <nav className="space-y-1">
          <SidebarSection>
            <SidebarNavItem
              label="New Chat"
              icon={<Plus className="h-4 w-4" />}
              active={isChat}
              onClick={() => { navigate('/'); setSidebarOpen(false); }}
            />
            <SidebarNavItem
              label="Search"
              icon={<Search className="h-4 w-4" />}
              onClick={() => {}}
            />
          </SidebarSection>

          {isAdmin && (
            <SidebarSection title="Admin">
              <SidebarNavItem
                label="Dashboard"
                icon={<LayoutDashboard className="h-4 w-4" />}
                onClick={() => { navigate('/admin'); setSidebarOpen(false); }}
              />
              <SidebarNavItem
                label="Providers"
                icon={<Cpu className="h-4 w-4" />}
                onClick={() => { navigate('/admin/providers'); setSidebarOpen(false); }}
              />
              <SidebarNavItem
                label="Bundles"
                icon={<Box className="h-4 w-4" />}
                onClick={() => { navigate('/admin/bundles'); setSidebarOpen(false); }}
              />
              <SidebarNavItem
                label="Capabilities"
                icon={<Layers className="h-4 w-4" />}
                onClick={() => { navigate('/admin/capabilities'); setSidebarOpen(false); }}
              />
              <SidebarNavItem
                label="Users"
                icon={<Users className="h-4 w-4" />}
                onClick={() => { navigate('/admin/users'); setSidebarOpen(false); }}
              />
              <SidebarNavItem
                label="Chats"
                icon={<MessageSquare className="h-4 w-4" />}
                onClick={() => { navigate('/admin/chats'); setSidebarOpen(false); }}
              />
              <SidebarNavItem
                label="Usage"
                icon={<BarChart3 className="h-4 w-4" />}
                onClick={() => { navigate('/admin/usage'); setSidebarOpen(false); }}
              />
              <SidebarNavItem
                label="Settings"
                icon={<Settings className="h-4 w-4" />}
                onClick={() => { navigate('/admin/settings'); setSidebarOpen(false); }}
              />
            </SidebarSection>
          )}

          <SidebarSection title="Account">
            <SidebarNavItem
              label="Settings"
              icon={<Settings className="h-4 w-4" />}
              active={isSettings}
              onClick={() => { navigate('/settings'); setSidebarOpen(false); }}
            />
          </SidebarSection>
        </nav>
      </Sidebar>

      <div className="flex-1 flex flex-col min-w-0 lg:ml-0">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-hidden">
          {isChat && (
            <div className="border-b border-[var(--color-border-default)] px-4 py-2.5 bg-white/50 dark:bg-[var(--color-surface-950)]/50 backdrop-blur-sm">
              <ModelSelector
                bundles={bundles}
                selectedBundleId={localStorage.getItem('selectedBundleId') || bundles[0]?.id || ''}
                onSelect={id => localStorage.setItem('selectedBundleId', id)}
              />
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
