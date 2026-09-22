import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Checkbox } from '@/components/ui/Checkbox';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '@/components/ui/Toast';

const loginSchema = z.object({
  email: z.string().min(1, 'Email or username is required'),
  password: z.string().min(1, 'Password is required'),
  remember: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onSwitchToSignup: () => void;
  onForgotPassword: () => void;
}

export function LoginForm({ onSwitchToSignup, onForgotPassword }: LoginFormProps) {
  const { login } = useAuth();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { remember: false },
  });

  const onSubmit = useCallback(async (data: LoginFormData) => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await login(data.email, data.password);
      showToast('Welcome back!', { variant: 'success' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      if (message.toLowerCase().includes('invalid') || message.toLowerCase().includes('incorrect')) {
        showToast('Invalid email or password. Please try again.', { variant: 'error' });
      } else if (message.toLowerCase().includes('rate') || message.toLowerCase().includes('too many')) {
        showToast('Too many login attempts. Please try again later.', { variant: 'error' });
      } else if (message.toLowerCase().includes('network') || message.toLowerCase().includes('fetch')) {
        showToast('Network error. Please check your connection.', { variant: 'error' });
      } else {
        showToast(message, { variant: 'error' });
      }
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, login, showToast]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div className="space-y-1.5">
        <label htmlFor="login-email" className="label">Email or Username</label>
        <div className="relative group">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-content-tertiary)] group-focus-within:text-[var(--color-brand-500)] transition-colors" aria-hidden="true" />
          <Input
            id="login-email"
            type="text"
            autoComplete="username"
            placeholder="you@example.com"
            className="pl-11 h-12"
            error={errors.email?.message}
            aria-required="true"
            {...register('email')}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="login-password" className="label mb-0">Password</label>
          <button
            type="button"
            onClick={onForgotPassword}
            className="text-xs text-[var(--color-brand-500)] dark:text-[var(--color-brand-400)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] focus-visible:ring-offset-2 rounded transition-colors"
          >
            Forgot password?
          </button>
        </div>
        <div className="relative group">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-content-tertiary)] group-focus-within:text-[var(--color-brand-500)] transition-colors" aria-hidden="true" />
          <Input
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="Enter your password"
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
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between pt-1">
        <Checkbox
          label="Remember me"
          checked={watch('remember')}
          onChange={e => register('remember').onChange({ target: { checked: e } })}
        />
      </div>

      <Button type="submit" className="w-full h-12" loading={isLoading} disabled={isLoading}>
        Sign In
      </Button>

      <p className="text-center text-sm text-[var(--color-content-tertiary)] pt-2">
        Don&apos;t have an account?{' '}
        <button
          type="button"
          onClick={onSwitchToSignup}
          className="text-[var(--color-brand-500)] dark:text-[var(--color-brand-400)] hover:underline font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] focus-visible:ring-offset-2 rounded transition-colors"
        >
          Sign up
        </button>
      </p>
    </form>
  );
}
