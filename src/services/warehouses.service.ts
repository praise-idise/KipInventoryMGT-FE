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
