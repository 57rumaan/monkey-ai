export function Select({ options, value, onChange, label, className = '' }: { options: { value: string; label: string }[]; value: string; onChange: (v: string) => void; label?: string; className?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-[var(--foreground)]">{label}</label>}
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`h-9 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] text-sm px-3 focus:outline-none focus:border-[var(--primary)] ${className}`}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}