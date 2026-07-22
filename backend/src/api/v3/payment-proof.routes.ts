import { Router, Request, Response } from "express";
import { z } from "zod";
import asyncHandler from "../../utils/asyncHandler.js";
import { PaymentProofService } from "../../services/payment-proof.service.js";

const router = Router();
const paymentProofService = new PaymentProofService();

const proofSchema = z.object({
  id: z.string().min(1),
  txHash: z.string().min(1),
  amount: z.string().min(1),
  recipientAddress: z.string().min(1),
  senderAddress: z.string().min(1),
  asset: z.string().min(1),
  createdAt: z.string().min(1),
});

const verifySchema = z.object({
  proofId: z.string().min(1),
});

router.post(
  "/public/payments/proofs",
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = proofSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: "Invalid payment proof payload" });
    }

    const proof = await paymentProofService.createProof(parsed.data);
    return res.status(201).json({ success: true, data: proof });
  }),
);

router.post(
  "/public/payments/proofs/batch",
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = z.array(proofSchema).safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: "Invalid batch payment proof payload" });
    }

    const proofs = await paymentProofService.createBatchProofs(parsed.data);
    return res.status(201).json({ success: true, data: proofs });
  }),
);

router.post(
  "/public/payments/proofs/verify",
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = verifySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: "proofId is required" });
    }

    const result = await paymentProofService.verifyProof(parsed.data.proofId);
    return res.json({ success: true, data: result });
  }),
);

router.get(
  "/public/payments/proofs/:proofId/verify",
  asyncHandler(async (req: Request, res: Response) => {
    const result = await paymentProofService.verifyProof(req.params.proofId);
    return res.json({ success: true, data: result });
  }),
);

export default router;
