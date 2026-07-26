import cron from "node-cron";
import { ForecastingService } from "../services/forecasting.service.js";
import { logger } from "../logger.js";

const forecastingService = new ForecastingService();

/**
 * Schedule weekly forecast report generation.
 * Runs every Monday at 01:00 UTC.
 */
export function scheduleWeeklyForecastReport() {
    cron.schedule("0 1 * * 1", async () => {
        try {
            logger.info("[ForecastScheduler] Starting weekly forecast report generation");
            const report = await forecastingService.generateWeeklyReport();
            logger.info("[ForecastScheduler] Weekly forecast report generated successfully", {
                reportId: report.reportId,
                weekStart: report.weekStart,
                weekEnd: report.weekEnd,
                anomalyCount: report.anomalies.anomalyCount,
            });
        } catch (error) {
            logger.error("[ForecastScheduler] Failed to generate weekly forecast report", error);
        }
    });

    logger.info("Weekly forecast report scheduler started (every Monday at 01:00 UTC)");
}

/**
 * Schedule daily forecast cache warming.
 * Runs every day at 06:00 UTC to pre-warm forecast data.
 */
export function scheduleDailyForecastCacheWarm() {
    cron.schedule("0 6 * * *", async () => {
        try {
            logger.info("[ForecastScheduler] Starting daily forecast cache warm");
            // Pre-generate forecasts so they're cached for users
            await Promise.all([
                forecastingService.forecastVolume(4).catch((e) => logger.warn("[ForecastScheduler] Volume forecast warm failed", e)),
                forecastingService.forecastFailures(4).catch((e) => logger.warn("[ForecastScheduler] Failure forecast warm failed", e)),
                forecastingService.estimateCosts(4).catch((e) => logger.warn("[ForecastScheduler] Cost estimate warm failed", e)),
                forecastingService.identifyPeakTimes().catch((e) => logger.warn("[ForecastScheduler] Peak times warm failed", e)),
                forecastingService.detectAnomalies().catch((e) => logger.warn("[ForecastScheduler] Anomaly detection warm failed", e)),
            ]);
            logger.info("[ForecastScheduler] Daily forecast cache warm completed");
        } catch (error) {
            logger.error("[ForecastScheduler] Daily forecast cache warm failed", error);
        }
    });

    logger.info("Daily forecast cache warm scheduler started (every day at 06:00 UTC)");
}

