import { forwardRef } from 'react'
import { cn } from '@/lib/cn'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    error?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className, error, ...props }, ref) => (
        <input
            ref={ref}
            className={cn(
                'flex h-10 w-full rounded-md border border-input bg-surface px-3 py-2',
                'text-sm text-foreground placeholder:text-muted-foreground',
                'transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
                'disabled:cursor-not-allowed disabled:opacity-50',
                error && 'border-destructive focus:ring-destructive',
                className,
            )}
            {...props}
        />
    ),
)
Input.displayName = 'Input'
