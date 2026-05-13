import { useMemo } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { isApiError } from '@/api/types'
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, PasswordInput, toast } from '@/components/ui'
import { resetPassword } from '@/services/auth.service'

const schema = z.object({
    email: z.email('Enter a valid email address.'),
    token: z.string().min(1, 'Reset token is required.'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters.'),
    confirmPassword: z.string().min(1, 'Please confirm the new password.'),
}).refine((values) => values.newPassword === values.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
})

type ResetPasswordFormValues = z.infer<typeof schema>

export function ResetPasswordPage() {
    const navigate = useNavigate()
    const search = useMemo(() => new URLSearchParams(window.location.search), [])
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        clearErrors,
        setError,
    } = useForm<ResetPasswordFormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            email: search.get('email') ?? '',
            token: search.get('token') ?? '',
            newPassword: '',
            confirmPassword: '',
        },
    })

    async function onSubmit(values: ResetPasswordFormValues) {
        clearErrors('root')

        try {
            const response = await resetPassword({
                email: values.email,
                token: values.token,
                newPassword: values.newPassword,
            })
            toast.success(response.message || 'Password reset successfully. You can sign in again now.')
            window.setTimeout(() => navigate({ to: '/auth/login' }), 1200)
        } catch (error) {
            if (isApiError(error)) {
                setError('root', { message: error.message || 'Unable to reset password.' })
                return
            }

            setError('root', { message: 'Unexpected error occurred while resetting password.' })
        }
    }

    return (
        <Card className="border-primary/20 bg-surface/95 shadow-xl shadow-primary/5">
            <CardHeader>
                <CardTitle>Reset password</CardTitle>
                <CardDescription>Use the token from your reset email to set a new password.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email" required>Email</Label>
                        <Input id="email" type="email" error={Boolean(errors.email)} {...register('email')} />
                        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="token" required>Reset token</Label>
                        <Input id="token" type="text" error={Boolean(errors.token)} {...register('token')} />
                        {errors.token && <p className="text-xs text-destructive">{errors.token.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="newPassword" required>New password</Label>
                        <PasswordInput id="newPassword" error={Boolean(errors.newPassword)} {...register('newPassword')} />
                        {errors.newPassword && <p className="text-xs text-destructive">{errors.newPassword.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword" required>Confirm password</Label>
                        <PasswordInput id="confirmPassword" error={Boolean(errors.confirmPassword)} {...register('confirmPassword')} />
                        {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
                    </div>

                    {errors.root?.message && <p className="text-sm text-destructive">{errors.root.message}</p>}

                    <div className="flex items-center justify-end gap-3 md:justify-between">
                        <Link to="/auth/login" className="hidden text-sm text-muted-foreground hover:text-foreground hover:underline md:inline">
                            Back to login
                        </Link>
                        <Button type="submit" loading={isSubmitting}>
                            Reset password
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    )
}