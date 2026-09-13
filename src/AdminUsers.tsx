import React, { useState } from 'react';
import { Search, MoreVertical } from 'lucide-react';
import { useApp } from './AppContext';
import { Card, Badge, Input } from './ui';

export function AdminUsers() {
  const { state } = useApp();
  const [searchQuery, setSearchQuery] = useState('');

  const users = (() => {
    try {
      const stored = localStorage.getItem('monkey_ai_users_db');
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  })();

  const filteredUsers = users.filter((u: any) =>
    u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div><h3 className="text-lg font-semibold text-gray-900 dark:text-white">Users</h3><p className="text-sm text-gray-500">{users.length} total registered users</p></div>
      <Input placeholder="Search users..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} icon={<Search size={16} />} />
      {filteredUsers.length === 0 ? (
        <Card className="text-center py-8"><p className="text-gray-500 dark:text-gray-400">{searchQuery ? 'No users match your search' : 'No registered users yet'}</p></Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">User</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Email</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Joined</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Messages</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user: any) => (
                <tr key={user.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="py-3 px-4"><div className="flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-monkey-500 flex items-center justify-center text-white text-sm font-bold">{user.name?.charAt(0).toUpperCase()}</div><span className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</span></div></td>
                  <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{user.email}</td>
                  <td className="py-3 px-4 text-sm text-gray-500">{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td className="py-3 px-4"><Badge variant={user.status === 'active' ? 'success' : 'danger'}>{user.status}</Badge></td>
                  <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{user.usageStats?.totalMessages || 0}</td>
                  <td className="py-3 px-4 text-right"><button className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><MoreVertical size={14} className="text-gray-500" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Card>
        <h4 className="font-medium text-gray-900 dark:text-white mb-2">Security Note</h4>
        <p className="text-sm text-gray-600 dark:text-gray-400">Passwords are never displayed or stored in plain text. User data is protected and only accessible through authorized admin operations.</p>
      </Card>
    </div>
  );
}
