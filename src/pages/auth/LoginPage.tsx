import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { isApiError } from '@/api/types'
import { formatCooldown, useResendVerificationCooldown } from '@/auth/use-resend-verification-cooldown'
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, PasswordInput, toast } from '@/components/ui'
import { useAuth } from '@/hooks/use-auth'
import { resendVerification } from '@/services/auth.service'

const loginSchema = z.object({
    email: z.email('Enter a valid email address.'),
    password: z.string().min(1, 'Password is required.'),
})

type LoginFormValues = z.infer<typeof loginSchema>

export function LoginPage() {
    const navigate = useNavigate()
    const { login } = useAuth()
    const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null)
    const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent'>('idle')
    const { remainingSeconds, isCoolingDown, applyCooldown } = useResendVerificationCooldown(unverifiedEmail)

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        clearErrors,
        setError,
    } = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: '',
            password: '',
        },
    })

    async function onSubmit(values: LoginFormValues) {
        setUnverifiedEmail(null)
        setResendStatus('idle')
        clearErrors('root')

        try {
            await login(values)
            navigate({ to: '/app/dashboard' })
        } catch (error) {
            if (isApiError(error)) {
                const isUnverified = error.statusCode === 403 && error.message.toLowerCase().includes('not verified')
                if (isUnverified) {
                    setUnverifiedEmail(values.email)
                }

                setError('root', { message: error.message || 'Unable to login. Please try again.' })
                return
            }

            setError('root', { message: 'Unexpected error occurred while signing in.' })
        }
    }

    async function handleResend() {
        if (!unverifiedEmail || isCoolingDown) {
            return
        }

        setResendStatus('sending')

        try {
            const response = await resendVerification({ email: unverifiedEmail })
            applyCooldown(response.data, unverifiedEmail)
            setResendStatus('sent')
            toast.success(response.message || 'If the email exists and is unverified, a new link has been sent.')
        } catch (error) {
            setResendStatus('idle')
            toast.error(isApiError(error) ? error.message : 'Unable to resend the verification email right now.')
        }
    }

    return (
        <Card className="border-primary/20 bg-surface/95">
            <CardHeader>
                <CardTitle>Sign In</CardTitle>
                <CardDescription>Continue to the KIP Inventory application.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email" required>
                            Email
                        </Label>
                        <Input id="email" type="email" placeholder="admin@example.com" error={Boolean(errors.email)} {...register('email')} />
                        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password" required>
                            Password
                        </Label>
                        <PasswordInput
                            id="password"
                            placeholder="Enter your password"
                            error={Boolean(errors.password)}
                            {...register('password')}
                        />
                        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
                    </div>

                    {errors.root?.message && (
                        <div className="space-y-2">
                            <p className="text-sm text-destructive">{errors.root.message}</p>
                            {unverifiedEmail && (
                                <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
                                    <p className="text-muted-foreground">
                                        Your email is not verified yet. Request a fresh verification link below.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={handleResend}
                                        disabled={resendStatus === 'sending' || isCoolingDown}
                                        className="mt-2 font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:no-underline disabled:opacity-60"
                                    >
                                        {resendStatus === 'sending'
                                            ? 'Sending...'
                                            : isCoolingDown
                                                ? `Resend in ${formatCooldown(remainingSeconds)}`
                                                : 'Resend verification'}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    <Button type="submit" className="w-full" loading={isSubmitting}>
                        Sign In
                    </Button>

                    <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
                        <Link to="/auth/forgot-password" className="text-primary hover:underline">
                            Forgot password?
                        </Link>
                        <Link to="/auth/signup" className=" text-sm text-muted-foreground ">
                            Don't have an account? <span className="text-primary hover:underline">Sign Up</span>
                        </Link>
                    </div>
                </form>
            </CardContent>
        </Card>
    )
}
