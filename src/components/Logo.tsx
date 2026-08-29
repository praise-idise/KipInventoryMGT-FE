import { Boxes } from 'lucide-react'
import { cn } from '@/lib/cn'

interface LogoProps {
    className?: string
    showName?: boolean
}

/**
 * The single brand mark used everywhere: a rounded primary box with a white
 * boxes glyph. The white icon is fixed and does not follow the theme.
 */
export function Logo({ className, showName = false }: LogoProps) {
    return (
        <span className={cn('inline-flex items-center gap-2', className)}>
            <span className="inline-flex size-9 items-center justify-center rounded-md bg-primary text-white">
                <Boxes className="size-5" />
            </span>
            {showName && <span className="text-xl font-bold tracking-tight">Kip Inventory</span>}
        </span>
    )
}
