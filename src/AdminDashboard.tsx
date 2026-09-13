import React from 'react';
import { Users, MessageSquare, Cpu, TrendingUp, Activity, AlertTriangle } from 'lucide-react';
import { useApp } from './AppContext';
import { Card, Badge } from './ui';

export function AdminDashboard() {
  const { state } = useApp();

  const stats = [
    { label: 'Total Users', value: '0', icon: Users, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Total Chats', value: state.chats.length.toString(), icon: MessageSquare, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20' },
    { label: 'Total Messages', value: state.chats.reduce((acc, c) => acc + c.messages.length, 0).toString(), icon: Activity, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
    { label: 'AI Requests', value: state.chats.reduce((acc, c) => acc + c.messages.filter(m => m.role === 'assistant').length, 0).toString(), icon: Cpu, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20' },
    { label: 'Providers', value: state.providers.length.toString(), icon: TrendingUp, color: 'text-monkey-500', bg: 'bg-monkey-50 dark:bg-monkey-900/20' },
    { label: 'Models', value: state.models.length.toString(), icon: Cpu, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map(stat => (
          <Card key={stat.label} className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${stat.bg}`}><stat.icon size={24} className={stat.color} /></div>
            <div><p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p><p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p></div>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">System Status</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between"><span className="text-sm text-gray-600 dark:text-gray-400">Providers Configured</span><Badge variant={state.providers.length > 0 ? 'success' : 'warning'}>{state.providers.length > 0 ? `${state.providers.length} active` : 'None'}</Badge></div>
            <div className="flex items-center justify-between"><span className="text-sm text-gray-600 dark:text-gray-400">Models Available</span><Badge variant={state.models.filter(m => m.enabled).length > 0 ? 'success' : 'warning'}>{state.models.filter(m => m.enabled).length} enabled</Badge></div>
            <div className="flex items-center justify-between"><span className="text-sm text-gray-600 dark:text-gray-400">Model Groups</span><Badge variant={state.modelGroups.filter(g => g.enabled).length > 0 ? 'success' : 'info'}>{state.modelGroups.filter(g => g.enabled).length} active</Badge></div>
            <div className="flex items-center justify-between"><span className="text-sm text-gray-600 dark:text-gray-400">Features</span><Badge variant="success">{state.features.filter(f => f.enabled).length} enabled</Badge></div>
            <div className="flex items-center justify-between"><span className="text-sm text-gray-600 dark:text-gray-400">AI Rules</span><Badge variant="info">{state.rules.length} configured</Badge></div>
          </div>
        </Card>
        <Card>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
          <div className="space-y-2">
            {state.providers.length === 0 && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                <AlertTriangle size={18} className="text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div><p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">No providers configured</p><p className="text-xs text-yellow-600 dark:text-yellow-400 mt-0.5">Add an AI provider to enable chat functionality</p></div>
              </div>
            )}
            {state.models.length === 0 && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                <AlertTriangle size={18} className="text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div><p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">No models configured</p><p className="text-xs text-yellow-600 dark:text-yellow-400 mt-0.5">Add models to your providers for users to select</p></div>
              </div>
            )}
            {state.providers.length > 0 && state.models.length > 0 && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <span className="text-green-600 dark:text-green-400">✓</span>
                <div><p className="text-sm font-medium text-green-800 dark:text-green-300">System is operational</p><p className="text-xs text-green-600 dark:text-green-400 mt-0.5">Providers and models are configured and ready</p></div>
              </div>
            )}
          </div>
        </Card>
      </div>
      <Card>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Recent Chats</h3>
        {state.chats.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">No chats yet</p>
        ) : (
          <div className="space-y-2">
            {state.chats.slice(0, 5).map(chat => (
              <div key={chat.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                <div><p className="text-sm font-medium text-gray-900 dark:text-white">{chat.title}</p><p className="text-xs text-gray-500">{chat.messages.length} messages • {new Date(chat.updatedAt).toLocaleDateString()}</p></div>
                <Badge variant="info">{chat.messages.length} msgs</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
