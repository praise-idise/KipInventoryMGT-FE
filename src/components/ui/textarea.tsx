import { forwardRef } from 'react'
import { cn } from '@/lib/cn'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    error?: boolean
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className, error, ...props }, ref) => (
        <textarea
            ref={ref}
            className={cn(
                'flex min-h-20 w-full rounded-md border border-input bg-surface px-3 py-2',
                'text-sm text-foreground placeholder:text-muted-foreground',
                'resize-y transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
                'disabled:cursor-not-allowed disabled:opacity-50',
                error && 'border-destructive focus:ring-destructive',
                className,
            )}
            {...props}
        />
    ),
)
Textarea.displayName = 'Textarea'
