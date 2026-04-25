import { useState } from 'react'
import { Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router'
import { Boxes, LayoutDashboard, LogOut, Menu, Monitor, Moon, Package, Settings, ShoppingCart, Sun, Truck, Users, Warehouse, X } from 'lucide-react'
import { Button } from '@/components/ui'
import { useAuth } from '@/hooks/use-auth'
import { Theme, useTheme } from '@/hooks/use-theme'
import { cn } from '@/lib/cn'

type NavItem = {
    label: string
    icon: React.ComponentType<{ className?: string }>
    to?: string
    soon?: boolean
}

const navItems: NavItem[] = [
    { label: 'Dashboard', to: '/app/dashboard', icon: LayoutDashboard },
    { label: 'Warehouses', to: '/app/warehouses', icon: Warehouse },
    { label: 'Products', to: '/app/products', icon: Package },
    { label: 'Suppliers', to: '/app/suppliers', icon: Truck },
    { label: 'Customers', to: '/app/customers', icon: Users },
    { label: 'Procurement', to: '/app/procurement', icon: ShoppingCart },
    { label: 'Inventory Ops', to: '/app/inventory-ops', icon: Warehouse },
    { label: 'Transfers', icon: Truck, soon: true },
    { label: 'Settings', icon: Settings, soon: true },
]

const themeOptions: { label: string; value: Theme; icon: React.ComponentType<{ className?: string }> }[] = [
    { label: 'Light', value: 'light', icon: Sun },
    { label: 'Dark', value: 'dark', icon: Moon },
    { label: 'System', value: 'system', icon: Monitor },
]

export function AppShellLayout() {
    const navigate = useNavigate()
    const { user, logout } = useAuth()
    const { theme, setTheme } = useTheme()
    const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)
    const pathname = useRouterState({
        select: (state) => state.location.pathname,
    })

    function isActive(to?: string) {
        if (!to) return false
        return pathname === to || pathname.startsWith(`${to}/`)
    }

    async function handleLogout() {
        await logout()
        navigate({ to: '/auth/login' })
    }

    function closeMobileNav() {
        setIsMobileNavOpen(false)
    }

    function ThemeSelector() {
        return (
            <div className="mt-4 rounded-md border border-border bg-muted/40 p-2">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Theme</p>
                <div className="grid gap-1">
                    {themeOptions.map((option) => {
                        const Icon = option.icon
                        const active = theme === option.value

                        return (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => setTheme(option.value)}
                                className={cn(
                                    'inline-flex items-center gap-2 rounded-md px-2.5 py-2 text-xs font-medium transition-colors',
                                    active
                                        ? 'bg-surface text-foreground shadow-sm'
                                        : 'text-muted-foreground hover:bg-background hover:text-foreground',
                                )}
                            >
                                <Icon className="size-3.5" />
                                <span>{option.label}</span>
                            </button>
                        )
                    })}
                </div>
            </div>
        )
    }

    function AppNavigation({ onItemClick }: { onItemClick?: () => void }) {
        return (
            <nav className="grid gap-1">
                {navItems.map((item) => {
                    const Icon = item.icon
                    const active = isActive(item.to)

                    if (!item.to) {
                        return (
                            <div
                                key={item.label}
                                className="inline-flex cursor-not-allowed items-center justify-between rounded-md px-3 py-2 text-sm text-muted-foreground"
                            >
                                <span className="inline-flex items-center gap-2">
                                    <Icon className="size-4" />
                                    {item.label}
                                </span>
                                {item.soon && <span className="text-xs text-muted-foreground">Soon</span>}
                            </div>
                        )
                    }

                    return (
                        <Link
                            key={item.label}
                            to={item.to}
                            onClick={onItemClick}
                            className={cn(
                                'inline-flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors',
                                active
                                    ? 'bg-primary/10 text-primary'
                                    : 'text-foreground hover:bg-muted',
                            )}
                        >
                            <span className="inline-flex items-center gap-2">
                                <Icon className="size-4" />
                                {item.label}
                            </span>
                            {item.soon && <span className="text-xs text-muted-foreground">Soon</span>}
                        </Link>
                    )
                })}
            </nav>
        )
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            <div className="grid min-h-screen lg:grid-cols-[260px_1fr]">
                <aside className="hidden border-b border-border bg-surface px-4 py-4 lg:block lg:border-b-0 lg:border-r lg:px-5 lg:py-6">
                    <div className="mb-5 flex items-center gap-3">
                        <span className="inline-flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
                            <Boxes className="size-5" />
                        </span>
                        <div>
                            <p className="text-sm font-semibold">KIP Inventory</p>
                            <p className="text-xs text-muted-foreground">Operations Workspace</p>
                        </div>
                    </div>
                    <AppNavigation />
                    <ThemeSelector />
                </aside>

                <div className="flex min-h-screen min-w-0 flex-col">
                    <header className="flex items-center justify-between border-b border-border bg-surface/90 px-4 py-3 backdrop-blur sm:px-6">
                        <div className="inline-flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="icon"
                                className="lg:hidden"
                                onClick={() => setIsMobileNavOpen(true)}
                                aria-label="Open navigation menu"
                            >
                                <Menu className="size-4" />
                            </Button>
                            <div>
                                <p className="text-sm font-medium">Signed in as</p>
                                <p className="text-xs text-muted-foreground">{user?.email ?? 'Unknown user'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={handleLogout}>
                                <LogOut className="size-4" />
                                Logout
                            </Button>
                        </div>
                    </header>

                    <div className="min-w-0 flex-1 px-4 py-6 sm:px-6">
                        <Outlet />
                    </div>
                </div>
            </div>

            {isMobileNavOpen && (
                <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
                    <button
                        type="button"
                        className="absolute inset-0 bg-foreground/40"
                        aria-label="Close navigation menu"
                        onClick={closeMobileNav}
                    />

                    <aside className="relative z-10 h-full w-72 max-w-[85vw] border-r border-border bg-surface px-4 py-4">
                        <div className="mb-5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="inline-flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
                                    <Boxes className="size-5" />
                                </span>
                                <div>
                                    <p className="text-sm font-semibold">KIP Inventory</p>
                                    <p className="text-xs text-muted-foreground">Operations Workspace</p>
                                </div>
                            </div>

                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={closeMobileNav}
                                aria-label="Close navigation menu"
                            >
                                <X className="size-4" />
                            </Button>
                        </div>

                        <AppNavigation onItemClick={closeMobileNav} />
                        <ThemeSelector />
                    </aside>
                </div>
            )}
        </div>
    )
}
