import { useEffect, useMemo, useState, type SyntheticEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { getApiErrorMessage } from '@/api/types'
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Textarea, toast } from '@/components/ui'
import { formatStatusLabel, getStatusBadgeClassName } from '@/lib/status-badge'
import { fetchProducts } from '@/services/products.service'
import {
    createStockAdjustmentDraft,
    deleteStockAdjustmentDraft,
    fetchStockAdjustments,
    ADJUSTMENT_REASON,
    STOCK_ADJUSTMENT_STATUS,
    type AdjustmentReason,
    type StockAdjustmentDraftValues,
    type StockAdjustmentItem,
    updateStockAdjustmentDraft,
} from '@/services/stock-adjustments.service'
import { fetchWarehouses } from '@/services/warehouses.service'

type AdjustmentLineDraft = {
    id: string
    productId: string
    quantityAfter: string
    unitCost: string
}

type AdjustmentFormState = {
    warehouseId: string
    reason: AdjustmentReason
    notes: string
    lines: AdjustmentLineDraft[]
}

const MIN_SEARCH_CHARACTERS = 3
const SEARCH_DEBOUNCE_MS = 300
const adjustmentReasonOptions = Object.values(ADJUSTMENT_REASON)

function createLineDraft(): AdjustmentLineDraft {
    return {
        id: crypto.randomUUID(),
        productId: '',
        quantityAfter: '0',
        unitCost: '',
    }
}

function createEmptyForm(): AdjustmentFormState {
    return {
        warehouseId: '',
        reason: ADJUSTMENT_REASON.COUNT_CORRECTION,
        notes: '',
        lines: [createLineDraft()],
    }
}

function createEditForm(item: StockAdjustmentItem): AdjustmentFormState {
    return {
        warehouseId: item.warehouseId,
        reason: item.reason,
        notes: item.notes ?? '',
        lines: (item.lines?.length ? item.lines : [{ productId: '', quantityAfter: 0, unitCost: null }]).map((line) => ({
            id: crypto.randomUUID(),
            productId: line.productId,
            quantityAfter: String(line.quantityAfter),
            unitCost: line.unitCost ? String(line.unitCost) : '',
        })),
    }
}

export function StockAdjustmentsPage() {
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const [pageNumber, setPageNumber] = useState(1)
    const [pageSize] = useState(7)
    const [searchInput, setSearchInput] = useState('')
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
    const [isComposerOpen, setIsComposerOpen] = useState(false)
    const [editingAdjustment, setEditingAdjustment] = useState<StockAdjustmentItem | null>(null)
    const [formState, setFormState] = useState<AdjustmentFormState>(createEmptyForm)
    const [formError, setFormError] = useState<string | null>(null)
    const trimmedSearchInput = searchInput.trim()
    const activeSearchTerm = useMemo(
        () => (debouncedSearchTerm.length >= MIN_SEARCH_CHARACTERS ? debouncedSearchTerm : ''),
        [debouncedSearchTerm],
    )

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            setDebouncedSearchTerm(trimmedSearchInput)
        }, SEARCH_DEBOUNCE_MS)

        return () => window.clearTimeout(timeoutId)
    }, [trimmedSearchInput])

    useEffect(() => {
        setPageNumber(1)
    }, [activeSearchTerm])

    const adjustmentsQuery = useQuery({
        queryKey: ['stock-adjustments', activeSearchTerm, pageNumber, pageSize],
        queryFn: () => fetchStockAdjustments({ pageNumber, pageSize, searchTerm: activeSearchTerm }),
    })

    const warehousesQuery = useQuery({
        queryKey: ['warehouses', 'options'],
        queryFn: () => fetchWarehouses({ pageNumber: 1, pageSize: 200, searchTerm: '' }),
    })

    const productsQuery = useQuery({
        queryKey: ['products', 'options'],
        queryFn: () => fetchProducts({ pageNumber: 1, pageSize: 500, searchTerm: '' }),
    })

    const refreshAdjustments = async () => {
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['stock-adjustments'] }),
            queryClient.invalidateQueries({ queryKey: ['approvals'] }),
            queryClient.invalidateQueries({ queryKey: ['warehouse-detail'] }),
            queryClient.invalidateQueries({ queryKey: ['stock-adjustment-detail'] }),
        ])
    }

    const saveDraftMutation = useMutation({
        mutationFn: async (values: StockAdjustmentDraftValues) => {
            if (editingAdjustment) {
                return updateStockAdjustmentDraft(editingAdjustment.stockAdjustmentId, values)
            }

            return createStockAdjustmentDraft(values)
        },
        onSuccess: async (response) => {
            const wasEditing = Boolean(editingAdjustment)
            await refreshAdjustments()
            resetForm()
            setIsComposerOpen(false)
            setFormError(null)
            toast.success(response.message || (wasEditing ? 'Stock adjustment draft updated.' : 'Stock adjustment draft created.'))
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, 'Unable to save stock adjustment draft.'))
        },
    })

    const deleteDraftMutation = useMutation({
        mutationFn: deleteStockAdjustmentDraft,
        onSuccess: async (response, stockAdjustmentId) => {
            await refreshAdjustments()
            if (editingAdjustment?.stockAdjustmentId === stockAdjustmentId) {
                resetForm()
                setIsComposerOpen(false)
            }
            toast.success(response.message || 'Stock adjustment draft deleted.')
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, 'Unable to delete stock adjustment draft.'))
        },
    })

    const warehouseNames = useMemo(() => {
        return Object.fromEntries((warehousesQuery.data?.data ?? []).map((warehouse) => [warehouse.warehouseId, warehouse.name]))
    }, [warehousesQuery.data])

    const items = adjustmentsQuery.data?.data ?? []
    const pagination = adjustmentsQuery.data?.pagination
    const pageSummary = useMemo(() => {
        if (!pagination) {
            return 'No pagination data'
        }

        const currentPage = pagination.pageNumber ?? pagination.currentPage ?? 1
        return `Page ${currentPage} of ${pagination.totalPages}`
    }, [pagination])

    function updateForm<K extends keyof AdjustmentFormState>(key: K, value: AdjustmentFormState[K]) {
        setFormState((current) => ({ ...current, [key]: value }))
    }

    function resetForm() {
        setEditingAdjustment(null)
        setFormError(null)
        setFormState(createEmptyForm())
    }

    function closeComposer() {
        setIsComposerOpen(false)
        resetForm()
    }

    function openCreate() {
        setIsComposerOpen(true)
        resetForm()
    }

    function openEditForm(item: StockAdjustmentItem) {
        setIsComposerOpen(true)
        setEditingAdjustment(item)
        setFormError(null)
        setFormState(createEditForm(item))
    }

    function updateLine(id: string, key: keyof AdjustmentLineDraft, value: string) {
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

    async function handleSaveDraft(event: SyntheticEvent<HTMLFormElement>) {
        event.preventDefault()

        const payload: StockAdjustmentDraftValues = {
            warehouseId: formState.warehouseId.trim(),
            reason: formState.reason,
            notes: formState.notes.trim(),
            lines: formState.lines.map((line) => ({
                productId: line.productId.trim(),
                quantityAfter: Number(line.quantityAfter),
                unitCost: line.unitCost ? Number(line.unitCost) : '',
            })),
        }

        if (!payload.warehouseId) {
            setFormError('Warehouse is required.')
            return
        }

        if (payload.lines.length === 0) {
            setFormError('Add at least one stock adjustment line.')
            return
        }

        if (payload.lines.some((line) => !line.productId || line.quantityAfter < 0)) {
            setFormError('Each adjustment line needs a product and quantity after that is zero or greater.')
            return
        }

        if (payload.lines.some((line) => line.unitCost !== '' && Number(line.unitCost) <= 0)) {
            setFormError('Unit cost must be above zero when provided.')
            return
        }

        if (new Set(payload.lines.map((line) => line.productId)).size !== payload.lines.length) {
            setFormError('Duplicate products are not allowed in stock adjustment lines.')
            return
        }

        setFormError(null)
        await saveDraftMutation.mutateAsync(payload)
    }

    return (
        <main className="min-w-0 space-y-6">
            <section className="flex flex-col gap-4 rounded-3xl border border-border/60 bg-linear-to-br from-background via-background to-primary/5 p-6 shadow-sm md:flex-row md:items-end md:justify-between">
                <div>
                    <Badge variant="outline" className="mb-3 border-primary/20 bg-primary/10 text-primary">Inventory Ops</Badge>
                    <h1 className="text-2xl font-semibold tracking-tight">Stock Adjustments</h1>
                    <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Correct warehouse balances through draft creation, submission, and apply workflow.</p>
                </div>
                <Button onClick={openCreate}>Create Stock Adjustment</Button>
            </section>

            {isComposerOpen && (
                <Card className="bg-surface/95">
                    <CardHeader>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <CardTitle>{editingAdjustment ? 'Edit Stock Adjustment Draft' : 'Create Stock Adjustment Draft'}</CardTitle>
                                <CardDescription>Capture the intended post-adjustment quantity for each product.</CardDescription>
                            </div>
                            <Button type="button" variant="outline" onClick={closeComposer}>
                                Close Form
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSaveDraft} className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                <div className="space-y-2">
                                    <Label htmlFor="adjustmentWarehouse" required>Warehouse</Label>
                                    <select
                                        id="adjustmentWarehouse"
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
                                    <Label htmlFor="adjustmentReason" required>Reason</Label>
                                    <select
                                        id="adjustmentReason"
                                        value={formState.reason}
                                        onChange={(event) => updateForm('reason', event.target.value as AdjustmentReason)}
                                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                                    >
                                        {adjustmentReasonOptions.map((reason) => (
                                            <option key={reason} value={reason}>{reason}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="adjustmentNotes">Notes</Label>
                                    <Textarea
                                        id="adjustmentNotes"
                                        value={formState.notes}
                                        onChange={(event) => updateForm('notes', event.target.value)}
                                        placeholder="Optional note"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3 rounded-2xl border border-border/60 p-4">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <h2 className="text-sm font-medium">Adjustment lines</h2>
                                        <p className="text-xs text-muted-foreground">Quantity after can be zero or higher. Unit cost is optional.</p>
                                    </div>
                                    <Button type="button" variant="outline" onClick={addLine} className="w-full sm:w-auto">Add line</Button>
                                </div>

                                <div className="space-y-3">
                                    {formState.lines.map((line, index) => (
                                        <div key={line.id} className="grid gap-3 rounded-2xl border border-border/60 p-3 md:grid-cols-[1.4fr_0.8fr_0.8fr_auto]">
                                            <div className="space-y-2">
                                                <Label htmlFor={`adjustment-product-${line.id}`} required>Product {index + 1}</Label>
                                                <select
                                                    id={`adjustment-product-${line.id}`}
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
                                                <Label htmlFor={`adjustment-quantity-${line.id}`} required>Quantity after</Label>
                                                <Input
                                                    id={`adjustment-quantity-${line.id}`}
                                                    type="number"
                                                    min="0"
                                                    value={line.quantityAfter}
                                                    onChange={(event) => updateLine(line.id, 'quantityAfter', event.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor={`adjustment-cost-${line.id}`}>Unit cost</Label>
                                                <Input
                                                    id={`adjustment-cost-${line.id}`}
                                                    type="number"
                                                    min="0.01"
                                                    step="0.01"
                                                    value={line.unitCost}
                                                    onChange={(event) => updateLine(line.id, 'unitCost', event.target.value)}
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
                                <Button type="submit" loading={saveDraftMutation.isPending}>{editingAdjustment ? 'Save Draft Changes' : 'Create Draft'}</Button>
                                <Button type="button" variant="outline" onClick={() => {
                                    resetForm()
                                    setFormError(null)
                                }}>{editingAdjustment ? 'Reset Changes' : 'Reset Form'}</Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            <Card className="min-w-0 bg-surface/95">
                <CardHeader>
                    <CardTitle>Stock Adjustments List</CardTitle>
                    <CardDescription>Search, review, edit, and remove stock adjustment drafts.</CardDescription>
                </CardHeader>
                <CardContent className="min-w-0 space-y-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <Input
                            value={searchInput}
                            onChange={(event) => setSearchInput(event.target.value)}
                            placeholder="Search stock adjustments by number, warehouse, or notes"
                            className="md:max-w-sm"
                        />
                        <p className="text-xs text-muted-foreground">{pageSummary}</p>
                    </div>

                    {trimmedSearchInput.length > 0 && trimmedSearchInput.length < MIN_SEARCH_CHARACTERS && (
                        <p className="text-xs text-muted-foreground">
                            Type at least {MIN_SEARCH_CHARACTERS} characters to run search. Shorter input shows the default list.
                        </p>
                    )}

                    <div className="w-full max-w-full overflow-x-auto rounded-lg border border-border">
                        <table className="w-max min-w-full table-auto divide-y divide-border text-sm">
                            <thead className="bg-muted/40 text-left text-muted-foreground">
                                <tr>
                                    <th className="px-4 py-3 font-medium whitespace-nowrap">Number</th>
                                    <th className="px-4 py-3 font-medium whitespace-nowrap">Warehouse</th>
                                    <th className="px-4 py-3 font-medium whitespace-nowrap">Reason</th>
                                    <th className="px-4 py-3 font-medium whitespace-nowrap">Requested</th>
                                    <th className="px-4 py-3 font-medium whitespace-nowrap">Status</th>
                                    <th className="px-4 py-3 font-medium whitespace-nowrap">Lines</th>
                                    <th className="w-56 min-w-56 px-4 py-3 font-medium whitespace-nowrap lg:sticky lg:right-0 lg:z-20 lg:border-l lg:border-border lg:bg-muted">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {adjustmentsQuery.isLoading ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                                            Loading...
                                        </td>
                                    </tr>
                                ) : items.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                                            No stock adjustment records found.
                                        </td>
                                    </tr>
                                ) : (
                                    items.map((item) => {
                                        const isDraftEditable = item.status === STOCK_ADJUSTMENT_STATUS.DRAFT || item.status === STOCK_ADJUSTMENT_STATUS.CHANGES_REQUESTED

                                        return (
                                            <tr key={item.stockAdjustmentId} className="bg-surface">
                                                <td className="px-4 py-3 align-top">{item.adjustmentNumber}</td>
                                                <td className="px-4 py-3 align-top">{warehouseNames[item.warehouseId] ?? item.warehouseId}</td>
                                                <td className="px-4 py-3 align-top">{item.reason}</td>
                                                <td className="px-4 py-3 align-top">{new Date(item.requestedAt).toLocaleDateString()}</td>
                                                <td className="px-4 py-3 align-top">
                                                    <Badge variant="outline" className={getStatusBadgeClassName(item.status)}>
                                                        {formatStatusLabel(item.status)}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-3 align-top">{item.lines?.length ?? 0}</td>
                                                <td className="w-56 min-w-56 px-4 py-3 align-top whitespace-nowrap lg:sticky lg:right-0 lg:z-10 lg:border-l lg:border-border lg:bg-muted/50">
                                                    <div className="relative z-10 flex flex-nowrap gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="secondary"
                                                            className="shrink-0"
                                                            onClick={() => navigate({
                                                                to: '/app/stock-adjustments/$stockAdjustmentId',
                                                                params: { stockAdjustmentId: item.stockAdjustmentId },
                                                            })}
                                                        >
                                                            View
                                                        </Button>
                                                        {isDraftEditable && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="shrink-0"
                                                                onClick={() => openEditForm(item)}
                                                            >
                                                                Edit
                                                            </Button>
                                                        )}
                                                        {isDraftEditable && (
                                                            <Button
                                                                size="sm"
                                                                variant="destructive"
                                                                className="shrink-0"
                                                                onClick={() => {
                                                                    if (!window.confirm(`Delete ${item.adjustmentNumber}?`)) {
                                                                        return
                                                                    }

                                                                    deleteDraftMutation.mutate(item.stockAdjustmentId)
                                                                }}
                                                                loading={deleteDraftMutation.isPending && deleteDraftMutation.variables === item.stockAdjustmentId}
                                                            >
                                                                Delete
                                                            </Button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex items-center justify-between">
                        <Button
                            variant="outline"
                            onClick={() => setPageNumber((page) => Math.max(1, page - 1))}
                            disabled={!pagination || (pagination.pageNumber ?? pagination.currentPage ?? 1) <= 1}
                        >
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setPageNumber((page) => page + 1)}
                            disabled={!pagination || (pagination.pageNumber ?? pagination.currentPage ?? 1) >= pagination.totalPages}
                        >
                            Next
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </main>
    )
}
