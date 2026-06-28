import { useEffect, useMemo, useRef, useState, type ReactNode, useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { useForm, type DefaultValues, type FieldValues, type Path, type Resolver } from 'react-hook-form'
import { Columns, EllipsisVertical, Filter, GripVertical } from 'lucide-react'
import {
    Badge,
    Button,
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    Dialog,
    Input,
    Label,
    Popover,
    SearchableSelect,
    Textarea,
    useConfirm,
    toast,
} from '@/components/ui'
import { getApiErrorMessage, type Pagination } from '@/api/types'
import { getGroupLabel } from '@/lib/nav-groups'
import { cn } from '@/lib/cn'

type CrudFieldType = 'text' | 'email' | 'number' | 'textarea' | 'checkbox' | 'select' | 'searchableSelect'

export interface CrudFieldOption {
    label: string
    value: string
}

type CrudFieldMode = 'create' | 'edit'

export interface CrudField<TForm extends FieldValues> {
    name: Path<TForm>
    label: string
    required?: boolean
    type?: CrudFieldType
    placeholder?: string
    options?: CrudFieldOption[]
    modes?: CrudFieldMode[]
    onAddNew?: () => void
    addNewLabel?: string
}

export interface CrudColumn<TItem> {
    header: string
    render: (item: TItem) => ReactNode
    className?: string
    truncate?: boolean
    title?: (item: TItem) => string | undefined
    order?: number
    minWidth?: string
}

interface FetchResult<TItem> {
    data: TItem[]
    pagination: Pagination
}

interface CrudResourcePageProps<TItem, TForm extends FieldValues> {
    title: string
    description: string
    entityLabel: string
    queryKey: string
    searchPlaceholder: string
    minSearchCharacters?: number
    searchDebounceMs?: number
    fields: CrudField<TForm>[]
    columns: CrudColumn<TItem>[]
    resolver: Resolver<any>
    getItemId: (item: TItem) => string
    getDefaultValues: (item?: TItem) => DefaultValues<TForm>
    fetchItems: (args: { pageNumber: number; pageSize: number; searchTerm: string }) => Promise<FetchResult<TItem>>
    createItem: (values: TForm) => Promise<unknown>
    updateItem: (item: TItem, values: Partial<TForm>) => Promise<unknown>
    deleteItem: (item: TItem) => Promise<unknown>
    getDeleteLabel?: (item: TItem) => string
    getViewPath?: (item: TItem) => string
    extraFormContent?: ReactNode | ((item: TItem | null) => ReactNode)
    forceSubmit?: boolean
    /** Item ID to auto-open edit for when data loads (used from detail page Edit button). */
    initialEditItemId?: string
}

function getDirtyValues<TForm extends FieldValues>(values: TForm, dirtyFields: Record<string, unknown>): Partial<TForm> {
    const sourceValues = values as Record<string, unknown>
    const payload: Record<string, unknown> = {}

    for (const [key, marker] of Object.entries(dirtyFields)) {
        if (marker === true) {
            payload[key] = sourceValues[key]
        }
    }

    return payload as Partial<TForm>
}

function loadColumnPrefs(queryKey: string, allHeaders: string[]) {
    try {
        const raw = localStorage.getItem(`columns-${queryKey}`)
        if (!raw) return { visible: allHeaders, order: allHeaders }
        const parsed = JSON.parse(raw) as { visible?: string[]; order?: string[] }
        return {
            visible: parsed.visible?.filter((h) => allHeaders.includes(h)) ?? allHeaders,
            order: parsed.order?.filter((h) => allHeaders.includes(h)) ?? allHeaders,
        }
    } catch {
        return { visible: allHeaders, order: allHeaders }
    }
}

function saveColumnPrefs(queryKey: string, visible: string[], order: string[]) {
    localStorage.setItem(`columns-${queryKey}`, JSON.stringify({ visible, order }))
}

export function CrudResourcePage<TItem, TForm extends FieldValues>({
    title,
    description,
    entityLabel,
    queryKey,
    searchPlaceholder,
    minSearchCharacters = 3,
    searchDebounceMs = 300,
    fields,
    columns,
    resolver,
    getItemId,
    getDefaultValues,
    fetchItems,
    createItem,
    updateItem,
    deleteItem,
    getDeleteLabel,
    getViewPath,
    extraFormContent,
    initialEditItemId,
    forceSubmit,
}: CrudResourcePageProps<TItem, TForm>) {
    const navigate = useNavigate()
    const pathname = useRouterState({ select: (s) => s.location.pathname })
    const queryClient = useQueryClient()
    const { confirm, dialog } = useConfirm()
    const [pageNumber, setPageNumber] = useState(1)
    const [pageSize] = useState(7)
    const [searchInput, setSearchInput] = useState('')
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
    const [mode, setMode] = useState<'create' | 'edit' | null>(null)
    const [selectedItem, setSelectedItem] = useState<TItem | null>(null)
    const [filterDateFrom, setFilterDateFrom] = useState('')
    const [filterDateTo, setFilterDateTo] = useState('')
    const [activeDateFrom, setActiveDateFrom] = useState('')
    const [activeDateTo, setActiveDateTo] = useState('')
    const [showFilterModal, setShowFilterModal] = useState(false)
    const [showColumnModal, setShowColumnModal] = useState(false)
    const autoEditTriggered = useRef(false)
    const [dragIdx, setDragIdx] = useState<number | null>(null)
    const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

    const trimmedSearchInput = searchInput.trim()
    const activeSearchTerm = useMemo(
        () => (debouncedSearchTerm.length >= minSearchCharacters ? debouncedSearchTerm : ''),
        [debouncedSearchTerm, minSearchCharacters],
    )
    const visibleFields = useMemo(
        () => fields.filter((field) => !mode || !field.modes || field.modes.includes(mode)),
        [fields, mode],
    )

    const sortedColumns = useMemo(() => {
        return [...columns].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    }, [columns])

    const hasTimestamps = true

    const allColumnHeaders = useMemo(() => {
        const headers = sortedColumns.map((c) => c.header)
        if (hasTimestamps) {
            headers.push('Created', 'Updated')
        }
        headers.push('__actions__')
        return headers
    }, [sortedColumns])

    const [columnPrefs, setColumnPrefs] = useState(() =>
        loadColumnPrefs(queryKey, allColumnHeaders),
    )

    useEffect(() => {
        setColumnPrefs(() => {
            const merged = loadColumnPrefs(queryKey, allColumnHeaders)
            const newHeaders = allColumnHeaders.filter((h) => !merged.order.includes(h))
            return {
                visible: [...merged.visible, ...newHeaders.filter((h) => !merged.visible.includes(h))],
                order: [...merged.order, ...newHeaders],
            }
        })
    }, [allColumnHeaders, queryKey])

    function persistColumnPrefs(visible: string[], order: string[]) {
        setColumnPrefs({ visible, order })
        saveColumnPrefs(queryKey, visible, order)
    }

    function toggleColumn(header: string) {
        const visible = columnPrefs.visible.includes(header)
            ? columnPrefs.visible.filter((h) => h !== header)
            : [...columnPrefs.visible, header]
        persistColumnPrefs(visible, columnPrefs.order)
    }

    function handleDragStart(idx: number) {
        setDragIdx(idx)
    }

    function handleDragOver(e: React.DragEvent, idx: number) {
        e.preventDefault()
        if (dragIdx === null) return
        setDragOverIdx(idx)
    }

    function handleDrop(idx: number) {
        if (dragIdx === null || dragIdx === idx) {
            setDragIdx(null)
            setDragOverIdx(null)
            return
        }
        const newOrder = [...columnPrefs.order]
        const [moved] = newOrder.splice(dragIdx, 1)
        newOrder.splice(idx, 0, moved)
        persistColumnPrefs(columnPrefs.visible, newOrder)
        setDragIdx(null)
        setDragOverIdx(null)
    }

    function handleDragEnd() {
        setDragIdx(null)
        setDragOverIdx(null)
    }

    const visibleColumnHeaders = useMemo(() => {
        return columnPrefs.order.filter((h) => columnPrefs.visible.includes(h))
    }, [columnPrefs])

    const filterByDate = useCallback(
        (items: TItem[]) => {
            if (!activeDateFrom && !activeDateTo) return items
            return items.filter((item) => {
                const createdAt = (item as any).createdAt as string | undefined
                if (!createdAt) return true
                const date = new Date(createdAt)
                if (activeDateFrom && new Date(activeDateFrom) > date) return false
                if (activeDateTo) {
                    const endDate = new Date(activeDateTo)
                    endDate.setHours(23, 59, 59, 999)
                    if (endDate < date) return false
                }
                return true
            })
        },
        [activeDateFrom, activeDateTo],
    )

    const {
        register,
        handleSubmit,
        reset,
        watch,
        setValue,
        formState: { errors, isSubmitting, dirtyFields },
    } = useForm<TForm>({
        resolver: resolver as Resolver<TForm>,
        defaultValues: getDefaultValues(),
    })

    function renderFieldInline(field: CrudField<TForm>, error?: string) {
        if (field.type === 'searchableSelect') {
            const currentValue = (watch(field.name) as string) ?? ''
            return (
                <div className="space-y-2">
                    <Label required={field.required}>{field.label}</Label>
                    <SearchableSelect
                        options={(field.options ?? []).map((o) => ({ label: o.label, value: o.value }))}
                        value={currentValue}
                        onChange={(val) => setValue(field.name, val as any, { shouldDirty: true })}
                        placeholder={field.placeholder ?? `Search ${field.label}...`}
                        onAddNew={field.onAddNew}
                        addNewLabel={field.addNewLabel}
                    />
                    {error && <p className="text-xs text-destructive">{error}</p>}
                </div>
            )
        }

        if (field.type === 'textarea') {
            return (
                <div className="space-y-2">
                    <Label htmlFor={field.name as string} required={field.required}>{field.label}</Label>
                    <Textarea id={field.name as string} placeholder={field.placeholder} error={Boolean(error)} {...register(field.name)} />
                    {error && <p className="text-xs text-destructive">{error}</p>}
                </div>
            )
        }

        if (field.type === 'checkbox') {
            return (
                <label className="inline-flex items-center gap-2 text-sm text-foreground">
                    <input type="checkbox" className="size-4 rounded border-input" {...register(field.name)} />
                    <span>
                        {field.label}
                        {field.required && <span className="ml-1 text-destructive" aria-hidden>*</span>}
                    </span>
                </label>
            )
        }

        if (field.type === 'select') {
            return (
                <div className="space-y-2">
                    <Label htmlFor={field.name as string} required={field.required}>{field.label}</Label>
                    <select
                        id={field.name as string}
                        className={cn(
                            'h-10 w-full rounded-md border bg-background px-3 text-sm text-foreground',
                            'border-input focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                            error && 'border-destructive',
                        )}
                        {...register(field.name)}
                    >
                        <option value="">{field.placeholder ?? `Select ${field.label}`}</option>
                        {(field.options ?? []).map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                    {error && <p className="text-xs text-destructive">{error}</p>}
                </div>
            )
        }

        return (
            <div className="space-y-2">
                <Label htmlFor={field.name as string} required={field.required}>{field.label}</Label>
                <Input
                    id={field.name as string}
                    type={field.type ?? 'text'}
                    placeholder={field.placeholder}
                    error={Boolean(error)}
                    {...register(field.name)}
                />
                {error && <p className="text-xs text-destructive">{error}</p>}
            </div>
        )
    }

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            setDebouncedSearchTerm(trimmedSearchInput)
        }, searchDebounceMs)

        return () => window.clearTimeout(timeoutId)
    }, [trimmedSearchInput, searchDebounceMs])

    useEffect(() => {
        setPageNumber(1)
    }, [activeSearchTerm])

    const listQuery = useQuery({
        queryKey: [queryKey, activeSearchTerm, pageNumber, pageSize],
        queryFn: () => fetchItems({ pageNumber, pageSize, searchTerm: activeSearchTerm }),
        staleTime: 0,
    })

    useEffect(() => {
        if (!initialEditItemId || autoEditTriggered.current) return
        const rawItems = listQuery.data?.data ?? []
        const item = rawItems.find((i) => getItemId(i) === initialEditItemId)
        if (item) {
            autoEditTriggered.current = true
            openEdit(item)
        }
    }, [initialEditItemId, listQuery.data?.data])

    const invalidate = () => queryClient.invalidateQueries({ queryKey: [queryKey] })

    const createMutation = useMutation({
        mutationFn: createItem,
        onSuccess: async () => {
            await Promise.all([
                invalidate(),
                queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] }),
            ])
            toast.success(`${entityLabel} created successfully.`)
            closeForm()
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, `Unable to create ${entityLabel.toLowerCase()}.`))
        },
    })

    const updateMutation = useMutation({
        mutationFn: ({ item, values }: { item: TItem; values: Partial<TForm> }) => updateItem(item, values),
        onSuccess: async () => {
            await Promise.all([
                invalidate(),
                queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] }),
            ])
            toast.success(`${entityLabel} updated successfully.`)
            closeForm()
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, `Unable to update ${entityLabel.toLowerCase()}.`))
        },
    })

    const deleteMutation = useMutation({
        mutationFn: deleteItem,
        onSuccess: async (_, item) => {
            await Promise.all([
                invalidate(),
                queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] }),
            ])
            const label = getDeleteLabel?.(item) ?? entityLabel
            toast.success(`${label} deleted successfully.`)
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, `Unable to delete ${entityLabel.toLowerCase()}.`))
        },
    })

    function closeForm() {
        setMode(null)
        setSelectedItem(null)
        reset(getDefaultValues())
    }

    function openCreate() {
        setMode('create')
        setSelectedItem(null)
        reset(getDefaultValues())
    }

    function openEdit(item: TItem) {
        setMode('edit')
        setSelectedItem(item)
        reset(getDefaultValues(item))
    }

    async function onSubmit(values: TForm) {
        try {
            if (mode === 'edit' && selectedItem) {
                const dirtyValues = getDirtyValues(values, dirtyFields as Record<string, unknown>)
                if (Object.keys(dirtyValues).length === 0 && !forceSubmit) {
                    closeForm()
                    return
                }

                await updateMutation.mutateAsync({ item: selectedItem, values: dirtyValues })
                return
            }

            await createMutation.mutateAsync(values)
        } catch {
            // Mutation onError handlers already surface backend-aware toast messages.
        }
    }

    async function handleDelete(item: TItem) {
        const label = getDeleteLabel?.(item) ?? entityLabel
        const confirmed = await confirm({
            title: `Delete ${entityLabel}`,
            description: `Are you sure you want to delete ${label}? This action cannot be undone.`,
            confirmLabel: 'Delete',
            variant: 'danger',
        })
        if (!confirmed) return
        await deleteMutation.mutateAsync(item)
    }

    function handleRowClick(item: TItem) {
        if (getViewPath) {
            navigate({ to: getViewPath(item) as never })
        }
    }

    function applyFilter() {
        setActiveDateFrom(filterDateFrom)
        setActiveDateTo(filterDateTo)
        setShowFilterModal(false)
    }

    function resetFilter() {
        setFilterDateFrom('')
        setFilterDateTo('')
        setActiveDateFrom('')
        setActiveDateTo('')
        setShowFilterModal(false)
    }

    const pagination = listQuery.data?.pagination
    const rawItems = listQuery.data?.data ?? []
    const items = useMemo(() => filterByDate(rawItems), [rawItems, filterByDate])

    const pageSummary = useMemo(() => {
        if (!pagination) return 'No pagination data'

        const currentPage = pagination.pageNumber ?? pagination.currentPage ?? 1
        return `Page ${currentPage} of ${pagination.totalPages}`
    }, [pagination])

    const hasActiveFilter = activeDateFrom || activeDateTo

    const totalColSpan = visibleColumnHeaders.length

    return (
        <main className="min-w-0 space-y-6">
            <section className="rounded-3xl border border-border/60 bg-linear-to-br from-background via-background to-primary/5 p-6 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div>
                        <Badge variant="outline" className="mb-3 border-primary/20 bg-primary/10 text-primary">
                            {getGroupLabel(pathname) || entityLabel}
                        </Badge>
                        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
                        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
                    </div>
                    <Button onClick={openCreate}>Add {entityLabel}</Button>
                </div>
            </section>

            {mode && (
                <Card className="bg-surface/95">
                    <CardHeader>
                        <CardTitle>{mode === 'create' ? `Create ${entityLabel}` : `Edit ${entityLabel}`}</CardTitle>
                        <CardDescription>
                            {mode === 'create' ? `Add a new ${entityLabel.toLowerCase()}.` : `Update the selected ${entityLabel.toLowerCase()}.`}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                {visibleFields.map((field) => (
                                    <div key={field.name as string} className={cn(field.type === 'textarea' && 'md:col-span-2')}>
                                        {renderFieldInline(field, errors[field.name]?.message as string | undefined)}
                                    </div>
                                ))}
                            </div>

                            {typeof extraFormContent === 'function' ? (extraFormContent as (item: TItem | null) => ReactNode)(selectedItem) : extraFormContent}

                            <div className="flex flex-wrap gap-3">
                                <Button type="submit" loading={isSubmitting || createMutation.isPending || updateMutation.isPending}>
                                    {mode === 'create' ? `Create ${entityLabel}` : `Save Changes`}
                                </Button>
                                <Button type="button" variant="outline" onClick={closeForm}>
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            <Card className="min-w-0 bg-surface/95">
                <CardHeader>
                    <CardTitle>{title} List</CardTitle>
                    <CardDescription>Search, review, update, and remove records.</CardDescription>
                </CardHeader>
                <CardContent className="min-w-0 space-y-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <Input
                            value={searchInput}
                            onChange={(event) => setSearchInput(event.target.value)}
                            placeholder={searchPlaceholder}
                            className="md:max-w-sm"
                        />
                        <div className="flex items-center gap-2">
                            {hasActiveFilter && (
                                <Badge variant="outline" className="text-xs">
                                    Filter active
                                </Badge>
                            )}
                            <p className="text-xs text-muted-foreground">{pageSummary}</p>
                        </div>
                    </div>

                    {trimmedSearchInput.length > 0 && trimmedSearchInput.length < minSearchCharacters && (
                        <p className="text-xs text-muted-foreground">
                            Type at least {minSearchCharacters} characters to run search. Shorter input shows the default list.
                        </p>
                    )}

                    {/* Toolbar — icon-only buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setShowColumnModal(true)}
                            className="inline-flex size-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            title="Manage columns"
                        >
                            <Columns className="size-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowFilterModal(true)}
                            className="inline-flex size-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            title="Filter"
                        >
                            <Filter className="size-4" />
                        </button>
                    </div>

                    {/* Column Manager Dialog — drag-and-drop with GripVertical */}
                    <Dialog
                        open={showColumnModal}
                        onClose={() => setShowColumnModal(false)}
                        title="Show columns"
                        description="Toggle visibility and drag to reorder."
                    >
                        <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
                            {columnPrefs.order.map((header, idx) => {
                                if (header === '__actions__') return null
                                const isVisible = columnPrefs.visible.includes(header)

                                return (
                                    <div
                                        key={header}
                                        draggable
                                        onDragStart={() => handleDragStart(idx)}
                                        onDragOver={(e) => handleDragOver(e, idx)}
                                        onDrop={() => handleDrop(idx)}
                                        onDragEnd={handleDragEnd}
                                        className={cn(
                                            'flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm transition-all duration-200 ease-in-out',
                                            dragIdx === idx && 'opacity-40',
                                            dragOverIdx === idx && dragIdx !== idx && 'border-t-2 border-t-primary',
                                        )}
                                    >
                                        <button
                                            type="button"
                                            className="cursor-grab p-1 text-muted-foreground hover:text-foreground active:cursor-grabbing touch-none"
                                            title="Drag to reorder"
                                        >
                                            <GripVertical className="size-4" />
                                        </button>
                                        <label className="flex flex-1 cursor-pointer items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={isVisible}
                                                onChange={() => toggleColumn(header)}
                                                className="size-4 shrink-0 rounded border-input"
                                            />
                                            <span>{header}</span>
                                        </label>
                                    </div>
                                )
                            })}
                        </div>
                    </Dialog>

                    {/* Filter Dialog */}
                    <Dialog
                        open={showFilterModal}
                        onClose={() => setShowFilterModal(false)}
                        title="Filter Records"
                        description="Apply date range and other filters."
                    >
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Created From</Label>
                                <Input
                                    type="date"
                                    value={filterDateFrom}
                                    onChange={(e) => setFilterDateFrom(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Created To</Label>
                                <Input
                                    type="date"
                                    value={filterDateTo}
                                    onChange={(e) => setFilterDateTo(e.target.value)}
                                />
                            </div>
                            <div className="flex flex-wrap gap-3">
                                <Button onClick={applyFilter}>Apply Filter</Button>
                                <Button variant="outline" onClick={resetFilter}>Reset</Button>
                            </div>
                        </div>
                    </Dialog>

                    <div className="w-full max-w-full overflow-x-auto rounded-lg border border-border">
                        <table className="w-max min-w-full table-auto divide-y divide-border text-sm">
                            <thead className="bg-muted/40 text-left text-muted-foreground">
                                <tr>
                                    {visibleColumnHeaders.map((header) => {
                                        if (header === '__actions__') {
                                            return (
                                                <th
                                                    key={header}
                                                    className="w-16 min-w-16 px-4 py-3 font-medium whitespace-nowrap"
                                                >
                                                    Actions
                                                </th>
                                            )
                                        }
                                        if (header === 'Created') {
                                            return (
                                                <th key={header} className="w-28 min-w-28 px-4 py-3 font-medium whitespace-nowrap">
                                                    Created
                                                </th>
                                            )
                                        }
                                        if (header === 'Updated') {
                                            return (
                                                <th key={header} className="w-28 min-w-28 px-4 py-3 font-medium whitespace-nowrap">
                                                    Updated
                                                </th>
                                            )
                                        }
                                        const col = sortedColumns.find((c) => c.header === header)
                                        return (
                                            <th
                                                key={header}
                                                className={cn('px-4 py-3 font-medium whitespace-nowrap', col?.className, col?.minWidth)}
                                            >
                                                {header}
                                            </th>
                                        )
                                    })}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {listQuery.isLoading ? (
                                    <tr>
                                        <td colSpan={totalColSpan} className="px-4 py-6 text-center text-muted-foreground">
                                            Loading...
                                        </td>
                                    </tr>
                                ) : items.length === 0 ? (
                                    <tr>
                                        <td colSpan={totalColSpan} className="px-4 py-6 text-center text-muted-foreground">
                                            No {entityLabel.toLowerCase()} records found.
                                        </td>
                                    </tr>
                                ) : (
                                    items.map((item) => (
                                        <tr
                                            key={getItemId(item)}
                                            className={cn('bg-surface', getViewPath && 'cursor-pointer hover:bg-muted/50 transition-colors')}
                                            onClick={() => handleRowClick(item)}
                                        >
                                            {visibleColumnHeaders.map((header) => {
                                                if (header === '__actions__') {
                                                    return (
                                                        <td
                                                            key={header}
                                                            className="w-16 min-w-16 px-4 py-3 align-top whitespace-nowrap"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <Popover
                                                                trigger={
                                                                    <span className="inline-flex size-8 items-center justify-center rounded-md hover:bg-muted">
                                                                        <EllipsisVertical className="size-4" />
                                                                    </span>
                                                                }
                                                                align="end"
                                                            >
                                                                <div className="flex flex-col">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => openEdit(item)}
                                                                        className="rounded-sm px-3 py-2 text-sm text-left hover:bg-muted transition-colors"
                                                                    >
                                                                        Edit
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleDelete(item)}
                                                                        className="rounded-sm px-3 py-2 text-sm text-left text-destructive hover:bg-muted transition-colors"
                                                                    >
                                                                        Delete
                                                                    </button>
                                                                </div>
                                                            </Popover>
                                                        </td>
                                                    )
                                                }

                                                if (header === 'Created') {
                                                    return (
                                                        <td key={header} className="w-28 min-w-28 px-4 py-3 align-top whitespace-nowrap text-muted-foreground">
                                                            {formatDate((item as any).createdAt)}
                                                        </td>
                                                    )
                                                }

                                                if (header === 'Updated') {
                                                    return (
                                                        <td key={header} className="w-28 min-w-28 px-4 py-3 align-top whitespace-nowrap text-muted-foreground">
                                                            {formatDate((item as any).updatedAt)}
                                                        </td>
                                                    )
                                                }

                                                const col = sortedColumns.find((c) => c.header === header)
                                                if (!col) return <td key={header} className="px-4 py-3" />

                                                return (
                                                    <td
                                                        key={header}
                                                        className={cn('px-4 py-3 align-top', col.className, col.minWidth)}
                                                    >
                                                        <div
                                                            className={cn(
                                                                'block',
                                                                col.truncate && !col.minWidth && 'max-w-0 overflow-hidden text-ellipsis whitespace-nowrap',
                                                            )}
                                                            title={col.title?.(item)}
                                                        >
                                                            {col.render(item)}
                                                        </div>
                                                    </td>
                                                )
                                            })}
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
            {dialog}
        </main>
    )
}

function formatDate(value: string | undefined | null): string {
    if (!value) return '—'
    try {
        return new Date(value).toLocaleDateString()
    } catch {
        return '—'
    }
}
