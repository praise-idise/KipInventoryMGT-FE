import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { getApiErrorMessage, isApiError } from '@/api/types'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Label, PasswordInput, toast } from '@/components/ui'
import { APP_ROLES } from '@/auth/roles'
import { clearAuthSession } from '@/auth/session'
import { useAuth } from '@/hooks/use-auth'
import { useBillingAccess } from '@/hooks/use-billing-access'
import { changePassword } from '@/services/auth.service'
import { fetchCurrentOrganization, updateOrganization } from '@/services/organizations.service'

const organizationSchema = z.object({
    name: z.string().trim().min(1, 'Organization name is required.').max(200, 'Organization name cannot exceed 200 characters.'),
})

type OrganizationValues = z.infer<typeof organizationSchema>

const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required.'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters.'),
    confirmPassword: z.string().min(1, 'Please confirm the new password.'),
}).refine((values) => values.newPassword === values.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
}).refine((values) => values.newPassword !== values.currentPassword, {
    message: 'New password must be different from your current password.',
    path: ['newPassword'],
})

type ChangePasswordValues = z.infer<typeof changePasswordSchema>

export function SettingsPage() {
    const { user } = useAuth()
    const { canWrite } = useBillingAccess()
    const queryClient = useQueryClient()
    const navigate = useNavigate()
    const isAdmin = user?.roles?.includes(APP_ROLES.ADMIN) ?? false

    const organizationQuery = useQuery({
        queryKey: ['organization', 'current'],
        queryFn: fetchCurrentOrganization,
        staleTime: 60_000,
    })

    const organizationForm = useForm<OrganizationValues>({
        resolver: zodResolver(organizationSchema),
        defaultValues: { name: '' },
    })

    // The organization loads asynchronously; sync its name into the form once it arrives.
    useEffect(() => {
        if (organizationQuery.data) {
            organizationForm.reset({ name: organizationQuery.data.name })
        }
    }, [organizationQuery.data, organizationForm])

    // Watched values make the Save button enable reactively on edit.
    const organizationNameValue = organizationForm.watch('name')

    const updateOrganizationMutation = useMutation({
        mutationFn: (values: OrganizationValues) => updateOrganization(values),
        onSuccess: async (response) => {
            await queryClient.invalidateQueries({ queryKey: ['organization'] })
            organizationForm.reset({ name: response.data?.name ?? '' })
            toast.success(response.message || 'Organization updated successfully.')
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, 'Unable to update organization.'))
        },
    })

    async function onUpdateOrganization(values: OrganizationValues) {
        await updateOrganizationMutation.mutateAsync(values)
    }

    const changePasswordForm = useForm<ChangePasswordValues>({
        resolver: zodResolver(changePasswordSchema),
        defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
    })

    // Watched password fields drive the Update button's disabled state.
    const passwordValues = changePasswordForm.watch()

    async function onChangePassword(values: ChangePasswordValues) {
        try {
            const response = await changePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword })
            toast.success(response.message || 'Password updated successfully. Please sign in again.')
            // The backend revokes all sessions on password change, so the
            // current token is already dead — sign out immediately instead of
            // waiting for the next request to fail.
            clearAuthSession()
            navigate({ to: '/auth/login' })
        } catch (error) {
            toast.error(getApiErrorMessage(error, 'Unable to change password.'))
        }
    }

    return (
        <main className="space-y-6">
            <h1 className="text-2xl font-bold tracking-tight">Settings</h1>

            <Card className="bg-surface/95">
                <CardHeader>
                    <CardTitle>Organization</CardTitle>
                </CardHeader>
                <CardContent>
                    {organizationQuery.isLoading ? (
                        <p className="text-sm text-muted-foreground">Loading organization...</p>
                    ) : organizationQuery.isError || !organizationQuery.data ? (
                        <p className="text-sm text-muted-foreground">
                            {isApiError(organizationQuery.error) && organizationQuery.error.statusCode === 404
                                ? 'You are not part of an organization.'
                                : 'Unable to load organization.'}
                        </p>
                    ) : !isAdmin ? (
                        <p className="text-sm">{organizationQuery.data.name}</p>
                    ) : (
                        <form onSubmit={organizationForm.handleSubmit(onUpdateOrganization)} className="flex flex-wrap items-end gap-3">
                            <fieldset disabled={!canWrite} className="flex flex-wrap items-end gap-3">
                                <div className="space-y-2">
                                    <Label htmlFor="organizationName" required>Name</Label>
                                    <Input
                                        id="organizationName"
                                        className="md:min-w-72"
                                        error={Boolean(organizationForm.formState.errors.name)}
                                        {...organizationForm.register('name')}
                                    />
                                    {organizationForm.formState.errors.name && (
                                        <p className="text-xs text-destructive">{organizationForm.formState.errors.name.message}</p>
                                    )}
                                </div>
                                <Button
                                    type="submit"
                                    loading={updateOrganizationMutation.isPending}
                                    disabled={organizationNameValue.trim() === (organizationQuery.data.name ?? '').trim()}
                                >
                                    Save
                                </Button>
                            </fieldset>
                        </form>
                    )}
                </CardContent>
            </Card>

            <Card className="bg-surface/95">
                <CardHeader>
                    <CardTitle>Profile</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-1.5 text-sm">
                        <p><span className="text-muted-foreground">Email:</span> {user?.email ?? 'Unknown'}</p>
                        <p className="flex items-center gap-2"><span className="text-muted-foreground">Roles:</span> {user?.roles?.map((role) => <Badge key={role} variant="muted">{role}</Badge>)}</p>
                    </div>

                    <hr className="border-border" />

                    <div>
                        <h2 className="text-base font-semibold mb-4">Change Password</h2>
                        <form onSubmit={changePasswordForm.handleSubmit(onChangePassword)} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="currentPassword" required>Current password</Label>
                                <PasswordInput id="currentPassword" error={Boolean(changePasswordForm.formState.errors.currentPassword)} {...changePasswordForm.register('currentPassword')} />
                                {changePasswordForm.formState.errors.currentPassword && <p className="text-xs text-destructive">{changePasswordForm.formState.errors.currentPassword.message}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="newPassword" required>New password</Label>
                                <PasswordInput id="newPassword" error={Boolean(changePasswordForm.formState.errors.newPassword)} {...changePasswordForm.register('newPassword')} />
                                {changePasswordForm.formState.errors.newPassword && <p className="text-xs text-destructive">{changePasswordForm.formState.errors.newPassword.message}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword" required>Confirm password</Label>
                                <PasswordInput id="confirmPassword" error={Boolean(changePasswordForm.formState.errors.confirmPassword)} {...changePasswordForm.register('confirmPassword')} />
                                {changePasswordForm.formState.errors.confirmPassword && <p className="text-xs text-destructive">{changePasswordForm.formState.errors.confirmPassword.message}</p>}
                            </div>
                            <Button
                                type="submit"
                                loading={changePasswordForm.formState.isSubmitting}
                                disabled={!passwordValues.currentPassword || !passwordValues.newPassword || !passwordValues.confirmPassword}
                            >
                                Update password
                            </Button>
                        </form>
                    </div>
                </CardContent>
            </Card>
        </main>
    )
}
