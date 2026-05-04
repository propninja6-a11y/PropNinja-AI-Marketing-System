CREATE TABLE IF NOT EXISTS uploads (
  id SERIAL PRIMARY KEY,
  filename TEXT,
  type TEXT NOT NULL,
  campaign TEXT,
  total_rows INT NOT NULL DEFAULT 0,
  success_rows INT NOT NULL DEFAULT 0,
  failed_rows INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'processing',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS upload_failures (
  id SERIAL PRIMARY KEY,
  upload_id INT REFERENCES uploads(id) ON DELETE SET NULL,
  row_data JSONB,
  error TEXT,
  type TEXT,
  campaign TEXT,
  retry_count INT DEFAULT 0,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);
