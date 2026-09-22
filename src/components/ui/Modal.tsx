import { createContext, useContext, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { Button } from './Button';

interface ModalContextValue {
  close: () => void;
}

const ModalContext = createContext<ModalContextValue | null>(null);

export function ModalProvider({ children, isOpen, onClose }: { children: ReactNode; isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  return (
    <ModalContext.Provider value={{ close: onClose }}>
      {children}
    </ModalContext.Provider>
  );
}

export function useModal() {
  const context = useContext(ModalContext);
  if (!context) throw new Error('useModal must be used within ModalProvider');
  return context;
}

export function ModalOverlay({ onClose }: { onClose: () => void }) {
  return <div className="modal-overlay" onClick={onClose} aria-hidden="true" />;
}

export function ModalContainer({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('modal-content', className)} role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
      {children}
    </div>
  );
}

export function ModalHeader({ title, description, className }: { title: string; description?: string; className?: string }) {
  return (
    <div className={cn('flex items-start justify-between px-6 py-5 border-b border-[var(--color-border-default)]', className)}>
      <div className="min-w-0 flex-1">
        <h2 className="text-lg font-semibold text-[var(--color-content-primary)]">{title}</h2>
        {description && <p className="text-sm text-[var(--color-content-tertiary)] mt-1">{description}</p>}
      </div>
      <ModalCloseButton />
    </div>
  );
}

export function ModalCloseButton() {
  const { close } = useModal();
  return (
    <Button variant="ghost" size="icon-sm" onClick={close} aria-label="Close modal" className="flex-shrink-0 ml-4">
      <X className="h-5 w-5" />
    </Button>
  );
}

export function ModalBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('p-6 max-h-[60vh] overflow-y-auto', className)}>{children}</div>;
}

export function ModalFooter({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--color-border-default)] bg-[var(--color-surface-50)]/50 dark:bg-[var(--color-surface-950)]/30', className)}>{children}</div>;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Delete',
  isLoading = false,
  variant = 'danger',
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  isLoading?: boolean;
  variant?: 'danger' | 'warning';
}) {
  if (!isOpen) return null;

  return (
    <ModalProvider isOpen={isOpen} onClose={onClose}>
      <ModalOverlay onClose={onClose} />
      <ModalContainer className="max-w-md">
        <ModalHeader title={title} description={description} />
        <ModalFooter>
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            onClick={onConfirm}
            loading={isLoading}
            disabled={isLoading}
          >
            {confirmLabel}
          </Button>
        </ModalFooter>
      </ModalContainer>
    </ModalProvider>
  );
}
