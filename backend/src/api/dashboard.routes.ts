import { Router, Request, Response } from "express";
import { prisma } from "../lib/db.js";
import { logger } from "../logger.js";
import { wsService } from "../index.js";

const router = Router();

/**
 * GET /api/v1/dashboard/updates
 *
 * Returns recent dashboard updates since a given timestamp.
 * This serves as a polling fallback when WebSocket is disconnected.
 *
 * Query Parameters:
 *  - since: ISO timestamp (optional, defaults to 5 minutes ago)
 *  - address: Stellar address (optional, for user-specific updates)
 *
 * Response:
 * {
 *   success: true,
 *   updates: {
 *     payments: [...],
 *     notifications: [...],
 *     streamProgress: [...],
 *     protocolStats: {...},
 *     activeUsers: number
 *   }
 * }
 */
router.get("/updates", async (req: Request, res: Response) => {
    try {
        const since = req.query.since
            ? new Date(req.query.since as string)
            : new Date(Date.now() - 5 * 60 * 1000);
        const address = req.query.address as string | undefined;

        // Fetch recent streams (created since timestamp)
        const recentStreams = await prisma.stream.findMany({
            where: {
                createdAt: { gte: since },
                ...(address
                    ? {
                        OR: [{ sender: address }, { receiver: address }],
                    }
                    : {}),
            },
            select: {
                streamId: true,
                sender: true,
                receiver: true,
                amount: true,
                withdrawn: true,
                status: true,
                tokenAddress: true,
                createdAt: true,
            },
            orderBy: { createdAt: "desc" },
            take: 50,
        });

        // Fetch recent event logs
        let eventWhereClause: any = { createdAt: { gte: since } };
        if (address) {
            const userStreams = await prisma.stream.findMany({
                where: {
                    OR: [{ sender: address }, { receiver: address }],
                },
                select: { streamId: true },
            });
            const streamIds = userStreams.map(s => s.streamId).filter((id): id is string => id !== null);
            if (streamIds.length > 0) {
                eventWhereClause.streamId = { in: streamIds };
            }
        }
        const recentEvents = await prisma.eventLog.findMany({
            where: eventWhereClause,
            orderBy: { createdAt: "desc" },
            take: 100,
        });

        // Build payment status updates
        const payments = recentStreams.map((stream) => ({
            streamId: stream.streamId,
            status: stream.status === "ACTIVE" ? "confirmed" : stream.status === "CANCELED" ? "failed" : "confirmed",
            sender: stream.sender,
            receiver: stream.receiver,
            amount: stream.amount,
            asset: stream.tokenAddress || "XLM",
            timestamp: stream.createdAt.toISOString(),
        }));

        // Build stream progress updates
        const streamProgress = recentStreams
            .filter((s) => s.status === "ACTIVE" && s.amount)
            .map((stream) => {
                const total = BigInt(stream.amount || "0");
                const streamed = BigInt(stream.withdrawn || "0");
                const percentage = total > 0n ? Number((streamed * 100n) / total) : 0;
                return {
                    streamId: stream.streamId,
                    sender: stream.sender,
                    receiver: stream.receiver,
                    totalAmount: stream.amount,
                    streamedAmount: stream.withdrawn,
                    percentage,
                    remainingAmount: (total - streamed).toString(),
                    estimatedCompletion: new Date(
                        Date.now() + Math.max(1, 100 - percentage) * 60000
                    ).toISOString(),
                    timestamp: stream.createdAt.toISOString(),
                };
            });

        // Build notifications from events
        const notifications = recentEvents.map((event) => ({
            id: `${event.eventType}-${event.id}`,
            type: event.eventType === "create" ? "stream_created"
                : event.eventType === "cancel" ? "stream_cancelled"
                    : event.eventType === "withdrawal" ? "payment_received"
                        : "system_alert",
            title: `${event.eventType.charAt(0).toUpperCase() + event.eventType.slice(1)} Event`,
            message: `Stream ${event.streamId}: ${event.eventType} event recorded`,
            severity: event.eventType === "cancel" ? "warning" : "info",
            read: false,
            timestamp: event.createdAt.toISOString(),
        }));

        // Get protocol stats
        const protocolStats = await getProtocolStats();

        // Get active user count from WebSocket service
        const activeUsers = wsService.getConnectedUsers().length;

        res.json({
            success: true,
            updates: {
                payments,
                notifications,
                streamProgress,
                protocolStats,
                activeUsers,
                since: since.toISOString(),
            },
        });
    } catch (error) {
        logger.error("Failed to fetch dashboard updates", error);
        res.status(500).json({
            success: false,
            error: "Failed to fetch dashboard updates",
        });
    }
});

/**
 * GET /api/v1/dashboard/stats
 *
 * Returns current protocol statistics for the dashboard.
 * Lightweight endpoint for periodic polling.
 */
router.get("/stats", async (_req: Request, res: Response) => {
    try {
        const stats = await getProtocolStats();
        const activeUsers = wsService.getConnectedUsers().length;

        res.json({
            success: true,
            stats: {
                ...stats,
                activeUsers,
                timestamp: new Date().toISOString(),
            },
        });
    } catch (error) {
        logger.error("Failed to fetch dashboard stats", error);
        res.status(500).json({
            success: false,
            error: "Failed to fetch dashboard stats",
        });
    }
});

async function getProtocolStats() {
    const [totalStreams, activeStreams] = await Promise.all([
        prisma.stream.count(),
        prisma.stream.count({ where: { status: "ACTIVE" } }),
    ]);

    // Use raw query to sum string amounts
    const volumeResult = await prisma.$queryRaw<{ total: string | null }[]>`
      SELECT SUM(amount::numeric)::text AS total FROM "Stream" WHERE status = 'ACTIVE'
    `;
    const totalVolume = volumeResult[0]?.total || "0";

    return {
        totalStreams,
        activeStreams,
        totalVolume,
    };
}

export default router;

