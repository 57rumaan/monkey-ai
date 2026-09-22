import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useChatPage } from '@/features/chat/hooks/useChatPage';
import { useTheme } from '@/hooks/useTheme';
import { CAPABILITY_REGISTRY } from '@/lib/capabilities/registry';
import type { CapabilityType, Attachment } from '@/types';
import {
  Button, IconButton, Avatar, Badge, Dropdown, Modal,
  PlusIcon, SendIcon, MicIcon, PaperclipIcon, CopyIcon, RefreshIcon,
  ThumbUpIcon, ThumbDownIcon, MoreHorizontalIcon, SearchIcon, ShareIcon,
  ChevronDownIcon, SparklesIcon, PenIcon, CodeIcon, BookIcon, FlaskIcon,
  ImageIcon, FileIcon, CheckIcon, AlertCircleIcon, ZapIcon,
  SunIcon, MoonIcon, MonitorIcon, XIcon, ClockIcon
} from '@/components/ui-new';

const capabilityIcons: Record<CapabilityType, React.ReactNode> = {
  text_to_text: <SparklesIcon />,
  coding: <CodeIcon />,
  text_to_image: <ImageIcon />,
  image_to_text: <ImageIcon />,
  image_editing: <ImageIcon />,
  image_analysis: <ImageIcon />,
  image_vision: <ImageIcon />,
  video_generation: <ZapIcon />,
  video_analysis: <ZapIcon />,
  video_vision: <ZapIcon />,
  text_to_voice: <MicIcon />,
  voice_to_text: <MicIcon />,
  document_analysis: <FileIcon />,
  file_analysis: <FileIcon />,
  calculator: <FlaskIcon />,
  datetime: <ClockIcon />,
  custom_feature: <SparklesIcon />,
  custom_action: <ZapIcon />,
};

const UNSUPPORTED_CAPABILITIES = new Set<CapabilityType>([
  'video_generation',
  'video_analysis',
  'video_vision',
]);

const CAPABILITY_LABELS: Record<CapabilityType, string> = {
  text_to_text: 'Text to Text',
  coding: 'Coding',
  text_to_image: 'Text to Image',
  image_to_text: 'Image to Text',
  image_editing: 'Image Editing',
  image_analysis: 'Image Analysis',
  image_vision: 'Image Vision',
  video_generation: 'Video Generation',
  video_analysis: 'Video Analysis',
  video_vision: 'Video Vision',
  text_to_voice: 'Text to Voice',
  voice_to_text: 'Voice to Text',
  document_analysis: 'Document Analysis',
  file_analysis: 'File Analysis',
  calculator: 'Calculator',
  datetime: 'Date/Time',
  custom_feature: 'Custom Feature',
  custom_action: 'Custom Action',
};

const SUGGESTIONS = [
  { icon: <PenIcon />, title: 'Writing', desc: 'Help me write something', color: 'text-blue-500' },
  { icon: <CodeIcon />, title: 'Coding', desc: 'Help me build or debug code', color: 'text-green-500' },
  { icon: <BookIcon />, title: 'Research', desc: 'Research a topic for me', color: 'text-orange-500' },
  { icon: <FlaskIcon />, title: 'Analysis', desc: 'Analyze my data', color: 'text-purple-500' },
  { icon: <SparklesIcon />, title: 'Creative', desc: 'Create something new', color: 'text-pink-500' },
];

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

function MarkdownContent({ content }: { content: string }) {
  const html = parseMarkdown(content);
  return <div className="prose-content" dangerouslySetInnerHTML={{ __html: html }} />;
}

export function ChatView() {
  const chat = useChatPage();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [modelOpen, setModelOpen] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [showCapabilitySelector, setShowCapabilitySelector] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const selectedBundle = chat.bundles.find(b => b.id === chat.currentBundleId);
  const availableCapabilities = chat.availableCapabilities.filter(c => !UNSUPPORTED_CAPABILITIES.has(c));

  const handleAutoResize = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 192)}px`;
    }
  }, []);

  useEffect(() => {
    handleAutoResize();
  }, [input, handleAutoResize]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat.allMessages]);

  const handleSend = () => {
    if (!input.trim() && attachments.length === 0) return;
    chat.handleSend(input, attachments);
    setInput('');
    setAttachments([]);
    handleAutoResize();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const isEmpty = chat.allMessages.length === 0 && !chat.selectedChatId;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] bg-[var(--card)] flex-shrink-0">
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold text-[var(--foreground)] truncate">
            {isEmpty ? 'New conversation' : (chat.selectedChatId ? 'Conversation' : 'New conversation')}
          </h1>
        </div>

        {/* Capability Selector */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowCapabilitySelector(!showCapabilitySelector)}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius)] border border-[var(--border)] hover:bg-[var(--muted)] text-sm text-[var(--foreground)] transition-colors'
            )}
          >
            {capabilityIcons[chat.currentCapability]}
            <span className="font-medium">
              {CAPABILITY_REGISTRY[chat.currentCapability]?.label || chat.currentCapability}
            </span>
            <ChevronDownIcon className={cn('h-3.5 w-3.5 text-[var(--muted-foreground)] transition-transform', showCapabilitySelector && 'rotate-180')} />
          </button>

          {showCapabilitySelector && (
            <div className={cn(
              'absolute top-full right-0 mt-1.5 z-50',
              'bg-[var(--card)] rounded-[var(--radius-lg)] border border-[var(--border)] shadow-lg',
              'max-h-72 overflow-y-auto min-w-[200px]'
            )}>
              <div className="p-1.5">
                {availableCapabilities.map(cap => {
                  const def = CAPABILITY_REGISTRY[cap];
                  if (!def) return null;
                  return (
                    <button
                      key={cap}
                      type="button"
                      onClick={() => { chat.handleCapabilityChange(cap); setShowCapabilitySelector(false); }}
                      className={cn(
                        'w-full flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius)] text-left text-sm transition-colors',
                        chat.currentCapability === cap
                          ? 'bg-[var(--primary)]/10 text-[var(--primary)]'
                          : 'text-[var(--foreground)] hover:bg-[var(--muted)]'
                      )}
                    >
                      {capabilityIcons[cap]}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{def.label}</p>
                        <p className="text-xs text-[var(--muted-foreground)] truncate">{def.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Model Selector */}
        <button
          onClick={() => setModelOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--radius)] border border-[var(--border)] hover:bg-[var(--muted)] text-sm text-[var(--foreground)] transition-colors"
        >
          <div className="w-4 h-4 rounded bg-[var(--primary)] text-white text-xs flex items-center justify-center font-bold">
            {selectedBundle?.name.charAt(0) || 'O'}
          </div>
          <span className="font-medium truncate max-w-[160px]">{selectedBundle?.name || 'Select model'}</span>
          <ChevronDownIcon />
        </button>

        <IconButton size="sm" tooltip="Share"><ShareIcon /></IconButton>
        <Dropdown
          align="right"
          trigger={<IconButton size="sm"><MoreHorizontalIcon /></IconButton>}
          items={[
            { label: 'Rename', icon: <PenIcon /> },
            { label: 'Add to favorites', icon: <SparklesIcon /> },
            { divider: true },
            { label: 'Delete conversation', icon: <AlertCircleIcon />, danger: true },
          ]}
        />

        {/* Theme switcher */}
        <div className="flex items-center gap-0.5 border border-[var(--border)] rounded-[var(--radius)] p-0.5">
          {([
            { value: 'light' as const, icon: <SunIcon /> },
            { value: 'system' as const, icon: <MonitorIcon /> },
            { value: 'dark' as const, icon: <MoonIcon /> },
          ] as const).map(t => (
            <button
              key={t.value}
              onClick={() => setTheme(t.value)}
              title={t.value.charAt(0).toUpperCase() + t.value.slice(1)}
              className={cn(
                'w-7 h-6 flex items-center justify-center rounded transition-colors',
                theme === t.value
                  ? 'bg-[var(--muted)] text-[var(--foreground)]'
                  : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              )}
            >
              {t.icon}
            </button>
          ))}
        </div>

        <button onClick={() => navigate('/admin')} className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] px-2 py-1 rounded border border-[var(--border)] hover:bg-[var(--muted)] transition-colors">
          Admin
        </button>
      </header>

      {/* Messages / Empty state */}
      <div className="flex-1 overflow-y-auto min-h-0 relative">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full px-6 py-12 text-center max-w-2xl mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-[var(--primary)] flex items-center justify-center text-3xl mb-5 shadow-lg mx-auto">
              <span className="text-white font-bold text-2xl">O</span>
            </div>
            <h2 className="text-2xl font-semibold text-[var(--foreground)] mb-2" style={{ fontFamily: 'Instrument Serif, serif' }}>
              How can I help you today?
            </h2>
            <p className="text-sm text-[var(--muted-foreground)] mb-8">
              Ask questions, analyze files, write, code, research, or create.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 max-w-2xl mx-auto mb-6">
              {SUGGESTIONS.map(s => (
                <button
                  key={s.title}
                  type="button"
                  onClick={() => {
                    setInput(s.desc);
                    handleSend();
                  }}
                  className={cn(
                    'flex flex-col items-start gap-2 p-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] text-left transition-all duration-200',
                    'hover:border-[var(--primary)]/40 hover:shadow-sm hover:-translate-y-0.5',
                    'active:scale-[0.98]'
                  )}
                >
                  <span className={s.color}>{s.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">{s.title}</p>
                    <p className="text-xs text-[var(--muted-foreground)] mt-0.5 leading-snug">{s.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 justify-center">
              {availableCapabilities.slice(0, 6).map(cap => (
                <span key={cap} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--muted)]/50 text-xs text-[var(--muted-foreground)] border border-[var(--border)]/50">
                  {capabilityIcons[cap]}
                  {CAPABILITY_LABELS[cap] || cap.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
            {chat.allMessages.map(msg => (
              <div key={msg.id} className={cn('flex gap-3', msg.role === 'user' ? 'flex-row-reverse' : '')}>
                {msg.role === 'assistant' ? (
                  <div className="w-8 h-8 rounded-lg bg-[var(--primary)] flex items-center justify-center text-white text-sm flex-shrink-0">
                    O
                  </div>
                ) : (
                  <Avatar name="User" size="sm" className="flex-shrink-0" />
                )}
                <div className={cn('flex flex-col gap-1 max-w-[85%]', msg.role === 'user' ? 'items-end' : 'items-start')}>
                  {msg.role === 'user' ? (
                    <div className="px-3 py-2 rounded-[var(--radius-lg)] bg-[var(--primary)] text-white text-sm leading-relaxed">
                      {msg.content}
                    </div>
                  ) : msg.state === 'thinking' ? (
                    <div className="px-4 py-3 rounded-[var(--radius-lg)] bg-[var(--card)] border border-[var(--border)]">
                      <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                        <div className="w-4 h-4 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
                        <span>Thinking...</span>
                      </div>
                    </div>
                  ) : msg.state === 'generating' ? (
                    <div className="px-4 py-3 rounded-[var(--radius-lg)] bg-[var(--card)] border border-[var(--border)]">
                      <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                        <div className="w-4 h-4 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
                        <span>Generating response...</span>
                      </div>
                    </div>
                  ) : msg.state === 'error' ? (
                    <div className="px-4 py-3 rounded-[var(--radius-lg)] bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-2">
                      <AlertCircleIcon />
                      <div>
                        <p className="text-sm font-medium text-[var(--error)]">Error generating response</p>
                        <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{msg.metadata?.error || 'Please try again.'}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-[var(--radius-lg)] bg-[var(--card)] border border-[var(--border)] px-4 py-3">
                      <MarkdownContent content={msg.content} />
                      {msg.state === 'regenerated' && (
                        <Badge variant="muted" className="mt-2">Regenerated</Badge>
                      )}
                    </div>
                  )}
                  {/* Actions */}
                  {msg.role === 'assistant' && msg.state === 'normal' && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5">
                      <IconButton size="sm" tooltip="Copy" onClick={() => handleCopy(msg.id, msg.content)}>
                        {copied === msg.id ? <CheckIcon /> : <CopyIcon />}
                      </IconButton>
                      <IconButton size="sm" tooltip="Regenerate" onClick={() => chat.handleRetry(msg.id)}>
                        <RefreshIcon />
                      </IconButton>
                      <IconButton size="sm" tooltip="Like"><ThumbUpIcon /></IconButton>
                      <IconButton size="sm" tooltip="Dislike"><ThumbDownIcon /></IconButton>
                      <Dropdown align="left" trigger={<IconButton size="sm"><MoreHorizontalIcon /></IconButton>}
                        items={[{ label: 'Add to notes' }, { label: 'Share snippet' }, { divider: true }, { label: 'Report issue', danger: true }]}
                      />
                    </div>
                  )}
                  {msg.timestamp && (
                    <span className="text-xs text-[var(--muted-foreground)] px-1">{msg.timestamp}</span>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="px-4 pb-4 pt-2 flex-shrink-0">
        <div className="max-w-3xl mx-auto">
          <div className={cn(
            'relative rounded-[var(--radius-xl)] border bg-[var(--card)] shadow-sm transition-all',
            input || attachments.length > 0 ? 'border-[var(--primary)]/50 shadow-md' : 'border-[var(--border)]'
          )}>
            {/* Attachments */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 px-4 pt-3">
                {attachments.map(att => (
                  <div
                    key={att.id}
                    className="flex items-center gap-2 pl-2.5 pr-1.5 py-1.5 rounded-[var(--radius)] bg-[var(--muted)] border border-[var(--border)] text-sm group"
                  >
                    {att.type === 'image' && <ImageIcon className="h-4 w-4 text-[var(--muted-foreground)] flex-shrink-0" />}
                    {att.type === 'document' && <FileIcon className="h-4 w-4 text-[var(--muted-foreground)] flex-shrink-0" />}
                    {att.type === 'audio' && <MicIcon className="h-4 w-4 text-[var(--muted-foreground)] flex-shrink-0" />}
                    {att.type === 'video' && <ImageIcon className="h-4 w-4 text-[var(--muted-foreground)] flex-shrink-0" />}
                    {att.type === 'file' && <PaperclipIcon className="h-4 w-4 text-[var(--muted-foreground)] flex-shrink-0" />}
                    <span className="text-[var(--foreground)] truncate max-w-[140px]">{att.name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(att.id)}
                      className="flex-shrink-0 inline-flex items-center justify-center h-5 w-5 rounded text-[var(--muted-foreground)] hover:text-[var(--error)] hover:bg-[var(--muted)] transition-colors"
                      aria-label="Remove attachment"
                    >
                      <XIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message Octix AI..."
              rows={1}
              className="w-full px-4 pt-3 pb-12 text-sm bg-transparent text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] resize-none focus:outline-none leading-relaxed min-h-[52px] max-h-48 overflow-y-auto"
              style={{ height: 'auto' }}
              onInput={handleAutoResize}
            />

            {/* Toolbar */}
            <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1.5">
              {/* Attach */}
              <div className="relative">
                <IconButton size="sm" tooltip="Attach file" onClick={() => setAttachOpen(!attachOpen)}>
                  <PlusIcon />
                </IconButton>
                {attachOpen && (
                  <div className="absolute bottom-full mb-1 left-0 bg-[var(--card)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-lg py-1 w-48 z-20">
                    {[
                      ['Upload file', <FileIcon />],
                      ['Upload document', <FileIcon />],
                      ['Upload image', <ImageIcon />],
                      ['Take photo', <ImageIcon />],
                    ].map(([label, icon], i) => (
                      <button key={i} onClick={() => setAttachOpen(false)} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors">
                        <span className="text-[var(--muted-foreground)]">{icon as React.ReactNode}</span>
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Model mini-selector */}
              <button
                onClick={() => setModelOpen(true)}
                className="flex items-center gap-1 px-2 py-1 rounded-[var(--radius)] text-xs text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
              >
                <div className="w-3.5 h-3.5 rounded bg-[var(--primary)] text-white text-[8px] flex items-center justify-center font-bold">
                  {selectedBundle?.name.charAt(0) || 'O'}
                </div>
                {selectedBundle?.name}
                <ChevronDownIcon />
              </button>

              <div className="flex-1" />
              <IconButton size="sm" tooltip="Voice input"><MicIcon /></IconButton>
              <Button
                onClick={handleSend}
                disabled={(!input.trim() && attachments.length === 0) || chat.isStreaming}
                variant="primary"
                size="icon"
                className={cn('w-8 h-8 rounded-[var(--radius)] transition-all', (input.trim() || attachments.length > 0) && !chat.isStreaming ? 'bg-[var(--primary)] hover:opacity-90 active:scale-95' : 'bg-[var(--muted-foreground)]/30 cursor-not-allowed')}
              >
                <SendIcon />
              </Button>
            </div>
          </div>
          <p className="text-center text-xs text-[var(--muted-foreground)] mt-2">
            Octix AI can make mistakes. Review important information.
          </p>
        </div>
      </div>

      {modelOpen && (
        <ModelSelectorModal
          bundles={chat.bundles}
          selectedBundleId={chat.currentBundleId}
          onSelect={chat.handleBundleChange}
          onClose={() => setModelOpen(false)}
        />
      )}
    </div>
  );
}

// Model Selector Modal Component
function ModelSelectorModal({ bundles, selectedBundleId, onSelect, onClose }: {
  bundles: any[];
  selectedBundleId: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const [filter, setFilter] = useState('');
  const enabledBundles = bundles.filter(b => b.enabled);
  const filtered = enabledBundles.filter(m =>
    m.name.toLowerCase().includes(filter.toLowerCase()) ||
    m.provider?.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <Modal open onClose={onClose} title="Select Model" size="md">
      <div className="flex flex-col gap-3">
        <input
          autoFocus
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Search models..."
          className="w-full h-9 px-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--muted)] text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--primary)]"
        />
        <div className="flex flex-col gap-2 max-h-96 overflow-y-auto">
          {filtered.map(bundle => (
            <button
              key={bundle.id}
              type="button"
              onClick={() => { onSelect(bundle.id); onClose(); }}
              className={cn(
                'w-full flex items-start gap-3 p-3 rounded-[var(--radius-lg)] border text-left transition-all',
                selectedBundleId === bundle.id
                  ? 'border-[var(--primary)] bg-[var(--primary)]/5'
                  : 'border-[var(--border)] hover:border-[var(--primary)]/40 hover:bg-[var(--muted)]'
              )}
            >
              <div className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0',
                selectedBundleId === bundle.id ? 'bg-[var(--primary)]' : 'bg-[var(--muted-foreground)]'
              )}>
                {bundle.provider?.[0] || bundle.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-[var(--foreground)]">{bundle.name}</span>
                  <span className="text-xs text-[var(--muted-foreground)]">{bundle.provider}</span>
                  {selectedBundleId === bundle.id && <CheckIcon />}
                </div>
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{bundle.description || `${bundle.capabilities?.length || 0} capabilities`}</p>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {bundle.capabilities?.slice(0, 6).map((cap: any) => (
                    <span
                      key={cap.capabilityId || cap}
                      className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-[var(--muted)] text-[var(--muted-foreground)]"
                    >
                      {cap.capabilityId?.replace(/_/g, ' ') || cap}
                    </span>
                  ))}
                  {bundle.capabilities && bundle.capabilities.length > 6 && (
                    <span className="text-[10px] text-[var(--muted-foreground)] px-1.5 py-0.5 rounded bg-[var(--muted)] border border-[var(--border)]">
                      +{bundle.capabilities.length - 6}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
          {enabledBundles.length === 0 && (
            <div className="px-4 py-10 text-center">
              <div className="h-12 w-12 rounded-full bg-[var(--muted)] flex items-center justify-center mx-auto mb-3">
                <SparklesIcon className="h-6 w-6 text-[var(--muted-foreground)]" />
              </div>
              <p className="text-sm font-medium text-[var(--foreground)] mb-1">No models available</p>
              <p className="text-xs text-[var(--muted-foreground)]">No bundles have been configured yet</p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}