import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Cpu, Layers, Sparkles, Shield, Settings, LogOut, Menu, X } from 'lucide-react';
import { useApp } from './AppContext';
import { AdminDashboard } from './AdminDashboard';
import { AdminProviders } from './AdminProviders';
import { AdminModelGroups } from './AdminModelGroups';
import { AdminFeatures } from './AdminFeatures';
import { AdminUsers } from './AdminUsers';
import { AdminRules } from './AdminRules';
import { AdminSecurity } from './AdminSecurity';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'providers', label: 'Models & Providers', icon: Cpu },
  { id: 'groups', label: 'Model Groups', icon: Layers },
  { id: 'features', label: 'Features', icon: Sparkles },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'rules', label: 'AI Rules', icon: Shield },
  { id: 'security', label: 'Security', icon: Shield },
];

export function AdminLayout() {
  const { state, adminLogout } = useApp();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!state.adminAuthenticated) navigate('/admin/login');
  }, [state.adminAuthenticated, navigate]);

  const handleLogout = () => { adminLogout(); navigate('/admin/login'); };

  if (!state.adminAuthenticated) return null;

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <AdminDashboard />;
      case 'providers': return <AdminProviders />;
      case 'groups': return <AdminModelGroups />;
      case 'features': return <AdminFeatures />;
      case 'users': return <AdminUsers />;
      case 'rules': return <AdminRules />;
      case 'security': return <AdminSecurity />;
      default: return <AdminDashboard />;
    }
  };

  return (
    <div className="h-screen flex bg-bg-light dark:bg-bg-dark">
      {mobileMenuOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileMenuOpen(false)} />}
      <aside className={`fixed lg:relative z-50 h-full w-64 bg-sidebar-light dark:bg-sidebar-dark border-r border-gray-200 dark:border-gray-700 flex flex-col transition-transform ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2"><span className="text-2xl">🐵</span><div><h1 className="font-bold text-gray-900 dark:text-white">Monkey AI</h1><p className="text-xs text-gray-500">Admin Panel</p></div></div>
          <button onClick={() => setMobileMenuOpen(false)} className="lg:hidden p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"><X size={20} className="text-gray-500" /></button>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(item => (
            <button key={item.id} onClick={() => { setActiveTab(item.id); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === item.id ? 'bg-monkey-500/10 text-monkey-700 dark:text-monkey-300' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
              <item.icon size={18} />{item.label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-200 dark:border-gray-700 space-y-1">
          <button onClick={() => navigate('/')} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"><Settings size={18} />Back to App</button>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"><LogOut size={18} />Logout</button>
        </div>
      </aside>
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="flex items-center gap-4 px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><Menu size={20} className="text-gray-600 dark:text-gray-400" /></button>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{NAV_ITEMS.find(n => n.id === activeTab)?.label}</h2>
        </header>
        <div className="flex-1 overflow-y-auto p-6">{renderContent()}</div>
      </main>
    </div>
  );
}

export function AdminLoginPage() {
  const { adminLogin, state } = useApp();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (state.adminAuthenticated) navigate('/admin');
  }, [state.adminAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const success = await adminLogin(username, password);
    if (success) navigate('/admin');
    else setError('Invalid admin credentials');
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-950 p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8"><div className="text-5xl mb-3">🐵</div><h1 className="text-2xl font-bold text-white">Admin Access</h1><p className="text-gray-400 text-sm mt-1">Monkey AI Administration</p></div>
        <form onSubmit={handleSubmit} className="bg-gray-800 rounded-2xl border border-gray-700 p-6 space-y-4">
          <div><label className="block text-sm font-medium text-gray-300 mb-1">Username</label><input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-monkey-500" placeholder="Admin username" required /></div>
          <div><label className="block text-sm font-medium text-gray-300 mb-1">Password</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-monkey-500" placeholder="••••••••" required /></div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button type="submit" disabled={loading} className="w-full py-2.5 rounded-lg bg-monkey-500 hover:bg-monkey-600 text-white font-medium transition-colors disabled:opacity-50">{loading ? 'Authenticating...' : 'Sign In'}</button>
        </form>
      </div>
    </div>
  );
}
