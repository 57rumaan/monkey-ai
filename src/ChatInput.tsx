import React, { useState, useRef, KeyboardEvent } from 'react';
import { Send, Square, Plus, Paperclip, Image, FileText, X } from 'lucide-react';
import { useApp } from './AppContext';
import { Attachment, FILE_UPLOAD_CONFIG } from './types';
import { v4 as uuidv4 } from 'uuid';

interface ChatInputProps {
  onSend: (content: string, attachments?: Attachment[]) => void;
  onStop?: () => void;
}

export function ChatInput({ onSend, onStop }: ChatInputProps) {
  const { state } = useApp();
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (!content.trim() && attachments.length === 0) return;
    onSend(content.trim(), attachments.length > 0 ? attachments : undefined);
    setContent('');
    setAttachments([]);
    setUploadError('');
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setUploadError('');
    const newAttachments: Attachment[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!FILE_UPLOAD_CONFIG.allowedTypes.includes(file.type)) { setUploadError(`File type not supported: ${file.name}`); continue; }
      if (file.size > FILE_UPLOAD_CONFIG.maxSize) { setUploadError(`File too large (max 10MB): ${file.name}`); continue; }
      if (attachments.length + newAttachments.length >= FILE_UPLOAD_CONFIG.maxFiles) { setUploadError(`Maximum ${FILE_UPLOAD_CONFIG.maxFiles} files allowed`); break; }
      const url = URL.createObjectURL(file);
      newAttachments.push({ id: uuidv4(), name: file.name, type: file.type, size: file.size, url, mimeType: file.type });
    }
    setAttachments(prev => [...prev, ...newAttachments]);
    setShowAttachMenu(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => {
      const att = prev.find(a => a.id === id);
      if (att) URL.revokeObjectURL(att.url);
      return prev.filter(a => a.id !== id);
    });
  };

  const autoResize = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    }
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 md:p-4">
      <div className="max-w-4xl mx-auto">
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {attachments.map(att => (
              <div key={att.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm">
                {att.type.startsWith('image/') ? <img src={att.url} alt={att.name} className="w-8 h-8 rounded object-cover" /> : <FileText size={16} className="text-gray-500" />}
                <span className="text-gray-700 dark:text-gray-300 max-w-[120px] truncate">{att.name}</span>
                <button onClick={() => removeAttachment(att.id)} className="text-gray-400 hover:text-red-500"><X size={14} /></button>
              </div>
            ))}
          </div>
        )}
        {uploadError && <div className="mb-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">{uploadError}</div>}
        <div className="relative flex items-end gap-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-2 focus-within:border-monkey-500 focus-within:ring-2 focus-within:ring-monkey-500/20 transition-all">
          <div className="relative">
            <button onClick={() => setShowAttachMenu(!showAttachMenu)} className="p-2 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors" title="Attach files"><Plus size={20} /></button>
            {showAttachMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowAttachMenu(false)} />
                <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-2 z-50 animate-fade-in min-w-[180px]">
                  <p className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase">Upload</p>
                  <button onClick={() => { fileInputRef.current?.setAttribute('accept', 'image/*'); fileInputRef.current?.click(); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-gray-700 dark:text-gray-300"><Image size={16} /> Image</button>
                  <button onClick={() => { fileInputRef.current?.setAttribute('accept', '.pdf'); fileInputRef.current?.click(); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-gray-700 dark:text-gray-300"><FileText size={16} /> PDF</button>
                  <button onClick={() => { fileInputRef.current?.setAttribute('accept', '.txt,.csv,.doc,.docx'); fileInputRef.current?.click(); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-gray-700 dark:text-gray-300"><Paperclip size={16} /> Document</button>
                </div>
              </>
            )}
          </div>
          <textarea ref={textareaRef} value={content} onChange={e => { setContent(e.target.value); autoResize(); }} onKeyDown={handleKeyDown} placeholder="Type your message..." rows={1} className="flex-1 bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 resize-none focus:outline-none text-sm py-2 max-h-[200px]" />
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} multiple />
          {state.isGenerating ? (
            <button onClick={onStop} className="p-2 rounded-xl bg-red-500 hover:bg-red-600 text-white transition-colors" title="Stop generation"><Square size={18} /></button>
          ) : (
            <button onClick={handleSend} disabled={!content.trim() && attachments.length === 0} className="p-2 rounded-xl bg-monkey-500 hover:bg-monkey-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title="Send message"><Send size={18} /></button>
          )}
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-2">Monkey AI can make mistakes. Verify important information.</p>
      </div>
    </div>
  );
}
