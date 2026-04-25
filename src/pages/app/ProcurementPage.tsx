import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui'

const modules = [
    'Purchase Orders',
    'Goods Receipts',
    'Approval Queue',
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

            <section className="grid gap-4 md:grid-cols-3">
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
