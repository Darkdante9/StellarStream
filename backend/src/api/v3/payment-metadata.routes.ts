import { Router, Request, Response } from "express";
import { z } from "zod";
import asyncHandler from "../../utils/asyncHandler.js";
import validateRequest from "../../middleware/validateRequest.js";
import stellarAddressSchema from "../../validation/stellar.js";
import {
  PaymentMetadataService,
  MAX_VALUE_LENGTH,
  MAX_PAIRS_PER_ENTITY,
  type MetadataEntityType,
} from "../../services/payment-metadata.service.js";

const router = Router();
const svc = new PaymentMetadataService();

// ── Validation schemas ────────────────────────────────────────────────────────

const entityTypeSchema = z.enum(["stream", "disbursement", "category"]);

const keySchema = z
  .string()
  .regex(/^[a-zA-Z0-9_.-]{1,64}$/, "Key must be 1–64 chars of [a-zA-Z0-9_.-]");

const valueSchema = z.string().max(MAX_VALUE_LENGTH);

const pairsSchema = z
  .array(z.object({ key: keySchema, value: valueSchema }))
  .min(1)
  .max(MAX_PAIRS_PER_ENTITY);

const entityParamsSchema = z.object({
  entityType: entityTypeSchema,
  entityId: z.string().min(1).max(128),
});

const entityKeyParamsSchema = entityParamsSchema.extend({
  key: keySchema,
});

const setMetadataBodySchema = z.object({
  pairs: pairsSchema,
  ownerAddress: stellarAddressSchema,
});

const searchQuerySchema = z.object({
  ownerAddress: stellarAddressSchema,
  key: keySchema.optional(),
  value: z.string().max(MAX_VALUE_LENGTH).optional(),
  entityType: entityTypeSchema.optional(),
});

const bulkBodySchema = z.object({
  entityType: entityTypeSchema,
  ids: z.array(z.string().min(1).max(128)).min(1).max(500),
  pairs: pairsSchema,
  ownerAddress: stellarAddressSchema,
});

// ── Search ────────────────────────────────────────────────────────────────────
// NOTE: declared before the parameterized `/metadata/:entityType/...` routes so
// the literal `/metadata/search` path is matched first.

/**
 * GET /api/v3/metadata/search
 * Search an owner's metadata by optional key / value / entityType.
 */
router.get(
  "/metadata/search",
  validateRequest({ query: searchQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { ownerAddress, key, value, entityType } = req.query as {
      ownerAddress: string;
      key?: string;
      value?: string;
      entityType?: MetadataEntityType;
    };
    const results = await svc.searchByMetadata(ownerAddress, {
      key,
      value,
      entityType,
    });
    res.json({ success: true, data: results });
  }),
);

// ── Bulk metadata updates ─────────────────────────────────────────────────────

/**
 * POST /api/v3/metadata/bulk
 * Apply the same key-value pairs to many entities at once.
 */
router.post(
  "/metadata/bulk",
  validateRequest({ body: bulkBodySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { entityType, ids, pairs, ownerAddress } = req.body;
    const result = await svc.bulkUpsert(entityType, ids, pairs, ownerAddress);
    res.json({ success: true, data: result });
  }),
);

// ── Per-entity CRUD ───────────────────────────────────────────────────────────

/**
 * GET /api/v3/metadata/:entityType/:entityId/resolved
 * List resolved metadata (category-inherited pairs overlaid with own pairs).
 */
router.get(
  "/metadata/:entityType/:entityId/resolved",
  validateRequest({ params: entityParamsSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { entityType, entityId } = req.params as unknown as {
      entityType: MetadataEntityType;
      entityId: string;
    };
    const data = await svc.getResolvedMetadata(entityType, entityId);
    res.json({ success: true, data });
  }),
);

/**
 * GET /api/v3/metadata/:entityType/:entityId
 * List raw metadata for an entity (no inheritance).
 */
router.get(
  "/metadata/:entityType/:entityId",
  validateRequest({ params: entityParamsSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { entityType, entityId } = req.params as unknown as {
      entityType: MetadataEntityType;
      entityId: string;
    };
    const data = await svc.getMetadata(entityType, entityId);
    res.json({ success: true, data });
  }),
);

/**
 * PUT /api/v3/metadata/:entityType/:entityId
 * Set (merge-upsert) a set of key-value pairs on an entity.
 */
router.put(
  "/metadata/:entityType/:entityId",
  validateRequest({ params: entityParamsSchema, body: setMetadataBodySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { entityType, entityId } = req.params as unknown as {
      entityType: MetadataEntityType;
      entityId: string;
    };
    const { pairs, ownerAddress } = req.body;
    const data = await svc.setMetadataBulk(entityType, entityId, pairs, ownerAddress);
    res.json({ success: true, data });
  }),
);

/**
 * DELETE /api/v3/metadata/:entityType/:entityId/:key
 * Delete a single metadata key from an entity.
 */
router.delete(
  "/metadata/:entityType/:entityId/:key",
  validateRequest({ params: entityKeyParamsSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { entityType, entityId, key } = req.params as unknown as {
      entityType: MetadataEntityType;
      entityId: string;
      key: string;
    };
    await svc.deleteMetadata(entityType, entityId, key);
    res.json({ success: true, message: "Metadata key deleted" });
  }),
);

export default router;
