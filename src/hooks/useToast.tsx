import { createContext, useContext, useState, ReactNode } from 'react';

interface ToastContextValue {
  showToast: (message: string, options?: { variant?: 'default' | 'success' | 'error' | 'warning'; duration?: number }) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

interface ToastItem {
  id: string;
  message: string;
  variant: 'default' | 'success' | 'error' | 'warning';
  duration: number;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = (message: string, options?: { variant?: 'default' | 'success' | 'error' | 'warning'; duration?: number }) => {
    const id = Math.random().toString(36).slice(2, 9);
    const variant = options?.variant || 'default';
    const duration = options?.duration || 5000;

    setToasts(prev => [...prev, { id, message, variant, duration }]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={setToasts} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, onRemove }: { toasts: ToastItem[]; onRemove: React.Dispatch<React.SetStateAction<ToastItem[]>> }) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-toast flex flex-col gap-2 w-80 max-w-full" role="region" aria-label="Notifications">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onRemove }: { toast: ToastItem; onRemove: React.Dispatch<React.SetStateAction<ToastItem[]>> }) {
  const variants = {
    default: 'bg-white dark:bg-surface-900 border-border-default',
    success: 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800',
    error: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800',
    warning: 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800',
  };

  const icons = {
    default: <svg className="h-5 w-5 text-brand-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>,
    success: <svg className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>,
    error: <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>,
    warning: <svg className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>,
  };

  return (
    <div className={`flex items-start gap-3 p-4 rounded-lg border shadow-elevation-3 animate-in slide-in-from-bottom ${variants[toast.variant]}`} role="alert">
      <div className="flex-shrink-0 mt-0.5">{icons[toast.variant]}</div>
      <p className="flex-1 text-body text-content-primary">{toast.message}</p>
      <button
        onClick={() => onRemove(prev => prev.filter(t => t.id !== toast.id))}
        className="flex-shrink-0 text-content-tertiary hover:text-content-primary"
        aria-label="Dismiss"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
    </div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}