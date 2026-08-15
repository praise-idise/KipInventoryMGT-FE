import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { EllipsisVertical } from 'lucide-react'
import { APP_ROLES, type AppRole } from '@/auth/roles'
import { getApiErrorMessage } from '@/api/types'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Dialog, Input, Label, Popover, toast, useConfirm } from '@/components/ui'
import { cn } from '@/lib/cn'
import { useAuth } from '@/hooks/use-auth'
import { getStatusBadgeClassName } from '@/lib/status-badge'
import { activateUser, deactivateUser, fetchUsers, removeUserFromOrganization, revokeUserSessions, updateUserRoles } from '@/services/users.service'
import { createRole, deleteRole, fetchRoles, updateRole, type RoleItem } from '@/services/roles.service'
import { fetchInvitations, inviteMember, revokeInvitation } from '@/services/organizations.service'

const ROLE_OPTIONS: AppRole[] = [
    APP_ROLES.USER,
    APP_ROLES.PROCUREMENT_OFFICER,
    APP_ROLES.WAREHOUSE_OFFICER,
    APP_ROLES.APPROVER,
    APP_ROLES.ADMIN,
]

type TabId = 'users' | 'invitations' | 'roles'

const TABS: { id: TabId; label: string }[] = [
    { id: 'users', label: 'Users' },
    { id: 'invitations', label: 'Invitations' },
    { id: 'roles', label: 'Roles' },
]

export function UsersPage() {
    const { user } = useAuth()
    const queryClient = useQueryClient()
    const { confirm, dialog: confirmDialog } = useConfirm()
    const [activeTab, setActiveTab] = useState<TabId>('users')
    const [draftSearchTerm, setDraftSearchTerm] = useState('')
    const [searchTerm, setSearchTerm] = useState('')
    const [pageNumber, setPageNumber] = useState(1)
    const [roleDrafts, setRoleDrafts] = useState<Record<string, AppRole[]>>({})
    const [editingRolesFor, setEditingRolesFor] = useState<string | null>(null)
    const [roleDialogOpen, setRoleDialogOpen] = useState(false)
    const [editingRole, setEditingRole] = useState<{ id?: string; name: string; description: string } | null>(null)
    const [roleDialogSaving, setRoleDialogSaving] = useState(false)
    const pageSize = 10

    useEffect(() => {
        setPageNumber(1)
    }, [searchTerm])

    const usersQuery = useQuery({
        queryKey: ['users', pageNumber, pageSize, searchTerm],
        queryFn: () => fetchUsers({ pageNumber, pageSize, searchTerm }),
        staleTime: 0,
    })

    const revokeMutation = useMutation({
        mutationFn: revokeUserSessions,
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['users'] })
            toast.success('User sessions revoked successfully.')
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, 'Unable to revoke user sessions.'))
        },
    })

    const statusMutation = useMutation({
        mutationFn: ({ userId, makeActive }: { userId: string; makeActive: boolean }) =>
            makeActive ? activateUser(userId) : deactivateUser(userId),
        onSuccess: async (response) => {
            await queryClient.invalidateQueries({ queryKey: ['users'] })
            toast.success(response.message || 'User status updated successfully.')
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, 'Unable to update user status.'))
        },
    })

    const rolesQuery = useQuery({
        queryKey: ['roles'],
        queryFn: fetchRoles,
        staleTime: 0,
    })

    const createRoleMutation = useMutation({
        mutationFn: createRole,
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['roles'] })
            setRoleDialogOpen(false)
            setEditingRole(null)
            toast.success('Role created.')
        },
        onError: (error) => { toast.error(getApiErrorMessage(error, 'Unable to create role.')) },
    })

    const updateRoleMutation = useMutation({
        mutationFn: ({ roleId, values }: { roleId: string; values: { name?: string; description?: string; permissions?: string } }) =>
            updateRole(roleId, values),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['roles'] })
            setRoleDialogOpen(false)
            setEditingRole(null)
            toast.success('Role updated.')
        },
        onError: (error) => { toast.error(getApiErrorMessage(error, 'Unable to update role.')) },
    })

    const deleteRoleMutation = useMutation({
        mutationFn: deleteRole,
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['roles'] })
            toast.success('Role deleted.')
        },
        onError: (error) => { toast.error(getApiErrorMessage(error, 'Unable to delete role.')) },
    })

    const [inviteEmail, setInviteEmail] = useState('')
    const [inviteRole, setInviteRole] = useState<AppRole>(APP_ROLES.WAREHOUSE_OFFICER)

    const invitationsQuery = useQuery({
        queryKey: ['invitations', 'options'],
        queryFn: () => fetchInvitations({ pageNumber: 1, pageSize: 100 }),
        staleTime: 0,
    })

    const inviteMutation = useMutation({
        mutationFn: () => inviteMember({ email: inviteEmail.trim(), role: inviteRole }),
        onSuccess: async (response) => {
            setInviteEmail('')
            await queryClient.invalidateQueries({ queryKey: ['invitations'] })
            toast.success(response.message || 'Invitation sent.')
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, 'Unable to send invitation.'))
        },
    })

    const revokeInvitationMutation = useMutation({
        mutationFn: revokeInvitation,
        onSuccess: async (response) => {
            await queryClient.invalidateQueries({ queryKey: ['invitations'] })
            toast.success(response.message || 'Invitation revoked.')
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, 'Unable to revoke invitation.'))
        },
    })

    const removeUserMutation = useMutation({
        mutationFn: removeUserFromOrganization,
        onSuccess: async (response) => {
            await queryClient.invalidateQueries({ queryKey: ['users'] })
            toast.success(response.message || 'User removed from the organization.')
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, 'Unable to remove user.'))
        },
    })

    async function handleInvite() {
        if (!inviteEmail.trim()) {
            toast.error('Enter the email address to invite.')
            return
        }
        await inviteMutation.mutateAsync()
    }

    async function handleRevokeInvitation(invitationId: string, email: string) {
        const confirmed = await confirm({
            title: 'Revoke Invitation',
            description: `Revoke the pending invitation sent to ${email}?`,
            confirmLabel: 'Revoke',
            variant: 'danger',
        })
        if (!confirmed) return
        await revokeInvitationMutation.mutateAsync(invitationId)
    }

    async function handleRemoveUser(userId: string, userLabel: string) {
        const confirmed = await confirm({
            title: 'Remove from Organization',
            description: `Remove ${userLabel} from this organization? Their access is revoked and they lose all roles.`,
            confirmLabel: 'Remove',
            variant: 'danger',
        })
        if (!confirmed) return
        await removeUserMutation.mutateAsync(userId)
    }

    const rolesMutation = useMutation({
        mutationFn: ({ userId, roles }: { userId: string; roles: AppRole[] }) => updateUserRoles(userId, roles),
        onSuccess: async (_, variables) => {
            await queryClient.invalidateQueries({ queryKey: ['users'] })
            setEditingRolesFor(null)
            setRoleDrafts((current) => {
                const next = { ...current }
                delete next[variables.userId]
                return next
            })
            toast.success('User roles updated successfully.')
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, 'Unable to update user roles.'))
        },
    })

    const visibleUsers = (usersQuery.data?.data ?? []).filter((item) => item.userId !== user?.userId)
    const pagination = usersQuery.data?.pagination
    const totalPages = pagination ? pagination.totalPages : 1

    function handleSearch() {
        setSearchTerm(draftSearchTerm.trim())
        setPageNumber(1)
    }

    function toggleRole(userId: string, role: AppRole, currentRoles: AppRole[]) {
        setRoleDrafts((current) => {
            const baseRoles = current[userId] ?? currentRoles
            const nextRoles = baseRoles.includes(role)
                ? baseRoles.filter((item) => item !== role)
                : [...baseRoles, role]
            return { ...current, [userId]: ROLE_OPTIONS.filter((item) => nextRoles.includes(item)) }
        })
    }

    function openRoleEditor(userId: string) {
        setEditingRolesFor(userId)
    }

    async function handleSaveRoles(userId: string, draftRoles: AppRole[]) {
        if (draftRoles.length === 0) {
            toast.error('At least one role must remain assigned.')
            return
        }
        await rolesMutation.mutateAsync({ userId, roles: draftRoles })
    }

    async function handleToggleActive(userId: string, makeActive: boolean, userLabel: string) {
        if (!makeActive) {
            const confirmed = await confirm({
                title: 'Deactivate User',
                description: `Deactivate ${userLabel}? They will be signed out and can only return after reactivation.`,
                confirmLabel: 'Deactivate',
                variant: 'danger',
            })
            if (!confirmed) return
        }
        await statusMutation.mutateAsync({ userId, makeActive })
    }

    function openCreateRoleDialog() {
        setEditingRole({ name: '', description: '' })
        setRoleDialogOpen(true)
    }

    function openEditRoleDialog(role: RoleItem) {
        setEditingRole({ id: role.id, name: role.name, description: role.description ?? '' })
        setRoleDialogOpen(true)
    }

    async function handleSaveRole() {
        if (!editingRole || !editingRole.name.trim()) return
        setRoleDialogSaving(true)
        try {
            if (editingRole.id) {
                await updateRoleMutation.mutateAsync({ roleId: editingRole.id, values: { name: editingRole.name, description: editingRole.description } })
            } else {
                await createRoleMutation.mutateAsync({ name: editingRole.name, description: editingRole.description })
            }
        } finally {
            setRoleDialogSaving(false)
        }
    }

    async function handleDeleteRole(roleId: string, name: string) {
        const confirmed = await confirm({ title: 'Delete Role', description: `Delete "${name}"?`, confirmLabel: 'Delete', variant: 'danger' })
        if (!confirmed) return
        await deleteRoleMutation.mutateAsync(roleId)
    }

    async function handleRevoke(userId: string, userLabel: string) {
        const confirmed = await confirm({
            title: 'Revoke Sessions',
            description: `Revoke all active sessions for ${userLabel}?`,
            confirmLabel: 'Revoke',
            variant: 'danger',
        })
        if (!confirmed) return
        await revokeMutation.mutateAsync(userId)
    }

    return (
        <main className="space-y-6">
            <h1 className="text-2xl font-bold tracking-tight">Users & Roles</h1>

            <div className="border-b border-border">
                <nav className="flex gap-4" role="tablist">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            role="tab"
                            aria-selected={activeTab === tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                'relative pb-2.5 text-sm font-medium transition-colors',
                                activeTab === tab.id
                                    ? 'text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:rounded-full after:bg-primary'
                                    : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {activeTab === 'users' && (
                <Card className="bg-surface/95">
                    <CardHeader>
                        <CardTitle>All Users</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex gap-3">
                            <Input
                                value={draftSearchTerm}
                                onChange={(e) => setDraftSearchTerm(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleSearch() }}
                                placeholder="Search by email, name, or username"
                                className="md:max-w-sm"
                            />
                            <Button variant="outline" onClick={handleSearch}>
                                Search
                            </Button>
                        </div>

                        <div className="overflow-x-auto rounded-lg border border-border">
                            <table className="w-max min-w-full divide-y divide-border text-sm">
                                <thead className="bg-muted/40 text-left text-muted-foreground">
                                    <tr>
                                        <th className="px-4 py-3 font-medium">Name</th>
                                        <th className="px-4 py-3 font-medium">Email</th>
                                        <th className="px-4 py-3 font-medium">Roles</th>
                                        <th className="px-4 py-3 font-medium">Status</th>
                                        <th className="px-4 py-3 font-medium">Created</th>
                                        <th className="w-16 px-4 py-3 font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {usersQuery.isLoading ? (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">Loading users...</td>
                                        </tr>
                                    ) : visibleUsers.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">No users found.</td>
                                        </tr>
                                    ) : (
                                        visibleUsers.map((item) => {
                                            const userLabel = item.email ?? item.userName ?? item.userId

                                            return (
                                                <tr key={item.userId} className="bg-surface">
                                                    <td className="px-4 py-3 font-medium">
                                                        {item.firstName || item.lastName
                                                            ? `${item.firstName ?? ''} ${item.lastName ?? ''}`.trim()
                                                            : item.userName || '—'}
                                                    </td>
                                                    <td className="px-4 py-3">{item.email || '—'}</td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex flex-wrap gap-1">
                                                            {item.roles.map((role) => (
                                                                <Badge key={role} variant="muted" className="text-xs">{role}</Badge>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <Badge variant="outline" className={getStatusBadgeClassName(item.isActive ? 'Active' : 'Inactive')}>
                                                            {item.isActive ? 'Active' : 'Inactive'}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-4 py-3 text-muted-foreground">
                                                        {new Date(item.createdAt).toLocaleDateString()}
                                                    </td>
                                                    <td className="w-16 px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                                        <Popover
                                                            trigger={
                                                                <span className="inline-flex size-8 items-center justify-center rounded-md hover:bg-muted">
                                                                    <EllipsisVertical className="size-4" />
                                                                </span>
                                                            }
                                                            align="end"
                                                        >
                                                            <div className="flex flex-col">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => openRoleEditor(item.userId)}
                                                                    className="rounded-sm px-3 py-2 text-sm text-left hover:bg-muted transition-colors"
                                                                >
                                                                    Edit Roles
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleToggleActive(item.userId, !item.isActive, userLabel)}
                                                                    className="rounded-sm px-3 py-2 text-sm text-left hover:bg-muted transition-colors"
                                                                >
                                                                    {item.isActive ? 'Deactivate' : 'Activate'}
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleRevoke(item.userId, userLabel)}
                                                                    className="rounded-sm px-3 py-2 text-sm text-left text-destructive hover:bg-muted transition-colors"
                                                                >
                                                                    Revoke Sessions
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleRemoveUser(item.userId, userLabel)}
                                                                    className="rounded-sm px-3 py-2 text-sm text-left text-destructive hover:bg-muted transition-colors"
                                                                >
                                                                    Remove from Organization
                                                                </button>
                                                            </div>
                                                        </Popover>
                                                    </td>
                                                </tr>
                                            )
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex items-center justify-between">
                            <Button
                                variant="outline"
                                onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                                disabled={pageNumber <= 1}
                            >
                                Previous
                            </Button>
                            <p className="text-xs text-muted-foreground">Page {pageNumber} of {totalPages}</p>
                            <Button
                                variant="outline"
                                onClick={() => setPageNumber((p) => p + 1)}
                                disabled={pageNumber >= totalPages}
                            >
                                Next
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {activeTab === 'invitations' && (
                <Card className="bg-surface/95">
                    <CardHeader>
                        <CardTitle>Invite Members</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-wrap items-end gap-3">
                            <div className="space-y-2">
                                <Label htmlFor="inviteEmail" required>Email address</Label>
                                <Input
                                    id="inviteEmail"
                                    type="email"
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleInvite() }}
                                    placeholder="teammate@example.com"
                                    className="md:min-w-72"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="inviteRole" required>Role</Label>
                                <select
                                    id="inviteRole"
                                    value={inviteRole}
                                    onChange={(e) => setInviteRole(e.target.value as AppRole)}
                                    className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                                >
                                    {ROLE_OPTIONS.map((role) => (
                                        <option key={role} value={role}>{role}</option>
                                    ))}
                                </select>
                            </div>
                            <Button onClick={handleInvite} loading={inviteMutation.isPending}>
                                Send Invitation
                            </Button>
                        </div>

                        <div className="overflow-x-auto rounded-lg border border-border">
                            <table className="w-max min-w-full divide-y divide-border text-sm">
                                <thead className="bg-muted/40 text-left text-muted-foreground">
                                    <tr>
                                        <th className="px-4 py-3 font-medium">Email</th>
                                        <th className="px-4 py-3 font-medium">Role</th>
                                        <th className="px-4 py-3 font-medium">Invited By</th>
                                        <th className="px-4 py-3 font-medium">Status</th>
                                        <th className="px-4 py-3 font-medium">Expires</th>
                                        <th className="w-16 px-4 py-3 font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {invitationsQuery.isLoading ? (
                                        <tr><td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">Loading invitations...</td></tr>
                                    ) : (invitationsQuery.data?.data ?? []).length === 0 ? (
                                        <tr><td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">No invitations sent yet.</td></tr>
                                    ) : (
                                        (invitationsQuery.data?.data ?? []).map((invitation) => (
                                            <tr key={invitation.organizationInvitationId} className="bg-surface">
                                                <td className="px-4 py-3 font-medium">{invitation.email}</td>
                                                <td className="px-4 py-3">{invitation.role}</td>
                                                <td className="px-4 py-3">{invitation.invitedBy || '—'}</td>
                                                <td className="px-4 py-3">
                                                    <Badge variant="outline" className={getStatusBadgeClassName(invitation.status)}>
                                                        {invitation.status}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-3 text-muted-foreground">
                                                    {new Date(invitation.expiresAt).toLocaleDateString()}
                                                </td>
                                                <td className="w-16 px-4 py-3">
                                                    {invitation.status === 'Pending' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRevokeInvitation(invitation.organizationInvitationId, invitation.email)}
                                                            className="text-sm text-destructive hover:underline"
                                                        >
                                                            Revoke
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {activeTab === 'roles' && (
                <Card className="bg-surface/95">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>Roles</CardTitle>
                            <Button size="sm" onClick={openCreateRoleDialog}>Add Role</Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto rounded-lg border border-border">
                            <table className="w-max min-w-full divide-y divide-border text-sm">
                                <thead className="bg-muted/40 text-left text-muted-foreground">
                                    <tr>
                                        <th className="px-4 py-3 font-medium">Name</th>
                                        <th className="px-4 py-3 font-medium">Description</th>
                                        <th className="w-16 px-4 py-3 font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {rolesQuery.isLoading ? (
                                        <tr><td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">Loading roles...</td></tr>
                                    ) : (rolesQuery.data ?? []).length === 0 ? (
                                        <tr><td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">No roles yet.</td></tr>
                                    ) : (
                                        (rolesQuery.data ?? []).map((role) => (
                                            <tr key={role.id} className="bg-surface">
                                                <td className="px-4 py-3 font-medium">{role.name}</td>
                                                <td className="px-4 py-3 text-muted-foreground">{role.description || '—'}</td>
                                                <td className="w-16 px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                                    <Popover
                                                        trigger={<span className="inline-flex size-8 items-center justify-center rounded-md hover:bg-muted"><EllipsisVertical className="size-4" /></span>}
                                                        align="end"
                                                    >
                                                        <div className="flex flex-col">
                                                            <button type="button" onClick={() => openEditRoleDialog(role)} className="rounded-sm px-3 py-2 text-sm text-left hover:bg-muted transition-colors">Edit</button>
                                                            <button type="button" onClick={() => handleDeleteRole(role.id, role.name)} className="rounded-sm px-3 py-2 text-sm text-left text-destructive hover:bg-muted transition-colors">Delete</button>
                                                        </div>
                                                    </Popover>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Role Editor Dialog */}
            {editingRolesFor && (() => {
                const editingUser = visibleUsers.find((u) => u.userId === editingRolesFor)
                if (!editingUser) return null
                const draftRoles = roleDrafts[editingRolesFor] ?? editingUser.roles
                const hasChanges = JSON.stringify(draftRoles.sort()) !== JSON.stringify([...editingUser.roles].sort())

                return (
                    <div className="fixed inset-0 z-200 flex items-center justify-center p-4" onClick={() => setEditingRolesFor(null)}>
                        <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" />
                        <div className="relative z-10 w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
                            <h2 className="text-lg font-semibold mb-2">Edit Roles</h2>
                            <p className="text-sm text-muted-foreground mb-4">
                                {editingUser.email || editingUser.userName || editingUser.userId}
                            </p>
                            <div className="space-y-3 mb-4">
                                {ROLE_OPTIONS.map((role) => (
                                    <label key={role} className="flex items-center gap-2 text-sm">
                                        <input
                                            type="checkbox"
                                            className="size-4 rounded border-input"
                                            checked={draftRoles.includes(role)}
                                            onChange={() => toggleRole(editingRolesFor, role, editingUser.roles)}
                                        />
                                        {role}
                                    </label>
                                ))}
                            </div>
                            <div className="flex gap-3">
                                <Button
                                    onClick={() => handleSaveRoles(editingRolesFor, draftRoles)}
                                    loading={rolesMutation.isPending}
                                    disabled={!hasChanges || draftRoles.length === 0}
                                >
                                    Save Roles
                                </Button>
                                <Button variant="outline" onClick={() => setEditingRolesFor(null)}>
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    </div>
                )
            })()}
            {confirmDialog}

            <Dialog open={roleDialogOpen} onClose={() => setRoleDialogOpen(false)} title={editingRole?.id ? 'Edit Role' : 'Create Role'}>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="role-name" required>Name</Label>
                        <Input id="role-name" value={editingRole?.name ?? ''} onChange={(e) => setEditingRole((prev) => prev ? { ...prev, name: e.target.value } : null)} placeholder="Administrator" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="role-desc">Description</Label>
                        <Input id="role-desc" value={editingRole?.description ?? ''} onChange={(e) => setEditingRole((prev) => prev ? { ...prev, description: e.target.value } : null)} placeholder="Full system access" maxLength={500} />
                    </div>
                    <div className="flex gap-3">
                        <Button onClick={handleSaveRole} loading={roleDialogSaving}>Save</Button>
                        <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>Cancel</Button>
                    </div>
                </div>
            </Dialog>
        </main>
    )
}
