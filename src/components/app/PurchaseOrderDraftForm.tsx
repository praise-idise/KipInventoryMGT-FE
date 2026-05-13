import type { Dispatch, SetStateAction, SyntheticEvent } from 'react'
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Textarea } from '@/components/ui'
import type { PurchaseOrderDraftValues, PurchaseOrderItem } from '@/services/purchase-orders.service'

type SupplierOption = {
    supplierId: string
    name: string
}

type WarehouseOption = {
    warehouseId: string
    name: string
}

type ProductOption = {
    productId: string
    name: string
    sku: string
}

export type PurchaseOrderLineDraft = {
    id: string
    productId: string
    quantityOrdered: string
    unitCost: string
}

export type PurchaseOrderFormState = {
    supplierId: string
    warehouseId: string
    expectedArrivalDate: string
    notes: string
    lines: PurchaseOrderLineDraft[]
}

interface PurchaseOrderDraftFormCardProps {
    title: string
    description: string
    submitLabel: string
    cancelLabel?: string
    submitLoading?: boolean
    formState: PurchaseOrderFormState
    setFormState: Dispatch<SetStateAction<PurchaseOrderFormState>>
    formError?: string | null
    suppliers: SupplierOption[]
    warehouses: WarehouseOption[]
    products: ProductOption[]
    onSubmit: (event: SyntheticEvent<HTMLFormElement>) => void | Promise<void>
    onCancel: () => void
}

export function createPurchaseOrderLineDraft(): PurchaseOrderLineDraft {
    return {
        id: crypto.randomUUID(),
        productId: '',
        quantityOrdered: '1',
        unitCost: '',
    }
}

export function createEmptyPurchaseOrderForm(): PurchaseOrderFormState {
    return {
        supplierId: '',
        warehouseId: '',
        expectedArrivalDate: '',
        notes: '',
        lines: [createPurchaseOrderLineDraft()],
    }
}

export function createPurchaseOrderEditForm(item: PurchaseOrderItem): PurchaseOrderFormState {
    return {
        supplierId: item.supplierId,
        warehouseId: item.warehouseId,
        expectedArrivalDate: item.expectedArrivalDate?.slice(0, 10) ?? '',
        notes: item.notes ?? '',
        lines: (item.lines?.length ? item.lines : [{ productId: '', quantityOrdered: 1, unitCost: 0 }]).map((line) => ({
            id: crypto.randomUUID(),
            productId: line.productId,
            quantityOrdered: String(line.quantityOrdered),
            unitCost: line.unitCost > 0 ? String(line.unitCost) : '',
        })),
    }
}

export function buildPurchaseOrderDraftValues(formState: PurchaseOrderFormState): PurchaseOrderDraftValues {
    return {
        supplierId: formState.supplierId.trim(),
        warehouseId: formState.warehouseId.trim(),
        expectedArrivalDate: formState.expectedArrivalDate,
        notes: formState.notes.trim(),
        lines: formState.lines.map((line) => ({
            productId: line.productId.trim(),
            quantityOrdered: Number(line.quantityOrdered),
            unitCost: Number(line.unitCost),
        })),
    }
}

function buildPurchaseOrderBaselineValues(item: PurchaseOrderItem): PurchaseOrderDraftValues {
    return {
        supplierId: item.supplierId,
        warehouseId: item.warehouseId,
        expectedArrivalDate: item.expectedArrivalDate?.slice(0, 10) ?? '',
        notes: (item.notes ?? '').trim(),
        lines: (item.lines ?? []).map((line) => ({
            productId: line.productId,
            quantityOrdered: Number(line.quantityOrdered),
            unitCost: Number(line.unitCost),
        })),
    }
}

function arePurchaseOrderLinesEqual(
    currentLines: PurchaseOrderDraftValues['lines'],
    baselineLines: PurchaseOrderDraftValues['lines'],
) {
    if (currentLines.length !== baselineLines.length) {
        return false
    }

    return currentLines.every((line, index) => {
        const baselineLine = baselineLines[index]
        return line.productId === baselineLine.productId
            && line.quantityOrdered === baselineLine.quantityOrdered
            && line.unitCost === baselineLine.unitCost
    })
}

export function buildPurchaseOrderDraftPatch(
    formState: PurchaseOrderFormState,
    baselineItem: PurchaseOrderItem,
): Partial<PurchaseOrderDraftValues> {
    const values = buildPurchaseOrderDraftValues(formState)
    const baselineValues = buildPurchaseOrderBaselineValues(baselineItem)
    const patch: Partial<PurchaseOrderDraftValues> = {}

    if (values.supplierId !== baselineValues.supplierId) {
        patch.supplierId = values.supplierId
    }

    if (values.warehouseId !== baselineValues.warehouseId) {
        patch.warehouseId = values.warehouseId
    }

    if (values.expectedArrivalDate !== baselineValues.expectedArrivalDate) {
        patch.expectedArrivalDate = values.expectedArrivalDate
    }

    if (values.notes !== baselineValues.notes) {
        patch.notes = values.notes
    }

    if (!arePurchaseOrderLinesEqual(values.lines, baselineValues.lines)) {
        patch.lines = values.lines
    }

    return patch
}

export function validatePurchaseOrderDraft(formState: PurchaseOrderFormState): string | null {
    const values = buildPurchaseOrderDraftValues(formState)

    if (!values.supplierId || !values.warehouseId) {
        return 'Supplier and warehouse are required.'
    }

    if (values.lines.length === 0) {
        return 'Add at least one purchase order line.'
    }

    if (values.lines.some((line) => !line.productId || line.quantityOrdered <= 0 || line.unitCost <= 0)) {
        return 'Every line needs a product, quantity above zero, and unit cost above zero.'
    }

    if (new Set(values.lines.map((line) => line.productId)).size !== values.lines.length) {
        return 'Duplicate products are not allowed in purchase order lines.'
    }

    return null
}

export function PurchaseOrderDraftFormCard({
    title,
    description,
    submitLabel,
    cancelLabel = 'Cancel',
    submitLoading = false,
    formState,
    setFormState,
    formError,
    suppliers,
    warehouses,
    products,
    onSubmit,
    onCancel,
}: PurchaseOrderDraftFormCardProps) {
    function updateForm<K extends keyof PurchaseOrderFormState>(key: K, value: PurchaseOrderFormState[K]) {
        setFormState((current) => ({ ...current, [key]: value }))
    }

    function updateLine(id: string, key: keyof PurchaseOrderLineDraft, value: string) {
        setFormState((current) => ({
            ...current,
            lines: current.lines.map((line) => (line.id === id ? { ...line, [key]: value } : line)),
        }))
    }

    function addLine() {
        setFormState((current) => ({
            ...current,
            lines: [...current.lines, createPurchaseOrderLineDraft()],
        }))
    }

    function removeLine(id: string) {
        setFormState((current) => ({
            ...current,
            lines: current.lines.length === 1 ? current.lines : current.lines.filter((line) => line.id !== id),
        }))
    }

    return (
        <Card className="bg-surface/95">
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={onSubmit} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <div className="space-y-2">
                            <Label htmlFor="purchaseOrderSupplier" required>Supplier</Label>
                            <select
                                id="purchaseOrderSupplier"
                                value={formState.supplierId}
                                onChange={(event) => updateForm('supplierId', event.target.value)}
                                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                            >
                                <option value="">Select supplier</option>
                                {suppliers.map((supplier) => (
                                    <option key={supplier.supplierId} value={supplier.supplierId}>{supplier.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="purchaseOrderWarehouse" required>Warehouse</Label>
                            <select
                                id="purchaseOrderWarehouse"
                                value={formState.warehouseId}
                                onChange={(event) => updateForm('warehouseId', event.target.value)}
                                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                            >
                                <option value="">Select warehouse</option>
                                {warehouses.map((warehouse) => (
                                    <option key={warehouse.warehouseId} value={warehouse.warehouseId}>{warehouse.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="purchaseOrderEta">Expected arrival</Label>
                            <Input
                                id="purchaseOrderEta"
                                type="date"
                                value={formState.expectedArrivalDate}
                                onChange={(event) => updateForm('expectedArrivalDate', event.target.value)}
                            />
                        </div>

                        <div className="space-y-2 xl:col-span-1">
                            <Label htmlFor="purchaseOrderNotes">Notes</Label>
                            <Textarea
                                id="purchaseOrderNotes"
                                value={formState.notes}
                                onChange={(event) => updateForm('notes', event.target.value)}
                                placeholder="Optional internal note"
                            />
                        </div>
                    </div>

                    <div className="space-y-3 rounded-2xl border border-border/60 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h2 className="text-sm font-medium">Order lines</h2>
                                <p className="text-xs text-muted-foreground">Each line must have a unique product, quantity, and unit cost.</p>
                            </div>
                            <Button type="button" variant="outline" onClick={addLine} className="w-full sm:w-auto">Add line</Button>
                        </div>

                        <div className="space-y-3">
                            {formState.lines.map((line, index) => (
                                <div key={line.id} className="grid gap-3 rounded-2xl border border-border/60 p-3 md:grid-cols-[1.6fr_0.8fr_0.8fr_auto]">
                                    <div className="space-y-2">
                                        <Label htmlFor={`product-${line.id}`} required>Product {index + 1}</Label>
                                        <select
                                            id={`product-${line.id}`}
                                            value={line.productId}
                                            onChange={(event) => updateLine(line.id, 'productId', event.target.value)}
                                            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                                        >
                                            <option value="">Select product</option>
                                            {products.map((product) => (
                                                <option key={product.productId} value={product.productId}>{product.name} ({product.sku})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor={`quantity-${line.id}`} required>Quantity</Label>
                                        <Input
                                            id={`quantity-${line.id}`}
                                            type="number"
                                            min="1"
                                            value={line.quantityOrdered}
                                            onChange={(event) => updateLine(line.id, 'quantityOrdered', event.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor={`unitCost-${line.id}`} required>Unit cost</Label>
                                        <Input
                                            id={`unitCost-${line.id}`}
                                            type="number"
                                            min="0.01"
                                            step="0.01"
                                            value={line.unitCost}
                                            onChange={(event) => updateLine(line.id, 'unitCost', event.target.value)}
                                        />
                                    </div>
                                    <div className="flex items-end">
                                        <Button type="button" variant="outline" onClick={() => removeLine(line.id)} disabled={formState.lines.length === 1}>
                                            Remove
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {formError && <p className="text-sm text-destructive">{formError}</p>}

                    <div className="flex flex-wrap gap-3">
                        <Button type="submit" loading={submitLoading}>{submitLabel}</Button>
                        <Button type="button" variant="outline" onClick={onCancel}>
                            {cancelLabel}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    )
}