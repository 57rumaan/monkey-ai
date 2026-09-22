import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Server, Cpu, Loader2, ChevronRight, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { ModalProvider, ModalOverlay, ModalContainer, ModalHeader, ModalBody, ModalFooter, ConfirmModal } from '@/components/ui/Modal';
import { Dropdown, DropdownItem } from '@/components/ui/Dropdown';
import { useToast } from '@/components/ui/Toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import { CAPABILITY_REGISTRY } from '@/lib/capabilities/registry';

const providerSchema = z.object({
  label: z.string().min(1, 'Label is required'),
  apiKeyEnv: z.string().min(1, 'Environment variable name is required'),
  status: z.enum(['active', 'inactive']),
});

const modelSchema = z.object({
  customName: z.string().min(1, 'Custom name is required'),
  capabilities: z.array(z.string()).min(1, 'Select at least one capability'),
  enabled: z.boolean().default(true),
  rules: z.object({
    maxTokens: z.number().optional(),
    temperature: z.number().optional(),
    topP: z.number().optional(),
    frequencyPenalty: z.number().optional(),
    presencePenalty: z.number().optional(),
    stopSequences: z.array(z.string()).optional(),
    systemPrompt: z.string().optional(),
  }).optional(),
});

type ProviderFormData = z.infer<typeof providerSchema>;
type ModelFormData = z.infer<typeof modelSchema>;

interface Provider {
  id: string;
  label: string;
  apiKeyEnv: string;
  status: 'active' | 'inactive';
  models: RawModel[];
  createdAt: string;
  updatedAt: string;
}

interface RawModel {
  id: string;
  providerId: string;
  customName: string;
  enabled: boolean;
  rules: Record<string, unknown>;
  capabilities: string[];
  createdAt: string;
  updatedAt: string;
}

const CAPABILITY_OPTIONS = Object.entries(CAPABILITY_REGISTRY).map(([value, def]) => ({
  value,
  label: def.label,
}));

async function fetchProviders() {
  const response = await fetch('/api/providers', { credentials: 'include' });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch providers');
  return data.data as Provider[];
}

async function createProvider(data: ProviderFormData) {
  const response = await fetch('/api/providers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!result.success) throw new Error(result.error || 'Failed to create provider');
  return result.data;
}

async function updateProvider(id: string, data: Partial<ProviderFormData>) {
  const response = await fetch(`/api/providers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!result.success) throw new Error(result.error || 'Failed to update provider');
  return result.data;
}

async function deleteProvider(id: string) {
  const response = await fetch(`/api/providers/${id}`, { method: 'DELETE', credentials: 'include' });
  const result = await response.json();
  if (!result.success) throw new Error(result.error || 'Failed to delete provider');
}

async function addModel(providerId: string, data: ModelFormData) {
  const response = await fetch(`/api/providers/${providerId}/models`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!result.success) throw new Error(result.error || 'Failed to add model');
  return result.data;
}

async function updateModel(providerId: string, modelId: string, data: Partial<ModelFormData>) {
  const response = await fetch(`/api/providers/${providerId}/models/${modelId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!result.success) throw new Error(result.error || 'Failed to update model');
  return result.data;
}

async function deleteModel(providerId: string, modelId: string) {
  const response = await fetch(`/api/providers/${providerId}/models/${modelId}`, { method: 'DELETE', credentials: 'include' });
  const result = await response.json();
  if (!result.success) throw new Error(result.error || 'Failed to delete model');
}

export function AdminProvidersPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [isCreatingProvider, setIsCreatingProvider] = useState(false);
  const [addingModelTo, setAddingModelTo] = useState<string | null>(null);
  const [editingModel, setEditingModel] = useState<RawModel | null>(null);
  const [expandedProviders, setExpandedProviders] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'provider' | 'model'; id: string; providerId: string; name: string } | null>(null);

  const { data: providers = [], isLoading, error } = useQuery({ queryKey: ['providers'], queryFn: fetchProviders });

  const createMutation = useMutation({
    mutationFn: createProvider,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['providers'] }); setIsCreatingProvider(false); showToast('Provider created', { variant: 'success' }); },
    onError: (error) => showToast(error instanceof Error ? error.message : 'Failed to create provider', { variant: 'error' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ProviderFormData> }) => updateProvider(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['providers'] }); setEditingProvider(null); showToast('Provider updated', { variant: 'success' }); },
    onError: (error) => showToast(error instanceof Error ? error.message : 'Failed to update provider', { variant: 'error' }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProvider,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['providers'] }); setConfirmDelete(null); showToast('Provider deleted', { variant: 'success' }); },
    onError: (error) => { showToast(error instanceof Error ? error.message : 'Failed to delete provider', { variant: 'error' }); setConfirmDelete(null); },
  });

  const addModelMutation = useMutation({
    mutationFn: ({ providerId, data }: { providerId: string; data: ModelFormData }) => addModel(providerId, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['providers'] }); setAddingModelTo(null); showToast('Model added', { variant: 'success' }); },
    onError: (error) => showToast(error instanceof Error ? error.message : 'Failed to add model', { variant: 'error' }),
  });

  const updateModelMutation = useMutation({
    mutationFn: ({ providerId, modelId, data }: { providerId: string; modelId: string; data: Partial<ModelFormData> }) => updateModel(providerId, modelId, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['providers'] }); setEditingModel(null); showToast('Model updated', { variant: 'success' }); },
    onError: (error) => showToast(error instanceof Error ? error.message : 'Failed to update model', { variant: 'error' }),
  });

  const deleteModelMutation = useMutation({
    mutationFn: ({ providerId, modelId }: { providerId: string; modelId: string }) => deleteModel(providerId, modelId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['providers'] }); setConfirmDelete(null); showToast('Model removed', { variant: 'success' }); },
    onError: (error) => { showToast(error instanceof Error ? error.message : 'Failed to remove model', { variant: 'error' }); setConfirmDelete(null); },
  });

  const toggleProvider = (id: string) => {
    setExpandedProviders(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isModalOpen = isCreatingProvider || !!editingProvider || !!addingModelTo || !!editingModel;
  const closeModal = () => { setIsCreatingProvider(false); setEditingProvider(null); setAddingModelTo(null); setEditingModel(null); };

  return (
    <ModalProvider isOpen={isModalOpen} onClose={closeModal}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[var(--color-content-primary)]">Providers & Raw Models</h1>
            <p className="text-sm text-[var(--color-content-tertiary)] mt-1">Manage AI providers and their raw models</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="neutral">{providers.length} providers</Badge>
            <Button onClick={() => setIsCreatingProvider(true)}>
              <Plus className="h-4 w-4 mr-2" /> Add Provider
            </Button>
          </div>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="h-64 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--color-brand-500)]" />
            </CardContent>
          </Card>
        ) : error ? (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-10 w-10 text-[var(--color-state-error)] mx-auto mb-3" />
              <h3 className="text-lg font-medium text-[var(--color-content-primary)] mb-1">Failed to load providers</h3>
              <p className="text-sm text-[var(--color-content-tertiary)] mb-4">{error instanceof Error ? error.message : 'An error occurred'}</p>
              <Button variant="secondary" onClick={() => queryClient.invalidateQueries({ queryKey: ['providers'] })}>Retry</Button>
            </CardContent>
          </Card>
        ) : providers.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <div className="h-16 w-16 rounded-full bg-[var(--color-surface-100)] dark:bg-[var(--color-surface-800)] flex items-center justify-center mx-auto mb-4">
                <Server className="h-8 w-8 text-[var(--color-content-tertiary)]" />
              </div>
              <h3 className="text-lg font-medium text-[var(--color-content-primary)] mb-2">No providers yet</h3>
              <p className="text-sm text-[var(--color-content-tertiary)] mb-6 max-w-sm mx-auto">Add your first AI provider to start configuring models and capabilities</p>
              <Button onClick={() => setIsCreatingProvider(true)}>
                <Plus className="h-4 w-4 mr-2" /> Add Provider
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {providers.map(provider => {
              const isExpanded = expandedProviders.has(provider.id);
              const enabledCount = provider.models.filter(m => m.enabled).length;
              return (
                <Card key={provider.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 cursor-pointer flex-1 min-w-0" onClick={() => toggleProvider(provider.id)}>
                        <div className="h-10 w-10 rounded-xl bg-[var(--color-brand-100)] dark:bg-[var(--color-brand-900)] flex items-center justify-center flex-shrink-0">
                          <Server className="h-5 w-5 text-[var(--color-brand-500)] dark:text-[var(--color-brand-400)]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-lg font-semibold text-[var(--color-content-primary)]">{provider.label}</h3>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge variant={provider.status === 'active' ? 'success' : 'neutral'}>
                              {provider.status === 'active' ? 'Active' : 'Inactive'}
                            </Badge>
                            <Badge variant="neutral" size="xs">
                              {provider.models.length} model{provider.models.length !== 1 ? 's' : ''}
                              {provider.models.length > 0 && ` (${enabledCount} enabled)`}
                            </Badge>
                            <span className="text-xs text-[var(--color-content-tertiary)] font-mono bg-[var(--color-surface-100)] dark:bg-[var(--color-surface-800)] px-1.5 py-0.5 rounded">
                              {provider.apiKeyEnv}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className={cn('h-5 w-5 text-[var(--color-content-tertiary)] transition-transform flex-shrink-0', isExpanded && 'rotate-90')} />
                      </div>
                      <Dropdown
                        trigger={<Button variant="ghost" size="icon" aria-label="Provider actions"><svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor"><circle cx="8" cy="3" r="1.5" /><circle cx="8" cy="8" r="1.5" /><circle cx="8" cy="13" r="1.5" /></svg></Button>}
                        align="right"
                      >
                        <DropdownItem icon={<Edit className="h-4 w-4" />} onClick={() => setEditingProvider(provider)}>Edit Provider</DropdownItem>
                        <DropdownItem icon={<Plus className="h-4 w-4" />} onClick={() => setAddingModelTo(provider.id)}>Add Model</DropdownItem>
                        <DropdownItem
                          icon={<Trash2 className="h-4 w-4" />}
                          onClick={() => setConfirmDelete({ type: 'provider', id: provider.id, providerId: provider.id, name: provider.label })}
                          className="text-[var(--color-state-error)]"
                        >
                          Delete Provider
                        </DropdownItem>
                      </Dropdown>
                    </div>
                  </CardHeader>
                  {isExpanded && (
                    <CardContent className="pt-0">
                      <div className="border-t border-[var(--color-border-default)] pt-4">
                        {provider.models.length === 0 ? (
                          <div className="text-center py-8">
                            <Cpu className="h-8 w-8 text-[var(--color-content-tertiary)] mx-auto mb-2" />
                            <p className="text-sm text-[var(--color-content-tertiary)]">No models added yet</p>
                            <Button variant="ghost" size="sm" className="mt-2" onClick={() => setAddingModelTo(provider.id)}>
                              <Plus className="h-3 w-3 mr-1" /> Add Model
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {provider.models.map(model => (
                              <div key={model.id} className="flex items-center justify-between p-3 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-50)] dark:bg-[var(--color-surface-800)]/50 hover:border-[var(--color-brand-300)] dark:hover:border-brand-700 transition-colors">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <div className="h-8 w-8 rounded-lg bg-[var(--color-surface-200)] dark:bg-[var(--color-surface-700)] flex items-center justify-center flex-shrink-0">
                                    <Cpu className="h-4 w-4 text-[var(--color-content-tertiary)]" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                      <p className="text-sm font-medium text-[var(--color-content-primary)] truncate">{model.customName}</p>
                                      <Badge variant={model.enabled ? 'success' : 'neutral'} size="xs">
                                        {model.enabled ? 'Enabled' : 'Disabled'}
                                      </Badge>
                                    </div>
                                    {model.capabilities.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-1.5">
                                        {model.capabilities.map(cap => (
                                          <Badge key={cap} variant="neutral" size="xs">
                                            {CAPABILITY_REGISTRY[cap as keyof typeof CAPABILITY_REGISTRY]?.label || cap.replace(/_/g, ' ')}
                                          </Badge>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <Dropdown
                                  trigger={<Button variant="ghost" size="icon" aria-label="Model actions"><svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor"><circle cx="8" cy="3" r="1.5" /><circle cx="8" cy="8" r="1.5" /><circle cx="8" cy="13" r="1.5" /></svg></Button>}
                                  align="right"
                                >
                                  <DropdownItem icon={<Edit className="h-4 w-4" />} onClick={() => setEditingModel(model)}>Edit</DropdownItem>
                                  <DropdownItem
                                    icon={<Trash2 className="h-4 w-4" />}
                                    onClick={() => setConfirmDelete({ type: 'model', id: model.id, providerId: provider.id, name: model.customName })}
                                    className="text-[var(--color-state-error)]"
                                  >
                                    Remove
                                  </DropdownItem>
                                </Dropdown>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {isModalOpen && (
        <ModalOverlay onClose={closeModal} />
      )}

      {(isCreatingProvider || editingProvider) && (
        <ModalContainer className="max-w-lg">
          <ProviderFormModal
            provider={editingProvider}
            onClose={closeModal}
            onSubmit={data => editingProvider?.id ? updateMutation.mutate({ id: editingProvider.id, data }) : createMutation.mutate(data)}
            isLoading={createMutation.isPending || updateMutation.isPending}
          />
        </ModalContainer>
      )}

      {addingModelTo && (
        <ModalContainer className="max-w-2xl">
          <ModelFormModal
            providerId={addingModelTo}
            model={null}
            onClose={closeModal}
            onSubmit={data => addModelMutation.mutate({ providerId: addingModelTo, data })}
            isLoading={addModelMutation.isPending}
          />
        </ModalContainer>
      )}

      {editingModel && (
        <ModalContainer className="max-w-2xl">
          <ModelFormModal
            model={editingModel}
            providerId={editingModel.providerId}
            onClose={closeModal}
            onSubmit={data => updateModelMutation.mutate({ providerId: editingModel.providerId, modelId: editingModel.id, data })}
            isLoading={updateModelMutation.isPending}
          />
        </ModalContainer>
      )}

      <ConfirmModal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (!confirmDelete) return;
          if (confirmDelete.type === 'provider') {
            deleteMutation.mutate(confirmDelete.id);
          } else {
            deleteModelMutation.mutate({ providerId: confirmDelete.providerId, modelId: confirmDelete.id });
          }
        }}
        title={confirmDelete?.type === 'provider' ? 'Delete Provider' : 'Remove Model'}
        description={
          confirmDelete?.type === 'provider'
            ? `Are you sure you want to delete "${confirmDelete?.name}"? This will also remove all associated models. This action cannot be undone.`
            : `Are you sure you want to remove "${confirmDelete?.name}"? This action cannot be undone.`
        }
        confirmLabel={confirmDelete?.type === 'provider' ? 'Delete Provider' : 'Remove Model'}
        isLoading={deleteMutation.isPending || deleteModelMutation.isPending}
      />
    </ModalProvider>
  );
}

function ProviderFormModal({ provider, onClose, onSubmit, isLoading }: { provider: Provider | null; onClose: () => void; onSubmit: (data: ProviderFormData) => void; isLoading: boolean }) {
  const { register, handleSubmit, formState: { errors } } = useForm<ProviderFormData>({
    resolver: zodResolver(providerSchema),
    defaultValues: provider ? { label: provider.label, apiKeyEnv: provider.apiKeyEnv, status: provider.status } : { label: '', apiKeyEnv: '', status: 'inactive' },
  });

  return (
    <>
      <ModalHeader
        title={provider ? 'Edit Provider' : 'Add Provider'}
        description={provider ? `Update ${provider.label}` : 'Configure a new AI provider'}
      />
      <ModalBody>
        <form id="provider-form" onSubmit={handleSubmit(data => onSubmit(data))} className="space-y-4" noValidate>
          <Input label="Provider Label" placeholder="e.g., OpenAI, Anthropic, Google" error={errors.label?.message} {...register('label')} />
          <div>
            <Input
              label="API Key Environment Variable"
              placeholder="e.g., OPENAI_API_KEY"
              error={errors.apiKeyEnv?.message}
              {...register('apiKeyEnv')}
            />
            <p className="text-xs text-[var(--color-content-tertiary)] mt-1.5">
              The environment variable name that holds the API key. The actual secret value is never displayed.
            </p>
          </div>
          <div className="space-y-1.5">
            <label className="label">Status</label>
            <div className="flex gap-3">
              {(['active', 'inactive'] as const).map(status => (
                <label key={status} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value={status}
                    {...register('status')}
                    className="h-4 w-4 border-[var(--color-border-default)] text-[var(--color-brand-500)] focus:ring-[var(--color-brand-500)]"
                  />
                  <span className="text-sm text-[var(--color-content-secondary)] capitalize">{status}</span>
                </label>
              ))}
            </div>
            {errors.status && <p className="text-sm text-[var(--color-state-error)]">{errors.status.message}</p>}
          </div>
        </form>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button type="submit" form="provider-form" loading={isLoading}>{provider ? 'Save Changes' : 'Create Provider'}</Button>
      </ModalFooter>
    </>
  );
}

function ModelFormModal({ model, onClose, onSubmit, isLoading }: { providerId: string; model: RawModel | null; onClose: () => void; onSubmit: (data: ModelFormData) => void; isLoading: boolean }) {
  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<ModelFormData>({
    resolver: zodResolver(modelSchema) as any,
    defaultValues: model
      ? {
          customName: model.customName,
          capabilities: model.capabilities,
          enabled: model.enabled,
          rules: {
            maxTokens: (model.rules as Record<string, unknown>)?.maxTokens as number | undefined,
            temperature: (model.rules as Record<string, unknown>)?.temperature as number | undefined,
            topP: (model.rules as Record<string, unknown>)?.topP as number | undefined,
            frequencyPenalty: (model.rules as Record<string, unknown>)?.frequencyPenalty as number | undefined,
            presencePenalty: (model.rules as Record<string, unknown>)?.presencePenalty as number | undefined,
            stopSequences: (model.rules as Record<string, unknown>)?.stopSequences as string[] | undefined,
            systemPrompt: (model.rules as Record<string, unknown>)?.systemPrompt as string | undefined,
          },
        }
      : { customName: '', capabilities: [], enabled: true, rules: {} },
  });

  const selectedCapabilities = watch('capabilities');

  return (
    <>
      <ModalHeader
        title={model ? 'Edit Model' : 'Add Raw Model'}
        description={model ? `Update ${model.customName}` : 'Add a new raw model to this provider'}
      />
      <ModalBody>
        <form id="model-form" onSubmit={handleSubmit(data => onSubmit(data))} className="space-y-4" noValidate>
          <Input label="Model Display Name" placeholder="e.g., GPT-4o, Claude 3.5 Sonnet" error={errors.customName?.message} {...register('customName')} />

          <div>
            <label className="label">Capabilities</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto p-3 border border-[var(--color-border-default)] rounded-lg bg-[var(--color-surface-50)] dark:bg-[var(--color-surface-800)]/50">
              {CAPABILITY_OPTIONS.map(opt => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-[var(--color-surface-100)] dark:hover:bg-[var(--color-surface-700)] transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedCapabilities.includes(opt.value)}
                    onChange={e => setValue('capabilities', e.target.checked ? [...selectedCapabilities, opt.value] : selectedCapabilities.filter(c => c !== opt.value), { shouldValidate: true })}
                    className="h-4 w-4 rounded border-[var(--color-border-default)] text-[var(--color-brand-500)] focus:ring-[var(--color-brand-500)]"
                  />
                  <span className="text-sm text-[var(--color-content-secondary)]">{opt.label}</span>
                </label>
              ))}
            </div>
            {errors.capabilities && <p className="text-sm text-[var(--color-state-error)] mt-1">{errors.capabilities.message}</p>}
          </div>

          <label className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-surface-50)] dark:bg-[var(--color-surface-800)]/50 cursor-pointer">
            <input
              type="checkbox"
              checked={watch('enabled')}
              onChange={e => setValue('enabled', e.target.checked)}
              className="h-4 w-4 rounded border-[var(--color-border-default)] text-[var(--color-brand-500)] focus:ring-[var(--color-brand-500)]"
            />
            <span className="text-sm font-medium text-[var(--color-content-secondary)]">Enabled</span>
          </label>

          <details className="border border-[var(--color-border-default)] rounded-lg">
            <summary className="text-sm font-medium text-[var(--color-content-secondary)] cursor-pointer p-4 hover:bg-[var(--color-surface-50)] dark:hover:bg-[var(--color-surface-800)]/50 rounded-lg transition-colors">
              Advanced Rules
            </summary>
            <div className="px-4 pb-4 space-y-3">
              <Input label="Max Tokens" type="number" placeholder="2048" {...register('rules.maxTokens', { valueAsNumber: true })} />
              <Input label="Temperature" type="number" step="0.1" min="0" max="2" placeholder="0.7" {...register('rules.temperature', { valueAsNumber: true })} />
              <Input label="Top P" type="number" step="0.1" min="0" max="1" placeholder="0.9" {...register('rules.topP', { valueAsNumber: true })} />
              <Input label="Frequency Penalty" type="number" step="0.1" min="-2" max="2" placeholder="0" {...register('rules.frequencyPenalty', { valueAsNumber: true })} />
              <Input label="Presence Penalty" type="number" step="0.1" min="-2" max="2" placeholder="0" {...register('rules.presencePenalty', { valueAsNumber: true })} />
              <div>
                <label className="block text-sm font-medium text-[var(--color-content-primary)] mb-1.5">Stop Sequences</label>
                <textarea
                  rows={3}
                  placeholder="Enter one stop sequence per line"
                  className="w-full rounded-lg border bg-white text-[var(--color-content-primary)] placeholder:text-[var(--color-content-tertiary)] transition-all duration-fast hover:border-[var(--color-border-strong)] focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-500)]/10 focus:outline-none disabled:bg-[var(--color-surface-100)] disabled:text-[var(--color-content-disabled)] disabled:cursor-not-allowed dark:bg-[var(--color-surface-900)] dark:border-[var(--color-border-default)] dark:hover:border-[var(--color-border-strong)] dark:focus:border-[var(--color-brand-500)] dark:focus:ring-[var(--color-brand-500)]/15 px-4 py-2.5 text-sm"
                  value={((watch('rules.stopSequences') as string[] | undefined) || []).join('\n')}
                  onChange={(e) => {
                    const lines = e.target.value.split('\n').filter(l => l.trim());
                    setValue('rules.stopSequences', lines.length > 0 ? lines : undefined, { shouldValidate: true });
                  }}
                />
                <p className="mt-1.5 text-sm text-[var(--color-content-tertiary)]">Separate multiple stop sequences with newlines</p>
              </div>
              <Input label="System Prompt" placeholder="Optional system prompt" {...register('rules.systemPrompt')} />
            </div>
          </details>
        </form>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button type="submit" form="model-form" loading={isLoading}>{model ? 'Save Changes' : 'Add Model'}</Button>
      </ModalFooter>
    </>
  );
}
