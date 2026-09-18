import React, { useRef, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check, RotateCcw, User } from 'lucide-react';
import { Message } from './types';
import { useApp } from './AppContext';

interface MessageBubbleProps {
  message: Message;
  onRegenerate?: () => void;
}

export function MessageBubble({ message, onRegenerate }: MessageBubbleProps) {
  const { state } = useApp();
  const [copied, setCopied] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const isUser = message.role === 'user';
  const isDark = state.theme === 'dark';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className={`flex gap-3 py-4 px-4 md:px-6 animate-fade-in ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isUser ? 'bg-blue-500' : 'bg-monkey-500'}`}>
        {isUser ? <User size={16} className="text-white" /> : <span className="text-sm">🐵</span>}
      </div>
      <div className={`flex-1 max-w-[85%] ${isUser ? 'text-right' : ''}`}>
        <div className={`inline-block text-left rounded-2xl px-4 py-3 ${isUser ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'}`}>
          {message.isStreaming && !message.content ? (
            <div className="flex gap-1 py-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full typing-dot" />
              <div className="w-2 h-2 bg-gray-400 rounded-full typing-dot" />
              <div className="w-2 h-2 bg-gray-400 rounded-full typing-dot" />
            </div>
          ) : message.error ? (
            <div className="text-red-500 text-sm">{message.content}</div>
          ) : (
            <div className="markdown-body prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                code({ className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  const codeString = String(children).replace(/\n$/, '');
                  const isInline = !match && !codeString.includes('\n');
                  if (isInline) return <code className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-sm font-mono" {...props}>{children}</code>;
                  return (
                    <div className="relative group my-2">
                      <div className="flex items-center justify-between bg-gray-800 dark:bg-gray-900 text-gray-300 text-xs px-4 py-2 rounded-t-lg">
                        <span>{match?.[1] || 'code'}</span>
                        <button onClick={() => handleCopyCode(codeString)} className="flex items-center gap-1 hover:text-white transition-colors">
                          {copiedCode === codeString ? <Check size={12} /> : <Copy size={12} />}
                          {copiedCode === codeString ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                      <SyntaxHighlighter style={isDark ? oneDark : oneLight} language={match?.[1] || 'text'} PreTag="div" customStyle={{ margin: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0, borderBottomLeftRadius: 8, borderBottomRightRadius: 8 }}>{codeString}</SyntaxHighlighter>
                    </div>
                  );
                },
              }}>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>
        {message.attachments && message.attachments.length > 0 && (
          <div className={`flex gap-2 mt-2 flex-wrap ${isUser ? 'justify-end' : ''}`}>
            {message.attachments.map(att => (
              <div key={att.id} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-xs text-gray-600 dark:text-gray-400">📎 {att.name}</div>
            ))}
          </div>
        )}
        {!isUser && !message.isStreaming && message.content && (
          <div className="flex items-center gap-2 mt-2">
            <button onClick={handleCopy} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              {copied ? <Check size={12} /> : <Copy size={12} />}{copied ? 'Copied' : 'Copy'}
            </button>
            {onRegenerate && (
              <button onClick={onRegenerate} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"><RotateCcw size={12} /> Regenerate</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface ChatAreaProps {
  messages: Message[];
  onRegenerate?: () => void;
}

export function ChatArea({ messages, onRegenerate }: ChatAreaProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="text-6xl mb-4">🐵</div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Welcome to Monkey AI</h2>
        <p className="text-gray-500 dark:text-gray-400 max-w-md mb-8">Start a conversation by typing a message below. Select a model and feature to get started.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-2xl w-full">
          {[{ icon: '💡', title: 'Ask anything', desc: 'Get answers to your questions' }, { icon: '🖥️', title: 'Write code', desc: 'Generate and debug code' }, { icon: '🎨', title: 'Create images', desc: 'Generate images from prompts' }].map(item => (
            <div key={item.title} className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-monkey-300 dark:hover:border-monkey-700 transition-colors">
              <div className="text-2xl mb-2">{item.icon}</div>
              <h3 className="font-medium text-gray-900 dark:text-white text-sm">{item.title}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        {messages.map((msg, idx) => (
          <MessageBubble key={msg.id} message={msg} onRegenerate={idx === messages.length - 1 && msg.role === 'assistant' ? onRegenerate : undefined} />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
