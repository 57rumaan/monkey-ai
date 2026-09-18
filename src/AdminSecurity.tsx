import React, { useState } from 'react';
import { Shield, Lock, AlertTriangle } from 'lucide-react';
import { useApp } from './AppContext';
import { Button, Input, Card } from './ui';

export function AdminSecurity() {
  const { addToast } = useApp();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) { addToast('error', 'All fields are required'); return; }
    if (newPassword !== confirmPassword) { addToast('error', 'New passwords do not match'); return; }
    if (newPassword.length < 8) { addToast('error', 'Password must be at least 8 characters'); return; }
    if (currentPassword !== 'rumaan12') { addToast('error', 'Current password is incorrect'); return; }
    addToast('success', 'Password changed successfully. Note: In production, this updates server-side credentials.');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div><h3 className="text-lg font-semibold text-gray-900 dark:text-white">Security Settings</h3><p className="text-sm text-gray-500">Manage admin security and credentials</p></div>
      <Card>
        <div className="flex items-center gap-3 mb-4"><div className="p-2 rounded-lg bg-monkey-500/10"><Lock size={20} className="text-monkey-500" /></div><div><h4 className="font-medium text-gray-900 dark:text-white">Change Admin Password</h4><p className="text-xs text-gray-500">Update your admin access credentials</p></div></div>
        <div className="space-y-3">
          <Input label="Current Password" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Enter current password" />
          <Input label="New Password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Enter new password (min 8 chars)" />
          <Input label="Confirm New Password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirm new password" />
          <Button onClick={handleChangePassword}>Update Password</Button>
        </div>
      </Card>
      <Card>
        <div className="flex items-center gap-3 mb-4"><div className="p-2 rounded-lg bg-blue-500/10"><Shield size={20} className="text-blue-500" /></div><div><h4 className="font-medium text-gray-900 dark:text-white">Security Information</h4><p className="text-xs text-gray-500">Platform security overview</p></div></div>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700"><span className="text-sm text-gray-600 dark:text-gray-400">Admin Authentication</span><span className="text-sm text-green-500 font-medium">✓ Active</span></div>
          <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700"><span className="text-sm text-gray-600 dark:text-gray-400">API Key Protection</span><span className="text-sm text-green-500 font-medium">✓ Server-side only</span></div>
          <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700"><span className="text-sm text-gray-600 dark:text-gray-400">User Data Isolation</span><span className="text-sm text-green-500 font-medium">✓ Enforced</span></div>
          <div className="flex items-center justify-between py-2"><span className="text-sm text-gray-600 dark:text-gray-400">Rate Limiting</span><span className="text-sm text-yellow-500 font-medium">⚠ Configure in production</span></div>
        </div>
      </Card>
      <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
        <div className="flex items-start gap-3">
          <AlertTriangle size={20} className="text-yellow-600 dark:text-yellow-400 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Production Security</p>
            <ul className="text-xs text-yellow-700 dark:text-yellow-400 mt-1 space-y-1">
              <li>• Change default admin credentials before deploying</li>
              <li>• Use environment variables for all secrets</li>
              <li>• Enable HTTPS in production</li>
              <li>• Configure proper CORS settings</li>
              <li>• Set up rate limiting on API endpoints</li>
              <li>• Regular security audits recommended</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
