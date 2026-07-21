-- Migration: Payment Categories Feature
-- Adds category management, auto-categorization rules, and category assignments

-- Main categories table
CREATE TABLE IF NOT EXISTS "PaymentCategory" (
  "id"          TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "name"        TEXT NOT NULL,
  "description" TEXT,
  "color"       TEXT NOT NULL DEFAULT '#6366f1', -- hex color for UI
  "icon"        TEXT,                             -- optional icon identifier
  "ownerAddress" TEXT NOT NULL,                  -- Stellar address of the creator
  "isDefault"   BOOLEAN NOT NULL DEFAULT false,  -- system-level default categories
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "PaymentCategory_ownerAddress_name_key"
  ON "PaymentCategory"("ownerAddress", "name");

CREATE INDEX IF NOT EXISTS "PaymentCategory_ownerAddress_idx"
  ON "PaymentCategory"("ownerAddress");

-- Auto-categorization rules
CREATE TABLE IF NOT EXISTS "PaymentCategoryRule" (
  "id"          TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "categoryId"  TEXT NOT NULL REFERENCES "PaymentCategory"("id") ON DELETE CASCADE,
  "field"       TEXT NOT NULL,  -- 'sender' | 'receiver' | 'tokenAddress' | 'amountMin' | 'amountMax'
  "operator"    TEXT NOT NULL,  -- 'equals' | 'contains' | 'startsWith' | 'gte' | 'lte'
  "value"       TEXT NOT NULL,
  "priority"    INTEGER NOT NULL DEFAULT 0,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "PaymentCategoryRule_categoryId_idx"
  ON "PaymentCategoryRule"("categoryId");

-- Category assignments for streams
ALTER TABLE "Stream"
  ADD COLUMN IF NOT EXISTS "categoryId" TEXT REFERENCES "PaymentCategory"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "Stream_categoryId_idx"
  ON "Stream"("categoryId");

-- Category assignments for disbursements
ALTER TABLE "Disbursement"
  ADD COLUMN IF NOT EXISTS "categoryId" TEXT REFERENCES "PaymentCategory"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "Disbursement_categoryId_idx"
  ON "Disbursement"("categoryId");
