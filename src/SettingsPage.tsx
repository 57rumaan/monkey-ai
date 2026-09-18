import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Palette, Trash2, Shield, LogOut, Moon, Sun } from 'lucide-react';
import { useApp } from './AppContext';
import { Button, Card, Input, Modal } from './ui';

export function SettingsPage() {
  const { state, logout, deleteAccount, toggleTheme, addToast } = useApp();
  const navigate = useNavigate();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  const handleDeleteAccount = () => {
    if (deleteConfirm !== 'DELETE') { addToast('error', 'Type DELETE to confirm'); return; }
    deleteAccount();
    addToast('success', 'Account deleted');
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-bg-light dark:bg-bg-dark">
      <header className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate('/')} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><ArrowLeft size={20} className="text-gray-600 dark:text-gray-400" /></button>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Settings</h1>
        </div>
      </header>
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        <Card>
          <div className="flex items-center gap-3 mb-4"><div className="p-2 rounded-lg bg-blue-500/10"><User size={20} className="text-blue-500" /></div><h3 className="font-semibold text-gray-900 dark:text-white">Account</h3></div>
          {state.user && (
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700"><span className="text-sm text-gray-500">Name</span><span className="text-sm font-medium text-gray-900 dark:text-white">{state.user.name}</span></div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700"><span className="text-sm text-gray-500">Email</span><span className="text-sm font-medium text-gray-900 dark:text-white">{state.user.email}</span></div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700"><span className="text-sm text-gray-500">Member since</span><span className="text-sm text-gray-900 dark:text-white">{new Date(state.user.createdAt).toLocaleDateString()}</span></div>
              <div className="flex items-center justify-between py-2"><span className="text-sm text-gray-500">Status</span><span className="text-sm font-medium text-green-500 capitalize">{state.user.status}</span></div>
            </div>
          )}
        </Card>
        <Card>
          <div className="flex items-center gap-3 mb-4"><div className="p-2 rounded-lg bg-purple-500/10"><Palette size={20} className="text-purple-500" /></div><h3 className="font-semibold text-gray-900 dark:text-white">Appearance</h3></div>
          <div className="flex items-center justify-between">
            <div><p className="text-sm font-medium text-gray-900 dark:text-white">Theme</p><p className="text-xs text-gray-500">Choose light or dark mode</p></div>
            <div className="flex items-center gap-2">
              <button onClick={() => { if (state.theme !== 'light') toggleTheme(); }} className={`p-2 rounded-lg border transition-colors ${state.theme === 'light' ? 'border-monkey-500 bg-monkey-50 dark:bg-monkey-900/20' : 'border-gray-200 dark:border-gray-700'}`}><Sun size={18} className={state.theme === 'light' ? 'text-monkey-500' : 'text-gray-400'} /></button>
              <button onClick={() => { if (state.theme !== 'dark') toggleTheme(); }} className={`p-2 rounded-lg border transition-colors ${state.theme === 'dark' ? 'border-monkey-500 bg-monkey-50 dark:bg-monkey-900/20' : 'border-gray-200 dark:border-gray-700'}`}><Moon size={18} className={state.theme === 'dark' ? 'text-monkey-500' : 'text-gray-400'} /></button>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3 mb-4"><div className="p-2 rounded-lg bg-green-500/10"><Shield size={20} className="text-green-500" /></div><h3 className="font-semibold text-gray-900 dark:text-white">Usage</h3></div>
          {state.user && (
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700"><span className="text-sm text-gray-500">Total Messages</span><span className="text-sm font-medium text-gray-900 dark:text-white">{state.user.usageStats.totalMessages}</span></div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700"><span className="text-sm text-gray-500">Total Chats</span><span className="text-sm font-medium text-gray-900 dark:text-white">{state.chats.filter(c => c.userId === state.user?.id).length}</span></div>
              <div className="flex items-center justify-between py-2"><span className="text-sm text-gray-500">Tokens Used</span><span className="text-sm font-medium text-gray-900 dark:text-white">{state.user.usageStats.totalTokens.toLocaleString()}</span></div>
            </div>
          )}
        </Card>
        <Card className="border-red-200 dark:border-red-800">
          <div className="flex items-center gap-3 mb-4"><div className="p-2 rounded-lg bg-red-500/10"><Trash2 size={20} className="text-red-500" /></div><h3 className="font-semibold text-red-600 dark:text-red-400">Danger Zone</h3></div>
          <div className="space-y-3">
            <div className="flex items-center justify-between"><div><p className="text-sm font-medium text-gray-900 dark:text-white">Logout</p><p className="text-xs text-gray-500">Sign out of your account</p></div><Button variant="outline" size="sm" onClick={() => { logout(); navigate('/auth'); }}><LogOut size={14} /> Logout</Button></div>
            <div className="border-t border-gray-100 dark:border-gray-700 pt-3">
              <div className="flex items-center justify-between"><div><p className="text-sm font-medium text-red-600 dark:text-red-400">Delete Account</p><p className="text-xs text-gray-500">Permanently delete your account and data</p></div><Button variant="danger" size="sm" onClick={() => setShowDeleteModal(true)}><Trash2 size={14} /> Delete</Button></div>
            </div>
          </div>
        </Card>
      </div>
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete Account" size="sm">
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"><p className="text-sm text-red-700 dark:text-red-300"><strong>Warning:</strong> This action is permanent and cannot be undone. All your data, chats, and settings will be deleted.</p></div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Type <strong>DELETE</strong> to confirm account deletion:</p>
          <Input value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} placeholder="Type DELETE" />
          <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setShowDeleteModal(false)}>Cancel</Button><Button variant="danger" onClick={handleDeleteAccount}>Delete Account</Button></div>
        </div>
      </Modal>
    </div>
  );
}
