export function Table({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border)]">
            {headers.map((h, i) => <th key={i} className="text-left py-3 px-4 text-[var(--muted-foreground)] font-medium">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-[var(--border)] hover:bg-[var(--muted)]/50 transition-colors">
              {row.map((cell, j) => <td key={j} className="py-3 px-4 text-[var(--foreground)]">{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}