import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/Toast';
import { useBundles } from '@/features/bundles/hooks/useBundles';
import { generateId } from '@/lib/utils';
import type { Message, Attachment, CapabilityType, Bundle } from '@/types';

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useChatPage() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const searchInputRef = useRef<HTMLInputElement>(null);

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
  const [chatsLoading, setChatsLoading] = useState(true);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renameFolderValue, setRenameFolderValue] = useState('');
  const [movingChatId, setMovingChatId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 30;

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

  // --- Mutations ---

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

  // --- SSE Streaming ---

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
                  queryClient.setQueryData(['messages', chatId], (old: { chat: unknown; messages: Message[] } | undefined) => {
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
                  queryClient.setQueryData(['messages', chatId], (old: { chat: unknown; messages: Message[] } | undefined) => {
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

  // --- Action handlers ---

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

  const handleNewChat = useCallback(() => {
    const newChatId = generateId('cht_');
    setSelectedChatId(newChatId);
    setPage(1);
  }, []);

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

  // --- Pagination ---

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

  // --- Effects ---

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

  // --- Derived values ---

  const availableCapabilities = useMemo(() => selectedBundle?.capabilities.filter(c => c.enabled).map(c => c.capabilityId) || [], [selectedBundle]);
  const placeholder = useMemo(() => CAPABILITY_PLACEHOLDERS[currentCapability] || `Message ${selectedBundle?.name || 'MONKEY AI'}...`, [currentCapability, selectedBundle]);

  return {
    // Data
    bundles,
    bundlesLoading,
    chats,
    chatsLoading,
    folders,
    messages,
    allMessages,
    hasMoreMessages,
    paginatedLoading,

    // Selection state
    selectedChatId,
    setSelectedChatId,
    currentBundleId,
    currentCapability,
    selectedBundle,
    enabledCapabilities,
    availableCapabilities,
    placeholder,

    // Search
    searchQuery,
    setSearchQuery,
    searchInputRef,
    filteredChats,
    pinnedChats,
    folderChats,
    unfiledChats,

    // Streaming state
    isStreaming,
    streamError,
    setStreamError,
    failedStream,

    // Chat UI state
    renamingChatId,
    renameValue,
    exportingChatId,
    expandedFolders,
    creatingFolder,
    newFolderName,
    renamingFolderId,
    renameFolderValue,
    movingChatId,
    page,
    setPage,

    // Setters for UI state
    setRenamingChatId,
    setRenameValue,
    setExportingChatId,
    setExpandedFolders,
    setCreatingFolder,
    setNewFolderName,
    setRenamingFolderId,
    setRenameFolderValue,
    setMovingChatId,

    // Actions
    handleNewChat,
    handleBundleChange,
    handleCapabilityChange,
    handleSend,
    handleRetry,
    handleEditMessage,
    handleDeleteMessage,
    handleBranch,
    handleStartRename,
    handleSaveRename,
    handleRenameKeyDown,
    handleExport,
    loadOlderMessages,
    toggleFolder,

    // Mutations
    createFolderMutation,
    renameFolderMutation,
    deleteFolderMutation,
    moveToFolderMutation,
    pinMutation,
  };
}
