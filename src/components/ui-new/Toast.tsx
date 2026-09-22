export function Toast({ message, type = 'default', onClose }: { message: string; type?: 'default' | 'success' | 'error'; onClose: () => void }) {
  const colors = { default: 'bg-[var(--foreground)] text-[var(--background)]', success: 'bg-[var(--success)] text-white', error: 'bg-[var(--error)] text-white' };
  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 rounded-[var(--radius)] shadow-lg text-sm font-medium ${colors[type]}`}>
      {message}
      <button onClick={onClose} className="opacity-70 hover:opacity-100 ml-1">×</button>
    </div>
  );
}