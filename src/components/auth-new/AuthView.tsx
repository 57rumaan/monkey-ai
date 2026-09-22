import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/features/auth/hooks/useAuth';
import {
  Button, Input,
  EyeIcon, EyeOffIcon, CheckIcon
} from '@/components/ui-new';

type AuthPage = 'login' | 'signup' | 'forgot' | 'reset' | 'verify';

export function AuthView() {
  const { login, signup, verifySignup, forgotPassword, resetPassword, resendOTP } = useAuth();
  const navigate = useNavigate();
  const [page, setPage] = useState<AuthPage>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const validateForm = () => {
    const errs: Record<string, string> = {};
    if (!email) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = 'Enter a valid email';
    if (page !== 'forgot' && page !== 'verify') {
      if (!password) errs.password = 'Password is required';
      else if (password.length < 8) errs.password = 'Password must be at least 8 characters';
    }
    if (page === 'signup' || page === 'reset') {
      if (!confirmPassword) errs.confirmPassword = 'Please confirm your password';
      else if (confirmPassword !== password) errs.confirmPassword = 'Passwords do not match';
    }
    if (page === 'signup' && !name) errs.name = 'Name is required';
    if (page === 'verify' && otp.length !== 6) errs.otp = 'Enter the 6-digit code';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    try {
      if (page === 'login') {
        await login(email, password);
        navigate('/');
      } else if (page === 'signup') {
        const result = await signup(email, password);
        if (result.requiresVerification) {
          setPage('verify');
        } else {
          navigate('/');
        }
      } else if (page === 'verify') {
        await verifySignup(email, otp, name);
        navigate('/');
      } else if (page === 'forgot') {
        await forgotPassword(email);
        setSent(true);
      } else if (page === 'reset') {
        await resetPassword(email, otp, password);
        navigate('/login');
      }
    } catch (err: any) {
      setErrors({ form: err.message || 'An error occurred' });
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (value: string, index: number) => {
    const newOtp = otp.slice(0, index) + value + otp.slice(index + 1);
    setOtp(newOtp);
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    try {
      await resendOTP(email);
    } catch (err: any) {
      setErrors({ form: err.message || 'Failed to resend code' });
    } finally {
      setLoading(false);
    }
  };

  const Logo = () => (
    <div className="flex flex-col items-center gap-3 mb-8">
      <div className="w-12 h-12 rounded-2xl bg-[var(--primary)] flex items-center justify-center text-2xl shadow-lg">
        <span className="text-white font-bold text-lg">O</span>
      </div>
      <span className="text-xl font-semibold text-[var(--foreground)]" style={{ fontFamily: 'Instrument Serif, serif' }}>
        Octix AI
      </span>
    </div>
  );

  const Card = ({ children }: { children: React.ReactNode }) => (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-sm p-8 w-full max-w-sm">{children}</div>
  );

  if (page === 'verify') {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
        <Card>
          <Logo />
          <div className="flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
              <CheckIcon />
            </div>
            <h2 className="text-lg font-semibold text-[var(--foreground)]">Verify your email</h2>
            <p className="text-sm text-[var(--muted-foreground)]">
              We sent a verification code to <span className="font-medium text-[var(--foreground)]">{email || 'your@email.com'}</span>
            </p>
            <p className="text-sm text-[var(--muted-foreground)]">Enter the 6-digit code below.</p>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
              <div className="flex gap-2 justify-center">
                {[0,1,2,3,4,5].map(i => (
                  <input
                    key={i}
                    ref={el => { otpRefs.current[i] = el; }}
                    type="text"
                    maxLength={1}
                    value={otp[i] || ''}
                    onChange={e => handleOtpChange(e.target.value, i)}
                    onKeyDown={e => handleOtpKeyDown(e, i)}
                    className="w-10 h-12 text-center text-lg font-medium rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    autoFocus={i === 0}
                  />
                ))}
              </div>
              <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading}>Verify</Button>
              <button type="button" onClick={() => { setPage('signup'); setOtp(''); }} className="text-sm text-[var(--primary)] hover:underline">
                Back to signup
              </button>
              <button type="button" onClick={handleResendOtp} className="text-sm text-[var(--primary)] hover:underline" disabled={loading}>
                Resend code
              </button>
            </form>
          </div>
        </Card>
      </div>
    );
  }

  if (page === 'forgot' && sent) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
        <Card>
          <Logo />
          <div className="flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-[var(--primary)]">
              <CheckIcon />
            </div>
            <h2 className="text-lg font-semibold text-[var(--foreground)]">Email sent</h2>
            <p className="text-sm text-[var(--muted-foreground)]">
              Password reset instructions sent to <strong>{email}</strong>
            </p>
            <Button variant="outline" className="w-full mt-2" onClick={() => { setPage('login'); setSent(false); }}>
              Back to login
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <Logo />
        <Card>
          {page === 'login' && (
            <>
              <h2 className="text-xl font-semibold text-[var(--foreground)] mb-1">Welcome back</h2>
              <p className="text-sm text-[var(--muted-foreground)] mb-6">Sign in to your account</p>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <Input label="Email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} error={errors.email} />
                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  error={errors.password}
                  rightElement={
                    <button type="button" onClick={() => setShowPassword(v => !v)} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                      {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  }
                />
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="rounded border-[var(--border)]" />
                    <span className="text-sm text-[var(--muted-foreground)]">Remember me</span>
                  </label>
                  <button type="button" onClick={() => setPage('forgot')} className="text-sm text-[var(--primary)] hover:underline">Forgot password?</button>
                </div>
                <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading}>Sign in</Button>
              </form>
              <p className="text-center text-sm text-[var(--muted-foreground)] mt-4">
                No account? <button onClick={() => setPage('signup')} className="text-[var(--primary)] hover:underline font-medium">Sign up</button>
              </p>
            </>
          )}

          {page === 'signup' && (
            <>
              <h2 className="text-xl font-semibold text-[var(--foreground)] mb-1">Create account</h2>
              <p className="text-sm text-[var(--muted-foreground)] mb-6">Start using Octix AI for free</p>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <Input label="Full name" type="text" placeholder="Alex Rivera" value={name} onChange={e => setName(e.target.value)} error={errors.name} />
                <Input label="Email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} error={errors.email} />
                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  error={errors.password}
                  rightElement={
                    <button type="button" onClick={() => setShowPassword(v => !v)} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                      {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  }
                />
                <Input
                  label="Confirm password"
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Repeat password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  error={errors.confirmPassword}
                  rightElement={
                    <button type="button" onClick={() => setShowConfirm(v => !v)} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                      {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  }
                />
                {/* Password strength */}
                {password && (
                  <div className="flex gap-1">
                    {[8, 12, 16].map((len, i) => (
                      <div key={i} className={cn('h-1 flex-1 rounded-full', password.length >= len ? ['bg-red-400', 'bg-yellow-400', 'bg-green-400'][i] : 'bg-[var(--border)]')} />
                    ))}
                    <span className="text-xs text-[var(--muted-foreground)] ml-1">
                      {password.length < 8 ? 'Weak' : password.length < 12 ? 'Fair' : 'Strong'}
                    </span>
                  </div>
                )}
                <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading}>Create account</Button>
              </form>
              <p className="text-center text-sm text-[var(--muted-foreground)] mt-4">
                Already have an account? <button onClick={() => setPage('login')} className="text-[var(--primary)] hover:underline font-medium">Sign in</button>
              </p>
            </>
          )}

          {page === 'forgot' && (
            <>
              <h2 className="text-xl font-semibold text-[var(--foreground)] mb-1">Reset password</h2>
              <p className="text-sm text-[var(--muted-foreground)] mb-6">Enter your email and we'll send reset instructions.</p>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <Input label="Email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} error={errors.email} />
                <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading}>Send reset link</Button>
              </form>
              <p className="text-center text-sm text-[var(--muted-foreground)] mt-4">
                <button onClick={() => setPage('login')} className="text-[var(--primary)] hover:underline">Back to login</button>
              </p>
            </>
          )}

          {page === 'reset' && (
            <>
              <h2 className="text-xl font-semibold text-[var(--foreground)] mb-1">New password</h2>
              <p className="text-sm text-[var(--muted-foreground)] mb-6">Choose a strong new password.</p>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <Input
                  label="New password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  error={errors.password}
                  rightElement={
                    <button type="button" onClick={() => setShowPassword(v => !v)} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                      {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  }
                />
                <Input
                  label="Confirm new password"
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Repeat password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  error={errors.confirmPassword}
                  rightElement={
                    <button type="button" onClick={() => setShowConfirm(v => !v)} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                      {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  }
                />
                <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading}>Update password</Button>
              </form>
            </>
          )}
        </Card>
        <p className="text-center text-xs text-[var(--muted-foreground)] mt-6">
          By continuing, you agree to our <a href="/terms" className="text-[var(--primary)] hover:underline">Terms</a> and <a href="/privacy" className="text-[var(--primary)] hover:underline">Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}