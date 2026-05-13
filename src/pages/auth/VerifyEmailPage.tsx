import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { AlertCircle, CheckCircle, Loader } from 'lucide-react'
import { isApiError } from '@/api/types'
import { formatCooldown, useResendVerificationCooldown } from '@/auth/use-resend-verification-cooldown'
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui'
import { resendVerification, verifyEmail } from '@/services/auth.service'

export function VerifyEmailPage() {
    const navigate = useNavigate()
    const search = useMemo(() => new URLSearchParams(window.location.search), [])
    const email = (search.get('email') ?? '').trim()
    const token = (search.get('token') ?? '').trim()
    const hasRequestedVerification = useRef(false)
    const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'resending' | 'ready-to-resend'>('loading')
    const [message, setMessage] = useState<string | null>(null)
    const { remainingSeconds, isCoolingDown, applyCooldown } = useResendVerificationCooldown(email)

    useEffect(() => {
        if (email && !token) {
            setStatus('ready-to-resend')
            setMessage(null)
            return
        }

        if (!email || !token) {
            setStatus('error')
            setMessage('Invalid or missing verification link.')
            return
        }

        if (hasRequestedVerification.current) {
            return
        }

        hasRequestedVerification.current = true

        verifyEmail(email, token)
            .then((response) => {
                setMessage(response.message || 'Email verified successfully. You can sign in now.')
                setStatus('success')
            })
            .catch((error) => {
                if (isApiError(error)) {
                    if (error.message.toLowerCase().includes('already verified')) {
                        setMessage('Email is already verified. You can sign in now.')
                        setStatus('success')
                        return
                    }

                    setMessage(error.message || 'Unable to verify email.')
                    setStatus(email ? 'ready-to-resend' : 'error')
                    return
                }

                setMessage('Unexpected error occurred while verifying email.')
                setStatus(email ? 'ready-to-resend' : 'error')
            })
    }, [email, token])

    async function handleResendVerification() {
        if (!email || isCoolingDown) {
            return
        }

        setStatus('resending')

        try {
            const response = await resendVerification({ email })
            applyCooldown(response.data, email)
            setMessage(response.message || 'If the email exists and is unverified, a new link has been sent.')
        } catch (error) {
            setMessage(isApiError(error) ? error.message || 'Unable to resend verification email.' : 'Unable to resend verification email.')
        } finally {
            setStatus('ready-to-resend')
        }
    }

    if (status === 'loading') {
        return (
            <Card className="border-primary/20 bg-surface/95 shadow-xl shadow-primary/5">
                <CardHeader>
                    <CardTitle>Verifying email</CardTitle>
                    <CardDescription>Please wait while we confirm your verification link.</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center py-4">
                    <Loader className="size-8 animate-spin text-primary" />
                </CardContent>
            </Card>
        )
    }

    if (status === 'success') {
        return (
            <Card className="border-primary/20 bg-surface/95 shadow-xl shadow-primary/5">
                <CardHeader>
                    <div className="mb-2 flex justify-center">
                        <CheckCircle className="size-12 text-success" />
                    </div>
                    <CardTitle>Email verified</CardTitle>
                    <CardDescription>Your account is ready to use.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">{message ?? 'Email verified successfully. You can sign in now.'}</p>
                    <Button className="w-full" onClick={() => navigate({ to: '/auth/login' })}>
                        Go to sign in
                    </Button>
                </CardContent>
            </Card>
        )
    }

    const isResendMode = status === 'ready-to-resend' || status === 'resending'

    return (
        <Card className="border-primary/20 bg-surface/95 shadow-xl shadow-primary/5">
            <CardHeader>
                <div className="mb-2 flex justify-center">
                    <AlertCircle className="size-12 text-destructive" />
                </div>
                <CardTitle>{isResendMode ? 'Resend verification email' : 'Verification failed'}</CardTitle>
                <CardDescription>
                    {isResendMode
                        ? 'We can send a fresh verification link to your inbox.'
                        : 'We could not verify your account with this link.'}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                    {message ?? (isResendMode ? 'Your previous link may have expired. Request a new one below.' : 'The verification link may be invalid or expired.')}
                </p>
                {email && isResendMode && (
                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={handleResendVerification}
                        disabled={status === 'resending' || isCoolingDown}
                    >
                        {status === 'resending'
                            ? 'Sending...'
                            : isCoolingDown
                                ? `Resend in ${formatCooldown(remainingSeconds)}`
                                : `Resend link to ${email}`}
                    </Button>
                )}
                <Link
                    to="/auth/resend-verification"
                    className="inline-flex h-10 w-full items-center justify-center rounded-md border border-transparent px-4 text-sm font-medium text-primary transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                    Open resend page
                </Link>
                <Link to="/auth/login" className="hidden text-center text-sm text-muted-foreground hover:text-foreground hover:underline md:block">
                    Back to login
                </Link>
            </CardContent>
        </Card>
    )
}