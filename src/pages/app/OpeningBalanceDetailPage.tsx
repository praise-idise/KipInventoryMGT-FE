import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { cn } from '@/lib/cn'
import { OPENING_BALANCE_STATUS } from '@/lib/domain-values'
import { fetchProducts } from '@/services/products.service'
import { fetchOpeningBalanceById } from '@/services/opening-balances.service'
import { fetchWarehouses } from '@/services/warehouses.service'

type TabId = 'overview' | 'lines'

const TABS: { id: TabId; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'lines', label: 'Lines' },
]

export function OpeningBalanceDetailPage() {
    const { openingBalanceId } = useParams({ strict: false }) as { openingBalanceId: string }
    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState<TabId>('overview')

    const detailQuery = useQuery({
        queryKey: ['opening-balance-detail', openingBalanceId],
        queryFn: () => fetchOpeningBalanceById(openingBalanceId),
        staleTime: 0,
    })

    const warehousesQuery = useQuery({
        queryKey: ['warehouses', 'options'],
        queryFn: () => fetchWarehouses({ pageNumber: 1, pageSize: 200, searchTerm: '' }),
    })

    const productsQuery = useQuery({
        queryKey: ['products', 'options'],
        queryFn: () => fetchProducts({ pageNumber: 1, pageSize: 500, searchTerm: '' }),
    })

    const openingBalance = detailQuery.data

    const warehouseNames = useMemo(() => {
        return Object.fromEntries((warehousesQuery.data?.data ?? []).map((warehouse) => [warehouse.warehouseId, warehouse.name]))
    }, [warehousesQuery.data])

    const productNames = useMemo(() => {
        return Object.fromEntries((productsQuery.data?.data ?? []).map((product) => [product.productId, `${product.name} (${product.sku})`]))
    }, [productsQuery.data])

    return (
        <main className="space-y-6">
            <div className="flex items-center justify-between gap-3">
                <Button variant="outline" onClick={() => navigate({ to: '/app/opening-balances' })}>
                    <ArrowLeft className="size-4" />
                    <span className="hidden sm:inline ml-2">Back to Opening Balances</span>
                </Button>
                <Badge variant="success">{OPENING_BALANCE_STATUS.APPLIED}</Badge>
            </div>

            {detailQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading opening balance detail...</p>
            ) : detailQuery.isError || !openingBalance ? (
                <p className="text-sm text-destructive">Unable to load opening balance detail.</p>
            ) : (
                <>
                    <h1 className="text-2xl font-bold tracking-tight">{openingBalance.openingBalanceNumber}</h1>

                    <div className="border-b border-border">
                        <nav className="flex gap-4" role="tablist">
                            {TABS.map((tab) => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    role="tab"
                                    aria-selected={activeTab === tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        'relative pb-2.5 text-sm font-medium transition-colors',
                                        activeTab === tab.id
                                            ? 'text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:rounded-full after:bg-primary'
                                            : 'text-muted-foreground hover:text-foreground',
                                    )}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </nav>
                    </div>

                    {activeTab === 'overview' && (
                        <Card className="bg-surface/95">
                            <CardHeader>
                                <CardTitle>Balance Details</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-4 md:grid-cols-2 text-sm">
                                    <p><span className="text-muted-foreground">Warehouse:</span> {warehouseNames[openingBalance.warehouseId] ?? openingBalance.warehouseId}</p>
                                    <p><span className="text-muted-foreground">Applied:</span> {new Date(openingBalance.appliedAt).toLocaleString()}</p>
                                    <p><span className="text-muted-foreground">Opening Balance ID:</span> {openingBalance.openingBalanceId}</p>
                                    <p><span className="text-muted-foreground">Status:</span> {OPENING_BALANCE_STATUS.APPLIED}</p>
                                    <p className="md:col-span-2"><span className="text-muted-foreground">Notes:</span> {openingBalance.notes || '—'}</p>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {activeTab === 'lines' && (
                        <Card className="bg-surface/95">
                            <CardHeader>
                                <CardTitle>Opening Balance Lines</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {!openingBalance.lines?.length ? (
                                    <p className="text-sm text-muted-foreground">No lines are attached to this opening balance.</p>
                                ) : (
                                    <div className="overflow-x-auto rounded-lg border border-border">
                                        <table className="w-max min-w-full divide-y divide-border text-sm">
                                            <thead className="bg-muted/40 text-left text-muted-foreground">
                                                <tr>
                                                    <th className="px-4 py-3 font-medium">Product</th>
                                                    <th className="px-4 py-3 font-medium">Quantity</th>
                                                    <th className="px-4 py-3 font-medium">Unit Cost</th>
                                                    <th className="px-4 py-3 font-medium">Total Cost</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border">
                                                {openingBalance.lines.map((line) => (
                                                    <tr key={line.openingBalanceLineId}>
                                                        <td className="px-4 py-3">{productNames[line.productId] ?? line.productId}</td>
                                                        <td className="px-4 py-3">{line.quantity}</td>
                                                        <td className="px-4 py-3">{line.unitCost}</td>
                                                        <td className="px-4 py-3">{line.totalCost}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </>
            )}
        </main>
    )
}
