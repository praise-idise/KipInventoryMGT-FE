import { useEffect, useMemo, useState, type SyntheticEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { getApiErrorMessage } from '@/api/types'
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Textarea, toast } from '@/components/ui'
import { formatStatusLabel, getStatusBadgeClassName } from '@/lib/status-badge'
import { fetchProducts } from '@/services/products.service'
import {
    createTransferRequestDraft,
    deleteTransferRequestDraft,
    fetchTransferRequests,
    TRANSFER_REQUEST_STATUS,
    type TransferRequestDraftValues,
    type TransferRequestItem,
    updateTransferRequestDraft,
} from '@/services/transfer-requests.service'
import { fetchWarehouseById, fetchWarehouses } from '@/services/warehouses.service'

type TransferLineDraft = {
    id: string
    productId: string
    quantityRequested: string
}

type TransferFormState = {
    sourceWarehouseId: string
    destinationWarehouseId: string
    notes: string
    lines: TransferLineDraft[]
}

const MIN_SEARCH_CHARACTERS = 3
const SEARCH_DEBOUNCE_MS = 300

function createLineDraft(): TransferLineDraft {
    return {
        id: crypto.randomUUID(),
        productId: '',
        quantityRequested: '1',
    }
}

function createEmptyForm(): TransferFormState {
    return {
        sourceWarehouseId: '',
        destinationWarehouseId: '',
        notes: '',
        lines: [createLineDraft()],
    }
}

function createEditForm(item: TransferRequestItem): TransferFormState {
    return {
        sourceWarehouseId: item.sourceWarehouseId,
        destinationWarehouseId: item.destinationWarehouseId,
        notes: item.notes ?? '',
        lines: (item.lines?.length ? item.lines : [{ productId: '', quantityRequested: 1 }]).map((line) => ({
            id: crypto.randomUUID(),
            productId: line.productId,
            quantityRequested: String(line.quantityRequested),
        })),
    }
}

export function TransferRequestsPage() {
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const [pageNumber, setPageNumber] = useState(1)
    const [pageSize] = useState(7)
    const [searchInput, setSearchInput] = useState('')
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
    const [isComposerOpen, setIsComposerOpen] = useState(false)
    const [editingTransfer, setEditingTransfer] = useState<TransferRequestItem | null>(null)
    const [formState, setFormState] = useState<TransferFormState>(createEmptyForm)
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

    const transfersQuery = useQuery({
        queryKey: ['transfer-requests', activeSearchTerm, pageNumber, pageSize],
        queryFn: () => fetchTransferRequests({ pageNumber, pageSize, searchTerm: activeSearchTerm }),
    })

    const warehousesQuery = useQuery({
        queryKey: ['warehouses', 'options'],
        queryFn: () => fetchWarehouses({ pageNumber: 1, pageSize: 200, searchTerm: '' }),
    })

    const productsQuery = useQuery({
        queryKey: ['products', 'options'],
        queryFn: () => fetchProducts({ pageNumber: 1, pageSize: 500, searchTerm: '' }),
    })

    const sourceWarehouseDetailQuery = useQuery({
        queryKey: ['warehouse-detail', formState.sourceWarehouseId],
        enabled: Boolean(formState.sourceWarehouseId),
        queryFn: () => fetchWarehouseById(formState.sourceWarehouseId),
    })

    const refreshTransfers = async () => {
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['transfer-requests'] }),
            queryClient.invalidateQueries({ queryKey: ['approvals'] }),
            queryClient.invalidateQueries({ queryKey: ['warehouse-detail'] }),
            queryClient.invalidateQueries({ queryKey: ['transfer-request-detail'] }),
        ])
    }

    const saveDraftMutation = useMutation({
        mutationFn: async (values: TransferRequestDraftValues) => {
            if (editingTransfer) {
                return updateTransferRequestDraft(editingTransfer.transferRequestId, values)
            }

            return createTransferRequestDraft(values)
        },
        onSuccess: async (response) => {
            const wasEditing = Boolean(editingTransfer)
            await refreshTransfers()
            resetForm()
            setIsComposerOpen(false)
            setFormError(null)
            toast.success(response.message || (wasEditing ? 'Transfer request draft updated.' : 'Transfer request draft created.'))
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, 'Unable to save transfer request draft.'))
        },
    })

    const deleteDraftMutation = useMutation({
        mutationFn: deleteTransferRequestDraft,
        onSuccess: async (response, transferRequestId) => {
            await refreshTransfers()
            if (editingTransfer?.transferRequestId === transferRequestId) {
                resetForm()
                setIsComposerOpen(false)
            }
            toast.success(response.message || 'Transfer request draft deleted.')
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, 'Unable to delete transfer request draft.'))
        },
    })

    const warehouseNames = useMemo(() => {
        return Object.fromEntries((warehousesQuery.data?.data ?? []).map((warehouse) => [warehouse.warehouseId, warehouse.name]))
    }, [warehousesQuery.data])

    const productNames = useMemo(() => {
        return Object.fromEntries((productsQuery.data?.data ?? []).map((product) => [product.productId, `${product.name} (${product.sku})`]))
    }, [productsQuery.data])

    const sourceWarehouseInventory = useMemo(() => {
        return (sourceWarehouseDetailQuery.data?.inventoryItems ?? []).filter((item) => item.availableQuantity > 0)
    }, [sourceWarehouseDetailQuery.data])

    const sourceWarehouseProductNames = useMemo(() => {
        return Object.fromEntries(sourceWarehouseInventory.map((item) => [item.productId, `${item.productName} (${item.sku})`]))
    }, [sourceWarehouseInventory])

    const items = transfersQuery.data?.data ?? []
    const pagination = transfersQuery.data?.pagination
    const pageSummary = useMemo(() => {
        if (!pagination) {
            return 'No pagination data'
        }

        const currentPage = pagination.pageNumber ?? pagination.currentPage ?? 1
        return `Page ${currentPage} of ${pagination.totalPages}`
    }, [pagination])

    function updateForm<K extends keyof TransferFormState>(key: K, value: TransferFormState[K]) {
        setFormState((current) => ({ ...current, [key]: value }))
    }

    function resetForm() {
        setEditingTransfer(null)
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

    function openEditForm(item: TransferRequestItem) {
        setIsComposerOpen(true)
        setEditingTransfer(item)
        setFormError(null)
        setFormState(createEditForm(item))
    }

    function updateLine(id: string, key: keyof TransferLineDraft, value: string) {
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

        const payload: TransferRequestDraftValues = {
            sourceWarehouseId: formState.sourceWarehouseId.trim(),
            destinationWarehouseId: formState.destinationWarehouseId.trim(),
            notes: formState.notes.trim(),
            lines: formState.lines.map((line) => ({
                productId: line.productId.trim(),
                quantityRequested: Number(line.quantityRequested),
            })),
        }

        if (!payload.sourceWarehouseId || !payload.destinationWarehouseId) {
            setFormError('Source and destination warehouses are required.')
            return
        }

        if (payload.sourceWarehouseId === payload.destinationWarehouseId) {
            setFormError('Source and destination warehouses must be different.')
            return
        }

        if (payload.lines.length === 0) {
            setFormError('Add at least one transfer line.')
            return
        }

        if (payload.lines.some((line) => !line.productId || line.quantityRequested <= 0)) {
            setFormError('Each transfer line needs a product and quantity above zero.')
            return
        }

        if (new Set(payload.lines.map((line) => line.productId)).size !== payload.lines.length) {
            setFormError('Duplicate products are not allowed in transfer lines.')
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
                    <h1 className="text-2xl font-semibold tracking-tight">Transfer Requests</h1>
                    <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Move stock between warehouses through draft creation, submission, dispatch, and completion.</p>
                </div>
                <Button onClick={openCreate}>Create Transfer Request</Button>
            </section>

            {isComposerOpen && (
                <Card className="bg-surface/95">
                    <CardHeader>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <CardTitle>{editingTransfer ? 'Edit Transfer Request Draft' : 'Create Transfer Request Draft'}</CardTitle>
                                <CardDescription>Capture source, destination, and product quantities before submission. Products are limited to available source inventory.</CardDescription>
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
                                    <Label htmlFor="transferSource" required>Source warehouse</Label>
                                    <select
                                        id="transferSource"
                                        value={formState.sourceWarehouseId}
                                        onChange={(event) => {
                                            const nextSourceWarehouseId = event.target.value
                                            setFormState((current) => ({
                                                ...current,
                                                sourceWarehouseId: nextSourceWarehouseId,
                                                lines: current.sourceWarehouseId === nextSourceWarehouseId
                                                    ? current.lines
                                                    : current.lines.map((line) => ({ ...line, productId: '' })),
                                            }))
                                        }}
                                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                                    >
                                        <option value="">Select warehouse</option>
                                        {(warehousesQuery.data?.data ?? []).map((warehouse) => (
                                            <option key={warehouse.warehouseId} value={warehouse.warehouseId}>{warehouse.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="transferDestination" required>Destination warehouse</Label>
                                    <select
                                        id="transferDestination"
                                        value={formState.destinationWarehouseId}
                                        onChange={(event) => updateForm('destinationWarehouseId', event.target.value)}
                                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                                    >
                                        <option value="">Select warehouse</option>
                                        {(warehousesQuery.data?.data ?? []).map((warehouse) => (
                                            <option key={warehouse.warehouseId} value={warehouse.warehouseId}>{warehouse.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2 xl:col-span-1">
                                    <Label htmlFor="transferNotes">Notes</Label>
                                    <Textarea
                                        id="transferNotes"
                                        value={formState.notes}
                                        onChange={(event) => updateForm('notes', event.target.value)}
                                        placeholder="Optional instruction"
                                    />
                                </div>
                            </div>

                            {formState.sourceWarehouseId && sourceWarehouseInventory.length === 0 && (
                                <p className="text-sm text-muted-foreground">
                                    The selected source warehouse has no available inventory yet, so a transfer draft cannot be completed from it.
                                </p>
                            )}

                            <div className="space-y-3 rounded-2xl border border-border/60 p-4">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <h2 className="text-sm font-medium">Transfer lines</h2>
                                        <p className="text-xs text-muted-foreground">Each product can appear only once in a request, and only available source inventory is listed.</p>
                                    </div>
                                    <Button type="button" variant="outline" onClick={addLine} className="w-full sm:w-auto">Add line</Button>
                                </div>

                                <div className="space-y-3">
                                    {formState.lines.map((line, index) => (
                                        <div key={line.id} className="grid gap-3 rounded-2xl border border-border/60 p-3 md:grid-cols-[1.6fr_0.8fr_auto]">
                                            <div className="space-y-2">
                                                <Label htmlFor={`transfer-product-${line.id}`} required>Product {index + 1}</Label>
                                                <select
                                                    id={`transfer-product-${line.id}`}
                                                    value={line.productId}
                                                    onChange={(event) => updateLine(line.id, 'productId', event.target.value)}
                                                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                                                >
                                                    <option value="">Select product</option>
                                                    {line.productId && !sourceWarehouseProductNames[line.productId] && (
                                                        <option value={line.productId}>{productNames[line.productId] ?? line.productId}</option>
                                                    )}
                                                    {sourceWarehouseInventory.map((product) => (
                                                        <option key={product.productId} value={product.productId}>{product.productName} ({product.sku})</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor={`transfer-quantity-${line.id}`} required>Quantity</Label>
                                                <Input
                                                    id={`transfer-quantity-${line.id}`}
                                                    type="number"
                                                    min="1"
                                                    value={line.quantityRequested}
                                                    onChange={(event) => updateLine(line.id, 'quantityRequested', event.target.value)}
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
                                <Button type="submit" loading={saveDraftMutation.isPending}>{editingTransfer ? 'Save Draft Changes' : 'Create Draft'}</Button>
                                <Button type="button" variant="outline" onClick={() => {
                                    resetForm()
                                    setFormError(null)
                                }}>{editingTransfer ? 'Reset Changes' : 'Reset Form'}</Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            <Card className="min-w-0 bg-surface/95">
                <CardHeader>
                    <CardTitle>Transfer Requests List</CardTitle>
                    <CardDescription>Search, review, edit, and remove transfer request drafts.</CardDescription>
                </CardHeader>
                <CardContent className="min-w-0 space-y-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <Input
                            value={searchInput}
                            onChange={(event) => setSearchInput(event.target.value)}
                            placeholder="Search by number, warehouse, or notes"
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
                                    <th className="px-4 py-3 font-medium whitespace-nowrap">Source</th>
                                    <th className="px-4 py-3 font-medium whitespace-nowrap">Destination</th>
                                    <th className="px-4 py-3 font-medium whitespace-nowrap">Requested</th>
                                    <th className="px-4 py-3 font-medium whitespace-nowrap">Status</th>
                                    <th className="px-4 py-3 font-medium whitespace-nowrap">Lines</th>
                                    <th className="w-56 min-w-56 px-4 py-3 font-medium whitespace-nowrap lg:sticky lg:right-0 lg:z-20 lg:border-l lg:border-border lg:bg-muted">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {transfersQuery.isLoading ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                                            Loading...
                                        </td>
                                    </tr>
                                ) : items.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                                            No transfer request records found.
                                        </td>
                                    </tr>
                                ) : (
                                    items.map((item) => {
                                        const isDraftEditable = item.status === TRANSFER_REQUEST_STATUS.DRAFT || item.status === TRANSFER_REQUEST_STATUS.CHANGES_REQUESTED

                                        return (
                                            <tr key={item.transferRequestId} className="bg-surface">
                                                <td className="px-4 py-3 align-top">{item.transferNumber}</td>
                                                <td className="px-4 py-3 align-top">{warehouseNames[item.sourceWarehouseId] ?? item.sourceWarehouseId}</td>
                                                <td className="px-4 py-3 align-top">{warehouseNames[item.destinationWarehouseId] ?? item.destinationWarehouseId}</td>
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
                                                                to: '/app/transfers/$transferRequestId',
                                                                params: { transferRequestId: item.transferRequestId },
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
                                                                    if (!window.confirm(`Delete ${item.transferNumber}?`)) {
                                                                        return
                                                                    }

                                                                    deleteDraftMutation.mutate(item.transferRequestId)
                                                                }}
                                                                loading={deleteDraftMutation.isPending && deleteDraftMutation.variables === item.transferRequestId}
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
