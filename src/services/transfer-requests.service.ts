import { apiClient } from "@/api/client";
import {
  TRANSFER_REQUEST_STATUS,
  type TransferRequestStatus,
} from "@/lib/domain-values";

export { TRANSFER_REQUEST_STATUS };
export type { TransferRequestStatus };

export interface TransferRequestLineItem {
  transferRequestLineId: string;
  productId: string;
  quantityRequested: number;
  quantityTransferred: number;
}

export interface TransferRequestItem {
  transferRequestId: string;
  transferNumber: string;
  sourceWarehouseId: string;
  destinationWarehouseId: string;
  status: TransferRequestStatus;
  requestedAt: string;
  completedAt?: string | null;
  notes?: string | null;
  lines: TransferRequestLineItem[];
}

export interface TransferRequestLineFormValues {
  productId: string;
  quantityRequested: number;
}

export interface TransferRequestDraftValues {
  sourceWarehouseId: string;
  destinationWarehouseId: string;
  notes: string;
  lines: TransferRequestLineFormValues[];
}

export async function fetchTransferRequests(args: {
  pageNumber: number;
  pageSize: number;
  searchTerm: string;
}) {
  const { pageNumber, pageSize, searchTerm } = args;
  if (searchTerm.trim()) {
    return apiClient.getPaginated<TransferRequestItem>(
      "/TransferRequests/search",
      {
        searchTerm,
        pageNumber,
        pageSize,
      },
    );
  }

  return apiClient.getPaginated<TransferRequestItem>("/TransferRequests", {
    pageNumber,
    pageSize,
  });
}

export async function fetchTransferRequestById(transferRequestId: string) {
  const response = await apiClient.get<TransferRequestItem>(
    `/TransferRequests/${encodeURIComponent(transferRequestId)}`,
  );
  return response.data;
}

export async function createTransferRequestDraft(
  values: TransferRequestDraftValues,
) {
  return apiClient.post<TransferRequestItem>(
    "/TransferRequests",
    {
      sourceWarehouseId: values.sourceWarehouseId,
      destinationWarehouseId: values.destinationWarehouseId,
      notes: values.notes || null,
      lines: values.lines.map((line) => ({
        productId: line.productId,
        quantityRequested: Number(line.quantityRequested),
      })),
    },
    crypto.randomUUID(),
  );
}

export async function updateTransferRequestDraft(
  transferRequestId: string,
  values: Partial<TransferRequestDraftValues>,
) {
  const payload: Record<string, unknown> = {};

  if ("sourceWarehouseId" in values) {
    payload.sourceWarehouseId = values.sourceWarehouseId;
  }

  if ("destinationWarehouseId" in values) {
    payload.destinationWarehouseId = values.destinationWarehouseId;
  }

  if ("notes" in values) {
    payload.notes = values.notes || null;
  }

  if ("lines" in values && values.lines) {
    payload.lines = values.lines.map((line) => ({
      productId: line.productId,
      quantityRequested: Number(line.quantityRequested),
    }));
  }

  return apiClient.patch<TransferRequestItem>(
    `/TransferRequests/${encodeURIComponent(transferRequestId)}/draft`,
    payload,
  );
}

export async function deleteTransferRequestDraft(transferRequestId: string) {
  return apiClient.delete<TransferRequestItem>(
    `/TransferRequests/${encodeURIComponent(transferRequestId)}/draft`,
  );
}

export async function submitTransferRequest(transferRequestId: string) {
  return apiClient.post<null>(
    `/TransferRequests/${encodeURIComponent(transferRequestId)}/submit`,
    {},
    crypto.randomUUID(),
  );
}

export async function approveTransferRequest(transferRequestId: string) {
  return apiClient.post<null>(
    `/TransferRequests/${encodeURIComponent(transferRequestId)}/approve`,
    {},
    crypto.randomUUID(),
  );
}

export async function returnTransferRequest(
  transferRequestId: string,
  comment: string,
) {
  return apiClient.post<null>(
    `/TransferRequests/${encodeURIComponent(transferRequestId)}/return`,
    { comment },
    crypto.randomUUID(),
  );
}

export async function dispatchTransferRequest(transferRequestId: string) {
  return apiClient.post<null>(
    `/TransferRequests/${encodeURIComponent(transferRequestId)}/dispatch`,
    {},
    crypto.randomUUID(),
  );
}

export async function completeTransferRequest(transferRequestId: string) {
  return apiClient.post<null>(
    `/TransferRequests/${encodeURIComponent(transferRequestId)}/complete`,
    {},
    crypto.randomUUID(),
  );
}

export async function cancelTransferRequest(transferRequestId: string) {
  return apiClient.post<null>(
    `/TransferRequests/${encodeURIComponent(transferRequestId)}/cancel`,
    {},
    crypto.randomUUID(),
  );
}
