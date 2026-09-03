import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { AlertTriangle, BarChart3, Download, Package, Truck, Warehouse } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, toast } from '@/components/ui'
import { APP_ROLES } from '@/auth/roles'
import { useAuth } from '@/hooks/use-auth'
import { fetchCustomers } from '@/services/customers.service'
import { fetchProducts } from '@/services/products.service'
import { fetchSuppliers } from '@/services/suppliers.service'
import { fetchWarehouses } from '@/services/warehouses.service'
import { downloadReport, fetchLowStockReport, fetchMovementReport, fetchSupplierPerformance, fetchWarehouseValuation } from '@/services/reports.service'

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

const naira = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 })
const number = new Intl.NumberFormat('en-NG')

async function saveDashboardReport(report: 'valuation' | 'low-stock', format: 'csv' | 'pdf') {
    try {
        const blob = await downloadReport(report, format)
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${report}.${format}`
        link.click()
        URL.revokeObjectURL(url)
    } catch {
        toast.error('Unable to export this report.')
    }
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
        staleTime: 0,
    })

    const metrics = useMemo(() => buildMetrics(dashboardQuery.data ?? { products: 0, warehouses: 0, suppliers: 0, customers: 0 }), [dashboardQuery.data])
    const maxValue = Math.max(1, ...metrics.map((metric) => metric.value))
    const valuationQuery = useQuery({ queryKey: ['dashboard', 'valuation'], queryFn: () => fetchWarehouseValuation() })
    const lowStockQuery = useQuery({ queryKey: ['dashboard', 'low-stock'], queryFn: () => fetchLowStockReport() })
    const movementQuery = useQuery({ queryKey: ['dashboard', 'movements'], queryFn: () => fetchMovementReport({ pageNumber: 1, pageSize: 8 }) })
    const supplierQuery = useQuery({ queryKey: ['dashboard', 'suppliers'], queryFn: () => fetchSupplierPerformance({}) })
    const valuation = valuationQuery.data ?? []
    const lowStock = lowStockQuery.data ?? []
    const movements = movementQuery.data?.data ?? []
    const suppliers = supplierQuery.data ?? []

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

            <section className="grid gap-4 md:grid-cols-3">
                <Card className="bg-surface/95">
                    <CardHeader><CardDescription>Total stock value</CardDescription><CardTitle>{naira.format(valuation.reduce((sum, item) => sum + item.inventoryValue, 0))}</CardTitle></CardHeader>
                    <CardContent className="flex items-center justify-between gap-3 text-sm text-muted-foreground"><span>{number.format(valuation.reduce((sum, item) => sum + item.quantityOnHand, 0))} units on hand</span><div className="flex gap-1"><Button variant="ghost" size="icon" title="Export stock valuation as CSV" onClick={() => void saveDashboardReport('valuation', 'csv')}><Download className="size-4" /></Button><Button variant="ghost" size="icon" title="Export stock valuation as PDF" onClick={() => void saveDashboardReport('valuation', 'pdf')}><Download className="size-4" /></Button></div></CardContent>
                </Card>
                <Card className="bg-surface/95"><CardHeader><CardDescription>Low-stock lines</CardDescription><CardTitle>{number.format(lowStock.length)}</CardTitle></CardHeader><CardContent className="flex items-center justify-between gap-3 text-sm text-muted-foreground"><span>At or below reorder threshold</span><div className="flex gap-1"><Button variant="ghost" size="icon" title="Export low-stock register as CSV" onClick={() => void saveDashboardReport('low-stock', 'csv')}><Download className="size-4" /></Button><Button variant="ghost" size="icon" title="Export low-stock register as PDF" onClick={() => void saveDashboardReport('low-stock', 'pdf')}><Download className="size-4" /></Button></div></CardContent></Card>
                <Card className="bg-surface/95"><CardHeader><CardDescription>Supplier fulfilment</CardDescription><CardTitle>{suppliers.length ? `${Math.round(suppliers.reduce((sum, item) => sum + item.fulfilmentRate, 0) / suppliers.length)}%` : '—'}</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">Average received versus ordered quantity</CardContent></Card>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
                <Card className="bg-surface/95"><CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="size-5 text-primary" /> Stock movement activity</CardTitle><CardDescription>Recent movement value by operation.</CardDescription></CardHeader><CardContent className="h-64">{movementQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading movement activity...</p> : movements.length === 0 ? <p className="text-sm text-muted-foreground">No stock movements found.</p> : <ResponsiveContainer width="100%" height="100%"><BarChart data={movements.slice().reverse()}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="movementType" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} /><YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} /><Tooltip formatter={(value) => naira.format(Number(value))} /><Bar dataKey="totalCost" fill="var(--color-primary)" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>}</CardContent></Card>
                <Card className="bg-surface/95"><CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="size-5 text-warning" /> Stock needing attention</CardTitle><CardDescription>Low-stock products across your warehouses.</CardDescription></CardHeader><CardContent>{lowStockQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading low-stock items...</p> : lowStock.length === 0 ? <p className="text-sm text-muted-foreground">No low-stock items found.</p> : <div className="space-y-3">{lowStock.slice(0, 8).map((item) => <div key={`${item.warehouseId}-${item.productId}`} className="flex items-center justify-between border-b border-border/60 pb-3 last:border-0"><div className="min-w-0"><p className="truncate font-medium">{item.productName}</p><p className="text-xs text-muted-foreground">{item.sku} · {item.warehouseName}</p></div><div className="ml-4 flex shrink-0 items-center gap-2 text-sm"><Package className="size-4 text-muted-foreground" /><span>{number.format(item.availableQuantity)} / {number.format(item.reorderThreshold)}</span></div></div>)}</div>}</CardContent></Card>
            </section>

            <section className="grid gap-4 md:grid-cols-2">
                <Card className="bg-surface/95"><CardHeader><CardTitle className="flex items-center gap-2"><Warehouse className="size-5 text-primary" /> Warehouse valuation</CardTitle><CardDescription>Current weighted-average stock value by location.</CardDescription></CardHeader><CardContent><div className="space-y-3">{valuation.map((item) => <div key={item.warehouseId} className="flex items-center justify-between border-b border-border/60 pb-3 last:border-0"><div><p className="font-medium">{item.warehouseName}</p><p className="text-xs text-muted-foreground">{number.format(item.quantityOnHand)} units · {number.format(item.productCount)} products</p></div><p className="font-semibold">{naira.format(item.inventoryValue)}</p></div>)}</div></CardContent></Card>
                <Card className="bg-surface/95"><CardHeader><CardTitle className="flex items-center gap-2"><Truck className="size-5 text-primary" /> Supplier performance</CardTitle><CardDescription>Supplier fulfilment and observed receipt lead time.</CardDescription></CardHeader><CardContent><div className="space-y-3">{suppliers.slice(0, 8).map((supplier) => <div key={supplier.supplierId} className="flex items-center justify-between border-b border-border/60 pb-3 last:border-0"><div><p className="font-medium">{supplier.supplierName}</p><p className="text-xs text-muted-foreground">{supplier.purchaseOrderCount} purchase orders · {supplier.averageReceiptLeadTimeDays == null ? 'No receipt lead time' : `${supplier.averageReceiptLeadTimeDays} days average`}</p></div><p className="font-semibold">{supplier.fulfilmentRate}%</p></div>)}</div></CardContent></Card>
            </section>
        </main>
    )
}
