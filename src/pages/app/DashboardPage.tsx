import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui'

const tiles = [
    {
        title: 'Core Setup',
        description: 'Start with warehouses, products, suppliers, and customers modules.',
    },
    {
        title: 'Procurement',
        description: 'Purchase orders, approvals, and goods receipts workflow.',
    },
    {
        title: 'Inventory Operations',
        description: 'Issues, transfers, adjustments, and opening balances modules.',
    },
]

export function DashboardPage() {
    return (
        <main className="space-y-6">
            <div>
                <Badge variant="outline" className="mb-3 border-primary/30 bg-primary/10 text-primary">
                    Phase 3 Foundation
                </Badge>
                <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    Workspace is ready. Feature modules will be added next by user flow priority.
                </p>
            </div>

            <section className="grid gap-4 md:grid-cols-3">
                {tiles.map((tile) => (
                    <Card key={tile.title} className="bg-surface/95">
                        <CardHeader>
                            <CardTitle className="text-base">{tile.title}</CardTitle>
                            <CardDescription>{tile.description}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-muted-foreground">Coming in next phase.</p>
                        </CardContent>
                    </Card>
                ))}
            </section>
        </main>
    )
}
