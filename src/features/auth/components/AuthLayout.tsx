import { useEffect, useState } from 'react';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-surface-50)] dark:bg-[var(--color-surface-950)] px-4 py-12 sm:px-6 lg:px-8">
      <div
        className={`
          w-full max-w-sm relative z-10
          transition-all duration-500 ease-out
          ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
        `}
      >
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-[var(--color-brand-500)] flex items-center justify-center text-2xl shadow-lg">
            <span className="text-white font-bold text-lg">O</span>
          </div>
          <h1 className="text-xl font-semibold text-[var(--color-content-primary)]" style={{ fontFamily: 'Instrument Serif, serif' }}>
            Octix
          </h1>
        </div>

        <div className="bg-white dark:bg-[var(--color-surface-900)] rounded-[calc(var(--radius)+4px)] border border-[var(--color-border-default)] shadow-[var(--shadow-elevation-3)] p-8">
          <h2 className="text-xl font-semibold text-[var(--color-content-primary)] mb-1">{title}</h2>
          {subtitle && (
            <p className="text-sm text-[var(--color-content-tertiary)] mb-6">
              {subtitle}
            </p>
          )}
          {children}
        </div>

        <p className="text-center text-xs text-[var(--color-content-tertiary)] mt-6 leading-relaxed">
          By continuing, you agree to our{' '}
          <a href="/terms" className="text-[var(--color-brand-500)] hover:underline">Terms</a>{' '}
          and{' '}
          <a href="/privacy" className="text-[var(--color-brand-500)] hover:underline">Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}
