import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { getApiErrorMessage } from '@/api/types'
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Label, PasswordInput, toast } from '@/components/ui'
import { useAuth } from '@/hooks/use-auth'
import { changePassword } from '@/services/auth.service'

const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required.'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters.'),
    confirmPassword: z.string().min(1, 'Please confirm the new password.'),
}).refine((values) => values.newPassword === values.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
})

type ChangePasswordValues = z.infer<typeof changePasswordSchema>

export function SettingsPage() {
    const { user } = useAuth()

    const changePasswordForm = useForm<ChangePasswordValues>({
        resolver: zodResolver(changePasswordSchema),
        defaultValues: {
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
        },
    })

    async function onChangePassword(values: ChangePasswordValues) {
        try {
            const response = await changePassword({
                currentPassword: values.currentPassword,
                newPassword: values.newPassword,
            })
            changePasswordForm.reset({ currentPassword: '', newPassword: '', confirmPassword: '' })
            toast.success(response.message || 'Password updated successfully.')
        } catch (error) {
            toast.error(getApiErrorMessage(error, 'Unable to change password.'))
        }
    }

    return (
        <main className="space-y-6">
            <section className="rounded-3xl border border-border/60 bg-linear-to-br from-background via-background to-muted/40 p-6 shadow-sm">
                <Badge variant="outline" className="mb-3 border-primary/20 bg-primary/10 text-primary">Settings</Badge>
                <h1 className="text-2xl font-semibold tracking-tight">Profile and security</h1>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                    Update your password and review your current access.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                    {user?.roles?.map((role) => <Badge key={role} variant="muted">{role}</Badge>)}
                </div>
            </section>

            <section className="grid gap-4 xl:grid-cols-2">
                <Card className="bg-surface/95">
                    <CardHeader>
                        <CardTitle>Account</CardTitle>
                        <CardDescription>Current authenticated profile information.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                        <div className="flex items-center justify-between gap-4">
                            <span className="text-muted-foreground">Email</span>
                            <span className="font-medium">{user?.email ?? 'Unknown'}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                            <span className="text-muted-foreground">User ID</span>
                            <span className="font-mono text-xs">{user?.userId ?? 'Unknown'}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                            <span className="text-muted-foreground">Roles</span>
                            <span className="font-medium">{user?.roles?.join(', ') || 'None'}</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-surface/95">
                    <CardHeader>
                        <CardTitle>Change password</CardTitle>
                        <CardDescription>Rotate your password without leaving the app.</CardDescription>
                    </CardHeader>
                    <CardContent>
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

                            <Button type="submit" loading={changePasswordForm.formState.isSubmitting}>
                                Update password
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </section>
        </main>
    )
}