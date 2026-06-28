import { type ReactNode, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/cn'

export type PopoverProps = {
    trigger: ReactNode
    children: ReactNode
    align?: 'start' | 'end'
    side?: 'bottom' | 'top'
    className?: string
    open?: boolean
    onOpenChange?: (open: boolean) => void
}

export function Popover({ trigger, children, align = 'start', side = 'bottom', className, open: controlledOpen, onOpenChange }: PopoverProps) {
    const [internalOpen, setInternalOpen] = useState(false)
    const isOpen = controlledOpen ?? internalOpen
    const setIsOpen = onOpenChange ?? setInternalOpen
    const triggerRef = useRef<HTMLButtonElement>(null)
    const contentRef = useRef<HTMLDivElement>(null)
    const [position, setPosition] = useState({ top: 0, left: 0 })

    useEffect(() => {
        if (!isOpen) return

        function updatePosition() {
            if (!triggerRef.current) return
            const rect = triggerRef.current.getBoundingClientRect()
            setPosition({
                top: side === 'top' ? rect.top - 4 : rect.bottom + 4,
                left: align === 'end' ? rect.right : rect.left,
            })
        }

        updatePosition()

        function handleClickOutside(e: MouseEvent) {
            const target = e.target as Node
            if (contentRef.current?.contains(target)) return
            if (triggerRef.current?.contains(target)) return
            setIsOpen(false)
        }

        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape') setIsOpen(false)
        }

        function handleScroll() {
            setIsOpen(false)
        }

        document.addEventListener('mousedown', handleClickOutside)
        document.addEventListener('keydown', handleKeyDown)
        window.addEventListener('scroll', handleScroll, true)
        window.addEventListener('resize', updatePosition)

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
            document.removeEventListener('keydown', handleKeyDown)
            window.removeEventListener('scroll', handleScroll, true)
            window.removeEventListener('resize', updatePosition)
        }
    }, [isOpen, setIsOpen, align, side])

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="inline-flex"
                aria-haspopup="true"
                aria-expanded={isOpen}
            >
                {trigger}
            </button>

            {isOpen && createPortal(
                <div
                    ref={contentRef}
                    style={{
                        position: 'fixed',
                        top: position.top,
                        left: position.left,
                    }}
                    className={cn(
                        'z-[100] min-w-[10rem] rounded-md border border-border bg-surface p-1 shadow-md',
                        align === 'end' && '-translate-x-[calc(100%-1.5rem)]',
                        className,
                    )}
                >
                    {children}
                </div>,
                document.body,
            )}
        </>
    )
}
