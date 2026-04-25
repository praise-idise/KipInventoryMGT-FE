import { useMemo } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Badge } from '@/components/ui'
import { CrudResourcePage, type CrudColumn, type CrudField } from '@/components/app/CrudResourcePage'
import {
    PRODUCT_CATEGORY_OPTIONS,
    PRODUCT_SIZE_OPTIONS,
    PRODUCT_UNIT_OPTIONS,
    PRODUCT_VARIANT_FIELDS,
    type ProductSizeValue,
    type ProductUnitValue,
} from '@/lib/product-taxonomy'
import {
    createProduct,
    deleteProduct,
    fetchProducts,
    type ProductFormValues,
    type ProductItem,
    updateProduct,
} from '@/services/products.service'

const PRODUCT_UNIT_VALUES = PRODUCT_UNIT_OPTIONS.map((option) => option.value) as [ProductUnitValue, ...ProductUnitValue[]]
const PRODUCT_SIZE_VALUES = PRODUCT_SIZE_OPTIONS.map((option) => option.value) as [ProductSizeValue, ...ProductSizeValue[]]

const schema = z.object({
    categoryCode: z.string().min(1, 'Category is required.'),
    brand: z.string().min(1, 'Brand is required.').max(80, 'Brand must be 80 characters or fewer.'),
    name: z.string().min(1, 'Name is required.'),
    description: z.string(),
    unitOfMeasure: z.enum(PRODUCT_UNIT_VALUES),
    color: z.string(),
    storage: z.string(),
    size: z.union([z.enum(PRODUCT_SIZE_VALUES), z.literal('')]),
    dosage: z.string(),
    grade: z.string(),
    finish: z.string(),
    reorderThreshold: z.coerce.number().min(0, 'Reorder threshold must be zero or greater.'),
    reorderQuantity: z.coerce.number().min(1, 'Reorder quantity must be at least 1.'),
    isActive: z.boolean(),
})

const columns: CrudColumn<ProductItem>[] = [
    { header: 'SKU', render: (item) => item.sku, title: (item) => item.sku, className: 'w-48' },
    { header: 'Name', render: (item) => item.name, title: (item) => item.name, className: 'w-56' },
    { header: 'Category', render: (item) => item.categoryCode, className: 'w-24' },
    { header: 'Brand', render: (item) => item.brand, className: 'w-24' },
    { header: 'Unit', render: (item) => item.unitOfMeasure, className: 'w-24' },
    { header: 'Reorder', render: (item) => `${item.reorderThreshold}/${item.reorderQuantity}`, className: 'w-28' },
    {
        header: 'Status',
        truncate: false,
        className: 'w-28',
        render: (item) => (
            <Badge variant={item.isActive ? 'success' : 'muted'}>{item.isActive ? 'Active' : 'Inactive'}</Badge>
        ),
    },
]

export function ProductsPage() {
    const fields: CrudField<ProductFormValues>[] = useMemo(() => [
        {
            name: 'categoryCode',
            label: 'Category',
            type: 'select',
            required: true,
            placeholder: 'Select category',
            options: [...PRODUCT_CATEGORY_OPTIONS],
        },
        { name: 'brand', label: 'Brand', required: true, placeholder: 'Apple' },
        { name: 'name', label: 'Name', required: true, placeholder: 'iPhone 15 128GB Black' },
        {
            name: 'unitOfMeasure',
            label: 'Unit of Measure',
            type: 'select',
            required: true,
            placeholder: 'Select unit',
            options: [...PRODUCT_UNIT_OPTIONS],
        },
        ...PRODUCT_VARIANT_FIELDS.map<CrudField<ProductFormValues>>((field) => ({
            name: field.key,
            label: field.label,
            type: field.key === 'size' ? 'select' : 'text',
            placeholder: field.placeholder,
            options: field.key === 'size' ? [...PRODUCT_SIZE_OPTIONS] : undefined,
        })),
        { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Fast moving smartphone SKU.' },
        { name: 'reorderThreshold', label: 'Reorder Threshold', required: true, type: 'number', placeholder: '20' },
        { name: 'reorderQuantity', label: 'Reorder Quantity', required: true, type: 'number', placeholder: '100' },
        { name: 'isActive', label: 'Product is active', type: 'checkbox', modes: ['edit'] },
    ], [])

    return (
        <CrudResourcePage<ProductItem, ProductFormValues>
            title="Products"
            description="Maintain products and optional variant values."
            entityLabel="Product"
            queryKey="products"
            searchPlaceholder="Search products by name, SKU, category, or brand"
            fields={fields}
            columns={columns}
            resolver={zodResolver(schema)}
            getItemId={(item) => item.productId}
            getDefaultValues={(item) => ({
                categoryCode: item?.categoryCode ?? '',
                brand: item?.brand ?? '',
                name: item?.name ?? '',
                description: item?.description ?? '',
                unitOfMeasure: item?.unitOfMeasure ?? 'Pcs',
                color: item?.color ?? '',
                storage: item?.storage ?? '',
                size: item?.size ?? '',
                dosage: item?.dosage ?? '',
                grade: item?.grade ?? '',
                finish: item?.finish ?? '',
                reorderThreshold: item?.reorderThreshold ?? 10,
                reorderQuantity: item?.reorderQuantity ?? 40,
                isActive: item?.isActive ?? true,
            })}
            fetchItems={fetchProducts}
            createItem={createProduct}
            updateItem={(item, values) => updateProduct(item.productId, values)}
            deleteItem={(item) => deleteProduct(item.productId)}
            getDeleteLabel={(item) => item.name}
            getViewPath={(item) => `/app/products/${item.productId}`}
        />
    )
}
