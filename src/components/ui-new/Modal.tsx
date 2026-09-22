import { IconButton, XIcon } from './index';

export function Modal({ open, onClose, title, children, size = 'md' }: { open: boolean; onClose: () => void; title?: string; children: React.ReactNode; size?: 'sm' | 'md' | 'lg' }) {
  if (!open) return null;
  const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className={`relative w-full ${sizes[size]} bg-[var(--card)] border border-[var(--border)] rounded-[var(--radius-xl)] shadow-2xl`} onClick={e => e.stopPropagation()}>
        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
            <h3 className="font-semibold text-[var(--foreground)]">{title}</h3>
            <IconButton size="sm" onClick={onClose}><XIcon /></IconButton>
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}