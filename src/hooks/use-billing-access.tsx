import { createContext, useContext, useEffect, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { isBillingMutationBlocked, setBillingAccessState } from '@/lib/billing-access'
import { fetchBillingCurrent, type BillingCurrent } from '@/services/billing.service'

interface BillingAccessContextValue {
    current: BillingCurrent | undefined
    isLoading: boolean
    isReadOnly: boolean
    isLocked: boolean
    canWrite: boolean
}

const BillingAccessContext = createContext<BillingAccessContextValue | null>(null)

export function BillingAccessProvider({ children }: { children: ReactNode }) {
    const query = useQuery({
        queryKey: ['billing', 'current'],
        queryFn: fetchBillingCurrent,
        staleTime: 60_000,
        retry: false,
    })

    useEffect(() => {
        setBillingAccessState(query.data?.state ?? null)
        return () => setBillingAccessState(null)
    }, [query.data?.state])

    const state = query.data?.state
    const value: BillingAccessContextValue = {
        current: query.data,
        isLoading: query.isLoading,
        isReadOnly: state === 'ReadOnly',
        isLocked: state === 'Locked',
        canWrite: !isBillingMutationBlocked(state ?? null),
    }

    return <BillingAccessContext.Provider value={value}>{children}</BillingAccessContext.Provider>
}

export function useBillingAccess() {
    const context = useContext(BillingAccessContext)
    if (!context) throw new Error('useBillingAccess must be used within BillingAccessProvider.')
    return context
}