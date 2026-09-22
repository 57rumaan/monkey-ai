import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Layout } from './Layout';

const AuthView = lazy(() => import('@/components/auth-new/AuthView').then(m => ({ default: m.AuthView })));
const SettingsView = lazy(() => import('@/components/settings-new/SettingsView').then(m => ({ default: m.SettingsView })));
const AdminView = lazy(() => import('@/components/admin-new/AdminView').then(m => ({ default: m.AdminView })));
const SearchView = lazy(() => import('@/components/search-new/SearchView').then(m => ({ default: m.SearchView })));
const ChatView = lazy(() => import('@/components/chat-new/ChatView').then(m => ({ default: m.ChatView })));

function PageSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-4 border-[var(--primary)] border-t-transparent" />
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
          <Route path="/login" element={<Suspense fallback={<PageSpinner />}><AuthView /></Suspense>} />
          <Route path="/signup" element={<Suspense fallback={<PageSpinner />}><AuthView /></Suspense>} />
          <Route path="/forgot-password" element={<Suspense fallback={<PageSpinner />}><AuthView /></Suspense>} />
          <Route path="/reset-password" element={<Suspense fallback={<PageSpinner />}><AuthView /></Suspense>} />
          <Route path="/verify" element={<Suspense fallback={<PageSpinner />}><AuthView /></Suspense>} />
        </Route>

        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route path="/" element={<ChatView />} />
          <Route path="/search" element={<Suspense fallback={<PageSpinner />}><SearchView /></Suspense>} />
          <Route path="/settings" element={<Suspense fallback={<PageSpinner />}><SettingsView /></Suspense>} />
        </Route>

        <Route element={<AdminRoute><Suspense fallback={<PageSpinner />}><AdminView onBack={() => {}} /></Suspense></AdminRoute>}>
          <Route path="/admin" element={<AdminView onBack={() => {}} />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}