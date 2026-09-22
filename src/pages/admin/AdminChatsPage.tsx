import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MessageSquare, Search, User, ArrowLeft, Bot, FileText } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatRelativeTime } from '@/lib/utils';

interface ChatItem {
  id: string;
  userId: string;
  bundleId: string;
  title: string;
  pinned?: boolean;
  folderId?: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

interface Message {
  id: string;
  chatId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  capability?: string;
  attachments?: Array<{ id: string; type: string; name: string }>;
  metadata?: {
    modelUsed?: string;
    providerUsed?: string;
    tokensUsed?: number;
    usage?: {
      promptTokens?: number;
      completionTokens?: number;
      totalTokens?: number;
    };
    latencyMs?: number;
    error?: string;
  };
  createdAt: string;
}

interface ChatDetail {
  chat: ChatItem;
  messages: Message[];
}

interface PaginatedChats {
  items: ChatItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

async function fetchChats(params: { search: string; userId: string; page: number }): Promise<PaginatedChats> {
  const searchParams = new URLSearchParams();
  if (params.search) searchParams.set('search', params.search);
  if (params.userId) searchParams.set('userId', params.userId);
  searchParams.set('page', String(params.page));
  searchParams.set('pageSize', '20');

  const response = await fetch(`/api/admin/chats?${searchParams.toString()}`, { credentials: 'include' });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch chats');
  return data.data;
}

async function fetchChatDetail(chatId: string): Promise<ChatDetail> {
  const response = await fetch(`/api/admin/chats/${chatId}`, { credentials: 'include' });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch chat');
  return data.data;
}

export function AdminChatsPage() {
  const [search, setSearch] = useState('');
  const [userIdFilter, setUserIdFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);

  const { data: chatsData, isLoading } = useQuery({
    queryKey: ['admin-chats', search, userIdFilter, page],
    queryFn: () => fetchChats({ search, userId: userIdFilter, page }),
  });

  const { data: chatDetail, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['admin-chat-detail', selectedChatId],
    queryFn: () => fetchChatDetail(selectedChatId!),
    enabled: !!selectedChatId,
  });

  if (selectedChatId) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon-sm" onClick={() => setSelectedChatId(null)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-[var(--color-content-primary)]">
              {isLoadingDetail ? 'Loading...' : chatDetail?.chat.title || 'Chat'}
            </h1>
            <p className="text-sm text-[var(--color-content-tertiary)] mt-1">
              Chat detail and messages
            </p>
          </div>
        </div>

        {isLoadingDetail ? (
          <Card>
            <CardContent className="h-64">
              <div className="h-full rounded-lg bg-[var(--color-surface-100)] dark:bg-[var(--color-surface-800)] animate-pulse" />
            </CardContent>
          </Card>
        ) : chatDetail ? (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-[var(--color-content-primary)]">Chat Info</h2>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-[var(--color-content-tertiary)]">Chat ID</p>
                    <p className="text-sm font-medium text-[var(--color-content-primary)] font-mono text-sm">{chatDetail.chat.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--color-content-tertiary)]">User ID</p>
                    <p className="text-sm font-medium text-[var(--color-content-primary)] font-mono text-sm">{chatDetail.chat.userId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--color-content-tertiary)]">Bundle ID</p>
                    <p className="text-sm font-medium text-[var(--color-content-primary)] font-mono text-sm">{chatDetail.chat.bundleId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--color-content-tertiary)]">Messages</p>
                    <p className="text-sm font-medium text-[var(--color-content-primary)]">{chatDetail.messages.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--color-content-tertiary)]">Created</p>
                    <p className="text-sm font-medium text-[var(--color-content-primary)]">{formatRelativeTime(chatDetail.chat.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--color-content-tertiary)]">Updated</p>
                    <p className="text-sm font-medium text-[var(--color-content-primary)]">{formatRelativeTime(chatDetail.chat.updatedAt)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-[var(--color-content-primary)]">Messages</h2>
              </CardHeader>
              <CardContent>
                {chatDetail.messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="h-12 w-12 rounded-full bg-[var(--color-surface-100)] dark:bg-[var(--color-surface-800)] flex items-center justify-center mb-3">
                      <FileText className="h-6 w-6 text-[var(--color-content-tertiary)]" />
                    </div>
                    <p className="text-sm text-[var(--color-content-tertiary)]">No messages in this chat</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[600px] overflow-y-auto">
                    {chatDetail.messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-4 rounded-lg ${
                          msg.role === 'user'
                            ? 'bg-[var(--color-brand-50)] dark:bg-[var(--color-brand-900)]/20 border border-[var(--color-brand-200)] dark:border-[var(--color-brand-800)]'
                            : 'bg-[var(--color-surface-50)] dark:bg-[var(--color-surface-800)]/50 border border-[var(--color-border-default)]'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          {msg.role === 'user' ? (
                            <User className="h-4 w-4 text-[var(--color-brand-500)] dark:text-[var(--color-brand-400)]" />
                          ) : (
                            <Bot className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          )}
                          <span className="text-sm font-medium text-[var(--color-content-primary)] capitalize">{msg.role}</span>
                          <span className="text-xs text-[var(--color-content-tertiary)]">· {formatRelativeTime(msg.createdAt)}</span>
                          {msg.capability && (
                            <Badge variant="primary" size="xs">{msg.capability}</Badge>
                          )}
                        </div>
                        <p className="text-sm text-[var(--color-content-primary)] whitespace-pre-wrap">{msg.content}</p>
                        {msg.metadata && (
                          <div className="mt-3 pt-3 border-t border-[var(--color-border-default)] flex flex-wrap gap-4 text-xs text-[var(--color-content-tertiary)]">
                            {msg.metadata.modelUsed && (
                              <span>Model: <strong className="text-[var(--color-content-secondary)]">{msg.metadata.modelUsed}</strong></span>
                            )}
                            {msg.metadata.providerUsed && (
                              <span>Provider: <strong className="text-[var(--color-content-secondary)]">{msg.metadata.providerUsed}</strong></span>
                            )}
                            {msg.metadata.tokensUsed && (
                              <span>Tokens: <strong className="text-[var(--color-content-secondary)]">{msg.metadata.tokensUsed.toLocaleString()}</strong></span>
                            )}
                            {msg.metadata.usage && (
                              <span>
                                ({msg.metadata.usage.promptTokens || 0} prompt + {msg.metadata.usage.completionTokens || 0} completion)
                              </span>
                            )}
                            {msg.metadata.latencyMs && (
                              <span>Latency: <strong className="text-[var(--color-content-secondary)]">{msg.metadata.latencyMs}ms</strong></span>
                            )}
                            {msg.metadata.error && (
                              <span className="text-error-600 dark:text-error-400">Error: {msg.metadata.error}</span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--color-content-primary)]">Chats</h1>
        <p className="text-sm text-[var(--color-content-tertiary)] mt-1">View and manage all user chats</p>
      </div>

      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-content-tertiary)]" />
                <input
                  type="text"
                  placeholder="Search chat titles..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-50)] dark:bg-[var(--color-surface-900)] text-[var(--color-content-primary)] placeholder:text-[var(--color-content-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]/20 focus:border-[var(--color-brand-500)]"
                />
              </div>
            </div>
            <div className="w-full sm:w-64">
              <input
                type="text"
                placeholder="Filter by User ID..."
                value={userIdFilter}
                onChange={(e) => { setUserIdFilter(e.target.value); setPage(1); }}
                className="w-full px-4 py-2 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-50)] dark:bg-[var(--color-surface-900)] text-[var(--color-content-primary)] placeholder:text-[var(--color-content-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]/20 focus:border-[var(--color-brand-500)]"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-[var(--color-content-primary)] flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-[var(--color-content-tertiary)]" />
            All Chats
            {chatsData && (
              <Badge variant="neutral" size="sm">{chatsData.total}</Badge>
            )}
          </h2>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 rounded-lg bg-[var(--color-surface-100)] dark:bg-[var(--color-surface-800)] animate-pulse" />
              ))}
            </div>
          ) : !chatsData?.items.length ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="h-12 w-12 rounded-full bg-[var(--color-surface-100)] dark:bg-[var(--color-surface-800)] flex items-center justify-center mb-3">
                <MessageSquare className="h-6 w-6 text-[var(--color-content-tertiary)]" />
              </div>
              <p className="text-sm text-[var(--color-content-tertiary)]">No chats found</p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-border-default">
                {chatsData.items.map((chat) => (
                  <div
                    key={chat.id}
                    className="flex items-center gap-4 p-4 hover:bg-[var(--color-surface-50)] dark:hover:bg-[var(--color-surface-800)]/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedChatId(chat.id)}
                  >
                    <div className="h-10 w-10 rounded-lg bg-[var(--color-brand-100)] dark:bg-[var(--color-brand-900)] flex items-center justify-center flex-shrink-0">
                      <MessageSquare className="h-5 w-5 text-[var(--color-brand-500)] dark:text-[var(--color-brand-400)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--color-content-primary)] truncate">{chat.title}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-[var(--color-content-tertiary)] font-mono">{chat.userId.slice(0, 12)}...</span>
                        <span className="text-xs text-[var(--color-content-tertiary)]">·</span>
                        <span className="text-xs text-[var(--color-content-tertiary)]">{chat.messageCount} messages</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-[var(--color-content-tertiary)]">{formatRelativeTime(chat.updatedAt)}</p>
                      {chat.pinned && (
                        <Badge variant="warning" size="xs" className="mt-1">Pinned</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {chatsData.totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-[var(--color-border-default)]">
                  <p className="text-sm text-[var(--color-content-tertiary)]">
                    Page {chatsData.page} of {chatsData.totalPages} ({chatsData.total} total)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage(p => p - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={page >= chatsData.totalPages}
                      onClick={() => setPage(p => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
