import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, Eye, EyeOff, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';

const signupSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type SignupFormData = z.infer<typeof signupSchema>;

interface SignupFormProps {
  onSuccess: (email: string, otp?: string) => void;
  onSwitchToLogin: () => void;
}

export function SignupForm({ onSuccess, onSwitchToLogin }: SignupFormProps) {
  const { signup } = useAuth();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  const passwordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
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

  const onSubmit = useCallback(async (data: SignupFormData) => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const result = await signup(data.email, data.password);
      showToast('Account created! Please verify your email.', { variant: 'success' });
      onSuccess(result.email, result.otp);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Signup failed';
      if (message.toLowerCase().includes('already') || message.toLowerCase().includes('exists')) {
        showToast('An account with this email already exists.', { variant: 'error' });
      } else if (message.toLowerCase().includes('rate') || message.toLowerCase().includes('too many')) {
        showToast('Too many attempts. Please try again later.', { variant: 'error' });
      } else {
        showToast(message, { variant: 'error' });
      }
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, signup, showToast, onSuccess]);

  const passwordValue = watch('password') || '';
  const strength = passwordValue ? passwordStrength(passwordValue) : 0;
  const confirmPasswordValue = watch('confirmPassword') || '';
  const passwordsMatch = confirmPasswordValue.length > 0 && passwordValue === confirmPasswordValue;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3" role="group" aria-label="Signup progress">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-brand-600 text-white text-body-xs font-semibold">
            1
          </div>
          <span className="text-body-sm font-medium text-content-primary">Account</span>
        </div>
        <div className="flex-1 h-px bg-surface-200 dark:bg-surface-700" />
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-surface-200 dark:bg-surface-700 text-content-tertiary text-body-xs font-semibold">
            2
          </div>
          <span className="text-body-sm text-content-tertiary">Verify</span>
        </div>
        <div className="flex-1 h-px bg-surface-200 dark:bg-surface-700" />
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-surface-200 dark:bg-surface-700 text-content-tertiary text-body-xs font-semibold">
            3
          </div>
          <span className="text-body-sm text-content-tertiary">Username</span>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <div className="space-y-1.5">
          <label htmlFor="signup-email" className="label">Email</label>
          <div className="relative group">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-content-tertiary group-focus-within:text-brand-500 transition-colors" aria-hidden="true" />
            <Input
              id="signup-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              className="pl-11 h-12"
              error={errors.email?.message}
              aria-required="true"
              {...register('email')}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="signup-password" className="label">Password</label>
          <div className="relative group">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-content-tertiary group-focus-within:text-brand-500 transition-colors" aria-hidden="true" />
            <Input
              id="signup-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Create a strong password"
              className="pl-11 pr-11 h-12"
              error={errors.password?.message}
              aria-required="true"
              {...register('password')}
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
          <label htmlFor="signup-confirm-password" className="label">Confirm Password</label>
          <div className="relative group">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-content-tertiary group-focus-within:text-brand-500 transition-colors" aria-hidden="true" />
            <Input
              id="signup-confirm-password"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Confirm your password"
              className={cn(
                'pl-11 pr-11 h-12',
                passwordsMatch && 'border-state-success dark:border-state-success'
              )}
              error={errors.confirmPassword?.message}
              aria-required="true"
              {...register('confirmPassword')}
            />
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              {passwordsMatch && (
                <Check className="h-4 w-4 text-state-success" aria-label="Passwords match" />
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
          Create Account
        </Button>

        <p className="text-center text-body-sm text-content-tertiary pt-2">
          Already have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-brand-600 dark:text-brand-400 hover:underline font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 rounded transition-colors"
          >
            Sign in
          </button>
        </p>
      </form>
    </div>
  );
}
