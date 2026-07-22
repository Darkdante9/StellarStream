-- Migration: Payment Metadata System (#1385)
-- Adds flexible key-value metadata for streams, disbursements, and categories,
-- with support for search and category-level inheritance.

-- Main metadata table
CREATE TABLE IF NOT EXISTS "PaymentMetadata" (
  "id"           TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "entityType"   TEXT NOT NULL,  -- 'stream' | 'disbursement' | 'category'
  "entityId"     TEXT NOT NULL,
  "key"          TEXT NOT NULL,
  "value"        TEXT NOT NULL,
  "ownerAddress" TEXT NOT NULL,  -- Stellar address of the creator (scoping + search)
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- One value per key per entity
CREATE UNIQUE INDEX IF NOT EXISTS "PaymentMetadata_entityType_entityId_key_key"
  ON "PaymentMetadata"("entityType", "entityId", "key");

CREATE INDEX IF NOT EXISTS "PaymentMetadata_ownerAddress_idx"
  ON "PaymentMetadata"("ownerAddress");

CREATE INDEX IF NOT EXISTS "PaymentMetadata_entityType_entityId_idx"
  ON "PaymentMetadata"("entityType", "entityId");

CREATE INDEX IF NOT EXISTS "PaymentMetadata_key_idx"
  ON "PaymentMetadata"("key");

-- Supports search-by-metadata (owner + key + value)
CREATE INDEX IF NOT EXISTS "PaymentMetadata_ownerAddress_key_value_idx"
  ON "PaymentMetadata"("ownerAddress", "key", "value");
