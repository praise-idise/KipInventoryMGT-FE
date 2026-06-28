import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { getApiErrorMessage } from '@/api/types'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Label, PasswordInput, toast } from '@/components/ui'
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
        defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
    })

    async function onChangePassword(values: ChangePasswordValues) {
        try {
            const response = await changePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword })
            changePasswordForm.reset({ currentPassword: '', newPassword: '', confirmPassword: '' })
            toast.success(response.message || 'Password updated successfully.')
        } catch (error) {
            toast.error(getApiErrorMessage(error, 'Unable to change password.'))
        }
    }

    return (
        <main className="space-y-6">
            <h1 className="text-2xl font-bold tracking-tight">Settings</h1>

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
                            <Button type="submit" loading={changePasswordForm.formState.isSubmitting}>Update password</Button>
                        </form>
                    </div>
                </CardContent>
            </Card>
        </main>
    )
}
