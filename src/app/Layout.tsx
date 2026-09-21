import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { SidebarNavItem, SidebarSection } from '@/components/layout/Sidebar';
import { Sidebar as SidebarIcon, History, Settings, Plus, Search, Users, Cpu, Box, Layers } from 'lucide-react';
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
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950 flex">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)}>
        <nav className="space-y-6">
          <SidebarSection>
            <SidebarNavItem
              label="New Chat"
              icon={<Plus className="h-5 w-5" />}
              active={isChat}
              onClick={() => navigate('/')}
            />
            <SidebarNavItem
              label="Search"
              icon={<Search className="h-5 w-5" />}
              onClick={() => {}}
            />
            <SidebarNavItem
              label="History"
              icon={<History className="h-5 w-5" />}
              onClick={() => {}}
            />
          </SidebarSection>

          {isAdmin && (
            <SidebarSection title="Admin">
              <SidebarNavItem
                label="Dashboard"
                icon={<SidebarIcon className="h-5 w-5" />}
                onClick={() => navigate('/admin')}
              />
              <SidebarNavItem
                label="Providers"
                icon={<Cpu className="h-5 w-5" />}
                onClick={() => navigate('/admin/providers')}
              />
              <SidebarNavItem
                label="Bundles"
                icon={<Box className="h-5 w-5" />}
                onClick={() => navigate('/admin/bundles')}
              />
              <SidebarNavItem
                label="Capabilities"
                icon={<Layers className="h-5 w-5" />}
                onClick={() => navigate('/admin/capabilities')}
              />
              <SidebarNavItem
                label="Users"
                icon={<Users className="h-5 w-5" />}
                onClick={() => navigate('/admin/users')}
              />
              <SidebarNavItem
                label="Settings"
                icon={<Settings className="h-5 w-5" />}
                onClick={() => navigate('/admin/settings')}
              />
            </SidebarSection>
          )}

          <SidebarSection title="Account">
            <SidebarNavItem
              label="Settings"
              icon={<Settings className="h-5 w-5" />}
              active={isSettings}
              onClick={() => navigate('/settings')}
            />
          </SidebarSection>
        </nav>
      </Sidebar>

      <div className="flex-1 flex flex-col min-w-0 lg:ml-0">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-hidden">
          {isChat && (
            <div className="border-b border-border-default px-4 py-3 bg-white/50 dark:bg-surface-950/50 backdrop-blur-sm">
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