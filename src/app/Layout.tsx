import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '@/components/layout-new/Sidebar';
import { Header } from '@/components/layout-new/Header';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useState } from 'react';

export function Layout() {
  const { user } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isChat = location.pathname === '/';
  const isSearch = location.pathname === '/search';
  const isSettings = location.pathname === '/settings';

  return (
    <div className="min-h-screen bg-[var(--background)] flex">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 lg:ml-0">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-auto min-h-0">
          {/* Chat view has its own header with model selector */}
          {isChat || isSearch || isSettings ? (
            <Outlet />
          ) : (
            <div className="flex-1">
              <Outlet />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}