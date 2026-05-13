import { useMemo, useState, type SyntheticEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { APP_ROLES, hasRole } from '@/auth/roles'
import { getApiErrorMessage } from '@/api/types'
import { useAuth } from '@/hooks/use-auth'
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Textarea, toast } from '@/components/ui'
import { fetchProducts } from '@/services/products.service'
import { STOCK_ISSUE_REASON, createStockIssue, type CreateStockIssueRequest, type StockIssueReason } from '@/services/stock-issues.service'
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

const reasonOptions = Object.values(STOCK_ISSUE_REASON)

function createLineDraft(): StockIssueLineDraft {
    return {
        id: crypto.randomUUID(),
        productId: '',
        quantity: '1',
    }
}

function createEmptyForm(): StockIssueFormState {
    return {
        warehouseId: '',
        reason: STOCK_ISSUE_REASON.INTERNAL_USE,
        notes: '',
        lines: [createLineDraft()],
    }
}

export function StockIssuesPage() {
    const { user } = useAuth()
    const queryClient = useQueryClient()
    const [isComposerOpen, setIsComposerOpen] = useState(false)
    const [formState, setFormState] = useState<StockIssueFormState>(createEmptyForm)
    const [formError, setFormError] = useState<string | null>(null)

    const canIssueStock = hasRole(user?.roles, APP_ROLES.WAREHOUSE_OFFICER)

    const warehousesQuery = useQuery({
        queryKey: ['warehouses', 'options'],
        queryFn: () => fetchWarehouses({ pageNumber: 1, pageSize: 200, searchTerm: '' }),
    })

    const productsQuery = useQuery({
        queryKey: ['products', 'options'],
        queryFn: () => fetchProducts({ pageNumber: 1, pageSize: 500, searchTerm: '' }),
    })

    const issueMutation = useMutation({
        mutationFn: createStockIssue,
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['warehouse-detail'] })
            setFormState(createEmptyForm())
            setFormError(null)
            setIsComposerOpen(false)
            toast.success('Stock issue recorded.')
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, 'Unable to record stock issue.'))
        },
    })

    const productNames = useMemo(() => {
        return Object.fromEntries((productsQuery.data?.data ?? []).map((product) => [product.productId, `${product.name} (${product.sku})`]))
    }, [productsQuery.data])

    function updateForm<K extends keyof StockIssueFormState>(key: K, value: StockIssueFormState[K]) {
        setFormState((current) => ({ ...current, [key]: value }))
    }

    function updateLine(id: string, key: keyof StockIssueLineDraft, value: string) {
        setFormState((current) => ({
            ...current,
            lines: current.lines.map((line) => (line.id === id ? { ...line, [key]: value } : line)),
        }))
    }

    function addLine() {
        setFormState((current) => ({
            ...current,
            lines: [...current.lines, createLineDraft()],
        }))
    }

    function removeLine(id: string) {
        setFormState((current) => ({
            ...current,
            lines: current.lines.length === 1 ? current.lines : current.lines.filter((line) => line.id !== id),
        }))
    }

    async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
        event.preventDefault()

        const payload: CreateStockIssueRequest = {
            warehouseId: formState.warehouseId.trim(),
            reason: formState.reason,
            notes: formState.notes.trim(),
            lines: formState.lines.map((line) => ({
                productId: line.productId.trim(),
                quantity: Number(line.quantity),
            })),
        }

        if (!payload.warehouseId) {
            setFormError('Warehouse is required.')
            return
        }

        if (payload.reason === STOCK_ISSUE_REASON.OTHER && !payload.notes) {
            setFormError('Notes are required when the stock issue reason is Other.')
            return
        }

        if (payload.lines.length === 0) {
            setFormError('Add at least one stock issue line.')
            return
        }

        if (payload.lines.some((line) => !line.productId || line.quantity <= 0)) {
            setFormError('Each stock issue line needs a product and quantity above zero.')
            return
        }

        if (new Set(payload.lines.map((line) => line.productId)).size !== payload.lines.length) {
            setFormError('Duplicate products are not allowed in a stock issue request.')
            return
        }

        setFormError(null)
        await issueMutation.mutateAsync(payload)
    }

    return (
        <main className="space-y-6">
            <section className="flex flex-col gap-4 rounded-3xl border border-border/60 bg-linear-to-br from-background via-background to-primary/5 p-6 shadow-sm md:flex-row md:items-end md:justify-between">
                <div>
                    <Badge variant="outline" className="mb-3 border-primary/20 bg-primary/10 text-primary">Inventory ops</Badge>
                    <h1 className="text-2xl font-semibold tracking-tight">Stock issues</h1>
                    <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Record stock taken out for samples, internal use, disposals, and other controlled write-offs.</p>
                </div>
                {canIssueStock && (
                    <Button onClick={() => {
                        setIsComposerOpen(true)
                        setFormError(null)
                    }}>
                        Record stock issue
                    </Button>
                )}
            </section>

            {!canIssueStock && (
                <Card className="bg-surface/95">
                    <CardContent className="p-5 text-sm text-muted-foreground">
                        Stock issue entry is available to warehouse officers.
                    </CardContent>
                </Card>
            )}

            {canIssueStock && isComposerOpen && (
                <Card className="bg-surface/95">
                    <CardHeader>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <CardTitle>Issue stock</CardTitle>
                                <CardDescription>Capture the warehouse, reason, and affected products before recording the issue.</CardDescription>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setIsComposerOpen(false)
                                    setFormState(createEmptyForm())
                                    setFormError(null)
                                }}
                            >
                                Close form
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                <div className="space-y-2">
                                    <Label htmlFor="stockIssueWarehouse" required>Warehouse</Label>
                                    <select
                                        id="stockIssueWarehouse"
                                        value={formState.warehouseId}
                                        onChange={(event) => updateForm('warehouseId', event.target.value)}
                                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                                    >
                                        <option value="">Select warehouse</option>
                                        {(warehousesQuery.data?.data ?? []).map((warehouse) => (
                                            <option key={warehouse.warehouseId} value={warehouse.warehouseId}>{warehouse.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="stockIssueReason" required>Reason</Label>
                                    <select
                                        id="stockIssueReason"
                                        value={formState.reason}
                                        onChange={(event) => updateForm('reason', event.target.value as StockIssueReason)}
                                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                                    >
                                        {reasonOptions.map((reason) => (
                                            <option key={reason} value={reason}>{reason}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2 xl:col-span-1">
                                    <Label htmlFor="stockIssueNotes">Notes</Label>
                                    <Textarea
                                        id="stockIssueNotes"
                                        value={formState.notes}
                                        onChange={(event) => updateForm('notes', event.target.value)}
                                        placeholder="Required when reason is Other"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3 rounded-2xl border border-border/60 p-4">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <h2 className="text-sm font-medium">Issue lines</h2>
                                        <p className="text-xs text-muted-foreground">Each product can appear only once in a stock issue request.</p>
                                    </div>
                                    <Button type="button" variant="outline" onClick={addLine} className="w-full sm:w-auto">Add line</Button>
                                </div>

                                <div className="space-y-3">
                                    {formState.lines.map((line, index) => (
                                        <div key={line.id} className="grid gap-3 rounded-2xl border border-border/60 p-3 md:grid-cols-[1.6fr_0.8fr_auto]">
                                            <div className="space-y-2">
                                                <Label htmlFor={`issue-product-${line.id}`} required>Product {index + 1}</Label>
                                                <select
                                                    id={`issue-product-${line.id}`}
                                                    value={line.productId}
                                                    onChange={(event) => updateLine(line.id, 'productId', event.target.value)}
                                                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                                                >
                                                    <option value="">Select product</option>
                                                    {(productsQuery.data?.data ?? []).map((product) => (
                                                        <option key={product.productId} value={product.productId}>{product.name} ({product.sku})</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor={`issue-quantity-${line.id}`} required>Quantity</Label>
                                                <Input
                                                    id={`issue-quantity-${line.id}`}
                                                    type="number"
                                                    min="1"
                                                    value={line.quantity}
                                                    onChange={(event) => updateLine(line.id, 'quantity', event.target.value)}
                                                />
                                            </div>
                                            <div className="flex items-end">
                                                <Button type="button" variant="outline" onClick={() => removeLine(line.id)} disabled={formState.lines.length === 1}>
                                                    Remove
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {formError && <p className="text-sm text-destructive">{formError}</p>}

                            <div className="flex flex-wrap gap-3">
                                <Button type="submit" loading={issueMutation.isPending}>Record stock issue</Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setFormState(createEmptyForm())
                                        setFormError(null)
                                    }}
                                >
                                    Reset form
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            {canIssueStock && isComposerOpen && (
                <Card className="bg-surface/95">
                    <CardHeader>
                        <CardTitle>Current issue lines</CardTitle>
                        <CardDescription>Review the products and quantities queued for this stock issue before submission.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {formState.lines.map((line) => (
                                <div key={line.id} className="flex flex-col gap-1 rounded-xl border border-border/50 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                                    <span>{productNames[line.productId] ?? (line.productId || 'No product selected')}</span>
                                    <span className="text-muted-foreground">Quantity {line.quantity || '0'}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </main>
    )
}
