import { apiClient } from "@/api/client";

export interface SupplierItem {
  supplierId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  contactPerson?: string | null;
  leadTimeDays: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierDetail extends SupplierItem {}

export interface SupplierFormValues {
  name: string;
  email: string;
  phone: string;
  contactPerson: string;
  leadTimeDays: number;
  isActive: boolean;
}

export async function fetchSuppliers(args: {
  pageNumber: number;
  pageSize: number;
  searchTerm: string;
}) {
  const { pageNumber, pageSize, searchTerm } = args;
  if (searchTerm.trim()) {
    return apiClient.getPaginated<SupplierItem>("/Suppliers/search", {
      searchTerm,
      pageNumber,
      pageSize,
    });
  }

  return apiClient.getPaginated<SupplierItem>("/Suppliers", {
    pageNumber,
    pageSize,
  });
}

export async function createSupplier(values: SupplierFormValues) {
  return apiClient.post<SupplierItem>("/Suppliers", {
    name: values.name,
    email: values.email || null,
    phone: values.phone || null,
    contactPerson: values.contactPerson || null,
    leadTimeDays: values.leadTimeDays,
  });
}

export async function updateSupplier(
  supplierId: string,
  values: Partial<SupplierFormValues>,
) {
  const payload: Record<string, unknown> = {};

  if ("name" in values) payload.name = values.name;
  if ("email" in values) payload.email = values.email ?? "";
  if ("phone" in values) payload.phone = values.phone ?? "";
  if ("contactPerson" in values)
    payload.contactPerson = values.contactPerson ?? "";
  if ("leadTimeDays" in values) payload.leadTimeDays = values.leadTimeDays;
  if ("isActive" in values) payload.isActive = values.isActive;

  return apiClient.patch<SupplierItem>(`/Suppliers/${supplierId}`, payload);
}

export async function deleteSupplier(supplierId: string) {
  return apiClient.delete<null>(`/Suppliers/${supplierId}`);
}

export async function fetchSupplierById(supplierId: string) {
  const response = await apiClient.get<SupplierDetail>(
    `/Suppliers/${supplierId}`,
  );
  return response.data;
}
