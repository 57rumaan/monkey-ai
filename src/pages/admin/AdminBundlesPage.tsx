import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Box, Tag, ToggleLeft, ToggleRight, ChevronRight, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { ModalProvider, ModalOverlay, ModalContainer, ModalHeader, ModalBody, ModalFooter, ConfirmModal } from '@/components/ui/Modal';
import { Dropdown, DropdownItem } from '@/components/ui/Dropdown';
import { useToast } from '@/components/ui/Toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import { CAPABILITY_REGISTRY } from '@/lib/capabilities/registry';
import type { CapabilityType } from '@/types';

const bundleSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  tier: z.enum(['free', 'pro', 'enterprise']),
  enabled: z.boolean().default(true),
});

type BundleFormData = z.infer<typeof bundleSchema>;

interface Bundle {
  id: string;
  name: string;
  description: string;
  tier: 'free' | 'pro' | 'enterprise';
  enabled: boolean;
  capabilities: BundleCapability[];
  features: BundleFeatures;
  createdAt: string;
  updatedAt: string;
}

interface BundleCapability {
  capabilityId: string;
  providerId: string;
  rawModelId: string;
  enabled: boolean;
  priority: number;
}

interface BundleFeatures {
  voiceReplies: boolean;
  composerAttachments: boolean;
  customActions: unknown[];
  tools: string[];
}

interface Provider {
  id: string;
  label: string;
  models: RawModel[];
}

interface RawModel {
  id: string;
  customName: string;
  capabilities: string[];
  enabled: boolean;
}

interface CapabilityItem {
  id: string;
  label: string;
}

async function fetchBundles() {
  const response = await fetch('/api/bundles', { credentials: 'include' });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch bundles');
  return data.data as Bundle[];
}

async function fetchProviders() {
  const response = await fetch('/api/providers', { credentials: 'include' });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch providers');
  return data.data as Provider[];
}

async function fetchCapabilities() {
  const response = await fetch('/api/bundles/capabilities', { credentials: 'include' });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch capabilities');
  return data.data as CapabilityItem[];
}

async function createBundle(data: BundleFormData) {
  const response = await fetch('/api/bundles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!result.success) throw new Error(result.error || 'Failed to create bundle');
  return result.data;
}

async function updateBundle(id: string, data: Partial<Bundle>) {
  const response = await fetch(`/api/bundles/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!result.success) throw new Error(result.error || 'Failed to update bundle');
  return result.data;
}

async function deleteBundle(id: string) {
  const response = await fetch(`/api/bundles/${id}`, { method: 'DELETE', credentials: 'include' });
  const result = await response.json();
  if (!result.success) throw new Error(result.error || 'Failed to delete bundle');
}

async function addBundleCapability(bundleId: string, data: { capabilityId: string; providerId: string; rawModelId: string; priority?: number }) {
  const response = await fetch(`/api/bundles/${bundleId}/capabilities`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!result.success) throw new Error(result.error || 'Failed to add capability');
  return result.data;
}

async function removeBundleCapability(bundleId: string, capabilityId: string) {
  const response = await fetch(`/api/bundles/${bundleId}/capabilities/${capabilityId}`, { method: 'DELETE', credentials: 'include' });
  const result = await response.json();
  if (!result.success) throw new Error(result.error || 'Failed to remove capability');
}

export function AdminBundlesPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [editingBundle, setEditingBundle] = useState<Bundle | null>(null);
  const [isCreatingBundle, setIsCreatingBundle] = useState(false);
  const [addingCapabilityTo, setAddingCapabilityTo] = useState<string | null>(null);
  const [expandedBundles, setExpandedBundles] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  const [confirmRemoveCap, setConfirmRemoveCap] = useState<{ bundleId: string; capabilityId: string; capLabel: string } | null>(null);

  const { data: bundles = [], isLoading: bundlesLoading, error: bundlesError } = useQuery({ queryKey: ['bundles'], queryFn: fetchBundles });
  const { data: providers = [] } = useQuery({ queryKey: ['providers'], queryFn: fetchProviders });
  const { data: capabilities = [] } = useQuery({ queryKey: ['capabilities'], queryFn: fetchCapabilities });

  const createMutation = useMutation({
    mutationFn: createBundle,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['bundles'] }); setIsCreatingBundle(false); showToast('Bundle created', { variant: 'success' }); },
    onError: (error) => showToast(error instanceof Error ? error.message : 'Failed to create bundle', { variant: 'error' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Bundle> }) => updateBundle(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['bundles'] }); setEditingBundle(null); showToast('Bundle updated', { variant: 'success' }); },
    onError: (error) => showToast(error instanceof Error ? error.message : 'Failed to update bundle', { variant: 'error' }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBundle,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['bundles'] }); setConfirmDelete(null); showToast('Bundle deleted', { variant: 'success' }); },
    onError: (error) => { showToast(error instanceof Error ? error.message : 'Failed to delete bundle', { variant: 'error' }); setConfirmDelete(null); },
  });

  const addCapabilityMutation = useMutation({
    mutationFn: ({ bundleId, data }: { bundleId: string; data: { capabilityId: string; providerId: string; rawModelId: string; priority?: number } }) => addBundleCapability(bundleId, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['bundles'] }); setAddingCapabilityTo(null); showToast('Capability added', { variant: 'success' }); },
    onError: (error) => showToast(error instanceof Error ? error.message : 'Failed to add capability', { variant: 'error' }),
  });

  const removeCapabilityMutation = useMutation({
    mutationFn: ({ bundleId, capabilityId }: { bundleId: string; capabilityId: string }) => removeBundleCapability(bundleId, capabilityId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['bundles'] }); setConfirmRemoveCap(null); showToast('Capability removed', { variant: 'success' }); },
    onError: (error) => { showToast(error instanceof Error ? error.message : 'Failed to remove capability', { variant: 'error' }); setConfirmRemoveCap(null); },
  });

  const toggleBundle = (id: string) => {
    setExpandedBundles(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isModalOpen = isCreatingBundle || !!editingBundle || !!addingCapabilityTo;
  const closeModal = () => { setIsCreatingBundle(false); setEditingBundle(null); setAddingCapabilityTo(null); };

  const getCapLabel = (capId: string) => {
    const reg = CAPABILITY_REGISTRY[capId as CapabilityType];
    return reg?.label || capId.replace(/_/g, ' ');
  };

  return (
    <ModalProvider isOpen={isModalOpen} onClose={closeModal}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-heading-xl font-bold text-content-primary">Model Bundles</h1>
            <p className="text-body text-content-tertiary mt-1">Create and manage user-facing AI product bundles</p>
          </div>
          <Button onClick={() => setIsCreatingBundle(true)}>
            <Plus className="h-4 w-4 mr-2" /> Create Bundle
          </Button>
        </div>

        {bundlesLoading ? (
          <Card>
            <CardContent className="h-64 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
            </CardContent>
          </Card>
        ) : bundlesError ? (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-10 w-10 text-state-error mx-auto mb-3" />
              <h3 className="text-heading-md font-medium text-content-primary mb-1">Failed to load bundles</h3>
              <p className="text-body-sm text-content-tertiary mb-4">{bundlesError instanceof Error ? bundlesError.message : 'An error occurred'}</p>
              <Button variant="secondary" onClick={() => queryClient.invalidateQueries({ queryKey: ['bundles'] })}>Retry</Button>
            </CardContent>
          </Card>
        ) : bundles.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <div className="h-16 w-16 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center mx-auto mb-4">
                <Box className="h-8 w-8 text-content-tertiary" />
              </div>
              <h3 className="text-heading-md font-medium text-content-primary mb-2">No bundles yet</h3>
              <p className="text-body text-content-tertiary mb-6 max-w-sm mx-auto">Create your first model bundle to organize AI capabilities for users</p>
              <Button onClick={() => setIsCreatingBundle(true)}>
                <Plus className="h-4 w-4 mr-2" /> Create Bundle
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {bundles.map(bundle => {
              const isExpanded = expandedBundles.has(bundle.id);
              return (
                <Card key={bundle.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1 min-w-0 cursor-pointer" onClick={() => toggleBundle(bundle.id)}>
                        <div className={cn(
                          'h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0',
                          bundle.tier === 'pro' && 'bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-300',
                          bundle.tier === 'enterprise' && 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
                          bundle.tier === 'free' && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
                        )}>
                          {bundle.tier === 'pro' && <Tag className="h-5 w-5" />}
                          {bundle.tier === 'enterprise' && <Box className="h-5 w-5" />}
                          {bundle.tier === 'free' && <Tag className="h-5 w-5" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-heading-md font-semibold text-content-primary">{bundle.name}</h3>
                            <Badge variant={bundle.tier === 'pro' ? 'primary' : bundle.tier === 'enterprise' ? 'warning' : 'success'}>
                              {bundle.tier}
                            </Badge>
                            <Badge variant={bundle.enabled ? 'success' : 'neutral'}>
                              {bundle.enabled ? 'Enabled' : 'Disabled'}
                            </Badge>
                            <Badge variant="neutral" size="xs">
                              {bundle.capabilities.length} capability{bundle.capabilities.length !== 1 ? 'ies' : 'y'}
                            </Badge>
                          </div>
                          {bundle.description && (
                            <p className="text-body-sm text-content-tertiary mt-1">{bundle.description}</p>
                          )}
                          {bundle.capabilities.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {bundle.capabilities.map(cap => (
                                <Badge key={cap.capabilityId} variant="neutral" size="xs">
                                  {getCapLabel(cap.capabilityId)}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <ChevronRight className={cn('h-5 w-5 text-content-tertiary transition-transform flex-shrink-0 mt-1', isExpanded && 'rotate-90')} />
                      </div>
                      <Dropdown
                        trigger={<Button variant="ghost" size="icon" aria-label="Bundle actions"><svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor"><circle cx="8" cy="3" r="1.5" /><circle cx="8" cy="8" r="1.5" /><circle cx="8" cy="13" r="1.5" /></svg></Button>}
                        align="right"
                      >
                        <DropdownItem icon={<Edit className="h-4 w-4" />} onClick={() => setEditingBundle(bundle)}>Edit Bundle</DropdownItem>
                        <DropdownItem icon={<Plus className="h-4 w-4" />} onClick={() => setAddingCapabilityTo(bundle.id)}>Add Capability</DropdownItem>
                        <DropdownItem
                          icon={bundle.enabled ? <ToggleLeft className="h-4 w-4" /> : <ToggleRight className="h-4 w-4" />}
                          onClick={() => updateMutation.mutate({ id: bundle.id, data: { enabled: !bundle.enabled } })}
                        >
                          {bundle.enabled ? 'Disable' : 'Enable'}
                        </DropdownItem>
                        <DropdownItem
                          icon={<Trash2 className="h-4 w-4" />}
                          onClick={() => setConfirmDelete({ id: bundle.id, name: bundle.name })}
                          className="text-state-error"
                        >
                          Delete Bundle
                        </DropdownItem>
                      </Dropdown>
                    </div>
                  </CardHeader>
                  {isExpanded && (
                    <CardContent className="pt-0">
                      <div className="border-t border-border-default pt-4">
                        {bundle.capabilities.length === 0 ? (
                          <div className="text-center py-8">
                            <Sparkles className="h-8 w-8 text-content-tertiary mx-auto mb-2" />
                            <p className="text-body text-content-tertiary">No capabilities configured</p>
                            <Button variant="ghost" size="sm" className="mt-2" onClick={() => setAddingCapabilityTo(bundle.id)}>
                              <Plus className="h-3 w-3 mr-1" /> Add Capability
                            </Button>
                          </div>
                        ) : (
                          <>
                            <h4 className="text-body-sm font-medium text-content-secondary mb-3">Capability Mapping</h4>
                            <div className="space-y-2">
                              {bundle.capabilities.map((cap) => {
                                const provider = providers.find(p => p.id === cap.providerId);
                                const rawModel = provider?.models.find(m => m.id === cap.rawModelId);
                                return (
                                  <div key={cap.capabilityId} className="flex items-center justify-between p-3 rounded-lg border border-border-default bg-surface-50 dark:bg-surface-800/50 hover:border-brand-300 dark:hover:border-brand-700 transition-colors">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                      <div className="h-9 w-9 rounded-lg bg-brand-100 dark:bg-brand-900 flex items-center justify-center flex-shrink-0">
                                        <span className="text-brand-600 dark:text-brand-400 text-sm font-semibold">
                                          {getCapLabel(cap.capabilityId).charAt(0)}
                                        </span>
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <p className="text-body font-medium text-content-primary">{getCapLabel(cap.capabilityId)}</p>
                                        <div className="flex items-center gap-1.5 mt-0.5 text-body-xs text-content-tertiary">
                                          <span className="font-medium">{provider?.label || 'Unknown provider'}</span>
                                          <span>→</span>
                                          <span>{rawModel?.customName || 'Unknown model'}</span>
                                        </div>
                                      </div>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="icon-sm"
                                      aria-label={`Remove ${getCapLabel(cap.capabilityId)}`}
                                      onClick={() => setConfirmRemoveCap({ bundleId: bundle.id, capabilityId: cap.capabilityId, capLabel: getCapLabel(cap.capabilityId) })}
                                    >
                                      <Trash2 className="h-4 w-4 text-state-error" />
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>
                          </>
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

      {(isCreatingBundle || editingBundle) && (
        <ModalContainer className="max-w-lg">
          <BundleFormModal
            bundle={editingBundle}
            onClose={closeModal}
            onSubmit={data => editingBundle?.id ? updateMutation.mutate({ id: editingBundle.id, data: data as Partial<Bundle> }) : createMutation.mutate(data)}
            isLoading={createMutation.isPending || updateMutation.isPending}
          />
        </ModalContainer>
      )}

      {addingCapabilityTo && (
        <ModalContainer className="max-w-lg">
          <AddCapabilityModal
            bundleId={addingCapabilityTo}
            providers={providers}
            capabilities={capabilities}
            onClose={closeModal}
            onSubmit={data => addCapabilityMutation.mutate({ bundleId: addingCapabilityTo, data })}
            isLoading={addCapabilityMutation.isPending}
          />
        </ModalContainer>
      )}

      <ConfirmModal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => { if (confirmDelete) deleteMutation.mutate(confirmDelete.id); }}
        title="Delete Bundle"
        description={`Are you sure you want to delete "${confirmDelete?.name}"? This will remove the bundle and its capability mappings, but will not affect providers or raw models. This action cannot be undone.`}
        confirmLabel="Delete Bundle"
        isLoading={deleteMutation.isPending}
      />

      <ConfirmModal
        isOpen={!!confirmRemoveCap}
        onClose={() => setConfirmRemoveCap(null)}
        onConfirm={() => { if (confirmRemoveCap) removeCapabilityMutation.mutate({ bundleId: confirmRemoveCap.bundleId, capabilityId: confirmRemoveCap.capabilityId }); }}
        title="Remove Capability"
        description={`Remove "${confirmRemoveCap?.capLabel}" from this bundle? The provider and raw model will not be affected.`}
        confirmLabel="Remove"
        isLoading={removeCapabilityMutation.isPending}
      />
    </ModalProvider>
  );
}

function BundleFormModal({ bundle, onClose, onSubmit, isLoading }: { bundle: Bundle | null; onClose: () => void; onSubmit: (data: BundleFormData) => void; isLoading: boolean }) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<BundleFormData>({
    resolver: zodResolver(bundleSchema) as any,
    defaultValues: bundle
      ? { name: bundle.name, description: bundle.description || '', tier: bundle.tier, enabled: bundle.enabled }
      : { name: '', description: '', tier: 'free', enabled: true },
  });

  return (
    <>
      <ModalHeader
        title={bundle ? 'Edit Bundle' : 'Create Bundle'}
        description={bundle ? `Update ${bundle.name}` : 'Create a new user-facing AI product bundle'}
      />
      <ModalBody>
        <form id="bundle-form" onSubmit={handleSubmit(data => onSubmit(data))} className="space-y-4" noValidate>
          <Input label="Bundle Name" placeholder="e.g., MONKEY AI PRO" error={errors.name?.message} {...register('name')} />
          <Textarea label="Description" placeholder="Describe what this bundle offers to users" rows={3} {...register('description')} />
          <div className="space-y-1.5">
            <label className="label">Tier</label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { value: 'free' as const, label: 'Free', color: 'border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' },
                { value: 'pro' as const, label: 'Pro', color: 'border-brand-300 bg-brand-50 dark:border-brand-700 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300' },
                { value: 'enterprise' as const, label: 'Enterprise', color: 'border-purple-300 bg-purple-50 dark:border-purple-700 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' },
              ]).map(tier => (
                <label key={tier.value} className={cn(
                  'flex items-center justify-center gap-2 cursor-pointer p-3 rounded-lg border-2 transition-all text-body-sm font-medium',
                  watch('tier') === tier.value ? tier.color : 'border-border-default hover:border-border-strong'
                )}>
                  <input type="radio" value={tier.value} {...register('tier')} className="sr-only" />
                  {tier.label}
                </label>
              ))}
            </div>
            {errors.tier && <p className="text-body-sm text-state-error">{errors.tier.message}</p>}
          </div>
          <label className="flex items-center gap-3 p-3 rounded-lg bg-surface-50 dark:bg-surface-800/50 cursor-pointer">
            <input
              type="checkbox"
              checked={watch('enabled')}
              onChange={e => register('enabled').onChange({ target: { checked: e.target.checked } })}
              className="h-4 w-4 rounded border-border-default text-brand-600 focus:ring-brand-500"
            />
            <span className="text-body font-medium text-content-secondary">Enabled</span>
          </label>
        </form>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button type="submit" form="bundle-form" loading={isLoading}>{bundle ? 'Save Changes' : 'Create Bundle'}</Button>
      </ModalFooter>
    </>
  );
}

function AddCapabilityModal({ bundleId: _bundleId, providers, capabilities, onClose, onSubmit, isLoading }: { bundleId: string; providers: Provider[]; capabilities: CapabilityItem[]; onClose: () => void; onSubmit: (data: { capabilityId: string; providerId: string; rawModelId: string }) => void; isLoading: boolean }) {
  const [selectedCapability, setSelectedCapability] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('');
  const [selectedModel, setSelectedModel] = useState('');

  const filteredProviders = providers.filter(p => p.models.some(m => m.enabled && (!selectedCapability || m.capabilities.includes(selectedCapability))));
  const filteredModels = selectedProvider
    ? providers.find(p => p.id === selectedProvider)?.models.filter(m => m.enabled && m.capabilities.includes(selectedCapability)) || []
    : [];

  const canSubmit = selectedCapability && selectedProvider && selectedModel;

  return (
    <>
      <ModalHeader title="Add Capability" description="Map a capability to a provider and raw model" />
      <ModalBody>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="label">Capability</label>
            <select
              value={selectedCapability}
              onChange={e => { setSelectedCapability(e.target.value); setSelectedProvider(''); setSelectedModel(''); }}
              className="input h-12"
            >
              <option value="">Select a capability</option>
              {capabilities.map(c => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="label">Provider</label>
            <select
              value={selectedProvider}
              onChange={e => { setSelectedProvider(e.target.value); setSelectedModel(''); }}
              disabled={!selectedCapability}
              className="input h-12 disabled:opacity-50"
            >
              <option value="">Select a provider</option>
              {filteredProviders.map(p => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
            {selectedCapability && filteredProviders.length === 0 && (
              <p className="text-caption text-state-error">No providers have models with this capability</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="label">Raw Model</label>
            <select
              value={selectedModel}
              onChange={e => setSelectedModel(e.target.value)}
              disabled={!selectedProvider}
              className="input h-12 disabled:opacity-50"
            >
              <option value="">Select a model</option>
              {filteredModels.map(m => (
                <option key={m.id} value={m.id}>{m.customName}</option>
              ))}
            </select>
            {selectedProvider && filteredModels.length === 0 && (
              <p className="text-caption text-state-error">No enabled models match this capability</p>
            )}
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button
          onClick={() => { if (canSubmit) onSubmit({ capabilityId: selectedCapability, providerId: selectedProvider, rawModelId: selectedModel }); }}
          loading={isLoading}
          disabled={!canSubmit || isLoading}
        >
          Add Capability
        </Button>
      </ModalFooter>
    </>
  );
}
