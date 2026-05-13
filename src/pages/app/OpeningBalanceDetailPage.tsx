import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui'
import { OPENING_BALANCE_STATUS } from '@/lib/domain-values'
import { fetchProducts } from '@/services/products.service'
import { fetchOpeningBalanceById } from '@/services/opening-balances.service'
import { fetchWarehouses } from '@/services/warehouses.service'

export function OpeningBalanceDetailPage() {
    const { openingBalanceId } = useParams({ strict: false }) as { openingBalanceId: string }
    const navigate = useNavigate()

    const detailQuery = useQuery({
        queryKey: ['opening-balance-detail', openingBalanceId],
        queryFn: () => fetchOpeningBalanceById(openingBalanceId),
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
            <div className="flex items-center justify-end gap-3 md:justify-between">
                <Button variant="outline" onClick={() => navigate({ to: '/app/opening-balances' })} className="hidden md:inline-flex">
                    <ArrowLeft className="size-4" />
                    Back to Opening Balances
                </Button>
                <Badge variant="success" className="w-fit">{OPENING_BALANCE_STATUS.APPLIED}</Badge>
            </div>

            <Card className="bg-surface/95">
                <CardHeader>
                    <CardTitle>{openingBalance?.openingBalanceNumber ?? 'Opening Balance Detail'}</CardTitle>
                    <CardDescription>View applied opening balance details and line-level costs.</CardDescription>
                </CardHeader>
                <CardContent>
                    {detailQuery.isLoading ? (
                        <p className="text-sm text-muted-foreground">Loading opening balance detail...</p>
                    ) : detailQuery.isError || !openingBalance ? (
                        <p className="text-sm text-destructive">Unable to load opening balance detail.</p>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2">
                            <p><span className="text-muted-foreground">Warehouse:</span> {warehouseNames[openingBalance.warehouseId] ?? openingBalance.warehouseId}</p>
                            <p><span className="text-muted-foreground">Applied:</span> {new Date(openingBalance.appliedAt).toLocaleString()}</p>
                            <p><span className="text-muted-foreground">Opening Balance ID:</span> {openingBalance.openingBalanceId}</p>
                            <p><span className="text-muted-foreground">Status:</span> {OPENING_BALANCE_STATUS.APPLIED}</p>
                            <p className="md:col-span-2"><span className="text-muted-foreground">Notes:</span> {openingBalance.notes || '—'}</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {openingBalance && (
                <Card className="bg-surface/95">
                    <CardHeader>
                        <CardTitle>Opening Balance Lines</CardTitle>
                        <CardDescription>Line items and their opening inventory value.</CardDescription>
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
        </main>
    )
}
