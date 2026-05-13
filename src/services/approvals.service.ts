import { apiClient } from "@/api/client";
import {
  APPROVAL_DECISION_STATUS,
  APPROVAL_DOCUMENT_TYPE,
  type ApprovalDecisionStatus,
  type ApprovalDocumentType,
} from "@/lib/domain-values";

export { APPROVAL_DECISION_STATUS, APPROVAL_DOCUMENT_TYPE };
export type { ApprovalDecisionStatus, ApprovalDocumentType };

export interface ApprovalRequestItem {
  approvalRequestId: string;
  documentType: ApprovalDocumentType;
  documentId: string;
  status: ApprovalDecisionStatus;
  requestedById: string;
  requestedBy: string;
  requestedAt: string;
  decidedById?: string | null;
  decidedBy?: string | null;
  decidedAt?: string | null;
  comment?: string | null;
}

export interface FetchApprovalsArgs {
  pageNumber: number;
  pageSize: number;
  status?: ApprovalDecisionStatus;
}

export async function fetchApprovals(args: FetchApprovalsArgs) {
  const { pageNumber, pageSize, status } = args;
  const params: Record<string, string | number> = { pageNumber, pageSize };

  if (status) {
    params.status = status;
  }

  return apiClient.getPaginated<ApprovalRequestItem>("/Approvals", params);
}

export async function fetchApprovalHistory(
  documentType: ApprovalDocumentType,
  documentId: string,
  args: {
    pageNumber: number;
    pageSize: number;
  },
) {
  const { pageNumber, pageSize } = args;
  const params: Record<string, string | number> = { pageNumber, pageSize };

  return apiClient.getPaginated<ApprovalRequestItem>(
    `/Approvals/${encodeURIComponent(documentType)}/${encodeURIComponent(
      documentId,
    )}/history`,
    params,
  );
}
