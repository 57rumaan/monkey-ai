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
    <div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-950 px-4 py-12 sm:px-6 lg:px-8">
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-brand-100/40 dark:bg-brand-900/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-brand-50/60 dark:bg-brand-950/30 blur-3xl" />
      </div>

      <div
        className={`
          w-full max-w-md relative z-10
          transition-all duration-500 ease-out
          ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
        `}
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-600 text-white font-bold text-xl mb-5 shadow-lg shadow-brand-600/25 transition-transform hover:scale-105">
            M
          </div>
          <h1 className="text-heading-lg font-bold text-brand-600 dark:text-brand-400 tracking-tight">
            MONKEY AI
          </h1>
          <h2 className="text-heading-md font-semibold text-content-primary mt-4">{title}</h2>
          {subtitle && (
            <p className="text-body-sm text-content-tertiary mt-2 max-w-sm mx-auto leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>

        <div className="card p-6 sm:p-8 shadow-elevation-3 dark:shadow-elevation-4">
          {children}
        </div>

        <p className="text-center text-body-xs text-content-tertiary mt-6 leading-relaxed">
          By continuing, you agree to our{' '}
          <a href="/terms" className="text-brand-600 dark:text-brand-400 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 rounded">Terms of Service</a>{' '}
          and{' '}
          <a href="/privacy" className="text-brand-600 dark:text-brand-400 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 rounded">Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}
