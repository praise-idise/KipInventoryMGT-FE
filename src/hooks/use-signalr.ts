import { useEffect, useRef, useState } from 'react'
import {
    HubConnectionBuilder,
    HubConnection,
    HubConnectionState,
    LogLevel,
} from '@microsoft/signalr'
import { getAccessToken } from '@/auth/session'

interface UseSignalROptions {
    /** Called after every successful (re)connect. */
    onReconnect?: (connection: HubConnection) => void
    /** Connection log level. Defaults to Warning in production, Information in development. */
    logLevel?: LogLevel
}

interface UseSignalRResult {
    connection: HubConnection | null
    isConnected: boolean
}

export function useSignalR(hubUrl: string, options: UseSignalROptions = {}): UseSignalRResult {
    const { onReconnect, logLevel } = options
    const connectionRef = useRef<HubConnection | null>(null)
    const [isConnected, setIsConnected] = useState(false)

    useEffect(() => {
        const resolvedLogLevel =
            logLevel ??
            (import.meta.env.DEV ? LogLevel.Information : LogLevel.Warning)

        const connection = new HubConnectionBuilder()
            .withUrl(hubUrl, {
                accessTokenFactory: () => {
                    const token = getAccessToken()
                    return token ?? ''
                },
            })
            .withAutomaticReconnect([0, 2000, 10000, 30000])
            .configureLogging(resolvedLogLevel)
            .build()

        connectionRef.current = connection

        connection.onreconnecting(() => setIsConnected(false))
        connection.onreconnected(() => {
            setIsConnected(true)
            onReconnect?.(connection)
        })
        connection.onclose(() => setIsConnected(false))

        async function start() {
            try {
                await connection.start()
                setIsConnected(true)
                onReconnect?.(connection)
            } catch {
                // Retry on next visibility change or after a delay
                setTimeout(() => {
                    if (connection.state === HubConnectionState.Disconnected) {
                        start()
                    }
                }, 5000)
            }
        }

        start()

        return () => {
            connection.stop()
        }
    }, [hubUrl]) // eslint-disable-line react-hooks/exhaustive-deps

    return { connection: connectionRef.current, isConnected }
}
