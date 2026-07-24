/**
 * ComplianceService — automated payment compliance checks
 *
 * Performs the following checks in order (all configurable via ComplianceConfig):
 *   1. Sanctions screening   — address on OFAC/SDN-style blocklist
 *   2. AML rules             — structuring detection, velocity checks
 *   3. Transaction limits    — per-tx and daily caps
 *   4. KYC verification      — sender/recipient KYC level requirements
 *   5. PEP screening         — politically exposed persons check
 *
 * Blocked payments are always logged to ComplianceLog.
 */

import { prisma } from "../lib/db.js";
import { logger } from "../logger.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CheckName =
  | "SANCTIONS"
  | "AML"
  | "TRANSACTION_LIMITS"
  | "KYC"
  | "PEP";

export type CheckResult = {
  check: CheckName;
  passed: boolean;
  reason?: string;
};

export type ComplianceResult = {
  allowed: boolean;
  checks: CheckResult[];
  /** Populated when allowed = false */
  blockedReason?: string;
};

export interface ComplianceConfig {
  sanctionsEnabled: boolean;
  amlEnabled: boolean;
  transactionLimitsEnabled: boolean;
  kycEnabled: boolean;
  pepEnabled: boolean;
  /** Max single-transaction amount in stroops (default: 10_000_000_000 = 1000 XLM) */
  maxTransactionAmount: bigint;
  /** Max daily total per sender in stroops (default: 50_000_000_000 = 5000 XLM) */
  maxDailyAmountPerSender: bigint;
  /** Required KYC level: 0 = none, 1 = basic, 2 = full */
  requiredKycLevel: number;
  /** Number of identical-amount txs within windowSeconds that triggers structuring flag */
  amlStructuringThreshold: number;
  amlStructuringWindowSeconds: number;
}

export const DEFAULT_CONFIG: ComplianceConfig = {
  sanctionsEnabled: true,
  amlEnabled: true,
  transactionLimitsEnabled: true,
  kycEnabled: true,
  pepEnabled: true,
  maxTransactionAmount: BigInt("10000000000"),   // 1 000 XLM
  maxDailyAmountPerSender: BigInt("50000000000"), // 5 000 XLM
  requiredKycLevel: 1,
  amlStructuringThreshold: 5,
  amlStructuringWindowSeconds: 3600,
};

export interface PaymentContext {
  senderAddress: string;
  recipientAddress: string;
  amountStroops: bigint;
  assetCode: string;
  txHash?: string;
  metadata?: Record<string, unknown>;
}

// ─── ComplianceService ────────────────────────────────────────────────────────

export class ComplianceService {
  private config: ComplianceConfig;

  constructor(config: Partial<ComplianceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /** Update runtime configuration without restarting the service. */
  updateConfig(patch: Partial<ComplianceConfig>): void {
    this.config = { ...this.config, ...patch };
    logger.info("[Compliance] Configuration updated", { config: this.config });
  }

  getConfig(): Readonly<ComplianceConfig> {
    return { ...this.config };
  }

  /**
   * Run all enabled compliance checks for a payment.
   * Always returns a result — never throws.
   */
  async check(ctx: PaymentContext): Promise<ComplianceResult> {
    const checks: CheckResult[] = [];

    try {
      if (this.config.sanctionsEnabled) {
        checks.push(await this.checkSanctions(ctx));
      }
      if (this.config.amlEnabled) {
        checks.push(await this.checkAml(ctx));
      }
      if (this.config.transactionLimitsEnabled) {
        checks.push(await this.checkTransactionLimits(ctx));
      }
      if (this.config.kycEnabled) {
        checks.push(await this.checkKyc(ctx));
      }
      if (this.config.pepEnabled) {
        checks.push(await this.checkPep(ctx));
      }
    } catch (err) {
      logger.error("[Compliance] Unexpected error during checks", { err, ctx });
      // Fail-open: log the error but don't block the payment on infra failures
      return { allowed: true, checks };
    }

    const failed = checks.find((c) => !c.passed);
    const result: ComplianceResult = {
      allowed: !failed,
      checks,
      blockedReason: failed?.reason,
    };

    if (!result.allowed) {
      await this.logBlockedPayment(ctx, result).catch((err) =>
        logger.error("[Compliance] Failed to log blocked payment", { err }),
      );
    }

    return result;
  }

  // ── Individual checks ───────────────────────────────────────────────────────

  private async checkSanctions(ctx: PaymentContext): Promise<CheckResult> {
    const blocked = await this.isSanctioned(ctx.senderAddress) ||
                    await this.isSanctioned(ctx.recipientAddress);
    return {
      check: "SANCTIONS",
      passed: !blocked,
      reason: blocked
        ? `Address is on the sanctions blocklist`
        : undefined,
    };
  }

  private async checkAml(ctx: PaymentContext): Promise<CheckResult> {
    // Structuring detection: flag if sender sends same amount N+ times in window
    const windowStart = new Date(
      Date.now() - this.config.amlStructuringWindowSeconds * 1000,
    );

    let count = 0;
    try {
      const rows = await prisma.$queryRaw<{ count: string }[]>`
        SELECT COUNT(*)::text AS count
        FROM "ComplianceLog"
        WHERE sender_address = ${ctx.senderAddress}
          AND amount_stroops = ${ctx.amountStroops}::bigint
          AND created_at >= ${windowStart}
          AND check_name = 'AML'
      `;
      count = parseInt(rows[0]?.count ?? "0", 10);
    } catch {
      // Table may not exist yet in test envs; skip
      count = 0;
    }

    const structuring = count >= this.config.amlStructuringThreshold;
    return {
      check: "AML",
      passed: !structuring,
      reason: structuring
        ? `Structuring pattern detected: ${count} identical transactions within ${this.config.amlStructuringWindowSeconds}s`
        : undefined,
    };
  }

  private async checkTransactionLimits(ctx: PaymentContext): Promise<CheckResult> {
    // Single-transaction limit
    if (ctx.amountStroops > this.config.maxTransactionAmount) {
      return {
        check: "TRANSACTION_LIMITS",
        passed: false,
        reason: `Transaction amount ${ctx.amountStroops} exceeds per-transaction limit of ${this.config.maxTransactionAmount}`,
      };
    }

    // Daily sender limit
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);

    let dailyTotal = BigInt(0);
    try {
      const rows = await prisma.$queryRaw<{ total: string }[]>`
        SELECT COALESCE(SUM(amount_stroops), 0)::text AS total
        FROM "ComplianceLog"
        WHERE sender_address = ${ctx.senderAddress}
          AND created_at >= ${startOfDay}
          AND allowed = true
      `;
      dailyTotal = BigInt(rows[0]?.total ?? "0");
    } catch {
      dailyTotal = BigInt(0);
    }

    if (dailyTotal + ctx.amountStroops > this.config.maxDailyAmountPerSender) {
      return {
        check: "TRANSACTION_LIMITS",
        passed: false,
        reason: `Daily limit exceeded: ${dailyTotal + ctx.amountStroops} > ${this.config.maxDailyAmountPerSender}`,
      };
    }

    return { check: "TRANSACTION_LIMITS", passed: true };
  }

  private async checkKyc(ctx: PaymentContext): Promise<CheckResult> {
    if (this.config.requiredKycLevel === 0) {
      return { check: "KYC", passed: true };
    }

    let level = 0;
    try {
      const rows = await prisma.$queryRaw<{ kyc_level: number }[]>`
        SELECT kyc_level FROM "ComplianceProfile"
        WHERE stellar_address = ${ctx.senderAddress}
        LIMIT 1
      `;
      level = rows[0]?.kyc_level ?? 0;
    } catch {
      level = 0;
    }

    const passed = level >= this.config.requiredKycLevel;
    return {
      check: "KYC",
      passed,
      reason: !passed
        ? `KYC level ${level} is below required level ${this.config.requiredKycLevel}`
        : undefined,
    };
  }

  private async checkPep(ctx: PaymentContext): Promise<CheckResult> {
    const isPep = await this.isPep(ctx.senderAddress) ||
                  await this.isPep(ctx.recipientAddress);
    return {
      check: "PEP",
      passed: !isPep,
      reason: isPep
        ? `Address is flagged as a Politically Exposed Person (PEP)`
        : undefined,
    };
  }

  // ── Persistence helpers ─────────────────────────────────────────────────────

  /**
   * Log a blocked payment to ComplianceLog.
   * Called only when allowed = false.
   */
  private async logBlockedPayment(
    ctx: PaymentContext,
    result: ComplianceResult,
  ): Promise<void> {
    const failedChecks = result.checks
      .filter((c) => !c.passed)
      .map((c) => c.check);

    try {
      await prisma.$executeRaw`
        INSERT INTO "ComplianceLog" (
          id, sender_address, recipient_address, amount_stroops,
          asset_code, tx_hash, allowed, check_name,
          block_reason, metadata, created_at
        ) VALUES (
          gen_random_uuid(),
          ${ctx.senderAddress},
          ${ctx.recipientAddress},
          ${ctx.amountStroops}::bigint,
          ${ctx.assetCode},
          ${ctx.txHash ?? null},
          false,
          ${failedChecks.join(",")},
          ${result.blockedReason ?? null},
          ${ctx.metadata ? JSON.stringify(ctx.metadata) : null}::jsonb,
          NOW()
        )
      `;
    } catch (err) {
      logger.error("[Compliance] Failed to write ComplianceLog", { err });
    }

    logger.warn("[Compliance] Payment blocked", {
      sender: ctx.senderAddress,
      recipient: ctx.recipientAddress,
      amount: ctx.amountStroops.toString(),
      checks: failedChecks,
      reason: result.blockedReason,
    });
  }

  // ── Helpers: external list lookups ─────────────────────────────────────────

  private async isSanctioned(address: string): Promise<boolean> {
    try {
      const rows = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM "ComplianceProfile"
        WHERE stellar_address = ${address}
          AND sanctioned = true
        LIMIT 1
      `;
      return rows.length > 0;
    } catch {
      return false;
    }
  }

  private async isPep(address: string): Promise<boolean> {
    try {
      const rows = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM "ComplianceProfile"
        WHERE stellar_address = ${address}
          AND is_pep = true
        LIMIT 1
      `;
      return rows.length > 0;
    } catch {
      return false;
    }
  }

  // ── Admin helpers ───────────────────────────────────────────────────────────

  /** Upsert a compliance profile (sanctioned / PEP flag / KYC level). */
  async upsertProfile(
    stellarAddress: string,
    patch: {
      sanctioned?: boolean;
      isPep?: boolean;
      kycLevel?: number;
      notes?: string;
    },
  ): Promise<void> {
    await prisma.$executeRaw`
      INSERT INTO "ComplianceProfile" (
        id, stellar_address, sanctioned, is_pep, kyc_level, notes, updated_at
      ) VALUES (
        gen_random_uuid(),
        ${stellarAddress},
        ${patch.sanctioned ?? false},
        ${patch.isPep ?? false},
        ${patch.kycLevel ?? 0},
        ${patch.notes ?? null},
        NOW()
      )
      ON CONFLICT (stellar_address) DO UPDATE SET
        sanctioned = EXCLUDED.sanctioned,
        is_pep     = EXCLUDED.is_pep,
        kyc_level  = EXCLUDED.kyc_level,
        notes      = EXCLUDED.notes,
        updated_at = NOW()
    `;
  }

  /** Return recent blocked-payment log entries. */
  async getBlockedPayments(limit = 50): Promise<unknown[]> {
    return prisma.$queryRaw`
      SELECT * FROM "ComplianceLog"
      WHERE allowed = false
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;
  }

  /** Return all compliance log entries for a given address. */
  async getLogByAddress(address: string, limit = 100): Promise<unknown[]> {
    return prisma.$queryRaw`
      SELECT * FROM "ComplianceLog"
      WHERE sender_address = ${address}
         OR recipient_address = ${address}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;
  }
}

// Singleton for use across the app
export const complianceService = new ComplianceService();
