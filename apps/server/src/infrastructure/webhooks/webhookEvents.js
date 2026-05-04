import { pool } from "../db/postgres.js";

export const isWebhookEventProcessed = async (provider, eventId) => {
  if (!eventId) return false;
  const { rows } = await pool.query(
    "SELECT id FROM webhook_events WHERE provider = $1 AND event_id = $2 LIMIT 1",
    [provider, eventId]
  );
  return rows.length > 0;
};

export const markWebhookEventProcessed = async (provider, eventId, payload) => {
  if (!eventId) return;
  await pool.query(
    `INSERT INTO webhook_events (id, provider, event_id, payload)
     VALUES (uuid_generate_v4(), $1, $2, $3)
     ON CONFLICT (provider, event_id) DO NOTHING`,
    [provider, eventId, payload || {}]
  );
};
