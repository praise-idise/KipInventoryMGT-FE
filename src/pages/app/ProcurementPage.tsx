import { Link } from '@tanstack/react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui'

const modules = [
    {
        title: 'Purchase Orders',
        description: 'Draft, submit, and approve supplier orders.',
        to: '/app/purchase-orders',
    },
    {
        title: 'Approval Queue',
        description: 'Review items waiting for approver action.',
        to: '/app/approvals',
    },
]

export function ProcurementPage() {
    return (
        <main className="space-y-5">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">Procurement</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    Create and track purchasing workflows from draft to approved receipt.
                </p>
            </div>

            <section className="grid gap-4 md:grid-cols-2">
                {modules.map((item) => (
                    <Card key={item.title} className="bg-surface/95">
                        <CardHeader>
                            <CardTitle className="text-base">{item.title}</CardTitle>
                            <CardDescription>{item.description}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Link to={item.to} className="inline-flex h-10 items-center rounded-md border border-border px-4 text-sm font-medium hover:bg-muted">
                                Open
                            </Link>
                        </CardContent>
                    </Card>
                ))}
            </section>
        </main>
    )
}
