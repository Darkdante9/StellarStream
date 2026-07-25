-- Add ForecastReport table for ML-based payment forecasting
CREATE TABLE IF NOT EXISTS "ForecastReport" (
  id TEXT PRIMARY KEY,
  "weekStart" DATE NOT NULL,
  "weekEnd" DATE NOT NULL,
  report JSONB NOT NULL,
  "generatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "ForecastReport_weekStart_weekEnd_idx" ON "ForecastReport"("weekStart", "weekEnd");
CREATE INDEX IF NOT EXISTS "ForecastReport_generatedAt_idx" ON "ForecastReport"("generatedAt" DESC);

COMMENT ON TABLE "ForecastReport" IS 'Stores weekly ML-based payment forecasting reports';

