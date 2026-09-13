import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Edit3, Trash2, GripVertical } from 'lucide-react';
import { useApp } from './AppContext';
import { Button, Input, Modal, Badge, Card, Toggle } from './ui';
import { ModelGroup } from './types';

export function AdminModelGroups() {
  const { state, dispatch, addToast } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ModelGroup | null>(null);
  const [name, setName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);

  const resetForm = () => { setName(''); setDisplayName(''); setDescription(''); setEnabled(true); setSelectedModels([]); setEditing(null); };

  const handleSave = () => {
    if (!name.trim() || !displayName.trim()) { addToast('error', 'Name required'); return; }
    if (editing) {
      dispatch({ type: 'UPDATE_MODEL_GROUP', payload: { ...editing, name, displayName, description, enabled, modelIds: selectedModels } });
      addToast('success', 'Group updated');
    } else {
      const group: ModelGroup = { id: uuidv4(), name, displayName, description, enabled, modelIds: selectedModels, order: state.modelGroups.length };
      dispatch({ type: 'ADD_MODEL_GROUP', payload: group });
      addToast('success', 'Group added');
    }
    setShowModal(false);
    resetForm();
  };

  const handleEdit = (g: ModelGroup) => {
    setEditing(g); setName(g.name); setDisplayName(g.displayName); setDescription(g.description); setEnabled(g.enabled); setSelectedModels(g.modelIds);
    setShowModal(true);
  };

  const toggleModelInGroup = (modelId: string) => {
    setSelectedModels(prev => prev.includes(modelId) ? prev.filter(id => id !== modelId) : [...prev, modelId]);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div><h3 className="text-lg font-semibold text-gray-900 dark:text-white">Model Groups</h3><p className="text-sm text-gray-500">Organize models into groups for the user selector</p></div>
        <Button onClick={() => { resetForm(); setShowModal(true); }} icon={<Plus size={16} />}>Add Group</Button>
      </div>
      <div className="space-y-3">
        {state.modelGroups.sort((a, b) => a.order - b.order).map(group => (
          <Card key={group.id}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3"><GripVertical size={16} className="text-gray-400 cursor-grab" /><div><p className="font-medium text-gray-900 dark:text-white">{group.displayName}</p><p className="text-xs text-gray-500">{group.description} • {group.modelIds.length} models</p></div></div>
              <div className="flex items-center gap-2">
                <Badge variant={group.enabled ? 'success' : 'danger'}>{group.enabled ? 'Active' : 'Disabled'}</Badge>
                <button onClick={() => handleEdit(group)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><Edit3 size={14} className="text-gray-500" /></button>
                <button onClick={() => { dispatch({ type: 'DELETE_MODEL_GROUP', payload: group.id }); addToast('success', 'Group deleted'); }} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 size={14} className="text-red-500" /></button>
              </div>
            </div>
          </Card>
        ))}
      </div>
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Group' : 'Add Group'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4"><Input label="Internal Name" value={name} onChange={e => setName(e.target.value)} placeholder="general" /><Input label="Display Name" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="General AI" /></div>
          <Input label="Description" value={description} onChange={e => setDescription(e.target.value)} placeholder="General purpose models" />
          <Toggle enabled={enabled} onChange={setEnabled} label="Enabled" />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Models in Group</label>
            {state.models.length === 0 ? <p className="text-sm text-gray-400">No models available. Add models first.</p> : (
              <div className="space-y-1 max-h-40 overflow-y-auto border rounded-lg p-2">
                {state.models.map(model => (
                  <label key={model.id} className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                    <input type="checkbox" checked={selectedModels.includes(model.id)} onChange={() => toggleModelInGroup(model.id)} className="rounded border-gray-300 text-monkey-500 focus:ring-monkey-500" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{model.displayName}</span>
                    <Badge variant="info" className="ml-auto">{model.capabilities.length} caps</Badge>
                  </label>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2"><Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button><Button onClick={handleSave}>{editing ? 'Update' : 'Add'} Group</Button></div>
        </div>
      </Modal>
    </div>
  );
}
