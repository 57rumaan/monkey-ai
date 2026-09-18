import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Sparkles, Code, Image, FileText, Calculator, Calendar, Zap, Video, Mic2, Plus, MessageSquare, ChevronDown, Search, X as XIcon, Pencil, Check, AlertCircle, Download, Pin, FolderPlus, Folder, FolderOpen, GitBranch } from 'lucide-react';
import { MessageList } from '@/components/chat/MessageList';
import { Composer } from '@/components/chat/Composer';
import { ModelSelector } from '@/components/chat/ModelSelector';
import { useToast } from '@/components/ui/Toast';
import { useBundles } from '@/features/bundles/hooks/useBundles';
import { CAPABILITY_REGISTRY } from '@/lib/capabilities/registry';
import { generateId, cn } from '@/lib/utils';
import type { Message, Attachment, CapabilityType, Bundle, Folder as FolderType } from '@/types';

const capabilityIcons: Record<CapabilityType, React.ReactNode> = {
  text_to_text: <Sparkles className="h-4 w-4" />,
  coding: <Code className="h-4 w-4" />,
  text_to_image: <Image className="h-4 w-4" />,
  image_to_text: <Image className="h-4 w-4" />,
  image_editing: <Image className="h-4 w-4" />,
  image_analysis: <Image className="h-4 w-4" />,
  image_vision: <Image className="h-4 w-4" />,
  video_generation: <Video className="h-4 w-4" />,
  video_analysis: <Video className="h-4 w-4" />,
  video_vision: <Video className="h-4 w-4" />,
  text_to_voice: <Mic2 className="h-4 w-4" />,
  voice_to_text: <Mic2 className="h-4 w-4" />,
  document_analysis: <FileText className="h-4 w-4" />,
  file_analysis: <FileText className="h-4 w-4" />,
  calculator: <Calculator className="h-4 w-4" />,
  datetime: <Calendar className="h-4 w-4" />,
  custom_feature: <Sparkles className="h-4 w-4" />,
  custom_action: <Zap className="h-4 w-4" />,
};

const UNSUPPORTED_CAPABILITIES = new Set<CapabilityType>([
  'video_generation',
  'video_analysis',
  'video_vision',
]);

const CAPABILITY_PLACEHOLDERS: Record<CapabilityType, string> = {
  text_to_text: 'Ask anything...',
  coding: 'Ask about code...',
  text_to_image: 'Describe the image you want to create...',
  image_to_text: 'Upload an image to extract text...',
  image_editing: 'Upload an image and describe the edit...',
  image_analysis: 'Upload an image to analyze...',
  image_vision: 'Upload an image for visual reasoning...',
  video_generation: 'Video generation not yet available.',
  video_analysis: 'Video analysis not yet available.',
  video_vision: 'Video vision not yet available.',
  text_to_voice: 'Type text to convert to speech...',
  voice_to_text: 'Upload an audio file to transcribe...',
  document_analysis: 'Upload a document to analyze...',
  file_analysis: 'Upload a file to analyze...',
  calculator: 'Enter a math expression...',
  datetime: 'Ask about date/time...',
  custom_feature: 'Ask anything...',
  custom_action: 'Ask anything...',
};

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

const ERROR_MESSAGES: Record<string, string> = {
  'Session expired': 'Your session has expired. Please sign in again.',
  'Invalid or expired token': 'Your session has expired. Please sign in again.',
  'Too many requests': 'You\'re sending requests too quickly. Please wait a moment and try again.',
  'Rate limit exceeded': 'You\'re sending requests too quickly. Please wait a moment and try again.',
  'Connection failed': 'Connection failed. Check your internet connection and try again.',
  'Generation failed': 'Something went wrong while generating the response. Please try again.',
  'Stream failed': 'Something went wrong while generating the response. Please try again.',
  'Provider unavailable': 'This AI service is temporarily unavailable. Please try again later.',
};

function getFriendlyError(error: string): string {
  for (const [key, msg] of Object.entries(ERROR_MESSAGES)) {
    if (error.includes(key)) return msg;
  }
  return error.length > 100 ? 'Something went wrong. Please try again.' : error;
}

function getEnabledCapabilities(bundle: Bundle): CapabilityType[] {
  return bundle.capabilities
    .filter(c => c.enabled)
    .map(c => c.capabilityId)
    .filter(id => !UNSUPPORTED_CAPABILITIES.has(id));
}

function detectCapabilityFromAttachments(attachments: Attachment[]): CapabilityType | null {
  if (attachments.length === 0) return null;
  const first = attachments[0];
  if (first.type === 'image') return 'image_analysis';
  if (first.type === 'audio') return 'voice_to_text';
  if (first.type === 'document' || first.type === 'file') return 'document_analysis';
  return null;
}

function getAttachmentValidationError(capability: CapabilityType, attachments: Attachment[]): string | null {
  const hasImage = attachments.some(a => a.type === 'image');
  const hasAudio = attachments.some(a => a.type === 'audio');
  const hasDoc = attachments.some(a => a.type === 'document' || a.type === 'file');

  switch (capability) {
    case 'image_analysis':
    case 'image_vision':
    case 'image_editing':
    case 'image_to_text':
      if (!hasImage) return 'Upload an image to use this capability.';
      return null;
    case 'voice_to_text':
      if (!hasAudio) return 'Upload an audio file to use this capability.';
      return null;
    case 'document_analysis':
    case 'file_analysis':
      if (!hasDoc) return 'Upload a document or text file to use this capability.';
      return null;
    default:
      return null;
  }
}

interface CapabilitySelectorProps {
  capabilities: CapabilityType[];
  selected: CapabilityType;
  onSelect: (cap: CapabilityType) => void;
}

function CapabilitySelector({ capabilities, selected, onSelect }: CapabilitySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedDef = CAPABILITY_REGISTRY[selected];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
          'bg-surface-50 dark:bg-surface-800 border border-border-default',
          'hover:border-border-strong focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none'
        )}
      >
        {capabilityIcons[selected]}
        <span className="text-content-primary">{selectedDef?.label || selected}</span>
        <ChevronDown className={cn('h-3.5 w-3.5 text-content-tertiary transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div className={cn(
          'absolute top-full left-0 mt-1.5 z-50',
          'bg-white dark:bg-surface-900 rounded-xl border border-border-default shadow-lg',
          'max-h-72 overflow-y-auto min-w-[200px]'
        )}>
          <div className="p-1.5">
            {capabilities.map(cap => {
              const def = CAPABILITY_REGISTRY[cap];
              if (!def) return null;
              const isUnsupported = UNSUPPORTED_CAPABILITIES.has(cap);
              return (
                <button
                  key={cap}
                  type="button"
                  disabled={isUnsupported}
                  onClick={() => { onSelect(cap); setIsOpen(false); }}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm transition-colors',
                    selected === cap
                      ? 'bg-brand-50 dark:bg-brand-950/50 text-brand-700 dark:text-brand-300'
                      : 'text-content-primary hover:bg-surface-50 dark:hover:bg-surface-800',
                    isUnsupported && 'opacity-40 cursor-not-allowed'
                  )}
                >
                  {capabilityIcons[cap]}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{def.label}</p>
                    <p className="text-xs text-content-tertiary truncate">{def.description}</p>
                  </div>
                  {isUnsupported && (
                    <span className="text-[10px] text-content-tertiary bg-surface-100 dark:bg-surface-700 px-1.5 py-0.5 rounded">Soon</span>
                  )}
                </button>
              );
            })}
            {capabilities.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-content-tertiary">
                No capabilities available
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

async function fetchChats() {
  const response = await fetch('/api/chat/chats', { credentials: 'include' });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch chats');
  return data.data;
}

async function fetchMessages(chatId: string) {
  const response = await fetch(`/api/chat/chats/${chatId}`, { credentials: 'include' });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch messages');
  return data.data;
}

async function fetchFolders() {
  const response = await fetch('/api/chat/folders', { credentials: 'include' });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch folders');
  return data.data;
}

interface FailedStream {
  content: string;
  attachments: Attachment[];
  bundleId: string;
  capability: CapabilityType;
  chatId: string;
}

export function ChatPage() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentBundleId, setCurrentBundleId] = useState<string>('');
  const [currentCapability, setCurrentCapability] = useState<CapabilityType>('text_to_text');
  const [capabilityLocked, setCapabilityLocked] = useState(false);
  const [failedStream, setFailedStream] = useState<FailedStream | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [streamError, setStreamError] = useState<string | null>(null);
  const [renamingChatId, setRenamingChatId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [exportingChatId, setExportingChatId] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [chatsLoading, setChatsLoading] = useState(true);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renameFolderValue, setRenameFolderValue] = useState('');
  const [movingChatId, setMovingChatId] = useState<string | null>(null);

  const { data: bundles = [], isLoading: bundlesLoading } = useBundles();
  const { data: chats = [], isLoading: chatsQueryLoading } = useQuery({ queryKey: ['chats'], queryFn: fetchChats });
  const { data: folders = [] } = useQuery({ queryKey: ['folders'], queryFn: fetchFolders });

  const { data: chatData } = useQuery({
    queryKey: ['messages', selectedChatId],
    queryFn: () => fetchMessages(selectedChatId!),
    enabled: !!selectedChatId,
  });

  const messages = chatData?.messages || [];

  const selectedBundle = useMemo(() => bundles.find(b => b.id === currentBundleId), [bundles, currentBundleId]);
  const enabledCapabilities = useMemo(() => selectedBundle ? getEnabledCapabilities(selectedBundle) : [], [selectedBundle]);

  const filteredChats = useMemo(() => {
    if (!searchQuery.trim()) return chats;
    const q = searchQuery.toLowerCase();
    return chats.filter((c: { id: string; title?: string; updatedAt?: string; pinned?: boolean; folderId?: string }) => (c.title || 'Untitled').toLowerCase().includes(q));
  }, [chats, searchQuery]);

  const pinnedChats = useMemo(() => filteredChats.filter((c: { pinned?: boolean }) => c.pinned), [filteredChats]);
  const folderChats = useMemo(() => {
    const map = new Map<string, typeof filteredChats>();
    for (const chat of filteredChats) {
      const fid = (chat as { folderId?: string }).folderId;
      if (fid) {
        if (!map.has(fid)) map.set(fid, []);
        map.get(fid)!.push(chat);
      }
    }
    return map;
  }, [filteredChats]);
  const unfiledChats = useMemo(() => filteredChats.filter((c: { folderId?: string; pinned?: boolean }) => !c.folderId && !c.pinned), [filteredChats]);

  const createFolderMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await fetch('/api/chat/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to create folder');
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      setCreatingFolder(false);
      setNewFolderName('');
    },
    onError: (error) => showToast(error instanceof Error ? error.message : 'Failed to create folder', { variant: 'error' }),
  });

  const renameFolderMutation = useMutation({
    mutationFn: async ({ folderId, name }: { folderId: string; name: string }) => {
      const response = await fetch(`/api/chat/folders/${folderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to rename folder');
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      setRenamingFolderId(null);
    },
    onError: (error) => showToast(error instanceof Error ? error.message : 'Failed to rename folder', { variant: 'error' }),
  });

  const deleteFolderMutation = useMutation({
    mutationFn: async (folderId: string) => {
      const response = await fetch(`/api/chat/folders/${folderId}`, { method: 'DELETE', credentials: 'include' });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to delete folder');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    },
    onError: (error) => showToast(error instanceof Error ? error.message : 'Failed to delete folder', { variant: 'error' }),
  });

  const moveToFolderMutation = useMutation({
    mutationFn: async ({ chatId, folderId }: { chatId: string; folderId: string | null }) => {
      const response = await fetch(`/api/chat/chats/${chatId}/folder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ folderId }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to move chat');
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
      setMovingChatId(null);
    },
    onError: (error) => showToast(error instanceof Error ? error.message : 'Failed to move chat', { variant: 'error' }),
  });

  const pinMutation = useMutation({
    mutationFn: async (chatId: string) => {
      const response = await fetch(`/api/chat/chats/${chatId}/pin`, {
        method: 'PATCH',
        credentials: 'include',
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to pin chat');
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chats'] }),
    onError: (error) => showToast(error instanceof Error ? error.message : 'Failed to pin', { variant: 'error' }),
  });

  const branchMutation = useMutation({
    mutationFn: async ({ chatId, fromMessageId }: { chatId: string; fromMessageId?: string }) => {
      const response = await fetch(`/api/chat/chats/${chatId}/branch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ fromMessageId }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to branch chat');
      return data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
      setSelectedChatId(data.id);
      setPage(1);
      showToast('Branch created', { variant: 'success', duration: 2000 });
    },
    onError: (error) => showToast(error instanceof Error ? error.message : 'Failed to branch', { variant: 'error' }),
  });

  const renameMutation = useMutation({
    mutationFn: async ({ chatId, title }: { chatId: string; title: string }) => {
      const response = await fetch(`/api/chat/chats/${chatId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to rename chat');
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
      setRenamingChatId(null);
    },
    onError: (error) => {
      showToast(error instanceof Error ? error.message : 'Failed to rename', { variant: 'error' });
    },
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async ({ chatId, messageId }: { chatId: string; messageId: string }) => {
      const response = await fetch(`/api/chat/chats/${chatId}/messages/${messageId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to delete message');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', selectedChatId] });
      showToast('Message deleted', { variant: 'success', duration: 2000 });
    },
    onError: (error) => {
      showToast(error instanceof Error ? error.message : 'Failed to delete', { variant: 'error' });
    },
  });

  const doSend = useCallback(async (
    content: string,
    attachments: Attachment[],
    chatId: string,
    bundleId: string,
    capability: CapabilityType,
    editedMessageId?: string,
  ) => {
    setIsStreaming(true);
    setStreamError(null);
    setFailedStream(null);

    try {
      const body: Record<string, unknown> = { chatId, bundleId, capability, messages: [{ role: 'user', content }], attachments };
      if (editedMessageId) body.editedMessageId = editedMessageId;

      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => null);
        throw new Error(getFriendlyError(errBody?.error || 'Connection failed. Please try again.'));
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';
      let errorOccurred = false;

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              try {
                const parsed = JSON.parse(data);
                if (parsed.error) {
                  errorOccurred = true;
                  setStreamError(getFriendlyError(parsed.error));
                  setFailedStream({ content, attachments, bundleId, capability, chatId });
                  break;
                } else if (parsed.chunk) {
                  fullResponse += parsed.chunk;
                  queryClient.setQueryData(['messages', chatId], (old: { chat: any; messages: Message[] } | undefined) => {
                    const msgs = old?.messages || [];
                    const streamingMsg: Message = { id: 'streaming', role: 'assistant', content: fullResponse, chatId, capability, createdAt: new Date().toISOString() };
                    const withoutStreaming = msgs.filter(m => m.id !== 'streaming');
                    if (editedMessageId) {
                      return {
                        chat: old?.chat || { id: chatId },
                        messages: [...withoutStreaming, streamingMsg],
                      };
                    }
                    const userMsg: Message = { id: `user_${chatId}_${Date.now()}`, role: 'user', content, chatId, capability, attachments, createdAt: new Date().toISOString() };
                    const hasUserMsg = withoutStreaming.some(m => m.id === userMsg.id);
                    return {
                      chat: old?.chat || { id: chatId },
                      messages: [...withoutStreaming, ...(hasUserMsg ? [] : [userMsg]), streamingMsg],
                    };
                  });
                } else if (parsed.done) {
                  const assistantMsg: Message = {
                    id: parsed.messageId || `msg_${Date.now()}`,
                    role: 'assistant',
                    content: fullResponse,
                    chatId,
                    capability,
                    createdAt: new Date().toISOString(),
                  };
                  queryClient.setQueryData(['messages', chatId], (old: { chat: any; messages: Message[] } | undefined) => {
                    const msgs = old?.messages || [];
                    return {
                      chat: old?.chat || { id: chatId },
                      messages: [...msgs.filter(m => m.id !== 'streaming'), assistantMsg],
                    };
                  });
                }
              } catch {
                // ignore parse errors
              }
            }
          }
          if (errorOccurred) break;
        }
      }

      if (errorOccurred) return;

      setIsStreaming(false);
      queryClient.invalidateQueries({ queryKey: ['messages', chatId] });
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    } catch (err) {
      setIsStreaming(false);
      const errorMsg = getFriendlyError(err instanceof Error ? err.message : 'Connection lost. Please try again.');
      setStreamError(errorMsg);
      setFailedStream({ content, attachments, bundleId, capability, chatId });
      showToast(errorMsg, { variant: 'error' });
    }
  }, [queryClient, showToast]);

  const sendMessageMutation = useMutation({
    mutationFn: ({ content, attachments, chatId, bundleId, capability }: {
      content: string;
      attachments: Attachment[];
      chatId: string;
      bundleId: string;
      capability: CapabilityType;
    }) => doSend(content, attachments, chatId, bundleId, capability),
  });

  const handleSend = useCallback((content: string, attachments: Attachment[]) => {
    if (!currentBundleId || !selectedChatId) return;

    let capability = currentCapability;
    if (!capabilityLocked) {
      const detected = detectCapabilityFromAttachments(attachments);
      if (detected && enabledCapabilities.includes(detected)) {
        capability = detected;
      }
    }

    const validationError = getAttachmentValidationError(capability, attachments);
    if (validationError) {
      showToast(validationError, { variant: 'error' });
      return;
    }

    sendMessageMutation.mutate({ content, attachments, chatId: selectedChatId, bundleId: currentBundleId, capability });
  }, [currentBundleId, selectedChatId, currentCapability, capabilityLocked, enabledCapabilities, sendMessageMutation, showToast]);

  const handleRetry = useCallback((_messageId: string) => {
    if (!failedStream) return;
    doSend(
      failedStream.content,
      failedStream.attachments,
      failedStream.chatId,
      failedStream.bundleId,
      failedStream.capability,
    );
  }, [failedStream, doSend]);

  const handleEditMessage = useCallback((messageId: string, newContent: string) => {
    if (!selectedChatId || !currentBundleId) return;
    let capability = currentCapability;
    const msg = messages.find((m: Message) => m.id === messageId);
    const existingAttachments = msg?.attachments || [];
    if (!capabilityLocked && existingAttachments.length) {
      const detected = detectCapabilityFromAttachments(existingAttachments);
      if (detected && enabledCapabilities.includes(detected)) {
        capability = detected;
      }
    }
    doSend(newContent, existingAttachments, selectedChatId, currentBundleId, capability, messageId);
  }, [selectedChatId, currentBundleId, currentCapability, capabilityLocked, enabledCapabilities, messages, doSend]);

  const handleDeleteMessage = useCallback((messageId: string) => {
    if (!selectedChatId) return;
    deleteMessageMutation.mutate({ chatId: selectedChatId, messageId });
  }, [selectedChatId, deleteMessageMutation]);

  const handleBranch = useCallback((messageId?: string) => {
    if (!selectedChatId) return;
    branchMutation.mutate({ chatId: selectedChatId, fromMessageId: messageId });
  }, [selectedChatId, branchMutation]);

  const handleStartRename = useCallback((chatId: string, currentTitle: string) => {
    setRenamingChatId(chatId);
    setRenameValue(currentTitle || '');
  }, []);

  const handleSaveRename = useCallback(() => {
    if (!renamingChatId) return;
    const trimmed = renameValue.trim();
    if (!trimmed) {
      showToast('Title cannot be empty', { variant: 'error' });
      return;
    }
    renameMutation.mutate({ chatId: renamingChatId, title: trimmed });
  }, [renamingChatId, renameValue, renameMutation, showToast]);

  const handleRenameKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveRename();
    } else if (e.key === 'Escape') {
      setRenamingChatId(null);
    }
  }, [handleSaveRename]);

  const handleExport = useCallback(async (chatId: string, format: 'md' | 'txt') => {
    try {
      const response = await fetch(`/api/chat/chats/${chatId}/export?format=${format}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const disposition = response.headers.get('Content-Disposition') || '';
      const filenameMatch = disposition.match(/filename="?([^"]+)"?/);
      const filename = filenameMatch ? filenameMatch[1] : `chat.${format}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      setExportingChatId(null);
    } catch {
      showToast('Failed to export chat', { variant: 'error' });
    }
  }, [showToast]);

  const toggleFolder = useCallback((folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  }, []);

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 30;

  const { data: paginatedData, isLoading: paginatedLoading } = useQuery({
    queryKey: ['messages', selectedChatId, page],
    queryFn: async () => {
      if (!selectedChatId) return null;
      const response = await fetch(`/api/chat/chats/${selectedChatId}/messages?page=${page}&pageSize=${PAGE_SIZE}`, { credentials: 'include' });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to fetch messages');
      return data.data;
    },
    enabled: !!selectedChatId,
    placeholderData: (prev) => prev,
  });

  const allMessages = useMemo(() => {
    if (paginatedData?.items) {
      return paginatedData.items;
    }
    return messages;
  }, [paginatedData, messages]);

  const hasMoreMessages = paginatedData ? paginatedData.page < paginatedData.totalPages : false;

  const loadOlderMessages = useCallback(() => {
    if (hasMoreMessages && !paginatedLoading) {
      setPage(p => p + 1);
    }
  }, [hasMoreMessages, paginatedLoading]);

  const handleNewChat = () => {
    const newChatId = generateId('cht_');
    setSelectedChatId(newChatId);
    setPage(1);
  };

  const handleBundleChange = useCallback((bundleId: string) => {
    setCurrentBundleId(bundleId);
    localStorage.setItem('selectedBundleId', bundleId);

    const bundle = bundles.find(b => b.id === bundleId);
    if (bundle) {
      const caps = getEnabledCapabilities(bundle);
      if (!caps.includes(currentCapability)) {
        setCurrentCapability(caps.includes('text_to_text') ? 'text_to_text' : (caps[0] || 'text_to_text'));
        setCapabilityLocked(false);
      }
    }
  }, [bundles, currentCapability]);

  const handleCapabilityChange = useCallback((cap: CapabilityType) => {
    setCurrentCapability(cap);
    setCapabilityLocked(true);
  }, []);

  useEffect(() => {
    if (!chatsQueryLoading) {
      const t = setTimeout(() => setChatsLoading(false), 100);
      return () => clearTimeout(t);
    }
  }, [chatsQueryLoading]);

  useEffect(() => {
    const handleClickOutside = () => { setExportingChatId(null); setMovingChatId(null); };
    if (exportingChatId || movingChatId) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [exportingChatId, movingChatId]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  useEffect(() => {
    if (bundles.length > 0 && !currentBundleId) {
      const saved = localStorage.getItem('selectedBundleId');
      const bundleId = saved && bundles.find(b => b.id === saved) ? saved : bundles[0].id;
      setCurrentBundleId(bundleId);
    }
  }, [bundles, currentBundleId]);

  if (bundlesLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  const availableCapabilities = selectedBundle?.capabilities.filter(c => c.enabled).map(c => c.capabilityId) || [];
  const placeholder = CAPABILITY_PLACEHOLDERS[currentCapability] || `Message ${selectedBundle?.name || 'MONKEY AI'}...`;

  const renderChatItem = (chat: { id: string; title?: string; updatedAt?: string; pinned?: boolean; folderId?: string }) => (
    <div
      key={chat.id}
      className={cn(
        'group flex items-center gap-1 rounded-lg transition-colors',
        selectedChatId === chat.id
          ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
          : 'text-content-secondary hover:bg-surface-100 dark:hover:bg-surface-800'
      )}
    >
      {renamingChatId === chat.id ? (
        <div className="flex-1 flex items-center gap-1 px-2 py-1.5">
          <input
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={handleRenameKeyDown}
            onBlur={handleSaveRename}
            autoFocus
            maxLength={100}
            className="flex-1 min-w-0 px-2 py-1 text-sm rounded bg-white dark:bg-surface-800 border border-brand-300 dark:border-brand-700 text-content-primary focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <button type="button" onClick={handleSaveRename} className="p-1 text-brand-600 hover:text-brand-700">
            <Check className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={() => setRenamingChatId(null)} className="p-1 text-content-tertiary hover:text-content-secondary">
            <XIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <>
          <button
            onClick={() => { setSelectedChatId(chat.id); setPage(1); }}
            className="flex-1 min-w-0 px-3 py-2.5 text-left text-body"
          >
            <div className="flex items-center gap-2">
              {chat.pinned && <Pin className="h-3 w-3 text-brand-400 flex-shrink-0 fill-current" />}
              <MessageSquare className="h-4 w-4 flex-shrink-0 opacity-50" />
              <p className="font-medium truncate">{chat.title || 'Untitled'}</p>
            </div>
            <p className="text-body-xs text-content-tertiary truncate mt-0.5 ml-6">{chat.updatedAt}</p>
          </button>
          <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity mr-1">
            <div className="relative">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setMovingChatId(movingChatId === chat.id ? null : chat.id); }}
                className="p-1.5 rounded-md text-content-tertiary hover:text-content-secondary hover:bg-surface-200 dark:hover:bg-surface-700"
                aria-label="Move to folder"
              >
                <Folder className="h-3.5 w-3.5" />
              </button>
              {movingChatId === chat.id && (
                <div className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-surface-900 rounded-lg border border-border-default shadow-lg py-1 min-w-[160px] max-h-60 overflow-y-auto">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); moveToFolderMutation.mutate({ chatId: chat.id, folderId: null }); }}
                    className="w-full text-left px-3 py-1.5 text-sm text-content-primary hover:bg-surface-50 dark:hover:bg-surface-800"
                  >
                    Uncategorized
                  </button>
                  {folders.map((f: FolderType) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={(e) => { e.stopPropagation(); moveToFolderMutation.mutate({ chatId: chat.id, folderId: f.id }); }}
                      className={cn(
                        'w-full text-left px-3 py-1.5 text-sm hover:bg-surface-50 dark:hover:bg-surface-800',
                        (chat as { folderId?: string }).folderId === f.id ? 'text-brand-600 font-medium' : 'text-content-primary'
                      )}
                    >
                      {f.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setExportingChatId(exportingChatId === chat.id ? null : chat.id); }}
                className="p-1.5 rounded-md text-content-tertiary hover:text-content-secondary hover:bg-surface-200 dark:hover:bg-surface-700"
                aria-label="Export chat"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
              {exportingChatId === chat.id && (
                <div className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-surface-900 rounded-lg border border-border-default shadow-lg py-1 min-w-[120px]">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleExport(chat.id, 'md'); }}
                    className="w-full text-left px-3 py-1.5 text-sm text-content-primary hover:bg-surface-50 dark:hover:bg-surface-800"
                  >
                    Markdown (.md)
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleExport(chat.id, 'txt'); }}
                    className="w-full text-left px-3 py-1.5 text-sm text-content-primary hover:bg-surface-50 dark:hover:bg-surface-800"
                  >
                    Plain Text (.txt)
                  </button>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); pinMutation.mutate(chat.id); }}
              className={cn(
                'p-1.5 rounded-md transition-colors',
                chat.pinned ? 'text-brand-500 hover:text-brand-600' : 'text-content-tertiary hover:text-content-secondary hover:bg-surface-200 dark:hover:bg-surface-700'
              )}
              aria-label={chat.pinned ? 'Unpin chat' : 'Pin chat'}
            >
              <Pin className={cn('h-3.5 w-3.5', chat.pinned && 'fill-current')} />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleStartRename(chat.id, chat.title || ''); }}
              className="p-1.5 rounded-md text-content-tertiary hover:text-content-secondary hover:bg-surface-200 dark:hover:bg-surface-700"
              aria-label="Rename chat"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 flex overflow-hidden">
        <aside className={cn(
          'w-72 border-r border-border-default bg-white dark:bg-surface-900 flex flex-col flex-shrink-0 transition-all duration-200',
          'hidden lg:flex'
        )}>
          <div className="p-3 border-b border-border-default space-y-2">
            <button
              onClick={handleNewChat}
              className="btn-primary w-full justify-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Chat
            </button>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-content-tertiary" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search chats... (Ctrl+K)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(
                  'w-full pl-8 pr-8 py-1.5 rounded-lg text-sm',
                  'bg-surface-50 dark:bg-surface-800 border border-border-default',
                  'text-content-primary placeholder:text-content-tertiary',
                  'focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20'
                )}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-content-tertiary hover:text-content-secondary"
                >
                  <XIcon className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {chatsLoading ? (
              <div className="space-y-1 p-1">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2.5 rounded-lg animate-pulse">
                    <div className="h-4 w-4 rounded bg-surface-200 dark:bg-surface-700" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 rounded bg-surface-200 dark:bg-surface-700 w-3/4" />
                      <div className="h-2.5 rounded bg-surface-100 dark:bg-surface-800 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {pinnedChats.length > 0 && (
                  <div className="mb-1">
                    <p className="px-3 py-1.5 text-[11px] font-semibold text-content-tertiary uppercase tracking-wider">Pinned</p>
                    {pinnedChats.map(renderChatItem)}
                  </div>
                )}

                {folders.length > 0 && !searchQuery.trim() && (
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between px-3 py-1.5">
                      <p className="text-[11px] font-semibold text-content-tertiary uppercase tracking-wider">Folders</p>
                      <button
                        type="button"
                        onClick={() => setCreatingFolder(true)}
                        className="p-0.5 rounded text-content-tertiary hover:text-content-secondary"
                        aria-label="New folder"
                      >
                        <FolderPlus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {creatingFolder && (
                      <div className="flex items-center gap-1 px-2 py-1">
                        <input
                          type="text"
                          value={newFolderName}
                          onChange={(e) => setNewFolderName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && newFolderName.trim()) createFolderMutation.mutate(newFolderName.trim());
                            if (e.key === 'Escape') { setCreatingFolder(false); setNewFolderName(''); }
                          }}
                          autoFocus
                          placeholder="Folder name"
                          maxLength={50}
                          className="flex-1 min-w-0 px-2 py-1 text-sm rounded bg-white dark:bg-surface-800 border border-brand-300 dark:border-brand-700 text-content-primary focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                        <button type="button" onClick={() => newFolderName.trim() && createFolderMutation.mutate(newFolderName.trim())} className="p-1 text-brand-600 hover:text-brand-700">
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={() => { setCreatingFolder(false); setNewFolderName(''); }} className="p-1 text-content-tertiary hover:text-content-secondary">
                          <XIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                    {folders.map((folder: FolderType) => {
                      const isExpanded = expandedFolders.has(folder.id);
                      const folderChatList = folderChats.get(folder.id) || [];
                      return (
                        <div key={folder.id}>
                          <div className={cn(
                            'group flex items-center gap-1 px-3 py-1.5 rounded-lg cursor-pointer transition-colors',
                            'text-content-secondary hover:bg-surface-100 dark:hover:bg-surface-800'
                          )}>
                            <button type="button" onClick={() => toggleFolder(folder.id)} className="flex items-center gap-1.5 flex-1 min-w-0">
                              {isExpanded ? <FolderOpen className="h-3.5 w-3.5 flex-shrink-0" /> : <Folder className="h-3.5 w-3.5 flex-shrink-0" />}
                              {renamingFolderId === folder.id ? (
                                <input
                                  type="text"
                                  value={renameFolderValue}
                                  onChange={(e) => setRenameFolderValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && renameFolderValue.trim()) renameFolderMutation.mutate({ folderId: folder.id, name: renameFolderValue.trim() });
                                    if (e.key === 'Escape') setRenamingFolderId(null);
                                  }}
                                  onBlur={() => { if (renameFolderValue.trim()) renameFolderMutation.mutate({ folderId: folder.id, name: renameFolderValue.trim() }); else setRenamingFolderId(null); }}
                                  autoFocus
                                  maxLength={50}
                                  className="flex-1 min-w-0 px-1 py-0.5 text-sm rounded bg-white dark:bg-surface-800 border border-brand-300 dark:border-brand-700 text-content-primary focus:outline-none"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              ) : (
                                <span className="text-sm font-medium truncate">{folder.name}</span>
                              )}
                              <span className="text-[10px] text-content-tertiary ml-auto">{folderChatList.length}</span>
                            </button>
                            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setRenamingFolderId(folder.id); setRenameFolderValue(folder.name); }}
                                className="p-0.5 rounded text-content-tertiary hover:text-content-secondary"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); if (confirm(`Delete folder "${folder.name}"? Chats will be moved to Uncategorized.`)) deleteFolderMutation.mutate(folder.id); }}
                                className="p-0.5 rounded text-content-tertiary hover:text-red-500"
                              >
                                <XIcon className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                          {isExpanded && (
                            <div className="ml-3 space-y-0.5">
                              {folderChatList.length > 0 ? (
                                folderChatList.map(renderChatItem)
                              ) : (
                                <p className="px-3 py-2 text-xs text-content-tertiary">No chats in this folder</p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {(unfiledChats.length > 0 || (searchQuery.trim() && filteredChats.length > 0)) && (
                  <div>
                    {pinnedChats.length > 0 && folders.length > 0 && !searchQuery.trim() && (
                      <p className="px-3 py-1.5 text-[11px] font-semibold text-content-tertiary uppercase tracking-wider">All Chats</p>
                    )}
                    {(searchQuery.trim() ? filteredChats : unfiledChats).map(renderChatItem)}
                  </div>
                )}

                {filteredChats.length === 0 && chats.length > 0 && (
                  <div className="px-3 py-8 text-center">
                    <Search className="h-6 w-6 text-content-tertiary mx-auto mb-2 opacity-50" />
                    <p className="text-content-tertiary text-body-sm">No chats match "{searchQuery}"</p>
                  </div>
                )}
                {chats.length === 0 && (
                  <div className="px-3 py-8 text-center">
                    <MessageSquare className="h-8 w-8 text-content-tertiary mx-auto mb-2 opacity-50" />
                    <p className="text-content-tertiary text-body-sm">No chats yet</p>
                  </div>
                )}
              </>
            )}
          </div>
        </aside>

        <div className="flex-1 flex flex-col min-w-0">
          <div className="border-b border-border-default p-3 bg-white/50 dark:bg-surface-950/50 backdrop-blur-sm flex items-center gap-3 lg:hidden">
            <div className="flex-1 min-w-0">
              <ModelSelector
                bundles={bundles}
                selectedBundleId={currentBundleId}
                onSelect={handleBundleChange}
              />
            </div>
          </div>

          <div className="border-b border-border-default px-4 py-2 bg-white/50 dark:bg-surface-950/50 backdrop-blur-sm hidden lg:flex items-center gap-3">
            <div className="w-64 flex-shrink-0">
              <ModelSelector
                bundles={bundles}
                selectedBundleId={currentBundleId}
                onSelect={handleBundleChange}
              />
            </div>
            <div className="h-5 w-px bg-border-default" />
            <CapabilitySelector
              capabilities={enabledCapabilities}
              selected={currentCapability}
              onSelect={handleCapabilityChange}
            />
            {selectedChatId && (
              <>
                <div className="h-5 w-px bg-border-default ml-auto" />
                <button
                  type="button"
                  onClick={() => handleBranch()}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-content-secondary hover:text-content-primary hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                  title="Create a branch from this conversation"
                >
                  <GitBranch className="h-3.5 w-3.5" />
                  Branch
                </button>
              </>
            )}
          </div>

          <div className="flex-1 flex flex-col min-w-0">
            {streamError && !isStreaming && (
              <div className="mx-4 mt-3 flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50">
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-700 dark:text-red-300 flex-1">{streamError}</p>
                {failedStream && (
                  <button
                    type="button"
                    onClick={() => handleRetry('')}
                    className="text-xs font-medium text-red-600 dark:text-red-400 hover:underline"
                  >
                    Retry
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setStreamError(null)}
                  className="p-1 text-red-400 hover:text-red-600 dark:hover:text-red-300"
                >
                  <XIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {selectedChatId ? (
              <MessageList
                messages={allMessages}
                isLoading={isStreaming}
                isLoadingOlder={paginatedLoading && page > 1}
                hasOlderMessages={hasMoreMessages}
                onLoadOlder={loadOlderMessages}
                onRetry={handleRetry}
                onEdit={handleEditMessage}
                onDelete={handleDeleteMessage}
                onBranch={handleBranch}
                onCopy={(content) => navigator.clipboard.writeText(content)}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center max-w-lg">
                  <div className="h-20 w-20 rounded-2xl bg-brand-100 dark:bg-brand-900 flex items-center justify-center mx-auto mb-6">
                    <Sparkles className="h-10 w-10 text-brand-600 dark:text-brand-400" />
                  </div>
                  <h2 className="text-heading-lg font-semibold text-content-primary mb-2">Welcome to MONKEY AI</h2>
                  <p className="text-body text-content-tertiary mb-6">
                    Select a model and capability above, then start a conversation.
                  </p>
                  {availableCapabilities.length > 0 && (
                    <div className="flex flex-wrap gap-2 justify-center">
                      {availableCapabilities.filter(c => !UNSUPPORTED_CAPABILITIES.has(c)).map(cap => (
                        <span key={cap} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-100 dark:bg-surface-800 text-body-sm text-content-secondary border border-border-default">
                          {capabilityIcons[cap]}
                          {CAPABILITY_LABELS[cap] || cap.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {selectedChatId && (
              <Composer
                onSend={handleSend}
                disabled={isStreaming}
                placeholder={placeholder}
              />
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
