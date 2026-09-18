import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, MoreVertical, Shield, User, Trash2, Edit, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { ModalProvider, ModalHeader, ModalBody, ModalFooter, useModal } from '@/components/ui/Modal';
import { Dropdown, DropdownItem } from '@/components/ui/Dropdown';
import { useToast } from '@/components/ui/Toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const userSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(30, 'Username must be at most 30 characters').regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscore, and hyphen'),
  email: z.string().email('Invalid email address'),
  role: z.enum(['user', 'admin']),
});

type UserFormData = z.infer<typeof userSchema>;

interface User {
  id: string;
  email: string;
  username: string;
  role: 'user' | 'admin';
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

async function fetchUsers() {
  const response = await fetch('/api/admin/users', { credentials: 'include' });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch users');
  return data.data as User[];
}

async function updateUserRole(id: string, role: 'user' | 'admin') {
  const response = await fetch(`/api/admin/users/${id}/role`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ role }),
  });
  const result = await response.json();
  if (!result.success) throw new Error(result.error || 'Failed to update role');
  return result.data;
}

async function deleteUser(id: string) {
  const response = await fetch(`/api/admin/users/${id}`, { method: 'DELETE', credentials: 'include' });
  const result = await response.json();
  if (!result.success) throw new Error(result.error || 'Failed to delete user');
}

export function AdminUsersPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const { data: users = [], isLoading } = useQuery({ queryKey: ['admin-users'], queryFn: fetchUsers });

  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: 'user' | 'admin' }) => updateUserRole(id, role),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-users'] }); showToast('Role updated', { variant: 'success' }); },
    onError: (error) => showToast(error instanceof Error ? error.message : 'Failed to update role', { variant: 'error' }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-users'] }); showToast('User deleted', { variant: 'success' }); },
    onError: (error) => showToast(error instanceof Error ? error.message : 'Failed to delete user', { variant: 'error' }),
  });

  return (
    <ModalProvider isOpen={!!editingUser} onClose={() => setEditingUser(null)}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-heading-xl font-bold text-content-primary">Users</h1>
            <p className="text-body text-content-tertiary mt-1">Manage user accounts and roles</p>
          </div>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-content-tertiary" />
              <Input
                placeholder="Search by username or email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <Card>
            <CardContent className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-brand-500 border-t-transparent" />
            </CardContent>
          </Card>
        ) : filteredUsers.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <div className="h-16 w-16 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-content-tertiary" />
              </div>
              <h3 className="text-heading-md font-medium text-content-primary mb-2">
                {search ? 'No users found' : 'No users yet'}
              </h3>
              <p className="text-body text-content-tertiary">
                {search ? 'Try adjusting your search terms' : 'Users will appear here once they sign up'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border-default">
                    <th className="px-4 py-3 text-left text-body-sm font-medium text-content-tertiary">User</th>
                    <th className="px-4 py-3 text-left text-body-sm font-medium text-content-tertiary hidden sm:table-cell">Email</th>
                    <th className="px-4 py-3 text-left text-body-sm font-medium text-content-tertiary">Role</th>
                    <th className="px-4 py-3 text-left text-body-sm font-medium text-content-tertiary hidden md:table-cell">Status</th>
                    <th className="px-4 py-3 text-left text-body-sm font-medium text-content-tertiary hidden lg:table-cell">Joined</th>
                    <th className="px-4 py-3 text-right text-body-sm font-medium text-content-tertiary">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(user => (
                    <tr key={user.id} className="border-b border-border-default last:border-b-0 hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-brand-100 dark:bg-brand-900 flex items-center justify-center text-brand-600 dark:text-brand-400 text-body-sm font-semibold flex-shrink-0">
                            {user.username[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-body font-medium text-content-primary truncate">{user.username}</p>
                            <p className="text-body-xs text-content-tertiary sm:hidden truncate">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-body text-content-secondary hidden sm:table-cell">{user.email}</td>
                      <td className="px-4 py-3">
                        <Badge variant={user.role === 'admin' ? 'warning' : 'neutral'}>{user.role}</Badge>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <Badge variant={user.emailVerified ? 'success' : 'warning'}>{user.emailVerified ? 'Verified' : 'Pending'}</Badge>
                      </td>
                      <td className="px-4 py-3 text-body-sm text-content-tertiary hidden lg:table-cell">{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right">
                        <Dropdown
                          trigger={<Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>}
                          align="right"
                        >
                          <DropdownItem icon={<Edit className="h-4 w-4" />} onClick={() => setEditingUser(user)}>Edit</DropdownItem>
                          <DropdownItem icon={<Shield className="h-4 w-4" />} onClick={() => updateRoleMutation.mutate({ id: user.id, role: user.role === 'admin' ? 'user' : 'admin' })}>
                            {user.role === 'admin' ? 'Make User' : 'Make Admin'}
                          </DropdownItem>
                          <DropdownItem icon={<Trash2 className="h-4 w-4" />} onClick={() => { if (confirm('Delete this user? This cannot be undone.')) deleteMutation.mutate(user.id); }} className="text-state-error">Delete</DropdownItem>
                        </Dropdown>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

      </div>

      {editingUser && (
        <UserEditModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSubmit={data => updateRoleMutation.mutate({ id: editingUser.id, role: data.role })}
          isLoading={updateRoleMutation.isPending}
        />
      )}
    </ModalProvider>
  );
}

function UserEditModal({ user, onClose, onSubmit, isLoading }: { user: User; onClose: () => void; onSubmit: (data: UserFormData) => void; isLoading: boolean }) {
  const { close } = useModal();
  const { register, handleSubmit, formState: { errors } } = useForm<UserFormData>({ resolver: zodResolver(userSchema), defaultValues: { username: user.username, email: user.email, role: user.role } });

  return (
    <>
      <div className="modal-overlay" onClick={onClose} />
      <div className="modal-content" onClick={e => e.stopPropagation()}>
      <ModalHeader title="Edit User" description={`Modify ${user.username}'s account`} />
      <ModalBody>
        <form onSubmit={handleSubmit(data => { onSubmit(data); onClose(); close(); })} className="space-y-4" noValidate>
          <Input label="Username" error={errors.username?.message} {...register('username')} />
          <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
          <Select label="Role" options={[{ value: 'user', label: 'User' }, { value: 'admin', label: 'Admin' }]} error={errors.role?.message} {...register('role')} />
        </form>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button type="submit" form="user-form" loading={isLoading}>Save</Button>
      </ModalFooter>
    </div>
  </>
);
}
