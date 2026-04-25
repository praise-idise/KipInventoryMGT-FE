import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui'

const modules = [
    'Stock Issues',
    'Transfers',
    'Stock Adjustments',
    'Opening Balances',
]

export function InventoryOpsPage() {
    return (
        <main className="space-y-5">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">Inventory Operations</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    Manage controlled stock movement, correction, and warehouse balancing workflows.
                </p>
            </div>

            <section className="grid gap-4 md:grid-cols-2">
                {modules.map((item) => (
                    <Card key={item} className="bg-surface/95">
                        <CardHeader>
                            <CardTitle className="text-base">{item}</CardTitle>
                            <CardDescription>Module entry point is ready for implementation.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-muted-foreground">Coming next in this module.</p>
                        </CardContent>
                    </Card>
                ))}
            </section>
        </main>
    )
}
