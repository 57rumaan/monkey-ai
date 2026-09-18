import React from 'react';
import { useApp } from './AppContext';
import { Card, Badge, Toggle } from './ui';
import { Feature } from './types';

export function AdminFeatures() {
  const { state, dispatch, addToast } = useApp();

  const handleToggle = (feature: Feature) => {
    dispatch({ type: 'UPDATE_FEATURE', payload: { ...feature, enabled: !feature.enabled } });
    addToast('success', `${feature.displayName} ${!feature.enabled ? 'enabled' : 'disabled'}`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div><h3 className="text-lg font-semibold text-gray-900 dark:text-white">Features</h3><p className="text-sm text-gray-500">Manage available AI features for users</p></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {state.features.map(feature => (
          <Card key={feature.id}>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-monkey-500/10 flex items-center justify-center text-xl">{feature.icon === 'MessageSquare' ? '💬' : feature.icon === 'Code' ? '🖥️' : feature.icon === 'Image' ? '🎨' : feature.icon === 'Volume2' ? '🔊' : feature.icon === 'Edit3' ? '✏️' : '✨'}</div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{feature.displayName}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{feature.description}</p>
                  <div className="flex flex-wrap gap-1 mt-2">{feature.requiredCapabilities.map(cap => <Badge key={cap} variant="info">{cap}</Badge>)}</div>
                </div>
              </div>
              <Toggle enabled={feature.enabled} onChange={() => handleToggle(feature)} />
            </div>
          </Card>
        ))}
      </div>
      <Card>
        <h4 className="font-medium text-gray-900 dark:text-white mb-2">Feature Configuration Notes</h4>
        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <li>• Features require models with matching capabilities to function</li>
          <li>• Disabling a feature hides it from users immediately</li>
          <li>• If no compatible model exists, the feature shows as unavailable</li>
          <li>• New feature types require backend implementation before they can be enabled</li>
        </ul>
      </Card>
    </div>
  );
}
