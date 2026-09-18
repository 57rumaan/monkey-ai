import React, { useState } from 'react';
import { MessageSquarePlus, Search, Settings, LogOut, Sun, Moon, ChevronLeft, ChevronRight, Trash2, Edit3, X, MessageCircle } from 'lucide-react';
import { useApp } from './AppContext';
import { Chat } from './types';

interface SidebarProps {
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onOpenSettings: () => void;
}

export function Sidebar({ onNewChat, onSelectChat, onOpenSettings }: SidebarProps) {
  const { state, dispatch, deleteChat, renameChat, toggleTheme, logout, searchChats } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const userChats = state.chats.filter(c => c.userId === state.user?.id);
  const filteredChats = searchQuery ? searchChats(searchQuery) : userChats;

  const handleRename = (id: string) => {
    if (editTitle.trim()) renameChat(id, editTitle.trim());
    setEditingId(null);
  };

  const groupChatsByDate = (chats: Chat[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 86400000);
    const weekAgo = new Date(today.getTime() - 7 * 86400000);
    const groups: { label: string; chats: Chat[] }[] = [
      { label: 'Today', chats: [] },
      { label: 'Yesterday', chats: [] },
      { label: 'Previous 7 Days', chats: [] },
      { label: 'Older', chats: [] },
    ];
    chats.forEach(chat => {
      const date = new Date(chat.updatedAt);
      if (date >= today) groups[0].chats.push(chat);
      else if (date >= yesterday) groups[1].chats.push(chat);
      else if (date >= weekAgo) groups[2].chats.push(chat);
      else groups[3].chats.push(chat);
    });
    return groups.filter(g => g.chats.length > 0);
  };

  const chatGroups = groupChatsByDate(filteredChats);

  return (
    <>
      {state.mobileSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => dispatch({ type: 'SET_MOBILE_SIDEBAR', payload: false })} />
      )}
      <aside className={`fixed lg:relative z-50 h-full ${state.sidebarCollapsed ? 'w-16' : 'w-72'} bg-sidebar-light dark:bg-sidebar-dark border-r border-gray-200 dark:border-gray-700 flex flex-col transition-all duration-300 ${state.mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-3 flex items-center gap-2">
          {!state.sidebarCollapsed && (
            <div className="flex items-center gap-2 flex-1">
              <span className="text-2xl">🐵</span>
              <span className="font-bold text-lg text-gray-900 dark:text-white">Monkey AI</span>
            </div>
          )}
          {state.sidebarCollapsed && <span className="text-2xl mx-auto">🐵</span>}
          <button onClick={toggleTheme} className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" title={state.theme === 'dark' ? 'Light mode' : 'Dark mode'}>
            {state.theme === 'dark' ? <Sun size={16} className="text-yellow-400" /> : <Moon size={16} className="text-gray-600" />}
          </button>
          {!state.sidebarCollapsed && (
            <button onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })} className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors hidden lg:block">
              {state.sidebarCollapsed ? <ChevronRight size={16} className="text-gray-500" /> : <ChevronLeft size={16} className="text-gray-500" />}
            </button>
          )}
          <button onClick={() => dispatch({ type: 'SET_MOBILE_SIDEBAR', payload: false })} className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors lg:hidden">
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        {!state.sidebarCollapsed && (
          <>
            <div className="px-3 space-y-2">
              <button onClick={onNewChat} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-monkey-500 hover:bg-monkey-600 text-white font-medium text-sm transition-colors">
                <MessageSquarePlus size={18} /> New Chat
              </button>
              <button onClick={() => setShowSearch(!showSearch)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm transition-colors">
                <Search size={16} /> Search chats...
              </button>
              {showSearch && (
                <div className="relative animate-fade-in">
                  <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search..." className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-monkey-500" autoFocus />
                  {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2"><X size={14} className="text-gray-400" /></button>}
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-2 mt-3 space-y-4">
              {chatGroups.length === 0 ? (
                <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">{searchQuery ? 'No chats found' : 'No conversations yet'}</div>
              ) : (
                chatGroups.map(group => (
                  <div key={group.label}>
                    <p className="px-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">{group.label}</p>
                    {group.chats.map(chat => (
                      <div key={chat.id} className={`group flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-colors ${state.activeChatId === chat.id ? 'bg-monkey-500/10 dark:bg-monkey-500/20 text-monkey-700 dark:text-monkey-300' : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}`} onClick={() => { onSelectChat(chat.id); dispatch({ type: 'SET_MOBILE_SIDEBAR', payload: false }); }}>
                        <MessageCircle size={14} className="shrink-0" />
                        {editingId === chat.id ? (
                          <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} onBlur={() => handleRename(chat.id)} onKeyDown={e => e.key === 'Enter' && handleRename(chat.id)} className="flex-1 text-sm bg-white dark:bg-gray-800 border border-monkey-500 rounded px-1 py-0.5 focus:outline-none" autoFocus onClick={e => e.stopPropagation()} />
                        ) : (
                          <span className="flex-1 text-sm truncate">{chat.title}</span>
                        )}
                        <div className="hidden group-hover:flex items-center gap-0.5">
                          <button onClick={e => { e.stopPropagation(); setEditingId(chat.id); setEditTitle(chat.title); }} className="p-1 rounded hover:bg-gray-300 dark:hover:bg-gray-600"><Edit3 size={12} /></button>
                          <button onClick={e => { e.stopPropagation(); deleteChat(chat.id); }} className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500"><Trash2 size={12} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>

            <div className="p-3 border-t border-gray-200 dark:border-gray-700 space-y-1">
              {state.user && (
                <div className="flex items-center gap-2 px-2 py-2 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-monkey-500 flex items-center justify-center text-white font-bold text-sm">{state.user.name.charAt(0).toUpperCase()}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{state.user.name}</p>
                    <p className="text-xs text-gray-500 truncate">{state.user.email}</p>
                  </div>
                </div>
              )}
              <button onClick={onOpenSettings} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm transition-colors"><Settings size={16} /> Settings</button>
              <button onClick={logout} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 text-sm transition-colors"><LogOut size={16} /> Logout</button>
            </div>
          </>
        )}

        {state.sidebarCollapsed && (
          <div className="flex-1 flex flex-col items-center gap-2 mt-4">
            <button onClick={onNewChat} className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" title="New Chat"><MessageSquarePlus size={20} className="text-gray-600 dark:text-gray-400" /></button>
            <button onClick={onOpenSettings} className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" title="Settings"><Settings size={20} className="text-gray-600 dark:text-gray-400" /></button>
            <div className="flex-1" />
            <button onClick={logout} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors mb-4" title="Logout"><LogOut size={20} className="text-red-500" /></button>
          </div>
        )}
      </aside>
    </>
  );
}
