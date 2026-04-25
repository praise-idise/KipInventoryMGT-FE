import { apiClient } from "@/api/client";

export interface CustomerItem {
  customerId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
}

export interface CustomerDetail extends CustomerItem {}

export interface CustomerFormValues {
  name: string;
  email: string;
  phone: string;
}

export async function fetchCustomers(args: {
  pageNumber: number;
  pageSize: number;
  searchTerm: string;
}) {
  const { pageNumber, pageSize, searchTerm } = args;
  if (searchTerm.trim()) {
    return apiClient.getPaginated<CustomerItem>("/Customers/search", {
      searchTerm,
      pageNumber,
      pageSize,
    });
  }

  return apiClient.getPaginated<CustomerItem>("/Customers", {
    pageNumber,
    pageSize,
  });
}

export async function createCustomer(values: CustomerFormValues) {
  return apiClient.post<CustomerItem>(
    "/Customers",
    {
      name: values.name,
      email: values.email || null,
      phone: values.phone || null,
    },
    crypto.randomUUID(),
  );
}

export async function updateCustomer(
  customerId: string,
  values: Partial<CustomerFormValues>,
) {
  const payload: Record<string, unknown> = {};

  if ("name" in values) payload.name = values.name;
  if ("email" in values) payload.email = values.email ?? "";
  if ("phone" in values) payload.phone = values.phone ?? "";

  return apiClient.patch<CustomerItem>(`/Customers/${customerId}`, payload);
}

export async function deleteCustomer(customerId: string) {
  return apiClient.delete<null>(`/Customers/${customerId}`);
}

export async function fetchCustomerById(customerId: string) {
  const response = await apiClient.get<CustomerDetail>(
    `/Customers/${customerId}`,
  );
  return response.data;
}
