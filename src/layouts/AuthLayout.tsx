import { Outlet } from '@tanstack/react-router'
import { Logo } from '@/components/Logo'

export function AuthLayout() {
    return (
        <main className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-md space-y-8">
                <div className="flex justify-center">
                    <Logo showName />
                </div>
                <Outlet />
            </div>
        </main>
    )
}
