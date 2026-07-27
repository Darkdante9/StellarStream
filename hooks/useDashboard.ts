"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useWebSocket, type PaymentStatusEvent, type StreamProgressEvent, type NotificationEvent } from "./useWebSocket"

interface ProtocolStats {
    totalStreams: number
    activeStreams: number
    totalVolume: string
    activeUsers: number
}

interface DashboardUpdates {
    payments: PaymentStatusEvent[]
    notifications: NotificationEvent[]
    streamProgress: StreamProgressEvent[]
    protocolStats: ProtocolStats
    activeUsers: number
}

interface UseDashboardOptions {
    userAddress?: string | null
    pollingInterval?: number
    enabled?: boolean
}

interface UseDashboardReturn {
    stats: ProtocolStats
    payments: PaymentStatusEvent[]
    notifications: NotificationEvent[]
    streamProgress: StreamProgressEvent[]
    activeUsers: number
    connectionStatus: "connected" | "connecting" | "disconnected" | "error"
    loading: boolean
    error: string | null
    lastUpdate: string | null
    isPolling: boolean
    clearNotifications: () => void
    markNotificationRead: (id: string) => void
    refresh: () => void
    reconnect: () => void
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || ""

export function useDashboard({
    userAddress = null,
    pollingInterval = 30000,
    enabled = true,
}: UseDashboardOptions = {}): UseDashboardReturn {
    const pollingTimerRef = useRef<NodeJS.Timeout | null>(null)
    const isPollingRef = useRef(false)
    const [stats, setStats] = useState<ProtocolStats>({
        totalStreams: 0,
        activeStreams: 0,
        totalVolume: "0",
        activeUsers: 0,
    })
    const [payments, setPayments] = useState<PaymentStatusEvent[]>([])
    const [notifications, setNotifications] = useState<NotificationEvent[]>([])
    const [streamProgress, setStreamProgress] = useState<StreamProgressEvent[]>([])
    const [activeUsers, setActiveUsers] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [lastUpdate, setLastUpdate] = useState<string | null>(null)
    const [isPolling, setIsPolling] = useState(false)

    // WebSocket connection for real-time updates
    const ws = useWebSocket({
        userAddress,
    })

    const fetchUpdates = useCallback(async () => {
        try {
            const params = new URLSearchParams()
            if (lastUpdate) params.set("since", lastUpdate)
            if (userAddress) params.set("address", userAddress)

            const res = await fetch(`${API_BASE}/api/v1/dashboard/updates?${params}`)
            if (!res.ok) throw new Error(`HTTP ${res.status}`)

            const data = await res.json()
            if (data.success) {
                const updates = data.updates as DashboardUpdates

                // Merge payments (avoid duplicates by streamId)
                setPayments((prev) => {
                    const existingIds = new Set(prev.map((p) => p.streamId))
                    const newPayments = updates.payments.filter((p) => !existingIds.has(p.streamId))
                    return [...newPayments, ...prev].slice(0, 100)
                })

                // Merge notifications (avoid duplicates by id)
                setNotifications((prev) => {
                    const existingIds = new Set(prev.map((n) => n.id))
                    const newNotifications = updates.notifications.filter((n) => !existingIds.has(n.id))
                    return [...newNotifications, ...prev].slice(0, 100)
                })

                // Merge stream progress updates
                setStreamProgress((prev) => {
                    const updated = [...prev]
                    for (const sp of updates.streamProgress) {
                        const existing = updated.findIndex((s) => s.streamId === sp.streamId)
                        if (existing >= 0) {
                            updated[existing] = sp
                        } else {
                            updated.push(sp)
                        }
                    }
                    return updated.slice(0, 100)
                })

                setStats(updates.protocolStats)
                setActiveUsers(updates.activeUsers)
                setLastUpdate(new Date().toISOString())
                setError(null)
            }
        } catch (err) {
            // Only set error if we don't have any data yet
            if (payments.length === 0) {
                setError(err instanceof Error ? err.message : "Failed to fetch dashboard data")
            }
        } finally {
            setLoading(false)
        }
    }, [lastUpdate, userAddress])

    const refresh = useCallback(async () => {
        setLoading(true)
        setLastUpdate(null)
        await fetchUpdates()
    }, [fetchUpdates])

    const reconnect = useCallback(() => {
        ws.reconnect()
    }, [ws])

    // Initial data fetch
    useEffect(() => {
        if (!enabled) return
        refresh()
    }, [enabled]) // eslint-disable-line react-hooks/exhaustive-deps

    // Periodic polling fallback (when WebSocket is disconnected)
    useEffect(() => {
        if (!enabled) return

        const startPolling = () => {
            isPollingRef.current = true
            setIsPolling(true)
            pollingTimerRef.current = setInterval(() => {
                fetchUpdates()
            }, pollingInterval)
        }

        const stopPolling = () => {
            isPollingRef.current = false
            setIsPolling(false)
            if (pollingTimerRef.current) {
                clearInterval(pollingTimerRef.current)
                pollingTimerRef.current = null
            }
        }

        // Start polling if WebSocket is disconnected
        if (ws.connectionStatus !== "connected") {
            startPolling()
        } else {
            stopPolling()
        }

        // Monitor connection status changes
        const checkConnection = setInterval(() => {
            if (ws.connectionStatus === "connected" && isPollingRef.current) {
                stopPolling()
            } else if (ws.connectionStatus !== "connected" && !isPollingRef.current) {
                startPolling()
            }
        }, 5000)

        return () => {
            stopPolling()
            clearInterval(checkConnection)
        }
    }, [enabled, ws.connectionStatus, pollingInterval, fetchUpdates])

    // Sync WebSocket data into dashboard state
    useEffect(() => {
        if (ws.lastPaymentStatus) {
            setPayments((prev) => {
                const existing = prev.findIndex((p) => p.streamId === ws.lastPaymentStatus!.streamId)
                if (existing >= 0) {
                    const updated = [...prev]
                    updated[existing] = ws.lastPaymentStatus!
                    return updated
                }
                return [ws.lastPaymentStatus!, ...prev].slice(0, 100)
            })
        }
    }, [ws.lastPaymentStatus])

    useEffect(() => {
        if (ws.lastStreamProgress) {
            setStreamProgress((prev) => {
                const existing = prev.findIndex((s) => s.streamId === ws.lastStreamProgress!.streamId)
                if (existing >= 0) {
                    const updated = [...prev]
                    updated[existing] = ws.lastStreamProgress!
                    return updated
                }
                return [ws.lastStreamProgress!, ...prev].slice(0, 100)
            })
        }
    }, [ws.lastStreamProgress])

    useEffect(() => {
        if (ws.lastNotification) {
            setNotifications((prev) => [ws.lastNotification!, ...prev].slice(0, 100))
        }
    }, [ws.lastNotification])

    useEffect(() => {
        if (ws.activeUsers > 0) {
            setActiveUsers(ws.activeUsers)
            setStats((prev) => ({ ...prev, activeUsers: ws.activeUsers }))
        }
    }, [ws.activeUsers])

    return {
        stats,
        payments,
        notifications,
        streamProgress,
        activeUsers,
        connectionStatus: ws.connectionStatus,
        loading,
        error,
        lastUpdate,
        isPolling,
        clearNotifications: ws.clearNotifications,
        markNotificationRead: ws.markNotificationRead,
        refresh,
        reconnect,
    }
}

