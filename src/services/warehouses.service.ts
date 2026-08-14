import { apiClient } from "@/api/client";

export interface WarehouseItem {
  warehouseId: string;
  code: string;
  name: string;
  state: string;
  location?: string | null;
  capacityUnits: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WarehouseInventoryItem {
  productId: string;
  productName: string;
  sku: string;
  unitOfMeasure: string;
  quantityOnHand: number;
  reservedQuantity: number;
  availableQuantity: number;
  averageUnitCost: number;
  inventoryValue: number;
  reorderThresholdOverride?: number | null;
}

export interface WarehouseDetail extends WarehouseItem {
  inventoryItems?: WarehouseInventoryItem[];
}

export interface WarehouseFormValues {
  name: string;
  state: string;
  location: string;
  capacityUnits: number;
  isActive: boolean;
}

export async function fetchWarehouses(args: {
  pageNumber: number;
  pageSize: number;
  searchTerm: string;
}) {
  const { pageNumber, pageSize, searchTerm } = args;
  if (searchTerm.trim()) {
    return apiClient.getPaginated<WarehouseItem>("/Warehouses/search", {
      searchTerm,
      pageNumber,
      pageSize,
    });
  }

  return apiClient.getPaginated<WarehouseItem>("/Warehouses", {
    pageNumber,
    pageSize,
  });
}

export async function createWarehouse(values: WarehouseFormValues) {
  return apiClient.post<WarehouseItem>("/Warehouses", {
    name: values.name,
    state: values.state,
    location: values.location || null,
    capacityUnits: values.capacityUnits,
  });
}

export async function updateWarehouse(
  warehouseId: string,
  values: Partial<WarehouseFormValues>,
) {
  const payload: Record<string, unknown> = {};

  if ("name" in values) payload.name = values.name;
  if ("state" in values) payload.state = values.state;
  if ("location" in values) payload.location = values.location ?? "";
  if ("capacityUnits" in values) payload.capacityUnits = values.capacityUnits;
  if ("isActive" in values) payload.isActive = values.isActive;

  return apiClient.patch<WarehouseItem>(`/Warehouses/${warehouseId}`, payload);
}

export async function deleteWarehouse(warehouseId: string) {
  return apiClient.delete<null>(`/Warehouses/${warehouseId}`);
}

export async function fetchWarehouseById(warehouseId: string) {
  const response = await apiClient.get<WarehouseDetail>(
    `/Warehouses/${warehouseId}`,
  );
  return response.data;
}

export async function fetchWarehouseInventory(
  warehouseId: string,
  args: { pageNumber: number; pageSize: number },
) {
  return apiClient.getPaginated<WarehouseInventoryItem>(
    `/Warehouses/${warehouseId}/inventory`,
    args,
  );
}

export async function fetchAllWarehouseInventory(warehouseId: string) {
  // The server caps pages at 100 rows, so walk every page to avoid silently
  // dropping products from selectors when a warehouse holds more than that.
  const items: WarehouseInventoryItem[] = [];
  let pageNumber = 1;

  for (;;) {
    const response = await apiClient.getPaginated<WarehouseInventoryItem>(
      `/Warehouses/${warehouseId}/inventory`,
      { pageNumber, pageSize: 100 },
    );
    items.push(...(response.data ?? []));
    const totalPages = response.pagination?.totalPages ?? 1;
    if (pageNumber >= totalPages) break;
    pageNumber += 1;
  }

  return items;
}
