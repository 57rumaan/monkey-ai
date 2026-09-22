import { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Paperclip, X, Image, FileText, Mic, ArrowUp, Loader2 } from 'lucide-react';
import { Dropdown, DropdownItem } from '@/components/ui/Dropdown';
import { Textarea } from '@/components/ui/Textarea';
import type { Attachment } from '@/types';

interface ComposerProps {
  onSend: (content: string, attachments: Attachment[]) => void;
  disabled?: boolean;
  placeholder?: string;
  maxAttachments?: number;
  maxAttachmentSize?: number;
}

export function Composer({ onSend, disabled, placeholder = 'Message Octix...', maxAttachments = 5, maxAttachmentSize = 20 * 1024 * 1024 }: ComposerProps) {
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, []);

  useEffect(() => {
    handleHeight();
  }, [content, handleHeight]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && attachments.length === 0) return;
    if (disabled || isUploading) return;

    onSend(content, attachments);
    setContent('');
    setAttachments([]);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const uploadFiles = async (files: FileList) => {
    const remainingSlots = maxAttachments - attachments.length;
    if (remainingSlots <= 0) return;

    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    const oversized = filesToUpload.find(f => f.size > maxAttachmentSize);
    if (oversized) {
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      for (const file of filesToUpload) {
        formData.append('files', file);
      }

      const response = await fetch('/api/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Upload failed');

      setAttachments(prev => [...prev, ...data.data]);
    } catch {
      // Upload failed — silently ignore, user can retry
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileSelect = (files: FileList) => {
    uploadFiles(files);
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const canSend = (content.trim().length > 0 || attachments.length > 0) && !isUploading;

  return (
    <form onSubmit={handleSubmit} className="w-full px-4 md:px-8 pb-4 pt-2">
      <div
        className={cn(
          'relative rounded-[calc(var(--radius)+4px)] border transition-all duration-200',
          'bg-white dark:bg-[var(--color-surface-900)]',
          isFocused
            ? 'border-[var(--color-brand-500)]/50 shadow-[var(--shadow-elevation-2)] ring-1 ring-[var(--color-brand-500)]/10'
            : 'border-[var(--color-border-default)] shadow-[var(--shadow-elevation-1)] hover:border-[var(--color-border-strong)]'
        )}
      >
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 px-4 pt-3">
            {attachments.map(att => (
              <div
                key={att.id}
                className="flex items-center gap-2 pl-2.5 pr-1.5 py-1.5 rounded-[var(--radius)] bg-[var(--color-surface-100)] dark:bg-[var(--color-surface-800)] border border-[var(--color-border-default)] text-sm group"
              >
                {att.type === 'image' && <Image className="h-4 w-4 text-[var(--color-content-tertiary)] flex-shrink-0" />}
                {att.type === 'document' && <FileText className="h-4 w-4 text-[var(--color-content-tertiary)] flex-shrink-0" />}
                {att.type === 'audio' && <Mic className="h-4 w-4 text-[var(--color-content-tertiary)] flex-shrink-0" />}
                {att.type === 'video' && <Image className="h-4 w-4 text-[var(--color-content-tertiary)] flex-shrink-0" />}
                {att.type === 'file' && <Paperclip className="h-4 w-4 text-[var(--color-content-tertiary)] flex-shrink-0" />}
                <span className="text-[var(--color-content-primary)] truncate max-w-[140px]">{att.name}</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(att.id)}
                  className="flex-shrink-0 inline-flex items-center justify-center h-5 w-5 rounded text-[var(--color-content-tertiary)] hover:text-[var(--color-state-error)] hover:bg-[var(--color-surface-100)] dark:hover:bg-[var(--color-surface-700)] transition-colors"
                  aria-label="Remove attachment"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-1.5 p-2">
          <Dropdown
            trigger={
              <button
                type="button"
                aria-label="Attach files"
                disabled={disabled || isUploading || attachments.length >= maxAttachments}
                className={cn(
                  'inline-flex items-center justify-center h-9 w-9 rounded-[var(--radius)] transition-colors flex-shrink-0',
                  'text-[var(--color-content-tertiary)] hover:text-[var(--color-content-secondary)] hover:bg-[var(--color-surface-100)] dark:hover:bg-[var(--color-surface-800)]',
                  'disabled:opacity-40 disabled:cursor-not-allowed'
                )}
              >
                {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Paperclip className="h-5 w-5" />}
              </button>
            }
          >
            <DropdownItem icon={<Image className="h-4 w-4" />} onClick={() => fileInputRef.current?.click()}>
              Image
            </DropdownItem>
            <DropdownItem icon={<FileText className="h-4 w-4" />} onClick={() => fileInputRef.current?.click()}>
              Document
            </DropdownItem>
            <DropdownItem icon={<Mic className="h-4 w-4" />} onClick={() => fileInputRef.current?.click()}>
              Audio
            </DropdownItem>
          </Dropdown>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.txt,.md,.js,.ts,.jsx,.tsx,.json,.csv,.css,.html"
            onChange={e => e.target.files && handleFileSelect(e.target.files)}
            className="hidden"
            aria-label="File upload"
          />

          <Textarea
            ref={textareaRef}
            value={content}
            onChange={e => setContent(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className="flex-1 min-h-[44px] max-h-[200px] resize-none border-0 bg-transparent focus:ring-0 focus-visible:ring-0 p-2 text-sm leading-relaxed placeholder:text-[var(--color-content-tertiary)]/70"
            aria-label="Message input"
            rows={1}
          />

          <button
            type="submit"
            disabled={disabled || !canSend}
            aria-label="Send message"
            className={cn(
              'flex-shrink-0 inline-flex items-center justify-center h-9 w-9 rounded-[var(--radius)] transition-all duration-200',
              canSend && !disabled
                ? 'bg-[var(--color-brand-500)] hover:bg-[var(--color-brand-700)] text-white shadow-sm active:scale-95'
                : 'bg-[var(--color-surface-100)] dark:bg-[var(--color-surface-800)] text-[var(--color-content-tertiary)] cursor-not-allowed'
            )}
          >
            <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>

        <div className="hidden md:flex items-center justify-between px-4 pb-2.5">
          <span className="text-[11px] text-[var(--color-content-tertiary)] select-none">
            <kbd className="px-1 py-0.5 rounded bg-[var(--color-surface-100)] dark:bg-[var(--color-surface-800)] text-[10px] font-mono">Enter</kbd> to send
            <span className="mx-1.5 text-[var(--color-border-default)]">·</span>
            <kbd className="px-1 py-0.5 rounded bg-[var(--color-surface-100)] dark:bg-[var(--color-surface-800)] text-[10px] font-mono">Shift+Enter</kbd> for newline
            <span className="mx-1.5 text-[var(--color-border-default)]">·</span>
            <kbd className="px-1 py-0.5 rounded bg-[var(--color-surface-100)] dark:bg-[var(--color-surface-800)] text-[10px] font-mono">Ctrl+K</kbd> search
          </span>
        </div>
      </div>
    </form>
  );
}
