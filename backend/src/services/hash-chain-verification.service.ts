import { prisma } from "../lib/db.js";
import { computeEventHash } from "../lib/event-hash-chain.js";
import { logger } from "../logger.js";

export interface VerificationResult {
  isValid: boolean;
  totalEvents: number;
  errors: string[];
}

export class HashChainVerificationService {
  /**
   * Verify the integrity of the entire event chain
   */
  async verifyEventChain(): Promise<VerificationResult> {
    try {
      const events = await prisma.event.findMany({
        orderBy: { timestamp: "asc" },
        select: {
          eventId: true,
          streamId: true,
          eventType: true,
          payload: true,
          timestamp: true,
          hash: true,
          previousHash: true,
        },
      });

      const errors: string[] = [];
      let previousHash: string | null = null;

      for (const event of events) {
        // Verify the previous hash chain
        if (event.previousHash !== previousHash) {
          errors.push(
            `Hash chain broken at event ${event.eventId}: expected previousHash ${previousHash}, got ${event.previousHash}`,
          );
        }

        // Recompute the hash and verify it matches
        const expectedHash = computeEventHash({
          eventId: event.eventId,
          streamId: event.streamId,
          eventType: event.eventType,
          payload: event.payload as Record<string, unknown>,
          timestamp: event.timestamp.toISOString(),
          previousHash: event.previousHash,
        });

        if (expectedHash !== event.hash) {
          errors.push(
            `Hash mismatch at event ${event.eventId}: expected ${expectedHash}, got ${event.hash}`,
          );
        }

        previousHash = event.hash;
      }

      const result: VerificationResult = {
        isValid: errors.length === 0,
        totalEvents: events.length,
        errors,
      };

      if (result.isValid) {
        logger.info("Event chain verification successful", {
          totalEvents: result.totalEvents,
        });
      } else {
        logger.warn("Event chain verification failed", {
          totalEvents: result.totalEvents,
          errorCount: errors.length,
        });
      }

      return result;
    } catch (error) {
      logger.error("Event chain verification error", error);
      throw error;
    }
  }

  /**
   * Verify a specific range of events in the chain
   */
  async verifyEventRange(startEventId: string, endEventId: string): Promise<VerificationResult> {
    try {
      const events = await prisma.event.findMany({
        where: {
          AND: [
            { eventId: { gte: startEventId } },
            { eventId: { lte: endEventId } },
          ],
        },
        orderBy: { timestamp: "asc" },
      });

      if (events.length === 0) {
        return {
          isValid: true,
          totalEvents: 0,
          errors: [],
        };
      }

      const errors: string[] = [];

      // Get the previous hash for the first event in range
      let previousHash: string | null = null;
      if (events.length > 0) {
        const beforeFirst = await prisma.event.findFirst({
          where: {
            timestamp: { lt: events[0].timestamp },
          },
          orderBy: { timestamp: "desc" },
          select: { hash: true },
        });
        previousHash = beforeFirst?.hash || null;
      }

      for (const event of events) {
        if (event.previousHash !== previousHash) {
          errors.push(
            `Hash chain broken at event ${event.eventId}: expected previousHash ${previousHash}, got ${event.previousHash}`,
          );
        }

        const expectedHash = computeEventHash({
          eventId: event.eventId,
          streamId: event.streamId,
          eventType: event.eventType,
          payload: event.payload as Record<string, unknown>,
          timestamp: event.timestamp.toISOString(),
          previousHash: event.previousHash,
        });

        if (expectedHash !== event.hash) {
          errors.push(
            `Hash mismatch at event ${event.eventId}: expected ${expectedHash}, got ${event.hash}`,
          );
        }

        previousHash = event.hash;
      }

      return {
        isValid: errors.length === 0,
        totalEvents: events.length,
        errors,
      };
    } catch (error) {
      logger.error("Event range verification error", error);
      throw error;
    }
  }
}
