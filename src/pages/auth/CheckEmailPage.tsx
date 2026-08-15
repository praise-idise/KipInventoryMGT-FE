import { useState } from 'react'
import { useSearch } from '@tanstack/react-router'
import { getApiErrorMessage } from '@/api/types'
import { formatCooldown, useResendVerificationCooldown } from '@/auth/use-resend-verification-cooldown'
import { Button, Card, CardContent, CardHeader, CardTitle, toast } from '@/components/ui'
import { resendVerification } from '@/services/auth.service'

export function CheckEmailPage() {
    const search = useSearch({ strict: false }) as { email?: string }
    const email = search.email ?? ''
    const [isSending, setIsSending] = useState(false)
    const { remainingSeconds, isCoolingDown, applyCooldown } = useResendVerificationCooldown(email)

    async function handleResend() {
        if (!email || isCoolingDown) return
        setIsSending(true)
        try {
            const response = await resendVerification({ email })
            applyCooldown(response.data, email)
            toast.success(response.message || 'A new verification link has been sent if the email is unverified.')
        } catch (error) {
            toast.error(getApiErrorMessage(error, 'Unable to resend the verification email.'))
        } finally {
            setIsSending(false)
        }
    }

    return (
        <Card className="border-primary/20 bg-surface/95 shadow-xl shadow-primary/5">
            <CardHeader>
                <CardTitle className="text-center">Verify your email address</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center space-y-6 text-center">
                <p className="text-sm text-muted-foreground">
                    Please click the link that was sent to <span className="font-medium text-foreground">{email}</span> to verify your email.
                </p>
                <Button onClick={handleResend} loading={isSending} disabled={!email || isCoolingDown}>
                    {isCoolingDown ? `Resend available in ${formatCooldown(remainingSeconds)}` : 'Resend'}
                </Button>
                <p className="text-xs text-muted-foreground">
                    Didn't receive the email? Check your spam folder, or click Resend.
                </p>
            </CardContent>
        </Card>
    )
}
