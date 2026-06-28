import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Badge, Button, Dialog, ImageUpload, Input, Label, toast, useConfirm } from '@/components/ui'
import { CrudResourcePage, type CrudColumn, type CrudField } from '@/components/app/CrudResourcePage'
import { getStatusBadgeClassName } from '@/lib/status-badge'
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
    uploadProductImage,
    type ProductFormValues,
    type ProductItem,
    updateProduct,
} from '@/services/products.service'
import {
    createProductAttribute,
    fetchProductAttributes,
    type ProductAttributeType,
} from '@/services/product-attributes.service'

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
    dose: z.string(),
    grade: z.string(),
    finish: z.string(),
    reorderThreshold: z.coerce.number().min(0, 'Reorder threshold must be zero or greater.'),
    reorderQuantity: z.coerce.number().min(1, 'Reorder quantity must be at least 1.'),
    isActive: z.boolean(),
})

const ATTRIBUTE_TYPES = ['Brand', 'Color', 'Finish', 'Grade', 'Storage', 'Dose'] as const

function useAttributeOptions(type: ProductAttributeType) {
    return useQuery({
        queryKey: ['product-attributes', type],
        queryFn: () => fetchProductAttributes(type),
        select: (data) => data.map((a) => ({ label: a.value, value: a.value })),
        staleTime: 5 * 60 * 1000,
    })
}

export function ProductsPage() {
    const queryClient = useQueryClient()
    const [editProductId] = useState<string | undefined>(() => {
        const id = sessionStorage.getItem('edit-products')
        if (id) sessionStorage.removeItem('edit-products')
        return id ?? undefined
    })
    const [uploadedImageUrl, setUploadedImageUrl] = useState('')
    const [addNewDialogOpen, setAddNewDialogOpen] = useState(false)
    const [addNewType, setAddNewType] = useState<ProductAttributeType>('Brand')
    const [addNewValue, setAddNewValue] = useState('')
    const [addNewSaving, setAddNewSaving] = useState(false)

    const brandOptions = useAttributeOptions('Brand')
    const colorOptions = useAttributeOptions('Color')
    const finishOptions = useAttributeOptions('Finish')
    const gradeOptions = useAttributeOptions('Grade')
    const storageOptions = useAttributeOptions('Storage')
    const doseOptions = useAttributeOptions('Dose')

    function getOptions(type: ProductAttributeType) {
        switch (type) {
            case 'Brand': return brandOptions.data ?? []
            case 'Color': return colorOptions.data ?? []
            case 'Finish': return finishOptions.data ?? []
            case 'Grade': return gradeOptions.data ?? []
            case 'Storage': return storageOptions.data ?? []
            case 'Dose': return doseOptions.data ?? []
        }
    }

    function openAddNew(type: ProductAttributeType) {
        setAddNewType(type)
        setAddNewValue('')
        setAddNewDialogOpen(true)
    }

    async function handleAddNew() {
        const trimmed = addNewValue.trim()
        if (!trimmed) return
        setAddNewSaving(true)
        try {
            await createProductAttribute(addNewType, trimmed)
            await queryClient.invalidateQueries({ queryKey: ['product-attributes', addNewType] })
            toast.success(`"${trimmed}" added to ${addNewType}.`)
            setAddNewDialogOpen(false)
        } catch {
            toast.error(`Failed to add ${addNewType.toLowerCase()}.`)
        } finally {
            setAddNewSaving(false)
        }
    }

    const fields: CrudField<ProductFormValues>[] = useMemo(() => [
        {
            name: 'categoryCode',
            label: 'Category',
            type: 'searchableSelect',
            required: true,
            placeholder: 'Search category...',
            options: [...PRODUCT_CATEGORY_OPTIONS],
        },
        {
            name: 'brand',
            label: 'Brand',
            type: 'searchableSelect',
            required: true,
            placeholder: 'Search brand...',
            options: brandOptions.data ?? [],
            onAddNew: () => openAddNew('Brand'),
            addNewLabel: 'Add New Brand',
        },
        { name: 'name', label: 'Name', required: true, placeholder: 'iPhone 15 128GB Black' },
        {
            name: 'unitOfMeasure',
            label: 'Unit of Measure',
            type: 'searchableSelect',
            required: true,
            placeholder: 'Search unit...',
            options: [...PRODUCT_UNIT_OPTIONS],
        },
        ...PRODUCT_VARIANT_FIELDS.map<CrudField<ProductFormValues>>((variant) => {
            const attrType = (variant.key.charAt(0).toUpperCase() + variant.key.slice(1)) as ProductAttributeType
            const isSearchable = ['color', 'storage', 'dose', 'grade', 'finish'].includes(variant.key)

            if (variant.key === 'size') {
                return {
                    name: variant.key,
                    label: variant.label,
                    type: 'searchableSelect' as const,
                    placeholder: 'Search size...',
                    options: [...PRODUCT_SIZE_OPTIONS],
                }
            }

            return {
                name: variant.key,
                label: variant.label,
                type: isSearchable ? 'searchableSelect' : 'text',
                placeholder: `Search ${variant.label.toLowerCase()}...`,
                options: isSearchable ? getOptions(attrType) : undefined,
                onAddNew: isSearchable ? () => openAddNew(attrType) : undefined,
                addNewLabel: isSearchable ? `Add New ${variant.label}` : undefined,
            }
        }),
        { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Fast moving smartphone SKU.' },
        { name: 'reorderThreshold', label: 'Reorder Threshold', required: true, type: 'number', placeholder: '20' },
        { name: 'reorderQuantity', label: 'Reorder Quantity', required: true, type: 'number', placeholder: '100' },
        { name: 'isActive', label: 'Product is active', type: 'checkbox', modes: ['edit'] },
    ], [brandOptions.data, colorOptions.data, finishOptions.data, gradeOptions.data, storageOptions.data, doseOptions.data])

    const columns: CrudColumn<ProductItem>[] = useMemo(() => [
        {
            header: 'Name',
            render: (item) => item.name,
            title: (item) => item.name,
            className: 'w-56',
            order: 1,
        },
        {
            header: 'SKU',
            render: (item) => item.sku,
            title: (item) => item.sku,
            minWidth: 'min-w-[200px]',
            truncate: false,
            order: 2,
        },
        { header: 'Category', render: (item) => item.categoryCode, className: 'w-24', order: 3 },
        { header: 'Brand', render: (item) => item.brand, className: 'w-24', order: 4 },
        { header: 'Unit', render: (item) => item.unitOfMeasure, className: 'w-24', order: 5 },
        { header: 'Reorder', render: (item) => `${item.reorderThreshold}/${item.reorderQuantity}`, className: 'w-28', order: 6 },
        {
            header: 'Status',
            truncate: false,
            className: 'w-28',
            order: 7,
            render: (item) => (
                <Badge variant="outline" className={getStatusBadgeClassName(item.isActive ? 'Active' : 'Inactive')}>
                    {item.isActive ? 'Active' : 'Inactive'}
                </Badge>
            ),
        },
    ], [])

    const extraFormContent = (item: ProductItem | null) => (
        <div className="space-y-2">
            <ImageUpload
                value={item?.imageUrl ?? null}
                onChange={() => {}}
                maxSizeMB={3}
                uploadFn={uploadProductImage}
                onUploaded={(url) => {
                    setUploadedImageUrl(url)
                    toast.success('Image uploaded. Save your changes to apply.')
                }}
            />
            {uploadedImageUrl && (
                <p className="text-xs text-muted-foreground text-center">Image ready — click Save Changes to apply.</p>
            )}
        </div>
    )

    async function handleCreate(values: ProductFormValues): Promise<ProductItem> {
        const response = await createProduct({ ...values, imageUrl: uploadedImageUrl })
        setUploadedImageUrl('')
        queryClient.invalidateQueries({ queryKey: ['product-detail'] })
        return response.data!
    }

    async function handleUpdate(item: ProductItem, values: Partial<ProductFormValues>): Promise<ProductItem> {
        const response = await updateProduct(item.productId, { ...values, imageUrl: uploadedImageUrl || undefined })
        setUploadedImageUrl('')
        queryClient.invalidateQueries({ queryKey: ['product-detail', item.productId] })
        return response.data!
    }

    return (
        <>
            <CrudResourcePage<ProductItem, ProductFormValues>
                title="Products"
                description="Manage your inventory of products and link them to a supplier."
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
                    dose: item?.dose ?? '',
                    grade: item?.grade ?? '',
                    finish: item?.finish ?? '',
                    reorderThreshold: item?.reorderThreshold ?? 10,
                    reorderQuantity: item?.reorderQuantity ?? 40,
                    isActive: item?.isActive ?? true,
                })}
                fetchItems={fetchProducts}
                createItem={(values) => handleCreate(values) as Promise<unknown>}
                updateItem={(item, values) => handleUpdate(item as ProductItem, values) as Promise<unknown>}
                deleteItem={(item) => deleteProduct((item as ProductItem).productId)}
                getDeleteLabel={(item) => (item as ProductItem).name}
                getViewPath={(item) => `/app/products/${(item as ProductItem).productId}`}
                extraFormContent={extraFormContent}
                initialEditItemId={editProductId}
                forceSubmit={!!uploadedImageUrl}
            />

            <Dialog
                open={addNewDialogOpen}
                onClose={() => setAddNewDialogOpen(false)}
                title={`Add New ${addNewType}`}
                description={`Enter a new value for ${addNewType.toLowerCase()}.`}
            >
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label required>{addNewType} Value</Label>
                        <Input
                            value={addNewValue}
                            onChange={(e) => setAddNewValue(e.target.value)}
                            placeholder={`Enter ${addNewType.toLowerCase()}...`}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault()
                                    handleAddNew()
                                }
                            }}
                        />
                    </div>
                    <div className="flex gap-3">
                        <Button onClick={handleAddNew} loading={addNewSaving}>
                            Add {addNewType}
                        </Button>
                        <Button variant="outline" onClick={() => setAddNewDialogOpen(false)}>
                            Cancel
                        </Button>
                    </div>
                </div>
            </Dialog>
        </>
    )
}
