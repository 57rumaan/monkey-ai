import React, { useState } from 'react';
import { ChevronDown, Check, Brain, Code, Image, Volume2, Sparkles } from 'lucide-react';
import { useApp } from './AppContext';

interface ModelSelectorProps {
  selectedModelId: string;
  selectedFeatureId: string;
  onSelectModel: (modelId: string) => void;
  onSelectFeature: (featureId: string) => void;
}

export function ModelSelector({ selectedModelId, selectedFeatureId, onSelectModel, onSelectFeature }: ModelSelectorProps) {
  const { state } = useApp();
  const [isOpen, setIsOpen] = useState(false);

  const enabledGroups = state.modelGroups.filter(g => g.enabled);
  const enabledModels = state.models.filter(m => m.enabled);
  const enabledFeatures = state.features.filter(f => f.enabled);
  const selectedModel = enabledModels.find(m => m.id === selectedModelId);
  const selectedFeature = enabledFeatures.find(f => f.id === selectedFeatureId);

  const getGroupIcon = (icon?: string) => {
    switch (icon) {
      case 'Brain': return <Brain size={16} />;
      case 'Code': return <Code size={16} />;
      case 'Image': return <Image size={16} />;
      case 'Volume2': return <Volume2 size={16} />;
      default: return <Sparkles size={16} />;
    }
  };

  const hasConfiguredModels = state.providers.length > 0 && enabledModels.length > 0;

  return (
    <div className="relative">
      <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm">
        <div className="flex items-center gap-2">
          {selectedFeature && <span className="text-monkey-500">{selectedFeature.icon === 'MessageSquare' ? '💬' : selectedFeature.icon === 'Code' ? '🖥️' : selectedFeature.icon === 'Image' ? '🎨' : selectedFeature.icon === 'Volume2' ? '🔊' : '✨'}</span>}
          <span className="text-gray-700 dark:text-gray-300 font-medium">{selectedModel?.displayName || 'Select Model'}</span>
        </div>
        <ChevronDown size={14} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-1 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 animate-fade-in max-h-[70vh] overflow-y-auto">
            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Feature</p>
              <div className="grid grid-cols-2 gap-1">
                {enabledFeatures.map(feature => (
                  <button key={feature.id} onClick={() => onSelectFeature(feature.id)} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${selectedFeatureId === feature.id ? 'bg-monkey-500/10 text-monkey-700 dark:text-monkey-300 border border-monkey-300 dark:border-monkey-700' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>
                    <span>{feature.icon === 'MessageSquare' ? '💬' : feature.icon === 'Code' ? '🖥️' : feature.icon === 'Image' ? '🎨' : feature.icon === 'Volume2' ? '🔊' : feature.icon === 'Edit3' ? '✏️' : '✨'}</span>
                    {feature.displayName}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-3">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Model</p>
              {!hasConfiguredModels ? (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">No models configured</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Ask admin to add providers & models</p>
                </div>
              ) : (
                enabledGroups.map(group => {
                  const groupModels = enabledModels.filter(m => group.modelIds.includes(m.id));
                  if (groupModels.length === 0) return null;
                  return (
                    <div key={group.id} className="mb-3">
                      <div className="flex items-center gap-2 px-2 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400">{getGroupIcon(group.icon)}{group.displayName}</div>
                      {groupModels.map(model => {
                        const supportsFeature = model.capabilities.includes(selectedFeatureId as any) || selectedFeatureId === 'text_to_text';
                        return (
                          <button key={model.id} onClick={() => { if (supportsFeature) { onSelectModel(model.id); setIsOpen(false); } }} disabled={!supportsFeature} className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${selectedModelId === model.id ? 'bg-monkey-500/10 text-monkey-700 dark:text-monkey-300' : supportsFeature ? 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300' : 'opacity-40 cursor-not-allowed text-gray-400'}`}>
                            <span>{model.displayName}</span>
                            {selectedModelId === model.id && <Check size={14} className="text-monkey-500" />}
                          </button>
                        );
                      })}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
