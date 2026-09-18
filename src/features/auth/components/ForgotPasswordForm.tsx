import { useState, useEffect, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';

const emailSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
});

const passwordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type EmailFormData = z.infer<typeof emailSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

type Step = 'email' | 'otp' | 'password';

interface ForgotPasswordFormProps {
  onBackToLogin: () => void;
}

export function ForgotPasswordForm({ onBackToLogin }: ForgotPasswordFormProps) {
  const { forgotPassword, resetPassword } = useAuth();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otpError, setOtpError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(6).fill(''));

  const {
    register: registerEmail,
    handleSubmit: handleSubmitEmail,
    formState: { errors: emailErrors },
  } = useForm<EmailFormData>({ resolver: zodResolver(emailSchema) });

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    formState: { errors: passwordErrors },
    watch: watchPassword,
  } = useForm<PasswordFormData>({ resolver: zodResolver(passwordSchema) });

  const otp = otpDigits.join('');

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setInterval(() => setResendCooldown(c => c - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [resendCooldown]);

  useEffect(() => {
    if (step === 'otp') {
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [step]);

  const handleOtpChange = useCallback((index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    if (value.length > 1) value = value.slice(-1);

    const newDigits = [...otpDigits];
    newDigits[index] = value;
    setOtpDigits(newDigits);
    setOtpError('');

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }, [otpDigits]);

  const handleOtpKeyDown = useCallback((index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!otpDigits[index] && index > 0) {
        const newDigits = [...otpDigits];
        newDigits[index - 1] = '';
        setOtpDigits(newDigits);
        inputRefs.current[index - 1]?.focus();
      } else {
        const newDigits = [...otpDigits];
        newDigits[index] = '';
        setOtpDigits(newDigits);
      }
      e.preventDefault();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
      e.preventDefault();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
      e.preventDefault();
    }
  }, [otpDigits]);

  const handleOtpPaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 0) return;

    const newDigits = Array(6).fill('');
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setOtpDigits(newDigits);
    setOtpError('');

    const focusIndex = Math.min(pasted.length, 5);
    inputRefs.current[focusIndex]?.focus();
  }, []);

  const handleSendReset = useCallback(async (data: EmailFormData) => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await forgotPassword(data.email);
      setEmail(data.email);
      setStep('otp');
      setResendCooldown(60);
      setOtpDigits(Array(6).fill(''));
      showToast('Reset code sent to your email', { variant: 'success' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send reset code';
      if (message.toLowerCase().includes('not found') || message.toLowerCase().includes('no account')) {
        showToast('No account found with this email address.', { variant: 'error' });
      } else if (message.toLowerCase().includes('rate') || message.toLowerCase().includes('too many')) {
        showToast('Too many requests. Please try again later.', { variant: 'error' });
      } else {
        showToast(message, { variant: 'error' });
      }
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, forgotPassword, showToast]);

  const handleVerifyOtp = useCallback(async () => {
    if (otp.length !== 6 || isLoading) return;
    setIsLoading(true);
    setOtpError('');
    try {
      setStep('password');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Verification failed';
      if (message.toLowerCase().includes('expired')) {
        setOtpError('Code has expired. Please request a new one.');
      } else if (message.toLowerCase().includes('invalid') || message.toLowerCase().includes('incorrect')) {
        setOtpError('Invalid code. Please check and try again.');
        setOtpDigits(Array(6).fill(''));
        inputRefs.current[0]?.focus();
      } else {
        setOtpError(message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [otp, isLoading]);

  const handleResetPassword = useCallback(async (data: PasswordFormData) => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await resetPassword(email, otp, data.password);
      showToast('Password reset successfully', { variant: 'success' });
      onBackToLogin();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to reset password';
      if (message.toLowerCase().includes('expired')) {
        showToast('Reset code has expired. Please start over.', { variant: 'error' });
        setStep('email');
      } else {
        showToast(message, { variant: 'error' });
      }
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, email, otp, resetPassword, showToast, onBackToLogin]);

  const handleResend = useCallback(async () => {
    if (resendCooldown > 0) return;
    try {
      await forgotPassword(email);
      setResendCooldown(60);
      showToast('Reset code resent', { variant: 'success' });
      setOtpDigits(Array(6).fill(''));
      setOtpError('');
      inputRefs.current[0]?.focus();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to resend code';
      if (message.toLowerCase().includes('rate') || message.toLowerCase().includes('too many')) {
        showToast('Too many requests. Please wait before trying again.', { variant: 'error' });
      } else {
        showToast(message, { variant: 'error' });
      }
    }
  }, [resendCooldown, email, forgotPassword, showToast]);

  const passwordValue = watchPassword('password') || '';

  const passwordStrength = (p: string) => {
    let s = 0;
    if (p.length >= 8) s++;
    if (p.length >= 12) s++;
    if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  };

  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very strong'];
  const strengthColors = [
    'bg-surface-200 dark:bg-surface-700',
    'bg-state-error',
    'bg-orange-500',
    'bg-yellow-500',
    'bg-green-500',
    'bg-green-600',
  ];
  const strengthTextColors = [
    'text-content-tertiary',
    'text-state-error',
    'text-orange-600 dark:text-orange-400',
    'text-yellow-600 dark:text-yellow-400',
    'text-green-600 dark:text-green-400',
    'text-green-600 dark:text-green-400',
  ];

  const strength = passwordValue ? passwordStrength(passwordValue) : 0;
  const confirmPasswordValue = watchPassword('confirmPassword') || '';
  const passwordsMatch = confirmPasswordValue.length > 0 && passwordValue === confirmPasswordValue;

  const stepNumber = step === 'email' ? 1 : step === 'otp' ? 2 : 3;
  const stepLabels = ['Email', 'Code', 'New Password'];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3" role="group" aria-label="Password reset progress">
        {[1, 2, 3].map(num => (
          <div key={num} className="flex items-center gap-2">
            {num > 1 && <div className={cn('flex-1 h-px min-w-[2rem]', num <= stepNumber ? 'bg-brand-500' : 'bg-surface-200 dark:bg-surface-700')} />}
            <div className={cn(
              'flex items-center justify-center w-7 h-7 rounded-full text-body-xs font-semibold transition-colors',
              num < stepNumber && 'bg-state-success text-white',
              num === stepNumber && 'bg-brand-600 text-white step-pulse',
              num > stepNumber && 'bg-surface-200 dark:bg-surface-700 text-content-tertiary'
            )}>
              {num < stepNumber ? (
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : num}
            </div>
            <span className={cn(
              'text-body-sm',
              num === stepNumber ? 'font-medium text-content-primary' : 'text-content-tertiary'
            )}>
              {stepLabels[num - 1]}
            </span>
          </div>
        ))}
      </div>

      {step === 'email' && (
        <form onSubmit={handleSubmitEmail(handleSendReset)} className="space-y-5" noValidate>
          <div className="text-center">
            <h3 className="text-heading-md font-semibold text-content-primary">Reset your password</h3>
            <p className="text-body-sm text-content-tertiary mt-1.5">Enter your email and we&apos;ll send you a reset code</p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="fp-email" className="label">Email</label>
            <div className="relative group">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-content-tertiary group-focus-within:text-brand-500 transition-colors" aria-hidden="true" />
              <Input
                id="fp-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                className="pl-11 h-12"
                error={emailErrors.email?.message}
                aria-required="true"
                {...registerEmail('email')}
              />
            </div>
          </div>

          <Button type="submit" className="w-full h-12" loading={isLoading} disabled={isLoading}>
            Send Reset Code
          </Button>

          <Button type="button" variant="ghost" className="w-full" onClick={onBackToLogin} disabled={isLoading}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Login
          </Button>
        </form>
      )}

      {step === 'otp' && (
        <div className="space-y-5">
          <div className="text-center">
            <h3 className="text-heading-md font-semibold text-content-primary">Enter reset code</h3>
            <p className="text-body-sm text-content-tertiary mt-1.5">
              We sent a 6-digit code to{' '}
              <strong className="text-content-primary">{email}</strong>
            </p>
          </div>

          <div className="flex gap-2.5 justify-center" role="group" aria-label="One-time code input">
            {otpDigits.map((digit, i) => (
              <input
                key={i}
                ref={el => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                className={cn(
                  'otp-input',
                  digit && 'filled',
                  otpError && 'error'
                )}
                value={digit}
                onChange={e => handleOtpChange(i, e.target.value)}
                onKeyDown={e => handleOtpKeyDown(i, e)}
                onPaste={i === 0 ? handleOtpPaste : undefined}
                autoComplete={i === 0 ? 'one-time-code' : 'off'}
                aria-label={`Digit ${i + 1} of 6`}
                disabled={isLoading}
              />
            ))}
          </div>

          {otpError && (
            <p className="text-center text-body-sm text-state-error shake" role="alert">
              {otpError}
            </p>
          )}

          <Button
            type="button"
            className="w-full h-12"
            loading={isLoading}
            disabled={otp.length !== 6 || isLoading}
            onClick={handleVerifyOtp}
          >
            Verify Code
          </Button>

          <div className="text-center pt-1">
            <button
              type="button"
              onClick={handleResend}
              disabled={resendCooldown > 0 || isLoading}
              className="text-body-sm text-brand-600 dark:text-brand-400 hover:underline disabled:text-content-tertiary disabled:hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 rounded transition-colors"
            >
              {resendCooldown > 0 ? (
                <>Resend code in <span className="font-mono font-semibold">{resendCooldown}s</span></>
              ) : (
                'Didn\'t receive the code? Resend'
              )}
            </button>
          </div>

          <Button type="button" variant="ghost" className="w-full" onClick={() => setStep('email')} disabled={isLoading}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
      )}

      {step === 'password' && (
        <form onSubmit={handleSubmitPassword(handleResetPassword)} className="space-y-5" noValidate>
          <div className="text-center">
            <h3 className="text-heading-md font-semibold text-content-primary">New password</h3>
            <p className="text-body-sm text-content-tertiary mt-1.5">Choose a strong password for your account</p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="fp-new-password" className="label">New Password</label>
            <div className="relative group">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-content-tertiary group-focus-within:text-brand-500 transition-colors" aria-hidden="true" />
              <Input
                id="fp-new-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Create a strong password"
                className="pl-11 pr-11 h-12"
                error={passwordErrors.password?.message}
                aria-required="true"
                {...registerPassword('password')}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {passwordValue && (
              <div className="space-y-1.5 pt-1">
                <div className="flex gap-1.5" role="progressbar" aria-valuenow={strength} aria-valuemin={0} aria-valuemax={5} aria-label={`Password strength: ${strengthLabels[strength]}`}>
                  {[1, 2, 3, 4, 5].map(level => (
                    <div
                      key={level}
                      className={cn(
                        'h-1 flex-1 rounded-full transition-all duration-300',
                        level <= strength ? strengthColors[strength] : 'bg-surface-200 dark:bg-surface-700'
                      )}
                    />
                  ))}
                </div>
                <p className={cn('text-caption font-medium', strengthTextColors[strength])}>
                  {strengthLabels[strength]}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="fp-confirm-password" className="label">Confirm Password</label>
            <div className="relative group">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-content-tertiary group-focus-within:text-brand-500 transition-colors" aria-hidden="true" />
              <Input
                id="fp-confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Confirm your new password"
                className={cn(
                  'pl-11 pr-11 h-12',
                  passwordsMatch && 'border-state-success dark:border-state-success'
                )}
                error={passwordErrors.confirmPassword?.message}
                aria-required="true"
                {...registerPassword('confirmPassword')}
              />
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                {passwordsMatch && (
                  <svg className="h-4 w-4 text-state-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-label="Passwords match">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
                <button
                  type="button"
                  className="password-toggle relative static"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full h-12" loading={isLoading} disabled={isLoading}>
            Reset Password
          </Button>

          <Button type="button" variant="ghost" className="w-full" onClick={() => setStep('otp')} disabled={isLoading}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </form>
      )}
    </div>
  );
}
