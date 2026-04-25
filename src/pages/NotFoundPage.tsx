import { Link } from '@tanstack/react-router'

export function NotFoundPage() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center gap-4 text-center px-4">
            <h1 className="text-5xl font-bold text-foreground">404</h1>
            <p className="text-muted-foreground">The page you're looking for doesn't exist.</p>
            <Link
                to="/"
                className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
                Go back home
            </Link>
        </main>
    )
}
