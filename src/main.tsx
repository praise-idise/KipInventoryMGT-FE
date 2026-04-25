import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { isApiError } from '@/api/types'
import { AuthProvider } from '@/hooks/use-auth'
import { router } from '@/router'
import '@/styles/globals.css'

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            retry: (failureCount, error) => {
                // Don't retry client errors (4xx); do retry server errors (5xx) up to 2 times.
                if (isApiError(error) && error.statusCode < 500) return false
                return failureCount < 2
            },
        },
    },
})

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('Root element not found.')

createRoot(rootEl).render(
    <StrictMode>
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <RouterProvider router={router} />
            </AuthProvider>
        </QueryClientProvider>
    </StrictMode>,
)
