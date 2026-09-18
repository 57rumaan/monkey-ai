import { useQuery } from '@tanstack/react-query';
import { Users, Server, Box, MessageSquare, TrendingUp, Activity, CheckCircle2, HardDrive, Key, ShieldCheck } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatRelativeTime } from '@/lib/utils';
import { cn } from '@/lib/utils';

async function fetchStats() {
  const response = await fetch('/api/admin/stats', { credentials: 'include' });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch stats');
  return data.data;
}

async function fetchRecentActivity() {
  const response = await fetch('/api/admin/audit-logs?limit=10', { credentials: 'include' });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch activity');
  return data.data;
}

export function AdminDashboardPage() {
  const { data: stats, isLoading } = useQuery({ queryKey: ['admin-stats'], queryFn: fetchStats });
  const { data: activity = [] } = useQuery({ queryKey: ['admin-activity'], queryFn: fetchRecentActivity });

  const statCards = [
    { label: 'Total Users', value: stats?.users || 0, icon: Users, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300', ring: 'ring-blue-500/20' },
    { label: 'Providers', value: stats?.providers || 0, icon: Server, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300', ring: 'ring-emerald-500/20' },
    { label: 'Bundles', value: stats?.bundles || 0, icon: Box, color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300', ring: 'ring-purple-500/20' },
    { label: 'Chats', value: stats?.chats || 0, icon: MessageSquare, color: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300', ring: 'ring-orange-500/20' },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="h-28">
                <div className="h-full rounded-lg bg-surface-100 dark:bg-surface-800 animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {[...Array(2)].map((_, i) => (
            <Card key={i}>
              <CardContent className="h-64">
                <div className="h-full rounded-lg bg-surface-100 dark:bg-surface-800 animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-heading-xl font-bold text-content-primary">Dashboard</h1>
        <p className="text-body text-content-tertiary mt-1">Overview of your MONKEY AI instance</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map(({ label, value, icon: Icon, color, ring }) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-4 py-5">
              <div className={cn('h-12 w-12 rounded-xl flex items-center justify-center ring-1', color, ring)}>
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-content-primary tracking-tight">{value.toLocaleString()}</p>
                <p className="text-body-sm text-content-tertiary font-medium">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="text-heading-md font-semibold text-content-primary flex items-center gap-2">
              <Activity className="h-5 w-5 text-content-tertiary" /> Recent Activity
            </h2>
          </CardHeader>
          <CardContent>
            {activity.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="h-12 w-12 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center mb-3">
                  <Activity className="h-6 w-6 text-content-tertiary" />
                </div>
                <p className="text-body text-content-tertiary">No recent activity</p>
              </div>
            ) : (
              <div className="space-y-1">
                {activity.map((log: any) => (
                  <div key={log.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                    <div className="h-8 w-8 rounded-full bg-brand-100 dark:bg-brand-900 flex items-center justify-center flex-shrink-0">
                      <TrendingUp className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-body font-medium text-content-primary truncate">{log.action}</p>
                      <p className="text-body-sm text-content-tertiary truncate">{log.details || ''}</p>
                    </div>
                    <span className="text-body-xs text-content-tertiary whitespace-nowrap">{formatRelativeTime(log.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-heading-md font-semibold text-content-primary flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-content-tertiary" /> System Status
            </h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-surface-50 dark:bg-surface-800/50">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                    <Server className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-body font-medium text-content-primary">API Status</p>
                    <p className="text-body-xs text-content-tertiary">All provider APIs operational</p>
                  </div>
                </div>
                <Badge variant="success">Healthy</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-surface-50 dark:bg-surface-800/50">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                    <HardDrive className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-body font-medium text-content-primary">Storage</p>
                    <p className="text-body-xs text-content-tertiary">Local storage active</p>
                  </div>
                </div>
                <Badge variant="success">Connected</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-surface-50 dark:bg-surface-800/50">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                    <Key className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-body font-medium text-content-primary">Authentication</p>
                    <p className="text-body-xs text-content-tertiary">JWT + HttpOnly cookies</p>
                  </div>
                </div>
                <Badge variant="success">Secured</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-surface-50 dark:bg-surface-800/50">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
                    <ShieldCheck className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="text-body font-medium text-content-primary">Rate Limiting</p>
                    <p className="text-body-xs text-content-tertiary">Active on all endpoints</p>
                  </div>
                </div>
                <Badge variant="success">Enabled</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
