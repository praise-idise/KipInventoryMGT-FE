import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { cn } from '@/lib/cn'
import { getStatusBadgeClassName } from '@/lib/status-badge'
import { fetchWarehouseById, fetchWarehouseInventory } from '@/services/warehouses.service'

type TabId = 'overview' | 'inventory'

const TABS: { id: TabId; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'inventory', label: 'Inventory Items' },
]

export function WarehouseDetailPage() {
    const { warehouseId } = useParams({ strict: false }) as { warehouseId: string }
    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState<TabId>('overview')
    const [inventoryPage, setInventoryPage] = useState(1)
    const detailQuery = useQuery({
        queryKey: ['warehouse-detail', warehouseId],
        queryFn: () => fetchWarehouseById(warehouseId),
        staleTime: 0,
    })
    const inventoryQuery = useQuery({
        queryKey: ['warehouse-inventory', warehouseId, inventoryPage],
        queryFn: () => fetchWarehouseInventory(warehouseId, { pageNumber: inventoryPage, pageSize: 10 }),
        staleTime: 0,
    })

    const warehouse = detailQuery.data
    const inventoryItems = inventoryQuery.data?.data ?? []
    const inventoryTotalPages = inventoryQuery.data?.pagination?.totalPages ?? 1

    return (
        <main className="space-y-6">
            <div className="flex items-center justify-between gap-3">
                <Button variant="outline" onClick={() => navigate({ to: '/app/warehouses' })}>
                    <ArrowLeft className="size-4" />
                    <span className="hidden sm:inline ml-2">Back to Warehouses</span>
                </Button>
                {warehouse && (
                    <Badge variant="outline" className={getStatusBadgeClassName(warehouse.isActive ? 'Active' : 'Inactive')}>
                        {warehouse.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                )}
            </div>

            {detailQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading warehouse detail...</p>
            ) : detailQuery.isError || !warehouse ? (
                <p className="text-sm text-destructive">Unable to load warehouse detail.</p>
            ) : (
                <>
                    <h1 className="text-2xl font-bold tracking-tight">{warehouse.name}</h1>

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
                                <CardTitle>Warehouse Details</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-4 md:grid-cols-2 text-sm">
                                    <p><span className="text-muted-foreground">Code:</span> {warehouse.code}</p>
                                    <p><span className="text-muted-foreground">State:</span> {warehouse.state}</p>
                                    <p><span className="text-muted-foreground">Location:</span> {warehouse.location || '—'}</p>
                                    <p><span className="text-muted-foreground">Capacity:</span> {warehouse.capacityUnits.toLocaleString()}</p>
                                    <p><span className="text-muted-foreground">Created:</span> {new Date(warehouse.createdAt).toLocaleString()}</p>
                                    <p><span className="text-muted-foreground">Updated:</span> {new Date(warehouse.updatedAt).toLocaleString()}</p>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {activeTab === 'inventory' && (
                        <Card className="bg-surface/95">
                            <CardHeader>
                                <CardTitle>Inventory Items</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {inventoryQuery.isLoading ? (
                                    <p className="text-sm text-muted-foreground">Loading inventory items...</p>
                                ) : inventoryQuery.isError ? (
                                    <p className="text-sm text-destructive">Unable to load inventory items.</p>
                                ) : inventoryItems.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">No inventory items currently attached to this warehouse.</p>
                                ) : (
                                    <div className="overflow-x-auto rounded-lg border border-border">
                                        <table className="w-max min-w-full divide-y divide-border text-sm">
                                            <thead className="bg-muted/40 text-left text-muted-foreground">
                                                <tr>
                                                    <th className="px-4 py-3 font-medium">Product</th>
                                                    <th className="px-4 py-3 font-medium">SKU</th>
                                                    <th className="px-4 py-3 font-medium">Available</th>
                                                    <th className="px-4 py-3 font-medium">On Hand</th>
                                                    <th className="px-4 py-3 font-medium">Reserved</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border">
                                                {inventoryItems.map((item) => (
                                                    <tr key={item.productId}>
                                                        <td className="px-4 py-3">{item.productName}</td>
                                                        <td className="px-4 py-3">{item.sku}</td>
                                                        <td className="px-4 py-3">{item.availableQuantity.toLocaleString()}</td>
                                                        <td className="px-4 py-3">{item.quantityOnHand.toLocaleString()}</td>
                                                        <td className="px-4 py-3">{item.reservedQuantity.toLocaleString()}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                                {inventoryTotalPages > 1 && (
                                    <div className="flex items-center justify-between pt-4">
                                        <Button
                                            variant="outline"
                                            disabled={inventoryPage <= 1}
                                            onClick={() => setInventoryPage((page) => page - 1)}
                                        >
                                            Previous
                                        </Button>
                                        <span className="text-sm text-muted-foreground">
                                            Page {inventoryPage} of {inventoryTotalPages}
                                        </span>
                                        <Button
                                            variant="outline"
                                            disabled={inventoryPage >= inventoryTotalPages}
                                            onClick={() => setInventoryPage((page) => page + 1)}
                                        >
                                            Next
                                        </Button>
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
