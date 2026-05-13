import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { getApiErrorMessage } from '@/api/types'
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Textarea, toast } from '@/components/ui'
import { formatStatusLabel, getStatusBadgeClassName } from '@/lib/status-badge'
import {
    APPROVAL_DECISION_STATUS,
    APPROVAL_DOCUMENT_TYPE,
    fetchApprovalHistory,
    type ApprovalDocumentType,
} from '@/services/approvals.service'
import {
    approvePurchaseOrder,
    cancelPurchaseOrder,
    fetchPurchaseOrderById,
    returnPurchaseOrder,
    type PurchaseOrderItem,
} from '@/services/purchase-orders.service'
import {
    approveTransferRequest,
    cancelTransferRequest,
    fetchTransferRequestById,
    returnTransferRequest,
    type TransferRequestItem,
} from '@/services/transfer-requests.service'
import {
    approveStockAdjustment,
    cancelStockAdjustment,
    fetchStockAdjustmentById,
    returnStockAdjustment,
    type StockAdjustmentItem,
} from '@/services/stock-adjustments.service'
import { fetchProducts } from '@/services/products.service'
import { fetchSuppliers } from '@/services/suppliers.service'
import { fetchWarehouses } from '@/services/warehouses.service'
import { STOCK_ADJUSTMENT_STATUS, TRANSFER_REQUEST_STATUS } from '@/lib/domain-values'

type ApprovalDocumentDetail = PurchaseOrderItem | TransferRequestItem | StockAdjustmentItem

type SelectedDocument = {
    documentType: ApprovalDocumentType
    documentId: string
}

type ApprovalLookupData = {
    productNames: Record<string, string>
    warehouseNames: Record<string, string>
    supplierNames: Record<string, string>
}

function resolveDocumentType(value: string): ApprovalDocumentType | null {
    const validValues = Object.values(APPROVAL_DOCUMENT_TYPE)
    if (validValues.includes(value as ApprovalDocumentType)) {
        return value as ApprovalDocumentType
    }

    return null
}

function getDocumentLabel(documentType: ApprovalDocumentType) {
    switch (documentType) {
        case APPROVAL_DOCUMENT_TYPE.PURCHASE_ORDER:
            return 'Purchase order'
        case APPROVAL_DOCUMENT_TYPE.STOCK_ADJUSTMENT:
            return 'Stock adjustment'
        case APPROVAL_DOCUMENT_TYPE.TRANSFER_REQUEST:
            return 'Transfer request'
        default:
            return documentType
    }
}

function getDocumentNumber(detail: ApprovalDocumentDetail, documentType: ApprovalDocumentType) {
    switch (documentType) {
        case APPROVAL_DOCUMENT_TYPE.PURCHASE_ORDER:
            return (detail as PurchaseOrderItem).purchaseOrderNumber
        case APPROVAL_DOCUMENT_TYPE.STOCK_ADJUSTMENT:
            return (detail as StockAdjustmentItem).adjustmentNumber
        case APPROVAL_DOCUMENT_TYPE.TRANSFER_REQUEST:
            return (detail as TransferRequestItem).transferNumber
        default:
            return 'Selected document'
    }
}

function resolveProductLabel(productId: string, fallbackName: string | null | undefined, lookupData: ApprovalLookupData) {
    return fallbackName ?? lookupData.productNames[productId] ?? productId
}

function renderDetailSummary(detail: ApprovalDocumentDetail, documentType: ApprovalDocumentType, lookupData: ApprovalLookupData) {
    switch (documentType) {
        case APPROVAL_DOCUMENT_TYPE.PURCHASE_ORDER: {
            const purchaseOrder = detail as PurchaseOrderItem

            return (
                <div className="grid gap-3 text-sm sm:grid-cols-2">
                    <div><p className="text-muted-foreground">Supplier</p><p className="font-medium">{lookupData.supplierNames[purchaseOrder.supplierId] ?? purchaseOrder.supplierId}</p></div>
                    <div><p className="text-muted-foreground">Warehouse</p><p className="font-medium">{purchaseOrder.warehouseName ?? lookupData.warehouseNames[purchaseOrder.warehouseId] ?? purchaseOrder.warehouseId}</p></div>
                    <div><p className="text-muted-foreground">Ordered</p><p className="font-medium">{new Date(purchaseOrder.orderedAt).toLocaleString()}</p></div>
                    <div><p className="text-muted-foreground">Expected arrival</p><p className="font-medium">{purchaseOrder.expectedArrivalDate ? new Date(purchaseOrder.expectedArrivalDate).toLocaleDateString() : 'Not set'}</p></div>
                    <div><p className="text-muted-foreground">Lines</p><p className="font-medium">{purchaseOrder.lines?.length ?? 0}</p></div>
                    <div><p className="text-muted-foreground">Notes</p><p className="font-medium">{purchaseOrder.notes || 'None'}</p></div>
                </div>
            )
        }
        case APPROVAL_DOCUMENT_TYPE.TRANSFER_REQUEST: {
            const transferRequest = detail as TransferRequestItem

            return (
                <div className="grid gap-3 text-sm sm:grid-cols-2">
                    <div><p className="text-muted-foreground">From</p><p className="font-medium">{lookupData.warehouseNames[transferRequest.sourceWarehouseId] ?? transferRequest.sourceWarehouseId}</p></div>
                    <div><p className="text-muted-foreground">To</p><p className="font-medium">{lookupData.warehouseNames[transferRequest.destinationWarehouseId] ?? transferRequest.destinationWarehouseId}</p></div>
                    <div><p className="text-muted-foreground">Requested</p><p className="font-medium">{new Date(transferRequest.requestedAt).toLocaleString()}</p></div>
                    <div><p className="text-muted-foreground">{TRANSFER_REQUEST_STATUS.COMPLETED}</p><p className="font-medium">{transferRequest.completedAt ? new Date(transferRequest.completedAt).toLocaleString() : 'Not completed'}</p></div>
                    <div><p className="text-muted-foreground">Lines</p><p className="font-medium">{transferRequest.lines.length}</p></div>
                    <div><p className="text-muted-foreground">Notes</p><p className="font-medium">{transferRequest.notes || 'None'}</p></div>
                </div>
            )
        }
        case APPROVAL_DOCUMENT_TYPE.STOCK_ADJUSTMENT: {
            const stockAdjustment = detail as StockAdjustmentItem

            return (
                <div className="grid gap-3 text-sm sm:grid-cols-2">
                    <div><p className="text-muted-foreground">Warehouse</p><p className="font-medium">{lookupData.warehouseNames[stockAdjustment.warehouseId] ?? stockAdjustment.warehouseId}</p></div>
                    <div><p className="text-muted-foreground">Reason</p><p className="font-medium">{stockAdjustment.reason}</p></div>
                    <div><p className="text-muted-foreground">Requested</p><p className="font-medium">{new Date(stockAdjustment.requestedAt).toLocaleString()}</p></div>
                    <div><p className="text-muted-foreground">{STOCK_ADJUSTMENT_STATUS.APPLIED}</p><p className="font-medium">{stockAdjustment.appliedAt ? new Date(stockAdjustment.appliedAt).toLocaleString() : 'Not applied'}</p></div>
                    <div><p className="text-muted-foreground">Lines</p><p className="font-medium">{stockAdjustment.lines?.length ?? 0}</p></div>
                    <div><p className="text-muted-foreground">Notes</p><p className="font-medium">{stockAdjustment.notes || 'None'}</p></div>
                </div>
            )
        }
        default:
            return null
    }
}

function renderLineDetails(detail: ApprovalDocumentDetail, documentType: ApprovalDocumentType, lookupData: ApprovalLookupData) {
    switch (documentType) {
        case APPROVAL_DOCUMENT_TYPE.PURCHASE_ORDER: {
            const purchaseOrder = detail as PurchaseOrderItem

            if (!purchaseOrder.lines?.length) {
                return <p className="text-sm text-muted-foreground">No lines are attached to this purchase order.</p>
            }

            return (
                <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-max min-w-full divide-y divide-border text-sm">
                        <thead className="bg-muted/40 text-left text-muted-foreground">
                            <tr>
                                <th className="px-4 py-3 font-medium">Product</th>
                                <th className="px-4 py-3 font-medium">Ordered</th>
                                <th className="px-4 py-3 font-medium">Received</th>
                                <th className="px-4 py-3 font-medium">Unit cost</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {purchaseOrder.lines.map((line) => (
                                <tr key={line.purchaseOrderLineId}>
                                    <td className="px-4 py-3">{resolveProductLabel(line.productId, line.productName, lookupData)}</td>
                                    <td className="px-4 py-3">{line.quantityOrdered}</td>
                                    <td className="px-4 py-3">{line.quantityReceived}</td>
                                    <td className="px-4 py-3">{line.unitCost}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )
        }
        case APPROVAL_DOCUMENT_TYPE.TRANSFER_REQUEST: {
            const transferRequest = detail as TransferRequestItem

            if (!transferRequest.lines?.length) {
                return <p className="text-sm text-muted-foreground">No lines are attached to this transfer request.</p>
            }

            return (
                <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-max min-w-full divide-y divide-border text-sm">
                        <thead className="bg-muted/40 text-left text-muted-foreground">
                            <tr>
                                <th className="px-4 py-3 font-medium">Product</th>
                                <th className="px-4 py-3 font-medium">Requested</th>
                                <th className="px-4 py-3 font-medium">Transferred</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {transferRequest.lines.map((line) => (
                                <tr key={line.transferRequestLineId}>
                                    <td className="px-4 py-3">{resolveProductLabel(line.productId, null, lookupData)}</td>
                                    <td className="px-4 py-3">{line.quantityRequested}</td>
                                    <td className="px-4 py-3">{line.quantityTransferred}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )
        }
        case APPROVAL_DOCUMENT_TYPE.STOCK_ADJUSTMENT: {
            const stockAdjustment = detail as StockAdjustmentItem

            if (!stockAdjustment.lines?.length) {
                return <p className="text-sm text-muted-foreground">No lines are attached to this stock adjustment.</p>
            }

            return (
                <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-max min-w-full divide-y divide-border text-sm">
                        <thead className="bg-muted/40 text-left text-muted-foreground">
                            <tr>
                                <th className="px-4 py-3 font-medium">Product</th>
                                <th className="px-4 py-3 font-medium">Before</th>
                                <th className="px-4 py-3 font-medium">After</th>
                                <th className="px-4 py-3 font-medium">Delta</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {stockAdjustment.lines.map((line) => (
                                <tr key={line.stockAdjustmentLineId}>
                                    <td className="px-4 py-3">{resolveProductLabel(line.productId, null, lookupData)}</td>
                                    <td className="px-4 py-3">{line.quantityBefore}</td>
                                    <td className="px-4 py-3">{line.quantityAfter}</td>
                                    <td className="px-4 py-3">{line.delta}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )
        }
        default:
            return null
    }
}

export function ApprovalDetailPage() {
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const params = useParams({ strict: false }) as { documentType?: string; documentId?: string }
    const [decisionComment, setDecisionComment] = useState('')

    const documentType = useMemo(() => resolveDocumentType(params.documentType ?? ''), [params.documentType])
    const documentId = params.documentId ?? ''
    const selectedDocument = useMemo<SelectedDocument | null>(() => {
        if (!documentType || !documentId) {
            return null
        }

        return {
            documentType,
            documentId,
        }
    }, [documentType, documentId])

    const detailQuery = useQuery({
        queryKey: ['approval-document', selectedDocument?.documentType, selectedDocument?.documentId],
        enabled: Boolean(selectedDocument),
        queryFn: async () => {
            if (!selectedDocument) {
                throw new Error('No document selected.')
            }

            switch (selectedDocument.documentType) {
                case APPROVAL_DOCUMENT_TYPE.PURCHASE_ORDER:
                    return fetchPurchaseOrderById(selectedDocument.documentId)
                case APPROVAL_DOCUMENT_TYPE.STOCK_ADJUSTMENT:
                    return fetchStockAdjustmentById(selectedDocument.documentId)
                case APPROVAL_DOCUMENT_TYPE.TRANSFER_REQUEST:
                    return fetchTransferRequestById(selectedDocument.documentId)
                default:
                    throw new Error('Unsupported approval document type.')
            }
        },
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

    const historyQuery = useQuery({
        queryKey: ['approval-history', selectedDocument?.documentType, selectedDocument?.documentId],
        enabled: Boolean(selectedDocument),
        queryFn: () => {
            if (!selectedDocument) {
                throw new Error('No document selected.')
            }

            return fetchApprovalHistory(selectedDocument.documentType, selectedDocument.documentId, { pageNumber: 1, pageSize: 20 })
        },
    })

    const refreshApprovals = async () => {
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['approvals'] }),
            queryClient.invalidateQueries({ queryKey: ['approval-history'] }),
            queryClient.invalidateQueries({ queryKey: ['approval-document'] }),
            queryClient.invalidateQueries({ queryKey: ['purchase-orders'] }),
            queryClient.invalidateQueries({ queryKey: ['transfer-requests'] }),
            queryClient.invalidateQueries({ queryKey: ['stock-adjustments'] }),
            queryClient.invalidateQueries({ queryKey: ['purchase-order-detail'] }),
            queryClient.invalidateQueries({ queryKey: ['transfer-request-detail'] }),
            queryClient.invalidateQueries({ queryKey: ['stock-adjustment-detail'] }),
        ])
    }

    const approveMutation = useMutation({
        mutationFn: async (selection: SelectedDocument) => {
            switch (selection.documentType) {
                case APPROVAL_DOCUMENT_TYPE.PURCHASE_ORDER:
                    return approvePurchaseOrder(selection.documentId)
                case APPROVAL_DOCUMENT_TYPE.STOCK_ADJUSTMENT:
                    return approveStockAdjustment(selection.documentId)
                case APPROVAL_DOCUMENT_TYPE.TRANSFER_REQUEST:
                    return approveTransferRequest(selection.documentId)
                default:
                    throw new Error('Unsupported approval document type.')
            }
        },
        onSuccess: async () => {
            await refreshApprovals()
            setDecisionComment('')
            toast.success('Approval recorded.')
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, 'Unable to approve this document.'))
        },
    })

    const requestChangesMutation = useMutation({
        mutationFn: async ({ selection, comment }: { selection: SelectedDocument; comment: string }) => {
            switch (selection.documentType) {
                case APPROVAL_DOCUMENT_TYPE.PURCHASE_ORDER:
                    return returnPurchaseOrder(selection.documentId, comment)
                case APPROVAL_DOCUMENT_TYPE.STOCK_ADJUSTMENT:
                    return returnStockAdjustment(selection.documentId, comment)
                case APPROVAL_DOCUMENT_TYPE.TRANSFER_REQUEST:
                    return returnTransferRequest(selection.documentId, comment)
                default:
                    throw new Error('Unsupported approval document type.')
            }
        },
        onSuccess: async () => {
            await refreshApprovals()
            setDecisionComment('')
            toast.success('Change request sent.')
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, 'Unable to request changes for this document.'))
        },
    })

    const cancelMutation = useMutation({
        mutationFn: async (selection: SelectedDocument) => {
            switch (selection.documentType) {
                case APPROVAL_DOCUMENT_TYPE.PURCHASE_ORDER:
                    return cancelPurchaseOrder(selection.documentId)
                case APPROVAL_DOCUMENT_TYPE.STOCK_ADJUSTMENT:
                    return cancelStockAdjustment(selection.documentId)
                case APPROVAL_DOCUMENT_TYPE.TRANSFER_REQUEST:
                    return cancelTransferRequest(selection.documentId)
                default:
                    throw new Error('Unsupported approval document type.')
            }
        },
        onSuccess: async () => {
            await refreshApprovals()
            setDecisionComment('')
            toast.success('Document cancelled.')
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, 'Unable to cancel this document.'))
        },
    })

    const latestHistory = historyQuery.data?.data?.[0] ?? null
    const canDecide = latestHistory?.status === APPROVAL_DECISION_STATUS.PENDING
    const lookupData = useMemo<ApprovalLookupData>(() => {
        return {
            productNames: Object.fromEntries((productsQuery.data?.data ?? []).map((product) => [product.productId, `${product.name} (${product.sku})`])),
            warehouseNames: Object.fromEntries((warehousesQuery.data?.data ?? []).map((warehouse) => [warehouse.warehouseId, warehouse.name])),
            supplierNames: Object.fromEntries((suppliersQuery.data?.data ?? []).map((supplier) => [supplier.supplierId, supplier.name])),
        }
    }, [productsQuery.data, warehousesQuery.data, suppliersQuery.data])

    return (
        <main className="space-y-6">
            <div className="flex items-center justify-end gap-3 md:justify-between">
                <Button variant="outline" onClick={() => navigate({ to: '/app/approvals' })} className="hidden md:inline-flex">
                    <ArrowLeft className="size-4" />
                    Back to Approvals
                </Button>
                {latestHistory && (
                    <Badge variant="outline" className={`w-fit ${getStatusBadgeClassName(latestHistory.status)}`}>
                        {formatStatusLabel(latestHistory.status)}
                    </Badge>
                )}
            </div>

            {!selectedDocument ? (
                <Card className="bg-surface/95">
                    <CardContent className="p-5">
                        <p className="text-sm text-destructive">Invalid approval document route.</p>
                    </CardContent>
                </Card>
            ) : (
                <>
                    <Card className="bg-surface/95">
                        <CardHeader>
                            <CardTitle>{getDocumentLabel(selectedDocument.documentType)} details</CardTitle>
                            <CardDescription>Review the document context before making your approval decision.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {detailQuery.isLoading ? (
                                <p className="text-sm text-muted-foreground">Loading document details...</p>
                            ) : detailQuery.isError || !detailQuery.data ? (
                                <p className="text-sm text-destructive">Unable to load document details.</p>
                            ) : (
                                <div className="rounded-2xl border border-border/60 p-4">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h2 className="text-lg font-semibold">{getDocumentNumber(detailQuery.data, selectedDocument.documentType)}</h2>
                                        {latestHistory && (
                                            <Badge variant="outline" className={getStatusBadgeClassName(latestHistory.status)}>
                                                {formatStatusLabel(latestHistory.status)}
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="mt-1 text-sm text-muted-foreground">{getDocumentLabel(selectedDocument.documentType)}</p>
                                    <div className="mt-4">
                                        {renderDetailSummary(detailQuery.data, selectedDocument.documentType, lookupData)}
                                    </div>
                                    <div className="mt-6 space-y-3">
                                        <h3 className="text-sm font-medium">Line details</h3>
                                        {renderLineDetails(detailQuery.data, selectedDocument.documentType, lookupData)}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {canDecide && selectedDocument && (
                        <Card className="bg-surface/95">
                            <CardHeader>
                                <CardTitle>Decision</CardTitle>
                                <CardDescription>Add a comment when requesting changes, or cancel when this document should not proceed.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="space-y-2">
                                    <label htmlFor="approvalComment" className="text-sm font-medium text-foreground">Comment</label>
                                    <Textarea
                                        id="approvalComment"
                                        value={decisionComment}
                                        onChange={(event) => setDecisionComment(event.target.value)}
                                        placeholder="Explain what should change before this moves forward."
                                    />
                                </div>
                                <div className="flex flex-wrap gap-3">
                                    <Button onClick={() => approveMutation.mutate(selectedDocument)} loading={approveMutation.isPending}>
                                        Approve
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            if (!decisionComment.trim()) {
                                                toast.error('Add a comment before requesting changes.')
                                                return
                                            }

                                            requestChangesMutation.mutate({ selection: selectedDocument, comment: decisionComment.trim() })
                                        }}
                                        loading={requestChangesMutation.isPending}
                                    >
                                        Request changes
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        onClick={() => {
                                            if (!window.confirm('Cancel this document?')) {
                                                return
                                            }

                                            cancelMutation.mutate(selectedDocument)
                                        }}
                                        loading={cancelMutation.isPending}
                                    >
                                        Cancel document
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <Card className="bg-surface/95">
                        <CardHeader>
                            <CardTitle>Approval history</CardTitle>
                            <CardDescription>Latest approval activity for this document.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {historyQuery.isLoading ? (
                                <p className="text-sm text-muted-foreground">Loading history...</p>
                            ) : historyQuery.data?.data.length ? (
                                <div className="space-y-3">
                                    {historyQuery.data.data.map((item) => (
                                        <div key={item.approvalRequestId} className="rounded-xl border border-border/50 p-3 text-sm">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <Badge variant="outline" className={getStatusBadgeClassName(item.status)}>
                                                    {formatStatusLabel(item.status)}
                                                </Badge>
                                                <span className="text-xs text-muted-foreground">{new Date(item.requestedAt).toLocaleString()}</span>
                                            </div>
                                            <div className="mt-2 space-y-1">
                                                <p><span className="text-muted-foreground">Requested by:</span> {item.requestedBy}</p>
                                                <p><span className="text-muted-foreground">Decided by:</span> {item.decidedBy ?? 'Pending'}</p>
                                                <p><span className="text-muted-foreground">Comment:</span> {item.comment ?? 'None'}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">No approval history found for this document.</p>
                            )}
                        </CardContent>
                    </Card>
                </>
            )}
        </main>
    )
}
