import { PrismaClient } from "@prisma/client";
import { logger } from "../logger.js";

const prisma = new PrismaClient();

export interface CreateEscrowInput {
  title: string;
  description?: string;
  tokenAddress: string;
  amount: string;
  releaseConditionType: "TIME_LOCK" | "MULTI_SIG" | "MILESTONE";
  releaseConditionData: Record<string, unknown>;
  parties: {
    address: string;
    role: "DEPOSITOR" | "RECIPIENT" | "ARBITER";
    weight: number;
  }[];
  expiresAt?: string;
}

export interface ReleaseEscrowInput {
  escrowId: string;
}

export interface DisputeEscrowInput {
  escrowId: string;
  reason: string;
  raisedBy: string;
}

export interface ResolveDisputeInput {
  disputeId: string;
  resolution: "RELEASE" | "REFUND";
  reason: string;
  resolvedBy: string;
}

export class EscrowService {
  async createEscrow(input: CreateEscrowInput) {
    const { title, description, tokenAddress, amount, releaseConditionType, releaseConditionData, parties, expiresAt } = input;

    const escrow = await prisma.escrow.create({
      data: {
        title,
        description,
        tokenAddress,
        amount: BigInt(amount),
        releaseConditionType,
        releaseConditionData: JSON.stringify(releaseConditionData),
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        parties: {
          create: parties.map((p) => ({
            address: p.address,
            role: p.role,
            weight: p.weight,
          })),
        },
      },
      include: {
        parties: true,
        disputes: true,
      },
    });

    logger.info(`[Escrow] Created escrow ${escrow.id}`);
    return escrow;
  }

  async getEscrow(escrowId: string) {
    return prisma.escrow.findUnique({
      where: { id: escrowId },
      include: {
        parties: true,
        disputes: true,
      },
    });
  }

  async listEscrows(filters?: { state?: string; address?: string }) {
    const where: Record<string, unknown> = {};

    if (filters?.state) {
      where.state = filters.state;
    }

    if (filters?.address) {
      where.parties = {
        some: { address: filters.address },
      };
    }

    return prisma.escrow.findMany({
      where,
      include: {
        parties: true,
        disputes: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async fundEscrow(escrowId: string, txHash: string, contractId: string) {
    const escrow = await prisma.escrow.findUnique({ where: { id: escrowId } });
    if (!escrow) {
      throw new Error("Escrow not found");
    }
    if (escrow.state !== "PENDING_FUNDING") {
      throw new Error("Escrow is not in PENDING_FUNDING state");
    }

    return prisma.escrow.update({
      where: { id: escrowId },
      data: {
        state: "ACTIVE",
        txHash,
        contractId,
      },
      include: {
        parties: true,
        disputes: true,
      },
    });
  }

  async releaseEscrow(input: ReleaseEscrowInput) {
    const { escrowId } = input;

    const escrow = await prisma.escrow.findUnique({
      where: { id: escrowId },
      include: { parties: true },
    });

    if (!escrow) {
      throw new Error("Escrow not found");
    }
    if (escrow.state !== "ACTIVE") {
      throw new Error("Escrow must be in ACTIVE state to release");
    }

    return prisma.escrow.update({
      where: { id: escrowId },
      data: { state: "RELEASED" },
      include: {
        parties: true,
        disputes: true,
      },
    });
  }

  async refundEscrow(escrowId: string) {
    const escrow = await prisma.escrow.findUnique({ where: { id: escrowId } });
    if (!escrow) {
      throw new Error("Escrow not found");
    }
    if (escrow.state !== "ACTIVE" && escrow.state !== "DISPUTED") {
      throw new Error("Escrow must be in ACTIVE or DISPUTED state to refund");
    }

    return prisma.escrow.update({
      where: { id: escrowId },
      data: { state: "REFUNDED" },
      include: {
        parties: true,
        disputes: true,
      },
    });
  }

  async cancelEscrow(escrowId: string) {
    const escrow = await prisma.escrow.findUnique({ where: { id: escrowId } });
    if (!escrow) {
      throw new Error("Escrow not found");
    }
    if (escrow.state !== "PENDING_FUNDING") {
      throw new Error("Only unfunded escrows can be cancelled");
    }

    return prisma.escrow.update({
      where: { id: escrowId },
      data: { state: "CANCELLED" },
      include: {
        parties: true,
        disputes: true,
      },
    });
  }

  async raiseDispute(input: DisputeEscrowInput) {
    const { escrowId, reason, raisedBy } = input;

    const escrow = await prisma.escrow.findUnique({ where: { id: escrowId } });
    if (!escrow) {
      throw new Error("Escrow not found");
    }
    if (escrow.state !== "ACTIVE") {
      throw new Error("Only active escrows can be disputed");
    }

    const dispute = await prisma.escrowDispute.create({
      data: {
        escrowId,
        raisedBy,
        reason,
      },
    });

    await prisma.escrow.update({
      where: { id: escrowId },
      data: { state: "DISPUTED" },
    });

    logger.info(`[Escrow] Dispute raised on escrow ${escrowId}: ${reason}`);
    return dispute;
  }

  async resolveDispute(input: ResolveDisputeInput) {
    const { disputeId, resolution, reason, resolvedBy } = input;

    const dispute = await prisma.escrowDispute.findUnique({
      where: { id: disputeId },
    });

    if (!dispute) {
      throw new Error("Dispute not found");
    }
    if (dispute.resolution) {
      throw new Error("Dispute already resolved");
    }

    const updated = await prisma.escrowDispute.update({
      where: { id: disputeId },
      data: {
        resolution: reason,
        resolvedBy,
        resolvedAt: new Date(),
      },
    });

    const newState = resolution === "RELEASE" ? "RELEASED" : "REFUNDED";

    await prisma.escrow.update({
      where: { id: dispute.escrowId },
      data: { state: newState },
    });

    logger.info(`[Escrow] Dispute ${disputeId} resolved: ${resolution}`);
    return updated;
  }

  async getDisputes(escrowId?: string) {
    const where: Record<string, unknown> = {};
    if (escrowId) {
      where.escrowId = escrowId;
    }

    return prisma.escrowDispute.findMany({
      where,
      include: { escrow: true },
      orderBy: { createdAt: "desc" },
    });
  }
}
