import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui'
import { APP_ROLES } from '@/auth/roles'
import { useAuth } from '@/hooks/use-auth'
import { fetchCustomers } from '@/services/customers.service'
import { fetchProducts } from '@/services/products.service'
import { fetchSuppliers } from '@/services/suppliers.service'
import { fetchWarehouses } from '@/services/warehouses.service'

type DashboardMetric = {
    label: string
    value: number
    description: string
    tone: 'primary' | 'success' | 'warning' | 'muted'
}

type DashboardStats = {
    products: number
    warehouses: number
    suppliers: number
    customers: number
}

const toneClasses: Record<DashboardMetric['tone'], string> = {
    primary: 'border-primary/20 bg-primary/10 text-primary',
    success: 'border-success/20 bg-success/10 text-success',
    warning: 'border-warning/20 bg-warning/10 text-warning-foreground',
    muted: 'border-border bg-muted/50 text-foreground',
}

function roleLabel(roles: string[]) {
    if (roles.includes(APP_ROLES.ADMIN)) return 'Admin overview'
    if (roles.includes(APP_ROLES.APPROVER)) return 'Approvals'
    if (roles.includes(APP_ROLES.PROCUREMENT_OFFICER)) return 'Purchasing'
    if (roles.includes(APP_ROLES.WAREHOUSE_OFFICER)) return 'Warehouse overview'
    return 'Your workspace'
}

function buildMetrics(stats: DashboardStats): DashboardMetric[] {
    return [
        {
            label: 'Products',
            value: stats.products,
            description: 'Items you can buy, store, move, and sell.',
            tone: 'primary',
        },
        {
            label: 'Warehouses',
            value: stats.warehouses,
            description: 'Locations where stock is stored.',
            tone: 'success',
        },
        {
            label: 'Suppliers',
            value: stats.suppliers,
            description: 'Businesses you buy from.',
            tone: 'warning',
        },
        {
            label: 'Customers',
            value: stats.customers,
            description: 'People or businesses you sell to.',
            tone: 'muted',
        },
    ]
}

export function DashboardPage() {
    const { user } = useAuth()
    const roles = user?.roles ?? []
    const isAdmin = roles.includes(APP_ROLES.ADMIN)
    const dashboardQuery = useQuery({
        queryKey: ['dashboard-summary'],
        queryFn: async () => {
            const [products, warehouses, suppliers, customers] = await Promise.all([
                fetchProducts({ pageNumber: 1, pageSize: 1, searchTerm: '' }),
                fetchWarehouses({ pageNumber: 1, pageSize: 1, searchTerm: '' }),
                fetchSuppliers({ pageNumber: 1, pageSize: 1, searchTerm: '' }),
                fetchCustomers({ pageNumber: 1, pageSize: 1, searchTerm: '' }),
            ])

            return {
                products: products.pagination.totalRecords,
                warehouses: warehouses.pagination.totalRecords,
                suppliers: suppliers.pagination.totalRecords,
                customers: customers.pagination.totalRecords,
            } satisfies DashboardStats
        },
    })

    const metrics = useMemo(() => buildMetrics(dashboardQuery.data ?? { products: 0, warehouses: 0, suppliers: 0, customers: 0 }), [dashboardQuery.data])
    const maxValue = Math.max(1, ...metrics.map((metric) => metric.value))

    const focusCards = isAdmin
        ? [
            {
                title: 'User access',
                description: 'Manage user accounts, roles, and active sessions.',
                to: '/app/users',
                action: 'Open users',
            },
            {
                title: 'Product setup',
                description: 'Review product records when items, suppliers, or warehouse links need attention.',
                to: '/app/products',
                action: 'Review products',
            },
        ]
        : roles.includes(APP_ROLES.PROCUREMENT_OFFICER)
            ? [
                {
                    title: 'Purchase orders',
                    description: 'Create orders, follow approvals, and track goods receipts.',
                    to: '/app/purchase-orders',
                    action: 'Open purchase orders',
                },
                {
                    title: 'Suppliers',
                    description: 'Keep supplier details up to date for smooth ordering and receiving.',
                    to: '/app/suppliers',
                    action: 'Review suppliers',
                },
            ]
            : roles.includes(APP_ROLES.APPROVER)
                ? [
                    {
                        title: 'Pending approvals',
                        description: 'Review requests waiting for your decision.',
                        to: '/app/approvals',
                        action: 'Open approvals',
                    },
                    {
                        title: 'Document details',
                        description: 'Open the full document when you need more context before approving.',
                        to: '/app/purchase-orders',
                        action: 'Open purchase orders',
                    },
                ]
                : [
                    {
                        title: 'Transfers',
                        description: 'Create transfers and complete items already on the way.',
                        to: '/app/transfers',
                        action: 'Open transfers',
                    },
                    {
                        title: 'Warehouse stock',
                        description: 'Check stock levels and reserved quantities by warehouse.',
                        to: '/app/warehouses',
                        action: 'Review warehouses',
                    },
                ]

    return (
        <main className="space-y-6">
            <section className="rounded-3xl border border-border/60 bg-linear-to-br from-background via-background to-primary/5 p-6 shadow-sm">
                <Badge variant="outline" className="mb-3 border-primary/20 bg-primary/10 text-primary">
                    {roleLabel(roles)}
                </Badge>
                <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
                <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                    A quick snapshot of the records and work areas available to you. The content below changes based on your role.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                    {roles.length > 0 ? roles.map((role) => <Badge key={role} variant="muted">{role}</Badge>) : <Badge variant="muted">No explicit role found</Badge>}
                </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {dashboardQuery.isLoading
                    ? Array.from({ length: 4 }).map((_, index) => (
                        <Card key={index} className="bg-surface/95">
                            <CardHeader>
                                <CardDescription>Loading</CardDescription>
                                <CardTitle className="text-2xl">—</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="h-2 rounded-full bg-muted" />
                            </CardContent>
                        </Card>
                    ))
                    : metrics.map((metric) => (
                        <Card key={metric.label} className="bg-surface/95">
                            <CardHeader>
                                <CardDescription>{metric.label}</CardDescription>
                                <CardTitle className="text-3xl">{metric.value.toLocaleString()}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">{metric.description}</p>
                                <div className="mt-4 h-2 rounded-full bg-muted">
                                    <div
                                        className={`h-full rounded-full ${toneClasses[metric.tone]}`}
                                        style={{ width: `${Math.max(8, Math.round((metric.value / maxValue) * 100))}%` }}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
            </section>

            <section className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
                <Card className="bg-surface/95">
                    <CardHeader>
                        <CardTitle>Main records in the system</CardTitle>
                        <CardDescription>This chart compares how many products, warehouses, suppliers, and customers are currently set up.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex h-56 items-end gap-4 rounded-2xl border border-border/60 bg-linear-to-b from-muted/10 to-muted/30 p-4">
                            {metrics.map((metric) => {
                                const height = Math.max(24, Math.round((metric.value / maxValue) * 100) + 20)
                                return (
                                    <div key={metric.label} className="flex h-full flex-1 flex-col justify-end gap-2">
                                        <div className="flex items-end justify-center">
                                            <div
                                                className={`w-full max-w-24 rounded-t-2xl ${toneClasses[metric.tone]} border`}
                                                style={{ height: `${height}%` }}
                                                title={`${metric.label}: ${metric.value}`}
                                            />
                                        </div>
                                        <div className="text-center text-xs text-muted-foreground">{metric.label}</div>
                                    </div>
                                )
                            })}
                        </div>
                        {dashboardQuery.error && (
                            <p className="text-sm text-destructive">Unable to load dashboard metrics right now.</p>
                        )}
                    </CardContent>
                </Card>

                <Card className="bg-surface/95">
                    <CardHeader>
                        <CardTitle>Next actions</CardTitle>
                        <CardDescription>Quick links to the areas you are most likely to use.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {focusCards.map((card) => (
                            <div key={card.title} className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                                <h3 className="font-medium">{card.title}</h3>
                                <p className="mt-2 text-sm text-muted-foreground">{card.description}</p>
                                <Link
                                    to={card.to}
                                    className="mt-4 inline-flex h-10 items-center justify-center rounded-md border border-border bg-transparent px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                                >
                                    {card.action}
                                </Link>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </section>
        </main>
    )
}
