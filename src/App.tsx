import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './AppContext';
import { AuthPage } from './AuthPage';
import { ChatPage } from './ChatPage';
import { SettingsPage } from './SettingsPage';
import { AdminLayout, AdminLoginPage } from './AdminLayout';
import { ToastContainer } from './ui';

function App() {
  return (
    <AppProvider>
      <HashRouter>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/" element={<ChatPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin" element={<AdminLayout />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <ToastContainer />
      </HashRouter>
    </AppProvider>
  );
}

export default App;
