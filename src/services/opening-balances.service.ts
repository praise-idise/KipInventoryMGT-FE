import { apiClient } from "@/api/client";

export interface OpeningBalanceLineItem {
  openingBalanceLineId: string;
  productId: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export interface OpeningBalanceItem {
  openingBalanceId: string;
  openingBalanceNumber: string;
  warehouseId: string;
  appliedAt: string;
  notes?: string | null;
  lines?: OpeningBalanceLineItem[] | null;
}

export interface OpeningBalanceLineFormValues {
  productId: string;
  quantity: number;
  unitCost: number;
}

export async function fetchOpeningBalances(args: {
  pageNumber: number;
  pageSize: number;
  searchTerm: string;
}) {
  const { pageNumber, pageSize, searchTerm } = args;
  if (searchTerm.trim()) {
    return apiClient.getPaginated<OpeningBalanceItem>(
      "/OpeningBalances/search",
      {
        searchTerm,
        pageNumber,
        pageSize,
      },
    );
  }

  return apiClient.getPaginated<OpeningBalanceItem>("/OpeningBalances", {
    pageNumber,
    pageSize,
  });
}

export async function fetchOpeningBalanceById(openingBalanceId: string) {
  const response = await apiClient.get<OpeningBalanceItem>(
    `/OpeningBalances/${encodeURIComponent(openingBalanceId)}`,
  );
  return response.data;
}

export interface CreateOpeningBalanceRequest {
  warehouseId: string;
  notes: string;
  lines: OpeningBalanceLineFormValues[];
}

export async function createOpeningBalance(
  request: CreateOpeningBalanceRequest,
) {
  return apiClient.post<OpeningBalanceItem>(
    "/OpeningBalances",
    {
      warehouseId: request.warehouseId,
      notes: request.notes || null,
      lines: request.lines.map((line) => ({
        productId: line.productId,
        quantity: Number(line.quantity),
        unitCost: Number(line.unitCost),
      })),
    },
    crypto.randomUUID(),
  );
}
