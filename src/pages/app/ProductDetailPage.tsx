import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from '@/components/ui'
import { PRODUCT_VARIANT_FIELDS } from '@/lib/product-taxonomy'
import { fetchSuppliers } from '@/services/suppliers.service'
import {
    createProductSupplierLink,
    deleteProductSupplierLink,
    fetchProductById,
    updateProductSupplierLink,
} from '@/services/products.service'

export function ProductDetailPage() {
    const { productId } = useParams({ strict: false }) as { productId: string }
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const [selectedSupplierId, setSelectedSupplierId] = useState('')
    const [newSupplierUnitCost, setNewSupplierUnitCost] = useState('0')
    const [newSupplierIsDefault, setNewSupplierIsDefault] = useState(false)

    const detailQuery = useQuery({
        queryKey: ['product-detail', productId],
        queryFn: () => fetchProductById(productId),
    })

    const suppliersQuery = useQuery({
        queryKey: ['supplier-options'],
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
        },
    })

    const deleteSupplierMutation = useMutation({
        mutationFn: (supplierId: string) => deleteProductSupplierLink(productId, supplierId),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['product-detail', productId] })
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
            window.alert('Select a supplier to link.')
            return
        }

        const parsedCost = Number(newSupplierUnitCost)
        if (!Number.isFinite(parsedCost) || parsedCost <= 0) {
            window.alert('Unit cost must be greater than 0.')
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

    async function handleUpdateUnitCost(supplierId: string, currentUnitCost: number, isDefault: boolean) {
        const input = window.prompt('Enter new unit cost', currentUnitCost.toString())
        if (input === null) return

        const parsed = Number(input)
        if (!Number.isFinite(parsed) || parsed <= 0) {
            window.alert('Unit cost must be greater than 0.')
            return
        }

        await updateSupplierMutation.mutateAsync({ supplierId, unitCost: parsed, isDefault })
    }

    async function handleUnlinkSupplier(supplierId: string, supplierName: string) {
        const confirmed = window.confirm(`Unlink ${supplierName} from this product?`)
        if (!confirmed) return
        await deleteSupplierMutation.mutateAsync(supplierId)
    }

    return (
        <main className="space-y-6">
            <div className="flex items-center justify-between">
                <Button variant="outline" onClick={() => navigate({ to: '/app/products' })}>
                    <ArrowLeft className="size-4" />
                    Back to Products
                </Button>
                {product && <Badge variant={product.isActive ? 'success' : 'muted'}>{product.isActive ? 'Active' : 'Inactive'}</Badge>}
            </div>

            <Card className="bg-surface/95">
                <CardHeader>
                    <CardTitle>{product?.name ?? 'Product Detail'}</CardTitle>
                    <CardDescription>View full product profile, variants, and supplier links.</CardDescription>
                </CardHeader>
                <CardContent>
                    {detailQuery.isLoading ? (
                        <p className="text-sm text-muted-foreground">Loading product detail...</p>
                    ) : detailQuery.isError || !product ? (
                        <p className="text-sm text-destructive">Unable to load product detail.</p>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2">
                            <p><span className="text-muted-foreground">SKU:</span> {product.sku}</p>
                            <p><span className="text-muted-foreground">Item Code:</span> {product.itemCode}</p>
                            <p><span className="text-muted-foreground">Category:</span> {product.categoryCode}</p>
                            <p><span className="text-muted-foreground">Brand:</span> {product.brand} ({product.brandCode})</p>
                            <p><span className="text-muted-foreground">Unit:</span> {product.unitOfMeasure}</p>
                            <p><span className="text-muted-foreground">Reorder:</span> {product.reorderThreshold}/{product.reorderQuantity}</p>
                            <p className="md:col-span-2"><span className="text-muted-foreground">Description:</span> {product.description || '—'}</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {product && (
                <>
                    <Card className="bg-surface/95">
                        <CardHeader>
                            <CardTitle>Variant Values</CardTitle>
                            <CardDescription>Configured SKU differentiators for this product.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {variantEntries.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No variant values configured.</p>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {variantEntries.map((entry) => (
                                        <Badge key={`${entry.label}-${entry.value}`} variant="outline">
                                            {entry.label}: {entry.value}
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="bg-surface/95">
                        <CardHeader>
                            <CardTitle>Supplier Links</CardTitle>
                            <CardDescription>Suppliers currently linked to this product. Manage default and unit cost here.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="mb-4 grid gap-3 rounded-lg border border-border bg-background/60 p-3 md:grid-cols-[1fr_180px_auto_auto] md:items-end">
                                <div className="space-y-2">
                                    <Label htmlFor="link-supplier">Link Supplier</Label>
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

                                <div className="space-y-2">
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

                                <label className="inline-flex items-center gap-2 text-sm text-foreground">
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
                                    disabled={createSupplierMutation.isPending || availableSuppliers.length === 0}
                                >
                                    Link
                                </Button>
                            </div>

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
                                                <th className="w-56 min-w-56 px-4 py-3 font-medium lg:sticky lg:right-0 lg:z-20 lg:border-l lg:border-border lg:bg-muted">
                                                    Actions
                                                </th>
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
                                                    <td className="px-4 py-3 lg:sticky lg:right-0 lg:z-10 lg:border-l lg:border-border lg:bg-surface">
                                                        <div className="flex flex-wrap gap-2">
                                                            {!supplier.isDefault && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="secondary"
                                                                    onClick={() => handleSetDefault(supplier.supplierId, supplier.unitCost)}
                                                                    loading={updateSupplierMutation.isPending}
                                                                >
                                                                    Set Default
                                                                </Button>
                                                            )}
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => handleUpdateUnitCost(supplier.supplierId, supplier.unitCost, supplier.isDefault)}
                                                                loading={updateSupplierMutation.isPending}
                                                            >
                                                                Edit Cost
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="destructive"
                                                                onClick={() => handleUnlinkSupplier(supplier.supplierId, supplier.supplierName)}
                                                                loading={deleteSupplierMutation.isPending}
                                                            >
                                                                Unlink
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </>
            )}
        </main>
    )
}