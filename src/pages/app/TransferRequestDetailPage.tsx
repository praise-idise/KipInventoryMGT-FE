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
    cancelTransferRequest,
    completeTransferRequest,
    deleteTransferRequestDraft,
    dispatchTransferRequest,
    fetchTransferRequestById,
    submitTransferRequest,
    TRANSFER_REQUEST_STATUS,
} from '@/services/transfer-requests.service'
import { fetchWarehouses } from '@/services/warehouses.service'

export function TransferRequestDetailPage() {
    const { transferRequestId } = useParams({ strict: false }) as { transferRequestId: string }
    const navigate = useNavigate()
    const queryClient = useQueryClient()

    const detailQuery = useQuery({
        queryKey: ['transfer-request-detail', transferRequestId],
        queryFn: () => fetchTransferRequestById(transferRequestId),
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
        queryKey: ['approval-history', APPROVAL_DOCUMENT_TYPE.TRANSFER_REQUEST, transferRequestId],
        queryFn: () => fetchApprovalHistory(APPROVAL_DOCUMENT_TYPE.TRANSFER_REQUEST, transferRequestId, { pageNumber: 1, pageSize: 20 }),
    })

    const transfer = detailQuery.data

    const warehouseNames = useMemo(() => {
        return Object.fromEntries((warehousesQuery.data?.data ?? []).map((warehouse) => [warehouse.warehouseId, warehouse.name]))
    }, [warehousesQuery.data])

    const productNames = useMemo(() => {
        return Object.fromEntries((productsQuery.data?.data ?? []).map((product) => [product.productId, `${product.name} (${product.sku})`]))
    }, [productsQuery.data])

    const refreshTransfer = async () => {
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['transfer-requests'] }),
            queryClient.invalidateQueries({ queryKey: ['transfer-request-detail', transferRequestId] }),
            queryClient.invalidateQueries({ queryKey: ['approvals'] }),
            queryClient.invalidateQueries({ queryKey: ['warehouse-detail'] }),
            queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] }),
        ])
    }

    const submitMutation = useMutation({
        mutationFn: submitTransferRequest,
        onSuccess: async (response) => {
            await refreshTransfer()
            toast.success(response.message || 'Transfer request submitted for approval.')
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, 'Unable to submit transfer request.'))
        },
    })

    const dispatchMutation = useMutation({
        mutationFn: dispatchTransferRequest,
        onSuccess: async () => {
            await refreshTransfer()
            toast.success('Transfer request dispatched.')
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, 'Unable to dispatch transfer request.'))
        },
    })

    const completeMutation = useMutation({
        mutationFn: completeTransferRequest,
        onSuccess: async () => {
            await refreshTransfer()
            toast.success('Transfer request completed.')
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, 'Unable to complete transfer request.'))
        },
    })

    const cancelMutation = useMutation({
        mutationFn: cancelTransferRequest,
        onSuccess: async () => {
            await refreshTransfer()
            toast.success('Transfer request cancelled.')
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, 'Unable to cancel transfer request.'))
        },
    })

    const deleteDraftMutation = useMutation({
        mutationFn: deleteTransferRequestDraft,
        onSuccess: async (response) => {
            await refreshTransfer()
            toast.success(response.message || 'Transfer request draft deleted.')
            navigate({ to: '/app/transfers' })
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, 'Unable to delete transfer request draft.'))
        },
    })

    const transferStatus = transfer?.status
    const canSubmitDraft = transferStatus === TRANSFER_REQUEST_STATUS.DRAFT || transferStatus === TRANSFER_REQUEST_STATUS.CHANGES_REQUESTED
    const canDeleteDraft = canSubmitDraft
    const canCancel = transferStatus === TRANSFER_REQUEST_STATUS.PENDING_APPROVAL || transferStatus === TRANSFER_REQUEST_STATUS.APPROVED
    const canDispatch = transferStatus === TRANSFER_REQUEST_STATUS.APPROVED
    const canComplete = transferStatus === TRANSFER_REQUEST_STATUS.IN_TRANSIT

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
                <Button variant="outline" onClick={() => navigate({ to: '/app/transfers' })} className="hidden md:inline-flex">
                    <ArrowLeft className="size-4" />
                    Back to Transfers
                </Button>
                {transfer && (
                    <Badge variant="outline" className={`w-fit ${getStatusBadgeClassName(transfer.status)}`}>
                        {formatStatusLabel(transfer.status)}
                    </Badge>
                )}
            </div>

            <Card className="bg-surface/95">
                <CardHeader>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <CardTitle>{transfer?.transferNumber ?? 'Transfer Request Detail'}</CardTitle>
                            <CardDescription>View transfer details and execute the next valid workflow action.</CardDescription>
                        </div>
                        {transfer && (
                            <div className="flex flex-wrap gap-2">
                                {canSubmitDraft && (
                                    <Button
                                        onClick={() => submitMutation.mutate(transfer.transferRequestId)}
                                        loading={submitMutation.isPending}
                                    >
                                        Submit
                                    </Button>
                                )}
                                {canDispatch && (
                                    <Button
                                        variant="outline"
                                        onClick={() => dispatchMutation.mutate(transfer.transferRequestId)}
                                        loading={dispatchMutation.isPending}
                                    >
                                        Dispatch
                                    </Button>
                                )}
                                {canComplete && (
                                    <Button
                                        variant="secondary"
                                        onClick={() => completeMutation.mutate(transfer.transferRequestId)}
                                        loading={completeMutation.isPending}
                                    >
                                        Complete
                                    </Button>
                                )}
                                {canDeleteDraft && (
                                    <Button
                                        variant="destructive"
                                        onClick={() => {
                                            if (!window.confirm(`Delete draft ${transfer.transferNumber}?`)) {
                                                return
                                            }

                                            deleteDraftMutation.mutate(transfer.transferRequestId)
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
                                            if (!window.confirm(`Cancel ${transfer.transferNumber}?`)) {
                                                return
                                            }

                                            cancelMutation.mutate(transfer.transferRequestId)
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
                        <p className="text-sm text-muted-foreground">Loading transfer request detail...</p>
                    ) : detailQuery.isError || !transfer ? (
                        <p className="text-sm text-destructive">Unable to load transfer request detail.</p>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2">
                            <p><span className="text-muted-foreground">Source:</span> {warehouseNames[transfer.sourceWarehouseId] ?? transfer.sourceWarehouseId}</p>
                            <p><span className="text-muted-foreground">Destination:</span> {warehouseNames[transfer.destinationWarehouseId] ?? transfer.destinationWarehouseId}</p>
                            <p><span className="text-muted-foreground">Requested:</span> {new Date(transfer.requestedAt).toLocaleString()}</p>
                            <p><span className="text-muted-foreground">Completed:</span> {transfer.completedAt ? new Date(transfer.completedAt).toLocaleString() : 'Not completed'}</p>
                            <p><span className="text-muted-foreground">Transfer ID:</span> {transfer.transferRequestId}</p>
                            <p><span className="text-muted-foreground">Status:</span> {formatStatusLabel(transfer.status)}</p>
                            <p className="md:col-span-2"><span className="text-muted-foreground">Notes:</span> {transfer.notes || '—'}</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {transferStatus === TRANSFER_REQUEST_STATUS.CHANGES_REQUESTED && (
                <Card className="border-destructive/30 bg-destructive/10">
                    <CardHeader>
                        <CardTitle className="text-base">Changes requested</CardTitle>
                        <CardDescription>Review this feedback before updating and resubmitting the transfer request.</CardDescription>
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

            {transfer && (
                <Card className="bg-surface/95">
                    <CardHeader>
                        <CardTitle>Transfer Lines</CardTitle>
                        <CardDescription>Line items included in this transfer request.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {!transfer.lines?.length ? (
                            <p className="text-sm text-muted-foreground">No lines are attached to this transfer request.</p>
                        ) : (
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
                                        {transfer.lines.map((line) => (
                                            <tr key={line.transferRequestLineId}>
                                                <td className="px-4 py-3">{productNames[line.productId] ?? line.productId}</td>
                                                <td className="px-4 py-3">{line.quantityRequested}</td>
                                                <td className="px-4 py-3">{line.quantityTransferred}</td>
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
