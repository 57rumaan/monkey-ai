import { useState, useEffect, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';

const usernameSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscore, and hyphen'),
});

type UsernameFormData = z.infer<typeof usernameSchema>;

interface VerifyOTPFormProps {
  email: string;
  onSuccess: (username?: string) => void;
  onResend?: () => void;
  onBack: () => void;
  initialOtp?: string;
}

export function VerifyOTPForm({ email, onSuccess, onBack, initialOtp }: VerifyOTPFormProps) {
  const { verifySignup, resendOTP, validateOTP } = useAuth();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [step, setStep] = useState<'otp' | 'username'>('otp');
  const [otpError, setOtpError] = useState('');

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [otpDigits, setOtpDigits] = useState<string[]>(() => {
    if (initialOtp) {
      return initialOtp.split('').concat(Array(6 - initialOtp.length).fill(''));
    }
    return Array(6).fill('');
  });

  const {
    register: registerUsername,
    handleSubmit: handleSubmitUsername,
    formState: { errors: usernameErrors },
  } = useForm<UsernameFormData>({
    resolver: zodResolver(usernameSchema),
  });

  const otp = otpDigits.join('');

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setInterval(() => setResendCooldown(c => c - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [resendCooldown]);

  useEffect(() => {
    if (step === 'otp' && inputRefs.current[0]) {
      inputRefs.current[0]?.focus();
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

  const handleVerifyOtp = useCallback(async () => {
    if (otp.length !== 6 || isLoading) return;
    setIsLoading(true);
    setOtpError('');
    try {
      await validateOTP(email, otp);
      setStep('username');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Verification failed';
      if (message.toLowerCase().includes('expired')) {
        setOtpError('Code has expired. Please request a new one.');
      } else if (message.toLowerCase().includes('invalid') || message.toLowerCase().includes('incorrect')) {
        setOtpError('Invalid code. Please check and try again.');
        setOtpDigits(Array(6).fill(''));
        inputRefs.current[0]?.focus();
      } else if (message.toLowerCase().includes('too many')) {
        setOtpError('Too many failed attempts. Please request a new OTP.');
      } else {
        setOtpError(message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [otp, isLoading, email, validateOTP]);

  const handleSetUsername = useCallback(async (data: UsernameFormData) => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await verifySignup(email, otp, data.username);
      showToast('Account created successfully!', { variant: 'success' });
      onSuccess(data.username);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create account';
      if (message.toLowerCase().includes('taken') || message.toLowerCase().includes('already') || message.toLowerCase().includes('unavailable')) {
        showToast('This username is already taken. Please choose another.', { variant: 'error' });
      } else {
        showToast(message, { variant: 'error' });
      }
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, email, otp, verifySignup, showToast, onSuccess]);

  const handleResend = useCallback(async () => {
    if (resendCooldown > 0) return;
    try {
      await resendOTP(email);
      setResendCooldown(60);
      showToast('Code resent to your email', { variant: 'success' });
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
  }, [resendCooldown, email, resendOTP, showToast]);

  if (step === 'username') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3" role="group" aria-label="Signup progress">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-state-success text-white text-body-xs font-semibold">
              <Check className="h-3.5 w-3.5" />
            </div>
            <span className="text-body-sm text-content-tertiary line-through">Account</span>
          </div>
          <div className="flex-1 h-px bg-state-success" />
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-state-success text-white text-body-xs font-semibold">
              <Check className="h-3.5 w-3.5" />
            </div>
            <span className="text-body-sm text-content-tertiary line-through">Verify</span>
          </div>
          <div className="flex-1 h-px bg-state-success" />
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-brand-600 text-white text-body-xs font-semibold step-pulse">
              3
            </div>
            <span className="text-body-sm font-medium text-content-primary">Username</span>
          </div>
        </div>

        <form onSubmit={handleSubmitUsername(handleSetUsername)} className="space-y-5" noValidate>
          <div className="text-center">
            <h3 className="text-heading-md font-semibold text-content-primary">Create your username</h3>
            <p className="text-body-sm text-content-tertiary mt-1.5">This will be your public display name</p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="username" className="label">Username</label>
            <div className="relative group">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-content-tertiary group-focus-within:text-brand-500 transition-colors" aria-hidden="true" />
              <Input
                id="username"
                type="text"
                autoComplete="username"
                placeholder="johndoe"
                className="pl-11 h-12"
                error={usernameErrors.username?.message}
                aria-required="true"
                aria-describedby={usernameErrors.username ? 'username-error' : 'username-hint'}
                {...registerUsername('username')}
              />
            </div>
            {!usernameErrors.username && (
              <p id="username-hint" className="text-caption text-content-tertiary">
                3-30 characters. Letters, numbers, underscore, and hyphen only.
              </p>
            )}
          </div>

          <Button type="submit" className="w-full h-12" loading={isLoading} disabled={isLoading}>
            Create Account
          </Button>

          <Button type="button" variant="ghost" className="w-full" onClick={() => setStep('otp')} disabled={isLoading}>
            Back to verification
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3" role="group" aria-label="Signup progress">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-state-success text-white text-body-xs font-semibold">
            <Check className="h-3.5 w-3.5" />
          </div>
          <span className="text-body-sm text-content-tertiary line-through">Account</span>
        </div>
        <div className="flex-1 h-px bg-state-success" />
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-brand-600 text-white text-body-xs font-semibold step-pulse">
            2
          </div>
          <span className="text-body-sm font-medium text-content-primary">Verify</span>
        </div>
        <div className="flex-1 h-px bg-surface-200 dark:bg-surface-700" />
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-surface-200 dark:bg-surface-700 text-content-tertiary text-body-xs font-semibold">
            3
          </div>
          <span className="text-body-sm text-content-tertiary">Username</span>
        </div>
      </div>

      <div className="text-center">
        <h3 className="text-heading-md font-semibold text-content-primary">Verify your email</h3>
        <p className="text-body-sm text-content-tertiary mt-1.5">
          We sent a 6-digit code to{' '}
          <strong className="text-content-primary">{email}</strong>
        </p>
      </div>

      <div
        className="flex gap-2.5 justify-center"
        role="group"
        aria-label="One-time code input"
      >
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

      <Button type="button" variant="ghost" className="w-full" onClick={onBack} disabled={isLoading}>
        Back to sign up
      </Button>
    </div>
  );
}

function Check(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
