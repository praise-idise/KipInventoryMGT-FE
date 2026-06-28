import { apiClient } from "@/api/client";
import { STOCK_ISSUE_REASON, type StockIssueReason } from "@/lib/domain-values";

export { STOCK_ISSUE_REASON };
export type { StockIssueReason };

export interface StockIssueLineItem {
  productId: string;
  quantity: number;
}

export interface CreateStockIssueRequest {
  warehouseId: string;
  reason: StockIssueReason;
  notes: string;
  lines: StockIssueLineItem[];
}

export interface StockIssueListItem {
  stockMovementId: string
  productId: string
  productName: string
  sku: string
  warehouseId: string
  warehouseName: string
  reason: StockIssueReason
  quantity: number
  unitCost: number
  notes?: string | null
  occurredAt: string
}

export async function fetchStockIssues(args: { pageNumber: number; pageSize: number }) {
  return apiClient.getPaginated<StockIssueListItem>("/StockIssues", args)
}

export async function createStockIssue(request: CreateStockIssueRequest) {
  return apiClient.post<unknown>(
    "/StockIssues",
    {
      warehouseId: request.warehouseId,
      reason: request.reason,
      notes: request.notes || null,
      lines: request.lines.map((line) => ({
        productId: line.productId,
        quantity: Number(line.quantity),
      })),
    },
    crypto.randomUUID(),
  );
}
