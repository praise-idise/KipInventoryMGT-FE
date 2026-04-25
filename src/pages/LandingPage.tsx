import type { ComponentType } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Boxes, ChartNoAxesColumn, Monitor, Moon, ShieldCheck, Sun } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui'
import { cn } from '@/lib/cn'
import { Theme, useTheme } from '@/hooks/use-theme'

const themeOptions: { label: string; value: Theme; icon: ComponentType<{ className?: string }> }[] = [
    { label: 'Light', value: 'light', icon: Sun },
    { label: 'Dark', value: 'dark', icon: Moon },
    { label: 'System', value: 'system', icon: Monitor },
]

const steps = [
    'Set up your warehouses and product catalog once',
    'Run procurement with controlled approvals',
    'Track stock movement with clear audit trails',
    'Act on low-stock alerts before operations break',
]

const highlights = [
    {
        title: 'Operational Clarity',
        description: 'See available, reserved, and moving stock in one coherent workflow.',
        icon: ChartNoAxesColumn,
    },
    {
        title: 'Controlled Decisions',
        description: 'Approval-ready processes for purchases, transfers, and stock adjustments.',
        icon: ShieldCheck,
    },
    {
        title: 'Built For Scale',
        description: 'Layered architecture with reliable API patterns and predictable UX.',
        icon: Boxes,
    },
]

const warehouseTypes = [
    'Retail distribution centers handling high-volume SKU turnover',
    'Manufacturing raw-material and finished-goods warehouses',
    'Pharmaceutical and health-product stores with strict traceability',
    'Food and beverage cold-chain or dry inventory locations',
    'E-commerce fulfillment hubs with reservation and pick-pack flows',
    'Multi-branch business stores that transfer stock between sites',
]

const trackableProducts = [
    'Packaged consumer goods and FMCG inventory',
    'Electronics, accessories, and serialized items',
    'Construction and industrial consumables',
    'Medical supplies and non-prescription pharmacy stock',
    'Automotive parts, lubricants, and tools',
    'Apparel variants by size, color, and packaging type',
]

export function LandingPage() {
    const { theme, setTheme } = useTheme()
    const navigate = useNavigate()
    const year = new Date().getFullYear()

    function scrollTo(sectionId: string) {
        const section = document.getElementById(sectionId)
        if (!section) return

        const header = document.getElementById('landing-header')
        const headerHeight = header?.offsetHeight ?? 0
        const top = section.getBoundingClientRect().top + window.scrollY - headerHeight - 24

        window.scrollTo({ top, behavior: 'smooth' })
    }

    return (
        <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
            <div className="pointer-events-none absolute inset-0 -z-10">
                <div className="absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
                <div className="absolute -bottom-32 -left-16 h-64 w-64 rounded-full bg-success/10 blur-3xl" />
                <div className="absolute -right-16 top-24 h-72 w-72 rounded-full bg-warning/10 blur-3xl" />
            </div>

            <div id="landing-header" className="fixed inset-x-0 top-3 z-50 px-4 sm:px-6 lg:px-8">
                <header className="mx-auto flex w-full max-w-6xl items-center justify-between rounded-xl border border-border bg-surface/80 px-4 py-3 backdrop-blur sm:px-5">
                    <div className="flex items-center gap-3">
                        <span className="inline-flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
                            <Boxes className="size-5" />
                        </span>
                        <div>
                            <p className="text-sm font-semibold">KIP Inventory</p>
                            <p className="text-xs text-muted-foreground">Inventory operations with control</p>
                        </div>
                    </div>

                    <div className="inline-flex items-center gap-1 rounded-md border border-border bg-muted p-1">
                        {themeOptions.map((option) => {
                            const Icon = option.icon
                            const active = theme === option.value

                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => setTheme(option.value)}
                                    className={cn(
                                        'inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                                        active
                                            ? 'bg-surface text-foreground shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground',
                                    )}
                                >
                                    <Icon className="size-3.5" />
                                    <span className="hidden sm:inline">{option.label}</span>
                                </button>
                            )
                        })}
                    </div>
                </header>
            </div>

            <div className="mx-auto flex w-full max-w-6xl flex-col px-4 pb-12 pt-32 sm:px-6 lg:px-8">

                <section className="grid items-start gap-8 lg:grid-cols-[1.2fr_1fr] lg:gap-10">
                    <div>
                        <Badge variant="outline" className="mb-5 border-primary/30 bg-primary/10 text-primary">
                            Inventory Management Platform
                        </Badge>

                        <h1 className="max-w-xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
                            Clean inventory flow from procurement to fulfillment.
                        </h1>

                        <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
                            Keep product, warehouse, approvals, and stock movement in one disciplined system without
                            losing speed.
                        </p>

                        <div className="mt-7 flex flex-wrap gap-3">
                            <Button size="lg" onClick={() => scrollTo('use-cases')}>
                                Explore Use Cases
                            </Button>
                            <Button variant="outline" size="lg" onClick={() => navigate({ to: '/app/dashboard' })}>
                                Open Inventory App
                            </Button>
                        </div>
                    </div>

                    <Card id="workflow" className="border-primary/20 bg-surface/95 scroll-mt-32">
                        <CardHeader>
                            <CardTitle>How Teams Use KIP Inventory</CardTitle>
                            <CardDescription>Simple staged flow aligned with real operations.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {steps.map((step, index) => (
                                <div
                                    key={step}
                                    className="flex items-start gap-3 rounded-lg border border-border bg-background/60 px-3 py-3"
                                >
                                    <span className="mt-0.5 inline-flex size-6 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                                        {index + 1}
                                    </span>
                                    <p className="text-sm text-foreground/90">{step}</p>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </section>

                <section className="mt-12 grid gap-4 md:grid-cols-3">
                    {highlights.map((item) => {
                        const Icon = item.icon

                        return (
                            <Card key={item.title} className="bg-surface/90">
                                <CardHeader>
                                    <span className="inline-flex size-10 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                                        <Icon className="size-5" />
                                    </span>
                                    <CardTitle className="mt-3 text-base">{item.title}</CardTitle>
                                    <CardDescription>{item.description}</CardDescription>
                                </CardHeader>
                            </Card>
                        )
                    })}
                </section>

                <section id="use-cases" className="mt-12 grid gap-4 scroll-mt-40 lg:grid-cols-2">
                    <Card className="bg-surface/90">
                        <CardHeader>
                            <CardTitle>Warehouse Types This Fits</CardTitle>
                            <CardDescription>
                                Built for teams that need stock accuracy, approval discipline, and movement visibility.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {warehouseTypes.map((item) => (
                                <div key={item} className="rounded-md border border-border bg-background/60 px-3 py-2">
                                    <p className="text-sm text-foreground/90">{item}</p>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card className="bg-surface/90">
                        <CardHeader>
                            <CardTitle>Products You Can Track</CardTitle>
                            <CardDescription>
                                Product-level tracking supports variants, warehouse balances, and procurement workflows.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {trackableProducts.map((item) => (
                                <div key={item} className="rounded-md border border-border bg-background/60 px-3 py-2">
                                    <p className="text-sm text-foreground/90">{item}</p>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </section>

                <footer className="mt-12 border-t border-border pt-6 text-center text-sm text-muted-foreground">
                    © {year} Built by {' '}
                    <a
                        href="https://praiseidise.netlify.app/"
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-primary underline-offset-4 hover:underline"
                    >
                        Progomid Solutions
                    </a>
                </footer>
            </div>
        </main>
    )
}
