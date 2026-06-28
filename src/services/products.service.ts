import { apiClient } from "@/api/client";
import { ACCESS_TOKEN_KEY } from "@/auth/session";
import type {
  ProductSizeValue,
  ProductUnitValue,
} from "@/lib/product-taxonomy";

export interface ProductItem {
  productId: string;
  sku: string;
  categoryCode: string;
  brandCode: string;
  brand: string;
  itemCode: string;
  name: string;
  description?: string | null;
  unitOfMeasure: ProductUnitValue;
  color?: string | null;
  storage?: string | null;
  size?: ProductSizeValue | null;
  dose?: string | null;
  grade?: string | null;
  finish?: string | null;
  reorderThreshold: number;
  reorderQuantity: number;
  isActive: boolean;
  imageUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductSupplier {
  supplierId: string;
  supplierName: string;
  supplierEmail?: string | null;
  supplierPhone?: string | null;
  supplierContactPerson?: string | null;
  supplierLeadTimeDays: number;
  isDefault: boolean;
  unitCost: number;
}

export interface ProductDetail extends ProductItem {
  suppliers?: ProductSupplier[];
}

export interface ProductFormValues {
  categoryCode: string;
  brand: string;
  name: string;
  description: string;
  unitOfMeasure: ProductUnitValue;
  color: string;
  storage: string;
  size: ProductSizeValue | "";
  dose: string;
  grade: string;
  finish: string;
  reorderThreshold: number;
  reorderQuantity: number;
  isActive: boolean;
  imageUrl: string;
}

export interface CreateProductSupplierLinkInput {
  supplierId: string;
  unitCost: number;
  isDefault: boolean;
}

export interface UpdateProductSupplierLinkInput {
  unitCost: number;
  isDefault: boolean;
}

export async function fetchProducts(args: {
  pageNumber: number;
  pageSize: number;
  searchTerm: string;
}) {
  const { pageNumber, pageSize, searchTerm } = args;
  if (searchTerm.trim()) {
    return apiClient.getPaginated<ProductItem>("/Products/search", {
      searchTerm,
      pageNumber,
      pageSize,
    });
  }

  return apiClient.getPaginated<ProductItem>("/Products", {
    pageNumber,
    pageSize,
  });
}

export async function createProduct(values: ProductFormValues) {
  return apiClient.post<ProductItem>(
    "/Products",
    {
      categoryCode: values.categoryCode,
      brand: values.brand,
      name: values.name,
      description: values.description || null,
      unitOfMeasure: values.unitOfMeasure,
      color: values.color || null,
      storage: values.storage || null,
      size: values.size || null,
      dose: values.dose || null,
      grade: values.grade || null,
      finish: values.finish || null,
      reorderThreshold: values.reorderThreshold,
      reorderQuantity: values.reorderQuantity,
      imageUrl: values.imageUrl || null,
    },
    crypto.randomUUID(),
  );
}

export async function updateProduct(
  productId: string,
  values: Partial<ProductFormValues>,
) {
  const payload: Record<string, unknown> = {};
  if ("categoryCode" in values) payload.categoryCode = values.categoryCode;
  if ("brand" in values) payload.brand = values.brand;
  if ("name" in values) payload.name = values.name;
  if ("description" in values) payload.description = values.description ?? "";
  if ("unitOfMeasure" in values) payload.unitOfMeasure = values.unitOfMeasure;
  if ("color" in values) payload.color = values.color ?? "";
  if ("storage" in values) payload.storage = values.storage ?? "";
  if ("size" in values) payload.size = values.size ?? "";
  if ("dose" in values) payload.dose = values.dose ?? "";
  if ("grade" in values) payload.grade = values.grade ?? "";
  if ("finish" in values) payload.finish = values.finish ?? "";
  if ("reorderThreshold" in values)
    payload.reorderThreshold = values.reorderThreshold;
  if ("reorderQuantity" in values)
    payload.reorderQuantity = values.reorderQuantity;
  if ("isActive" in values) payload.isActive = values.isActive;
  if ("imageUrl" in values) payload.imageUrl = values.imageUrl ?? "";

  return apiClient.patch<ProductItem>(`/Products/${productId}`, payload);
}

export async function deleteProduct(productId: string) {
  return apiClient.delete<null>(`/Products/${productId}`);
}

export async function fetchProductById(productId: string) {
  const response = await apiClient.get<ProductDetail>(`/Products/${productId}`);
  return response.data;
}

export async function uploadProductImage(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)

  const token = localStorage.getItem(ACCESS_TOKEN_KEY)
  const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/Products/upload-image`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Upload failed' }))
    throw error
  }

  const json = await res.json()
  if (!json?.data?.imageUrl) throw new Error('No image URL returned')
  return json.data.imageUrl
}

export async function createProductSupplierLink(
  productId: string,
  values: CreateProductSupplierLinkInput,
) {
  return apiClient.post<ProductSupplier>(`/Products/${productId}/suppliers`, {
    supplierId: values.supplierId,
    unitCost: values.unitCost,
    isDefault: values.isDefault,
  });
}

export async function updateProductSupplierLink(
  productId: string,
  supplierId: string,
  values: UpdateProductSupplierLinkInput,
) {
  return apiClient.patch<ProductSupplier>(
    `/Products/${productId}/suppliers/${supplierId}`,
    {
      unitCost: values.unitCost,
      isDefault: values.isDefault,
    },
  );
}

export async function deleteProductSupplierLink(
  productId: string,
  supplierId: string,
) {
  return apiClient.delete<null>(
    `/Products/${productId}/suppliers/${supplierId}`,
  );
}
