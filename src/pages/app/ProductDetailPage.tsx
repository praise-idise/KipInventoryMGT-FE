import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from '@tanstack/react-router'
import { ArrowLeft, EllipsisVertical, Info, Pencil, Trash2 } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Dialog, ImageSkeleton, Input, Label, Popover, useConfirm, toast } from '@/components/ui'
import { cn } from '@/lib/cn'
import { getApiErrorMessage } from '@/api/types'
import { useBillingAccess } from '@/hooks/use-billing-access'
import { PRODUCT_VARIANT_FIELDS } from '@/lib/product-taxonomy'
import { getStatusBadgeClassName } from '@/lib/status-badge'
import { fetchSuppliers } from '@/services/suppliers.service'
import {
    createProductSupplierLink,
    deleteProduct,
    deleteProductSupplierLink,
    fetchProductById,
    updateProductSupplierLink,
} from '@/services/products.service'

type TabId = 'overview' | 'suppliers'

const TABS: { id: TabId; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'suppliers', label: 'Suppliers' },
]

export function ProductDetailPage() {
    const { canWrite } = useBillingAccess()
    const { productId } = useParams({ strict: false }) as { productId: string }
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const { confirm, dialog: confirmDialog } = useConfirm()
    const [activeTab, setActiveTab] = useState<TabId>('overview')
    const [selectedSupplierId, setSelectedSupplierId] = useState('')
    const [newSupplierUnitCost, setNewSupplierUnitCost] = useState('0')
    const [newSupplierIsDefault, setNewSupplierIsDefault] = useState(false)
    const [imageLoaded, setImageLoaded] = useState(false)
    const [editCostDialog, setEditCostDialog] = useState<{
        open: boolean
        supplierId: string
        currentCost: number
        isDefault: boolean
        value: string
    }>({ open: false, supplierId: '', currentCost: 0, isDefault: false, value: '' })

    const detailQuery = useQuery({
        queryKey: ['product-detail', productId],
        queryFn: () => fetchProductById(productId),
    })

    const suppliersQuery = useQuery({
        queryKey: ['suppliers', 'options'],
        queryFn: () => fetchSuppliers({ pageNumber: 1, pageSize: 200, searchTerm: '' }),
    })

    const createSupplierMutation = useMutation({
        mutationFn: (payload: { supplierId: string; unitCost: number; isDefault: boolean }) =>
            createProductSupplierLink(productId, payload),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['product-detail', productId] })
            setSelectedSupplierId('')
            setNewSupplierUnitCost('0')
            setNewSupplierIsDefault(false)
            toast.success('Supplier linked successfully.')
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, 'Unable to link supplier.'))
        },
    })

    const updateSupplierMutation = useMutation({
        mutationFn: (payload: { supplierId: string; unitCost: number; isDefault: boolean }) =>
            updateProductSupplierLink(productId, payload.supplierId, {
                unitCost: payload.unitCost,
                isDefault: payload.isDefault,
            }),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['product-detail', productId] })
            toast.success('Supplier link updated successfully.')
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, 'Unable to update supplier link.'))
        },
    })

    const deleteSupplierMutation = useMutation({
        mutationFn: (supplierId: string) => deleteProductSupplierLink(productId, supplierId),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['product-detail', productId] })
            toast.success('Supplier unlinked successfully.')
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, 'Unable to unlink supplier.'))
        },
    })

    const deleteProductMutation = useMutation({
        mutationFn: () => deleteProduct(productId),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['products'] })
            await queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
            toast.success('Product deleted successfully.')
            navigate({ to: '/app/products' })
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, 'Unable to delete product.'))
        },
    })

    const product = detailQuery.data
    const variantEntries = useMemo(() => {
        if (!product) return []

        return PRODUCT_VARIANT_FIELDS
            .map((field) => ({ label: field.label, value: product[field.key] }))
            .filter((entry) => Boolean(entry.value))
    }, [product])

    const availableSuppliers = useMemo(() => {
        if (!product) return []
        const linkedIds = new Set((product.suppliers ?? []).map((supplier) => supplier.supplierId))
        return (suppliersQuery.data?.data ?? []).filter((supplier) => !linkedIds.has(supplier.supplierId))
    }, [product, suppliersQuery.data?.data])

    async function handleLinkSupplier() {
        if (!selectedSupplierId) {
            toast.warning('Select a supplier to link.')
            return
        }

        const parsedCost = Number(newSupplierUnitCost)
        if (!Number.isFinite(parsedCost) || parsedCost <= 0) {
            toast.warning('Unit cost must be greater than 0.')
            return
        }

        await createSupplierMutation.mutateAsync({
            supplierId: selectedSupplierId,
            unitCost: parsedCost,
            isDefault: newSupplierIsDefault,
        })
    }

    async function handleSetDefault(supplierId: string, unitCost: number) {
        await updateSupplierMutation.mutateAsync({ supplierId, unitCost, isDefault: true })
    }

    function openEditCostDialog(supplierId: string, currentCost: number, isDefault: boolean) {
        setEditCostDialog({
            open: true,
            supplierId,
            currentCost,
            isDefault,
            value: currentCost.toString(),
        })
    }

    async function handleUpdateUnitCost() {
        const parsed = Number(editCostDialog.value)
        if (!Number.isFinite(parsed) || parsed <= 0) {
            toast.warning('Unit cost must be greater than 0.')
            return
        }
        await updateSupplierMutation.mutateAsync({
            supplierId: editCostDialog.supplierId,
            unitCost: parsed,
            isDefault: editCostDialog.isDefault,
        })
        setEditCostDialog({ ...editCostDialog, open: false })
    }

    async function handleUnlinkSupplier(supplierId: string, supplierName: string) {
        const confirmed = await confirm({
            title: 'Unlink Supplier',
            description: `Remove ${supplierName} from this product?`,
            confirmLabel: 'Unlink',
            variant: 'danger',
        })
        if (!confirmed) return
        await deleteSupplierMutation.mutateAsync(supplierId)
    }

    async function handleDeleteProduct() {
        if (!product) return
        const confirmed = await confirm({
            title: 'Delete Product',
            description: `Are you sure you want to delete ${product.name}? This action cannot be undone.`,
            confirmLabel: 'Delete',
            variant: 'danger',
        })
        if (!confirmed) return
        await deleteProductMutation.mutateAsync()
    }

    function handleEditClick() {
        sessionStorage.setItem('edit-products', productId)
        navigate({ to: '/app/products' })
    }

    return (
        <main className="space-y-6">
            {/* Top bar: back, edit, delete */}
            <div className="flex items-center justify-between gap-3">
                <Button variant="outline" onClick={() => navigate({ to: '/app/products' })}>
                    <ArrowLeft className="size-4" />
                    <span className="hidden sm:inline ml-2">Back to Products</span>
                </Button>

                {product && (
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className={getStatusBadgeClassName(product.isActive ? 'Active' : 'Inactive')}>
                            {product.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={!canWrite}
                            onClick={handleEditClick}
                        >
                            <Pencil className="size-4" />
                            <span className="hidden sm:inline ml-2">Edit</span>
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            disabled={!canWrite}
                            onClick={handleDeleteProduct}
                            loading={deleteProductMutation.isPending}
                        >
                            <Trash2 className="size-4" />
                            <span className="hidden sm:inline ml-2">Delete</span>
                        </Button>
                    </div>
                )}
            </div>

            {/* Product name bold at top */}
            {detailQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading product detail...</p>
            ) : detailQuery.isError || !product ? (
                <p className="text-sm text-destructive">Unable to load product detail.</p>
            ) : (
                <>
                    <h1 className="text-2xl font-bold tracking-tight">{product.name}</h1>

                    {/* Tabs */}
                    <div className="border-b border-border">
                        <nav className="flex gap-4" role="tablist">
                            {TABS.map((tab) => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    role="tab"
                                    aria-selected={activeTab === tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        'relative pb-2.5 text-sm font-medium transition-colors',
                                        activeTab === tab.id
                                            ? 'text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:rounded-full after:bg-primary'
                                            : 'text-muted-foreground hover:text-foreground',
                                    )}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </nav>
                    </div>

                    {/* Tab content */}
                    {activeTab === 'overview' && (
                        <div className="grid gap-6 lg:grid-cols-[1fr_240px]">
                            <Card className="bg-surface/95">
                                <CardHeader>
                                    <CardTitle>Product Details</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid gap-4 md:grid-cols-2  text-sm">
                                        <p><span className="text-muted-foreground">SKU:</span> {product.sku}</p>
                                        <p><span className="text-muted-foreground">Item Code:</span> {product.itemCode}</p>
                                        <p><span className="text-muted-foreground">Category:</span> {product.categoryCode}</p>
                                        <p><span className="text-muted-foreground">Brand:</span> {product.brand} ({product.brandCode})</p>
                                        <p><span className="text-muted-foreground">Unit:</span> {product.unitOfMeasure}</p>
                                        <p><span className="text-muted-foreground">Reorder:</span> {product.reorderThreshold}/{product.reorderQuantity}</p>
                                        <p className="md:col-span-2"><span className="text-muted-foreground">Description:</span> {product.description || '—'}</p>
                                    </div>

                                    {variantEntries.length > 0 && (
                                        <div className="mt-4 flex flex-wrap gap-2">
                                            {variantEntries.map((entry) => (
                                                <Badge key={`${entry.label}-${entry.value}`} variant="outline">
                                                    {entry.label}: {entry.value}
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                            <div>
                                {product.imageUrl ? (
                                    <div className="relative aspect-square overflow-hidden rounded-lg border border-border">
                                        {!imageLoaded && <ImageSkeleton className="absolute inset-0" />}
                                        <img
                                            src={product.imageUrl}
                                            alt={product.name}
                                            onLoad={() => setImageLoaded(true)}
                                            className={cn('h-full w-full object-cover', !imageLoaded && 'invisible')}
                                        />
                                    </div>
                                ) : (
                                    <div className="flex aspect-square items-center justify-center rounded-lg border border-border bg-muted/30">
                                        <span className="text-sm text-muted-foreground">No image</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'suppliers' && (
                        <Card className="bg-surface/95">
                            <CardHeader>
                                <CardTitle className="inline-flex items-center gap-2">Supplier Links<span title="Link suppliers to this product to track procurement sources, unit costs, and designate a default supplier for purchase orders."><Info className="size-4 text-muted-foreground cursor-help" /></span></CardTitle>
                                <CardDescription>Suppliers currently linked to this product. Manage default and unit cost here.</CardDescription>
                            </CardHeader>
                            <CardContent>


                                {!product.suppliers || product.suppliers.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">No suppliers linked to this product.</p>
                                ) : (
                                    <div className="overflow-x-auto rounded-lg border border-border">
                                        <table className="w-max min-w-full divide-y divide-border text-sm">
                                            <thead className="bg-muted/40 text-left text-muted-foreground">
                                                <tr>
                                                    <th className="px-4 py-3 font-medium">Supplier</th>
                                                    <th className="px-4 py-3 font-medium">Contact Person</th>
                                                    <th className="px-4 py-3 font-medium">Email</th>
                                                    <th className="px-4 py-3 font-medium">Phone</th>
                                                    <th className="px-4 py-3 font-medium">Lead Time</th>
                                                    <th className="px-4 py-3 font-medium">Unit Cost</th>
                                                    <th className="px-4 py-3 font-medium">Default</th>
                                                    <th className="px-4 py-3 font-medium">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border">
                                                {product.suppliers.map((supplier) => (
                                                    <tr key={supplier.supplierId}>
                                                        <td className="px-4 py-3 font-medium text-foreground">
                                                            {supplier.supplierName}
                                                            {supplier.isDefault && (
                                                                <Badge variant="success" className="ml-2">Default</Badge>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3">{supplier.supplierContactPerson || '—'}</td>
                                                        <td className="px-4 py-3">{supplier.supplierEmail || '—'}</td>
                                                        <td className="px-4 py-3">{supplier.supplierPhone || '—'}</td>
                                                        <td className="px-4 py-3">{supplier.supplierLeadTimeDays} days</td>
                                                        <td className="px-4 py-3">₦{supplier.unitCost.toLocaleString()}</td>
                                                        <td className="px-4 py-3">{supplier.isDefault ? 'Yes' : 'No'}</td>
                                                        <td className="px-4 py-3 w-16">
                                                            <Popover
                                                                trigger={
                                                                    <span className="inline-flex size-8 items-center justify-center rounded-md hover:bg-muted">
                                                                        <EllipsisVertical className="size-4" />
                                                                    </span>
                                                                }
                                                                align="end"
                                                            >
                                                                <div className="flex flex-col">
                                                                    {!supplier.isDefault && (
                                                                        <button
                                                                            type="button"
                                                                            disabled={!canWrite}
                                                                            onClick={() => handleSetDefault(supplier.supplierId, supplier.unitCost)}
                                                                            className="rounded-sm px-3 py-2 text-sm text-left hover:bg-muted transition-colors"
                                                                        >
                                                                            Set Default
                                                                        </button>
                                                                    )}
                                                                    <button
                                                                        type="button"
                                                                        disabled={!canWrite}
                                                                        onClick={() => openEditCostDialog(supplier.supplierId, supplier.unitCost, supplier.isDefault)}
                                                                        className="rounded-sm px-3 py-2 text-sm text-left hover:bg-muted transition-colors"
                                                                    >
                                                                        Edit Cost
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        disabled={!canWrite}
                                                                        onClick={() => handleUnlinkSupplier(supplier.supplierId, supplier.supplierName)}
                                                                        className="rounded-sm px-3 py-2 text-sm text-left text-destructive hover:bg-muted transition-colors"
                                                                    >
                                                                        Unlink
                                                                    </button>
                                                                </div>
                                                            </Popover>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                <div className="mt-8 rounded-lg border border-border bg-background/60 p-4">
                                    <div className="flex flex-wrap items-end gap-3">
                                        <div className="w-full max-w-sm space-y-1.5">
                                            <Label htmlFor="link-supplier">Supplier</Label>
                                            <select
                                                id="link-supplier"
                                                value={selectedSupplierId}
                                                onChange={(event) => setSelectedSupplierId(event.target.value)}
                                                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                                            >
                                                <option value="">Select supplier</option>
                                                {availableSuppliers.map((supplier) => (
                                                    <option key={supplier.supplierId} value={supplier.supplierId}>
                                                        {supplier.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="w-28 space-y-1.5">
                                            <Label htmlFor="link-unit-cost">Unit Cost</Label>
                                            <Input
                                                id="link-unit-cost"
                                                type="number"
                                                min={0.01}
                                                step={0.01}
                                                value={newSupplierUnitCost}
                                                onChange={(event) => setNewSupplierUnitCost(event.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="mt-3 flex items-center gap-3">
                                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="size-4 rounded border-input"
                                                checked={newSupplierIsDefault}
                                                onChange={(event) => setNewSupplierIsDefault(event.target.checked)}
                                            />
                                            Set as default
                                        </label>
                                        <Button
                                            onClick={handleLinkSupplier}
                                            loading={createSupplierMutation.isPending}
                                            disabled={!canWrite || createSupplierMutation.isPending || availableSuppliers.length === 0}
                                            size="sm"
                                        >
                                            Link
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </>
            )}
            {confirmDialog}

            <Dialog
                open={editCostDialog.open}
                onClose={() => setEditCostDialog({ ...editCostDialog, open: false })}
                title="Edit Unit Cost"
            >
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="edit-cost">Unit Cost</Label>
                        <Input
                            id="edit-cost"
                            type="number"
                            min={0.01}
                            step={0.01}
                            value={editCostDialog.value}
                            onChange={(e) => setEditCostDialog({ ...editCostDialog, value: e.target.value })}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault()
                                    if (canWrite) handleUpdateUnitCost()
                                }
                            }}
                        />
                    </div>
                    <div className="flex gap-3">
                        <Button disabled={!canWrite} onClick={handleUpdateUnitCost} loading={updateSupplierMutation.isPending}>
                            Save
                        </Button>
                        <Button variant="outline" onClick={() => setEditCostDialog({ ...editCostDialog, open: false })}>
                            Cancel
                        </Button>
                    </div>
                </div>
            </Dialog>
        </main>
    )
}
