import { apiClient } from "@/api/client";
import {
  ADJUSTMENT_REASON,
  STOCK_ADJUSTMENT_STATUS,
  type AdjustmentReason,
  type StockAdjustmentStatus,
} from "@/lib/domain-values";

export { ADJUSTMENT_REASON, STOCK_ADJUSTMENT_STATUS };
export type { AdjustmentReason, StockAdjustmentStatus };

export interface StockAdjustmentLineItem {
  stockAdjustmentLineId: string;
  productId: string;
  quantityBefore: number;
  quantityAfter: number;
  unitCost?: number | null;
  delta: number;
}

export interface StockAdjustmentItem {
  stockAdjustmentId: string;
  adjustmentNumber: string;
  warehouseId: string;
  status: StockAdjustmentStatus;
  reason: AdjustmentReason;
  requestedAt: string;
  appliedAt?: string | null;
  notes?: string | null;
  lines?: StockAdjustmentLineItem[] | null;
}

export interface StockAdjustmentLineFormValues {
  productId: string;
  quantityAfter: number;
  unitCost?: number | "";
}

export interface StockAdjustmentDraftValues {
  warehouseId: string;
  reason: AdjustmentReason;
  notes: string;
  lines: StockAdjustmentLineFormValues[];
}

export async function fetchStockAdjustments(args: {
  pageNumber: number;
  pageSize: number;
  searchTerm: string;
}) {
  const { pageNumber, pageSize, searchTerm } = args;
  if (searchTerm.trim()) {
    return apiClient.getPaginated<StockAdjustmentItem>(
      "/StockAdjustments/search",
      {
        searchTerm,
        pageNumber,
        pageSize,
      },
    );
  }

  return apiClient.getPaginated<StockAdjustmentItem>("/StockAdjustments", {
    pageNumber,
    pageSize,
  });
}

export async function fetchStockAdjustmentById(stockAdjustmentId: string) {
  const response = await apiClient.get<StockAdjustmentItem>(
    `/StockAdjustments/${encodeURIComponent(stockAdjustmentId)}`,
  );
  return response.data;
}

export async function createStockAdjustmentDraft(
  values: StockAdjustmentDraftValues,
) {
  return apiClient.post<StockAdjustmentItem>(
    "/StockAdjustments",
    {
      warehouseId: values.warehouseId,
      reason: values.reason,
      notes: values.notes || null,
      lines: values.lines.map((line) => ({
        productId: line.productId,
        quantityAfter: Number(line.quantityAfter),
        unitCost:
          line.unitCost === "" || line.unitCost === undefined
            ? null
            : Number(line.unitCost),
      })),
    },
    crypto.randomUUID(),
  );
}

export async function updateStockAdjustmentDraft(
  stockAdjustmentId: string,
  values: Partial<StockAdjustmentDraftValues>,
) {
  const payload: Record<string, unknown> = {};

  if ("warehouseId" in values) {
    payload.warehouseId = values.warehouseId;
  }

  if ("reason" in values) {
    payload.reason = values.reason;
  }

  if ("notes" in values) {
    payload.notes = values.notes || null;
  }

  if ("lines" in values && values.lines) {
    payload.lines = values.lines.map((line) => ({
      productId: line.productId,
      quantityAfter: Number(line.quantityAfter),
      unitCost:
        line.unitCost === "" || line.unitCost === undefined
          ? null
          : Number(line.unitCost),
    }));
  }

  return apiClient.patch<StockAdjustmentItem>(
    `/StockAdjustments/${encodeURIComponent(stockAdjustmentId)}/draft`,
    payload,
  );
}

export async function deleteStockAdjustmentDraft(stockAdjustmentId: string) {
  return apiClient.delete<StockAdjustmentItem>(
    `/StockAdjustments/${encodeURIComponent(stockAdjustmentId)}/draft`,
  );
}

export async function submitStockAdjustment(stockAdjustmentId: string) {
  return apiClient.post<null>(
    `/StockAdjustments/${encodeURIComponent(stockAdjustmentId)}/submit`,
    {},
    crypto.randomUUID(),
  );
}

export async function approveStockAdjustment(stockAdjustmentId: string) {
  return apiClient.post<null>(
    `/StockAdjustments/${encodeURIComponent(stockAdjustmentId)}/approve`,
    {},
    crypto.randomUUID(),
  );
}

export async function returnStockAdjustment(
  stockAdjustmentId: string,
  comment: string,
) {
  return apiClient.post<null>(
    `/StockAdjustments/${encodeURIComponent(stockAdjustmentId)}/return`,
    { comment },
    crypto.randomUUID(),
  );
}

export async function applyStockAdjustment(stockAdjustmentId: string) {
  return apiClient.post<null>(
    `/StockAdjustments/${encodeURIComponent(stockAdjustmentId)}/apply`,
    {},
    crypto.randomUUID(),
  );
}

export async function cancelStockAdjustment(stockAdjustmentId: string) {
  return apiClient.post<null>(
    `/StockAdjustments/${encodeURIComponent(stockAdjustmentId)}/cancel`,
    {},
    crypto.randomUUID(),
  );
}
