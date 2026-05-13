import { apiClient } from "@/api/client";
import {
  PURCHASE_ORDER_STATUS,
  type PurchaseOrderStatus,
} from "@/lib/domain-values";

export { PURCHASE_ORDER_STATUS };
export type { PurchaseOrderStatus };

export interface PurchaseOrderLineItem {
  purchaseOrderLineId: string;
  productId: string;
  productName?: string | null;
  sku?: string | null;
  quantityOrdered: number;
  quantityReceived: number;
  unitCost: number;
}

export interface PurchaseOrderItem {
  purchaseOrderId: string;
  purchaseOrderNumber: string;
  supplierId: string;
  warehouseId: string;
  warehouseName?: string | null;
  warehouseState?: string | null;
  status: PurchaseOrderStatus;
  orderedAt: string;
  expectedArrivalDate?: string | null;
  notes?: string | null;
  lines?: PurchaseOrderLineItem[] | null;
}

export interface PurchaseOrderLineFormValues {
  productId: string;
  quantityOrdered: number;
  unitCost: number;
}

export interface PurchaseOrderDraftValues {
  supplierId: string;
  warehouseId: string;
  expectedArrivalDate: string;
  notes: string;
  lines: PurchaseOrderLineFormValues[];
}

function toUtcDateTime(value: string) {
  return value ? `${value}T00:00:00Z` : null;
}

function buildDraftPayload(values: Partial<PurchaseOrderDraftValues>) {
  const payload: Record<string, unknown> = {};

  if ("supplierId" in values) payload.supplierId = values.supplierId;
  if ("warehouseId" in values) payload.warehouseId = values.warehouseId;
  if ("expectedArrivalDate" in values) {
    payload.expectedArrivalDate = toUtcDateTime(
      values.expectedArrivalDate ?? "",
    );
  }
  if ("notes" in values) payload.notes = values.notes || null;
  if ("lines" in values && values.lines) {
    payload.lines = values.lines.map((line) => ({
      productId: line.productId,
      quantityOrdered: Number(line.quantityOrdered),
      unitCost: Number(line.unitCost),
    }));
  }

  return payload;
}

export async function fetchPurchaseOrders(args: {
  pageNumber: number;
  pageSize: number;
  searchTerm: string;
}) {
  const { pageNumber, pageSize, searchTerm } = args;
  if (searchTerm.trim()) {
    return apiClient.getPaginated<PurchaseOrderItem>("/PurchaseOrders/search", {
      searchTerm,
      pageNumber,
      pageSize,
    });
  }

  return apiClient.getPaginated<PurchaseOrderItem>("/PurchaseOrders", {
    pageNumber,
    pageSize,
  });
}

export async function fetchPurchaseOrderById(purchaseOrderId: string) {
  const response = await apiClient.get<PurchaseOrderItem>(
    `/PurchaseOrders/${encodeURIComponent(purchaseOrderId)}`,
  );
  return response.data;
}

export async function createPurchaseOrderDraft(
  values: PurchaseOrderDraftValues,
) {
  return apiClient.post<PurchaseOrderItem>(
    "/PurchaseOrders",
    buildDraftPayload(values),
    crypto.randomUUID(),
  );
}

export async function updatePurchaseOrderDraft(
  purchaseOrderId: string,
  values: Partial<PurchaseOrderDraftValues>,
) {
  return apiClient.patch<PurchaseOrderItem>(
    `/PurchaseOrders/${encodeURIComponent(purchaseOrderId)}/draft`,
    buildDraftPayload(values),
  );
}

export async function deletePurchaseOrderDraft(purchaseOrderId: string) {
  return apiClient.delete<PurchaseOrderItem>(
    `/PurchaseOrders/${encodeURIComponent(purchaseOrderId)}/draft`,
  );
}

export async function submitPurchaseOrder(purchaseOrderId: string) {
  return apiClient.post<null>(
    `/PurchaseOrders/${encodeURIComponent(purchaseOrderId)}/submit`,
    {},
    crypto.randomUUID(),
  );
}

export async function approvePurchaseOrder(purchaseOrderId: string) {
  return apiClient.post<null>(
    `/PurchaseOrders/${encodeURIComponent(purchaseOrderId)}/approve`,
    {},
    crypto.randomUUID(),
  );
}

export async function cancelPurchaseOrder(purchaseOrderId: string) {
  return apiClient.post<PurchaseOrderItem>(
    `/PurchaseOrders/${encodeURIComponent(purchaseOrderId)}/cancel`,
    {},
    crypto.randomUUID(),
  );
}

export async function returnPurchaseOrder(
  purchaseOrderId: string,
  comment: string,
) {
  return apiClient.post<null>(
    `/PurchaseOrders/${encodeURIComponent(purchaseOrderId)}/return`,
    { comment },
    crypto.randomUUID(),
  );
}
