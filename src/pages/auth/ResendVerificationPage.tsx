import { useMemo } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { isApiError } from '@/api/types'
import { formatCooldown, useResendVerificationCooldown } from '@/auth/use-resend-verification-cooldown'
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, toast } from '@/components/ui'
import { resendVerification } from '@/services/auth.service'

const schema = z.object({
    email: z.email('Enter a valid email address.'),
})

type ResendVerificationFormValues = z.infer<typeof schema>

export function ResendVerificationPage() {
    const search = useMemo(() => new URLSearchParams(window.location.search), [])
    const {
        register,
        handleSubmit,
        watch,
        formState: { errors, isSubmitting },
        clearErrors,
        setError,
    } = useForm<ResendVerificationFormValues>({
        resolver: zodResolver(schema),
        defaultValues: { email: search.get('email') ?? '' },
    })
    const emailValue = watch('email')
    const { remainingSeconds, isCoolingDown, applyCooldown } = useResendVerificationCooldown(emailValue)

    async function onSubmit(values: ResendVerificationFormValues) {
        if (isCoolingDown) {
            toast.info(`Resend in ${formatCooldown(remainingSeconds)}.`)
            return
        }

        clearErrors('root')

        try {
            const response = await resendVerification(values)
            applyCooldown(response.data, values.email)
            toast.success(response.message || 'If the account exists, a verification email has been sent.')
        } catch (error) {
            if (isApiError(error)) {
                setError('root', { message: error.message || 'Unable to resend verification email.' })
                return
            }

            setError('root', { message: 'Unexpected error occurred while resending verification email.' })
        }
    }

    return (
        <Card className="border-primary/20 bg-surface/95 shadow-xl shadow-primary/5">
            <CardHeader>
                <CardTitle>Resend verification</CardTitle>
                <CardDescription>Request a new email verification link for your account.</CardDescription>
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
                        <Button type="submit" loading={isSubmitting} disabled={isCoolingDown}>
                            {isCoolingDown ? `Resend in ${formatCooldown(remainingSeconds)}` : 'Resend email'}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    )
}