import { useEffect, useMemo, useState, type SyntheticEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { getApiErrorMessage } from '@/api/types'
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Textarea, toast } from '@/components/ui'
import { OPENING_BALANCE_STATUS } from '@/lib/domain-values'
import { fetchProducts } from '@/services/products.service'
import { createOpeningBalance, fetchOpeningBalances, type CreateOpeningBalanceRequest } from '@/services/opening-balances.service'
import { fetchWarehouses } from '@/services/warehouses.service'

type OpeningBalanceLineDraft = {
    id: string
    productId: string
    quantity: string
    unitCost: string
}

type OpeningBalanceFormState = {
    warehouseId: string
    notes: string
    lines: OpeningBalanceLineDraft[]
}

const MIN_SEARCH_CHARACTERS = 3
const SEARCH_DEBOUNCE_MS = 300

function createLineDraft(): OpeningBalanceLineDraft {
    return {
        id: crypto.randomUUID(),
        productId: '',
        quantity: '1',
        unitCost: '',
    }
}

function createEmptyForm(): OpeningBalanceFormState {
    return {
        warehouseId: '',
        notes: '',
        lines: [createLineDraft()],
    }
}

export function OpeningBalancesPage() {
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const [pageNumber, setPageNumber] = useState(1)
    const [pageSize] = useState(7)
    const [searchInput, setSearchInput] = useState('')
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
    const [isComposerOpen, setIsComposerOpen] = useState(false)
    const [formState, setFormState] = useState<OpeningBalanceFormState>(createEmptyForm)
    const [formError, setFormError] = useState<string | null>(null)
    const trimmedSearchInput = searchInput.trim()
    const activeSearchTerm = useMemo(
        () => (debouncedSearchTerm.length >= MIN_SEARCH_CHARACTERS ? debouncedSearchTerm : ''),
        [debouncedSearchTerm],
    )

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            setDebouncedSearchTerm(trimmedSearchInput)
        }, SEARCH_DEBOUNCE_MS)

        return () => window.clearTimeout(timeoutId)
    }, [trimmedSearchInput])

    useEffect(() => {
        setPageNumber(1)
    }, [activeSearchTerm])

    const balancesQuery = useQuery({
        queryKey: ['opening-balances', activeSearchTerm, pageNumber, pageSize],
        queryFn: () => fetchOpeningBalances({ pageNumber, pageSize, searchTerm: activeSearchTerm }),
    })

    const warehousesQuery = useQuery({
        queryKey: ['warehouses', 'options'],
        queryFn: () => fetchWarehouses({ pageNumber: 1, pageSize: 200, searchTerm: '' }),
    })

    const productsQuery = useQuery({
        queryKey: ['products', 'options'],
        queryFn: () => fetchProducts({ pageNumber: 1, pageSize: 500, searchTerm: '' }),
    })

    const createMutation = useMutation({
        mutationFn: createOpeningBalance,
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['opening-balances'] }),
                queryClient.invalidateQueries({ queryKey: ['warehouse-detail'] }),
                queryClient.invalidateQueries({ queryKey: ['opening-balance-detail'] }),
            ])
            setFormState(createEmptyForm())
            setFormError(null)
            setIsComposerOpen(false)
            toast.success('Opening balance created.')
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, 'Unable to create opening balance.'))
        },
    })

    const warehouseNames = useMemo(() => {
        return Object.fromEntries((warehousesQuery.data?.data ?? []).map((warehouse) => [warehouse.warehouseId, warehouse.name]))
    }, [warehousesQuery.data])

    const items = balancesQuery.data?.data ?? []
    const pagination = balancesQuery.data?.pagination
    const pageSummary = useMemo(() => {
        if (!pagination) {
            return 'No pagination data'
        }

        const currentPage = pagination.pageNumber ?? pagination.currentPage ?? 1
        return `Page ${currentPage} of ${pagination.totalPages}`
    }, [pagination])

    function updateForm<K extends keyof OpeningBalanceFormState>(key: K, value: OpeningBalanceFormState[K]) {
        setFormState((current) => ({ ...current, [key]: value }))
    }

    function updateLine(id: string, key: keyof OpeningBalanceLineDraft, value: string) {
        setFormState((current) => ({
            ...current,
            lines: current.lines.map((line) => (line.id === id ? { ...line, [key]: value } : line)),
        }))
    }

    function addLine() {
        setFormState((current) => ({
            ...current,
            lines: [...current.lines, createLineDraft()],
        }))
    }

    function removeLine(id: string) {
        setFormState((current) => ({
            ...current,
            lines: current.lines.length === 1 ? current.lines : current.lines.filter((line) => line.id !== id),
        }))
    }

    async function handleCreate(event: SyntheticEvent<HTMLFormElement>) {
        event.preventDefault()

        const payload: CreateOpeningBalanceRequest = {
            warehouseId: formState.warehouseId.trim(),
            notes: formState.notes.trim(),
            lines: formState.lines.map((line) => ({
                productId: line.productId.trim(),
                quantity: Number(line.quantity),
                unitCost: Number(line.unitCost),
            })),
        }

        if (!payload.warehouseId) {
            setFormError('Warehouse is required.')
            return
        }

        if (payload.lines.length === 0) {
            setFormError('Add at least one opening balance line.')
            return
        }

        if (payload.lines.some((line) => !line.productId || line.quantity <= 0 || line.unitCost <= 0)) {
            setFormError('Each opening balance line needs a product, quantity above zero, and unit cost above zero.')
            return
        }

        if (new Set(payload.lines.map((line) => line.productId)).size !== payload.lines.length) {
            setFormError('Duplicate products are not allowed in opening balance lines.')
            return
        }

        setFormError(null)
        await createMutation.mutateAsync(payload)
    }

    return (
        <main className="min-w-0 space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                    <Badge variant="outline" className="mb-3 border-primary/30 bg-primary/10 text-primary">
                        Inventory Ops Flow
                    </Badge>
                    <h1 className="text-2xl font-semibold tracking-tight">Opening Balances</h1>
                    <p className="mt-2 text-sm text-muted-foreground">Set and review opening stock positions for warehouse inventory.</p>
                </div>

                <Button onClick={() => {
                    setIsComposerOpen(true)
                    setFormError(null)
                }}>
                    Create Opening Balance
                </Button>
            </div>

            {isComposerOpen && (
                <Card className="bg-surface/95">
                    <CardHeader>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <CardTitle>Create Opening Balance</CardTitle>
                                <CardDescription>Apply the starting stock position for a warehouse with one or more product lines.</CardDescription>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setIsComposerOpen(false)
                                    setFormState(createEmptyForm())
                                    setFormError(null)
                                }}
                            >
                                Close Form
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                <div className="space-y-2">
                                    <Label htmlFor="openingBalanceWarehouse" required>Warehouse</Label>
                                    <select
                                        id="openingBalanceWarehouse"
                                        value={formState.warehouseId}
                                        onChange={(event) => updateForm('warehouseId', event.target.value)}
                                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                                    >
                                        <option value="">Select warehouse</option>
                                        {(warehousesQuery.data?.data ?? []).map((warehouse) => (
                                            <option key={warehouse.warehouseId} value={warehouse.warehouseId}>{warehouse.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2 xl:col-span-2">
                                    <Label htmlFor="openingBalanceNotes">Notes</Label>
                                    <Textarea
                                        id="openingBalanceNotes"
                                        value={formState.notes}
                                        onChange={(event) => updateForm('notes', event.target.value)}
                                        placeholder="Optional note"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3 rounded-2xl border border-border/60 p-4">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <h2 className="text-sm font-medium">Opening balance lines</h2>
                                        <p className="text-xs text-muted-foreground">Each line defines the opening quantity and unit cost for one product.</p>
                                    </div>
                                    <Button type="button" variant="outline" onClick={addLine} className="w-full sm:w-auto">Add line</Button>
                                </div>

                                <div className="space-y-3">
                                    {formState.lines.map((line, index) => (
                                        <div key={line.id} className="grid gap-3 rounded-2xl border border-border/60 p-3 md:grid-cols-[1.4fr_0.8fr_0.8fr_auto]">
                                            <div className="space-y-2">
                                                <Label htmlFor={`opening-product-${line.id}`} required>Product {index + 1}</Label>
                                                <select
                                                    id={`opening-product-${line.id}`}
                                                    value={line.productId}
                                                    onChange={(event) => updateLine(line.id, 'productId', event.target.value)}
                                                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                                                >
                                                    <option value="">Select product</option>
                                                    {(productsQuery.data?.data ?? []).map((product) => (
                                                        <option key={product.productId} value={product.productId}>{product.name} ({product.sku})</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor={`opening-quantity-${line.id}`} required>Quantity</Label>
                                                <Input
                                                    id={`opening-quantity-${line.id}`}
                                                    type="number"
                                                    min="1"
                                                    value={line.quantity}
                                                    onChange={(event) => updateLine(line.id, 'quantity', event.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor={`opening-cost-${line.id}`} required>Unit cost</Label>
                                                <Input
                                                    id={`opening-cost-${line.id}`}
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
                                <Button type="submit" loading={createMutation.isPending}>Create Opening Balance</Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setFormState(createEmptyForm())
                                        setFormError(null)
                                    }}
                                >
                                    Reset Form
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            <Card className="min-w-0 bg-surface/95">
                <CardHeader>
                    <CardTitle>Opening Balances List</CardTitle>
                    <CardDescription>Search and review applied opening balances.</CardDescription>
                </CardHeader>
                <CardContent className="min-w-0 space-y-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <Input
                            value={searchInput}
                            onChange={(event) => setSearchInput(event.target.value)}
                            placeholder="Search opening balances by number, warehouse, or notes"
                            className="md:max-w-sm"
                        />
                        <p className="text-xs text-muted-foreground">{pageSummary}</p>
                    </div>

                    {trimmedSearchInput.length > 0 && trimmedSearchInput.length < MIN_SEARCH_CHARACTERS && (
                        <p className="text-xs text-muted-foreground">
                            Type at least {MIN_SEARCH_CHARACTERS} characters to run search. Shorter input shows the default list.
                        </p>
                    )}

                    <div className="w-full max-w-full overflow-x-auto rounded-lg border border-border">
                        <table className="w-max min-w-full table-auto divide-y divide-border text-sm">
                            <thead className="bg-muted/40 text-left text-muted-foreground">
                                <tr>
                                    <th className="px-4 py-3 font-medium whitespace-nowrap">Number</th>
                                    <th className="px-4 py-3 font-medium whitespace-nowrap">Warehouse</th>
                                    <th className="px-4 py-3 font-medium whitespace-nowrap">Applied</th>
                                    <th className="px-4 py-3 font-medium whitespace-nowrap">Status</th>
                                    <th className="px-4 py-3 font-medium whitespace-nowrap">Lines</th>
                                    <th className="w-56 min-w-56 px-4 py-3 font-medium whitespace-nowrap lg:sticky lg:right-0 lg:z-20 lg:border-l lg:border-border lg:bg-muted">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {balancesQuery.isLoading ? (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                                            Loading...
                                        </td>
                                    </tr>
                                ) : items.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                                            No opening balance records found.
                                        </td>
                                    </tr>
                                ) : (
                                    items.map((item) => (
                                        <tr key={item.openingBalanceId} className="bg-surface">
                                            <td className="px-4 py-3 align-top">{item.openingBalanceNumber}</td>
                                            <td className="px-4 py-3 align-top">{warehouseNames[item.warehouseId] ?? item.warehouseId}</td>
                                            <td className="px-4 py-3 align-top">{new Date(item.appliedAt).toLocaleDateString()}</td>
                                            <td className="px-4 py-3 align-top">
                                                <Badge variant="success">{OPENING_BALANCE_STATUS.APPLIED}</Badge>
                                            </td>
                                            <td className="px-4 py-3 align-top">{item.lines?.length ?? 0}</td>
                                            <td className="w-56 min-w-56 px-4 py-3 align-top whitespace-nowrap lg:sticky lg:right-0 lg:z-10 lg:border-l lg:border-border lg:bg-muted/50">
                                                <div className="relative z-10 flex flex-nowrap gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="secondary"
                                                        className="shrink-0"
                                                        onClick={() => navigate({
                                                            to: '/app/opening-balances/$openingBalanceId',
                                                            params: { openingBalanceId: item.openingBalanceId },
                                                        })}
                                                    >
                                                        View
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex items-center justify-between">
                        <Button
                            variant="outline"
                            onClick={() => setPageNumber((page) => Math.max(1, page - 1))}
                            disabled={!pagination || (pagination.pageNumber ?? pagination.currentPage ?? 1) <= 1}
                        >
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setPageNumber((page) => page + 1)}
                            disabled={!pagination || (pagination.pageNumber ?? pagination.currentPage ?? 1) >= pagination.totalPages}
                        >
                            Next
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </main>
    )
}
