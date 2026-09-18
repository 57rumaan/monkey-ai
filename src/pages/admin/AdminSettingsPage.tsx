import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, Shield, Database, Mail, Globe } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { useToast } from '@/components/ui/Toast';

const settingsSchema = z.object({
  appName: z.string().min(1, 'App name is required'),
  appDescription: z.string().optional(),
  maintenanceMode: z.boolean().default(false),
  allowSignup: z.boolean().default(true),
  defaultBundleId: z.string().optional(),
  smtpHost: z.string().optional(),
  smtpPort: z.number().optional(),
  smtpUser: z.string().optional(),
  smtpFrom: z.string().email().optional().or(z.literal('')),
  smtpPass: z.string().optional(),
  rateLimitAuth: z.number().min(1).max(100).default(5),
  rateLimitApi: z.number().min(1).max(1000).default(60),
  sessionDurationDays: z.number().min(1).max(90).default(7),
  refreshTokenDurationDays: z.number().min(1).max(365).default(30),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

async function updateSettings(data: Partial<SettingsFormData>) {
  const response = await fetch('/api/admin/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!result.success) throw new Error(result.error || 'Failed to update settings');
  return result.data;
}

export function AdminSettingsPage() {
  const { showToast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema) as any,
    defaultValues: {
      appName: 'MONKEY AI',
      appDescription: 'Professional AI Assistant',
      maintenanceMode: false,
      allowSignup: true,
      smtpPort: 587,
      smtpPass: '',
      rateLimitAuth: 5,
      rateLimitApi: 60,
      sessionDurationDays: 7,
      refreshTokenDurationDays: 30,
    },
  });

  const onSubmit = async (data: SettingsFormData) => {
    setIsSaving(true);
    try {
      await updateSettings(data);
      showToast('Settings saved', { variant: 'success' });
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to save settings', { variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-heading-xl font-bold text-content-primary">Settings</h1>
        <p className="text-body text-content-tertiary mt-1">Configure application settings and behavior</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6" noValidate>
        <Card>
          <CardHeader>
            <h2 className="text-heading-md font-semibold text-content-primary flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <Globe className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              General
            </h2>
            <p className="text-body-sm text-content-tertiary mt-1">Basic application configuration</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input label="Application Name" error={errors.appName?.message} {...register('appName')} />
            <Textarea label="Description" rows={3} {...register('appDescription')} />
            <div className="flex items-center justify-between p-3 rounded-lg bg-surface-50 dark:bg-surface-800/50">
              <div>
                <p className="text-body font-medium text-content-primary">Maintenance Mode</p>
                <p className="text-body-sm text-content-tertiary">Disable access for non-admin users</p>
              </div>
              <Checkbox label="Maintenance Mode" checked={false} onChange={(checked) => register('maintenanceMode').onChange({ target: { checked } } as any)} />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-surface-50 dark:bg-surface-800/50">
              <div>
                <p className="text-body font-medium text-content-primary">Allow Sign Up</p>
                <p className="text-body-sm text-content-tertiary">Enable new user registration</p>
              </div>
              <Checkbox label="Allow Sign Up" checked={true} onChange={(checked) => register('allowSignup').onChange({ target: { checked } } as any)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-heading-md font-semibold text-content-primary flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <Mail className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              Email (SMTP)
            </h2>
            <p className="text-body-sm text-content-tertiary mt-1">Configure outbound email delivery</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input label="SMTP Host" placeholder="smtp.example.com" {...register('smtpHost')} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="SMTP Port" type="number" {...register('smtpPort', { valueAsNumber: true })} />
              <Input label="SMTP Username" {...register('smtpUser')} />
            </div>
            <Input label="From Email" type="email" placeholder="noreply@example.com" {...register('smtpFrom')} />
            <Input label="SMTP Password" type="password" placeholder="••••••••" {...register('smtpPass')} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-heading-md font-semibold text-content-primary flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
                <Shield className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </div>
              Security & Rate Limits
            </h2>
            <p className="text-body-sm text-content-tertiary mt-1">Authentication and request throttling</p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Auth Rate Limit (req/min)" type="number" min="1" max="100" {...register('rateLimitAuth', { valueAsNumber: true })} />
              <Input label="API Rate Limit (req/min)" type="number" min="1" max="1000" {...register('rateLimitApi', { valueAsNumber: true })} />
              <Input label="Session Duration (days)" type="number" min="1" max="90" {...register('sessionDurationDays', { valueAsNumber: true })} />
              <Input label="Refresh Token Duration (days)" type="number" min="1" max="365" {...register('refreshTokenDurationDays', { valueAsNumber: true })} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-heading-md font-semibold text-content-primary flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                <Database className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              Storage
            </h2>
            <p className="text-body-sm text-content-tertiary mt-1">Data persistence configuration</p>
          </CardHeader>
          <CardContent>
            <div className="p-4 rounded-lg bg-surface-50 dark:bg-surface-800/50 space-y-3">
              <p className="text-body-sm text-content-tertiary">Currently using: <strong className="text-content-primary">Local Storage (Development)</strong></p>
              <p className="text-body-sm text-content-tertiary">For production, configure JSONBin.io credentials in environment variables:</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <code className="font-mono text-body-xs bg-surface-200 dark:bg-surface-700 px-2 py-1 rounded-md text-content-secondary">JSONBIN_API_KEY</code>
                <code className="font-mono text-body-xs bg-surface-200 dark:bg-surface-700 px-2 py-1 rounded-md text-content-secondary">JSONBIN_BIN_ID</code>
                <code className="font-mono text-body-xs bg-surface-200 dark:bg-surface-700 px-2 py-1 rounded-md text-content-secondary">JSONBIN_MASTER_KEY</code>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 pt-4 border-t border-border-default">
          <Button type="button" variant="secondary" onClick={() => reset()}>Reset</Button>
          <Button type="submit" loading={isSaving} className="min-w-[140px]">
            <Save className="h-4 w-4 mr-2" /> Save Settings
          </Button>
        </div>
      </form>
    </div>
  );
}
