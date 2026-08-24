import { useState, type SyntheticEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { APP_ROLES, hasRole } from '@/auth/roles'
import { getApiErrorMessage } from '@/api/types'
import { useAuth } from '@/hooks/use-auth'
import { useBillingAccess } from '@/hooks/use-billing-access'
import { getGroupLabel } from '@/lib/nav-groups'
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Textarea, toast } from '@/components/ui'
import { fetchProducts } from '@/services/products.service'
import { STOCK_ISSUE_REASON, createStockIssue, fetchStockIssues, type CreateStockIssueRequest, type StockIssueReason } from '@/services/stock-issues.service'
import { fetchWarehouses } from '@/services/warehouses.service'

type StockIssueLineDraft = {
    id: string
    productId: string
    quantity: string
}

type StockIssueFormState = {
    warehouseId: string
    reason: StockIssueReason
    notes: string
    lines: StockIssueLineDraft[]
}

function createEmptyForm(): StockIssueFormState {
    return { warehouseId: '', reason: STOCK_ISSUE_REASON.INTERNAL_USE, notes: '', lines: [{ id: crypto.randomUUID(), productId: '', quantity: '1' }] }
}

export function StockIssuesPage() {
    const { user } = useAuth()
    const { canWrite } = useBillingAccess()
    const queryClient = useQueryClient()
    const [isComposerOpen, setIsComposerOpen] = useState(false)
    const [formState, setFormState] = useState<StockIssueFormState>(createEmptyForm())
    const [formError, setFormError] = useState<string | null>(null)
    const [pageNumber, setPageNumber] = useState(1)
    const pageSize = 7

    const canIssueStock = hasRole(user?.roles, APP_ROLES.WAREHOUSE_OFFICER, APP_ROLES.ADMIN)

    const listQuery = useQuery({
        queryKey: ['stock-issues', pageNumber, pageSize],
        queryFn: () => fetchStockIssues({ pageNumber, pageSize }),
        staleTime: 0,
    })

    const warehousesQuery = useQuery({
        queryKey: ['warehouses', 'options'],
        queryFn: () => fetchWarehouses({ pageNumber: 1, pageSize: 200, searchTerm: '' }),
    })

    const productsQuery = useQuery({
        queryKey: ['products', 'options'],
        queryFn: () => fetchProducts({ pageNumber: 1, pageSize: 500, searchTerm: '' }),
    })

    const createMutation = useMutation({
        mutationFn: createStockIssue,
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['stock-issues'] })
            setIsComposerOpen(false)
            setFormState(createEmptyForm())
            setFormError(null)
            toast.success('Stock issue recorded.')
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, 'Unable to record stock issue.'))
        },
    })

    function addLine() {
        setFormState((prev) => ({ ...prev, lines: [...prev.lines, { id: crypto.randomUUID(), productId: '', quantity: '1' }] }))
    }

    function removeLine(id: string) {
        setFormState((prev) => {
            if (prev.lines.length === 1) return prev
            return { ...prev, lines: prev.lines.filter((l) => l.id !== id) }
        })
    }

    function updateLine(id: string, field: 'productId' | 'quantity', value: string) {
        setFormState((prev) => ({
            ...prev,
            lines: prev.lines.map((l) => (l.id === id ? { ...l, [field]: value } : l)),
        }))
    }

    async function handleSubmit(event: SyntheticEvent) {
        event.preventDefault()
        setFormError(null)

        if (!formState.warehouseId) {
            setFormError('Select a warehouse.')
            return
        }

        const lines: CreateStockIssueRequest['lines'] = formState.lines.map((l) => {
            const qty = Number(l.quantity)
            if (!l.productId || !Number.isFinite(qty) || qty <= 0) {
                throw new Error('Each line must have a product and a positive quantity.')
            }
            return { productId: l.productId, quantity: qty }
        })

        try {
            await createMutation.mutateAsync({ warehouseId: formState.warehouseId, reason: formState.reason, notes: formState.notes, lines })
        } catch {
            // handled by onError
        }
    }

    const items = listQuery.data?.data ?? []
    const pagination = listQuery.data?.pagination

    return (
        <main className="space-y-6">
            <section className="rounded-3xl border border-border/60 bg-linear-to-br from-background via-background to-primary/5 p-6 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div>
                        <Badge variant="outline" className="mb-3 border-primary/20 bg-primary/10 text-primary">{getGroupLabel('/app/stock-issues')}</Badge>
                        <h1 className="text-2xl font-semibold tracking-tight">Stock Issues</h1>
                        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Record stock taken out for samples, internal use, disposals, and other controlled write-offs.</p>
                    </div>
                    {canIssueStock && (
                        <Button disabled={!canWrite} onClick={() => { setIsComposerOpen(!isComposerOpen); if (isComposerOpen) { setFormState(createEmptyForm()); setFormError(null) } }}>
                            {isComposerOpen ? 'Cancel' : 'Record Issue'}
                        </Button>
                    )}
                </div>
            </section>

            {isComposerOpen && (
                <Card className="bg-surface/95">
                    <CardHeader>
                        <CardTitle>Record Stock Issue</CardTitle>
                        <CardDescription>Remove stock from a warehouse for samples, internal use, damage disposal, or other write-off reasons.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <fieldset disabled={!canWrite}>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="warehouseId" required>Warehouse</Label>
                                        <select id="warehouseId" value={formState.warehouseId} onChange={(e) => setFormState((prev) => ({ ...prev, warehouseId: e.target.value }))} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                                            <option value="">Select warehouse</option>
                                            {(warehousesQuery.data?.data ?? []).map((w) => (<option key={w.warehouseId} value={w.warehouseId}>{w.name}</option>))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="reason" required>Reason</Label>
                                        <select id="reason" value={formState.reason} onChange={(e) => setFormState((prev) => ({ ...prev, reason: e.target.value as StockIssueReason }))} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                                            {Object.entries(STOCK_ISSUE_REASON).map(([label, value]) => (<option key={value} value={value}>{label}</option>))}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="notes">Notes</Label>
                                    <Textarea id="notes" value={formState.notes} onChange={(e) => setFormState((prev) => ({ ...prev, notes: e.target.value }))} placeholder="Optional notes about this issue" />
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-medium">Line items</h3>
                                        <Button type="button" variant="outline" onClick={addLine} className="w-full sm:w-auto">Add line</Button>
                                    </div>
                                    {formState.lines.map((line) => (
                                        <div key={line.id} className="grid gap-3 rounded-lg border border-border p-3 md:grid-cols-[1fr_120px_auto] md:items-end">
                                            <div className="space-y-2">
                                                <Label>Product</Label>
                                                <select value={line.productId} onChange={(e) => updateLine(line.id, 'productId', e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                                                    <option value="">Select product</option>
                                                    {(productsQuery.data?.data ?? []).map((p) => (<option key={p.productId} value={p.productId}>{p.name} ({p.sku})</option>))}
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Quantity</Label>
                                                <Input type="number" min="1" value={line.quantity} onChange={(e) => updateLine(line.id, 'quantity', e.target.value)} />
                                            </div>
                                            <Button type="button" variant="outline" onClick={() => removeLine(line.id)} disabled={formState.lines.length === 1}>Remove</Button>
                                        </div>
                                    ))}
                                </div>

                                {formError && <p className="text-sm text-destructive">{formError}</p>}

                                <div className="flex flex-wrap gap-3">
                                    <Button type="submit" loading={createMutation.isPending}>Record Stock Issue</Button>
                                    <Button type="button" variant="outline" onClick={() => { setIsComposerOpen(false); setFormState(createEmptyForm()); setFormError(null) }}>Cancel</Button>
                                </div>
                            </fieldset>
                        </form>
                    </CardContent>
                </Card>
            )}

            <Card className="bg-surface/95">
                <CardHeader>
                    <CardTitle>Stock Issue Records</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto rounded-lg border border-border">
                        <table className="w-max min-w-full divide-y divide-border text-sm">
                            <thead className="bg-muted/40 text-left text-muted-foreground">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Date</th>
                                    <th className="px-4 py-3 font-medium">Product</th>
                                    <th className="px-4 py-3 font-medium">Warehouse</th>
                                    <th className="px-4 py-3 font-medium">Reason</th>
                                    <th className="px-4 py-3 font-medium">Quantity</th>
                                    <th className="px-4 py-3 font-medium">Unit Cost</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {listQuery.isLoading ? (
                                    <tr><td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">Loading...</td></tr>
                                ) : items.length === 0 ? (
                                    <tr><td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">No stock issue records found.</td></tr>
                                ) : (
                                    items.map((item) => (
                                        <tr key={item.stockMovementId} className="bg-surface">
                                            <td className="px-4 py-3 text-muted-foreground">{new Date(item.occurredAt).toLocaleDateString()}</td>
                                            <td className="px-4 py-3 font-medium">{item.productName} <span className="text-muted-foreground">({item.sku})</span></td>
                                            <td className="px-4 py-3">{item.warehouseName}</td>
                                            <td className="px-4 py-3">{item.reason}</td>
                                            <td className="px-4 py-3">{item.quantity}</td>
                                            <td className="px-4 py-3">{item.unitCost}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                        <Button variant="outline" onClick={() => setPageNumber((p) => Math.max(1, p - 1))} disabled={pageNumber <= 1}>Previous</Button>
                        <Button variant="outline" onClick={() => setPageNumber((p) => p + 1)} disabled={!pagination || pageNumber >= pagination.totalPages}>Next</Button>
                    </div>
                </CardContent>
            </Card>
        </main>
    )
}
