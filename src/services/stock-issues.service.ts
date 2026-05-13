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
