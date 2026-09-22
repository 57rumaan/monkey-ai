import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, Check, Sparkles, Code, Image, Video, Mic, FileText, Calculator, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { CAPABILITY_REGISTRY } from '@/lib/capabilities/registry';
import type { CapabilityType } from '@/types';
import type { Bundle } from '@/types';

interface ModelSelectorProps {
  bundles: Bundle[];
  selectedBundleId: string | null;
  onSelect: (bundleId: string) => void;
  className?: string;
}

const capabilityIcons: Record<string, React.ReactNode> = {
  text_to_text: <Sparkles className="h-3.5 w-3.5" />,
  coding: <Code className="h-3.5 w-3.5" />,
  text_to_image: <Image className="h-3.5 w-3.5" />,
  image_to_text: <Image className="h-3.5 w-3.5" />,
  image_editing: <Image className="h-3.5 w-3.5" />,
  image_analysis: <Image className="h-3.5 w-3.5" />,
  image_vision: <Image className="h-3.5 w-3.5" />,
  video_generation: <Video className="h-3.5 w-3.5" />,
  video_analysis: <Video className="h-3.5 w-3.5" />,
  video_vision: <Video className="h-3.5 w-3.5" />,
  text_to_voice: <Mic className="h-3.5 w-3.5" />,
  voice_to_text: <Mic className="h-3.5 w-3.5" />,
  document_analysis: <FileText className="h-3.5 w-3.5" />,
  file_analysis: <FileText className="h-3.5 w-3.5" />,
  calculator: <Calculator className="h-3.5 w-3.5" />,
  datetime: <Calendar className="h-3.5 w-3.5" />,
};

function getCapabilityLabel(capId: string): string {
  const reg = CAPABILITY_REGISTRY[capId as CapabilityType];
  return reg?.label || capId.replace(/_/g, ' ');
}

export function ModelSelector({ bundles, selectedBundleId, onSelect, className }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedBundle = bundles.find(b => b.id === selectedBundleId);
  const enabledBundles = bundles.filter(b => b.enabled);

  return (
    <div className={cn('relative', className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-3 w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[var(--color-surface-900)] border border-[var(--color-border-default)]',
          'hover:border-[var(--color-border-strong)] focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-500)]/10 focus:outline-none',
          'text-left transition-all duration-200 shadow-sm'
        )}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--color-content-primary)] truncate">
            {selectedBundle?.name || 'Select a model'}
          </p>
          {selectedBundle && (
            <p className="text-xs text-[var(--color-content-tertiary)] truncate mt-0.5">
              {selectedBundle.description || `${selectedBundle.capabilities.length} capabilities`}
            </p>
          )}
        </div>
        <ChevronDown className={cn('h-4 w-4 text-[var(--color-content-tertiary)] flex-shrink-0 transition-transform duration-200', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className={cn(
            'absolute top-full left-0 right-0 mt-1.5 z-50',
            'bg-white dark:bg-[var(--color-surface-900)] rounded-xl border border-[var(--color-border-default)] shadow-[var(--shadow-elevation-3)]',
            'max-h-80 overflow-y-auto overflow-x-hidden'
          )}
          role="listbox"
        >
          <div className="p-1.5">
            {enabledBundles.map(bundle => (
              <button
                key={bundle.id}
                type="button"
                role="option"
                aria-selected={selectedBundleId === bundle.id}
                onClick={() => { onSelect(bundle.id); setIsOpen(false); }}
                className={cn(
                  'w-full text-left p-3 rounded-lg transition-colors duration-150',
                  selectedBundleId === bundle.id
                    ? 'bg-[var(--color-brand-50)] dark:bg-[var(--color-brand-950)]/50'
                    : 'hover:bg-[var(--color-surface-50)] dark:hover:bg-[var(--color-surface-800)]'
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 text-[10px] font-bold',
                    bundle.tier === 'pro' && 'bg-[var(--color-brand-100)] text-[var(--color-brand-700)] dark:bg-[var(--color-brand-900)] dark:text-[var(--color-brand-300)]',
                    bundle.tier === 'enterprise' && 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
                    bundle.tier === 'free' && 'bg-[var(--color-surface-100)] text-[var(--color-content-secondary)] dark:bg-[var(--color-surface-800)] dark:text-[var(--color-content-secondary)]'
                  )}>
                    {bundle.tier === 'pro' && 'PRO'}
                    {bundle.tier === 'enterprise' && 'ENT'}
                    {bundle.tier === 'free' && 'FREE'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-[var(--color-content-primary)] truncate">{bundle.name}</p>
                      <Badge variant={bundle.tier === 'pro' ? 'primary' : bundle.tier === 'enterprise' ? 'warning' : 'neutral'} size="xs">
                        {bundle.tier}
                      </Badge>
                    </div>
                    {bundle.description && (
                      <p className="text-xs text-[var(--color-content-tertiary)] mt-0.5 line-clamp-1">{bundle.description}</p>
                    )}
                    <div className="flex items-center gap-1 mt-2">
                      {bundle.capabilities.slice(0, 6).map(cap => (
                        <span
                          key={cap.capabilityId}
                          className="inline-flex items-center gap-1 h-5 px-1.5 rounded bg-[var(--color-surface-50)] dark:bg-[var(--color-surface-800)] text-[var(--color-content-tertiary)] border border-[var(--color-border-default)] text-[10px]"
                          title={getCapabilityLabel(cap.capabilityId)}
                        >
                          {capabilityIcons[cap.capabilityId]}
                        </span>
                      ))}
                      {bundle.capabilities.length > 6 && (
                        <span className="text-[10px] text-[var(--color-content-tertiary)] px-1.5 py-0.5 rounded bg-[var(--color-surface-50)] dark:bg-[var(--color-surface-800)] border border-[var(--color-border-default)]">
                          +{bundle.capabilities.length - 6}
                        </span>
                      )}
                    </div>
                  </div>
                  {selectedBundleId === bundle.id && (
                    <div className="flex-shrink-0 mt-0.5">
                      <Check className="h-4 w-4 text-[var(--color-brand-500)] dark:text-[var(--color-brand-400)]" />
                    </div>
                  )}
                </div>
              </button>
            ))}
            {enabledBundles.length === 0 && (
              <div className="px-4 py-10 text-center">
                <div className="h-12 w-12 rounded-full bg-[var(--color-surface-100)] dark:bg-[var(--color-surface-800)] flex items-center justify-center mx-auto mb-3">
                  <Sparkles className="h-6 w-6 text-[var(--color-content-tertiary)]" />
                </div>
                <p className="text-sm font-medium text-[var(--color-content-primary)] mb-1">No models available</p>
                <p className="text-xs text-[var(--color-content-tertiary)]">No bundles have been configured yet</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
