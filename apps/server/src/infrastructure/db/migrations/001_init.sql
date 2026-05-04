CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  source TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  channel TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  trigger_event TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS calls (
  id UUID PRIMARY KEY,
  lead_id UUID REFERENCES leads(id),
  external_call_id TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  transcript TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID PRIMARY KEY,
  lead_id UUID REFERENCES leads(id),
  direction TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
