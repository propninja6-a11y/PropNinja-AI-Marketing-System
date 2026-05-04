CREATE TABLE IF NOT EXISTS failed_jobs (
  id UUID PRIMARY KEY,
  queue_name TEXT NOT NULL,
  job_name TEXT NOT NULL,
  payload JSONB NOT NULL,
  reason TEXT NOT NULL,
  attempts INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY,
  provider TEXT NOT NULL,
  event_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (provider, event_id)
);

CREATE TABLE IF NOT EXISTS workflow_definitions (
  id UUID PRIMARY KEY,
  trigger_event TEXT NOT NULL UNIQUE,
  steps JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS metrics_events (
  id UUID PRIMARY KEY,
  event_type TEXT NOT NULL,
  value NUMERIC,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Admin', 'Sales', 'Manager')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO workflow_definitions (id, trigger_event, steps, is_active)
VALUES
  (uuid_generate_v4(), 'LEAD_CREATED', '[{"type":"whatsapp","template":"intro"},{"type":"condition","check":"lead_score > 80"},{"type":"call"}]'::jsonb, TRUE),
  (uuid_generate_v4(), 'LEAD_CREATED_HOT', '[{"type":"call"},{"type":"whatsapp","template":"intro"}]'::jsonb, TRUE),
  (uuid_generate_v4(), 'CALL_COMPLETED', '[{"type":"whatsapp","template":"followup"}]'::jsonb, TRUE)
ON CONFLICT (trigger_event) DO NOTHING;
