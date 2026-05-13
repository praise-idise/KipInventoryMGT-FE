import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { isApiError } from '@/api/types'
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, toast } from '@/components/ui'
import { forgotPassword } from '@/services/auth.service'

const schema = z.object({
    email: z.email('Enter a valid email address.'),
})

type ForgotPasswordFormValues = z.infer<typeof schema>

export function ForgotPasswordPage() {
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        clearErrors,
        setError,
    } = useForm<ForgotPasswordFormValues>({
        resolver: zodResolver(schema),
        defaultValues: { email: '' },
    })

    async function onSubmit(values: ForgotPasswordFormValues) {
        clearErrors('root')

        try {
            const response = await forgotPassword(values)
            toast.success(response.message || 'If the email exists, a reset link has been sent.')
        } catch (error) {
            if (isApiError(error)) {
                setError('root', { message: error.message || 'Unable to start password reset.' })
                return
            }

            setError('root', { message: 'Unexpected error occurred while starting password reset.' })
        }
    }

    return (
        <Card className="border-primary/20 bg-surface/95 shadow-xl shadow-primary/5">
            <CardHeader>
                <CardTitle>Forgot password</CardTitle>
                <CardDescription>Send yourself a password reset link using the email on your account.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email" required>Email</Label>
                        <Input id="email" type="email" placeholder="admin@example.com" error={Boolean(errors.email)} {...register('email')} />
                        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                    </div>

                    {errors.root?.message && <p className="text-sm text-destructive">{errors.root.message}</p>}

                    <div className="flex items-center justify-end gap-3 md:justify-between">
                        <Link to="/auth/login" className="hidden text-sm text-muted-foreground hover:text-foreground hover:underline md:inline">
                            Back to login
                        </Link>
                        <Button type="submit" loading={isSubmitting}>
                            Send reset link
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    )
}