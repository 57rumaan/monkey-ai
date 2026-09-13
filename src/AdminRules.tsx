import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Edit3, Trash2 } from 'lucide-react';
import { useApp } from './AppContext';
import { Button, Input, Textarea, Modal, Badge, Card, Toggle, Select } from './ui';
import { Rule } from './types';

export function AdminRules() {
  const { state, dispatch, addToast } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Rule | null>(null);
  const [name, setName] = useState('');
  const [scope, setScope] = useState<'global' | 'feature' | 'model'>('global');
  const [content, setContent] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [priority, setPriority] = useState(0);

  const resetForm = () => { setName(''); setScope('global'); setContent(''); setEnabled(true); setPriority(0); setEditing(null); };

  const handleSave = () => {
    if (!name.trim() || !content.trim()) { addToast('error', 'Name and content required'); return; }
    if (editing) {
      dispatch({ type: 'UPDATE_RULE', payload: { ...editing, name, scope, content, enabled, priority, updatedAt: new Date().toISOString() } });
      addToast('success', 'Rule updated');
    } else {
      const rule: Rule = { id: uuidv4(), name, scope, content, enabled, priority, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      dispatch({ type: 'ADD_RULE', payload: rule });
      addToast('success', 'Rule added');
    }
    setShowModal(false);
    resetForm();
  };

  const handleEdit = (r: Rule) => {
    setEditing(r); setName(r.name); setScope(r.scope); setContent(r.content); setEnabled(r.enabled); setPriority(r.priority);
    setShowModal(true);
  };

  const sortedRules = [...state.rules].sort((a, b) => b.priority - a.priority);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div><h3 className="text-lg font-semibold text-gray-900 dark:text-white">AI Rules</h3><p className="text-sm text-gray-500">Configure system rules for AI behavior</p></div>
        <Button onClick={() => { resetForm(); setShowModal(true); }} icon={<Plus size={16} />}>Add Rule</Button>
      </div>
      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <p className="text-sm text-blue-800 dark:text-blue-300"><strong>Rule Priority:</strong> Global Rules → Feature Rules → Model Rules → User Request. Higher priority rules take precedence.</p>
      </Card>
      {sortedRules.length === 0 ? (
        <Card className="text-center py-8"><p className="text-gray-500 dark:text-gray-400">No rules configured yet.</p><p className="text-sm text-gray-400 mt-1">Add rules to control AI behavior across the platform.</p></Card>
      ) : (
        <div className="space-y-3">
          {sortedRules.map(rule => (
            <Card key={rule.id}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-gray-900 dark:text-white">{rule.name}</p>
                    <Badge variant={rule.scope === 'global' ? 'info' : rule.scope === 'feature' ? 'warning' : 'default'}>{rule.scope}</Badge>
                    <Badge variant={rule.enabled ? 'success' : 'danger'}>P:{rule.priority}</Badge>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{rule.content}</p>
                </div>
                <div className="flex items-center gap-1 ml-4">
                  <button onClick={() => handleEdit(rule)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><Edit3 size={14} className="text-gray-500" /></button>
                  <button onClick={() => { dispatch({ type: 'DELETE_RULE', payload: rule.id }); addToast('success', 'Rule deleted'); }} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 size={14} className="text-red-500" /></button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Rule' : 'Add Rule'} size="lg">
        <div className="space-y-4">
          <Input label="Rule Name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., No harmful content" />
          <Select label="Scope" value={scope} onChange={e => setScope(e.target.value as any)} options={[{ value: 'global', label: 'Global - Applies to all requests' }, { value: 'feature', label: 'Feature - Applies to specific feature' }, { value: 'model', label: 'Model - Applies to specific model' }]} />
          <Textarea label="Rule Content" value={content} onChange={e => setContent(e.target.value)} placeholder="Describe the rule..." rows={4} />
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority (higher = more important)</label><input type="number" value={priority} onChange={e => setPriority(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg border bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-monkey-500" /></div>
            <div className="flex items-end"><Toggle enabled={enabled} onChange={setEnabled} label="Enabled" /></div>
          </div>
          <div className="flex justify-end gap-2 pt-2"><Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button><Button onClick={handleSave}>{editing ? 'Update' : 'Add'} Rule</Button></div>
        </div>
      </Modal>
    </div>
  );
}
