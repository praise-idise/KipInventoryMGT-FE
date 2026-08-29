import type { ComponentType } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import {
    ClipboardCheck,
    Monitor,
    Moon,
    Scale,
    Sun,
} from 'lucide-react'
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui'
import { Logo } from '@/components/Logo'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/cn'
import { Theme, useTheme } from '@/hooks/use-theme'

const themeOptions: { label: string; value: Theme; icon: ComponentType<{ className?: string }> }[] = [
    { label: 'Light', value: 'light', icon: Sun },
    { label: 'Dark', value: 'dark', icon: Moon },
    { label: 'System', value: 'system', icon: Monitor },
]

const featureRows = [
    {
        title: 'Warehouses and product catalog',
        description:
            'Set up your branches, add products with SKU and supplier links, and see stock levels per location.',
        image: '/landing/feature-aisle.jpg',
        alt: 'Warehouse aisle with boxed inventory on shelves',
    },
    {
        title: 'Purchase orders and receiving',
        description:
            'Raise purchase orders, send them for approval, and receive goods against the order so quantities stay accurate.',
        image: '/landing/feature-receiving.jpg',
        alt: 'Delivery boxes being checked in at a loading bay',
        reverse: true,
    },
    {
        title: 'Transfers between locations',
        description:
            'Move stock from one warehouse to another with a clear request and confirmation trail.',
        image: '/landing/feature-transfer.jpg',
        alt: 'Packed cartons on a trolley ready for transfer',
    },
]

const moreFeatures = [
    {
        title: 'Stock adjustments and issues',
        description: 'Record corrections, write-offs, and stock issues when counts do not match what is on the shelf.',
        icon: Scale,
    },
    {
        title: 'Approvals and user roles',
        description: 'Control who can buy, move, or adjust stock. Approvers sign off before changes go through.',
        icon: ClipboardCheck,
    },
]

const steps = [
    {
        title: 'Set up your catalog and warehouses',
        description: 'Add products, suppliers, and the locations where you keep stock.',
    },
    {
        title: 'Buy and receive',
        description: 'Create purchase orders, get them approved, and receive goods into the right warehouse.',
    },
    {
        title: 'Move and adjust with a trail',
        description: 'Transfer between branches, adjust counts, and keep a record of who approved each change.',
    },
]

const audiences = [
    {
        title: 'Multi-branch retail',
        description: 'Shops with more than one store that need to know what is in each location.',
    },
    {
        title: 'Distributors',
        description: 'Businesses with a main store and outlets that regularly move stock between sites.',
    },
    {
        title: 'Teams with purchase controls',
        description: 'Operations where buying and stock changes need a manager to approve first.',
    },
]

const plans = [
    {
        name: 'Growth',
        price: '₦8,000',
        warehouses: 'Up to 3 warehouses',
        users: 'Up to 5 users',
    },
    {
        name: 'Business',
        price: '₦13,000',
        warehouses: 'Up to 10 warehouses',
        users: 'Up to 30 users',
        highlighted: true,
    },
    {
        name: 'Enterprise',
        price: '₦18,000',
        warehouses: 'Unlimited warehouses',
        users: 'Unlimited users',
    },
]

const planIncludes = [
    'Product and warehouse management',
    'Purchase orders and receiving',
    'Transfers, adjustments, and stock issues',
    'Approval workflows and user roles',
]

function scrollTo(sectionId: string) {
    const section = document.getElementById(sectionId)
    if (!section) return

    const header = document.getElementById('landing-header')
    const headerHeight = header?.offsetHeight ?? 0
    const top = section.getBoundingClientRect().top + window.scrollY - headerHeight - 24

    window.scrollTo({ top, behavior: 'smooth' })
}

export function LandingPage() {
    const { theme, setTheme } = useTheme()
    const { isAuthenticated } = useAuth()
    const navigate = useNavigate()
    const year = new Date().getFullYear()

    const primaryCta = isAuthenticated
        ? { label: 'Open app', to: '/app/dashboard' as const }
        : { label: 'Start free trial', to: '/auth/signup' as const }

    return (
        <main className="min-h-screen bg-background text-foreground">
            <div id="landing-header" className="fixed inset-x-0 top-0 z-50 border-b border-border bg-surface/90 backdrop-blur">
                <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
                    <div className="flex min-w-0 items-center gap-3">
                        <Logo />
                        <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">KIP Inventory</p>
                            <p className="hidden text-xs text-muted-foreground sm:block">Multi-warehouse stock control</p>
                        </div>
                    </div>

                    <nav className="hidden items-center gap-6 text-sm md:flex">
                        <button
                            type="button"
                            onClick={() => scrollTo('features')}
                            className="text-muted-foreground transition-colors hover:text-foreground"
                        >
                            Features
                        </button>
                        <button
                            type="button"
                            onClick={() => scrollTo('pricing')}
                            className="text-muted-foreground transition-colors hover:text-foreground"
                        >
                            Pricing
                        </button>
                    </nav>

                    <div className="flex shrink-0 items-center gap-2">
                        <div className="hidden items-center gap-0.5 rounded-md border border-border bg-muted p-0.5 sm:inline-flex">
                            {themeOptions.map((option) => {
                                const Icon = option.icon
                                const active = theme === option.value

                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        aria-label={option.label}
                                        onClick={() => setTheme(option.value)}
                                        className={cn(
                                            'inline-flex items-center justify-center rounded-md p-1.5 transition-colors',
                                            active
                                                ? 'bg-surface text-foreground'
                                                : 'text-muted-foreground hover:text-foreground',
                                        )}
                                    >
                                        <Icon className="size-3.5" />
                                    </button>
                                )
                            })}
                        </div>

                        {!isAuthenticated && (
                            <Link
                                to="/auth/login"
                                className="hidden h-8 items-center rounded-md px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted sm:inline-flex"
                            >
                                Sign in
                            </Link>
                        )}

                        <Button size="sm" onClick={() => navigate({ to: primaryCta.to })}>
                            {primaryCta.label}
                        </Button>
                    </div>
                </header>
            </div>

            <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
                {/* Hero */}
                <section className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
                    <div>
                        <Badge variant="outline" className="mb-4 border-primary/30 bg-primary/10 text-primary">
                            Inventory management
                        </Badge>

                        <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
                            Know what you have, in every warehouse.
                        </h1>

                        <p className="mt-5 max-w-lg text-base text-muted-foreground sm:text-lg">
                            Track stock, raise purchase orders, move goods between branches, and keep a record of who
                            approved what.
                        </p>

                        <div className="mt-7 flex flex-wrap gap-3">
                            <Button size="lg" onClick={() => navigate({ to: primaryCta.to })}>
                                {primaryCta.label}
                            </Button>
                            {!isAuthenticated && (
                                <Link
                                    to="/auth/login"
                                    className="inline-flex h-11 items-center justify-center rounded-md border border-border bg-transparent px-6 text-base font-medium text-foreground transition-colors hover:bg-muted"
                                >
                                    Sign in
                                </Link>
                            )}
                        </div>

                        <p className="mt-4 text-sm text-muted-foreground">
                            15-day free trial. No credit card required to start.
                        </p>
                    </div>

                    <div className="overflow-hidden rounded-xl border border-border">
                        <img
                            src="/landing/hero-warehouse-desk.jpg"
                            alt="Stockroom with shelves and a laptop on a desk"
                            className="aspect-video w-full object-cover"
                        />
                    </div>
                </section>

                {/* Feature rows with photos */}
                <section id="features" className="mt-24 scroll-mt-24">
                    <div className="max-w-2xl">
                        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">What you can do today</h2>
                        <p className="mt-3 text-muted-foreground">
                            KIP Inventory covers the day-to-day work of running stock across one or more locations.
                        </p>
                    </div>

                    <div className="mt-12 space-y-16">
                        {featureRows.map((feature) => (
                            <div
                                key={feature.title}
                                className={cn(
                                    'grid items-center gap-8 lg:grid-cols-2 lg:gap-12',
                                    feature.reverse && 'lg:[&>div:first-child]:order-2',
                                )}
                            >
                                <div>
                                    <h3 className="text-xl font-semibold">{feature.title}</h3>
                                    <p className="mt-3 text-muted-foreground">{feature.description}</p>
                                </div>
                                <div className="overflow-hidden rounded-xl border border-border">
                                    <img
                                        src={feature.image}
                                        alt={feature.alt}
                                        className="aspect-4/3 w-full object-cover"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-16 grid gap-4 sm:grid-cols-2">
                        {moreFeatures.map((feature) => {
                            const Icon = feature.icon
                            return (
                                <Card key={feature.title}>
                                    <CardHeader>
                                        <span className="inline-flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                                            <Icon className="size-5" />
                                        </span>
                                        <CardTitle className="mt-3 text-base">{feature.title}</CardTitle>
                                        <CardDescription>{feature.description}</CardDescription>
                                    </CardHeader>
                                </Card>
                            )
                        })}
                    </div>
                </section>

                {/* How it works */}
                <section id="how-it-works" className="mt-24 scroll-mt-24">
                    <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">How it works</h2>
                    <p className="mt-3 max-w-2xl text-muted-foreground">
                        Three steps from setup to day-to-day operations.
                    </p>

                    <ol className="mt-10 grid gap-6 md:grid-cols-3">
                        {steps.map((step, index) => (
                            <li key={step.title} className="relative rounded-xl border border-border bg-surface p-5">
                                <span className="inline-flex size-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                                    {index + 1}
                                </span>
                                <h3 className="mt-4 font-semibold">{step.title}</h3>
                                <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
                            </li>
                        ))}
                    </ol>
                </section>

                {/* Who it's for */}
                <section className="mt-24">
                    <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Who it is for</h2>
                    <div className="mt-10 grid gap-4 md:grid-cols-3">
                        {audiences.map((item) => (
                            <div key={item.title} className="rounded-xl border border-border bg-surface p-5">
                                <h3 className="font-semibold">{item.title}</h3>
                                <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Pricing */}
                <section id="pricing" className="mt-24 scroll-mt-24">
                    <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Pricing</h2>
                    <p className="mt-3 max-w-2xl text-muted-foreground">
                        Start with a 15-day trial, then pick a plan that fits your team size. Billed monthly via
                        Paystack.
                    </p>

                    <div className="mt-10 grid gap-4 lg:grid-cols-3">
                        {plans.map((plan) => (
                            <Card
                                key={plan.name}
                                className={cn(plan.highlighted && 'border-primary/40 ring-1 ring-primary/20')}
                            >
                                <CardHeader>
                                    {plan.highlighted && (
                                        <Badge variant="outline" className="mb-2 w-fit border-primary/30 bg-primary/10 text-primary">
                                            Popular
                                        </Badge>
                                    )}
                                    <CardTitle>{plan.name}</CardTitle>
                                    <CardDescription>
                                        <span className="text-2xl font-semibold text-foreground">{plan.price}</span>
                                        <span className="text-muted-foreground"> / month</span>
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-2 text-sm text-muted-foreground">
                                    <p>{plan.warehouses}</p>
                                    <p>{plan.users}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    <div className="mt-8 rounded-xl border border-border bg-muted/40 p-5">
                        <p className="text-sm font-medium text-foreground">All plans include</p>
                        <ul className="mt-3 grid list-disc gap-2 pl-5 text-sm text-muted-foreground sm:grid-cols-2">
                            {planIncludes.map((item) => (
                                <li key={item}>{item}</li>
                            ))}
                        </ul>
                    </div>
                </section>

                {/* Bottom CTA */}
                <section className="mt-24 rounded-xl border border-border bg-surface px-6 py-10 text-center sm:px-10">
                    <h2 className="text-2xl font-semibold tracking-tight">Ready to get started?</h2>
                    <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
                        Set up your organization, add your first warehouse, and start tracking stock in minutes.
                    </p>
                    <div className="mt-6 flex flex-wrap justify-center gap-3">
                        <Button size="lg" onClick={() => navigate({ to: primaryCta.to })}>
                            {primaryCta.label}
                        </Button>
                        {!isAuthenticated && (
                            <Link
                                to="/auth/login"
                                className="inline-flex h-11 items-center justify-center rounded-md border border-border bg-transparent px-6 text-base font-medium text-foreground transition-colors hover:bg-muted"
                            >
                                Sign in
                            </Link>
                        )}
                    </div>
                </section>

                <footer className="mt-16 border-t border-border pt-8">
                    <div className="flex flex-col items-center justify-between gap-4 text-sm text-muted-foreground sm:flex-row">
                        <p>
                            © {year} Built by{' '}
                            <a
                                href="https://praiseidise.netlify.app/"
                                target="_blank"
                                rel="noreferrer"
                                className="font-medium text-primary underline-offset-4 hover:underline"
                            >
                                Progomid Solutions
                            </a>
                        </p>
                        {!isAuthenticated && (
                            <div className="flex gap-4">
                                <Link to="/auth/login" className="hover:text-foreground">
                                    Sign in
                                </Link>
                                <Link to="/auth/signup" className="hover:text-foreground">
                                    Start free trial
                                </Link>
                            </div>
                        )}
                    </div>
                </footer>
            </div>
        </main>
    )
}
