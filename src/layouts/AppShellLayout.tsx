import { useEffect, useState } from 'react'
import { Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router'
import { ChevronDown, LogOut, Menu, Monitor, Moon, Sun, X } from 'lucide-react'
import { Button } from '@/components/ui'
import { Logo } from '@/components/Logo'
import { useAuth } from '@/hooks/use-auth'
import { Theme, useTheme } from '@/hooks/use-theme'
import { cn } from '@/lib/cn'
import { navGroups, type NavGroup } from '@/lib/nav-groups'
import { BillingAccessProvider, useBillingAccess } from '@/hooks/use-billing-access'
import { BILLING_ACCESS_STATE } from '@/lib/domain-values'

function formatDate(value?: string | null) {
    if (!value) return 'soon'
    return new Date(value).toLocaleDateString()
}

const themeOptions: { label: string; value: Theme; icon: React.ComponentType<{ className?: string }> }[] = [
    { label: 'Light', value: 'light', icon: Sun },
    { label: 'Dark', value: 'dark', icon: Moon },
    { label: 'System', value: 'system', icon: Monitor },
]

function AppShellContent() {
    const navigate = useNavigate()
    const { user, logout } = useAuth()
    const { theme, setTheme } = useTheme()
    const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)
    const pathname = useRouterState({
        select: (state) => state.location.pathname,
    })

    const { current, isLocked } = useBillingAccess()
    const billingState = current?.state

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

    function NavGroupSection({
        group,
        onItemClick,
    }: {
        group: NavGroup
        onItemClick?: () => void
    }) {
        const userRoles = user?.roles ?? []
        const visibleItems = group.items.filter(
            (item) => !item.roles?.length || item.roles.some((role) => userRoles.includes(role)),
        )

        if (visibleItems.length === 0) return null

        const hasActiveChild = visibleItems.some((item) => isActive(item.to))
        const [isOpen, setIsOpen] = useState(hasActiveChild)

        useEffect(() => {
            if (hasActiveChild) setIsOpen(true)
        }, [hasActiveChild])

        const GroupIcon = group.icon

        return (
            <div>
                <button
                    type="button"
                    onClick={() => setIsOpen((prev) => !prev)}
                    className="inline-flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                    <GroupIcon className="size-4" />
                    <span className="flex-1 text-left">{group.label}</span>
                    <ChevronDown
                        className={cn(
                            'size-4 transition-transform duration-200',
                            isOpen && 'rotate-180',
                        )}
                    />
                </button>
                <div
                    className={cn(
                        'grid transition-all duration-200',
                        isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
                    )}
                >
                    <div className="overflow-hidden">
                        <div className="grid gap-1 py-1 pl-6">
                            {visibleItems.map((item) => {
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
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    function AppNavigation({ onItemClick }: { onItemClick?: () => void }) {
        const userRoles = user?.roles ?? []

        return (
            <nav className="grid gap-1">
                {navGroups.map((entry) => {
                    // Standalone nav item (Dashboard)
                    if (!('items' in entry)) {
                        const item = entry
                        if (!item.roles?.length || item.roles.some((role) => userRoles.includes(role))) {
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
                        }
                        return null
                    }

                    // Collapsible group
                    return (
                        <NavGroupSection
                            key={entry.label}
                            group={entry}
                            onItemClick={onItemClick}
                        />
                    )
                })}
            </nav>
        )
    }

    return (
        <div className="min-h-screen bg-background bg-linear-to-b from-transparent via-transparent to-primary/5 text-foreground">
            <div className="grid min-h-screen lg:grid-cols-[260px_1fr]">
                <aside className="hidden border-b border-border bg-surface bg-linear-to-b from-transparent to-primary/5 px-4 py-4 lg:block lg:border-b-0 lg:border-r lg:px-5 lg:py-6">
                    <div className="mb-5 flex items-center gap-3">
                        <Logo />
                        <div>
                            <p className="text-sm font-semibold">Kip Inventory</p>
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

                    {billingState === BILLING_ACCESS_STATE.READ_ONLY && (
                        <div className="border-b border-amber-600/20 bg-amber-500/10 px-4 py-2.5 text-center text-sm text-amber-700 dark:text-amber-300">
                            Your trial has ended — you're in view-only mode until {formatDate(current?.readOnlyUntil)}.{' '}
                            <Link to="/app/billing" className="font-medium underline">
                                Subscribe to keep working
                            </Link>
                        </div>
                    )}

                    {billingState === BILLING_ACCESS_STATE.LOCKED && (
                        <div className="border-b border-destructive/20 bg-destructive/10 px-4 py-2.5 text-center text-sm text-destructive">
                            Your workspace is locked.{' '}
                            <Link to="/app/billing" className="font-medium underline">
                                Subscribe to regain access
                            </Link>
                        </div>
                    )}

                    <div className="min-w-0 flex-1 px-4 py-6 md:p-14 lg:p-16">
                        {isLocked && pathname !== '/app/billing' ? (
                            <main className="mx-auto flex min-h-[50vh] max-w-xl items-center justify-center">
                                <section className="w-full rounded-xl border border-destructive/30 bg-surface/95 p-8 text-center shadow-sm">
                                    <h1 className="text-2xl font-semibold">Workspace locked</h1>
                                    <p className="mt-3 text-sm text-muted-foreground">
                                        Your workspace is locked until an administrator subscribes to a plan.
                                    </p>
                                    <Button className="mt-6" onClick={() => navigate({ to: '/app/billing' })}>
                                        Open Billing
                                    </Button>
                                </section>
                            </main>
                        ) : <Outlet />}
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

                    <aside className="relative z-10 h-full w-72 max-w-[85vw] border-r border-border bg-surface bg-linear-to-b from-transparent to-primary/5 px-4 py-4">
                        <div className="mb-5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Logo />
                                <div>
                                    <p className="text-sm font-semibold">Kip Inventory</p>
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

export function AppShellLayout() {
    return (
        <BillingAccessProvider>
            <AppShellContent />
        </BillingAccessProvider>
    )
}
