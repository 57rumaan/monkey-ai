import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { LoginForm } from '@/features/auth/components/LoginForm';
import { SignupForm } from '@/features/auth/components/SignupForm';
import { VerifyOTPForm } from '@/features/auth/components/VerifyOTPForm';

export function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'signup' | 'verify'>('login');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupOtp, setSignupOtp] = useState('');

  const handleSwitchToSignup = useCallback(() => setMode('signup'), []);
  const handleSwitchToLogin = useCallback(() => setMode('login'), []);

  const handleSignupSuccess = useCallback((email: string, otp?: string) => {
    setSignupEmail(email);
    setSignupOtp(otp || '');
    setMode('verify');
  }, []);

  const handleVerifySuccess = useCallback(() => {
    setMode('login');
  }, []);

  const handleForgotPassword = useCallback(() => {
    navigate('/forgot-password');
  }, [navigate]);

  const handleResendOtp = useCallback(() => {
  }, []);

  if (mode === 'signup') {
    return (
      <AuthLayout
        title="Create your account"
        subtitle="Start your journey with MONKEY AI"
      >
        <SignupForm
          onSuccess={handleSignupSuccess}
          onSwitchToLogin={handleSwitchToLogin}
        />
      </AuthLayout>
    );
  }

  if (mode === 'verify') {
    return (
      <AuthLayout
        title="Verify your email"
        subtitle="Check your inbox for the verification code"
      >
        <VerifyOTPForm
          email={signupEmail}
          onSuccess={handleVerifySuccess}
          onResend={handleResendOtp}
          onBack={() => setMode('signup')}
          initialOtp={signupOtp}
        />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your MONKEY AI account"
    >
      <LoginForm
        onSwitchToSignup={handleSwitchToSignup}
        onForgotPassword={handleForgotPassword}
      />
    </AuthLayout>
  );
}
