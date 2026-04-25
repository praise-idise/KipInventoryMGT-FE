import { cn } from '@/lib/cn'

type SpinnerSize = 'sm' | 'md' | 'lg'

interface SpinnerProps {
    className?: string
    size?: SpinnerSize
}

const sizeClasses: Record<SpinnerSize, string> = {
    sm: 'size-4 border-2',
    md: 'size-6 border-2',
    lg: 'size-8 border-[3px]',
}

export function Spinner({ className, size = 'md' }: SpinnerProps) {
    return (
        <span
            role="status"
            aria-label="Loading"
            className={cn(
                'inline-block animate-spin rounded-full border-current border-t-transparent',
                sizeClasses[size],
                className,
            )}
        />
    )
}
