import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { ForgotPasswordForm } from '@/features/auth/components/ForgotPasswordForm';

export function ForgotPasswordPage() {
  const navigate = useNavigate();

  const handleBackToLogin = useCallback(() => {
    navigate('/login');
  }, [navigate]);

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="We&apos;ll send you a code to reset your password"
    >
      <ForgotPasswordForm onBackToLogin={handleBackToLogin} />
    </AuthLayout>
  );
}
