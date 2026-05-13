import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui'
import { getStatusBadgeClassName } from '@/lib/status-badge'
import { fetchSupplierById } from '@/services/suppliers.service'

export function SupplierDetailPage() {
    const { supplierId } = useParams({ strict: false }) as { supplierId: string }
    const navigate = useNavigate()
    const detailQuery = useQuery({
        queryKey: ['supplier-detail', supplierId],
        queryFn: () => fetchSupplierById(supplierId),
    })

    const supplier = detailQuery.data

    return (
        <main className="space-y-6">
            <div className="flex items-center justify-end md:justify-between">
                <Button variant="outline" onClick={() => navigate({ to: '/app/suppliers' })} className="hidden md:inline-flex">
                    <ArrowLeft className="size-4" />
                    Back to Suppliers
                </Button>
                {supplier && (
                    <Badge variant="outline" className={getStatusBadgeClassName(supplier.isActive ? 'Active' : 'Inactive')}>
                        {supplier.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                )}
            </div>

            <Card className="bg-surface/95">
                <CardHeader>
                    <CardTitle>{supplier?.name ?? 'Supplier Detail'}</CardTitle>
                    <CardDescription>View full supplier profile details.</CardDescription>
                </CardHeader>
                <CardContent>
                    {detailQuery.isLoading ? (
                        <p className="text-sm text-muted-foreground">Loading supplier detail...</p>
                    ) : detailQuery.isError || !supplier ? (
                        <p className="text-sm text-destructive">Unable to load supplier detail.</p>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2">
                            <p><span className="text-muted-foreground">Name:</span> {supplier.name}</p>
                            <p><span className="text-muted-foreground">Lead Time:</span> {supplier.leadTimeDays} days</p>
                            <p><span className="text-muted-foreground">Email:</span> {supplier.email || '—'}</p>
                            <p><span className="text-muted-foreground">Phone:</span> {supplier.phone || '—'}</p>
                            <p className="md:col-span-2"><span className="text-muted-foreground">Contact Person:</span> {supplier.contactPerson || '—'}</p>
                            <p><span className="text-muted-foreground">Created:</span> {new Date(supplier.createdAt).toLocaleString()}</p>
                            <p><span className="text-muted-foreground">Updated:</span> {new Date(supplier.updatedAt).toLocaleString()}</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </main>
    )
}