import { useQuery } from '@tanstack/react-query';
import { BarChart3, Coins, User, Bot, MessageSquare } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';

interface UsageTotal {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  messagesWithUsage: number;
  totalMessages: number;
}

interface ModelUsage {
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  count: number;
}

interface UserUsage {
  userId: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  count: number;
}

interface DailyUsage {
  date: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

interface UsageData {
  total: UsageTotal;
  byModel: ModelUsage[];
  byUser: UserUsage[];
  byDay: DailyUsage[];
}

async function fetchUsage(): Promise<UsageData> {
  const response = await fetch('/api/admin/usage', { credentials: 'include' });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch usage');
  return data.data;
}

function formatTokens(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

export function AdminUsagePage() {
  const { data: usage, isLoading, error } = useQuery({
    queryKey: ['admin-usage'],
    queryFn: fetchUsage,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-heading-xl font-bold text-content-primary">Usage Analytics</h1>
          <p className="text-body text-content-tertiary mt-1">Token usage and consumption metrics</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="h-28">
                <div className="h-full rounded-lg bg-surface-100 dark:bg-surface-800 animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-heading-xl font-bold text-content-primary">Usage Analytics</h1>
          <p className="text-body text-content-tertiary mt-1">Token usage and consumption metrics</p>
        </div>
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center">
              <p className="text-body text-error-600 dark:text-error-400">Failed to load usage data</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasData = usage && usage.total.totalTokens > 0;
  const maxModelTokens = usage?.byModel.length ? Math.max(...usage.byModel.map(m => m.totalTokens)) : 1;
  const maxUserTokens = usage?.byUser.length ? Math.max(...usage.byUser.map(u => u.totalTokens)) : 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-heading-xl font-bold text-content-primary">Usage Analytics</h1>
        <p className="text-body text-content-tertiary mt-1">Token usage and consumption metrics</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-elevation-2 transition-shadow">
          <CardContent className="flex items-center gap-4 py-5">
            <div className="h-12 w-12 rounded-xl bg-violet-100 dark:bg-violet-900 flex items-center justify-center">
              <Coins className="h-6 w-6 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-content-primary tracking-tight">{formatTokens(usage?.total.totalTokens || 0)}</p>
              <p className="text-body-sm text-content-tertiary font-medium">Total Tokens</p>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-elevation-2 transition-shadow">
          <CardContent className="flex items-center gap-4 py-5">
            <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
              <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-content-primary tracking-tight">{formatTokens(usage?.total.promptTokens || 0)}</p>
              <p className="text-body-sm text-content-tertiary font-medium">Prompt Tokens</p>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-elevation-2 transition-shadow">
          <CardContent className="flex items-center gap-4 py-5">
            <div className="h-12 w-12 rounded-xl bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
              <Bot className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-content-primary tracking-tight">{formatTokens(usage?.total.completionTokens || 0)}</p>
              <p className="text-body-sm text-content-tertiary font-medium">Completion Tokens</p>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-elevation-2 transition-shadow">
          <CardContent className="flex items-center gap-4 py-5">
            <div className="h-12 w-12 rounded-xl bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
              <MessageSquare className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-content-primary tracking-tight">{(usage?.total.messagesWithUsage || 0).toLocaleString()}</p>
              <p className="text-body-sm text-content-tertiary font-medium">Messages with Usage</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {!hasData ? (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center">
              <div className="h-12 w-12 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center mb-3">
                <BarChart3 className="h-6 w-6 text-content-tertiary" />
              </div>
              <p className="text-body text-content-tertiary">No usage data yet</p>
              <p className="text-body-sm text-content-tertiary mt-1">Usage will appear here after messages with token data are sent</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <h2 className="text-heading-md font-semibold text-content-primary">Usage by Model</h2>
            </CardHeader>
            <CardContent>
              {usage.byModel.length === 0 ? (
                <p className="text-body-sm text-content-tertiary py-4 text-center">No model data available</p>
              ) : (
                <div className="space-y-4">
                  {usage.byModel.map((item) => (
                    <div key={item.model}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-body-sm font-medium text-content-primary">{item.model}</span>
                        <span className="text-body-xs text-content-tertiary">{formatTokens(item.totalTokens)} tokens · {item.count} msgs</span>
                      </div>
                      <div className="h-2 rounded-full bg-surface-100 dark:bg-surface-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-brand-500 transition-all"
                          style={{ width: `${(item.totalTokens / maxModelTokens) * 100}%` }}
                        />
                      </div>
                      <div className="flex gap-4 mt-1 text-body-xs text-content-tertiary">
                        <span>Prompt: {formatTokens(item.promptTokens)}</span>
                        <span>Completion: {formatTokens(item.completionTokens)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-heading-md font-semibold text-content-primary">Usage by User</h2>
            </CardHeader>
            <CardContent>
              {usage.byUser.length === 0 ? (
                <p className="text-body-sm text-content-tertiary py-4 text-center">No user data available</p>
              ) : (
                <div className="space-y-4">
                  {usage.byUser.slice(0, 10).map((item) => (
                    <div key={item.userId}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-body-sm font-medium text-content-primary font-mono text-xs">{item.userId.slice(0, 16)}...</span>
                        <span className="text-body-xs text-content-tertiary">{formatTokens(item.totalTokens)} tokens · {item.count} msgs</span>
                      </div>
                      <div className="h-2 rounded-full bg-surface-100 dark:bg-surface-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all"
                          style={{ width: `${(item.totalTokens / maxUserTokens) * 100}%` }}
                        />
                      </div>
                      <div className="flex gap-4 mt-1 text-body-xs text-content-tertiary">
                        <span>Prompt: {formatTokens(item.promptTokens)}</span>
                        <span>Completion: {formatTokens(item.completionTokens)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <h2 className="text-heading-md font-semibold text-content-primary">Usage Over Time</h2>
            </CardHeader>
            <CardContent>
              {usage.byDay.length === 0 ? (
                <p className="text-body-sm text-content-tertiary py-4 text-center">No daily data available</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-body-sm">
                    <thead>
                      <tr className="border-b border-border-default">
                        <th className="text-left py-2 text-content-tertiary font-medium">Date</th>
                        <th className="text-right py-2 text-content-tertiary font-medium">Prompt</th>
                        <th className="text-right py-2 text-content-tertiary font-medium">Completion</th>
                        <th className="text-right py-2 text-content-tertiary font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usage.byDay.slice(-14).reverse().map((day) => (
                        <tr key={day.date} className="border-b border-border-default last:border-0">
                          <td className="py-2 text-content-primary font-medium">{day.date}</td>
                          <td className="py-2 text-content-secondary text-right">{formatTokens(day.promptTokens)}</td>
                          <td className="py-2 text-content-secondary text-right">{formatTokens(day.completionTokens)}</td>
                          <td className="py-2 text-content-primary font-medium text-right">{formatTokens(day.totalTokens)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
