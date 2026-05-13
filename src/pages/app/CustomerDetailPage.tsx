import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui'
import { fetchCustomerById } from '@/services/customers.service'

export function CustomerDetailPage() {
    const { customerId } = useParams({ strict: false }) as { customerId: string }
    const navigate = useNavigate()
    const detailQuery = useQuery({
        queryKey: ['customer-detail', customerId],
        queryFn: () => fetchCustomerById(customerId),
    })

    const customer = detailQuery.data

    return (
        <main className="space-y-6">
            <div className="flex items-center justify-between">
                <Button variant="outline" onClick={() => navigate({ to: '/app/customers' })} className="hidden md:inline-flex">
                    <ArrowLeft className="size-4" />
                    Back to Customers
                </Button>
            </div>

            <Card className="bg-surface/95">
                <CardHeader>
                    <CardTitle>{customer?.name ?? 'Customer Detail'}</CardTitle>
                    <CardDescription>View full customer profile details.</CardDescription>
                </CardHeader>
                <CardContent>
                    {detailQuery.isLoading ? (
                        <p className="text-sm text-muted-foreground">Loading customer detail...</p>
                    ) : detailQuery.isError || !customer ? (
                        <p className="text-sm text-destructive">Unable to load customer detail.</p>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2">
                            <p><span className="text-muted-foreground">Name:</span> {customer.name}</p>
                            <p><span className="text-muted-foreground">Email:</span> {customer.email || '—'}</p>
                            <p><span className="text-muted-foreground">Phone:</span> {customer.phone || '—'}</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </main>
    )
}