-- Migration: add_compliance_tables
-- Adds ComplianceProfile and ComplianceLog tables for automated compliance checks.

-- ── ComplianceProfile ─────────────────────────────────────────────────────────
-- Stores per-address compliance state: sanctions flag, PEP flag, KYC level.
CREATE TABLE IF NOT EXISTS "ComplianceProfile" (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  stellar_address  VARCHAR(58) NOT NULL UNIQUE,
  sanctioned       BOOLEAN     NOT NULL DEFAULT false,
  is_pep           BOOLEAN     NOT NULL DEFAULT false,
  kyc_level        INTEGER     NOT NULL DEFAULT 0,  -- 0=none, 1=basic, 2=full
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_profile_address  ON "ComplianceProfile" (stellar_address);
CREATE INDEX IF NOT EXISTS idx_compliance_profile_sanction ON "ComplianceProfile" (sanctioned) WHERE sanctioned = true;
CREATE INDEX IF NOT EXISTS idx_compliance_profile_pep      ON "ComplianceProfile" (is_pep) WHERE is_pep = true;

-- ── ComplianceLog ─────────────────────────────────────────────────────────────
-- Immutable append-only log of every compliance check result.
-- Blocked payments (allowed = false) are always written here.
CREATE TABLE IF NOT EXISTS "ComplianceLog" (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_address    VARCHAR(58) NOT NULL,
  recipient_address VARCHAR(58) NOT NULL,
  amount_stroops    BIGINT      NOT NULL,
  asset_code        VARCHAR(12) NOT NULL,
  tx_hash           VARCHAR(128),
  allowed           BOOLEAN     NOT NULL DEFAULT true,
  check_name        TEXT        NOT NULL,  -- comma-separated list of failed checks
  block_reason      TEXT,
  metadata          JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_log_sender    ON "ComplianceLog" (sender_address);
CREATE INDEX IF NOT EXISTS idx_compliance_log_recipient ON "ComplianceLog" (recipient_address);
CREATE INDEX IF NOT EXISTS idx_compliance_log_blocked   ON "ComplianceLog" (allowed) WHERE allowed = false;
CREATE INDEX IF NOT EXISTS idx_compliance_log_created   ON "ComplianceLog" (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_compliance_log_tx_hash   ON "ComplianceLog" (tx_hash) WHERE tx_hash IS NOT NULL;
