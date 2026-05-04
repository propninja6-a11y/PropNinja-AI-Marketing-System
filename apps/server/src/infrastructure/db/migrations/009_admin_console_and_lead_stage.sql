ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS stage TEXT NOT NULL DEFAULT 'NEW';

CREATE INDEX IF NOT EXISTS idx_leads_stage ON leads(stage);

CREATE TABLE IF NOT EXISTS admin_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_notifications (
  id UUID PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  status TEXT NOT NULL DEFAULT 'open',
  metadata JSONB,
  ack_by UUID REFERENCES users(id),
  ack_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_status_created
  ON admin_notifications(status, created_at DESC);
