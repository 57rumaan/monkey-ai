import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Edit3, Trash2 } from 'lucide-react';
import { useApp } from './AppContext';
import { Button, Input, Modal, Badge, Card, Toggle, Select } from './ui';
import { Provider, ProviderType, Model, CapabilityId, CAPABILITIES } from './types';

export function AdminProviders() {
  const { state, dispatch, addToast } = useApp();
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [showModelModal, setShowModelModal] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const [activeProviderTab, setActiveProviderTab] = useState<string | null>(null);
  const [pName, setPName] = useState('');
  const [pDisplayName, setPDisplayName] = useState('');
  const [pType, setPType] = useState<ProviderType>('openai');
  const [pBaseUrl, setPBaseUrl] = useState('');
  const [pApiKey, setPApiKey] = useState('');
  const [pEnabled, setPEnabled] = useState(true);
  const [mProviderId, setMProviderId] = useState('');
  const [mProviderModelId, setMProviderModelId] = useState('');
  const [mDisplayName, setMDisplayName] = useState('');
  const [mDescription, setMDescription] = useState('');
  const [mCapabilities, setMCapabilities] = useState<CapabilityId[]>(['text_to_text']);
  const [mEnabled, setMEnabled] = useState(true);

  const resetProviderForm = () => { setPName(''); setPDisplayName(''); setPType('openai'); setPBaseUrl(''); setPApiKey(''); setPEnabled(true); setEditingProvider(null); };
  const resetModelForm = () => { setMProviderId(''); setMProviderModelId(''); setMDisplayName(''); setMDescription(''); setMCapabilities(['text_to_text']); setMEnabled(true); setEditingModel(null); };

  const handleSaveProvider = () => {
    if (!pName.trim() || !pDisplayName.trim()) { addToast('error', 'Name and display name required'); return; }
    if (editingProvider) {
      dispatch({ type: 'UPDATE_PROVIDER', payload: { ...editingProvider, name: pName, displayName: pDisplayName, type: pType, baseUrl: pBaseUrl, apiKey: pApiKey, enabled: pEnabled, updatedAt: new Date().toISOString() } });
      addToast('success', 'Provider updated');
    } else {
      const provider: Provider = { id: uuidv4(), name: pName, displayName: pDisplayName, type: pType, baseUrl: pBaseUrl, apiKey: pApiKey, enabled: pEnabled, config: {}, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      dispatch({ type: 'ADD_PROVIDER', payload: provider });
      addToast('success', 'Provider added');
    }
    setShowProviderModal(false);
    resetProviderForm();
  };

  const handleEditProvider = (p: Provider) => {
    setEditingProvider(p); setPName(p.name); setPDisplayName(p.displayName); setPType(p.type); setPBaseUrl(p.baseUrl); setPApiKey(p.apiKey); setPEnabled(p.enabled);
    setShowProviderModal(true);
  };

  const handleSaveModel = () => {
    if (!mProviderModelId.trim() || !mDisplayName.trim() || !mProviderId) { addToast('error', 'Provider, model ID, and display name required'); return; }
    if (editingModel) {
      dispatch({ type: 'UPDATE_MODEL', payload: { ...editingModel, providerId: mProviderId, providerModelId: mProviderModelId, displayName: mDisplayName, description: mDescription, capabilities: mCapabilities, enabled: mEnabled } });
      addToast('success', 'Model updated');
    } else {
      const model: Model = { id: uuidv4(), providerId: mProviderId, providerModelId: mProviderModelId, displayName: mDisplayName, description: mDescription, enabled: mEnabled, capabilities: mCapabilities, priority: 0 };
      dispatch({ type: 'ADD_MODEL', payload: model });
      addToast('success', 'Model added');
    }
    setShowModelModal(false);
    resetModelForm();
  };

  const handleEditModel = (m: Model) => {
    setEditingModel(m); setMProviderId(m.providerId); setMProviderModelId(m.providerModelId); setMDisplayName(m.displayName); setMDescription(m.description); setMCapabilities(m.capabilities); setMEnabled(m.enabled);
    setShowModelModal(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Providers</h3>
        <Button onClick={() => { resetProviderForm(); setShowProviderModal(true); }} icon={<Plus size={16} />}>Add Provider</Button>
      </div>
      {state.providers.length === 0 ? (
        <Card className="text-center py-8"><p className="text-gray-500 dark:text-gray-400">No providers configured yet.</p><p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Add an AI provider to get started.</p></Card>
      ) : (
        <div className="space-y-3">
          {state.providers.map(provider => (
            <Card key={provider.id} hover onClick={() => setActiveProviderTab(activeProviderTab === provider.id ? null : provider.id)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-monkey-500/10 flex items-center justify-center"><span className="text-lg">{provider.type === 'openai' ? '🤖' : provider.type === 'anthropic' ? '🧠' : provider.type === 'google' ? '🔮' : '⚡'}</span></div>
                  <div><p className="font-medium text-gray-900 dark:text-white">{provider.displayName}</p><p className="text-xs text-gray-500">{provider.type} • {provider.baseUrl || 'No URL'}</p></div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={provider.enabled ? 'success' : 'danger'}>{provider.enabled ? 'Active' : 'Disabled'}</Badge>
                  <button onClick={e => { e.stopPropagation(); handleEditProvider(provider); }} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><Edit3 size={14} className="text-gray-500" /></button>
                  <button onClick={e => { e.stopPropagation(); dispatch({ type: 'DELETE_PROVIDER', payload: provider.id }); addToast('success', 'Provider deleted'); }} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 size={14} className="text-red-500" /></button>
                </div>
              </div>
              {activeProviderTab === provider.id && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 mb-2">Models in this provider:</p>
                  {state.models.filter(m => m.providerId === provider.id).length === 0 ? (
                    <p className="text-sm text-gray-400">No models added yet</p>
                  ) : (
                    <div className="space-y-2">
                      {state.models.filter(m => m.providerId === provider.id).map(model => (
                        <div key={model.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                          <div><p className="text-sm font-medium text-gray-900 dark:text-white">{model.displayName}</p><p className="text-xs text-gray-500">{model.providerModelId} • {model.capabilities.join(', ')}</p></div>
                          <div className="flex items-center gap-2">
                            <Badge variant={model.enabled ? 'success' : 'danger'}>{model.enabled ? 'On' : 'Off'}</Badge>
                            <button onClick={() => handleEditModel(model)} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"><Edit3 size={12} className="text-gray-500" /></button>
                            <button onClick={() => { dispatch({ type: 'DELETE_MODEL', payload: model.id }); addToast('success', 'Model deleted'); }} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 size={12} className="text-red-500" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <Button size="sm" variant="outline" className="mt-3" onClick={() => { resetModelForm(); setMProviderId(provider.id); setShowModelModal(true); }} icon={<Plus size={14} />}>Add Model</Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between mt-8">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">All Models</h3>
        <Button onClick={() => { resetModelForm(); setShowModelModal(true); }} icon={<Plus size={16} />} variant="outline">Add Model</Button>
      </div>
      <Modal isOpen={showProviderModal} onClose={() => setShowProviderModal(false)} title={editingProvider ? 'Edit Provider' : 'Add Provider'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Internal Name" value={pName} onChange={e => setPName(e.target.value)} placeholder="my-openai" />
            <Input label="Display Name" value={pDisplayName} onChange={e => setPDisplayName(e.target.value)} placeholder="OpenAI" />
          </div>
          <Select label="Provider Type" value={pType} onChange={e => setPType(e.target.value as ProviderType)} options={[{ value: 'openai', label: 'OpenAI Compatible' }, { value: 'anthropic', label: 'Anthropic Compatible' }, { value: 'google', label: 'Google Compatible' }, { value: 'stability', label: 'Stability AI' }, { value: 'elevenlabs', label: 'ElevenLabs (TTS)' }, { value: 'custom', label: 'Custom' }]} />
          <Input label="Base URL" value={pBaseUrl} onChange={e => setPBaseUrl(e.target.value)} placeholder="https://api.openai.com/v1" />
          <Input label="API Key" type="password" value={pApiKey} onChange={e => setPApiKey(e.target.value)} placeholder="sk-..." />
          <Toggle enabled={pEnabled} onChange={setPEnabled} label="Enabled" />
          <div className="flex justify-end gap-2 pt-2"><Button variant="ghost" onClick={() => setShowProviderModal(false)}>Cancel</Button><Button onClick={handleSaveProvider}>{editingProvider ? 'Update' : 'Add'} Provider</Button></div>
        </div>
      </Modal>
      <Modal isOpen={showModelModal} onClose={() => setShowModelModal(false)} title={editingModel ? 'Edit Model' : 'Add Model'} size="lg">
        <div className="space-y-4">
          <Select label="Provider" value={mProviderId} onChange={e => setMProviderId(e.target.value)} options={[{ value: '', label: 'Select provider...' }, ...state.providers.map(p => ({ value: p.id, label: p.displayName }))]} />
          <Input label="Provider Model ID" value={mProviderModelId} onChange={e => setMProviderModelId(e.target.value)} placeholder="gpt-4o" />
          <Input label="Display Name" value={mDisplayName} onChange={e => setMDisplayName(e.target.value)} placeholder="Monkey Smart" />
          <Input label="Description" value={mDescription} onChange={e => setMDescription(e.target.value)} placeholder="General purpose AI model" />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Capabilities</label>
            <div className="flex flex-wrap gap-2">
              {CAPABILITIES.map(cap => (
                <button key={cap.id} onClick={() => setMCapabilities(prev => prev.includes(cap.id) ? prev.filter(c => c !== cap.id) : [...prev, cap.id])} className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors ${mCapabilities.includes(cap.id) ? 'bg-monkey-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>{cap.name}</button>
              ))}
            </div>
          </div>
          <Toggle enabled={mEnabled} onChange={setMEnabled} label="Enabled" />
          <div className="flex justify-end gap-2 pt-2"><Button variant="ghost" onClick={() => setShowModelModal(false)}>Cancel</Button><Button onClick={handleSaveModel}>{editingModel ? 'Update' : 'Add'} Model</Button></div>
        </div>
      </Modal>
    </div>
  );
}
