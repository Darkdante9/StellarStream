import { Router } from "express";
import { EscrowService } from "../../services/escrow.service.js";
import validateRequest from "../../middleware/validateRequest.js";
import {
  createEscrowSchema,
  releaseEscrowSchema,
  disputeEscrowSchema,
  resolveDisputeSchema,
  escrowIdParamSchema,
} from "../../validation/escrow.js";

const router = Router();
const escrowService = new EscrowService();

// Create a new escrow agreement
router.post(
  "/escrow",
  validateRequest({ body: createEscrowSchema }),
  async (req, res, next) => {
    try {
      const escrow = await escrowService.createEscrow(req.body);
      res.status(201).json({ success: true, data: escrow });
    } catch (err) {
      next(err);
    }
  }
);

// List escrows
router.get("/escrow", async (req, res, next) => {
  try {
    const { state, address } = req.query as { state?: string; address?: string };
    const escrows = await escrowService.listEscrows({ state, address });
    res.json({ success: true, data: escrows });
  } catch (err) {
    next(err);
  }
});

// Get a single escrow
router.get(
  "/escrow/:escrowId",
  validateRequest({ params: escrowIdParamSchema }),
  async (req, res, next) => {
    try {
      const escrow = await escrowService.getEscrow(req.params.escrowId);
      if (!escrow) {
        return res.status(404).json({ success: false, error: "Escrow not found" });
      }
      res.json({ success: true, data: escrow });
    } catch (err) {
      next(err);
    }
  }
);

// Fund an escrow (record on-chain tx hash)
router.post(
  "/escrow/:escrowId/fund",
  validateRequest({ params: escrowIdParamSchema }),
  async (req, res, next) => {
    try {
      const { txHash, contractId } = req.body;
      if (!txHash || !contractId) {
        return res.status(400).json({ success: false, error: "txHash and contractId are required" });
      }
      const escrow = await escrowService.fundEscrow(req.params.escrowId, txHash, contractId);
      res.json({ success: true, data: escrow });
    } catch (err) {
      next(err);
    }
  }
);

// Release an escrow
router.post(
  "/escrow/:escrowId/release",
  validateRequest({ params: escrowIdParamSchema, body: releaseEscrowSchema }),
  async (req, res, next) => {
    try {
      const escrow = await escrowService.releaseEscrow({ escrowId: req.params.escrowId });
      res.json({ success: true, data: escrow });
    } catch (err) {
      next(err);
    }
  }
);

// Refund an escrow
router.post(
  "/escrow/:escrowId/refund",
  validateRequest({ params: escrowIdParamSchema }),
  async (req, res, next) => {
    try {
      const escrow = await escrowService.refundEscrow(req.params.escrowId);
      res.json({ success: true, data: escrow });
    } catch (err) {
      next(err);
    }
  }
);

// Cancel an escrow (only unfunded)
router.post(
  "/escrow/:escrowId/cancel",
  validateRequest({ params: escrowIdParamSchema }),
  async (req, res, next) => {
    try {
      const escrow = await escrowService.cancelEscrow(req.params.escrowId);
      res.json({ success: true, data: escrow });
    } catch (err) {
      next(err);
    }
  }
);

// Raise a dispute
router.post(
  "/escrow/:escrowId/dispute",
  validateRequest({ params: escrowIdParamSchema, body: disputeEscrowSchema }),
  async (req, res, next) => {
    try {
      const raisedBy = req.body.raisedBy || req.walletAddress || "unknown";
      const dispute = await escrowService.raiseDispute({
        escrowId: req.params.escrowId,
        reason: req.body.reason,
        raisedBy,
      });
      res.status(201).json({ success: true, data: dispute });
    } catch (err) {
      next(err);
    }
  }
);

// Get disputes
router.get("/disputes", async (req, res, next) => {
  try {
    const { escrowId } = req.query as { escrowId?: string };
    const disputes = await escrowService.getDisputes(escrowId);
    res.json({ success: true, data: disputes });
  } catch (err) {
    next(err);
  }
});

// Resolve a dispute
router.post(
  "/disputes/:disputeId/resolve",
  validateRequest({ body: resolveDisputeSchema }),
  async (req, res, next) => {
    try {
      const resolvedBy = req.body.resolvedBy || req.walletAddress || "unknown";
      const dispute = await escrowService.resolveDispute({
        disputeId: req.params.disputeId,
        resolution: req.body.resolution,
        reason: req.body.reason,
        resolvedBy,
      });
      res.json({ success: true, data: dispute });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
