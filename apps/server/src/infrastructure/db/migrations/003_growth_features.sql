CREATE TABLE IF NOT EXISTS campaign_builders (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  trigger_event TEXT NOT NULL UNIQUE,
  steps JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lead_assignments (
  id UUID PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES leads(id),
  user_id UUID NOT NULL REFERENCES users(id),
  strategy TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS assignment_state (
  id TEXT PRIMARY KEY,
  value INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO assignment_state (id, value)
VALUES ('round_robin_index', 0)
ON CONFLICT (id) DO NOTHING;
