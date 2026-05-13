import { useEffect, useSyncExternalStore } from 'react'
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from 'lucide-react'
import { cn } from '@/lib/cn'

export type ToastTone = 'success' | 'error' | 'info' | 'warning'

type ToastItem = {
    id: string
    tone: ToastTone
    title?: string
    description: string
    duration: number
}

type ToastInput = {
    title?: string
    description: string
    duration?: number
}

const DEFAULT_DURATION = 3600

let items: ToastItem[] = []
const listeners = new Set<() => void>()

function emitChange() {
    listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
}

function getSnapshot() {
    return items
}

function createToast(tone: ToastTone, input: ToastInput) {
    const id = crypto.randomUUID()
    items = [
        ...items,
        {
            id,
            tone,
            title: input.title,
            description: input.description,
            duration: input.duration ?? DEFAULT_DURATION,
        },
    ]
    emitChange()
    return id
}

function dismissToast(id: string) {
    items = items.filter((item) => item.id !== id)
    emitChange()
}

const iconByTone = {
    success: CheckCircle2,
    error: AlertCircle,
    info: Info,
    warning: TriangleAlert,
} satisfies Record<ToastTone, typeof CheckCircle2>

const iconClassByTone: Record<ToastTone, string> = {
    success: 'text-success',
    error: 'text-destructive',
    info: 'text-primary',
    warning: 'text-warning',
}

const descriptionClassByTone: Record<ToastTone, string> = {
    success: 'text-muted-foreground',
    error: 'text-muted-foreground',
    info: 'text-muted-foreground',
    warning: 'text-warning',
}

const accentClassByTone: Record<ToastTone, string> = {
    success: 'bg-success',
    error: 'bg-destructive',
    info: 'bg-primary',
    warning: 'bg-warning',
}

function ToastEntry({ item }: { item: ToastItem }) {
    const Icon = iconByTone[item.tone]

    useEffect(() => {
        const timeoutId = window.setTimeout(() => dismissToast(item.id), item.duration)
        return () => window.clearTimeout(timeoutId)
    }, [item.duration, item.id])

    return (
        <div
            className="pointer-events-auto relative overflow-hidden rounded-2xl border border-border bg-surface text-surface-foreground shadow-xl shadow-black/10"
            role="status"
            aria-live="polite"
        >
            <div className={cn('absolute inset-y-0 left-0 w-1.5', accentClassByTone[item.tone])} />
            <div className="flex gap-3 px-4 py-3 pl-5">
                <div className="pt-0.5">
                    <Icon className={cn('size-5', iconClassByTone[item.tone])} />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                    {item.title && <p className="text-sm font-semibold text-foreground">{item.title}</p>}
                    <p className={cn('text-sm', descriptionClassByTone[item.tone])}>{item.description}</p>
                </div>
                <button
                    type="button"
                    onClick={() => dismissToast(item.id)}
                    className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label="Dismiss notification"
                >
                    <X className="size-4" />
                </button>
            </div>
        </div>
    )
}

export function Toaster() {
    const toasts = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

    if (toasts.length === 0) {
        return null
    }

    return (
        <div className="pointer-events-none fixed right-0 top-0 z-120 flex w-full max-w-md flex-col gap-3 p-4 sm:right-4 sm:top-4 sm:p-0">
            {toasts.map((item) => (
                <ToastEntry key={item.id} item={item} />
            ))}
        </div>
    )
}

export const toast = {
    success(input: ToastInput | string) {
        return createToast('success', typeof input === 'string' ? { description: input } : input)
    },
    error(input: ToastInput | string) {
        return createToast('error', typeof input === 'string' ? { description: input } : input)
    },
    info(input: ToastInput | string) {
        return createToast('info', typeof input === 'string' ? { description: input } : input)
    },
    warning(input: ToastInput | string) {
        return createToast('warning', typeof input === 'string' ? { description: input } : input)
    },
    dismiss(id: string) {
        dismissToast(id)
    },
} as const
