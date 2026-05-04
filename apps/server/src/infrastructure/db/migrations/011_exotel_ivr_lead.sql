ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS ivr_outcome TEXT,
  ADD COLUMN IF NOT EXISTS ivr_digits TEXT,
  ADD COLUMN IF NOT EXISTS ivr_last_call_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_leads_ivr_outcome ON leads (ivr_outcome)
  WHERE ivr_outcome IS NOT NULL;
