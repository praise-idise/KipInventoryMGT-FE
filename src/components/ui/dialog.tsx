import { type ReactNode, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'

export type DialogProps = {
    open: boolean
    onClose: () => void
    title: string
    description?: string
    children: ReactNode
    className?: string
}

export function Dialog({ open, onClose, title, description, children, className }: DialogProps) {
    const dialogRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!open) return

        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape') {
                onClose()
            }
        }

        document.addEventListener('keydown', handleKeyDown)
        document.body.style.overflow = 'hidden'

        return () => {
            document.removeEventListener('keydown', handleKeyDown)
            document.body.style.overflow = ''
        }
    }, [open, onClose])

    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true">
            {/* Backdrop */}
            <button
                type="button"
                className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
                aria-label="Close dialog"
                onClick={onClose}
            />

            {/* Panel */}
            <div
                ref={dialogRef}
                className={cn(
                    'relative z-10 w-full max-w-lg rounded-lg border border-border bg-surface p-6 shadow-xl sm:max-w-xl',
                    'max-h-[90vh] overflow-y-auto',
                    className,
                )}
            >
                <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-semibold">{title}</h2>
                        {description && (
                            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        aria-label="Close dialog"
                    >
                        <X className="size-4" />
                    </button>
                </div>
                {children}
            </div>
        </div>
    )
}
