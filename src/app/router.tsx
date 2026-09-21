import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Layout } from './Layout';
import { ChatPage } from '@/pages/ChatPage';

const LoginPage = lazy(() => import('@/pages/LoginPage').then(m => ({ default: m.LoginPage })));
const SignupPage = lazy(() => import('@/pages/SignupPage').then(m => ({ default: m.SignupPage })));
const ForgotPasswordPage = lazy(() => import('@/pages/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })));
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const AdminLayout = lazy(() => import('@/pages/admin/AdminLayout').then(m => ({ default: m.AdminLayout })));
const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage').then(m => ({ default: m.AdminDashboardPage })));
const AdminProvidersPage = lazy(() => import('@/pages/admin/AdminProvidersPage').then(m => ({ default: m.AdminProvidersPage })));
const AdminBundlesPage = lazy(() => import('@/pages/admin/AdminBundlesPage').then(m => ({ default: m.AdminBundlesPage })));
const AdminCapabilitiesPage = lazy(() => import('@/pages/admin/AdminCapabilitiesPage').then(m => ({ default: m.AdminCapabilitiesPage })));
const AdminUsersPage = lazy(() => import('@/pages/admin/AdminUsersPage').then(m => ({ default: m.AdminUsersPage })));
const AdminSettingsPage = lazy(() => import('@/pages/admin/AdminSettingsPage').then(m => ({ default: m.AdminSettingsPage })));
const AdminChatsPage = lazy(() => import('@/pages/admin/AdminChatsPage').then(m => ({ default: m.AdminChatsPage })));
const AdminUsagePage = lazy(() => import('@/pages/admin/AdminUsagePage').then(m => ({ default: m.AdminUsagePage })));

function PageSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-4 border-brand-500 border-t-transparent" />
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <PageSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <PageSpinner />;
  }

  if (!user || user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <PageSpinner />;
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AuthRoute><Layout /></AuthRoute>}>
          <Route path="/login" element={<Suspense fallback={<PageSpinner />}><LoginPage /></Suspense>} />
          <Route path="/signup" element={<Suspense fallback={<PageSpinner />}><SignupPage /></Suspense>} />
          <Route path="/forgot-password" element={<Suspense fallback={<PageSpinner />}><ForgotPasswordPage /></Suspense>} />
        </Route>

        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route path="/" element={<ChatPage />} />
          <Route path="/settings" element={<Suspense fallback={<PageSpinner />}><SettingsPage /></Suspense>} />
        </Route>

        <Route element={<AdminRoute><Suspense fallback={<PageSpinner />}><AdminLayout /></Suspense></AdminRoute>}>
          <Route path="/admin" element={<Suspense fallback={<PageSpinner />}><AdminDashboardPage /></Suspense>} />
          <Route path="/admin/providers" element={<Suspense fallback={<PageSpinner />}><AdminProvidersPage /></Suspense>} />
          <Route path="/admin/bundles" element={<Suspense fallback={<PageSpinner />}><AdminBundlesPage /></Suspense>} />
          <Route path="/admin/capabilities" element={<Suspense fallback={<PageSpinner />}><AdminCapabilitiesPage /></Suspense>} />
          <Route path="/admin/users" element={<Suspense fallback={<PageSpinner />}><AdminUsersPage /></Suspense>} />
          <Route path="/admin/chats" element={<Suspense fallback={<PageSpinner />}><AdminChatsPage /></Suspense>} />
          <Route path="/admin/usage" element={<Suspense fallback={<PageSpinner />}><AdminUsagePage /></Suspense>} />
          <Route path="/admin/settings" element={<Suspense fallback={<PageSpinner />}><AdminSettingsPage /></Suspense>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
