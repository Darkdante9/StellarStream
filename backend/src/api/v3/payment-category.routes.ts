import { Router, Request, Response } from "express";
import { z } from "zod";
import asyncHandler from "../../utils/asyncHandler.js";
import validateRequest from "../../middleware/validateRequest.js";
import stellarAddressSchema from "../../validation/stellar.js";
import { PaymentCategoryService } from "../../services/payment-category.service.js";

const router = Router();
const svc = new PaymentCategoryService();

// ── Validation schemas ────────────────────────────────────────────────────────

const ownerQuerySchema = z.object({
  ownerAddress: stellarAddressSchema,
});

const createCategorySchema = z.object({
  name: z.string().min(1).max(64),
  description: z.string().max(256).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Must be a valid hex color")
    .optional(),
  icon: z.string().max(64).optional(),
  ownerAddress: stellarAddressSchema,
});

const updateCategorySchema = z.object({
  name: z.string().min(1).max(64).optional(),
  description: z.string().max(256).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Must be a valid hex color")
    .optional(),
  icon: z.string().max(64).optional(),
});

const addRuleSchema = z.object({
  field: z.enum(["sender", "receiver", "tokenAddress", "amountMin", "amountMax"]),
  operator: z.enum(["equals", "contains", "startsWith", "gte", "lte"]),
  value: z.string().min(1).max(128),
  priority: z.number().int().min(0).max(1000).optional(),
});

const assignStreamSchema = z.object({
  categoryId: z.string().cuid().nullable(),
  ownerAddress: stellarAddressSchema,
});

const assignDisbursementSchema = z.object({
  categoryId: z.string().cuid().nullable(),
  ownerAddress: stellarAddressSchema,
});

const bulkAssignSchema = z.object({
  ids: z.array(z.string().cuid()).min(1).max(500),
  categoryId: z.string().cuid().nullable(),
  ownerAddress: stellarAddressSchema,
});

// ── Category CRUD ─────────────────────────────────────────────────────────────

/**
 * GET /api/v3/categories
 * List all categories for an owner address.
 */
router.get(
  "/categories",
  validateRequest({ query: ownerQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { ownerAddress } = req.query as { ownerAddress: string };
    const categories = await svc.getCategories(ownerAddress);
    res.json({ success: true, data: categories });
  }),
);

/**
 * POST /api/v3/categories
 * Create a new payment category.
 */
router.post(
  "/categories",
  validateRequest({ body: createCategorySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const category = await svc.createCategory(req.body);
    res.status(201).json({ success: true, data: category });
  }),
);

/**
 * GET /api/v3/categories/:id
 * Get a single category (must belong to ownerAddress).
 */
router.get(
  "/categories/:id",
  validateRequest({ query: ownerQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { ownerAddress } = req.query as { ownerAddress: string };
    const category = await svc.getCategory(req.params.id, ownerAddress);
    res.json({ success: true, data: category });
  }),
);

/**
 * PATCH /api/v3/categories/:id
 * Update a category's metadata.
 */
router.patch(
  "/categories/:id",
  validateRequest({ body: updateCategorySchema, query: ownerQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { ownerAddress } = req.query as { ownerAddress: string };
    const category = await svc.updateCategory(req.params.id, ownerAddress, req.body);
    res.json({ success: true, data: category });
  }),
);

/**
 * DELETE /api/v3/categories/:id
 * Delete a category (streams/disbursements will have categoryId set to null).
 */
router.delete(
  "/categories/:id",
  validateRequest({ query: ownerQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { ownerAddress } = req.query as { ownerAddress: string };
    await svc.deleteCategory(req.params.id, ownerAddress);
    res.json({ success: true, message: "Category deleted" });
  }),
);

// ── Auto-categorization rules ─────────────────────────────────────────────────

/**
 * POST /api/v3/categories/:id/rules
 * Add an auto-categorization rule to a category.
 */
router.post(
  "/categories/:id/rules",
  validateRequest({ body: addRuleSchema, query: ownerQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { ownerAddress } = req.query as { ownerAddress: string };
    const rule = await svc.addRule(req.params.id, ownerAddress, req.body);
    res.status(201).json({ success: true, data: rule });
  }),
);

/**
 * DELETE /api/v3/categories/rules/:ruleId
 * Delete a specific auto-categorization rule.
 */
router.delete(
  "/categories/rules/:ruleId",
  validateRequest({ query: ownerQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { ownerAddress } = req.query as { ownerAddress: string };
    await svc.deleteRule(req.params.ruleId, ownerAddress);
    res.json({ success: true, message: "Rule deleted" });
  }),
);

// ── Manual assignment ─────────────────────────────────────────────────────────

/**
 * PATCH /api/v3/streams/:streamId/category
 * Assign (or unassign) a category to a stream.
 */
router.patch(
  "/streams/:streamId/category",
  validateRequest({ body: assignStreamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { categoryId, ownerAddress } = req.body;
    const stream = await svc.assignStreamCategory(req.params.streamId, categoryId, ownerAddress);
    res.json({ success: true, data: stream });
  }),
);

/**
 * PATCH /api/v3/disbursements/:disbursementId/category
 * Assign (or unassign) a category to a disbursement.
 */
router.patch(
  "/disbursements/:disbursementId/category",
  validateRequest({ body: assignDisbursementSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { categoryId, ownerAddress } = req.body;
    const disbursement = await svc.assignDisbursementCategory(
      req.params.disbursementId,
      categoryId,
      ownerAddress,
    );
    res.json({ success: true, data: disbursement });
  }),
);

// ── Bulk categorization ───────────────────────────────────────────────────────

/**
 * POST /api/v3/streams/bulk-categorize
 * Assign a category to multiple streams at once.
 */
router.post(
  "/streams/bulk-categorize",
  validateRequest({ body: bulkAssignSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { ids, categoryId, ownerAddress } = req.body;
    const result = await svc.bulkAssignStreams(ids, categoryId, ownerAddress);
    res.json({ success: true, data: result });
  }),
);

/**
 * POST /api/v3/disbursements/bulk-categorize
 * Assign a category to multiple disbursements at once.
 */
router.post(
  "/disbursements/bulk-categorize",
  validateRequest({ body: bulkAssignSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { ids, categoryId, ownerAddress } = req.body;
    const result = await svc.bulkAssignDisbursements(ids, categoryId, ownerAddress);
    res.json({ success: true, data: result });
  }),
);

/**
 * POST /api/v3/streams/:streamId/auto-categorize
 * Apply saved auto-categorization rules to a single stream.
 */
router.post(
  "/streams/:streamId/auto-categorize",
  asyncHandler(async (req: Request, res: Response) => {
    const appliedId = await svc.autoApplyRules(req.params.streamId);
    res.json({
      success: true,
      data: { categoryId: appliedId, applied: appliedId !== null },
    });
  }),
);

// ── Reports ───────────────────────────────────────────────────────────────────

/**
 * GET /api/v3/categories/report
 * Aggregated payment counts and amounts grouped by category.
 */
router.get(
  "/categories/report",
  validateRequest({ query: ownerQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { ownerAddress } = req.query as { ownerAddress: string };
    const report = await svc.getCategoryReport(ownerAddress);
    res.json({ success: true, data: report });
  }),
);

/**
 * GET /api/v3/categories/export
 * Export all categories and rules as JSON.
 */
router.get(
  "/categories/export",
  validateRequest({ query: ownerQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { ownerAddress } = req.query as { ownerAddress: string };
    const data = await svc.exportCategories(ownerAddress);
    res.setHeader("Content-Disposition", "attachment; filename=categories.json");
    res.setHeader("Content-Type", "application/json");
    res.json({ success: true, data });
  }),
);

export default router;
