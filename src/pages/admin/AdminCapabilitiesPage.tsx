import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { CAPABILITY_CATEGORIES, getCapabilitiesByCategory, type CapabilityDefinition } from '@/lib/capabilities/registry';
import { cn } from '@/lib/utils';
import { Sparkles, Code, Image, Video, Mic, FileText, Zap } from 'lucide-react';

const categoryIcons: Record<string, React.ReactNode> = {
  text: <Sparkles className="h-4 w-4" />,
  image: <Image className="h-4 w-4" />,
  video: <Video className="h-4 w-4" />,
  audio: <Mic className="h-4 w-4" />,
  document: <FileText className="h-4 w-4" />,
  utility: <Zap className="h-4 w-4" />,
  custom: <Code className="h-4 w-4" />,
};

const categoryColors: Record<string, string> = {
  text: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  image: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
  video: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  audio: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  document: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300',
  utility: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  custom: 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300',
};

function CapabilityCard({ cap }: { cap: CapabilityDefinition }) {
  return (
    <div className="p-4 rounded-xl border border-[var(--color-border-default)] bg-white dark:bg-[var(--color-surface-900)] hover:border-[var(--color-brand-300)] dark:hover:border-brand-700 hover:shadow-sm transition-all">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-[var(--color-brand-50)] dark:bg-[var(--color-brand-950)]/50 flex items-center justify-center flex-shrink-0">
          <span className="text-[var(--color-brand-500)] dark:text-[var(--color-brand-400)]">
            {categoryIcons[cap.category] || <Sparkles className="h-4 w-4" />}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-[var(--color-content-primary)]">{cap.label}</h4>
          <p className="text-sm text-[var(--color-content-tertiary)] mt-1 leading-relaxed">{cap.description}</p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={cap.requiresModel ? 'primary' : 'success'} size="xs">
              {cap.requiresModel ? 'Requires Model' : 'Built-in'}
            </Badge>
            <Badge variant="neutral" size="xs">
              {cap.category}
            </Badge>
          </div>
        </div>
      </div>
      {cap.supportedParameters.length > 0 && (
        <details className="mt-3 ml-[3.25rem]">
          <summary className="text-xs text-[var(--color-content-tertiary)] cursor-pointer hover:text-[var(--color-content-secondary)] transition-colors">
            Parameters ({cap.supportedParameters.length})
          </summary>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {cap.supportedParameters.map(param => (
              <span key={param.name} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[var(--color-surface-100)] dark:bg-[var(--color-surface-700)] text-xs text-[var(--color-content-secondary)]">
                <code className="font-mono">{param.name}</code>
                <span className="text-[var(--color-content-tertiary)]">({param.type})</span>
                {param.required && <span className="text-state-error">*</span>}
              </span>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

export function AdminCapabilitiesPage() {
  const totalCapabilities = CAPABILITY_CATEGORIES.reduce((acc, cat) => acc + getCapabilitiesByCategory(cat.id).length, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-content-primary)]">Capabilities Registry</h1>
          <p className="text-sm text-[var(--color-content-tertiary)] mt-1">Centralized registry of all available AI capabilities</p>
        </div>
        <Badge variant="neutral">{totalCapabilities} capabilities</Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {CAPABILITY_CATEGORIES.map(category => {
          const capabilities = getCapabilitiesByCategory(category.id);
          if (capabilities.length === 0) return null;
          return (
            <Card key={category.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center', categoryColors[category.id] || 'bg-[var(--color-surface-100)] text-[var(--color-content-secondary)]')}>
                      {categoryIcons[category.id]}
                    </div>
                    <span className="text-lg font-semibold text-[var(--color-content-primary)]">{category.label}</span>
                  </div>
                  <Badge variant="neutral" size="xs">
                    {capabilities.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {capabilities.map(cap => (
                    <CapabilityCard key={cap.id} cap={cap} />
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
