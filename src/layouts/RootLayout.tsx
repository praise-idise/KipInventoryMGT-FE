import { lazy, Suspense } from 'react'
import { Outlet } from '@tanstack/react-router'

// Lazy-load devtools so they are tree-shaken from production builds.
function DevtoolsNoop() {
    return null
}

const RouterDevtools = import.meta.env.DEV
    ? lazy(() =>
        import('@tanstack/react-router-devtools').then((mod) => ({
            default: mod.TanStackRouterDevtools,
        })),
    )
    : DevtoolsNoop

export function RootLayout() {
    return (
        <>
            <div className="min-h-screen bg-background text-foreground antialiased">
                <Outlet />
            </div>
            <Suspense fallback={null}>
                <RouterDevtools />
            </Suspense>
        </>
    )
}
