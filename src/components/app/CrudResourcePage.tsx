import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useForm, type DefaultValues, type FieldValues, type Path, type Resolver } from 'react-hook-form'
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Textarea } from '@/components/ui'
import type { Pagination } from '@/api/types'
import { cn } from '@/lib/cn'

type CrudFieldType = 'text' | 'email' | 'number' | 'textarea' | 'checkbox' | 'select'
type CrudFieldMode = 'create' | 'edit'

type CrudFieldOption = {
    label: string
    value: string
}

export interface CrudField<TForm extends FieldValues> {
    name: Path<TForm>
    label: string
    required?: boolean
    type?: CrudFieldType
    placeholder?: string
    options?: CrudFieldOption[]
    modes?: CrudFieldMode[]
}

export interface CrudColumn<TItem> {
    header: string
    render: (item: TItem) => ReactNode
    className?: string
    truncate?: boolean
    title?: (item: TItem) => string | undefined
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

function renderField<TForm extends FieldValues>(
    field: CrudField<TForm>,
    register: ReturnType<typeof useForm<TForm>>['register'],
    error?: string,
) {
    if (field.type === 'textarea') {
        return (
            <div className="space-y-2">
                <Label htmlFor={field.name} required={field.required}>{field.label}</Label>
                <Textarea id={field.name} placeholder={field.placeholder} error={Boolean(error)} {...register(field.name)} />
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
                <Label htmlFor={field.name} required={field.required}>{field.label}</Label>
                <select
                    id={field.name}
                    className={cn(
                        'h-10 w-full rounded-md border bg-background px-3 text-sm text-foreground',
                        'border-input focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        error && 'border-destructive'
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
            <Label htmlFor={field.name} required={field.required}>{field.label}</Label>
            <Input
                id={field.name}
                type={field.type ?? 'text'}
                placeholder={field.placeholder}
                error={Boolean(error)}
                {...register(field.name)}
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
    )
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
}: CrudResourcePageProps<TItem, TForm>) {
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const [pageNumber, setPageNumber] = useState(1)
    const [pageSize] = useState(7)
    const [searchInput, setSearchInput] = useState('')
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
    const [mode, setMode] = useState<'create' | 'edit' | null>(null)
    const [selectedItem, setSelectedItem] = useState<TItem | null>(null)
    const trimmedSearchInput = searchInput.trim()
    const activeSearchTerm = useMemo(
        () => (debouncedSearchTerm.length >= minSearchCharacters ? debouncedSearchTerm : ''),
        [debouncedSearchTerm, minSearchCharacters],
    )
    const visibleFields = useMemo(
        () => fields.filter((field) => !mode || !field.modes || field.modes.includes(mode)),
        [fields, mode],
    )

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting, dirtyFields },
        setError,
    } = useForm<TForm>({
        resolver: resolver as Resolver<TForm>,
        defaultValues: getDefaultValues(),
    })

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
    })

    const invalidate = () => queryClient.invalidateQueries({ queryKey: [queryKey] })

    const createMutation = useMutation({
        mutationFn: createItem,
        onSuccess: async () => {
            await invalidate()
            closeForm()
        },
    })

    const updateMutation = useMutation({
        mutationFn: ({ item, values }: { item: TItem; values: Partial<TForm> }) => updateItem(item, values),
        onSuccess: async () => {
            await invalidate()
            closeForm()
        },
    })

    const deleteMutation = useMutation({
        mutationFn: deleteItem,
        onSuccess: async () => {
            await invalidate()
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
                if (Object.keys(dirtyValues).length === 0) {
                    closeForm()
                    return
                }

                await updateMutation.mutateAsync({ item: selectedItem, values: dirtyValues })
                return
            }

            await createMutation.mutateAsync(values)
        } catch {
            setError('root', { message: `Unable to save ${entityLabel.toLowerCase()}.` })
        }
    }

    async function handleDelete(item: TItem) {
        const label = getDeleteLabel?.(item) ?? entityLabel
        const confirmed = window.confirm(`Delete ${label}?`)
        if (!confirmed) return
        await deleteMutation.mutateAsync(item)
    }

    const pagination = listQuery.data?.pagination
    const items = listQuery.data?.data ?? []

    const pageSummary = useMemo(() => {
        if (!pagination) return 'No pagination data'

        const currentPage = pagination.pageNumber ?? pagination.currentPage ?? 1
        return `Page ${currentPage} of ${pagination.totalPages}`
    }, [pagination])

    return (
        <main className="min-w-0 space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                    <Badge variant="outline" className="mb-3 border-primary/30 bg-primary/10 text-primary">
                        {entityLabel} Flow
                    </Badge>
                    <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
                    <p className="mt-2 text-sm text-muted-foreground">{description}</p>
                </div>

                <Button onClick={openCreate}>Add {entityLabel}</Button>
            </div>

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
                                        {renderField(field, register, errors[field.name]?.message as string | undefined)}
                                    </div>
                                ))}
                            </div>

                            {errors.root?.message && <p className="text-sm text-destructive">{errors.root.message}</p>}

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
                        <p className="text-xs text-muted-foreground">{pageSummary}</p>
                    </div>

                    {trimmedSearchInput.length > 0 && trimmedSearchInput.length < minSearchCharacters && (
                        <p className="text-xs text-muted-foreground">
                            Type at least {minSearchCharacters} characters to run search. Shorter input shows the default list.
                        </p>
                    )}

                    <div className="w-full max-w-full overflow-x-auto rounded-lg border border-border">
                        <table className="w-max min-w-full table-auto divide-y divide-border text-sm">
                            <thead className="bg-muted/40 text-left text-muted-foreground">
                                <tr>
                                    {columns.map((column) => (
                                        <th key={column.header} className={cn('px-4 py-3 font-medium whitespace-nowrap', column.className)}>
                                            {column.header}
                                        </th>
                                    ))}
                                    <th className="w-56 min-w-56 px-4 py-3 font-medium whitespace-nowrap lg:sticky lg:right-0 lg:z-20 lg:border-l lg:border-border lg:bg-muted">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {listQuery.isLoading ? (
                                    <tr>
                                        <td colSpan={columns.length + 1} className="px-4 py-6 text-center text-muted-foreground">
                                            Loading...
                                        </td>
                                    </tr>
                                ) : items.length === 0 ? (
                                    <tr>
                                        <td colSpan={columns.length + 1} className="px-4 py-6 text-center text-muted-foreground">
                                            No {entityLabel.toLowerCase()} records found.
                                        </td>
                                    </tr>
                                ) : (
                                    items.map((item) => (
                                        <tr key={getItemId(item)} className="bg-surface">
                                            {columns.map((column) => (
                                                <td key={column.header} className={cn('px-4 py-3 align-top', column.className)}>
                                                    <div
                                                        className={cn(
                                                            'block',
                                                            column.truncate && 'max-w-0 overflow-hidden text-ellipsis whitespace-nowrap',
                                                        )}
                                                        title={column.title?.(item)}
                                                    >
                                                        {column.render(item)}
                                                    </div>
                                                </td>
                                            ))}
                                            <td className="w-56 min-w-56 px-4 py-3 align-top whitespace-nowrap lg:sticky lg:right-0 lg:z-10 lg:border-l lg:border-border lg:bg-muted/50">
                                                <div className="relative z-10 flex flex-nowrap gap-2">
                                                    {getViewPath && (
                                                        <Button
                                                            size="sm"
                                                            variant="secondary"
                                                            className="shrink-0"
                                                            onClick={() => navigate({ to: getViewPath(item) as never })}
                                                        >
                                                            View
                                                        </Button>
                                                    )}
                                                    <Button size="sm" variant="outline" className="shrink-0" onClick={() => openEdit(item)}>
                                                        Edit
                                                    </Button>
                                                    <Button size="sm" variant="destructive" className="shrink-0" onClick={() => handleDelete(item)}>
                                                        Delete
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
