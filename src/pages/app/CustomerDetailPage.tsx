import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { fetchCustomerById } from '@/services/customers.service'

export function CustomerDetailPage() {
    const { customerId } = useParams({ strict: false }) as { customerId: string }
    const navigate = useNavigate()
    const detailQuery = useQuery({
        queryKey: ['customer-detail', customerId],
        queryFn: () => fetchCustomerById(customerId),
        staleTime: 0,
    })

    const customer = detailQuery.data

    return (
        <main className="space-y-6">
            <div className="flex items-center justify-between gap-3">
                <Button variant="outline" onClick={() => navigate({ to: '/app/customers' })}>
                    <ArrowLeft className="size-4" />
                    <span className="hidden sm:inline ml-2">Back to Customers</span>
                </Button>
            </div>

            {detailQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading customer detail...</p>
            ) : detailQuery.isError || !customer ? (
                <p className="text-sm text-destructive">Unable to load customer detail.</p>
            ) : (
                <>
                    <h1 className="text-2xl font-bold tracking-tight">{customer.name}</h1>

                    <Card className="bg-surface/95">
                        <CardHeader>
                            <CardTitle>Customer Profile</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 md:grid-cols-2 text-sm">
                                <p><span className="text-muted-foreground">Name:</span> {customer.name}</p>
                                <p><span className="text-muted-foreground">Email:</span> {customer.email || '—'}</p>
                                <p><span className="text-muted-foreground">Phone:</span> {customer.phone || '—'}</p>
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}
        </main>
    )
}
