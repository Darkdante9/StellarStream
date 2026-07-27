"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { io, Socket } from "socket.io-client"

export type ConnectionStatus = "connected" | "connecting" | "disconnected" | "error"

export interface PaymentStatusEvent {
    streamId: string
    txHash: string
    status: "pending" | "confirmed" | "failed"
    sender: string
    receiver: string
    amount: string
    asset: string
    confirmations?: number
    errorMessage?: string
    timestamp: string
}

export interface StreamProgressEvent {
    streamId: string
    sender: string
    receiver: string
    totalAmount: string
    streamedAmount: string
    percentage: number
    remainingAmount: string
    estimatedCompletion: string
    timestamp: string
}

export interface NotificationEvent {
    id: string
    type: "payment_received" | "stream_created" | "stream_completed" | "stream_cancelled" | "balance_change" | "system_alert"
    title: string
    message: string
    severity: "info" | "warning" | "error" | "success"
    actionUrl?: string
    read: boolean
    timestamp: string
}

export interface ActiveUsersEvent {
    count: number
    timestamp: string
}

export interface BalanceUpdateEvent {
    address: string
    newBalance: string
    timestamp: string
}

interface UseWebSocketOptions {
    url?: string
    userAddress?: string | null
    reconnectAttempts?: number
    reconnectDelay?: number
}

interface UseWebSocketReturn {
    connectionStatus: ConnectionStatus
    lastPaymentStatus: PaymentStatusEvent | null
    lastStreamProgress: StreamProgressEvent | null
    lastNotification: NotificationEvent | null
    lastBalanceUpdate: BalanceUpdateEvent | null
    activeUsers: number
    paymentStatuses: PaymentStatusEvent[]
    notifications: NotificationEvent[]
    streamProgresses: StreamProgressEvent[]
    clearNotifications: () => void
    markNotificationRead: (id: string) => void
    reconnect: () => void
}

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:3000"
const MAX_EVENTS = 100

export function useWebSocket({
    url = WS_URL,
    userAddress = null,
    reconnectAttempts = 10,
    reconnectDelay = 1000,
}: UseWebSocketOptions = {}): UseWebSocketReturn {
    const socketRef = useRef<Socket | null>(null)
    const reconnectCountRef = useRef(0)
    const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null)
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected")
    const [lastPaymentStatus, setLastPaymentStatus] = useState<PaymentStatusEvent | null>(null)
    const [lastStreamProgress, setLastStreamProgress] = useState<StreamProgressEvent | null>(null)
    const [lastNotification, setLastNotification] = useState<NotificationEvent | null>(null)
    const [lastBalanceUpdate, setLastBalanceUpdate] = useState<BalanceUpdateEvent | null>(null)
    const [activeUsers, setActiveUsers] = useState(0)
    const [paymentStatuses, setPaymentStatuses] = useState<PaymentStatusEvent[]>([])
    const [notifications, setNotifications] = useState<NotificationEvent[]>([])
    const [streamProgresses, setStreamProgresses] = useState<StreamProgressEvent[]>([])

    const connect = useCallback(() => {
        if (socketRef.current?.connected) return

        setConnectionStatus("connecting")

        const socket = io(url, {
            transports: ["websocket", "polling"],
            reconnection: true,
            reconnectionAttempts: reconnectAttempts,
            reconnectionDelay: reconnectDelay,
            reconnectionDelayMax: 5000,
            timeout: 10000,
        })

        socket.on("connect", () => {
            setConnectionStatus("connected")
            reconnectCountRef.current = 0

            // If user address is provided, join their stream room
            if (userAddress) {
                socket.emit("join-stream-room", userAddress)
            }
            socket.emit("join-split-feed")
        })

        socket.on("disconnect", () => {
            setConnectionStatus("disconnected")
        })

        socket.on("connect_error", () => {
            setConnectionStatus("error")
        })

        socket.on("server-ping", () => {
            socket.emit("client-pong")
        })

        // Dashboard event handlers
        socket.on("payment-status", (payload: PaymentStatusEvent) => {
            setLastPaymentStatus(payload)
            setPaymentStatuses((prev) => [payload, ...prev].slice(0, MAX_EVENTS))
        })

        socket.on("stream-progress", (payload: StreamProgressEvent) => {
            setLastStreamProgress(payload)
            setStreamProgresses((prev) => {
                const existing = prev.findIndex((s) => s.streamId === payload.streamId)
                if (existing >= 0) {
                    const updated = [...prev]
                    updated[existing] = payload
                    return updated
                }
                return [payload, ...prev].slice(0, MAX_EVENTS)
            })
        })

        socket.on("notification", (payload: NotificationEvent) => {
            setLastNotification(payload)
            setNotifications((prev) => [payload, ...prev].slice(0, MAX_EVENTS))
        })

        socket.on("balance-update", (payload: BalanceUpdateEvent) => {
            setLastBalanceUpdate(payload)
        })

        socket.on("active-users", (payload: ActiveUsersEvent) => {
            setActiveUsers(payload.count)
        })

        socket.on("new-stream", () => {
            // Stream created - trigger refresh
        })

        socket.on("joined-room", () => {
            // Successfully joined room
        })

        socketRef.current = socket
    }, [url, userAddress, reconnectAttempts, reconnectDelay])

    const disconnect = useCallback(() => {
        if (reconnectTimerRef.current) {
            clearTimeout(reconnectTimerRef.current)
            reconnectTimerRef.current = null
        }
        if (socketRef.current) {
            if (userAddress) {
                socketRef.current.emit("leave-stream-room", userAddress)
            }
            socketRef.current.removeAllListeners()
            socketRef.current.disconnect()
            socketRef.current = null
        }
        setConnectionStatus("disconnected")
    }, [userAddress])

    const reconnect = useCallback(() => {
        disconnect()
        setTimeout(() => connect(), 100)
    }, [connect, disconnect])

    const clearNotifications = useCallback(() => {
        setNotifications([])
    }, [])

    const markNotificationRead = useCallback((id: string) => {
        setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        )
    }, [])

    // Connect on mount, disconnect on unmount
    useEffect(() => {
        connect()
        return () => disconnect()
    }, [connect, disconnect])

    // Reconnect when userAddress changes
    useEffect(() => {
        if (socketRef.current?.connected) {
            if (userAddress) {
                socketRef.current.emit("join-stream-room", userAddress)
            }
        }
    }, [userAddress])

    return {
        connectionStatus,
        lastPaymentStatus,
        lastStreamProgress,
        lastNotification,
        lastBalanceUpdate,
        activeUsers,
        paymentStatuses,
        notifications,
        streamProgresses,
        clearNotifications,
        markNotificationRead,
        reconnect,
    }
}

