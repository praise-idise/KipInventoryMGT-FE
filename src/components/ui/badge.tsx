import { cn } from '@/lib/cn'

type BadgeVariant = 'default' | 'success' | 'warning' | 'destructive' | 'outline' | 'muted'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    variant?: BadgeVariant
}

const variantClasses: Record<BadgeVariant, string> = {
    default: 'bg-primary/10 text-primary border-primary/20',
    success: 'bg-success/10 text-success border-success/20',
    warning: 'bg-warning/10 text-warning-foreground border-warning/20',
    destructive: 'bg-destructive/10 text-destructive border-destructive/20',
    outline: 'bg-transparent text-foreground border-border',
    muted: 'bg-muted text-muted-foreground border-transparent',
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
    return (
        <span
            className={cn(
                'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
                variantClasses[variant],
                className,
            )}
            {...props}
        />
    )
}
