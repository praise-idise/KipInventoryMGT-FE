import { useCallback, useState } from 'react'
import { Button } from './button'
import { cn } from '@/lib/cn'

type ConfirmVariant = 'danger' | 'default'

interface ConfirmOptions {
    title: string
    description: string
    confirmLabel?: string
    variant?: ConfirmVariant
}

interface PendingConfirm extends ConfirmOptions {
    resolve: (value: boolean) => void
}

export function useConfirm() {
    const [pending, setPending] = useState<PendingConfirm | null>(null)

    const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
        return new Promise<boolean>((resolve) => {
            // resolve is stored in pending above
            setPending({ ...options, resolve })
        })
    }, [])

    const handleConfirm = useCallback(() => {
        pending?.resolve(true)
        setPending(null)
    }, [pending])

    const handleCancel = useCallback(() => {
        pending?.resolve(false)
        setPending(null)
    }, [pending])

    const dialog = pending ? (
        <ConfirmDialog
            open={true}
            onOpenChange={(open) => {
                if (!open) handleCancel()
            }}
            title={pending.title}
            description={pending.description}
            confirmLabel={pending.confirmLabel ?? 'Confirm'}
            variant={pending.variant ?? 'default'}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
        />
    ) : null

    return { confirm, dialog }
}

interface ConfirmDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    title: string
    description: string
    confirmLabel?: string
    variant?: ConfirmVariant
    onConfirm: () => void
    onCancel?: () => void
}

function ConfirmDialog({
    open,
    title,
    description,
    confirmLabel = 'Confirm',
    variant = 'default',
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    if (!open) return null

    return (
        <div className="fixed inset-0 z-130 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onCancel}
                aria-hidden="true"
            />
            {/* Dialog */}
            <div
                className={cn(
                    'relative z-10 w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl',
                    'mx-4 animate-in fade-in zoom-in-95',
                )}
                role="dialog"
                aria-modal="true"
                aria-labelledby="confirm-title"
                aria-describedby="confirm-description"
            >
                <h2 id="confirm-title" className="text-lg font-semibold text-foreground">
                    {title}
                </h2>
                <p id="confirm-description" className="mt-2 text-sm text-muted-foreground">
                    {description}
                </p>
                <div className="mt-6 flex justify-end gap-3">
                    <Button variant="outline" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button
                        variant={variant === 'danger' ? 'destructive' : 'primary'}
                        onClick={onConfirm}
                    >
                        {confirmLabel}
                    </Button>
                </div>
            </div>
        </div>
    )
}

export { ConfirmDialog }
