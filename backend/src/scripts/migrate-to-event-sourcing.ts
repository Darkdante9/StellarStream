#!/usr/bin/env tsx

import { StreamMigrationService } from "../services/stream-migration.service.js";
import { HashChainVerificationService } from "../services/hash-chain-verification.service.js";
import { logger } from "../logger.js";

async function main() {
  logger.info("Starting event sourcing migration");

  try {
    const migrationService = new StreamMigrationService();
    const verificationService = new HashChainVerificationService();

    // Step 1: Migrate existing streams
    logger.info("Step 1: Migrating existing streams to event sourcing");
    await migrationService.migrateExistingStreams();

    // Step 2: Migrate existing audit logs
    logger.info("Step 2: Migrating existing audit logs to event sourcing");
    await migrationService.migrateAuditLogs();

    // Step 3: Verify the event chain integrity
    logger.info("Step 3: Verifying event chain integrity");
    const verificationResult = await verificationService.verifyEventChain();

    if (verificationResult.isValid) {
      logger.info("✅ Event sourcing migration completed successfully", {
        totalEvents: verificationResult.totalEvents,
      });
    } else {
      logger.error("❌ Event chain verification failed after migration", {
        totalEvents: verificationResult.totalEvents,
        errors: verificationResult.errors,
      });
      process.exit(1);
    }
  } catch (error) {
    logger.error("Event sourcing migration failed", error);
    process.exit(1);
  }
}

// Only run if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    logger.error("Migration script error", error);
    process.exit(1);
  });
}

export { main as runEventSourcingMigration };
