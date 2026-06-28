import { apiClient } from '@/api/client'

export type ProductAttributeItem = {
    attributeId: string
    attributeType: string
    value: string
}

export type ProductAttributeType = 'Brand' | 'Color' | 'Finish' | 'Grade' | 'Storage' | 'Dose'

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
