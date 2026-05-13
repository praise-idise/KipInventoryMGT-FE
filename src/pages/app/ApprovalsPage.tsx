import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui'
import { formatStatusLabel, getStatusBadgeClassName } from '@/lib/status-badge'
import {
    APPROVAL_DECISION_STATUS,
    fetchApprovals,
    type ApprovalDecisionStatus,
    type ApprovalDocumentType,
} from '@/services/approvals.service'

const approvalStatuses: ApprovalDecisionStatus[] = [
    APPROVAL_DECISION_STATUS.PENDING,
    APPROVAL_DECISION_STATUS.APPROVED,
    APPROVAL_DECISION_STATUS.CHANGES_REQUESTED,
    APPROVAL_DECISION_STATUS.CANCELLED,
]

function getDocumentLabel(documentType: ApprovalDocumentType) {
    switch (documentType) {
        case 'PurchaseOrder':
            return 'Purchase order'
        case 'StockAdjustment':
            return 'Stock adjustment'
        case 'TransferRequest':
            return 'Transfer request'
        default:
            return documentType
    }
}

export function ApprovalsPage() {
    const navigate = useNavigate()
    const [status, setStatus] = useState<ApprovalDecisionStatus>(APPROVAL_DECISION_STATUS.PENDING)
    const [pageNumber, setPageNumber] = useState(1)
    const pageSize = 10

    useEffect(() => {
        setPageNumber(1)
    }, [status])

    const approvalsQuery = useQuery({
        queryKey: ['approvals', status, pageNumber, pageSize],
        queryFn: () => fetchApprovals({ pageNumber, pageSize, status }),
    })

    const totalRecords = approvalsQuery.data?.pagination.totalRecords ?? 0
    const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize))

    return (
        <main className="space-y-6">
            <section className="rounded-3xl border border-border/60 bg-linear-to-br from-background via-background to-primary/5 p-6 shadow-sm">
                <Badge variant="outline" className="mb-3 border-primary/20 bg-primary/10 text-primary">Approvals</Badge>
                <h1 className="text-2xl font-semibold tracking-tight">Approval queue</h1>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                    Open each request in a dedicated detail page, review it fully, and take your decision there.
                </p>
            </section>

            <Card className="bg-surface/95">
                <CardHeader>
                    <CardTitle>{formatStatusLabel(status)} approvals</CardTitle>
                    <CardDescription>Review document decisions and actor metadata across approval statuses.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                        {approvalStatuses.map((statusOption) => (
                            <Button
                                key={statusOption}
                                size="sm"
                                variant={status === statusOption ? 'secondary' : 'outline'}
                                onClick={() => setStatus(statusOption)}
                            >
                                {formatStatusLabel(statusOption)}
                            </Button>
                        ))}
                    </div>

                    {approvalsQuery.isLoading ? (
                        <p className="text-sm text-muted-foreground">Loading approvals...</p>
                    ) : approvalsQuery.data?.data.length ? (
                        <div className="w-full max-w-full overflow-x-auto rounded-lg border border-border">
                            <table className="w-max min-w-full table-auto divide-y divide-border text-sm">
                                <thead className="bg-muted/40 text-left text-muted-foreground">
                                    <tr>
                                        <th className="px-4 py-3 font-medium whitespace-nowrap">Document</th>
                                        <th className="px-4 py-3 font-medium whitespace-nowrap">Requested by</th>
                                        <th className="px-4 py-3 font-medium whitespace-nowrap">Decided by</th>
                                        <th className="px-4 py-3 font-medium whitespace-nowrap">Requested</th>
                                        <th className="px-4 py-3 font-medium whitespace-nowrap">Decided</th>
                                        <th className="px-4 py-3 font-medium whitespace-nowrap">Status</th>
                                        <th className="w-56 min-w-56 px-4 py-3 font-medium whitespace-nowrap lg:sticky lg:right-0 lg:z-20 lg:border-l lg:border-border lg:bg-muted">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {approvalsQuery.data.data.map((item) => (
                                        <tr key={item.approvalRequestId} className="bg-surface">
                                            <td className="px-4 py-3 align-top">
                                                <div className="space-y-1">
                                                    <p className="font-medium text-foreground">{getDocumentLabel(item.documentType)}</p>
                                                    <p className="font-mono text-xs text-muted-foreground">{item.documentId}</p>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 align-top">{item.requestedBy}</td>
                                            <td className="px-4 py-3 align-top">{item.decidedBy ?? 'Pending'}</td>
                                            <td className="px-4 py-3 align-top">{new Date(item.requestedAt).toLocaleString()}</td>
                                            <td className="px-4 py-3 align-top">{item.decidedAt ? new Date(item.decidedAt).toLocaleString() : 'Pending'}</td>
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
                                                            to: '/app/approvals/$documentType/$documentId',
                                                            params: {
                                                                documentType: item.documentType,
                                                                documentId: item.documentId,
                                                            },
                                                        })}
                                                    >
                                                        View
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">No {formatStatusLabel(status).toLowerCase()} approvals found.</p>
                    )}
                </CardContent>
            </Card>

            {totalPages > 1 && (
                <div className="flex items-center justify-between gap-2">
                    <Button variant="outline" disabled={pageNumber === 1} onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}>
                        Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                        Page {pageNumber} of {totalPages} ({totalRecords} total)
                    </span>
                    <Button variant="outline" disabled={pageNumber === totalPages} onClick={() => setPageNumber(Math.min(totalPages, pageNumber + 1))}>
                        Next
                    </Button>
                </div>
            )}
        </main>
    )
}
