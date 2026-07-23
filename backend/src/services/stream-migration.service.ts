import { prisma } from "../lib/db.js";
import { EventSourceService } from "../services/event-source.service.js";
import { logger } from "../logger.js";

export class StreamMigrationService {
  private eventSourceService: EventSourceService;

  constructor() {
    this.eventSourceService = new EventSourceService();
  }

  /**
   * Migrate existing streams to event sourcing format
   */
  async migrateExistingStreams(): Promise<void> {
    try {
      logger.info("Starting stream migration to event sourcing");

      // Get all existing streams
      const streams = await prisma.stream.findMany({
        orderBy: { createdAt: "asc" },
      });

      logger.info(`Found ${streams.length} streams to migrate`);

      for (const stream of streams) {
        try {
          // Create a CREATE event for each existing stream
          await this.eventSourceService.appendEvent({
            streamId: stream.streamId || stream.id,
            eventType: "CREATE",
            payload: {
              id: stream.id,
              streamId: stream.streamId,
              txHash: stream.txHash,
              version: stream.version,
              sender: stream.sender,
              receiver: stream.receiver,
              contractId: stream.contractId,
              tokenAddress: stream.tokenAddress,
              amount: stream.amount,
              duration: stream.duration,
              status: stream.status,
              withdrawn: stream.withdrawn,
              legacy: stream.legacy,
              migrated: stream.migrated,
              isPrivate: stream.isPrivate,
              yieldEnabled: stream.yieldEnabled,
              vaultContractId: stream.vaultContractId,
              vaultShareBalance: stream.vaultShareBalance,
              vaultRatioScale: stream.vaultRatioScale,
              accruedInterest: stream.accruedInterest,
              lastYieldAccrualAt: stream.lastYieldAccrualAt?.toISOString(),
              isDust: stream.isDust,
              affiliateId: stream.affiliateId,
            },
            timestamp: stream.createdAt,
          });

          // If the stream is not active, create appropriate status change events
          if (stream.status !== "ACTIVE") {
            await this.eventSourceService.appendEvent({
              streamId: stream.streamId || stream.id,
              eventType: stream.status,
              payload: {
                status: stream.status,
                reason: "Migrated from existing data",
              },
              timestamp: stream.createdAt,
            });
          }

          // If there have been withdrawals, create WITHDRAW events
          if (stream.withdrawn && stream.withdrawn !== "0") {
            await this.eventSourceService.appendEvent({
              streamId: stream.streamId || stream.id,
              eventType: "WITHDRAW",
              payload: {
                amount: stream.withdrawn,
                totalWithdrawn: stream.withdrawn,
                reason: "Migrated from existing data",
              },
              timestamp: stream.createdAt,
            });
          }

          logger.info(`Migrated stream ${stream.streamId || stream.id}`);
        } catch (error) {
          logger.error(`Failed to migrate stream ${stream.streamId || stream.id}`, error);
        }
      }

      logger.info("Stream migration to event sourcing completed");
    } catch (error) {
      logger.error("Stream migration failed", error);
      throw error;
    }
  }

  /**
   * Migrate existing EventLog entries to the new event sourcing format
   */
  async migrateAuditLogs(): Promise<void> {
    try {
      logger.info("Starting audit log migration to event sourcing");

      // Get all existing event logs
      const eventLogs = await prisma.eventLog.findMany({
        orderBy: { createdAt: "asc" },
      });

      logger.info(`Found ${eventLogs.length} audit log entries to migrate`);

      for (const log of eventLogs) {
        try {
          const metadata = log.metadata ? JSON.parse(log.metadata as string) : {};

          await this.eventSourceService.appendEvent({
            streamId: log.streamId,
            eventType: log.eventType.toUpperCase(),
            payload: {
              txHash: log.txHash,
              eventIndex: log.eventIndex,
              ledger: log.ledger,
              ledgerClosedAt: log.ledgerClosedAt,
              sender: log.sender,
              receiver: log.receiver,
              amount: log.amount?.toString(),
              ...metadata,
            },
            timestamp: log.createdAt,
          });

          logger.debug(`Migrated audit log entry ${log.id}`);
        } catch (error) {
          logger.error(`Failed to migrate audit log entry ${log.id}`, error);
        }
      }

      logger.info("Audit log migration to event sourcing completed");
    } catch (error) {
      logger.error("Audit log migration failed", error);
      throw error;
    }
  }
}
