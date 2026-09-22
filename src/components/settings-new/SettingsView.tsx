import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useToast } from '@/components/ui/Toast';
import {
  Button, Input, Textarea, Switch, Tabs, Badge, Avatar, Card,
  UserIcon, ShieldIcon, BellIcon, SunIcon, MoonIcon, MonitorIcon, LinkIcon, TrashIcon, LogOutIcon, CheckIcon
} from '@/components/ui-new';

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
  { id: 'profile' as const, label: 'Profile', icon: UserIcon },
  { id: 'security' as const, label: 'Security', icon: ShieldIcon },
  { id: 'appearance' as const, label: 'Appearance', icon: MonitorIcon },
  { id: 'notifications' as const, label: 'Notifications', icon: BellIcon },
  { id: 'connected' as const, label: 'Connected Providers', icon: LinkIcon },
];

const PROVIDERS = [
  { name: 'OpenAI', icon: '🤖', connected: true, models: 12, desc: 'GPT-4o, GPT-4 Turbo, and more' },
  { name: 'Anthropic', icon: '🧠', connected: true, models: 5, desc: 'Claude Sonnet, Haiku, Opus' },
  { name: 'Google AI', icon: '🔮', connected: false, models: 0, desc: 'Gemini Pro, Flash, Ultra' },
  { name: 'Meta AI', icon: '🦙', connected: false, models: 0, desc: 'Llama 3.3, Llama 3.1 and more' },
  { name: 'Mistral AI', icon: '💎', connected: false, models: 0, desc: 'Mistral Large, Nemo, Pixtral' },
];

const SESSIONS = [
  { device: 'MacBook Pro 16"', os: 'macOS 15.3', location: 'San Francisco, US', current: true, lastActive: 'Now' },
  { device: 'iPhone 16 Pro', os: 'iOS 18.2', location: 'San Francisco, US', current: false, lastActive: '1h ago' },
  { device: 'Chrome on Windows', os: 'Windows 11', location: 'New York, US', current: false, lastActive: '3 days ago' },
];

export function SettingsView() {
  const { user, updateProfile, changePassword } = useAuth();
  const { theme, setTheme } = useTheme();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'appearance' | 'notifications' | 'connected'>('profile');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [saved, setSaved] = useState(false);

  const [emailNotifications, setEmailNotifications] = useState(() => {
    const stored = localStorage.getItem('emailNotifications');
    return stored !== null ? stored === 'true' : true;
  });

  const [pushNotifications, setPushNotifications] = useState(() => {
    const stored = localStorage.getItem('pushNotifications');
    return stored !== null ? stored === 'true' : false;
  });

  const [productUpdates, setProductUpdates] = useState(() => {
    const stored = localStorage.getItem('productUpdates');
    return stored !== null ? stored === 'true' : true;
  });

  const [securityAlerts, setSecurityAlerts] = useState(() => {
    const stored = localStorage.getItem('securityAlerts');
    return stored !== null ? stored === 'true' : true;
  });

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: { username: user?.username || '', email: user?.email || '' },
  });

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  const handleToggleEmailNotifications = (checked: boolean) => {
    setEmailNotifications(checked);
    localStorage.setItem('emailNotifications', String(checked));
    showToast(checked ? 'Email notifications enabled' : 'Email notifications disabled', { variant: 'success', duration: 2000 });
  };

  const handleTogglePushNotifications = (checked: boolean) => {
    setPushNotifications(checked);
    localStorage.setItem('pushNotifications', String(checked));
    showToast(checked ? 'Push notifications enabled' : 'Push notifications disabled', { variant: 'success', duration: 2000 });
  };

  const handleToggleProductUpdates = (checked: boolean) => {
    setProductUpdates(checked);
    localStorage.setItem('productUpdates', String(checked));
    showToast(checked ? 'Product updates enabled' : 'Product updates disabled', { variant: 'success', duration: 2000 });
  };

  const handleToggleSecurityAlerts = (checked: boolean) => {
    setSecurityAlerts(checked);
    localStorage.setItem('securityAlerts', String(checked));
    showToast(checked ? 'Security alerts enabled' : 'Security alerts disabled', { variant: 'success', duration: 2000 });
  };

  const handleSaveProfile = async (data: ProfileFormData) => {
    setIsSavingProfile(true);
    try {
      await updateProfile(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      showToast('Profile updated', { variant: 'success', duration: 2000 });
    } catch (err: any) {
      showToast(err.message || 'Failed to update profile', { variant: 'error' });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSavePassword = async (data: PasswordFormData) => {
    setIsSavingPassword(true);
    try {
      await changePassword(data.currentPassword, data.newPassword);
      passwordForm.reset();
      showToast('Password updated', { variant: 'success', duration: 2000 });
    } catch (err: any) {
      showToast(err.message || 'Failed to update password', { variant: 'error' });
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto w-full px-6 py-6 pb-12">
        <h2 className="text-xl font-semibold text-[var(--foreground)] mb-6">Settings</h2>
        <Tabs tabs={tabs} active={activeTab} onChange={(id: string) => setActiveTab(id as any)} />
        <div className="mt-6">
          {/* Profile */}
          {activeTab === 'profile' && (
            <form onSubmit={profileForm.handleSubmit(handleSaveProfile)} className="flex flex-col gap-6">
              <div className="flex items-center gap-4">
                <Avatar name={user?.username || 'User'} size="lg" />
                <div>
                  <Button variant="outline" size="sm">Change photo</Button>
                  <p className="text-xs text-[var(--muted-foreground)] mt-1">JPG, PNG or GIF. Max 2MB.</p>
                </div>
              </div>
              <Input label="Full name" {...profileForm.register('username')} error={profileForm.formState.errors.username?.message} />
              <Input label="Email" type="email" {...profileForm.register('email')} error={profileForm.formState.errors.email?.message} rightElement={<Badge variant="success"><CheckIcon /> Verified</Badge>} />
              <Textarea label="Bio" placeholder="Tell us a bit about yourself..." rows={3} />
              <Input label="Username" value={`@${user?.username || ''}`} hint="Your public username used in shared conversations." />
              <div className="flex justify-end">
                <Button type="submit" icon={saved ? <CheckIcon /> : undefined} loading={isSavingProfile}>
                  {saved ? 'Saved' : 'Save changes'}
                </Button>
              </div>
            </form>
          )}

          {/* Security */}
          {activeTab === 'security' && (
            <div className="flex flex-col gap-6">
              <Card>
                <form onSubmit={passwordForm.handleSubmit(handleSavePassword)} className="p-4 flex flex-col gap-3">
                  <h3 className="font-medium text-[var(--foreground)] mb-4">Change password</h3>
                  <Input label="Current password" type="password" placeholder="••••••••" {...passwordForm.register('currentPassword')} error={passwordForm.formState.errors.currentPassword?.message} />
                  <Input label="New password" type="password" placeholder="Min. 8 characters" {...passwordForm.register('newPassword')} error={passwordForm.formState.errors.newPassword?.message} />
                  <Input label="Confirm new password" type="password" placeholder="Repeat password" {...passwordForm.register('confirmPassword')} error={passwordForm.formState.errors.confirmPassword?.message} />
                  <Button type="submit" variant="primary" className="w-fit" loading={isSavingPassword}>Update password</Button>
                </form>
              </Card>
              <Card>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-[var(--foreground)]">Active sessions</h3>
                    <Button variant="ghost" size="sm" icon={<LogOutIcon />}>Sign out all</Button>
                  </div>
                  <div className="flex flex-col gap-3">
                    {SESSIONS.map((s, i) => (
                      <div key={i} className="flex items-center gap-3 py-2 border-b border-[var(--border)] last:border-0">
                        <div className="w-9 h-9 rounded-lg bg-[var(--muted)] flex items-center justify-center text-[var(--muted-foreground)] flex-shrink-0">
                          <MonitorIcon />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-[var(--foreground)]">{s.device}</p>
                            {s.current && <Badge variant="success">Current</Badge>}
                          </div>
                          <p className="text-xs text-[var(--muted-foreground)]">{s.os} · {s.location} · {s.lastActive}</p>
                        </div>
                        {!s.current && <Button variant="ghost" size="xs" danger>Revoke</Button>}
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
              <div className="flex flex-col gap-3 p-4 border border-red-200 dark:border-red-900/40 rounded-[var(--radius-lg)] bg-red-50 dark:bg-red-900/10">
                <p className="font-medium text-[var(--error)]">Danger zone</p>
                <p className="text-sm text-[var(--muted-foreground)]">These actions are permanent and cannot be undone.</p>
                <div className="flex flex-col gap-2">
                  <Button variant="outline" size="sm" className="w-fit">Export all data</Button>
                  <Button variant="danger" size="sm" className="w-fit" onClick={() => setDeleteConfirm(true)} icon={<TrashIcon />}>
                    Delete account
                  </Button>
                </div>
                {deleteConfirm && (
                  <div className="mt-2 p-3 bg-red-100 dark:bg-red-900/20 rounded-[var(--radius)] border border-red-300 dark:border-red-800">
                    <p className="text-sm font-medium text-[var(--error)] mb-2">Are you sure? This is irreversible.</p>
                    <div className="flex gap-2">
                      <Button variant="danger" size="sm">Yes, delete my account</Button>
                      <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(false)}>Cancel</Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Appearance */}
          {activeTab === 'appearance' && (
            <div className="flex flex-col gap-6">
              <div>
                <p className="text-sm font-medium text-[var(--foreground)] mb-3">Theme</p>
                <div className="grid grid-cols-3 gap-3">
                  {([
                    { id: 'light' as const, label: 'Light', icon: <SunIcon />, preview: 'bg-white border-gray-200' },
                    { id: 'dark' as const, label: 'Dark', icon: <MoonIcon />, preview: 'bg-[#0F1117] border-[#252840]' },
                    { id: 'system' as const, label: 'System', icon: <MonitorIcon />, preview: 'bg-gradient-to-br from-white to-[#0F1117] border-gray-400' },
                  ] as const).map(t => (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t.id)}
                      className={cn(
                        'relative flex flex-col items-center gap-2 p-4 rounded-[var(--radius-lg)] border-2 transition-all',
                        theme === t.id ? 'border-[var(--primary)] bg-[var(--primary)]/5' : 'border-[var(--border)] hover:border-[var(--primary)]/40'
                      )}
                    >
                      <div className={cn('w-full h-16 rounded-[var(--radius)] border overflow-hidden relative', t.preview)}>
                        <div className="absolute left-0 top-0 bottom-0 w-6 bg-black/5 dark:bg-white/5" />
                        <div className="absolute left-7 top-2 right-2 h-2 bg-black/10 dark:bg-white/10 rounded" />
                        <div className="absolute left-7 top-6 right-4 h-2 bg-black/5 dark:bg-white/5 rounded" />
                      </div>
                      <span className="text-sm font-medium text-[var(--foreground)] flex items-center gap-1.5">
                        {t.icon} {t.label}
                      </span>
                      {theme === t.id && <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[var(--primary)] flex items-center justify-center text-white"><CheckIcon /></div>}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--foreground)] mb-2">Font size</p>
                <div className="flex gap-2">
                  {['Small', 'Default', 'Large'].map(s => (
                    <button key={s} className={cn(
                      'px-3 py-1.5 rounded-[var(--radius)] text-sm border transition-colors',
                      s === 'Default' ? 'bg-[var(--primary)] text-white border-[var(--primary)]' : 'border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                    )}>{s}</button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--foreground)] mb-2">Chat density</p>
                <div className="flex gap-2">
                  {['Compact', 'Comfortable', 'Spacious'].map(d => (
                    <button key={d} className={cn(
                      'px-3 py-1.5 rounded-[var(--radius)] text-sm border transition-colors',
                      d === 'Comfortable' ? 'bg-[var(--primary)] text-white border-[var(--primary)]' : 'border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                    )}>{d}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Notifications */}
          {activeTab === 'notifications' && (
            <div className="flex flex-col gap-4">
              <Card>
                <div className="p-4 flex flex-col gap-4">
                  {[
                    { key: 'email' as const, label: 'Email notifications', desc: 'Receive updates and summaries via email', checked: emailNotifications, onChange: handleToggleEmailNotifications },
                    { key: 'push' as const, label: 'Push notifications', desc: 'Browser and mobile push alerts', checked: pushNotifications, onChange: handleTogglePushNotifications },
                    { key: 'updates' as const, label: 'Product updates', desc: 'New features, improvements, and changes', checked: productUpdates, onChange: handleToggleProductUpdates },
                    { key: 'security' as const, label: 'Security alerts', desc: 'Login attempts and account changes', checked: securityAlerts, onChange: handleToggleSecurityAlerts },
                  ].map(n => (
                    <div key={n.key} className="flex items-center justify-between gap-4 border-b border-[var(--border)] last:border-0 pb-4 last:pb-0">
                      <div>
                        <p className="text-sm font-medium text-[var(--foreground)]">{n.label}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">{n.desc}</p>
                      </div>
                      <Switch checked={n.checked} onChange={n.onChange} />
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* Connected Providers */}
          {activeTab === 'connected' && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-[var(--muted-foreground)]">Connect AI providers to access their models in Octix AI.</p>
              {PROVIDERS.map(p => (
                <Card key={p.name}>
                  <div className="p-4 flex items-center gap-4">
                    <span className="text-2xl">{p.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-[var(--foreground)]">{p.name}</p>
                        <Badge variant={p.connected ? 'success' : 'muted'}>{p.connected ? 'Connected' : 'Not connected'}</Badge>
                      </div>
                      <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{p.desc}</p>
                      {p.connected && <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{p.models} models available</p>}
                    </div>
                    {p.connected
                      ? <Button variant="outline" size="sm" danger>Disconnect</Button>
                      : <Button variant="primary" size="sm" icon={<LinkIcon />}>Connect</Button>
                    }
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}