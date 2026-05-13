import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { getApiErrorMessage } from '@/api/types'
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, toast } from '@/components/ui'
import { formatStatusLabel, getStatusBadgeClassName } from '@/lib/status-badge'
import { APPROVAL_DECISION_STATUS, APPROVAL_DOCUMENT_TYPE, fetchApprovalHistory } from '@/services/approvals.service'
import { fetchProducts } from '@/services/products.service'
import {
    applyStockAdjustment,
    cancelStockAdjustment,
    deleteStockAdjustmentDraft,
    fetchStockAdjustmentById,
    STOCK_ADJUSTMENT_STATUS,
    submitStockAdjustment,
} from '@/services/stock-adjustments.service'
import { fetchWarehouses } from '@/services/warehouses.service'

export function StockAdjustmentDetailPage() {
    const { stockAdjustmentId } = useParams({ strict: false }) as { stockAdjustmentId: string }
    const navigate = useNavigate()
    const queryClient = useQueryClient()

    const detailQuery = useQuery({
        queryKey: ['stock-adjustment-detail', stockAdjustmentId],
        queryFn: () => fetchStockAdjustmentById(stockAdjustmentId),
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
        queryKey: ['approval-history', APPROVAL_DOCUMENT_TYPE.STOCK_ADJUSTMENT, stockAdjustmentId],
        queryFn: () => fetchApprovalHistory(APPROVAL_DOCUMENT_TYPE.STOCK_ADJUSTMENT, stockAdjustmentId, { pageNumber: 1, pageSize: 20 }),
    })

    const adjustment = detailQuery.data

    const warehouseNames = useMemo(() => {
        return Object.fromEntries((warehousesQuery.data?.data ?? []).map((warehouse) => [warehouse.warehouseId, warehouse.name]))
    }, [warehousesQuery.data])

    const productNames = useMemo(() => {
        return Object.fromEntries((productsQuery.data?.data ?? []).map((product) => [product.productId, `${product.name} (${product.sku})`]))
    }, [productsQuery.data])

    const refreshAdjustment = async () => {
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['stock-adjustments'] }),
            queryClient.invalidateQueries({ queryKey: ['stock-adjustment-detail', stockAdjustmentId] }),
            queryClient.invalidateQueries({ queryKey: ['approvals'] }),
            queryClient.invalidateQueries({ queryKey: ['warehouse-detail'] }),
            queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] }),
        ])
    }

    const submitMutation = useMutation({
        mutationFn: submitStockAdjustment,
        onSuccess: async (response) => {
            await refreshAdjustment()
            toast.success(response.message || 'Stock adjustment submitted for approval.')
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, 'Unable to submit stock adjustment.'))
        },
    })

    const applyMutation = useMutation({
        mutationFn: applyStockAdjustment,
        onSuccess: async () => {
            await refreshAdjustment()
            toast.success('Stock adjustment applied.')
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, 'Unable to apply stock adjustment.'))
        },
    })

    const cancelMutation = useMutation({
        mutationFn: cancelStockAdjustment,
        onSuccess: async () => {
            await refreshAdjustment()
            toast.success('Stock adjustment cancelled.')
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, 'Unable to cancel stock adjustment.'))
        },
    })

    const deleteDraftMutation = useMutation({
        mutationFn: deleteStockAdjustmentDraft,
        onSuccess: async (response) => {
            await refreshAdjustment()
            toast.success(response.message || 'Stock adjustment draft deleted.')
            navigate({ to: '/app/stock-adjustments' })
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, 'Unable to delete stock adjustment draft.'))
        },
    })

    const adjustmentStatus = adjustment?.status
    const canSubmitDraft = adjustmentStatus === STOCK_ADJUSTMENT_STATUS.DRAFT || adjustmentStatus === STOCK_ADJUSTMENT_STATUS.CHANGES_REQUESTED
    const canDeleteDraft = canSubmitDraft
    const canCancel = adjustmentStatus === STOCK_ADJUSTMENT_STATUS.PENDING_APPROVAL || adjustmentStatus === STOCK_ADJUSTMENT_STATUS.APPROVED
    const canApply = adjustmentStatus === STOCK_ADJUSTMENT_STATUS.APPROVED

    const latestChangeRequestComment = useMemo(() => {
        const history = approvalHistoryQuery.data?.data ?? []
        const latestChangeRequest = history.find((item) => (
            item.status === APPROVAL_DECISION_STATUS.CHANGES_REQUESTED
            && typeof item.comment === 'string'
            && item.comment.trim().length > 0
        ))

        return latestChangeRequest?.comment?.trim() ?? null
    }, [approvalHistoryQuery.data])

    return (
        <main className="space-y-6">
            <div className="flex items-center justify-end gap-3 md:justify-between">
                <Button variant="outline" onClick={() => navigate({ to: '/app/stock-adjustments' })} className="hidden md:inline-flex">
                    <ArrowLeft className="size-4" />
                    Back to Stock Adjustments
                </Button>
                {adjustment && (
                    <Badge variant="outline" className={`w-fit ${getStatusBadgeClassName(adjustment.status)}`}>
                        {formatStatusLabel(adjustment.status)}
                    </Badge>
                )}
            </div>

            <Card className="bg-surface/95">
                <CardHeader>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <CardTitle>{adjustment?.adjustmentNumber ?? 'Stock Adjustment Detail'}</CardTitle>
                            <CardDescription>View adjustment details and execute the next valid workflow action.</CardDescription>
                        </div>
                        {adjustment && (
                            <div className="flex flex-wrap gap-2">
                                {canSubmitDraft && (
                                    <Button
                                        onClick={() => submitMutation.mutate(adjustment.stockAdjustmentId)}
                                        loading={submitMutation.isPending}
                                    >
                                        Submit
                                    </Button>
                                )}
                                {canApply && (
                                    <Button
                                        variant="secondary"
                                        onClick={() => applyMutation.mutate(adjustment.stockAdjustmentId)}
                                        loading={applyMutation.isPending}
                                    >
                                        Apply
                                    </Button>
                                )}
                                {canDeleteDraft && (
                                    <Button
                                        variant="destructive"
                                        onClick={() => {
                                            if (!window.confirm(`Delete draft ${adjustment.adjustmentNumber}?`)) {
                                                return
                                            }

                                            deleteDraftMutation.mutate(adjustment.stockAdjustmentId)
                                        }}
                                        loading={deleteDraftMutation.isPending}
                                    >
                                        Delete Draft
                                    </Button>
                                )}
                                {canCancel && (
                                    <Button
                                        variant="destructive"
                                        onClick={() => {
                                            if (!window.confirm(`Cancel ${adjustment.adjustmentNumber}?`)) {
                                                return
                                            }

                                            cancelMutation.mutate(adjustment.stockAdjustmentId)
                                        }}
                                        loading={cancelMutation.isPending}
                                    >
                                        Cancel
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {detailQuery.isLoading ? (
                        <p className="text-sm text-muted-foreground">Loading stock adjustment detail...</p>
                    ) : detailQuery.isError || !adjustment ? (
                        <p className="text-sm text-destructive">Unable to load stock adjustment detail.</p>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2">
                            <p><span className="text-muted-foreground">Warehouse:</span> {warehouseNames[adjustment.warehouseId] ?? adjustment.warehouseId}</p>
                            <p><span className="text-muted-foreground">Reason:</span> {adjustment.reason}</p>
                            <p><span className="text-muted-foreground">Requested:</span> {new Date(adjustment.requestedAt).toLocaleString()}</p>
                            <p><span className="text-muted-foreground">Applied:</span> {adjustment.appliedAt ? new Date(adjustment.appliedAt).toLocaleString() : 'Not applied'}</p>
                            <p><span className="text-muted-foreground">Adjustment ID:</span> {adjustment.stockAdjustmentId}</p>
                            <p><span className="text-muted-foreground">Status:</span> {formatStatusLabel(adjustment.status)}</p>
                            <p className="md:col-span-2"><span className="text-muted-foreground">Notes:</span> {adjustment.notes || '—'}</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {adjustmentStatus === STOCK_ADJUSTMENT_STATUS.CHANGES_REQUESTED && (
                <Card className="border-destructive/30 bg-destructive/10">
                    <CardHeader>
                        <CardTitle className="text-base">Changes requested</CardTitle>
                        <CardDescription>Review this feedback before updating and resubmitting the stock adjustment.</CardDescription>
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

            {adjustment && (
                <Card className="bg-surface/95">
                    <CardHeader>
                        <CardTitle>Adjustment Lines</CardTitle>
                        <CardDescription>Line items included in this stock adjustment.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {!adjustment.lines?.length ? (
                            <p className="text-sm text-muted-foreground">No lines are attached to this stock adjustment.</p>
                        ) : (
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
                                        {adjustment.lines.map((line) => (
                                            <tr key={line.stockAdjustmentLineId}>
                                                <td className="px-4 py-3">{productNames[line.productId] ?? line.productId}</td>
                                                <td className="px-4 py-3">{line.quantityBefore}</td>
                                                <td className="px-4 py-3">{line.quantityAfter}</td>
                                                <td className="px-4 py-3">{line.delta}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </main>
    )
}
