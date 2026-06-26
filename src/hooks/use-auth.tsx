import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { clearAuthSession, getAccessToken, getAuthUser, setAuthSession, type AuthUser } from '@/auth/session'
import { login as loginRequest, logout as logoutRequest } from '@/services/auth.service'

interface AuthContextValue {
    user: AuthUser | null
    token: string | null
    isAuthenticated: boolean
    login: (payload: { email: string; password: string }) => Promise<void>
    logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const AUTH_CHANNEL = 'kip-auth-sync'

function broadcastAuthChange(action: 'login' | 'logout') {
    try {
        const channel = new BroadcastChannel(AUTH_CHANNEL)
        channel.postMessage({ action, timestamp: Date.now() })
        channel.close()
    } catch {
        // BroadcastChannel not supported (e.g., older browsers) — silently ignore
    }
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [token, setToken] = useState<string | null>(() => getAccessToken())
    const [user, setUser] = useState<AuthUser | null>(() => getAuthUser())

    useEffect(() => {
        let channel: BroadcastChannel | null = null

        try {
            channel = new BroadcastChannel(AUTH_CHANNEL)

            channel.onmessage = (event: MessageEvent<{ action: 'login' | 'logout' }>) => {
                if (event.data?.action === 'logout') {
                    clearAuthSession()
                    setToken(null)
                    setUser(null)
                } else if (event.data?.action === 'login') {
                    const newToken = getAccessToken()
                    const newUser = getAuthUser()
                    if (newToken && newUser) {
                        setToken(newToken)
                        setUser(newUser)
                    }
                }
            }
        } catch {
            // Silently ignore
        }

        return () => {
            channel?.close()
        }
    }, [])

    async function login(payload: { email: string; password: string }) {
        const response = await loginRequest(payload)
        const data = response.data

        if (!data.token || !data.userId || !data.email) {
            throw new Error('Login response is missing required auth fields.')
        }

        const nextUser: AuthUser = {
            userId: data.userId,
            email: data.email,
            roles: data.roles ?? [],
        }

        setAuthSession(data.token, nextUser)
        setToken(data.token)
        setUser(nextUser)
        broadcastAuthChange('login')
    }

    function logout() {
        const logoutRequestPromise = logoutRequest().catch(() => {
            // Local logout should not depend on the API being reachable.
        })

        clearAuthSession()
        setToken(null)
        setUser(null)
        broadcastAuthChange('logout')

        void logoutRequestPromise
        return Promise.resolve()
    }

    const value = useMemo(
        () => ({
            user,
            token,
            isAuthenticated: Boolean(token),
            login,
            logout,
        }),
        [user, token],
    )

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider.')
    }
    return context
}
