import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useChats } from '@/features/chat/hooks/useChats';
import { Input, Badge } from '@/components/ui-new';
import { SearchIcon, MessageIcon, FolderIcon, ChevronRightIcon, ClockIcon } from '@/components/ui-new';

export function SearchView() {
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'chats' | 'projects'>('all');
  const { data: chats = [] } = useChats();

  const filtered = chats.filter(r => {
    if (!query) return true;
    return r.title.toLowerCase().includes(query.toLowerCase());
  }).filter(r => {
    if (activeFilter === 'projects') return !!r.folderId;
    return true;
  });

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto px-6 py-6">
      <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">Search</h2>

      <Input
        leftIcon={<SearchIcon />}
        placeholder="Search conversations, messages, files..."
        value={query}
        onChange={e => setQuery(e.target.value)}
        autoFocus
        className="mb-4"
      />

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {(['all', 'chats', 'projects'] as const).map(f => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={cn(
              'px-3 py-1.5 rounded-[var(--radius)] text-sm transition-colors capitalize',
              activeFilter === f ? 'bg-[var(--primary)] text-white' : 'bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {!query && (
        <div className="mb-6">
          <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">Recent searches</p>
          <div className="flex flex-col gap-1">
            {['React reconciliation', 'Python async patterns', 'Cover letter tips', 'SQL window functions'].map(s => (
              <button key={s} onClick={() => setQuery(s)} className="flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius)] text-sm text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors text-left">
                <ClockIcon />
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {query && (
        <p className="text-xs text-[var(--muted-foreground)] mb-3">{filtered.length} result{filtered.length !== 1 ? 's' : ''} for "{query}"</p>
      )}

      <div className="flex flex-col gap-2">
        {filtered.map(r => (
          <button key={r.id} className={cn(
            'flex items-start gap-3 p-4 rounded-[var(--radius-lg)] border bg-[var(--card)] hover:border-[var(--primary)]/40 hover:shadow-sm transition-all text-left',
            'border-[var(--border)]'
          )}>
            <div className="text-[var(--muted-foreground)] mt-0.5 flex-shrink-0">
              {r.folderId ? <FolderIcon /> : <MessageIcon />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-[var(--foreground)] truncate">{r.title || 'Untitled'}</span>
                {r.folderId && <Badge variant="muted">Project</Badge>}
              </div>
              <p className="text-xs text-[var(--muted-foreground)] line-clamp-2 leading-relaxed">{r.preview || 'No preview available'}</p>
              <div className="flex items-center gap-3 mt-2 text-xs text-[var(--muted-foreground)]">
                <span>{new Date(r.updatedAt).toLocaleDateString()}</span>
                <span>·</span>
                <span>{r.bundleId || 'Unknown model'}</span>
              </div>
            </div>
            <ChevronRightIcon />
          </button>
        ))}
        {filtered.length === 0 && query && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-4xl mb-3">🔍</div>
            <p className="font-medium text-[var(--foreground)]">No results for "{query}"</p>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">Try different keywords or filters</p>
          </div>
        )}
        {filtered.length === 0 && !query && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-4xl mb-3">💬</div>
            <p className="font-medium text-[var(--foreground)]">No chats yet</p>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">Start a conversation to see results here</p>
          </div>
        )}
      </div>
    </div>
  );
}