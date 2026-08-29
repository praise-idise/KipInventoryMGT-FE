import { useEffect, useState } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { isApiError } from '@/api/types'
import { isAuthenticated } from '@/auth/session'
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui'
import { acceptInvitation } from '@/services/organizations.service'

export function AcceptInvitationPage() {
    const navigate = useNavigate()
    const search = useSearch({ strict: false }) as { token?: string; email?: string }
    const token = search.token ?? ''
    const email = search.email ?? ''
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [acceptedOrganization, setAcceptedOrganization] = useState<string | null>(null)
    const [isAccepting, setIsAccepting] = useState(false)

    useEffect(() => {
        if (!isAuthenticated() || !token) return
        void handleAccept()
    }, [token])

    async function handleAccept() {
        if (!token) return
        setIsAccepting(true)
        setErrorMessage(null)
        try {
            const response = await acceptInvitation(token)
            setAcceptedOrganization(response.data?.organizationName ?? 'your organization')
            window.setTimeout(() => navigate({ to: '/app/dashboard' }), 1500)
        } catch (error) {
            if (isApiError(error)) {
                setErrorMessage(error.message || 'Unable to accept this invitation.')
                return
            }
            setErrorMessage('Unexpected error while accepting the invitation.')
        } finally {
            setIsAccepting(false)
        }
    }

    if (!token) {
        return (
            <Card className="border-primary/20 bg-surface/95 shadow-xl shadow-primary/5">
                <CardHeader>
                    <CardTitle>Invalid invitation link</CardTitle>
                    <CardDescription>This link is missing its token. Ask your administrator to send the invitation again.</CardDescription>
                </CardHeader>
            </Card>
        )
    }

    if (!isAuthenticated()) {
        return (
            <Card className="border-primary/20 bg-surface/95 shadow-xl shadow-primary/5">
                <CardHeader>
                    <CardTitle>Accept your invitation</CardTitle>
                    <CardDescription>
                        Create an account with the email address the invitation was sent to, and you will join the
                        organization automatically.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button className="w-full" onClick={() => navigate({ to: '/auth/signup', search: { email } })}>
                        Create account
                    </Button>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="border-primary/20 bg-surface/95 shadow-xl shadow-primary/5">
            <CardHeader>
                <CardTitle>Accept your invitation</CardTitle>
                <CardDescription>Join your team on Kip Inventory.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {acceptedOrganization ? (
                    <p className="text-sm text-muted-foreground">
                        You have joined <span className="font-medium text-foreground">{acceptedOrganization}</span>. Taking you to the dashboard...
                    </p>
                ) : (
                    <>
                        {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
                        <Button className="w-full" onClick={handleAccept} loading={isAccepting}>
                            Accept Invitation
                        </Button>
                    </>
                )}
            </CardContent>
        </Card>
    )
}
