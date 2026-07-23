/**
 * complianceCheck middleware
 *
 * Runs compliance checks before any payment-related route handler.
 * Expects req.body to contain: senderAddress, recipientAddress, amountStroops, assetCode.
 * Blocks the request with 403 if any check fails.
 */

import { Request, Response, NextFunction } from "express";
import { complianceService, PaymentContext } from "../services/compliance.service.js";
import { logger } from "../logger.js";

export async function complianceCheck(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const body = req.body as Record<string, unknown>;

  const senderAddress = (body.senderAddress as string) || (body.sender as string) || "";
  const recipientAddress =
    (body.recipientAddress as string) || (body.recipient as string) || (body.receiver as string) || "";
  const amountRaw =
    (body.amountStroops as string) || (body.amount as string) || "0";
  const assetCode = (body.assetCode as string) || (body.asset as string) || "unknown";
  const txHash = (body.txHash as string) ?? undefined;

  if (!senderAddress || !recipientAddress) {
    // Missing fields — let the route's own validation handle it
    return next();
  }

  let amountStroops: bigint;
  try {
    amountStroops = BigInt(amountRaw);
  } catch {
    amountStroops = BigInt(0);
  }

  const ctx: PaymentContext = {
    senderAddress,
    recipientAddress,
    amountStroops,
    assetCode,
    txHash: txHash as string | undefined,
    metadata: { path: req.path, method: req.method },
  };

  try {
    const result = await complianceService.check(ctx);

    if (!result.allowed) {
      res.status(403).json({
        success: false,
        code: "COMPLIANCE_BLOCKED",
        reason: result.blockedReason,
        checks: result.checks.map((c) => ({
          check: c.check,
          passed: c.passed,
          ...(c.reason ? { reason: c.reason } : {}),
        })),
      });
      return;
    }

    // Attach result to request for downstream use
    (req as any).complianceResult = result;
    next();
  } catch (err) {
    logger.error("[complianceCheck] Unexpected error", { err });
    // Fail-open on infrastructure errors
    next();
  }
}
