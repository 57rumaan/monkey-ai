import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Settings } from 'lucide-react';
import { useApp } from './AppContext';
import { Sidebar } from './Sidebar';
import { ChatArea } from './ChatArea';
import { ChatInput } from './ChatInput';
import { ModelSelector } from './ModelSelector';
import { Attachment } from './types';

export function ChatPage() {
  const { state, dispatch, createChat, sendMessage } = useApp();
  const navigate = useNavigate();
  const [selectedModelId, setSelectedModelId] = useState('');
  const [selectedFeatureId, setSelectedFeatureId] = useState('text_to_text');

  const activeChat = state.chats.find(c => c.id === state.activeChatId);

  useEffect(() => {
    if (!state.isAuthenticated) navigate('/auth');
  }, [state.isAuthenticated, navigate]);

  const handleNewChat = () => {
    const chat = createChat(selectedModelId, selectedFeatureId);
    dispatch({ type: 'SET_ACTIVE_CHAT', payload: chat.id });
  };

  const handleSelectChat = (id: string) => {
    dispatch({ type: 'SET_ACTIVE_CHAT', payload: id });
    const chat = state.chats.find(c => c.id === id);
    if (chat) {
      setSelectedModelId(chat.selectedModelId);
      setSelectedFeatureId(chat.selectedFeatureId);
    }
  };

  const handleSend = async (content: string, attachments?: Attachment[]) => {
    let chatId = state.activeChatId;
    if (!chatId) {
      const chat = createChat(selectedModelId, selectedFeatureId);
      chatId = chat.id;
    }
    const chat = state.chats.find(c => c.id === chatId);
    if (chat) {
      dispatch({ type: 'UPDATE_CHAT', payload: { ...chat, selectedModelId, selectedFeatureId } });
    }
    await sendMessage(chatId, content, attachments);
  };

  const handleRegenerate = async () => {
    if (!activeChat || activeChat.messages.length < 2) return;
    const lastUserMsg = [...activeChat.messages].reverse().find(m => m.role === 'user');
    if (!lastUserMsg) return;
    const msgs = activeChat.messages.slice(0, -1);
    dispatch({ type: 'UPDATE_CHAT', payload: { ...activeChat, messages: msgs } });
    await sendMessage(activeChat.id, lastUserMsg.content, lastUserMsg.attachments);
  };

  if (!state.isAuthenticated) return null;

  return (
    <div className="h-screen flex bg-bg-light dark:bg-bg-dark">
      <Sidebar onNewChat={handleNewChat} onSelectChat={handleSelectChat} onOpenSettings={() => navigate('/settings')} />
      <main className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <button onClick={() => dispatch({ type: 'SET_MOBILE_SIDEBAR', payload: true })} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 lg:hidden"><Menu size={20} className="text-gray-600 dark:text-gray-400" /></button>
            <ModelSelector selectedModelId={selectedModelId} selectedFeatureId={selectedFeatureId} onSelectModel={setSelectedModelId} onSelectFeature={setSelectedFeatureId} />
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/settings')} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"><Settings size={18} /></button>
          </div>
        </header>
        <ChatArea messages={activeChat?.messages || []} onRegenerate={handleRegenerate} />
        <ChatInput onSend={handleSend} onStop={() => dispatch({ type: 'SET_GENERATING', payload: false })} />
      </main>
    </div>
  );
}
