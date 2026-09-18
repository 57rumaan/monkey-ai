import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Mail, Lock, Bell, Save, Shield, Moon, Sun, MailPlus } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';

const profileSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(30, 'Username must be at most 30 characters').regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscore, and hyphen'),
  email: z.string().email('Invalid email address'),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

const tabs = [
  { id: 'profile' as const, label: 'Profile', icon: User },
  { id: 'password' as const, label: 'Password', icon: Lock },
  { id: 'preferences' as const, label: 'Preferences', icon: Bell },
];

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

function ToggleSwitch({ checked, onChange, disabled }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-surface-900',
        checked ? 'bg-brand-600' : 'bg-surface-300 dark:bg-surface-600',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out',
          checked ? 'translate-x-5' : 'translate-x-0'
        )}
      />
    </button>
  );
}

export function SettingsPage() {
  const { user, updateProfile, changePassword } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'preferences'>('profile');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('darkMode');
      if (stored !== null) return stored === 'true';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  const [emailNotifications, setEmailNotifications] = useState(() => {
    const stored = localStorage.getItem('emailNotifications');
    return stored !== null ? stored === 'true' : true;
  });

  const [marketingEmails, setMarketingEmails] = useState(() => {
    const stored = localStorage.getItem('marketingEmails');
    return stored !== null ? stored === 'true' : false;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', String(darkMode));
  }, [darkMode]);

  const handleToggleDarkMode = (checked: boolean) => {
    setDarkMode(checked);
    showToast(checked ? 'Dark mode enabled' : 'Light mode enabled', { variant: 'success', duration: 2000 });
  };

  const handleToggleEmailNotifications = (checked: boolean) => {
    setEmailNotifications(checked);
    localStorage.setItem('emailNotifications', String(checked));
    showToast(checked ? 'Email notifications enabled' : 'Email notifications disabled', { variant: 'success', duration: 2000 });
  };

  const handleToggleMarketingEmails = (checked: boolean) => {
    setMarketingEmails(checked);
    localStorage.setItem('marketingEmails', String(checked));
    showToast(checked ? 'Marketing emails enabled' : 'Marketing emails disabled', { variant: 'success', duration: 2000 });
  };

  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    formState: { errors: profileErrors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: { username: user?.username || '', email: user?.email || '' },
  });

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    formState: { errors: passwordErrors },
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  const handleUpdateProfile = async (data: ProfileFormData) => {
    setIsSavingProfile(true);
    try {
      await updateProfile(data);
      showToast('Profile updated', { variant: 'success' });
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to update profile', { variant: 'error' });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (data: PasswordFormData) => {
    setIsSavingPassword(true);
    try {
      await changePassword(data.currentPassword, data.newPassword);
      showToast('Password changed', { variant: 'success' });
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to change password', { variant: 'error' });
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-heading-xl font-bold text-content-primary">Settings</h1>
        <p className="text-body text-content-tertiary mt-1">Manage your account settings and preferences</p>
      </div>

      <div className="flex gap-1 p-1 bg-surface-100 dark:bg-surface-800 rounded-xl">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-body font-medium rounded-lg transition-all',
              activeTab === tab.id
                ? 'bg-white dark:bg-surface-700 text-content-primary shadow-sm'
                : 'text-content-tertiary hover:text-content-secondary'
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'profile' && (
        <Card>
          <CardHeader>
            <h2 className="text-heading-md font-semibold text-content-primary flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-brand-100 dark:bg-brand-900 flex items-center justify-center">
                <User className="h-4 w-4 text-brand-600 dark:text-brand-400" />
              </div>
              Profile Information
            </h2>
            <p className="text-body-sm text-content-tertiary mt-1">Update your personal details and public profile</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitProfile(handleUpdateProfile)} className="space-y-5" noValidate>
              <div>
                <label htmlFor="username" className="label">Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-content-tertiary" />
                  <Input
                    id="username"
                    className="pl-10"
                    placeholder="Enter your username"
                    error={profileErrors.username?.message}
                    {...registerProfile('username')}
                  />
                </div>
                <p className="text-body-xs text-content-tertiary mt-1.5">Letters, numbers, underscore and hyphen only</p>
              </div>

              <div>
                <label htmlFor="email" className="label">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-content-tertiary" />
                  <Input
                    id="email"
                    type="email"
                    className="pl-10"
                    placeholder="you@example.com"
                    error={profileErrors.email?.message}
                    {...registerProfile('email')}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" loading={isSavingProfile} className="min-w-[140px]">
                  <Save className="h-4 w-4 mr-2" /> Save Changes
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {activeTab === 'password' && (
        <Card>
          <CardHeader>
            <h2 className="text-heading-md font-semibold text-content-primary flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
                <Lock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </div>
              Change Password
            </h2>
            <p className="text-body-sm text-content-tertiary mt-1">Ensure your account stays secure with a strong password</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitPassword(handleChangePassword)} className="space-y-5" noValidate>
              <div>
                <label htmlFor="currentPassword" className="label">Current Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-content-tertiary" />
                  <Input
                    id="currentPassword"
                    type="password"
                    autoComplete="current-password"
                    className="pl-10"
                    placeholder="Enter current password"
                    error={passwordErrors.currentPassword?.message}
                    {...registerPassword('currentPassword')}
                  />
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="newPassword" className="label">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-content-tertiary" />
                    <Input
                      id="newPassword"
                      type="password"
                      autoComplete="new-password"
                      className="pl-10"
                      placeholder="Min 8 characters"
                      error={passwordErrors.newPassword?.message}
                      {...registerPassword('newPassword')}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="label">Confirm New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-content-tertiary" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      className="pl-10"
                      placeholder="Repeat new password"
                      error={passwordErrors.confirmPassword?.message}
                      {...registerPassword('confirmPassword')}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" loading={isSavingPassword} className="min-w-[160px]">
                  <Shield className="h-4 w-4 mr-2" /> Change Password
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {activeTab === 'preferences' && (
        <Card>
          <CardHeader>
            <h2 className="text-heading-md font-semibold text-content-primary flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                <Bell className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              Preferences
            </h2>
            <p className="text-body-sm text-content-tertiary mt-1">Customize your notification and display settings</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="flex items-center justify-between p-4 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                    <MailPlus className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-body font-medium text-content-primary">Email Notifications</p>
                    <p className="text-body-sm text-content-tertiary">Receive email updates about your account</p>
                  </div>
                </div>
                <ToggleSwitch checked={emailNotifications} onChange={handleToggleEmailNotifications} />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center">
                    <Bell className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-body font-medium text-content-primary">Marketing Emails</p>
                    <p className="text-body-sm text-content-tertiary">Receive product updates and tips</p>
                  </div>
                </div>
                <ToggleSwitch checked={marketingEmails} onChange={handleToggleMarketingEmails} />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'h-10 w-10 rounded-lg flex items-center justify-center transition-colors',
                    darkMode ? 'bg-indigo-900' : 'bg-amber-100'
                  )}>
                    {darkMode ? (
                      <Moon className="h-5 w-5 text-indigo-400" />
                    ) : (
                      <Sun className="h-5 w-5 text-amber-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-body font-medium text-content-primary">Dark Mode</p>
                    <p className="text-body-sm text-content-tertiary">Use dark theme across the application</p>
                  </div>
                </div>
                <ToggleSwitch checked={darkMode} onChange={handleToggleDarkMode} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
