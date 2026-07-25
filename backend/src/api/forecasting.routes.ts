import { Router, Request, Response } from "express";
import { ForecastingService } from "../services/forecasting.service.js";
import { logger } from "../logger.js";

const router = Router();
const forecastingService = new ForecastingService();

/**
 * GET /api/v1/analytics/forecasts/volume
 *
 * Returns volume predictions for the next N weeks.
 *
 * Query Parameters:
 *  - weeks: number (default: 4, max: 12)
 *
 * Response:
 * {
 *   success: true,
 *   data: { currency, predictions, trend, averagePredictedVolume, metadata }
 * }
 */
router.get("/volume", async (req: Request, res: Response) => {
    try {
        const weeks = Math.min(Math.max(parseInt(req.query.weeks as string) || 4, 1), 12);
        const data = await forecastingService.forecastVolume(weeks);
        res.json({ success: true, data });
    } catch (error) {
        logger.error("Failed to generate volume forecast", error);
        res.status(500).json({
            success: false,
            error: "Failed to generate volume forecast.",
        });
    }
});

/**
 * GET /api/v1/analytics/forecasts/failures
 *
 * Returns failure rate predictions for the next N weeks.
 *
 * Query Parameters:
 *  - weeks: number (default: 4, max: 12)
 */
router.get("/failures", async (req: Request, res: Response) => {
    try {
        const weeks = Math.min(Math.max(parseInt(req.query.weeks as string) || 4, 1), 12);
        const data = await forecastingService.forecastFailures(weeks);
        res.json({ success: true, data });
    } catch (error) {
        logger.error("Failed to generate failure forecast", error);
        res.status(500).json({
            success: false,
            error: "Failed to generate failure forecast.",
        });
    }
});

/**
 * GET /api/v1/analytics/forecasts/costs
 *
 * Returns cost estimates for the next N weeks.
 *
 * Query Parameters:
 *  - weeks: number (default: 4, max: 12)
 */
router.get("/costs", async (req: Request, res: Response) => {
    try {
        const weeks = Math.min(Math.max(parseInt(req.query.weeks as string) || 4, 1), 12);
        const data = await forecastingService.estimateCosts(weeks);
        res.json({ success: true, data });
    } catch (error) {
        logger.error("Failed to estimate costs", error);
        res.status(500).json({
            success: false,
            error: "Failed to estimate costs.",
        });
    }
});

/**
 * GET /api/v1/analytics/forecasts/peak-times
 *
 * Identifies peak transaction times based on historical patterns.
 */
router.get("/peak-times", async (_req: Request, res: Response) => {
    try {
        const data = await forecastingService.identifyPeakTimes();
        res.json({ success: true, data });
    } catch (error) {
        logger.error("Failed to identify peak times", error);
        res.status(500).json({
            success: false,
            error: "Failed to identify peak times.",
        });
    }
});

/**
 * GET /api/v1/analytics/forecasts/anomalies
 *
 * Detects anomalies in payment patterns using z-score analysis.
 */
router.get("/anomalies", async (_req: Request, res: Response) => {
    try {
        const data = await forecastingService.detectAnomalies();
        res.json({ success: true, data });
    } catch (error) {
        logger.error("Failed to detect anomalies", error);
        res.status(500).json({
            success: false,
            error: "Failed to detect anomalies.",
        });
    }
});

/**
 * GET /api/v1/analytics/forecasts/report
 *
 * Returns the latest weekly forecast report.
 * If generate=true query param is passed, generates a new report.
 *
 * Query Parameters:
 *  - generate: boolean (default: false)
 */
router.get("/report", async (req: Request, res: Response) => {
    try {
        const generate = req.query.generate === "true";

        if (generate) {
            const report = await forecastingService.generateWeeklyReport();
            res.json({ success: true, data: report });
            return;
        }

        const latest = await forecastingService.getLatestReport();
        if (!latest) {
            // No report exists, generate one
            const report = await forecastingService.generateWeeklyReport();
            res.json({ success: true, data: report });
            return;
        }

        res.json({ success: true, data: latest });
    } catch (error) {
        logger.error("Failed to retrieve forecast report", error);
        res.status(500).json({
            success: false,
            error: "Failed to retrieve forecast report.",
        });
    }
});

/**
 * POST /api/v1/analytics/forecasts/report/generate
 *
 * Manually triggers generation of a new weekly forecast report.
 */
router.post("/report/generate", async (_req: Request, res: Response) => {
    try {
        const report = await forecastingService.generateWeeklyReport();
        res.json({ success: true, data: report });
    } catch (error) {
        logger.error("Failed to generate weekly report", error);
        res.status(500).json({
            success: false,
            error: "Failed to generate weekly report.",
        });
    }
});

/**
 * GET /api/v1/analytics/forecasts
 *
 * Returns a combined summary of all forecasts.
 */
router.get("/", async (_req: Request, res: Response) => {
    try {
        const [volumeForecast, failureForecast, costForecast, peakTimes, anomalies] = await Promise.all([
            forecastingService.forecastVolume(4),
            forecastingService.forecastFailures(4),
            forecastingService.estimateCosts(4),
            forecastingService.identifyPeakTimes(),
            forecastingService.detectAnomalies(),
        ]);

        res.json({
            success: true,
            data: {
                volumeForecast,
                failureForecast,
                costForecast,
                peakTimes,
                anomalies,
                generatedAt: new Date().toISOString(),
            },
        });
    } catch (error) {
        logger.error("Failed to generate combined forecast", error);
        res.status(500).json({
            success: false,
            error: "Failed to generate combined forecast.",
        });
    }
});

export default router;

