CREATE TABLE IF NOT EXISTS prospects (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  location TEXT,
  budget NUMERIC,
  source TEXT NOT NULL DEFAULT 'upload',
  campaign TEXT,
  channels TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  campaigns TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  outreach_status TEXT NOT NULL DEFAULT 'pending',
  promoted_lead_id UUID REFERENCES leads(id),
  promoted_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_prospects_phone_open
  ON prospects (phone)
  WHERE promoted_lead_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_prospects_promoted ON prospects (promoted_lead_id);
CREATE INDEX IF NOT EXISTS idx_prospects_created ON prospects (created_at DESC);

ALTER TABLE calls ADD COLUMN IF NOT EXISTS prospect_id UUID REFERENCES prospects(id);
CREATE INDEX IF NOT EXISTS idx_calls_prospect_id ON calls (prospect_id);
CREATE INDEX IF NOT EXISTS idx_calls_external_call_id ON calls (external_call_id);

ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS prospect_id UUID REFERENCES prospects(id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_prospect ON whatsapp_messages (prospect_id);
