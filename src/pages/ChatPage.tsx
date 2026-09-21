import { useState, useRef, useEffect } from 'react';
import { Loader2, Sparkles, Code, Image, FileText, Calculator, Calendar, Zap, Video, Mic2, Plus, MessageSquare, ChevronDown, Search, X as XIcon, Pencil, Check, AlertCircle, Download, Pin, FolderPlus, Folder, FolderOpen, GitBranch } from 'lucide-react';
import { MessageList } from '@/components/chat/MessageList';
import { Composer } from '@/components/chat/Composer';
import { ModelSelector } from '@/components/chat/ModelSelector';
import { useChatPage } from '@/features/chat/hooks/useChatPage';
import { CAPABILITY_REGISTRY } from '@/lib/capabilities/registry';
import { cn } from '@/lib/utils';
import type { CapabilityType, Folder as FolderType } from '@/types';

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

export function ChatPage() {
  const chat = useChatPage();

  const renderChatItem = (chatItem: { id: string; title?: string; updatedAt?: string; pinned?: boolean; folderId?: string }) => (
    <div
      key={chatItem.id}
      className={cn(
        'group flex items-center gap-1 rounded-lg transition-colors',
        chat.selectedChatId === chatItem.id
          ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
          : 'text-content-secondary hover:bg-surface-100 dark:hover:bg-surface-800'
      )}
    >
      {chat.renamingChatId === chatItem.id ? (
        <div className="flex-1 flex items-center gap-1 px-2 py-1.5">
          <input
            type="text"
            value={chat.renameValue}
            onChange={(e) => chat.setRenameValue(e.target.value)}
            onKeyDown={chat.handleRenameKeyDown}
            onBlur={chat.handleSaveRename}
            autoFocus
            maxLength={100}
            className="flex-1 min-w-0 px-2 py-1 text-sm rounded bg-white dark:bg-surface-800 border border-brand-300 dark:border-brand-700 text-content-primary focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <button type="button" onClick={chat.handleSaveRename} className="p-1 text-brand-600 hover:text-brand-700">
            <Check className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={() => chat.setRenamingChatId(null)} className="p-1 text-content-tertiary hover:text-content-secondary">
            <XIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <>
          <button
            onClick={() => { chat.setSelectedChatId(chatItem.id); chat.setPage(1); }}
            className="flex-1 min-w-0 px-3 py-2.5 text-left text-body"
          >
            <div className="flex items-center gap-2">
              {chatItem.pinned && <Pin className="h-3 w-3 text-brand-400 flex-shrink-0 fill-current" />}
              <MessageSquare className="h-4 w-4 flex-shrink-0 opacity-50" />
              <p className="font-medium truncate">{chatItem.title || 'Untitled'}</p>
            </div>
            <p className="text-body-xs text-content-tertiary truncate mt-0.5 ml-6">{chatItem.updatedAt}</p>
          </button>
          <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity mr-1">
            <div className="relative">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); chat.setMovingChatId(chat.movingChatId === chatItem.id ? null : chatItem.id); }}
                className="p-1.5 rounded-md text-content-tertiary hover:text-content-secondary hover:bg-surface-200 dark:hover:bg-surface-700"
                aria-label="Move to folder"
              >
                <Folder className="h-3.5 w-3.5" />
              </button>
              {chat.movingChatId === chatItem.id && (
                <div className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-surface-900 rounded-lg border border-border-default shadow-lg py-1 min-w-[160px] max-h-60 overflow-y-auto">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); chat.moveToFolderMutation.mutate({ chatId: chatItem.id, folderId: null }); }}
                    className="w-full text-left px-3 py-1.5 text-sm text-content-primary hover:bg-surface-50 dark:hover:bg-surface-800"
                  >
                    Uncategorized
                  </button>
                  {chat.folders.map((f: FolderType) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={(e) => { e.stopPropagation(); chat.moveToFolderMutation.mutate({ chatId: chatItem.id, folderId: f.id }); }}
                      className={cn(
                        'w-full text-left px-3 py-1.5 text-sm hover:bg-surface-50 dark:hover:bg-surface-800',
                        (chatItem as { folderId?: string }).folderId === f.id ? 'text-brand-600 font-medium' : 'text-content-primary'
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
                onClick={(e) => { e.stopPropagation(); chat.setExportingChatId(chat.exportingChatId === chatItem.id ? null : chatItem.id); }}
                className="p-1.5 rounded-md text-content-tertiary hover:text-content-secondary hover:bg-surface-200 dark:hover:bg-surface-700"
                aria-label="Export chat"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
              {chat.exportingChatId === chatItem.id && (
                <div className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-surface-900 rounded-lg border border-border-default shadow-lg py-1 min-w-[120px]">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); chat.handleExport(chatItem.id, 'md'); }}
                    className="w-full text-left px-3 py-1.5 text-sm text-content-primary hover:bg-surface-50 dark:hover:bg-surface-800"
                  >
                    Markdown (.md)
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); chat.handleExport(chatItem.id, 'txt'); }}
                    className="w-full text-left px-3 py-1.5 text-sm text-content-primary hover:bg-surface-50 dark:hover:bg-surface-800"
                  >
                    Plain Text (.txt)
                  </button>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); chat.pinMutation.mutate(chatItem.id); }}
              className={cn(
                'p-1.5 rounded-md transition-colors',
                chatItem.pinned ? 'text-brand-500 hover:text-brand-600' : 'text-content-tertiary hover:text-content-secondary hover:bg-surface-200 dark:hover:bg-surface-700'
              )}
              aria-label={chatItem.pinned ? 'Unpin chat' : 'Pin chat'}
            >
              <Pin className={cn('h-3.5 w-3.5', chatItem.pinned && 'fill-current')} />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); chat.handleStartRename(chatItem.id, chatItem.title || ''); }}
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

  if (chat.bundlesLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 flex overflow-hidden">
        <aside className={cn(
          'w-72 border-r border-border-default bg-white dark:bg-surface-900 flex flex-col flex-shrink-0 transition-all duration-200',
          'hidden lg:flex'
        )}>
          <div className="p-3 border-b border-border-default space-y-2">
            <button
              onClick={chat.handleNewChat}
              className="btn-primary w-full justify-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Chat
            </button>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-content-tertiary" />
              <input
                ref={chat.searchInputRef}
                type="text"
                placeholder="Search chats... (Ctrl+K)"
                value={chat.searchQuery}
                onChange={(e) => chat.setSearchQuery(e.target.value)}
                className={cn(
                  'w-full pl-8 pr-8 py-1.5 rounded-lg text-sm',
                  'bg-surface-50 dark:bg-surface-800 border border-border-default',
                  'text-content-primary placeholder:text-content-tertiary',
                  'focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20'
                )}
              />
              {chat.searchQuery && (
                <button
                  type="button"
                  onClick={() => chat.setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-content-tertiary hover:text-content-secondary"
                >
                  <XIcon className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {chat.chatsLoading ? (
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
                {chat.pinnedChats.length > 0 && (
                  <div className="mb-1">
                    <p className="px-3 py-1.5 text-[11px] font-semibold text-content-tertiary uppercase tracking-wider">Pinned</p>
                    {chat.pinnedChats.map(renderChatItem)}
                  </div>
                )}

                {chat.folders.length > 0 && !chat.searchQuery.trim() && (
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between px-3 py-1.5">
                      <p className="text-[11px] font-semibold text-content-tertiary uppercase tracking-wider">Folders</p>
                      <button
                        type="button"
                        onClick={() => chat.setCreatingFolder(true)}
                        className="p-0.5 rounded text-content-tertiary hover:text-content-secondary"
                        aria-label="New folder"
                      >
                        <FolderPlus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {chat.creatingFolder && (
                      <div className="flex items-center gap-1 px-2 py-1">
                        <input
                          type="text"
                          value={chat.newFolderName}
                          onChange={(e) => chat.setNewFolderName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && chat.newFolderName.trim()) chat.createFolderMutation.mutate(chat.newFolderName.trim());
                            if (e.key === 'Escape') { chat.setCreatingFolder(false); chat.setNewFolderName(''); }
                          }}
                          autoFocus
                          placeholder="Folder name"
                          maxLength={50}
                          className="flex-1 min-w-0 px-2 py-1 text-sm rounded bg-white dark:bg-surface-800 border border-brand-300 dark:border-brand-700 text-content-primary focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                        <button type="button" onClick={() => chat.newFolderName.trim() && chat.createFolderMutation.mutate(chat.newFolderName.trim())} className="p-1 text-brand-600 hover:text-brand-700">
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={() => { chat.setCreatingFolder(false); chat.setNewFolderName(''); }} className="p-1 text-content-tertiary hover:text-content-secondary">
                          <XIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                    {chat.folders.map((folder: FolderType) => {
                      const isExpanded = chat.expandedFolders.has(folder.id);
                      const folderChatList = chat.folderChats.get(folder.id) || [];
                      return (
                        <div key={folder.id}>
                          <div className={cn(
                            'group flex items-center gap-1 px-3 py-1.5 rounded-lg cursor-pointer transition-colors',
                            'text-content-secondary hover:bg-surface-100 dark:hover:bg-surface-800'
                          )}>
                            <button type="button" onClick={() => chat.toggleFolder(folder.id)} className="flex items-center gap-1.5 flex-1 min-w-0">
                              {isExpanded ? <FolderOpen className="h-3.5 w-3.5 flex-shrink-0" /> : <Folder className="h-3.5 w-3.5 flex-shrink-0" />}
                              {chat.renamingFolderId === folder.id ? (
                                <input
                                  type="text"
                                  value={chat.renameFolderValue}
                                  onChange={(e) => chat.setRenameFolderValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && chat.renameFolderValue.trim()) chat.renameFolderMutation.mutate({ folderId: folder.id, name: chat.renameFolderValue.trim() });
                                    if (e.key === 'Escape') chat.setRenamingFolderId(null);
                                  }}
                                  onBlur={() => { if (chat.renameFolderValue.trim()) chat.renameFolderMutation.mutate({ folderId: folder.id, name: chat.renameFolderValue.trim() }); else chat.setRenamingFolderId(null); }}
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
                                onClick={(e) => { e.stopPropagation(); chat.setRenamingFolderId(folder.id); chat.setRenameFolderValue(folder.name); }}
                                className="p-0.5 rounded text-content-tertiary hover:text-content-secondary"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); if (confirm(`Delete folder "${folder.name}"? Chats will be moved to Uncategorized.`)) chat.deleteFolderMutation.mutate(folder.id); }}
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

                {(chat.unfiledChats.length > 0 || (chat.searchQuery.trim() && chat.filteredChats.length > 0)) && (
                  <div>
                    {chat.pinnedChats.length > 0 && chat.folders.length > 0 && !chat.searchQuery.trim() && (
                      <p className="px-3 py-1.5 text-[11px] font-semibold text-content-tertiary uppercase tracking-wider">All Chats</p>
                    )}
                    {(chat.searchQuery.trim() ? chat.filteredChats : chat.unfiledChats).map(renderChatItem)}
                  </div>
                )}

                {chat.filteredChats.length === 0 && chat.chats.length > 0 && (
                  <div className="px-3 py-8 text-center">
                    <Search className="h-6 w-6 text-content-tertiary mx-auto mb-2 opacity-50" />
                    <p className="text-content-tertiary text-body-sm">No chats match "{chat.searchQuery}"</p>
                  </div>
                )}
                {chat.chats.length === 0 && (
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
                bundles={chat.bundles}
                selectedBundleId={chat.currentBundleId}
                onSelect={chat.handleBundleChange}
              />
            </div>
          </div>

          <div className="border-b border-border-default px-4 py-2 bg-white/50 dark:bg-surface-950/50 backdrop-blur-sm hidden lg:flex items-center gap-3">
            <div className="w-64 flex-shrink-0">
              <ModelSelector
                bundles={chat.bundles}
                selectedBundleId={chat.currentBundleId}
                onSelect={chat.handleBundleChange}
              />
            </div>
            <div className="h-5 w-px bg-border-default" />
            <CapabilitySelector
              capabilities={chat.enabledCapabilities}
              selected={chat.currentCapability}
              onSelect={chat.handleCapabilityChange}
            />
            {chat.selectedChatId && (
              <>
                <div className="h-5 w-px bg-border-default ml-auto" />
                <button
                  type="button"
                  onClick={() => chat.handleBranch()}
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
            {chat.streamError && !chat.isStreaming && (
              <div className="mx-4 mt-3 flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50">
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-700 dark:text-red-300 flex-1">{chat.streamError}</p>
                {chat.failedStream && (
                  <button
                    type="button"
                    onClick={() => chat.handleRetry('')}
                    className="text-xs font-medium text-red-600 dark:text-red-400 hover:underline"
                  >
                    Retry
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => chat.setStreamError(null)}
                  className="p-1 text-red-400 hover:text-red-600 dark:hover:text-red-300"
                >
                  <XIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {chat.selectedChatId ? (
              <MessageList
                messages={chat.allMessages}
                isLoading={chat.isStreaming}
                isLoadingOlder={chat.paginatedLoading && chat.page > 1}
                hasOlderMessages={chat.hasMoreMessages}
                onLoadOlder={chat.loadOlderMessages}
                onRetry={chat.handleRetry}
                onEdit={chat.handleEditMessage}
                onDelete={chat.handleDeleteMessage}
                onBranch={chat.handleBranch}
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
                  {chat.availableCapabilities.length > 0 && (
                    <div className="flex flex-wrap gap-2 justify-center">
                      {chat.availableCapabilities.filter(c => !UNSUPPORTED_CAPABILITIES.has(c)).map(cap => (
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

            {chat.selectedChatId && (
              <Composer
                onSend={chat.handleSend}
                disabled={chat.isStreaming}
                placeholder={chat.placeholder}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
