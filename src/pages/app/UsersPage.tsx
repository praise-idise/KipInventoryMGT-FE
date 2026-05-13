import { useEffect, useState, type SyntheticEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { APP_ROLES, type AppRole } from '@/auth/roles'
import { getApiErrorMessage } from '@/api/types'
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, toast } from '@/components/ui'
import { useAuth } from '@/hooks/use-auth'
import { getStatusBadgeClassName } from '@/lib/status-badge'
import { activateUser, deactivateUser, fetchUsers, revokeUserSessions, updateUserRoles } from '@/services/users.service'

const roleOptions: AppRole[] = [
    APP_ROLES.USER,
    APP_ROLES.PROCUREMENT_OFFICER,
    APP_ROLES.WAREHOUSE_OFFICER,
    APP_ROLES.APPROVER,
    APP_ROLES.ADMIN,
]

export function UsersPage() {
    const { user } = useAuth()
    const queryClient = useQueryClient()
    const [draftSearchTerm, setDraftSearchTerm] = useState('')
    const [searchTerm, setSearchTerm] = useState('')
    const [isSearchPending, setIsSearchPending] = useState(false)
    const [pageNumber, setPageNumber] = useState(1)
    const [roleDrafts, setRoleDrafts] = useState<Record<string, AppRole[]>>({})
    const pageSize = 10

    useEffect(() => {
        setPageNumber(1)
    }, [searchTerm])

    const usersQuery = useQuery({
        queryKey: ['users', pageNumber, pageSize, searchTerm],
        queryFn: () => fetchUsers({ pageNumber, pageSize, searchTerm }),
    })

    useEffect(() => {
        if (!usersQuery.isFetching) {
            setIsSearchPending(false)
        }
    }, [usersQuery.isFetching])

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

    const rolesMutation = useMutation({
        mutationFn: ({ userId, roles }: { userId: string; roles: AppRole[] }) => updateUserRoles(userId, roles),
        onSuccess: async (response, variables) => {
            await queryClient.invalidateQueries({ queryKey: ['users'] })
            setRoleDrafts((current) => {
                const next = { ...current }
                delete next[variables.userId]
                return next
            })
            toast.success(response.message || 'User roles updated successfully.')
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, 'Unable to update user roles.'))
        },
    })

    const visibleUsers = (usersQuery.data?.data ?? []).filter((item) => item.userId !== user?.userId)
    const totalRecords = usersQuery.data?.pagination.totalRecords ?? visibleUsers.length
    const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize))
    const canGoPrevious = pageNumber > 1
    const canGoNext = pageNumber < totalPages

    async function handleSearchSubmit(event: SyntheticEvent<HTMLFormElement>) {
        event.preventDefault()
        const nextSearchTerm = draftSearchTerm.trim()
        const shouldSearch = nextSearchTerm !== searchTerm || pageNumber !== 1

        setIsSearchPending(shouldSearch)
        setPageNumber(1)
        setSearchTerm(nextSearchTerm)
    }

    async function handleRevoke(userId: string, userLabel: string) {
        const confirmed = window.confirm(`Revoke all active sessions for ${userLabel}?`)
        if (!confirmed) {
            return
        }

        await revokeMutation.mutateAsync(userId)
    }

    async function handleToggleActive(userId: string, makeActive: boolean, userLabel: string) {
        if (!makeActive) {
            const confirmed = window.confirm(`Deactivate ${userLabel}? They will be signed out and can only return after reactivation.`)
            if (!confirmed) {
                return
            }
        }

        await statusMutation.mutateAsync({ userId, makeActive })
    }

    function toggleRole(userId: string, role: AppRole, currentRoles: AppRole[]) {
        setRoleDrafts((current) => {
            const baseRoles = current[userId] ?? currentRoles
            const nextRoles = baseRoles.includes(role)
                ? baseRoles.filter((item) => item !== role)
                : [...baseRoles, role]

            return {
                ...current,
                [userId]: roleOptions.filter((item) => nextRoles.includes(item)),
            }
        })
    }

    async function handleSaveRoles(userId: string, roles: AppRole[]) {
        if (roles.length === 0) {
            toast.error('At least one role must remain assigned.')
            return
        }

        await rolesMutation.mutateAsync({ userId, roles })
    }

    return (
        <main className="space-y-6">
            <section className="rounded-3xl border border-border/60 bg-linear-to-br from-background via-background to-primary/5 p-6 shadow-sm">
                <Badge variant="outline" className="mb-3 border-primary/20 bg-primary/10 text-primary">
                    Inventory system users
                </Badge>
                <h1 className="text-2xl font-semibold tracking-tight">User management</h1>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                    Review active accounts, confirm access state, and revoke server-side sessions when an account needs to be cut off immediately.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                    <Badge variant="muted">Signed in as {user?.email ?? 'unknown'}</Badge>
                    <Badge variant="muted">Admin only</Badge>
                    <Badge variant="muted">Current admin excluded</Badge>
                </div>
            </section>

            <Card className="bg-surface/95">
                <CardHeader>
                    <CardTitle>Find users</CardTitle>
                    <CardDescription>Search by email, username, first name, or last name.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSearchSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
                        <div className="flex-1 space-y-2">
                            <Label htmlFor="searchTerm">Search term</Label>
                            <Input
                                id="searchTerm"
                                value={draftSearchTerm}
                                onChange={(event) => setDraftSearchTerm(event.target.value)}
                                placeholder="name@example.com"
                            />
                        </div>
                        <Button type="submit" loading={isSearchPending}>
                            Search
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <section className="grid gap-4">
                {usersQuery.isLoading ? (
                    Array.from({ length: 3 }).map((_, index) => (
                        <Card key={index} className="bg-surface/95">
                            <CardHeader>
                                <CardDescription>Loading user</CardDescription>
                                <CardTitle className="text-xl">—</CardTitle>
                            </CardHeader>
                        </Card>
                    ))
                ) : visibleUsers.length ? (
                    visibleUsers.map((item) => {
                        const draftRoles = roleDrafts[item.userId] ?? item.roles
                        const hasRoleChanges = draftRoles.length !== item.roles.length || draftRoles.some((role) => !item.roles.includes(role))
                        const userLabel = item.email ?? item.userName ?? item.userId

                        return (
                            <Card key={item.userId} className="bg-surface/95">
                                <CardContent className="space-y-4 p-5">
                                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                        <div className="space-y-2">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h2 className="text-lg font-semibold">
                                                    {item.firstName || item.lastName
                                                        ? `${item.firstName ?? ''} ${item.lastName ?? ''}`.trim()
                                                        : item.email || item.userName || item.userId}
                                                </h2>
                                                {item.isActive ? (
                                                    <Badge variant="outline" className={getStatusBadgeClassName('Active')}>Active</Badge>
                                                ) : (
                                                    <Badge variant="outline" className={getStatusBadgeClassName('Inactive')}>Inactive</Badge>
                                                )}
                                                {item.isEmailConfirmed ? (
                                                    <Badge variant="outline" className={getStatusBadgeClassName('Verified')}>Verified</Badge>
                                                ) : (
                                                    <Badge variant="outline" className={getStatusBadgeClassName('Unverified')}>Unverified</Badge>
                                                )}
                                            </div>
                                            <p className="text-sm text-muted-foreground">{item.email ?? item.userName ?? 'No login identifier'}</p>
                                            <p className="font-mono text-xs text-muted-foreground">{item.userId}</p>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            <Button
                                                variant={item.isActive ? 'destructive' : 'outline'}
                                                onClick={() => handleToggleActive(item.userId, !item.isActive, userLabel)}
                                                loading={statusMutation.isPending && statusMutation.variables?.userId === item.userId}
                                            >
                                                {item.isActive ? 'Deactivate user' : 'Activate user'}
                                            </Button>
                                            <Button
                                                variant="destructive"
                                                onClick={() => handleRevoke(item.userId, userLabel)}
                                                loading={revokeMutation.isPending && revokeMutation.variables === item.userId}
                                            >
                                                Revoke sessions
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
                                        <div>
                                            <p className="text-muted-foreground">Username</p>
                                            <p className="font-medium">{item.userName ?? 'None'}</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Token version</p>
                                            <p className="font-medium">{item.tokenVersion}</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Created</p>
                                            <p className="font-medium">{new Date(item.createdAt).toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Updated</p>
                                            <p className="font-medium">{new Date(item.updatedAt).toLocaleString()}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-3 rounded-2xl border border-border/60 p-4">
                                        <div>
                                            <h3 className="text-sm font-medium">Assigned roles</h3>
                                            <p className="text-xs text-muted-foreground">Role changes revoke active sessions automatically so the next sign-in uses the updated access set.</p>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            {item.roles.length ? item.roles.map((role) => <Badge key={role} variant="muted">{role}</Badge>) : <Badge variant="muted">No roles assigned</Badge>}
                                        </div>

                                        <div className="flex flex-wrap gap-4">
                                            {roleOptions.map((role) => {
                                                const checked = draftRoles.includes(role)

                                                return (
                                                    <label key={role} className="inline-flex items-center gap-2 text-sm text-foreground">
                                                        <input
                                                            type="checkbox"
                                                            className="size-4 rounded border-input"
                                                            checked={checked}
                                                            onChange={() => toggleRole(item.userId, role, item.roles)}
                                                        />
                                                        <span>{role}</span>
                                                    </label>
                                                )
                                            })}
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            <Button
                                                variant="outline"
                                                onClick={() => handleSaveRoles(item.userId, draftRoles)}
                                                loading={rolesMutation.isPending && rolesMutation.variables?.userId === item.userId}
                                                disabled={!hasRoleChanges || draftRoles.length === 0}
                                            >
                                                Save roles
                                            </Button>
                                            {roleDrafts[item.userId] && (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => setRoleDrafts((current) => {
                                                        const next = { ...current }
                                                        delete next[item.userId]
                                                        return next
                                                    })}
                                                >
                                                    Reset role changes
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })
                ) : (
                    <Card className="bg-surface/95">
                        <CardContent className="p-6 text-sm text-muted-foreground">
                            No users matched your search.
                        </CardContent>
                    </Card>
                )}
            </section>

            <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-surface/95 p-4 text-sm">
                <p className="text-muted-foreground">
                    Showing page {pageNumber} of {totalPages} ({totalRecords} total)
                </p>
                <div className="flex items-center gap-2">
                    <Button variant="outline" disabled={!canGoPrevious || usersQuery.isFetching} onClick={() => setPageNumber((current) => Math.max(1, current - 1))}>
                        Previous
                    </Button>
                    <Button variant="outline" disabled={!canGoNext || usersQuery.isFetching} onClick={() => setPageNumber((current) => Math.min(totalPages, current + 1))}>
                        Next
                    </Button>
                </div>
            </div>
        </main>
    )
}
