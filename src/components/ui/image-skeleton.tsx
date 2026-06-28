import { cn } from '@/lib/cn'

interface ImageSkeletonProps {
    className?: string
}

export function ImageSkeleton({ className }: ImageSkeletonProps) {
    return (
        <div
            className={cn(
                'relative overflow-hidden rounded-lg border border-border bg-muted/40',
                className,
            )}
        >
            {/* Glass overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5" />
            {/* Shimmer */}
            <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>
    )
}
