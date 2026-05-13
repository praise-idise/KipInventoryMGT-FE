import { useEffect, useMemo, useState, type SyntheticEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { getApiErrorMessage } from '@/api/types'
import { PurchaseOrderDraftFormCard, buildPurchaseOrderDraftPatch, buildPurchaseOrderDraftValues, createEmptyPurchaseOrderForm, createPurchaseOrderEditForm, validatePurchaseOrderDraft, type PurchaseOrderFormState } from '@/components/app/PurchaseOrderDraftForm'
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, toast } from '@/components/ui'
import { formatStatusLabel, getStatusBadgeClassName } from '@/lib/status-badge'
import {
    createPurchaseOrderDraft,
    deletePurchaseOrderDraft,
    fetchPurchaseOrderById,
    fetchPurchaseOrders,
    PURCHASE_ORDER_STATUS,
    updatePurchaseOrderDraft,
    type PurchaseOrderItem,
} from '@/services/purchase-orders.service'
import { fetchProducts } from '@/services/products.service'
import { fetchSuppliers } from '@/services/suppliers.service'
import { fetchWarehouses } from '@/services/warehouses.service'

const MIN_SEARCH_CHARACTERS = 3
const SEARCH_DEBOUNCE_MS = 300

export function PurchaseOrdersPage() {
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const [pageNumber, setPageNumber] = useState(1)
    const [pageSize] = useState(7)
    const [searchInput, setSearchInput] = useState('')
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [editingOrder, setEditingOrder] = useState<PurchaseOrderItem | null>(null)
    const [formState, setFormState] = useState<PurchaseOrderFormState>(createEmptyPurchaseOrderForm)
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

    const listQuery = useQuery({
        queryKey: ['purchase-orders', activeSearchTerm, pageNumber, pageSize],
        queryFn: () => fetchPurchaseOrders({ pageNumber, pageSize, searchTerm: activeSearchTerm }),
    })

    const suppliersQuery = useQuery({
        queryKey: ['suppliers', 'options'],
        queryFn: () => fetchSuppliers({ pageNumber: 1, pageSize: 200, searchTerm: '' }),
    })

    const warehousesQuery = useQuery({
        queryKey: ['warehouses', 'options'],
        queryFn: () => fetchWarehouses({ pageNumber: 1, pageSize: 200, searchTerm: '' }),
    })

    const productsQuery = useQuery({
        queryKey: ['products', 'options'],
        queryFn: () => fetchProducts({ pageNumber: 1, pageSize: 500, searchTerm: '' }),
    })

    const refreshPurchaseOrders = async () => {
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['purchase-orders'] }),
            queryClient.invalidateQueries({ queryKey: ['purchase-order-detail'] }),
            queryClient.invalidateQueries({ queryKey: ['approvals'] }),
            queryClient.invalidateQueries({ queryKey: ['warehouse-detail'] }),
            queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] }),
        ])
    }

    const createMutation = useMutation({
        mutationFn: createPurchaseOrderDraft,
        onSuccess: async (response) => {
            await refreshPurchaseOrders()
            closeForm()
            toast.success(response.message || 'Purchase order draft created.')
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, 'Unable to create purchase order draft.'))
        },
    })

    const updateMutation = useMutation({
        mutationFn: ({ purchaseOrderId, values }: { purchaseOrderId: string; values: ReturnType<typeof buildPurchaseOrderDraftPatch> }) => (
            updatePurchaseOrderDraft(purchaseOrderId, values)
        ),
        onSuccess: async (response) => {
            await refreshPurchaseOrders()
            closeForm()
            toast.success(response.message || 'Purchase order draft updated.')
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, 'Unable to update purchase order draft.'))
        },
    })

    const loadEditMutation = useMutation({
        mutationFn: fetchPurchaseOrderById,
        onSuccess: (order) => {
            setIsCreateOpen(false)
            setEditingOrder(order)
            setFormState(createPurchaseOrderEditForm(order))
            setFormError(null)
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, 'Unable to load purchase order draft for editing.'))
        },
    })

    const deleteDraftMutation = useMutation({
        mutationFn: deletePurchaseOrderDraft,
        onSuccess: async (response) => {
            await refreshPurchaseOrders()
            toast.success(response.message || 'Purchase order draft deleted.')
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, 'Unable to delete purchase order draft.'))
        },
    })

    const supplierNames = useMemo(() => {
        return Object.fromEntries((suppliersQuery.data?.data ?? []).map((supplier) => [supplier.supplierId, supplier.name]))
    }, [suppliersQuery.data])

    const warehouseNames = useMemo(() => {
        return Object.fromEntries((warehousesQuery.data?.data ?? []).map((warehouse) => [warehouse.warehouseId, warehouse.name]))
    }, [warehousesQuery.data])

    const items = listQuery.data?.data ?? []
    const pagination = listQuery.data?.pagination
    const pageSummary = useMemo(() => {
        if (!pagination) {
            return 'No pagination data'
        }

        const currentPage = pagination.pageNumber ?? pagination.currentPage ?? 1
        return `Page ${currentPage} of ${pagination.totalPages}`
    }, [pagination])

    function closeForm() {
        setIsCreateOpen(false)
        setEditingOrder(null)
        setFormState(createEmptyPurchaseOrderForm())
        setFormError(null)
    }

    function openCreate() {
        setIsCreateOpen(true)
        setEditingOrder(null)
        setFormState(createEmptyPurchaseOrderForm())
        setFormError(null)
    }

    function openEdit(purchaseOrderId: string) {
        setFormError(null)
        loadEditMutation.mutate(purchaseOrderId)
    }

    async function handleCreate(event: SyntheticEvent<HTMLFormElement>) {
        event.preventDefault()

        const validationError = validatePurchaseOrderDraft(formState)
        if (validationError) {
            setFormError(validationError)
            return
        }

        setFormError(null)
        await createMutation.mutateAsync(buildPurchaseOrderDraftValues(formState))
    }

    async function handleSaveDraft(event: SyntheticEvent<HTMLFormElement>) {
        event.preventDefault()

        if (!editingOrder) {
            return
        }

        const validationError = validatePurchaseOrderDraft(formState)
        if (validationError) {
            setFormError(validationError)
            return
        }

        setFormError(null)
        const values = buildPurchaseOrderDraftPatch(formState, editingOrder)
        if (Object.keys(values).length === 0) {
            closeForm()
            return
        }

        await updateMutation.mutateAsync({
            purchaseOrderId: editingOrder.purchaseOrderId,
            values,
        })
    }

    return (
        <main className="min-w-0 space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                    <Badge variant="outline" className="mb-3 border-primary/30 bg-primary/10 text-primary">
                        Purchase Order Flow
                    </Badge>
                    <h1 className="text-2xl font-semibold tracking-tight">Purchase Orders</h1>
                    <p className="mt-2 text-sm text-muted-foreground">Create, search, review, submit, and manage purchase orders.</p>
                </div>

                <Button onClick={openCreate}>Add Purchase Order</Button>
            </div>

            {(isCreateOpen || editingOrder) && (
                <PurchaseOrderDraftFormCard
                    title={editingOrder ? `Edit ${editingOrder.purchaseOrderNumber}` : 'Create Purchase Order'}
                    description={editingOrder ? 'Update the selected purchase order draft.' : 'Add a new purchase order.'}
                    submitLabel={editingOrder ? 'Save Changes' : 'Create Purchase Order'}
                    cancelLabel={editingOrder ? 'Close' : 'Cancel'}
                    submitLoading={editingOrder ? updateMutation.isPending : createMutation.isPending}
                    formState={formState}
                    setFormState={setFormState}
                    formError={formError}
                    suppliers={suppliersQuery.data?.data ?? []}
                    warehouses={warehousesQuery.data?.data ?? []}
                    products={productsQuery.data?.data ?? []}
                    onSubmit={editingOrder ? handleSaveDraft : handleCreate}
                    onCancel={closeForm}
                />
            )}

            <Card className="min-w-0 bg-surface/95">
                <CardHeader>
                    <CardTitle>Purchase Orders List</CardTitle>
                    <CardDescription>Search, review, edit, and remove purchase orders.</CardDescription>
                </CardHeader>
                <CardContent className="min-w-0 space-y-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <Input
                            value={searchInput}
                            onChange={(event) => setSearchInput(event.target.value)}
                            placeholder="Search by number, supplier, warehouse, or notes"
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
                                    <th className="px-4 py-3 font-medium whitespace-nowrap">Supplier</th>
                                    <th className="px-4 py-3 font-medium whitespace-nowrap">Warehouse</th>
                                    <th className="px-4 py-3 font-medium whitespace-nowrap">Ordered</th>
                                    <th className="px-4 py-3 font-medium whitespace-nowrap">Expected Arrival</th>
                                    <th className="px-4 py-3 font-medium whitespace-nowrap">Status</th>
                                    <th className="w-56 min-w-56 px-4 py-3 font-medium whitespace-nowrap lg:sticky lg:right-0 lg:z-20 lg:border-l lg:border-border lg:bg-muted">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {listQuery.isLoading ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                                            Loading...
                                        </td>
                                    </tr>
                                ) : items.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                                            No purchase order records found.
                                        </td>
                                    </tr>
                                ) : (
                                    items.map((item) => {
                                        const canEditOrder = (
                                            item.status === PURCHASE_ORDER_STATUS.DRAFT
                                            || item.status === PURCHASE_ORDER_STATUS.CHANGES_REQUESTED
                                        )
                                        const canDeleteOrder = canEditOrder

                                        return (
                                            <tr key={item.purchaseOrderId} className="bg-surface">
                                                <td className="px-4 py-3 align-top">{item.purchaseOrderNumber}</td>
                                                <td className="px-4 py-3 align-top">{supplierNames[item.supplierId] ?? item.supplierId}</td>
                                                <td className="px-4 py-3 align-top">{item.warehouseName ?? warehouseNames[item.warehouseId] ?? item.warehouseId}</td>
                                                <td className="px-4 py-3 align-top">{new Date(item.orderedAt).toLocaleDateString()}</td>
                                                <td className="px-4 py-3 align-top">{item.expectedArrivalDate ? new Date(item.expectedArrivalDate).toLocaleDateString() : '—'}</td>
                                                <td className="px-4 py-3 align-top">
                                                    <Badge variant="outline" className={getStatusBadgeClassName(item.status)}>
                                                        {formatStatusLabel(item.status)}
                                                    </Badge>
                                                </td>
                                                <td className="w-56 min-w-56 px-4 py-3 align-top whitespace-nowrap lg:sticky lg:right-0 lg:z-10 lg:border-l lg:border-border lg:bg-muted/50">
                                                    <div className="relative z-10 flex flex-nowrap gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="secondary"
                                                            className="shrink-0"
                                                            onClick={() => navigate({
                                                                to: '/app/purchase-orders/$purchaseOrderId',
                                                                params: { purchaseOrderId: item.purchaseOrderId },
                                                            })}
                                                        >
                                                            View
                                                        </Button>
                                                        {canEditOrder && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="shrink-0"
                                                                onClick={() => openEdit(item.purchaseOrderId)}
                                                                loading={loadEditMutation.isPending && loadEditMutation.variables === item.purchaseOrderId}
                                                            >
                                                                Edit
                                                            </Button>
                                                        )}
                                                        {canDeleteOrder && (
                                                            <Button
                                                                size="sm"
                                                                variant="destructive"
                                                                className="shrink-0"
                                                                onClick={() => {
                                                                    if (!window.confirm(`Delete ${item.purchaseOrderNumber}?`)) {
                                                                        return
                                                                    }

                                                                    deleteDraftMutation.mutate(item.purchaseOrderId)
                                                                }}
                                                                loading={deleteDraftMutation.isPending && deleteDraftMutation.variables === item.purchaseOrderId}
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