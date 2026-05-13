import { apiClient } from "@/api/client";
import type { PurchaseOrderItem } from "@/services/purchase-orders.service";

export interface ReceiveGoodsLineInput {
  purchaseOrderLineId: string;
  quantityReceivedNow: number;
}

export interface ReceiveGoodsRequest {
  purchaseOrderId: string;
  notes?: string;
  lines: ReceiveGoodsLineInput[];
}

export async function receiveGoods(request: ReceiveGoodsRequest) {
  return apiClient.post<PurchaseOrderItem>(
    "/GoodsReceipts",
    {
      purchaseOrderId: request.purchaseOrderId,
      notes: request.notes || null,
      lines: request.lines.map((line) => ({
        purchaseOrderLineId: line.purchaseOrderLineId,
        quantityReceivedNow: Number(line.quantityReceivedNow),
      })),
    },
    crypto.randomUUID(),
  );
}
