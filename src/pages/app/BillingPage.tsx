import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getApiErrorMessage } from '@/api/types'
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, toast, useConfirm } from '@/components/ui'
import { getStatusBadgeClassName } from '@/lib/status-badge'
import { useAuth } from '@/hooks/use-auth'
import { APP_ROLES } from '@/auth/roles'
import {
    cancelSubscription,
    fetchBillingCurrent,
    fetchPlans,
    subscribeToPlan,
    type BillingCurrent,
    type PlanItem,
} from '@/services/billing.service'

function formatNaira(amount: number) {
    return `₦${amount.toLocaleString()}`
}

function formatDate(value?: string | null) {
    if (!value) return '—'
    return new Date(value).toLocaleDateString()
}

function stateLabel(state: BillingCurrent['state']) {
    switch (state) {
        case 'Trialing': return 'Free trial'
        case 'Active': return 'Active'
        case 'PastDue': return 'Past due'
        case 'ReadOnly': return 'Trial ended — read only'
        case 'Locked': return 'Locked'
    }
}

function featureLines(plan: PlanItem): { label: string; included: boolean }[] {
    return [
        { label: 'Approval workflows', included: plan.hasApprovalWorkflows },
        { label: 'Reports & exports', included: plan.hasReports },
        { label: 'WhatsApp alerts', included: plan.hasWhatsAppAlerts },
        { label: 'Barcode scanning', included: plan.hasBarcodeScanning },
        { label: 'Stock Integrity Report', included: plan.hasStockIntegrityReport },
        { label: 'NRS e-invoicing', included: plan.hasEinvoicing },
        { label: 'Waybill OCR (AI)', included: plan.hasWaybillOcr },
        { label: 'AI weekly briefing', included: plan.hasAiBriefing },
        { label: 'Accounting export', included: plan.hasAccountingExport },
        { label: 'API access', included: plan.hasApi },
    ]
}

export function BillingPage() {
    const { user } = useAuth()
    const isAdmin = user?.roles?.includes(APP_ROLES.ADMIN) ?? false
    const queryClient = useQueryClient()
    const { confirm, dialog: confirmDialog } = useConfirm()

    const currentQuery = useQuery({
        queryKey: ['billing', 'current'],
        queryFn: fetchBillingCurrent,
        staleTime: 30_000,
    })

    const plansQuery = useQuery({
        queryKey: ['billing', 'plans'],
        queryFn: fetchPlans,
        staleTime: 5 * 60_000,
    })

    const subscribeMutation = useMutation({
        mutationFn: subscribeToPlan,
        onSuccess: async (response) => {
            const authorizationUrl = response.data?.authorizationUrl
            if (authorizationUrl) {
                window.location.href = authorizationUrl
                return
            }
            toast.error('Unable to start the checkout. Please try again.')
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, 'Unable to start the checkout.'))
        },
    })

    const cancelMutation = useMutation({
        mutationFn: cancelSubscription,
        onSuccess: async (response) => {
            await queryClient.invalidateQueries({ queryKey: ['billing'] })
            toast.success(response.message || 'Subscription canceled.')
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, 'Unable to cancel the subscription.'))
        },
    })

    async function handleCancel() {
        const confirmed = await confirm({
            title: 'Cancel subscription',
            description: 'Cancel your subscription? Your workspace will be locked once the current period ends.',
            confirmLabel: 'Cancel subscription',
            variant: 'danger',
        })
        if (!confirmed) return
        await cancelMutation.mutateAsync()
    }

    const current = currentQuery.data
    const plans = plansQuery.data ?? []

    return (
        <main className="space-y-6">
            <h1 className="text-2xl font-bold tracking-tight">Billing</h1>

            {confirmDialog}

            <Card className="bg-surface/95">
                <CardHeader>
                    <CardTitle>Current plan</CardTitle>
                    <CardDescription>Your workspace's subscription and usage.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {currentQuery.isLoading ? (
                        <p className="text-sm text-muted-foreground">Loading billing details...</p>
                    ) : currentQuery.isError || !current ? (
                        <p className="text-sm text-destructive">Unable to load billing details.</p>
                    ) : (
                        <>
                            <div className="flex flex-wrap items-center gap-3">
                                <p className="text-lg font-semibold">{current.plan?.name ?? 'No plan'}</p>
                                <Badge variant="outline" className={getStatusBadgeClassName(current.state)}>
                                    {stateLabel(current.state)}
                                </Badge>
                            </div>

                            {current.state === 'Trialing' && (
                                <p className="text-sm text-muted-foreground">
                                    Trial ends {formatDate(current.trialEndsAt)}. After that you get 30 days of read-only access before the workspace locks.
                                </p>
                            )}
                            {current.state === 'ReadOnly' && (
                                <p className="text-sm text-amber-600 dark:text-amber-400">
                                    Your trial has ended — you can still view your data until {formatDate(current.readOnlyUntil)}, then the workspace locks.
                                </p>
                            )}
                            {isAdmin && current.state === 'Active' && (
                                <p className="text-sm text-muted-foreground">
                                    Renews on {formatDate(current.currentPeriodEnd)}.
                                </p>
                            )}
                            {current.state === 'Locked' && (
                                <p className="text-sm text-destructive">Your workspace is locked. Subscribe to regain access.</p>
                            )}

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                                    <p className="text-sm text-muted-foreground">Warehouses</p>
                                    <p className="text-2xl font-semibold">
                                        {current.usage.warehouses}
                                        <span className="text-base font-normal text-muted-foreground">
                                            {' '}/ {current.plan?.maxWarehouses ?? '∞'}
                                        </span>
                                    </p>
                                </div>
                                <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                                    <p className="text-sm text-muted-foreground">Users</p>
                                    <p className="text-2xl font-semibold">
                                        {current.usage.users}
                                        <span className="text-base font-normal text-muted-foreground">
                                            {' '}/ {current.plan?.maxUsers ?? '∞'}
                                        </span>
                                    </p>
                                </div>
                            </div>

                            {current.state === 'Active' && (
                                <Button variant="outline" onClick={handleCancel} loading={cancelMutation.isPending}>
                                    Cancel subscription
                                </Button>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>

            <section className="grid gap-4 lg:grid-cols-3">
                {plans.map((plan) => {
                    const isCurrent = current?.plan?.planId === plan.planId
                    return (
                        <Card key={plan.planId} className="bg-surface/95">
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    {plan.name}
                                    {isCurrent && <Badge variant="muted">Current</Badge>}
                                </CardTitle>
                                <CardDescription>{formatNaira(plan.monthlyPriceNaira)}/month</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p className="text-sm text-muted-foreground">
                                    {plan.maxWarehouses ?? 'Unlimited'} warehouses · {plan.maxUsers ?? 'Unlimited'} users
                                </p>
                                <ul className="space-y-2 text-sm">
                                    {featureLines(plan).map((feature) => (
                                        <li key={feature.label} className="flex items-center gap-2">
                                            <span className={feature.included ? 'text-success' : 'text-muted-foreground/40'}>
                                                {feature.included ? '✓' : '—'}
                                            </span>
                                            <span className={feature.included ? '' : 'text-muted-foreground/60'}>{feature.label}</span>
                                        </li>
                                    ))}
                                </ul>
                                {isAdmin && !isCurrent && (
                                    <Button
                                        className="w-full"
                                        onClick={() => subscribeMutation.mutate(plan.tier)}
                                        loading={subscribeMutation.isPending}
                                    >
                                        Choose {plan.name}
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    )
                })}
            </section>
        </main>
    )
}
