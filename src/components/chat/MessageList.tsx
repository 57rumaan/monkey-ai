import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { cn, formatRelativeTime } from '@/lib/utils';
import { RefreshCw, Copy, Check, Paperclip, FileText, Image as ImageIcon, Pencil, Trash2, X, Save, ChevronUp, Loader2, GitBranch, SmilePlus, ThumbsUp, ThumbsDown, Heart, Laugh, Frown } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import type { Message, Attachment, MessageReaction } from '@/types';

const REACTION_EMOJIS = [
  { id: '👍', icon: ThumbsUp, label: 'Thumbs up' },
  { id: '❤️', icon: Heart, label: 'Heart' },
  { id: '😂', icon: Laugh, label: 'Laugh' },
  { id: '😮', icon: SmilePlus, label: 'Surprised' },
  { id: '😢', icon: Frown, label: 'Sad' },
  { id: '👎', icon: ThumbsDown, label: 'Thumbs down' },
];

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
  onRetry?: () => void;
  onEdit?: (messageId: string, newContent: string) => void;
  onDelete?: (messageId: string) => void;
  onCopy?: (content: string) => void;
  onBranch?: (messageId: string) => void;
  reactions?: MessageReaction[];
  onToggleReaction?: (messageId: string, emoji: string) => void;
}

function parseMarkdown(content: string): string {
  let result = content;

  result = result.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="prose-code"><code class="language-$1">$2</code></pre>');
  result = result.replace(/`([^`]+)`/g, '<code class="prose-inline-code">$1</code>');
  result = result.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  result = result.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  result = result.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  result = result.replace(/\*(.+?)\*/g, '<em>$1</em>');
  result = result.replace(/~~(.+?)~~/g, '<del>$1</del>');

  result = result.replace(/^- (.+)$/gm, '<li>$1</li>');
  result = result.replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>');
  result = result.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');

  result = result.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');
  result = result.replace(/((?:<blockquote>.*<\/blockquote>\n?)+)/g, (match) => {
    return match.replace(/<\/blockquote>\n?<blockquote>/g, '<br/>');
  });

  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="prose-link">$1</a>');

  result = result.replace(/^(?!<[hublod]|<\/|<li|<strong|<em|<del|<a|<code|<pre)(.+)$/gm, (match) => {
    if (match.trim() === '') return '';
    return `<p>${match}</p>`;
  });

  return result;
}

export function MessageBubble({ message, onRetry, onEdit, onDelete, onBranch, reactions = [], onToggleReaction }: MessageBubbleProps) {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const editRef = useRef<HTMLTextAreaElement>(null);
  const reactionPickerRef = useRef<HTMLDivElement>(null);

  const isUser = message.role === 'user';
  const isError = !!message.metadata?.error;

  const parsedContent = useMemo(() => {
    if (isUser) return null;
    return parseMarkdown(message.content);
  }, [message.content, isUser]);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    showToast('Copied to clipboard', { variant: 'success', duration: 2000 });
    setTimeout(() => setCopied(false), 2000);
  };

  const startEdit = () => {
    setEditContent(message.content);
    setIsEditing(true);
    setTimeout(() => editRef.current?.focus(), 50);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditContent(message.content);
  };

  const saveEdit = () => {
    const trimmed = editContent.trim();
    if (!trimmed) {
      showToast('Message cannot be empty', { variant: 'error' });
      return;
    }
    if (trimmed === message.content) {
      setIsEditing(false);
      return;
    }
    onEdit?.(message.id, trimmed);
    setIsEditing(false);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveEdit();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  };

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    onDelete?.(message.id);
    setConfirmDelete(false);
  };

  useEffect(() => {
    if (isEditing && editRef.current) {
      editRef.current.style.height = 'auto';
      editRef.current.style.height = `${editRef.current.scrollHeight}px`;
    }
  }, [isEditing, editContent]);

  useEffect(() => {
    if (!showReactionPicker) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (reactionPickerRef.current && !reactionPickerRef.current.contains(e.target as Node)) {
        setShowReactionPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showReactionPicker]);

  const groupedReactions = reactions.reduce<Record<string, MessageReaction[]>>((acc, r) => {
    if (!acc[r.emoji]) acc[r.emoji] = [];
    acc[r.emoji].push(r);
    return acc;
  }, {});

  return (
    <div className={cn('group flex gap-3 px-4 md:px-0', isUser && 'flex-row-reverse')}>
      {isUser ? (
        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-sm">
          <span className="text-xs font-semibold text-white">You</span>
        </div>
      ) : (
        <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-[var(--color-brand-500)] flex items-center justify-center">
          <span className="text-white text-xs font-bold">O</span>
        </div>
      )}

      <div className={cn('flex-1 min-w-0', isUser ? 'flex flex-col items-end' : 'max-w-3xl')}>
        {isUser && (
          <span className="text-[11px] font-medium text-[var(--color-content-tertiary)] mb-1 mr-1">You</span>
        )}
        <div
          className={cn(
            'relative rounded-2xl px-4 py-3',
            isUser
              ? 'bg-[var(--color-brand-500)] text-white rounded-br-md max-w-[85%]'
              : 'bg-[var(--color-surface-100)] dark:bg-[var(--color-surface-800)]/50 text-[var(--color-content-primary)] border border-[var(--color-border-default)]/50 rounded-bl-md'
          )}
        >
          {message.attachments?.length ? (
            <div className="mb-2.5 flex flex-wrap gap-2">
              {message.attachments.map(att => (
                <AttachmentPreview key={att.id} attachment={att} />
              ))}
            </div>
          ) : null}
          {isEditing ? (
            <div className="min-w-[200px]">
              <textarea
                ref={editRef}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={handleEditKeyDown}
                className={cn(
                  'w-full resize-none rounded-lg px-3 py-2 text-sm leading-relaxed',
                  'bg-white dark:bg-[var(--color-surface-900)] text-[var(--color-content-primary)]',
                  'border border-[var(--color-brand-500)]/30 dark:border-[var(--color-brand-500)]/40',
                  'focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]/20'
                )}
                rows={2}
              />
              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={saveEdit}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-brand-500)] text-white text-xs font-medium hover:bg-[var(--color-brand-700)] transition-colors"
                >
                  <Save className="h-3 w-3" />
                  Save
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-surface-100)] dark:bg-[var(--color-surface-700)] text-[var(--color-content-secondary)] text-xs font-medium hover:bg-[var(--color-surface-200)] dark:hover:bg-[var(--color-surface-600)] transition-colors"
                >
                  <X className="h-3 w-3" />
                  Cancel
                </button>
                <span className="text-[10px] text-[var(--color-content-tertiary)] ml-1">Enter to save, Esc to cancel</span>
              </div>
            </div>
          ) : (
            <div
              className={cn(
                'text-[14px] leading-relaxed',
                isUser ? 'text-white' : 'prose-chat prose-chat-sm'
              )}
              dangerouslySetInnerHTML={isUser ? undefined : { __html: parsedContent || '' }}
            >
              {isUser ? message.content : undefined}
            </div>
          )}
          {isError && (
            <div className="mt-2.5 p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-sm border border-red-200 dark:border-red-800/50">
              {message.metadata?.error}
            </div>
          )}
        </div>

        {Object.keys(groupedReactions).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5 px-1">
            {Object.entries(groupedReactions).map(([emoji, items]) => (
              <button
                key={emoji}
                type="button"
                onClick={() => onToggleReaction?.(message.id, emoji)}
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors',
                  items.some(r => r.userId === 'current')
                    ? 'bg-[var(--color-brand-50)] dark:bg-[var(--color-brand-950)]/50 border-[var(--color-brand-200)] dark:border-[var(--color-brand-800)] text-[var(--color-brand-700)] dark:text-[var(--color-brand-300)]'
                    : 'bg-[var(--color-surface-100)] dark:bg-[var(--color-surface-800)] border-[var(--color-border-default)] text-[var(--color-content-secondary)] hover:bg-[var(--color-surface-200)] dark:hover:bg-[var(--color-surface-700)]'
                )}
              >
                <span>{emoji}</span>
                <span className="font-medium">{items.length}</span>
              </button>
            ))}
          </div>
        )}

        <div className={cn('flex items-center gap-0.5 mt-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200', isUser && 'flex-row-reverse')}>
          {!isUser && (
            <>
              <button
                type="button"
                onClick={handleCopy}
                aria-label={copied ? 'Copied' : 'Copy message'}
                className={cn(
                  'inline-flex items-center justify-center h-7 w-7 rounded-md transition-colors',
                  'text-[var(--color-content-tertiary)] hover:text-[var(--color-content-secondary)] hover:bg-[var(--color-surface-100)] dark:hover:bg-[var(--color-surface-800)]'
                )}
              >
                {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  aria-label="Retry"
                  className={cn(
                    'inline-flex items-center justify-center h-7 w-7 rounded-md transition-colors',
                    'text-[var(--color-content-tertiary)] hover:text-[var(--color-content-secondary)] hover:bg-[var(--color-surface-100)] dark:hover:bg-[var(--color-surface-800)]'
                  )}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              )}
              {onBranch && (
                <button
                  type="button"
                  onClick={() => onBranch(message.id)}
                  aria-label="Branch from here"
                  className={cn(
                    'inline-flex items-center justify-center h-7 w-7 rounded-md transition-colors',
                    'text-[var(--color-content-tertiary)] hover:text-[var(--color-content-secondary)] hover:bg-[var(--color-surface-100)] dark:hover:bg-[var(--color-surface-800)]'
                  )}
                  title="Create a branch from this message"
                >
                  <GitBranch className="h-3.5 w-3.5" />
                </button>
              )}
            </>
          )}
          {!isUser && (
            <>
              <div className="relative" ref={reactionPickerRef}>
                <button
                  type="button"
                  onClick={() => setShowReactionPicker(!showReactionPicker)}
                  aria-label="Add reaction"
                  className={cn(
                    'inline-flex items-center justify-center h-7 w-7 rounded-md transition-colors',
                    'text-[var(--color-content-tertiary)] hover:text-[var(--color-content-secondary)] hover:bg-[var(--color-surface-100)] dark:hover:bg-[var(--color-surface-800)]'
                  )}
                >
                  <SmilePlus className="h-3.5 w-3.5" />
                </button>
                {showReactionPicker && (
                  <div className="absolute bottom-full left-0 mb-1 z-50 bg-white dark:bg-[var(--color-surface-900)] rounded-xl border border-[var(--color-border-default)] shadow-[var(--shadow-elevation-3)] py-1.5 px-1.5 flex gap-0.5">
                    {REACTION_EMOJIS.map(({ id, label }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => { onToggleReaction?.(message.id, id); setShowReactionPicker(false); }}
                        className="w-8 h-8 flex items-center justify-center rounded-[var(--radius)] hover:bg-[var(--color-surface-100)] dark:hover:bg-[var(--color-surface-800)] text-lg transition-colors"
                        title={label}
                      >
                        {id}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={handleDelete}
                aria-label={confirmDelete ? 'Confirm delete' : 'Delete message'}
                className={cn(
                  'inline-flex items-center justify-center h-7 w-7 rounded-md transition-colors',
                  confirmDelete
                    ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40'
                    : 'text-[var(--color-content-tertiary)] hover:text-[var(--color-state-error)] hover:bg-red-50 dark:hover:bg-red-950/40'
                )}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              {confirmDelete && (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="text-[11px] text-[var(--color-content-tertiary)] hover:text-[var(--color-content-secondary)]"
                >
                  Cancel
                </button>
              )}
            </>
          )}
          {isUser && !isEditing && (
            <>
              <button
                type="button"
                onClick={startEdit}
                aria-label="Edit message"
                className={cn(
                  'inline-flex items-center justify-center h-7 w-7 rounded-md transition-colors',
                  'text-[var(--color-content-tertiary)] hover:text-[var(--color-content-secondary)] hover:bg-[var(--color-surface-100)] dark:hover:bg-[var(--color-surface-800)]'
                )}
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={handleDelete}
                aria-label={confirmDelete ? 'Confirm delete' : 'Delete message'}
                className={cn(
                  'inline-flex items-center justify-center h-7 w-7 rounded-md transition-colors',
                  confirmDelete
                    ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40'
                    : 'text-[var(--color-content-tertiary)] hover:text-[var(--color-state-error)] hover:bg-red-50 dark:hover:bg-red-950/40'
                )}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </>
          )}
          {confirmDelete && isUser && (
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="text-[11px] text-[var(--color-content-tertiary)] hover:text-[var(--color-content-secondary)]"
            >
              Cancel
            </button>
          )}
          <span className="text-[11px] text-[var(--color-content-tertiary)] select-none ml-1">{formatRelativeTime(message.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}

function AttachmentPreview({ attachment }: { attachment: Attachment }) {
  const isImage = attachment.type === 'image';

  if (isImage) {
    return (
      <div className="relative rounded-xl overflow-hidden border border-[var(--color-border-default)] bg-[var(--color-surface-100)] dark:bg-[var(--color-surface-800)]">
        <img src={attachment.url} alt={attachment.name} className="h-32 w-auto object-cover" />
        <div className="absolute bottom-0 left-0 right-0 px-2.5 py-1.5 bg-gradient-to-t from-black/60 to-transparent text-white text-xs truncate">
          {attachment.name}
        </div>
      </div>
    );
  }

  const iconMap: Record<string, React.ReactNode> = {
    document: <FileText className="h-4 w-4" />,
    image: <ImageIcon className="h-4 w-4" />,
    audio: <Paperclip className="h-4 w-4" />,
    video: <Paperclip className="h-4 w-4" />,
    file: <Paperclip className="h-4 w-4" />,
  };

  return (
    <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-100)] dark:bg-[var(--color-surface-800)]/50">
      <div className="flex-shrink-0 h-9 w-9 rounded-lg bg-[var(--color-surface-200)] dark:bg-[var(--color-surface-700)] flex items-center justify-center text-[var(--color-content-tertiary)]">
        {iconMap[attachment.type] || <Paperclip className="h-4 w-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--color-content-primary)] truncate">{attachment.name}</p>
        <p className="text-xs text-[var(--color-content-tertiary)]">{(attachment.size / 1024).toFixed(1)} KB</p>
      </div>
    </div>
  );
}

interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
  isLoadingOlder?: boolean;
  hasOlderMessages?: boolean;
  onLoadOlder?: () => void;
  onRetry?: (messageId: string) => void;
  onEdit?: (messageId: string, newContent: string) => void;
  onDelete?: (messageId: string) => void;
  onBranch?: (messageId: string) => void;
  onCopy?: (content: string) => void;
}

export function MessageList({ messages, isLoading, isLoadingOlder, hasOlderMessages, onLoadOlder, onRetry, onEdit, onDelete, onBranch, onCopy }: MessageListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const userScrolledUpRef = useRef(false);
  const lastMessageCountRef = useRef(messages.length);
  const [reactionsMap, setReactionsMap] = useState<Record<string, MessageReaction[]>>({});

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (listRef.current && !userScrolledUpRef.current) {
      listRef.current.scrollTo({ top: listRef.current.scrollHeight, behavior });
    }
  }, []);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;

    const handleScroll = () => {
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      userScrolledUpRef.current = distanceFromBottom > 60;
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const newCount = messages.length;
    const oldCount = lastMessageCountRef.current;
    lastMessageCountRef.current = newCount;

    if (newCount > oldCount) {
      userScrolledUpRef.current = false;
      requestAnimationFrame(() => scrollToBottom('smooth'));
    }
  }, [messages.length, scrollToBottom]);

  useEffect(() => {
    if (isLoading) {
      userScrolledUpRef.current = false;
      scrollToBottom('smooth');
    }
  }, [isLoading, scrollToBottom]);

  useEffect(() => {
    if (messages.length > 0) {
      const last = messages[messages.length - 1];
      if (last.role === 'assistant' && !isLoading) {
        scrollToBottom('smooth');
      }
    }
  }, [messages, isLoading, scrollToBottom]);

  useEffect(() => {
    const assistantMessages = messages.filter(m => m.role === 'assistant' && m.id !== 'streaming');
    for (const msg of assistantMessages) {
      if (!reactionsMap[msg.id]) {
        fetch(`/api/chat/messages/${msg.id}/reactions`, { credentials: 'include' })
          .then(r => r.json())
          .then(data => {
            if (data.success) {
              setReactionsMap(prev => ({ ...prev, [msg.id]: data.data }));
            }
          })
          .catch(() => {});
      }
    }
  }, [messages, reactionsMap]);

  const handleToggleReaction = useCallback(async (messageId: string, emoji: string) => {
    try {
      const response = await fetch(`/api/chat/messages/${messageId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ emoji }),
      });
      const data = await response.json();
      if (data.success) {
        setReactionsMap(prev => ({
          ...prev,
          [messageId]: data.data,
        }));
      }
    } catch {}
  }, []);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="flex flex-col items-center text-center max-w-md">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-[var(--color-brand-500)]/10 to-[var(--color-brand-700)]/10 dark:from-[var(--color-brand-500)]/20 dark:to-[var(--color-brand-700)]/20 flex items-center justify-center mb-5 border border-[var(--color-brand-100)] dark:border-[var(--color-brand-800)]/50">
            <span className="text-[var(--color-brand-500)] text-2xl font-bold">O</span>
          </div>
          <h3 className="text-lg font-semibold text-[var(--color-content-primary)] mb-1.5">Start a conversation</h3>
          <p className="text-sm text-[var(--color-content-tertiary)] leading-relaxed">
            Ask anything — I can help with writing, analysis, coding, math, and more.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={listRef}
      className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-6"
      role="log"
      aria-live="polite"
      aria-label="Chat messages"
    >
      {hasOlderMessages && (
        <div className="flex justify-center py-2">
          {isLoadingOlder ? (
            <div className="flex items-center gap-2 text-sm text-[var(--color-content-tertiary)]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading older messages...
            </div>
          ) : (
            <button
              type="button"
              onClick={onLoadOlder}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm text-[var(--color-content-secondary)] hover:text-[var(--color-content-primary)] bg-[var(--color-surface-100)] dark:bg-[var(--color-surface-800)] hover:bg-[var(--color-surface-200)] dark:hover:bg-[var(--color-surface-700)] border border-[var(--color-border-default)] transition-colors"
            >
              <ChevronUp className="h-3.5 w-3.5" />
              Load older messages
            </button>
          )}
        </div>
      )}
      {messages.map(message => (
        <MessageBubble
          key={message.id}
          message={message}
          isStreaming={isLoading}
          onRetry={onRetry ? () => onRetry(message.id) : undefined}
          onEdit={onEdit}
          onDelete={onDelete}
          onBranch={onBranch}
          onCopy={onCopy}
          reactions={reactionsMap[message.id] || []}
          onToggleReaction={handleToggleReaction}
        />
      ))}
      {isLoading && (
        <div className="flex gap-3 px-4 md:px-0 animate-in fade-in duration-300">
          <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-[var(--color-brand-500)] flex items-center justify-center animate-pulse">
            <span className="text-white text-xs font-bold">O</span>
          </div>
          <div className="flex-1 max-w-3xl pt-1">
            <div className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[var(--color-surface-100)] dark:bg-[var(--color-surface-800)]/50 border border-[var(--color-border-default)]/50 rounded-bl-md">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-brand-500)] animate-bounce [animation-delay:0ms]" />
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-brand-500)] animate-bounce [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-brand-500)] animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
