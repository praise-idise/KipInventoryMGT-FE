import { Outlet } from '@tanstack/react-router'

export function AuthLayout() {
    return (
        <main className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-md">
                <Outlet />
            </div>
        </main>
    )
}
