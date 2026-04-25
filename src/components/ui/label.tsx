import { forwardRef } from 'react'
import { cn } from '@/lib/cn'

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
    required?: boolean
}

export const Label = forwardRef<HTMLLabelElement, LabelProps>(
    ({ className, children, required, ...props }, ref) => (
        <label
            ref={ref}
            className={cn(
                'text-sm font-medium text-foreground leading-none',
                'peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
                className,
            )}
            {...props}
        >
            {children}
            {required && <span className="ml-1 text-destructive" aria-hidden>*</span>}
        </label>
    ),
)
Label.displayName = 'Label'
