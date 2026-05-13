import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui'
import { getStatusBadgeClassName } from '@/lib/status-badge'
import { fetchWarehouseById } from '@/services/warehouses.service'

export function WarehouseDetailPage() {
    const { warehouseId } = useParams({ strict: false }) as { warehouseId: string }
    const navigate = useNavigate()
    const detailQuery = useQuery({
        queryKey: ['warehouse-detail', warehouseId],
        queryFn: () => fetchWarehouseById(warehouseId),
    })

    const warehouse = detailQuery.data

    return (
        <main className="space-y-6">
            <div className="flex items-center justify-end md:justify-between">
                <Button variant="outline" onClick={() => navigate({ to: '/app/warehouses' })} className="hidden md:inline-flex">
                    <ArrowLeft className="size-4" />
                    Back to Warehouses
                </Button>
                {warehouse && (
                    <Badge variant="outline" className={getStatusBadgeClassName(warehouse.isActive ? 'Active' : 'Inactive')}>
                        {warehouse.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                )}
            </div>

            <Card className="bg-surface/95">
                <CardHeader>
                    <CardTitle>{warehouse?.name ?? 'Warehouse Detail'}</CardTitle>
                    <CardDescription>View full warehouse information and inventory snapshot.</CardDescription>
                </CardHeader>
                <CardContent>
                    {detailQuery.isLoading ? (
                        <p className="text-sm text-muted-foreground">Loading warehouse detail...</p>
                    ) : detailQuery.isError || !warehouse ? (
                        <p className="text-sm text-destructive">Unable to load warehouse detail.</p>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2">
                            <p><span className="text-muted-foreground">Code:</span> {warehouse.code}</p>
                            <p><span className="text-muted-foreground">State:</span> {warehouse.state}</p>
                            <p><span className="text-muted-foreground">Location:</span> {warehouse.location || '—'}</p>
                            <p><span className="text-muted-foreground">Capacity:</span> {warehouse.capacityUnits.toLocaleString()}</p>
                            <p><span className="text-muted-foreground">Created:</span> {new Date(warehouse.createdAt).toLocaleString()}</p>
                            <p><span className="text-muted-foreground">Updated:</span> {new Date(warehouse.updatedAt).toLocaleString()}</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {warehouse && (
                <Card className="bg-surface/95">
                    <CardHeader>
                        <CardTitle>Inventory Items</CardTitle>
                        <CardDescription>Products currently stocked in this warehouse.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {!warehouse.inventoryItems || warehouse.inventoryItems.length === 0 ? (
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
                                        {warehouse.inventoryItems.map((item) => (
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
                    </CardContent>
                </Card>
            )}
        </main>
    )
}