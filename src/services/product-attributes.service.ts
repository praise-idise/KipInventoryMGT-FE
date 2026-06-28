import { apiClient } from '@/api/client'

export const PRODUCT_ATTRIBUTE_TYPES = ['Brand', 'Color', 'Finish', 'Grade', 'Storage', 'Dose'] as const

export type ProductAttributeType = (typeof PRODUCT_ATTRIBUTE_TYPES)[number]

export type ProductAttributeItem = {
    attributeId: string
    attributeType: string
    value: string
}

export async function fetchProductAttributes(type: ProductAttributeType): Promise<ProductAttributeItem[]> {
    const response = await apiClient.get<ProductAttributeItem[]>(
        `/ProductAttributes?type=${type}`,
    )
    return response.data ?? []
}

export async function createProductAttribute(
    type: ProductAttributeType,
    value: string,
): Promise<ProductAttributeItem> {
    const response = await apiClient.post<ProductAttributeItem>('/ProductAttributes', {
        attributeType: type,
        value,
    })
    return response.data!
}
