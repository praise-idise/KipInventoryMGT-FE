import { useMemo, useState, type SyntheticEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { APP_ROLES, hasRole } from '@/auth/roles'
import { getApiErrorMessage } from '@/api/types'
import { PurchaseOrderDraftFormCard, buildPurchaseOrderDraftPatch, createEmptyPurchaseOrderForm, createPurchaseOrderEditForm, validatePurchaseOrderDraft, type PurchaseOrderFormState } from '@/components/app/PurchaseOrderDraftForm'
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Textarea, toast } from '@/components/ui'
import { useAuth } from '@/hooks/use-auth'
import { formatStatusLabel, getStatusBadgeClassName } from '@/lib/status-badge'
import { APPROVAL_DECISION_STATUS, APPROVAL_DOCUMENT_TYPE, fetchApprovalHistory } from '@/services/approvals.service'
import { receiveGoods } from '@/services/goods-receipts.service'
import {
    cancelPurchaseOrder,
    deletePurchaseOrderDraft,
    fetchPurchaseOrderById,
    PURCHASE_ORDER_STATUS,
    submitPurchaseOrder,
    updatePurchaseOrderDraft,
} from '@/services/purchase-orders.service'
import { fetchProducts } from '@/services/products.service'
import { fetchSuppliers } from '@/services/suppliers.service'
import { fetchWarehouses } from '@/services/warehouses.service'

type ReceiveDraftState = {
    notes: string
    quantities: Record<string, string>
}

export function PurchaseOrderDetailPage() {
    const { purchaseOrderId } = useParams({ strict: false }) as { purchaseOrderId: string }
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const { user } = useAuth()
    const [isEditing, setIsEditing] = useState(false)
    const [formState, setFormState] = useState<PurchaseOrderFormState>(createEmptyPurchaseOrderForm)
    const [formError, setFormError] = useState<string | null>(null)
    const [isReceiveOpen, setIsReceiveOpen] = useState(false)
    const [receiveDraft, setReceiveDraft] = useState<ReceiveDraftState>({ notes: '', quantities: {} })

    const userRoles = user?.roles ?? []
    const canReceive = hasRole(userRoles, APP_ROLES.WAREHOUSE_OFFICER, APP_ROLES.ADMIN)

    const detailQuery = useQuery({
        queryKey: ['purchase-order-detail', purchaseOrderId],
        queryFn: () => fetchPurchaseOrderById(purchaseOrderId),
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

    const approvalHistoryQuery = useQuery({
        queryKey: ['approval-history', APPROVAL_DOCUMENT_TYPE.PURCHASE_ORDER, purchaseOrderId],
        queryFn: () => fetchApprovalHistory(APPROVAL_DOCUMENT_TYPE.PURCHASE_ORDER, purchaseOrderId, { pageNumber: 1, pageSize: 20 }),
    })

    const order = detailQuery.data

    const supplierNames = useMemo(() => {
        return Object.fromEntries((suppliersQuery.data?.data ?? []).map((supplier) => [supplier.supplierId, supplier.name]))
    }, [suppliersQuery.data])

    const warehouseNames = useMemo(() => {
        return Object.fromEntries((warehousesQuery.data?.data ?? []).map((warehouse) => [warehouse.warehouseId, warehouse.name]))
    }, [warehousesQuery.data])

    const productNames = useMemo(() => {
        return Object.fromEntries((productsQuery.data?.data ?? []).map((product) => [product.productId, `${product.name} (${product.sku})`]))
    }, [productsQuery.data])

    const refreshPurchaseOrder = async () => {
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['purchase-orders'] }),
            queryClient.invalidateQueries({ queryKey: ['purchase-order-detail', purchaseOrderId] }),
            queryClient.invalidateQueries({ queryKey: ['approvals'] }),
            queryClient.invalidateQueries({ queryKey: ['warehouse-detail'] }),
            queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] }),
        ])
    }

    const updateMutation = useMutation({
        mutationFn: (values: ReturnType<typeof buildPurchaseOrderDraftPatch>) => updatePurchaseOrderDraft(purchaseOrderId, values),
        onSuccess: async (response) => {
            await refreshPurchaseOrder()
            setIsEditing(false)
            setFormError(null)
            toast.success(response.message || 'Purchase order draft updated.')
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, 'Unable to update purchase order draft.'))
        },
    })

    const submitMutation = useMutation({
        mutationFn: submitPurchaseOrder,
        onSuccess: async (response) => {
            await refreshPurchaseOrder()
            setIsEditing(false)
            toast.success(response.message || 'Purchase order submitted for approval.')
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, 'Unable to submit purchase order.'))
        },
    })

    const deleteDraftMutation = useMutation({
        mutationFn: deletePurchaseOrderDraft,
        onSuccess: async (response) => {
            await refreshPurchaseOrder()
            toast.success(response.message || 'Purchase order draft deleted.')
            navigate({ to: '/app/purchase-orders' })
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, 'Unable to delete purchase order draft.'))
        },
    })

    const cancelMutation = useMutation({
        mutationFn: cancelPurchaseOrder,
        onSuccess: async (response) => {
            await refreshPurchaseOrder()
            setIsReceiveOpen(false)
            setReceiveDraft({ notes: '', quantities: {} })
            toast.success(response.message || 'Purchase order cancelled.')
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, 'Unable to cancel purchase order.'))
        },
    })

    const receiveMutation = useMutation({
        mutationFn: receiveGoods,
        onSuccess: async () => {
            await refreshPurchaseOrder()
            setIsReceiveOpen(false)
            setReceiveDraft({ notes: '', quantities: {} })
            toast.success('Goods receipt recorded.')
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, 'Unable to receive goods.'))
        },
    })

    const orderStatus = order?.status
    const canEditDraft = (
        orderStatus === PURCHASE_ORDER_STATUS.DRAFT || orderStatus === PURCHASE_ORDER_STATUS.CHANGES_REQUESTED
    )
    const canDeleteDraft = canEditDraft
    const canSubmitDraft = canEditDraft
    const canCancelOrder = (
        orderStatus === PURCHASE_ORDER_STATUS.PENDING_APPROVAL
        || orderStatus === PURCHASE_ORDER_STATUS.APPROVED
        || orderStatus === PURCHASE_ORDER_STATUS.PARTIALLY_RECEIVED
    )
    const canReceiveGoods = canReceive && (
        orderStatus === PURCHASE_ORDER_STATUS.APPROVED
        || orderStatus === PURCHASE_ORDER_STATUS.PARTIALLY_RECEIVED
    )

    const latestChangeRequestComment = useMemo(() => {
        const history = approvalHistoryQuery.data?.data ?? []
        const latestChangeRequest = history.find((item) => (
            item.status === APPROVAL_DECISION_STATUS.CHANGES_REQUESTED
            && typeof item.comment === 'string'
            && item.comment.trim().length > 0
        ))

        return latestChangeRequest?.comment?.trim() ?? null
    }, [approvalHistoryQuery.data])

    function openEdit() {
        if (!order) {
            return
        }

        setFormState(createPurchaseOrderEditForm(order))
        setFormError(null)
        setIsEditing(true)
    }

    function closeEdit() {
        setIsEditing(false)
        setFormError(null)
        setFormState(order ? createPurchaseOrderEditForm(order) : createEmptyPurchaseOrderForm())
    }

    async function handleSaveDraft(event: SyntheticEvent<HTMLFormElement>) {
        event.preventDefault()

        if (!order) {
            return
        }

        const validationError = validatePurchaseOrderDraft(formState)
        if (validationError) {
            setFormError(validationError)
            return
        }

        setFormError(null)
        const values = buildPurchaseOrderDraftPatch(formState, order)
        if (Object.keys(values).length === 0) {
            closeEdit()
            return
        }

        await updateMutation.mutateAsync(values)
    }

    function openReceive() {
        if (!order) {
            return
        }

        const outstandingLines = (order.lines ?? []).filter((line) => line.quantityReceived < line.quantityOrdered)
        if (outstandingLines.length === 0) {
            toast.info('All lines on this purchase order have already been received.')
            return
        }

        setReceiveDraft({
            notes: '',
            quantities: Object.fromEntries(
                outstandingLines.map((line) => [line.purchaseOrderLineId, String(line.quantityOrdered - line.quantityReceived)]),
            ),
        })
        setIsReceiveOpen(true)
    }

    async function handleReceive() {
        if (!order) {
            return
        }

        const lines = (order.lines ?? [])
            .map((line) => ({
                purchaseOrderLineId: line.purchaseOrderLineId,
                quantityReceivedNow: Number(receiveDraft.quantities[line.purchaseOrderLineId] ?? '0'),
            }))
            .filter((line) => line.quantityReceivedNow > 0)

        if (lines.length === 0) {
            toast.error('Enter at least one received quantity above zero.')
            return
        }

        await receiveMutation.mutateAsync({
            purchaseOrderId: order.purchaseOrderId,
            notes: receiveDraft.notes.trim(),
            lines,
        })
    }

    return (
        <main className="space-y-6">
            <div className="flex items-center justify-end gap-3 md:justify-between">
                <Button variant="outline" onClick={() => navigate({ to: '/app/purchase-orders' })} className="hidden md:inline-flex">
                    <ArrowLeft className="size-4" />
                    Back to Purchase Orders
                </Button>
                {order && (
                    <Badge variant="outline" className={`w-fit ${getStatusBadgeClassName(order.status)}`}>
                        {formatStatusLabel(order.status)}
                    </Badge>
                )}
            </div>

            {isEditing && order && (
                <PurchaseOrderDraftFormCard
                    title="Edit Purchase Order"
                    description="Update the selected purchase order draft."
                    submitLabel="Save Changes"
                    cancelLabel="Close"
                    submitLoading={updateMutation.isPending}
                    formState={formState}
                    setFormState={setFormState}
                    formError={formError}
                    suppliers={suppliersQuery.data?.data ?? []}
                    warehouses={warehousesQuery.data?.data ?? []}
                    products={productsQuery.data?.data ?? []}
                    onSubmit={handleSaveDraft}
                    onCancel={closeEdit}
                />
            )}

            {orderStatus === PURCHASE_ORDER_STATUS.CHANGES_REQUESTED && (
                <Card className="border-destructive/30 bg-destructive/10">
                    <CardHeader>
                        <CardTitle className="text-base">Changes requested</CardTitle>
                        <CardDescription>Review this feedback before updating and resubmitting the purchase order.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {approvalHistoryQuery.isLoading ? (
                            <p className="text-sm text-muted-foreground">Loading reviewer comment...</p>
                        ) : (
                            <p className="text-sm text-foreground">{latestChangeRequestComment ?? 'No comment was provided for this return.'}</p>
                        )}
                    </CardContent>
                </Card>
            )}

            <Card className="bg-surface/95">
                <CardHeader>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <CardTitle>{order?.purchaseOrderNumber ?? 'Purchase Order Detail'}</CardTitle>
                            <CardDescription>View full purchase order details and manage the next available actions.</CardDescription>
                        </div>
                        {order && (
                            <div className="flex flex-wrap gap-2">
                                {canEditDraft && (
                                    <Button variant="outline" onClick={openEdit}>
                                        Edit
                                    </Button>
                                )}
                                {canSubmitDraft && (
                                    <Button
                                        onClick={() => submitMutation.mutate(order.purchaseOrderId)}
                                        loading={submitMutation.isPending}
                                    >
                                        Submit
                                    </Button>
                                )}
                                {canDeleteDraft && (
                                    <Button
                                        variant="destructive"
                                        onClick={() => {
                                            if (!window.confirm(`Delete draft ${order.purchaseOrderNumber}?`)) {
                                                return
                                            }

                                            deleteDraftMutation.mutate(order.purchaseOrderId)
                                        }}
                                        loading={deleteDraftMutation.isPending}
                                    >
                                        Delete Draft
                                    </Button>
                                )}
                                {canCancelOrder && (
                                    <Button
                                        variant="destructive"
                                        onClick={() => {
                                            if (!window.confirm(`Cancel ${order.purchaseOrderNumber}?`)) {
                                                return
                                            }

                                            cancelMutation.mutate(order.purchaseOrderId)
                                        }}
                                        loading={cancelMutation.isPending}
                                    >
                                        Cancel Order
                                    </Button>
                                )}
                                {canReceiveGoods && (
                                    <Button variant="secondary" onClick={openReceive}>
                                        Receive Goods
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {detailQuery.isLoading ? (
                        <p className="text-sm text-muted-foreground">Loading purchase order detail...</p>
                    ) : detailQuery.isError || !order ? (
                        <p className="text-sm text-destructive">Unable to load purchase order detail.</p>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2">
                            <p><span className="text-muted-foreground">Supplier:</span> {supplierNames[order.supplierId] ?? order.supplierId}</p>
                            <p><span className="text-muted-foreground">Warehouse:</span> {order.warehouseName ?? warehouseNames[order.warehouseId] ?? order.warehouseId}</p>
                            <p><span className="text-muted-foreground">Ordered:</span> {new Date(order.orderedAt).toLocaleString()}</p>
                            <p><span className="text-muted-foreground">Expected Arrival:</span> {order.expectedArrivalDate ? new Date(order.expectedArrivalDate).toLocaleDateString() : '—'}</p>
                            <p><span className="text-muted-foreground">Purchase Order ID:</span> {order.purchaseOrderId}</p>
                            <p><span className="text-muted-foreground">Status:</span> {formatStatusLabel(order.status)}</p>
                            <p className="md:col-span-2"><span className="text-muted-foreground">Notes:</span> {order.notes || '—'}</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {order && (
                <Card className="bg-surface/95">
                    <CardHeader>
                        <CardTitle>Order Lines</CardTitle>
                        <CardDescription>Line items included on this purchase order.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {!order.lines?.length ? (
                            <p className="text-sm text-muted-foreground">No lines are attached to this purchase order.</p>
                        ) : (
                            <div className="overflow-x-auto rounded-lg border border-border">
                                <table className="w-max min-w-full divide-y divide-border text-sm">
                                    <thead className="bg-muted/40 text-left text-muted-foreground">
                                        <tr>
                                            <th className="px-4 py-3 font-medium">Product</th>
                                            <th className="px-4 py-3 font-medium">Ordered</th>
                                            <th className="px-4 py-3 font-medium">Received</th>
                                            <th className="px-4 py-3 font-medium">Unit Cost</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {order.lines.map((line) => (
                                            <tr key={line.purchaseOrderLineId}>
                                                <td className="px-4 py-3">{line.productName ?? productNames[line.productId] ?? line.productId}</td>
                                                <td className="px-4 py-3">{line.quantityOrdered}</td>
                                                <td className="px-4 py-3">{line.quantityReceived}</td>
                                                <td className="px-4 py-3">{line.unitCost}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {order && canReceiveGoods && isReceiveOpen && (
                <Card className="bg-surface/95">
                    <CardHeader>
                        <CardTitle>Receive Goods</CardTitle>
                        <CardDescription>Record received quantities for the outstanding purchase order lines.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {!order.lines?.some((line) => line.quantityReceived < line.quantityOrdered) ? (
                            <p className="text-sm text-muted-foreground">All lines on this purchase order have already been received.</p>
                        ) : (
                            <>
                                <div className="grid gap-3">
                                    {order.lines
                                        .filter((line) => line.quantityReceived < line.quantityOrdered)
                                        .map((line) => {
                                            const remaining = line.quantityOrdered - line.quantityReceived

                                            return (
                                                <div key={line.purchaseOrderLineId} className="grid gap-3 rounded-xl border border-border/50 p-3 md:grid-cols-[1.6fr_0.8fr]">
                                                    <div>
                                                        <p className="text-sm font-medium">{line.productName ?? productNames[line.productId] ?? line.productId}</p>
                                                        <p className="text-xs text-muted-foreground">Remaining to receive: {remaining}</p>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor={`receive-${line.purchaseOrderLineId}`}>Quantity received now</Label>
                                                        <Input
                                                            id={`receive-${line.purchaseOrderLineId}`}
                                                            type="number"
                                                            min="0"
                                                            max={String(remaining)}
                                                            value={receiveDraft.quantities[line.purchaseOrderLineId] ?? ''}
                                                            onChange={(event) => setReceiveDraft((current) => ({
                                                                ...current,
                                                                quantities: {
                                                                    ...current.quantities,
                                                                    [line.purchaseOrderLineId]: event.target.value,
                                                                },
                                                            }))}
                                                        />
                                                    </div>
                                                </div>
                                            )
                                        })}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="receiveNotes">Receipt notes</Label>
                                    <Textarea
                                        id="receiveNotes"
                                        value={receiveDraft.notes}
                                        onChange={(event) => setReceiveDraft((current) => ({ ...current, notes: event.target.value }))}
                                        placeholder="Optional delivery note"
                                    />
                                </div>

                                <div className="flex flex-wrap gap-3">
                                    <Button onClick={handleReceive} loading={receiveMutation.isPending}>
                                        Confirm Receipt
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            setIsReceiveOpen(false)
                                            setReceiveDraft({ notes: '', quantities: {} })
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            )}
        </main>
    )
}