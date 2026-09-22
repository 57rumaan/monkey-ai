import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/features/auth/hooks/useAuth';
import {
  Button, Badge, Table, Card, Switch, IconButton, Avatar, Select, Input, Dropdown, Textarea,
  BarChartIcon, UsersIcon, MessageIcon, ZapIcon, SettingsIcon, FolderIcon,
  GridIcon, SlidersIcon, TrashIcon, EditIcon, PlusIcon,
  CheckIcon, AlertCircleIcon, ShieldIcon, ChevronLeftIcon, SearchIcon, MoreHorizontalIcon
} from '@/components/ui-new';

type AdminPage = 'dashboard' | 'providers' | 'bundles' | 'capabilities' | 'users' | 'chats' | 'usage' | 'settings';

const SparklineChart = ({ data }: { data: number[] }) => {
  const max = Math.max(...data);
  return (
    <div className="flex items-end gap-0.5 h-8">
      {data.map((v, i) => (
        <div key={i} className="flex-1 flex items-end h-full">
          <div className="w-full bg-[var(--primary)] rounded-sm opacity-70 hover:opacity-100 transition-opacity" style={{ height: `${(v / max) * 120}px` }} />
        </div>
      ))}
    </div>
  );
};

const ADMIN_NAV: { id: AdminPage; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <GridIcon /> },
  { id: 'providers', label: 'Providers', icon: <ZapIcon /> },
  { id: 'bundles', label: 'Model Bundles', icon: <FolderIcon /> },
  { id: 'capabilities', label: 'Capabilities', icon: <SlidersIcon /> },
  { id: 'users', label: 'Users', icon: <UsersIcon /> },
  { id: 'chats', label: 'Chats', icon: <MessageIcon /> },
  { id: 'usage', label: 'Usage', icon: <BarChartIcon /> },
  { id: 'settings', label: 'Settings', icon: <SettingsIcon /> },
];

function StatCard({ label, value, delta, icon, spark }: { label: string; value: string; delta: string; icon: React.ReactNode; spark: number[] }) {
  const positive = delta.startsWith('+');
  return (
    <Card>
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)]">{icon}</div>
          <span className={cn('text-xs font-medium px-1.5 py-0.5 rounded', positive ? 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30' : 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30')}>{delta}</span>
        </div>
        <p className="text-2xl font-semibold text-[var(--foreground)] mb-0.5">{value}</p>
        <p className="text-xs text-[var(--muted-foreground)] mb-3">{label}</p>
        <SparklineChart data={spark} />
      </div>
    </Card>
  );
}

export function AdminView({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const [page, setPage] = useState<AdminPage>('dashboard');
  const [userSearch, setUserSearch] = useState('');

  return (
    <div className="flex h-full min-h-0 bg-[var(--background)]">
      {/* Admin sidebar */}
      <div className="w-56 flex-shrink-0 border-r border-[var(--border)] bg-[var(--sidebar)] flex flex-col">
        <div className="flex items-center gap-2 px-4 py-4 border-b border-[var(--border)]">
          <button onClick={onBack} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"><ChevronLeftIcon /></button>
          <div className="flex items-center gap-1.5">
            <span className="text-base">O</span>
            <span className="font-semibold text-sm text-[var(--foreground)]" style={{ fontFamily: 'Instrument Serif, serif' }}>Admin Panel</span>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          {ADMIN_NAV.map(item => (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius)] text-sm transition-colors',
                page === item.id ? 'bg-[var(--primary)]/10 text-[var(--primary)] font-medium' : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]'
              )}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-[var(--border)]">
          <div className="flex items-center gap-2 px-2">
            <Avatar name={user?.username || 'User'} size="sm" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-[var(--foreground)] truncate">{user?.username}</p>
              <p className="text-xs text-[var(--muted-foreground)]">Super Admin</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="p-6 max-w-5xl mx-auto">
          {/* Dashboard */}
          {page === 'dashboard' && (
            <div className="flex flex-col gap-6">
              <h2 className="text-xl font-semibold text-[var(--foreground)]">Dashboard</h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Users" value="12,847" delta="+8.2%" icon={<UsersIcon />} spark={[40,55,45,60,70,65,80,75,90,85,95,100]} />
                <StatCard label="Active Users" value="3,291" delta="+12.5%" icon={<UsersIcon />} spark={[30,40,35,50,45,60,55,70,65,80,75,90]} />
                <StatCard label="AI Requests" value="891,204" delta="+23.1%" icon={<ZapIcon />} spark={[50,60,55,70,65,80,75,90,85,95,90,100]} />
                <StatCard label="Token Usage" value="2.4B" delta="+18.7%" icon={<BarChartIcon />} spark={[60,55,70,65,80,75,90,85,95,90,100,95]} />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <div className="p-5">
                    <p className="font-medium text-[var(--foreground)] mb-4">Requests over time (7 days)</p>
                    <div className="flex items-end gap-1 h-32">
                      {[120,145,130,160,175,155,190].map((v, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <div className="w-full bg-[var(--primary)] rounded-t-sm opacity-80 hover:opacity-100 transition-opacity" style={{ height: `${(v / 190) * 120}px` }} />
                          <span className="text-xs text-[var(--muted-foreground)]">{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
                <Card>
                  <div className="p-5">
                    <p className="font-medium text-[var(--foreground)] mb-4">Model usage distribution</p>
                    <div className="flex flex-col gap-2">
                      {[
                        { name: 'Octix Pro', pct: 38, color: 'var(--primary)' },
                        { name: 'Claude Sonnet', pct: 27, color: '#3B82F6' },
                        { name: 'GPT-4o', pct: 20, color: '#10B981' },
                        { name: 'Octix Fast', pct: 10, color: '#F59E0B' },
                        { name: 'Other', pct: 5, color: 'var(--border)' },
                      ].map(m => (
                        <div key={m.name} className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: m.color }} />
                          <span className="text-xs text-[var(--foreground)] w-32 truncate">{m.name}</span>
                          <div className="flex-1 h-1.5 bg-[var(--muted)] rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${m.pct}%`, background: m.color }} />
                          </div>
                          <span className="text-xs text-[var(--muted-foreground)] w-8 text-right">{m.pct}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              </div>
              <Card>
                <div className="p-5">
                  <p className="font-medium text-[var(--foreground)] mb-4">Recent activity</p>
                  <Table
                    headers={['User', 'Action', 'Model', 'Time', 'Status']}
                    rows={[
                      [<div className="flex items-center gap-2"><Avatar name="Alex Rivera" size="xs" /><span>Alex Rivera</span></div>, 'Chat request', 'Octix Pro', '2m ago', <Badge variant="success">OK</Badge>],
                      [<div className="flex items-center gap-2"><Avatar name="Jordan Kim" size="xs" /><span>Jordan Kim</span></div>, 'Image generation', 'GPT-4o', '5m ago', <Badge variant="success">OK</Badge>],
                      [<div className="flex items-center gap-2"><Avatar name="Sam Chen" size="xs" /><span>Sam Chen</span></div>, 'Chat request', 'Claude Sonnet', '12m ago', <Badge variant="error">Error</Badge>],
                      [<div className="flex items-center gap-2"><Avatar name="Morgan Lee" size="xs" /><span>Morgan Lee</span></div>, 'Voice transcription', 'Octix Fast', '18m ago', <Badge variant="success">OK</Badge>],
                    ]}
                  />
                </div>
              </Card>
            </div>
          )}

          {/* Providers */}
          {page === 'providers' && (
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-[var(--foreground)]">Providers</h2>
                <Button variant="primary" size="sm" icon={<PlusIcon />}>Add Provider</Button>
              </div>
              <Card>
                <div className="p-5">
                  <Table
                    headers={['Provider', 'Status', 'Models', 'Last updated', 'Actions']}
                    rows={[
                      ['OpenAI', <Badge variant="success">Active</Badge>, '12', '1h ago', <div className="flex gap-1"><IconButton size="sm" tooltip="Edit"><EditIcon /></IconButton><IconButton size="sm" tooltip="Delete" danger><TrashIcon /></IconButton></div>],
                      ['Anthropic', <Badge variant="success">Active</Badge>, '5', '3h ago', <div className="flex gap-1"><IconButton size="sm" tooltip="Edit"><EditIcon /></IconButton><IconButton size="sm" tooltip="Delete" danger><TrashIcon /></IconButton></div>],
                      ['Google AI', <Badge variant="muted">Inactive</Badge>, '4', '2d ago', <div className="flex gap-1"><IconButton size="sm" tooltip="Edit"><EditIcon /></IconButton><IconButton size="sm" tooltip="Delete" danger><TrashIcon /></IconButton></div>],
                      ['Meta AI', <Badge variant="muted">Inactive</Badge>, '3', '5d ago', <div className="flex gap-1"><IconButton size="sm" tooltip="Edit"><EditIcon /></IconButton><IconButton size="sm" tooltip="Delete" danger><TrashIcon /></IconButton></div>],
                    ]}
                  />
                </div>
              </Card>
            </div>
          )}

          {/* Bundles */}
          {page === 'bundles' && (
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-[var(--foreground)]">Model Bundles</h2>
                <Button variant="primary" size="sm" icon={<PlusIcon />}>Create Bundle</Button>
              </div>
              <Card>
                <div className="p-5">
                  <Table
                    headers={['Bundle', 'Tier', 'Models', 'Capabilities', 'Status', 'Actions']}
                    rows={[
                      [<span className="font-medium">Octix Pro</span>, <Badge variant="primary">Pro</Badge>, '3', 'Text, Vision, Coding', <Badge variant="success">Enabled</Badge>, <div className="flex gap-1"><IconButton size="sm" tooltip="Edit"><EditIcon /></IconButton><IconButton size="sm" tooltip="Delete" danger><TrashIcon /></IconButton></div>],
                      [<span className="font-medium">Octix Fast</span>, <Badge variant="muted">Free</Badge>, '1', 'Text', <Badge variant="success">Enabled</Badge>, <div className="flex gap-1"><IconButton size="sm" tooltip="Edit"><EditIcon /></IconButton><IconButton size="sm" tooltip="Delete" danger><TrashIcon /></IconButton></div>],
                      [<span className="font-medium">Enterprise</span>, <Badge variant="warning">Enterprise</Badge>, '5', 'Text, Vision, Coding, Audio', <Badge variant="success">Enabled</Badge>, <div className="flex gap-1"><IconButton size="sm" tooltip="Edit"><EditIcon /></IconButton><IconButton size="sm" tooltip="Delete" danger><TrashIcon /></IconButton></div>],
                    ]}
                  />
                </div>
              </Card>
            </div>
          )}

          {/* Capabilities */}
          {page === 'capabilities' && (
            <div className="flex flex-col gap-6">
              <h2 className="text-xl font-semibold text-[var(--foreground)]">Capabilities</h2>
              <div className="grid grid-cols-1 gap-3">
                {[
                  { name: 'Text Chat', desc: 'Standard text-based AI conversations', icon: '💬', enabled: true, models: 6 },
                  { name: 'Vision', desc: 'Analyze and understand images', icon: '👁️', enabled: true, models: 3 },
                  { name: 'Image Generation', desc: 'Create images from text prompts', icon: '🎨', enabled: true, models: 1 },
                  { name: 'Image Editing', desc: 'Edit and modify existing images', icon: '✏️', enabled: false, models: 0 },
                  { name: 'Text to Speech', desc: 'Convert text to natural speech', icon: '🔊', enabled: true, models: 2 },
                  { name: 'Speech to Text', desc: 'Transcribe audio to text', icon: '🎤', enabled: false, models: 0 },
                ].map(f => (
                  <Card key={f.name}>
                    <div className="p-4 flex items-center gap-4">
                      <span className="text-2xl">{f.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-[var(--foreground)]">{f.name}</p>
                          <Badge variant={f.enabled ? 'success' : 'muted'}>{f.enabled ? 'Enabled' : 'Disabled'}</Badge>
                        </div>
                        <p className="text-sm text-[var(--muted-foreground)]">{f.desc}</p>
                        <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{f.models} supported model{f.models !== 1 ? 's' : ''}</p>
                      </div>
                      <Switch checked={f.enabled} onChange={() => {}} />
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Users */}
          {page === 'users' && (
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-[var(--foreground)]">Users</h2>
                <div className="flex gap-2">
                  <Input leftIcon={<SearchIcon />} placeholder="Search users..." value={userSearch} onChange={e => setUserSearch(e.target.value)} />
                  <Select options={[{value:'all',label:'All statuses'},{value:'active',label:'Active'},{value:'inactive',label:'Inactive'}]} value="all" onChange={() => {}} />
                </div>
              </div>
              <Card>
                <Table
                  headers={['User', 'Status', 'Created', 'Last active', 'Requests', 'Actions']}
                  rows={[
                    [<div className="flex items-center gap-2"><Avatar name="Alex Rivera" size="sm" /><div><p className="font-medium text-sm">Alex Rivera</p><p className="text-xs text-[var(--muted-foreground)]">alex@example.com</p></div></div>, <Badge variant="success">Active</Badge>, 'Jan 12, 2026', '2m ago', '1,847', (
                      <Dropdown align="right" trigger={<IconButton size="sm"><MoreHorizontalIcon /></IconButton>} items={[{label:'View profile',icon:<UsersIcon />},{label:'Impersonate',icon:<ShieldIcon />},{divider:true},{label:'Suspend user',icon:<AlertCircleIcon />,danger:true}]} />
                    )],
                    [<div className="flex items-center gap-2"><Avatar name="Jordan Kim" size="sm" /><div><p className="font-medium text-sm">Jordan Kim</p><p className="text-xs text-[var(--muted-foreground)]">jordan@example.com</p></div></div>, <Badge variant="success">Active</Badge>, 'Feb 3, 2026', '1h ago', '3,201', (
                      <Dropdown align="right" trigger={<IconButton size="sm"><MoreHorizontalIcon /></IconButton>} items={[{label:'View profile',icon:<UsersIcon />},{label:'Impersonate',icon:<ShieldIcon />},{divider:true},{label:'Suspend user',icon:<AlertCircleIcon />,danger:true}]} />
                    )],
                    [<div className="flex items-center gap-2"><Avatar name="Sam Chen" size="sm" /><div><p className="font-medium text-sm">Sam Chen</p><p className="text-xs text-[var(--muted-foreground)]">sam@example.com</p></div></div>, <Badge variant="muted">Inactive</Badge>, 'Mar 5, 2026', '1 week ago', '420', (
                      <Dropdown align="right" trigger={<IconButton size="sm"><MoreHorizontalIcon /></IconButton>} items={[{label:'View profile',icon:<UsersIcon />},{label:'Impersonate',icon:<ShieldIcon />},{divider:true},{label:'Suspend user',icon:<AlertCircleIcon />,danger:true}]} />
                    )],
                  ]}
                />
              </Card>
            </div>
          )}

          {/* Chats */}
          {page === 'chats' && (
            <div className="flex flex-col gap-6">
              <h2 className="text-xl font-semibold text-[var(--foreground)]">Chats</h2>
              <Card>
                <Table
                  headers={['User', 'Conversation', 'Model', 'Created', 'Last message', 'Status']}
                  rows={[
                    [<div className="flex items-center gap-2"><Avatar name="Alex Rivera" size="xs" /><span>Alex Rivera</span></div>, 'React performance optimization', 'Octix Pro', '2h ago', '5m ago', <Badge variant="success">Active</Badge>],
                    [<div className="flex items-center gap-2"><Avatar name="Jordan Kim" size="xs" /><span>Jordan Kim</span></div>, 'Python async deep dive', 'Claude Sonnet', '1d ago', '1h ago', <Badge variant="muted">Idle</Badge>],
                    [<div className="flex items-center gap-2"><Avatar name="Sam Chen" size="xs" /><span>Sam Chen</span></div>, 'SQL query optimization', 'Octix Fast', '3d ago', '3d ago', <Badge variant="muted">Ended</Badge>],
                  ]}
                />
              </Card>
            </div>
          )}

          {/* Usage */}
          {page === 'usage' && (
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-[var(--foreground)]">Usage Analytics</h2>
                <Select options={[{value:'7d',label:'Last 7 days'},{value:'30d',label:'Last 30 days'},{value:'90d',label:'Last 90 days'}]} value="30d" onChange={() => {}} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <div className="p-5">
                    <p className="font-medium text-[var(--foreground)] mb-4">Requests by provider</p>
                    <div className="flex flex-col gap-2.5">
                      {[{n:'Octix AI',v:45},{n:'Anthropic',v:27},{n:'OpenAI',v:20},{n:'Google AI',v:8}].map(p => (
                        <div key={p.n} className="flex items-center gap-3">
                          <span className="text-xs w-20 text-[var(--foreground)]">{p.n}</span>
                          <div className="flex-1 h-2 bg-[var(--muted)] rounded-full overflow-hidden">
                            <div className="h-full bg-[var(--primary)] rounded-full" style={{ width: `${p.v}%` }} />
                          </div>
                          <span className="text-xs text-[var(--muted-foreground)] w-8 text-right">{p.v}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
                <Card>
                  <div className="p-5">
                    <p className="font-medium text-[var(--foreground)] mb-4">Token usage by day</p>
                    <div className="flex items-end gap-1 h-24">
                      {[65,80,72,90,85,95,88,76,100,92,87,95,78,85].map((v, i) => (
                        <div key={i} className="flex-1 bg-[var(--primary)] rounded-t-sm opacity-70 hover:opacity-100 transition-opacity" style={{ height: `${v}%` }} />
                      ))}
                    </div>
                  </div>
                </Card>
              </div>
              <Card>
                <div className="p-5">
                  <p className="font-medium text-[var(--foreground)] mb-4">Top users by requests</p>
                  <Table
                    headers={['User', 'Requests', 'Tokens', 'Avg. tokens/req', 'Favorite model']}
                    rows={[
                      [<div className="flex items-center gap-2"><Avatar name="Alex Rivera" size="xs" /><span>Alex Rivera</span></div>, '1,847', '1,564,009', '847', <Badge variant="primary">Octix Pro</Badge>],
                      [<div className="flex items-center gap-2"><Avatar name="Jordan Kim" size="xs" /><span>Jordan Kim</span></div>, '3,201', '2,711,000', '847', <Badge variant="primary">Claude Sonnet</Badge>],
                    ]}
                  />
                </div>
              </Card>
            </div>
          )}

          {/* Settings */}
          {page === 'settings' && (
            <div className="flex flex-col gap-6">
              <h2 className="text-xl font-semibold text-[var(--foreground)]">Admin Settings</h2>
              <Card>
                <div className="p-5 flex flex-col gap-4">
                  <p className="font-medium text-[var(--foreground)]">General</p>
                  <Input label="Platform name" value="Octix AI" />
                  <Input label="Support email" value="support@octix.ai" />
                  <Textarea label="System-wide instructions" rows={4} placeholder="Instructions applied to all conversations..." />
                </div>
              </Card>
              <Card>
                <div className="p-5 flex flex-col gap-4">
                  <p className="font-medium text-[var(--foreground)]">Access control</p>
                  {[
                    { label: 'Allow public signups', desc: 'Let anyone create an account', enabled: true },
                    { label: 'Email verification required', desc: 'Users must verify email before accessing', enabled: true },
                    { label: 'Maintenance mode', desc: 'Disable access for all users except admins', enabled: false },
                  ].map(s => (
                    <div key={s.label} className="flex items-center justify-between border-b border-[var(--border)] last:border-0 pb-4 last:pb-0">
                      <div>
                        <p className="text-sm font-medium text-[var(--foreground)]">{s.label}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">{s.desc}</p>
                      </div>
                      <Switch checked={s.enabled} onChange={() => {}} />
                    </div>
                  ))}
                </div>
              </Card>
              <div className="flex justify-end">
                <Button variant="primary" icon={<CheckIcon />}>Save settings</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}