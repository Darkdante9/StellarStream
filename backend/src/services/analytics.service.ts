import { prisma } from "../lib/db.js";
import { logger } from "../logger.js";

export interface LeaderboardEntry {
  address: string;
  totalVolumeUsd: string;
  streamCount: number;
}

export interface AssetLeaderboardEntry {
  tokenAddress: string;
  totalVolumeUsd: string;
  streamCount: number;
}

export interface LeaderboardResult {
  topStreamers: LeaderboardEntry[];
  topReceivers: LeaderboardEntry[];
  topAssets: AssetLeaderboardEntry[];
}

export interface PaymentAggregationSummary {
  totalAmountUsd: string;
  transactionCount: number;
  completedCount: number;
  pendingCount: number;
  failedCount: number;
}

export interface PaymentAggregationPoint {
  label: string;
  count: number;
  totalAmountUsd: string;
  completedCount: number;
  pendingCount: number;
  failedCount: number;
}

export interface PaymentBreakdownItem {
  recipient?: string;
  asset?: string;
  status?: string;
  category?: string;
  region?: string;
  count: number;
  totalAmountUsd: string;
}

export interface PaymentAggregationResult {
  summary: PaymentAggregationSummary;
  timeSeries: PaymentAggregationPoint[];
  byRecipient: PaymentBreakdownItem[];
  byAsset: PaymentBreakdownItem[];
  byStatus: PaymentBreakdownItem[];
  byCategory: PaymentBreakdownItem[];
  byGeography: PaymentBreakdownItem[];
}

export class AnalyticsService {
  /**
   * Aggregate total streamed volume (in USD) per sender, receiver, and asset.
   * Filters out private streams.
   * Supports 'daily', 'weekly', and 'all' (default) timeframes.
   */
  async getLeaderboard(timeframe: "daily" | "weekly" | "all" = "all"): Promise<LeaderboardResult> {
    try {
      let startDate = new Date(0);
      if (timeframe === "daily") {
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      } else if (timeframe === "weekly") {
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      }

      const [streamers, receivers, assets] = await Promise.all([
        prisma.$queryRaw<{ address: string; total_volume_usd: string; stream_count: bigint }[]>`
          SELECT
            s.sender AS address,
            COALESCE(SUM((s.amount::NUMERIC / POWER(10, COALESCE(tp.decimals, 7))) * COALESCE(tp."priceUsd", 0)), 0)::TEXT AS total_volume_usd,
            COUNT(*) AS stream_count
          FROM "Stream" s
          LEFT JOIN "TokenPrice" tp ON s."tokenAddress" = tp."tokenAddress"
          WHERE s."isPrivate" = false
            AND s."createdAt" >= ${startDate}
          GROUP BY s.sender
          ORDER BY COALESCE(SUM((s.amount::NUMERIC / POWER(10, COALESCE(tp.decimals, 7))) * COALESCE(tp."priceUsd", 0)), 0) DESC
          LIMIT 10
        `,
        prisma.$queryRaw<{ address: string; total_volume_usd: string; stream_count: bigint }[]>`
          SELECT
            s.receiver AS address,
            COALESCE(SUM((s.amount::NUMERIC / POWER(10, COALESCE(tp.decimals, 7))) * COALESCE(tp."priceUsd", 0)), 0)::TEXT AS total_volume_usd,
            COUNT(*) AS stream_count
          FROM "Stream" s
          LEFT JOIN "TokenPrice" tp ON s."tokenAddress" = tp."tokenAddress"
          WHERE s."isPrivate" = false
            AND s."createdAt" >= ${startDate}
          GROUP BY s.receiver
          ORDER BY COALESCE(SUM((s.amount::NUMERIC / POWER(10, COALESCE(tp.decimals, 7))) * COALESCE(tp."priceUsd", 0)), 0) DESC
          LIMIT 10
        `,
        prisma.$queryRaw<{ address: string; total_volume_usd: string; stream_count: bigint }[]>`
          SELECT
            COALESCE(s."tokenAddress", 'native') AS address,
            COALESCE(SUM((s.amount::NUMERIC / POWER(10, COALESCE(tp.decimals, 7))) * COALESCE(tp."priceUsd", 0)), 0)::TEXT AS total_volume_usd,
            COUNT(*) AS stream_count
          FROM "Stream" s
          LEFT JOIN "TokenPrice" tp ON s."tokenAddress" = tp."tokenAddress"
          WHERE s."isPrivate" = false
            AND s."createdAt" >= ${startDate}
          GROUP BY COALESCE(s."tokenAddress", 'native')
          ORDER BY COALESCE(SUM((s.amount::NUMERIC / POWER(10, COALESCE(tp.decimals, 7))) * COALESCE(tp."priceUsd", 0)), 0) DESC
          LIMIT 10
        `,
      ]);

      const mapEntry = (row: { address: string; total_volume_usd: string; stream_count: bigint }): LeaderboardEntry => ({
        address: row.address,
        totalVolumeUsd: String(row.total_volume_usd),
        streamCount: Number(row.stream_count),
      });

      const mapAssetEntry = (row: { address: string; total_volume_usd: string; stream_count: bigint }): AssetLeaderboardEntry => ({
        tokenAddress: row.address,
        totalVolumeUsd: String(row.total_volume_usd),
        streamCount: Number(row.stream_count),
      });

      return {
        topStreamers: streamers.map(mapEntry),
        topReceivers: receivers.map(mapEntry),
        topAssets: assets.map(mapAssetEntry),
      };
    } catch (error) {
      logger.error("Failed to compute leaderboard", error);
      throw error;
    }
  }

  async getPaymentAggregations(range: "day" | "week" | "month" = "month"): Promise<PaymentAggregationResult> {
    try {
      const since = new Date(Date.now() - (range === "day" ? 24 : range === "week" ? 7 : 30) * 60 * 60 * 1000);

      const [timeSeries, byRecipient, byAsset, byStatus, byCategory, byGeography] = await Promise.all([
        prisma.$queryRaw<{ bucket: string; count: bigint; total_amount_usd: string; completed_count: bigint; pending_count: bigint; failed_count: bigint }[]>`
          SELECT
            TO_CHAR(d."createdAt", 'YYYY-MM-DD') AS bucket,
            COUNT(*) AS count,
            COALESCE(SUM(d.amount::NUMERIC / 10000000), 0)::TEXT AS total_amount_usd,
            COUNT(*) FILTER (WHERE d.status = 'COMPLETED') AS completed_count,
            COUNT(*) FILTER (WHERE d.status = 'PENDING') AS pending_count,
            COUNT(*) FILTER (WHERE d.status = 'FAILED') AS failed_count
          FROM "Disbursement" d
          WHERE d."createdAt" >= ${since}
          GROUP BY bucket
          ORDER BY bucket ASC
        `,
        prisma.$queryRaw<{ recipient: string; count: bigint; total_amount_usd: string }[]>`
          SELECT
            d.receiver AS recipient,
            COUNT(*) AS count,
            COALESCE(SUM(d.amount::NUMERIC / 10000000), 0)::TEXT AS total_amount_usd
          FROM "Disbursement" d
          WHERE d."createdAt" >= ${since}
          GROUP BY d.receiver
          ORDER BY total_amount_usd DESC
          LIMIT 10
        `,
        prisma.$queryRaw<{ asset: string; count: bigint; total_amount_usd: string }[]>`
          SELECT
            COALESCE(d."tokenAddress", 'native') AS asset,
            COUNT(*) AS count,
            COALESCE(SUM(d.amount::NUMERIC / 10000000), 0)::TEXT AS total_amount_usd
          FROM "Disbursement" d
          WHERE d."createdAt" >= ${since}
          GROUP BY COALESCE(d."tokenAddress", 'native')
          ORDER BY total_amount_usd DESC
          LIMIT 10
        `,
        prisma.$queryRaw<{ status: string; count: bigint; total_amount_usd: string }[]>`
          SELECT
            d.status,
            COUNT(*) AS count,
            COALESCE(SUM(d.amount::NUMERIC / 10000000), 0)::TEXT AS total_amount_usd
          FROM "Disbursement" d
          WHERE d."createdAt" >= ${since}
          GROUP BY d.status
          ORDER BY count DESC
        `,
        prisma.$queryRaw<{ category: string; count: bigint; total_amount_usd: string }[]>`
          SELECT
            COALESCE(pc.name, 'Uncategorized') AS category,
            COUNT(*) AS count,
            COALESCE(SUM(d.amount::NUMERIC / 10000000), 0)::TEXT AS total_amount_usd
          FROM "Disbursement" d
          LEFT JOIN "PaymentCategory" pc ON d."categoryId" = pc.id
          WHERE d."createdAt" >= ${since}
          GROUP BY COALESCE(pc.name, 'Uncategorized')
          ORDER BY total_amount_usd DESC
        `,
        prisma.$queryRaw<{ region: string; count: bigint; total_amount_usd: string }[]>`
          SELECT
            COALESCE(CASE
              WHEN d.receiver LIKE 'G%' THEN 'North America'
              ELSE 'Global'
            END, 'Global') AS region,
            COUNT(*) AS count,
            COALESCE(SUM(d.amount::NUMERIC / 10000000), 0)::TEXT AS total_amount_usd
          FROM "Disbursement" d
          WHERE d."createdAt" >= ${since}
          GROUP BY region
          ORDER BY total_amount_usd DESC
        `,
      ]);

      const summary = timeSeries.reduce(
        (acc, item) => ({
          totalAmountUsd: (Number(acc.totalAmountUsd) + Number(item.total_amount_usd)).toString(),
          transactionCount: acc.transactionCount + Number(item.count),
          completedCount: acc.completedCount + Number(item.completed_count),
          pendingCount: acc.pendingCount + Number(item.pending_count),
          failedCount: acc.failedCount + Number(item.failed_count),
        }),
        {
          totalAmountUsd: "0",
          transactionCount: 0,
          completedCount: 0,
          pendingCount: 0,
          failedCount: 0,
        },
      );

      return {
        summary,
        timeSeries: timeSeries.map((item) => ({
          label: item.bucket,
          count: Number(item.count),
          totalAmountUsd: item.total_amount_usd,
          completedCount: Number(item.completed_count),
          pendingCount: Number(item.pending_count),
          failedCount: Number(item.failed_count),
        })),
        byRecipient: byRecipient.map((item) => ({
          recipient: item.recipient,
          count: Number(item.count),
          totalAmountUsd: item.total_amount_usd,
        })),
        byAsset: byAsset.map((item) => ({
          asset: item.asset,
          count: Number(item.count),
          totalAmountUsd: item.total_amount_usd,
        })),
        byStatus: byStatus.map((item) => ({
          status: item.status,
          count: Number(item.count),
          totalAmountUsd: item.total_amount_usd,
        })),
        byCategory: byCategory.map((item) => ({
          category: item.category,
          count: Number(item.count),
          totalAmountUsd: item.total_amount_usd,
        })),
        byGeography: byGeography.map((item) => ({
          region: item.region,
          count: Number(item.count),
          totalAmountUsd: item.total_amount_usd,
        })),
      };
    } catch (error) {
      logger.error("Failed to compute payment aggregations", error);
      throw error;
    }
  }
}
