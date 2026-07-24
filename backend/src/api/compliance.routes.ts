/**
 * Compliance API routes — /api/v1/compliance
 *
 * POST   /check              — run checks for a payment (preview, no logging unless blocked)
 * GET    /blocked            — list recent blocked payments
 * GET    /log/:address       — compliance log for a specific address
 * POST   /profiles           — upsert a compliance profile (admin)
 * GET    /config             — view current compliance configuration
 * PATCH  /config             — update compliance configuration (admin)
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import { complianceService } from "../services/compliance.service.js";
import validateRequest from "../middleware/validateRequest.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { logger } from "../logger.js";

const router = Router();

// ── Validation schemas ─────────────────────────────────────────────────────

const CheckSchema = z.object({
  body: z.object({
    senderAddress: z.string().min(56).max(58),
    recipientAddress: z.string().min(56).max(58),
    amountStroops: z.string().regex(/^\d+$/, "Must be a numeric string"),
    assetCode: z.string().min(1).max(12),
    txHash: z.string().optional(),
  }),
});

const ProfileSchema = z.object({
  body: z.object({
    stellarAddress: z.string().min(56).max(58),
    sanctioned: z.boolean().optional(),
    isPep: z.boolean().optional(),
    kycLevel: z.number().int().min(0).max(2).optional(),
    notes: z.string().max(500).optional(),
  }),
});

const ConfigPatchSchema = z.object({
  body: z.object({
    sanctionsEnabled: z.boolean().optional(),
    amlEnabled: z.boolean().optional(),
    transactionLimitsEnabled: z.boolean().optional(),
    kycEnabled: z.boolean().optional(),
    pepEnabled: z.boolean().optional(),
    maxTransactionAmount: z.string().regex(/^\d+$/).optional(),
    maxDailyAmountPerSender: z.string().regex(/^\d+$/).optional(),
    requiredKycLevel: z.number().int().min(0).max(2).optional(),
    amlStructuringThreshold: z.number().int().min(1).optional(),
    amlStructuringWindowSeconds: z.number().int().min(60).optional(),
  }),
});

// ── Routes ─────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/compliance/check
 * Run all enabled compliance checks for a payment.
 */
router.post(
  "/check",
  validateRequest({ body: CheckSchema.shape.body }),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { senderAddress, recipientAddress, amountStroops, assetCode, txHash } =
        req.body as z.infer<typeof CheckSchema.shape.body>;

      const result = await complianceService.check({
        senderAddress,
        recipientAddress,
        amountStroops: BigInt(amountStroops),
        assetCode,
        txHash,
      });

      res.status(result.allowed ? 200 : 403).json({
        success: true,
        allowed: result.allowed,
        ...(result.blockedReason ? { blockedReason: result.blockedReason } : {}),
        checks: result.checks,
      });
    } catch (err) {
      logger.error("[compliance/check] Error", { err });
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  },
);

/**
 * GET /api/v1/compliance/blocked
 * Return recent blocked payments. Admin only.
 */
router.get(
  "/blocked",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
      const entries = await complianceService.getBlockedPayments(limit);
      res.json({ success: true, count: (entries as unknown[]).length, entries });
    } catch (err) {
      logger.error("[compliance/blocked] Error", { err });
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  },
);

/**
 * GET /api/v1/compliance/log/:address
 * Return compliance log for a Stellar address. Admin only.
 */
router.get(
  "/log/:address",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { address } = req.params;
      const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
      const entries = await complianceService.getLogByAddress(address, limit);
      res.json({ success: true, address, count: (entries as unknown[]).length, entries });
    } catch (err) {
      logger.error("[compliance/log] Error", { err });
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  },
);

/**
 * POST /api/v1/compliance/profiles
 * Upsert a compliance profile (sanctioned flag, PEP flag, KYC level). Admin only.
 */
router.post(
  "/profiles",
  requireAdmin,
  validateRequest({ body: ProfileSchema.shape.body }),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { stellarAddress, sanctioned, isPep, kycLevel, notes } =
        req.body as z.infer<typeof ProfileSchema.shape.body>;

      await complianceService.upsertProfile(stellarAddress, {
        sanctioned,
        isPep,
        kycLevel,
        notes,
      });

      res.json({ success: true, message: `Profile updated for ${stellarAddress}` });
    } catch (err) {
      logger.error("[compliance/profiles] Error", { err });
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  },
);

/**
 * GET /api/v1/compliance/config
 * Return current compliance configuration. Admin only.
 */
router.get(
  "/config",
  requireAdmin,
  (_req: Request, res: Response): void => {
    const config = complianceService.getConfig();
    res.json({
      success: true,
      config: {
        ...config,
        // Serialize bigints as strings for JSON
        maxTransactionAmount: config.maxTransactionAmount.toString(),
        maxDailyAmountPerSender: config.maxDailyAmountPerSender.toString(),
      },
    });
  },
);

/**
 * PATCH /api/v1/compliance/config
 * Update compliance configuration at runtime. Admin only.
 */
router.patch(
  "/config",
  requireAdmin,
  validateRequest({ body: ConfigPatchSchema.shape.body }),
  (req: Request, res: Response): void => {
    try {
      const body = req.body as z.infer<typeof ConfigPatchSchema.shape.body>;

      complianceService.updateConfig({
        ...body,
        ...(body.maxTransactionAmount !== undefined
          ? { maxTransactionAmount: BigInt(body.maxTransactionAmount) }
          : {}),
        ...(body.maxDailyAmountPerSender !== undefined
          ? { maxDailyAmountPerSender: BigInt(body.maxDailyAmountPerSender) }
          : {}),
      });

      const config = complianceService.getConfig();
      res.json({
        success: true,
        message: "Compliance configuration updated",
        config: {
          ...config,
          maxTransactionAmount: config.maxTransactionAmount.toString(),
          maxDailyAmountPerSender: config.maxDailyAmountPerSender.toString(),
        },
      });
    } catch (err) {
      logger.error("[compliance/config] Error", { err });
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  },
);

export default router;
