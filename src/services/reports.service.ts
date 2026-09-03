import { apiClient } from "@/api/client";

export interface WarehouseValuation {
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  productCount: number;
  quantityOnHand: number;
  inventoryValue: number;
}

export interface LowStockReportItem {
  warehouseId: string;
  warehouseName: string;
  productId: string;
  productName: string;
  sku: string;
  quantityOnHand: number;
  reservedQuantity: number;
  availableQuantity: number;
  reorderThreshold: number;
  inventoryValue: number;
}

export interface MovementReportItem {
  stockMovementId: string;
  warehouseId: string;
  warehouseName: string;
  productId: string;
  productName: string;
  sku: string;
  movementType: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  occurredAt: string;
  creator?: string | null;
  notes?: string | null;
}

export interface AdjustmentSummaryItem {
  warehouseId: string;
  warehouseName: string;
  reason: string;
  adjustmentCount: number;
  increaseQuantity: number;
  decreaseQuantity: number;
  increaseValue: number;
  decreaseValue: number;
}

export interface SupplierPerformanceItem {
  supplierId: string;
  supplierName: string;
  purchaseOrderCount: number;
  orderedQuantity: number;
  receivedQuantity: number;
  orderedValue: number;
  receivedValue: number;
  fulfilmentRate: number;
  averageReceiptLeadTimeDays?: number | null;
}

export async function fetchWarehouseValuation(warehouseId?: string) {
  const query = warehouseId
    ? `?warehouseId=${encodeURIComponent(warehouseId)}`
    : "";
  const response = await apiClient.get<WarehouseValuation[]>(
    `/Reports/valuation${query}`,
  );
  return response.data ?? [];
}

export async function fetchLowStockReport(warehouseId?: string) {
  const query = warehouseId
    ? `?warehouseId=${encodeURIComponent(warehouseId)}`
    : "";
  const response = await apiClient.get<LowStockReportItem[]>(
    `/Reports/low-stock${query}`,
  );
  return response.data ?? [];
}

export async function fetchMovementReport(args: {
  pageNumber: number;
  pageSize: number;
  warehouseId?: string;
  from?: string;
  to?: string;
}) {
  return apiClient.getPaginated<MovementReportItem>("/Reports/movements", {
    pageNumber: args.pageNumber,
    pageSize: args.pageSize,
    ...(args.warehouseId ? { warehouseId: args.warehouseId } : {}),
    ...(args.from ? { from: args.from } : {}),
    ...(args.to ? { to: args.to } : {}),
  });
}

export async function fetchAdjustmentSummary(args: {
  warehouseId?: string;
  from?: string;
  to?: string;
}) {
  const params = new URLSearchParams();
  if (args.warehouseId) params.set("warehouseId", args.warehouseId);
  if (args.from) params.set("from", args.from);
  if (args.to) params.set("to", args.to);
  const response = await apiClient.get<AdjustmentSummaryItem[]>(
    `/Reports/adjustments?${params}`,
  );
  return response.data ?? [];
}

export async function fetchSupplierPerformance(args: {
  warehouseId?: string;
  from?: string;
  to?: string;
}) {
  const params = new URLSearchParams();
  if (args.warehouseId) params.set("warehouseId", args.warehouseId);
  if (args.from) params.set("from", args.from);
  if (args.to) params.set("to", args.to);
  const response = await apiClient.get<SupplierPerformanceItem[]>(
    `/Reports/suppliers?${params}`,
  );
  return response.data ?? [];
}

export function downloadReport(
  report:
    | "valuation"
    | "movements/export"
    | "adjustments"
    | "suppliers"
    | "low-stock",
  format: "csv" | "pdf",
) {
  return apiClient.download(`/Reports/${report}?format=${format}`);
}
