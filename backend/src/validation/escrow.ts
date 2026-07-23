import { z } from "zod";

const stellarAddressSchema = z
  .string()
  .length(56, { message: "Stellar address must be exactly 56 characters" })
  .regex(/^G/, { message: "Stellar address must start with G" });

export const createEscrowSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(1000).optional(),
  tokenAddress: stellarAddressSchema,
  amount: z.string().regex(/^\d+$/, "Amount must be a positive integer string"),
  releaseConditionType: z.enum(["TIME_LOCK", "MULTI_SIG", "MILESTONE"]),
  releaseConditionData: z.record(z.unknown()),
  parties: z
    .array(
      z.object({
        address: stellarAddressSchema,
        role: z.enum(["DEPOSITOR", "RECIPIENT", "ARBITER"]),
        weight: z.number().int().min(1).default(1),
      })
    )
    .min(2, "At least 2 parties required (depositor + recipient)")
    .max(10, "Maximum 10 parties allowed"),
  expiresAt: z.string().datetime().optional(),
});

export const releaseEscrowSchema = z.object({
  escrowId: z.string().cuid(),
});

export const disputeEscrowSchema = z.object({
  escrowId: z.string().cuid(),
  reason: z.string().min(1, "Reason is required").max(2000),
});

export const resolveDisputeSchema = z.object({
  disputeId: z.string().cuid(),
  resolution: z.enum(["RELEASE", "REFUND"]),
  reason: z.string().min(1, "Reason is required").max(2000),
});

export const escrowIdParamSchema = z.object({
  escrowId: z.string().cuid(),
});

export const disputeIdParamSchema = z.object({
  disputeId: z.string().cuid(),
});
